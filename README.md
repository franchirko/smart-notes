# Smart Notes

Next.js aplikacija za privatne i podijeljene bilješke, formatirani tekst, slike i AI pretragu po značenju. Sučelje i dokumentacija su na hrvatskom.

## Što je implementirano

- Landing page, prijava e-mailom i lozinkom pripremljenih demo računa i odjava. Javna registracija je zatvorena.
- Vlastite bilješke i bilješke podijeljene s korisnikom.
- Editor: odlomci, naslovi, popisi, citati, podebljanje, kurziv i slike unutar sadržaja.
- Dijeljenje po e-mailu postojećeg korisnika, čitanje ili uređivanje, promjena i ukidanje pristupa.
- Privatne slike, kompresija i provjera stvarnog formata na serveru.
- OpenAI opis slike + tekstualni embeddings + PostgreSQL/pgvector pretraga.
- Provjere pristupa u bazi, zaštita serverskih operacija, verzioniranje i dnevne AI kvote.

**Status:** kod i lokalne provjere ne zamjenjuju postavljanje servisa. Za stvarnu prijavu i pohranu potrebno je konfigurirati Supabase i izvršiti migracije redom. Za AI potreban je OpenAI API ključ s aktivnim billingom. GitHub i Vercel poveznice postoje tek nakon stvarne objave; ne koriste se izmišljene poveznice.

## Lokalno pokretanje

Potreban je Node.js 22.9+ (preporuka 24) i npm.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Uredi `.env.local` lokalno. Nikad nemoj commitati tajne.

| Varijabla | Izvor / namjena |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable ključ; javno korištenje je očekivano, uz RLS |
| `SUPABASE_SECRET_KEY` | Serverski secret ključ (`sb_secret_…`), Settings → API Keys; ostaje na serveru |
| `OPENAI_API_KEY` | OpenAI Platform; odvojen od ChatGPT pretplate |
| `OPENAI_VISION_MODEL` | Zadano `gpt-5.4-mini-2026-03-17` |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small`; uvijek tražimo 1536 dimenzija |
| `AI_SEARCH_DAILY_LIMIT` | Zadano 60 pokušaja po korisniku / UTC danu |
| `AI_INDEX_DAILY_LIMIT` | Zadano 20 pokušaja po korisniku / UTC danu |

### Supabase i OpenAI

1. Stvori novi Supabase projekt i izvrši migracije redom: prvo [početnu migraciju](supabase/migrations/202610140001_smart_notes.sql), zatim [korekciju pravila `notes_read`](supabase/migrations/202610140002_fix_notes_read_policy.sql). Prva migracija ostaje povijest već izvršenih izmjena. Na postojećem Supabase projektu korekcija je već ručno primijenjena; početnu migraciju nemoj ponovno izvršavati.
2. Preuzmi Project URL i publishable ključ kroz Connect te secret ključ kroz Settings → API Keys.
3. U Authentication → Users administrativno stvori tri potvrđena demo računa A, B i C. Isključi **Allow new users to sign up**, a prijavu lozinkom ostavi uključenu. SMTP nije potreban.
4. U OpenAI Platformu pripremi projekt, ključ i naplatu te postavi mali limit i obavijesti o potrošnji.
5. Popuni četiri obavezne varijable u `.env.local`. Demo lozinke dostavi odvojeno od javnog repozitorija.

Dodatna dokumentacija za osobno učenje čuva se lokalno i nije dio javnog repozitorija.

```powershell
npm.cmd run dev
```

Otvori [localhost:3000](http://localhost:3000). Landing radi bez tajnih ključeva, a aplikacija tada prikazuje upute za konfiguraciju. Privatni podaci se ne zamjenjuju lažnim lokalnim računima.

## Testovi

```powershell
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Testna stranica `/test-fixtures/editor` dostupna je samo uz `NODE_ENV=development` i `ENABLE_TEST_FIXTURES=1`; inače vraća 404.

Unit testovi provjeravaju sigurno prikazivanje teksta, validaciju i Unicode segmentiranje. Playwright provjerava landing, navigaciju, responzivnost, editor, read-only prikaz, dijalog dijeljenja i zabranu neprijavljenih / cross-origin API zahtjeva na desktopu i mobitelu.

