alter policy notes_read on public.notes
using (
  owner_id = (select auth.uid())
  or private.can_access(id)
);
