-- Run once in Supabase SQL Editor. All normal access is bound to auth.uid().
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to authenticated, service_role;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
create unique index profiles_email_unique on public.profiles (lower(email));
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova bilješka' check (char_length(title) between 1 and 120),
  content jsonb not null default '{"blocks":[{"id":"initial","type":"paragraph","runs":[{"text":""}]}]}',
  plain_text text not null default '' check (char_length(plain_text) <= 30000),
  version integer not null default 1,
  index_status text not null default 'pending' check (index_status in ('pending','processing','ready','failed')),
  indexed_version integer,
  index_started_at timestamptz,
  index_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_owner on public.notes(owner_id);
create table public.note_shares (
  note_id uuid references public.notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  permission text not null check (permission in ('read','edit')),
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
create index note_shares_user on public.note_shares(user_id);
create table public.note_images (
  id uuid primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  object_path text not null unique,
  checksum text not null,
  description text,
  created_at timestamptz not null default now()
);
create index note_images_note on public.note_images(note_id);
create table public.note_chunks (
  id bigint generated always as identity primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  version integer not null,
  source text not null check (source in ('text','image')),
  image_id uuid references public.note_images(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null
);
create index note_chunks_note on public.note_chunks(note_id);
create index note_chunks_embedding on public.note_chunks using hnsw(embedding extensions.vector_cosine_ops);
create table private.ai_usage (
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  operation text not null,
  amount integer not null default 0,
  primary key(user_id, day, operation)
);
revoke all on private.ai_usage from public, anon, authenticated;

create function private.sync_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict(id) do update set email = excluded.email, display_name = excluded.display_name;
  return new;
end $$;
create trigger on_auth_user_sync after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure private.sync_profile();
insert into public.profiles(id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'display_name','') from auth.users where email is not null
on conflict(id) do nothing;

-- Definer functions avoid recursive RLS checks. Identity always comes from the session.
create function private.can_access(p_note uuid, p_edit boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.notes n where n.id = p_note and
    (n.owner_id = auth.uid() or exists(select 1 from public.note_shares s
      where s.note_id = n.id and s.user_id = auth.uid() and (not p_edit or s.permission = 'edit'))))
$$;
create function private.is_owner(p_note uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.notes where id = p_note and owner_id = auth.uid())
$$;
revoke all on function private.sync_profile(),private.can_access(uuid,boolean),private.is_owner(uuid) from public, anon;
grant execute on function private.can_access(uuid,boolean), private.is_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.note_shares enable row level security;
alter table public.note_images enable row level security;
alter table public.note_chunks enable row level security;
revoke all on public.profiles, public.notes, public.note_shares, public.note_images, public.note_chunks from anon, authenticated;
grant select on public.profiles, public.notes, public.note_shares, public.note_images, public.note_chunks to authenticated;
grant insert (owner_id,title) on public.notes to authenticated;
grant delete on public.notes to authenticated;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());
create policy notes_read on public.notes for select to authenticated using (private.can_access(id));
create policy notes_create on public.notes for insert to authenticated with check (owner_id = auth.uid());
create policy notes_delete on public.notes for delete to authenticated using (owner_id = auth.uid());
create policy shares_read on public.note_shares for select to authenticated using (user_id = auth.uid() or private.is_owner(note_id));
create policy images_read on public.note_images for select to authenticated using (private.can_access(note_id));
create policy chunks_read on public.note_chunks for select to authenticated using (private.can_access(note_id));

create function public.save_note(p_id uuid, p_title text, p_content jsonb, p_plain_text text, p_version integer)
returns public.notes language plpgsql security definer set search_path = '' as $$
declare result public.notes;
begin
  if not private.can_access(p_id, true) then raise exception 'Nemate pravo uređivanja.' using errcode = '42501'; end if;
  if jsonb_typeof(p_content->'blocks') is distinct from 'array' or octet_length(p_content::text) > 200000
    then raise exception 'Neispravan sadržaj.' using errcode = '22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_content->'blocks') b
    where b->>'type'='image' and not exists(select 1 from public.note_images i
      where i.note_id=p_id and i.id::text=b->>'imageId'))
    then raise exception 'Slika ne pripada ovoj bilješci.' using errcode='22023'; end if;
  update public.notes set title = p_title, content = p_content, plain_text = p_plain_text,
    version = version + 1, updated_at = now(), index_status = 'pending', index_error = null
    where id = p_id and version = p_version returning * into result;
  if result.id is null then raise exception 'Bilješka je promijenjena u drugoj sesiji. Ponovno je otvorite.' using errcode = '40001'; end if;
  return result;
end $$;
create function public.share_note(p_note uuid, p_email text, p_permission text)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not private.is_owner(p_note) then raise exception 'Samo vlasnik može dijeliti.' using errcode = '42501'; end if;
  if p_permission not in ('read','edit') then raise exception 'Neispravna ovlast.'; end if;
  select id into target from public.profiles where lower(email) = lower(trim(p_email));
  if target is null then raise exception 'Korisnik s tom e-mail adresom još nema račun.'; end if;
  if target = auth.uid() then raise exception 'Već ste vlasnik bilješke.'; end if;
  insert into public.note_shares(note_id, user_id, permission) values(p_note,target,p_permission)
    on conflict(note_id,user_id) do update set permission = excluded.permission;
