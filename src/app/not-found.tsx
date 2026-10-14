import Link from "next/link";
export default function NotFound(){return <main className="setup-page"><span className="eyebrow">404</span><h1>Ova bilješka nije dostupna.</h1><p>Možda je obrisana ili nemaš pristup.</p><Link className="button button-primary" href="/biljeske">Natrag na bilješke</Link></main>;}
