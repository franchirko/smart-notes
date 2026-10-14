import Link from "next/link";
import { NotebookPen,Users,Sparkles,LogOut,ArrowUpRight,ShieldCheck } from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "./ui";
import { signOut } from "@/app/actions/auth";
export function AppShell({children,name,email}:{children:React.ReactNode;name:string;email:string}) {
  return <div className="app-shell"><aside className="sidebar"><Logo/><span className="sidebar-label">MOJ PROSTOR</span>
    <nav aria-label="Navigacija bilježaka"><Link href="/biljeske" className="sidebar-link"><NotebookPen size={18}/>Sve bilješke</Link><Link href="/biljeske?prikaz=moje" className="sidebar-link"><ShieldCheck size={18}/>Moje bilješke</Link><Link href="/biljeske?prikaz=dijeljene" className="sidebar-link"><Users size={18}/>Podijeljeno sa mnom</Link></nav>
    <div className="sidebar-tip"><Sparkles size={21}/><strong>Zaboravio si naslov?</strong><p>Opiši ideju svojim riječima. AI pretraga povezuje značenje teksta i slika.</p></div>
    <Link href="/" className="sidebar-about">O aplikaciji<ArrowUpRight size={15}/></Link>
    <div className="sidebar-user"><Avatar name={name||email}/><div><strong>{name||"Moj račun"}</strong><small>{email}</small></div><form action={signOut}><button className="icon-button" title="Odjava" aria-label="Odjava"><LogOut size={17}/></button></form></div>
  </aside><div className="app-main">{children}</div></div>;
}
