import { Logo } from "./logo";
import { AuthForm } from "./auth-form";
import { isConfigured } from "@/lib/supabase/server";
import { Sparkles,ShieldCheck,Check } from "lucide-react";
export function AuthPage() {
  return <main className="auth-page"><aside className="auth-aside"><Logo light/><div><span className="eyebrow">TVOJ PROSTOR ZA IDEJE</span><h1>Misli vrijede<br/><span className="serif">kad ih sačuvaš.</span></h1><p>Bilješke, slike i malo umjetne inteligencije.<br/>Sve što ti treba za sljedeću dobru ideju.</p><div className="auth-quote"><Sparkles size={24}/><p>„Ona ideja za poklon… znaš, ona s keramikom.”</p><small>Da. Smart Notes zna gdje tražiti.</small></div></div><span className="auth-private"><ShieldCheck size={17}/>Privatne bilješke. Pristup po tvojoj odluci.</span></aside>
    <section className="auth-main"><div className="mobile-logo"><Logo/></div><div className="auth-card"><span className="eyebrow"><Check size={14}/>DOBRO DOŠAO NATRAG</span><h2>Tvoje bilješke te čekaju.</h2><p>Prijavi se demo računom i istraži Smart Notes.</p><AuthForm configured={isConfigured()}/></div><small className="auth-bottom">Smart Notes · malo manje traženja, malo više ideja.</small></section>
  </main>;
}