end $$;
create function public.unshare_note(p_note uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner(p_note) then raise exception 'Samo vlasnik može ukinuti pristup.' using errcode = '42501'; end if;
  delete from public.note_shares where note_id = p_note and user_id = p_user;
end $$;
create function public.list_note_shares(p_note uuid)
returns table(user_id uuid, email text, permission text)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner(p_note) then raise exception 'Samo vlasnik vidi pristupe.' using errcode = '42501'; end if;
  return query select s.user_id,p.email,s.permission from public.note_shares s
    join public.profiles p on p.id=s.user_id where s.note_id=p_note order by s.created_at;
end $$;

create function public.register_note_image(p_note uuid, p_id uuid, p_checksum text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_access(p_note,true) then raise exception 'Nemate pravo uređivanja.' using errcode = '42501'; end if;
  perform 1 from public.notes where id=p_note for update;
  if (select count(*) from public.note_images where note_id=p_note) >= 3 then raise exception 'Najviše tri slike po bilješci.'; end if;
  insert into public.note_images(id,note_id,object_path,checksum)
    values(p_id,p_note,p_note::text || '/' || p_id::text || '.webp',p_checksum);
end $$;
create function public.remove_note_image(p_note uuid, p_id uuid, p_version integer)
returns public.notes language plpgsql security definer set search_path = '' as $$
declare result public.notes;
begin
  if not private.can_access(p_note,true) then raise exception 'Nemate pravo uređivanja.' using errcode='42501'; end if;
  update public.notes set content=jsonb_set(content,'{blocks}',coalesce((select jsonb_agg(b)
      from jsonb_array_elements(content->'blocks') b where b->>'imageId' is distinct from p_id::text),'[]'::jsonb)),
    version=version+1, updated_at=now(), index_status='pending'
    where id=p_note and version=p_version returning * into result;
  if result.id is null then raise exception 'Bilješka je promijenjena. Ponovno je otvorite.' using errcode='40001'; end if;
  delete from public.note_images where id=p_id and note_id=p_note;
  return result;
end $$;

-- Server-only quota/claim/commit RPCs; service role key is never exposed to clients.
create function public.consume_ai_quota(p_user uuid, p_operation text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into private.ai_usage(user_id,day,operation,amount) values(p_user,(now() at time zone 'UTC')::date,p_operation,1)
  on conflict(user_id,day,operation) do update set amount=private.ai_usage.amount+1
    where private.ai_usage.amount < p_limit returning amount into used;
  return used is not null and used <= p_limit;
end $$;
create function public.claim_note_index(p_note uuid, p_version integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  update public.notes set index_status='processing',index_started_at=now(),index_error=null
  where id=p_note and version=p_version and (index_status<>'processing' or index_started_at<now()-interval '2 minutes')
    returning id into result;
  return result is not null;
end $$;
create function public.commit_note_index(p_note uuid, p_version integer, p_chunks jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.notes where id=p_note and version=p_version for update;
  if not found then return false; end if;
  delete from public.note_chunks where note_id=p_note;
  insert into public.note_chunks(note_id,version,source,image_id,content,embedding)
  select p_note,p_version,c->>'source',nullif(c->>'image_id','')::uuid,c->>'content',(c->>'embedding')::extensions.vector
    from jsonb_array_elements(p_chunks) c;
  update public.notes set index_status='ready',indexed_version=p_version,index_error=null where id=p_note;
  return true;
end $$;
create function public.search_notes(p_embedding extensions.vector(1536), p_query text)
returns table(note_id uuid,title text,snippet text,source text,score double precision)
language sql stable security invoker set search_path = '' as $$
  with candidates as (
    select n.id,n.title,c.content,c.source,
      (1-(c.embedding operator(extensions.<=>) p_embedding)) +
      case when strpos(lower(c.content),lower(p_query))>0 then 0.15 else 0 end as score
    from public.note_chunks c join public.notes n on n.id=c.note_id
    where c.version=n.version and n.index_status='ready'
  ), ranked as (
    select *,row_number() over(partition by id order by score desc) as rank from candidates
  ) select id,title,left(content,260),source,score from ranked
    where rank=1 and score>=0.2 order by score desc limit 10
$$;

revoke execute on function public.save_note(uuid,text,jsonb,text,integer),
 public.share_note(uuid,text,text), public.unshare_note(uuid,uuid), public.list_note_shares(uuid),
 public.register_note_image(uuid,uuid,text), public.remove_note_image(uuid,uuid,integer),
 public.search_notes(extensions.vector,text), public.consume_ai_quota(uuid,text,integer),
 public.claim_note_index(uuid,integer), public.commit_note_index(uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.save_note(uuid,text,jsonb,text,integer),
 public.share_note(uuid,text,text), public.unshare_note(uuid,uuid), public.list_note_shares(uuid),
 public.register_note_image(uuid,uuid,text), public.remove_note_image(uuid,uuid,integer),
 public.search_notes(extensions.vector,text) to authenticated;
grant execute on function public.consume_ai_quota(uuid,text,integer),public.claim_note_index(uuid,integer),
 public.commit_note_index(uuid,integer,jsonb) to service_role;
grant all on public.profiles,public.notes,public.note_shares,public.note_images,public.note_chunks to service_role;
grant usage,select on sequence public.note_chunks_id_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('note-images','note-images',false,4194304,array['image/webp']) on conflict(id) do nothing;
create function private.storage_note_id(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin return split_part(p_name,'/',1)::uuid; exception when invalid_text_representation then return null; end $$;
revoke all on function private.storage_note_id(text) from public, anon;
grant execute on function private.storage_note_id(text) to authenticated;
create policy note_storage_read on storage.objects for select to authenticated
  using(bucket_id='note-images' and private.can_access(private.storage_note_id(name)));
create policy note_storage_upload on storage.objects for insert to authenticated
  with check(bucket_id='note-images' and private.can_access(private.storage_note_id(name),true));
create policy note_storage_delete on storage.objects for delete to authenticated
  using(bucket_id='note-images' and private.can_access(private.storage_note_id(name),true));