Playwright koristi port 3001 i zaseban `.next-test` direktorij. Ako već imaš Chromium i instaliranje preglednika nije moguće, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` može pokazivati na njegovu izvršnu datoteku. To služi samo lokalnom testiranju; u CI-u instalira se odgovarajući preglednik.

### Stvarni testovi baze i pohrane

Nakon izvršavanja obje migracije redom, na zasebnom testnom Supabase projektu:

```powershell
$env:RUN_SUPABASE_TESTS='1'
npm run test:integration
```

Test privremeno stvara tri korisnika i sliku, provjerava RLS, read/edit, pokušaje zaobilaženja ovlasti, sukob verzija, privatnost slika i filtriranje vektorske pretrage. Na kraju čisti podatke. Bez eksplicitne varijable test je preskočen. Test ne poziva plaćeni OpenAI API i ne mjeri kvalitetu semantičkih rezultata.

Bilješka je indeksirana tek kada se prikaže spremnost za AI pretragu.

## GitHub i Vercel

U Vercelu uvezi GitHub repozitorij, odaberi Next.js i korijen projekta te Node.js 24.x. Prije objave postavi četiri obavezne produkcijske varijable: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY i OPENAI_API_KEY. Lokalni .env.local ne prenosi se na Vercel. Nakon promjene varijabli pokreni novi deployment. Nakon objave provjeri demo prijavu, pohranu, dijeljenje i AI pretragu računima A, B i C. Supabase Site URL postavi na produkcijsku adresu.

GitHub Actions provjerava kod, build i browser testove bez produkcijskih tajni. Predaja sadrži stvarni Vercel URL, stvarni GitHub URL i odvojeno dostavljene demo pristupe.

## Čistoća projekta

Repozitorij sadrži `src/`, `supabase/`, `tests/`, `.github/`, README, konfiguracije i package/lock datoteke. Privatna dokumentacija u `docs/` ostaje lokalno i isključena je kroz `.gitignore`. Lokalni `node_modules/` ostaje dostupan za razvoj, ali je isključen iz Gita.

Cache, buildovi i izvještaji (`.npm-cache/`, `.npm-logs/`, `.local/`, `.next/`, `.next-test/`, `test-results/`, `playwright-report/` i `*.tsbuildinfo`) generirane su datoteke isključene kroz `.gitignore`. Provjere i pokretanje aplikacije ponovno ih stvaraju. Pomoćni `scripts/` i njegova npm naredba uklonjeni su. Next.js generira i `next-env.d.ts`, koji je također isključen iz Gita; `typecheck` prvo generira potrebne tipove naredbom `next typegen`.

## Važna ograničenja prve verzije

- Dijeljenje je samo s postojećim demo korisnicima; nema slanja pozivnica niti uređivanja uživo.
- Najviše 200 najnovijih dostupnih bilježaka prikazuje se na dashboardu; veći opseg traži paginaciju. AI pretraga ne koristi taj limit.
- Obrada se pokreće iz otvorene aplikacije nakon spremanja. Zatvaranje stranice može ostaviti status obrade; ponovni pokušaj moguć je nakon dvije minute. Za veći sustav treba trajni red zadataka.
- Slike koje su učitane, a nisu umetnute i spremljene, prikazuju se kao dostupni privici pri ponovnom otvaranju. Mrežni prekid tijekom uploada može ostaviti storage objekt bez metapodataka; produkcijsko poboljšanje je periodično čišćenje takvih objekata.
- Kvote su po korisniku, nisu ukupni novčani limit. Trošak ovisi o broju korisnika i korištenju. Postavi upozorenja/budžet u OpenAI projektu i prati potrošnju; javna registracija ostaje isključena.
- AI pretraga slika ovisi o generiranom opisu; ne traži izravno po slikovnom embeddingu.
- Editor je vlastita komponenta s ograničenim JSON modelom. Tiptap/shadcn paketi nisu bili dostupni u mrežno ograničenom okruženju.
- Provjera pristupa vrijedi za buduće zahtjeve; već preuzete kopije sadržaja nije moguće povući.

Službena dokumentacija: [Next.js](https://nextjs.org/docs/app), [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings), [OpenAI vision](https://developers.openai.com/api/docs/guides/images-vision), [Vercel](https://vercel.com/docs).
