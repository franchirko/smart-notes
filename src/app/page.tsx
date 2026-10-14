import Link from "next/link";
import { ArrowRight,ArrowUpRight,Sparkles,Search,ShieldCheck,Image as ImageIcon,Users,Check,Leaf,Gift,Lightbulb,BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";
export default function Landing() {
  return <>
    <header className="landing-nav container"><Logo/><nav aria-label="Glavna navigacija"><a href="#mogucnosti">Mogućnosti</a><a href="#kako-radi">Kako radi</a><Link href="/prijava">Prijava</Link><Link className="button button-primary nav-cta" href="/prijava">Isprobaj demo<ArrowUpRight size={16}/></Link></nav></header>
    <main>
      <section className="hero container">
        <div className="hero-copy"><span className="eyebrow"><span className="status-dot"/>Malo manje traženja. Malo više ideja.</span>
          <h1>Sve tvoje misli.<br/>Na pravom <span className="serif accent">mjestu.</span></h1>
          <p>Uhvati ideju, dodaj sliku, podijeli inspiraciju.<br/>A kad zaboraviš gdje je — opiši što tražiš.</p>
          <div className="hero-actions"><Link className="button button-primary button-large" href="/prijava">Prijavi se demo računom<ArrowRight size={18}/></Link><a className="text-link" href="#kako-radi">Pogledaj kako radi<ArrowDownIcon/></a></div>
          <div className="hero-assurances"><span><Check size={14}/>Privatno po zadanim postavkama</span><span><Check size={14}/>Pretraga teksta i slika</span></div>
        </div>
        <div className="hero-art" aria-label="Primjer sučelja aplikacije">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="preview-window"><div className="window-bar"><span/><span/><span/><small>Tvoj prostor za ideje</small><Sparkles size={14}/></div>
            <div className="preview-content"><div className="preview-title"><h3>Dobro jutro, kreativče <span>✦</span></h3><small>Svaka velika ideja počinje malom bilješkom.</small></div>
              <div className="preview-search"><Sparkles size={17}/><span>ona bilješka s idejama za poklon za mamu</span><ArrowRight size={16}/></div>
              <div className="preview-cards"><div className="preview-note peach"><Gift size={22}/><span className="mini-label">MALI ZNAKOVI PAŽNJE</span><h4>Za njezin rođendan</h4><p>Keramička šalica iz malog ateljea.<br/>Tečaj vrtlarenja i novi začini.</p><small>3 ideje · 1 slika</small></div>
                <div className="preview-note mint"><Leaf size={22}/><span className="mini-label">INSPIRACIJA</span><h4>Zeleni kutak</h4><div className="plant-art"><div className="plant-stem"/><i/><i/><i/><div className="plant-pot"/></div><small>Mir, svjetlo i malo zelenila.</small></div></div>
            </div></div><div className="floating-match"><span><Sparkles size={18}/></span><div><strong>Pronađeno po značenju</strong><small>Čak i kad se ne sjećaš točnih riječi.</small></div><Check size={17}/></div>
        </div>
      </section>
      <div className="feature-strip container"><span><BookOpen size={16}/>Tvoje ideje, bez nereda</span><span><ShieldCheck size={16}/>Tvoje bilješke, tvoja pravila</span><span><Sparkles size={16}/>Pretraga koja razumije</span></div>
      <section id="mogucnosti" className="features container"><div className="section-heading"><span className="eyebrow">JEDNOSTAVNO. PAMETNO. TVOJE.</span><h2>Prostor za ideje.<br/><span className="serif">I za sve između.</span></h2><p>Od popisa za kupovinu do sljedećeg velikog projekta.</p></div>
        <div className="feature-grid">{[
          {icon:Lightbulb,title:"Zapiši dok je svježe",text:"Naslovi, popisi i formatirani tekst. Uredi misli onako kako ti odgovara.",color:"peach"},
          {icon:ImageIcon,title:"Slika govori više",text:"Dodaj fotografije, skice i inspiraciju izravno u bilješke. Pronađi ih i prema sadržaju slike.",color:"lavender"},
          {icon:Users,title:"Podijeli pod svojim uvjetima",text:"Pozovi drugog korisnika da čita ili uređuje. Promijeni ili ukini pristup kad god želiš.",color:"mint"},
          {icon:Search,title:"Traži kako razmišljaš",text:"Ne moraš pamtiti naslov. Opiši ideju i pronađi bilješku prema njezinu značenju.",color:"butter"},
        ].map(f=><article className="feature-card" key={f.title}><span className={`feature-icon ${f.color}`}><f.icon size={23}/></span><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
      </section>
      <section id="kako-radi" className="how-section"><div className="container"><div className="section-heading"><span className="eyebrow">OD MISLI DO BILJEŠKE</span><h2>Tri koraka. <span className="serif">Manje zaboravljenih ideja.</span></h2></div>
        <div className="steps">{[{title:"Uhvati ideju",text:"Prijavi se demo računom i zapiši što ti je na pameti. Dodaj slike i oblikuj tekst."},{title:"Poveži ljude",text:"Podijeli bilješku s korisnikom i odredi može li čitati ili uređivati."},{title:"Pronađi je ponovno",text:"Upiši prirodan opis. AI povezuje tvoj upit sa značenjem teksta i slika."}].map((s,i)=><article key={s.title}><span className="step-number">0{i+1}</span><h3>{s.title}</h3><p>{s.text}</p></article>)}</div>
      </div></section>
      <section className="landing-cta container"><Sparkles size={28}/><h2>Sljedeća dobra ideja?<br/><span className="serif">Daj joj svoje mjesto.</span></h2><Link href="/prijava" className="button button-primary button-large">Isprobaj Smart Notes<ArrowRight size={18}/></Link><p>Tvoj prostor. Tvoja pravila.</p></section>
    </main><footer className="landing-footer container"><Logo/><p>Stvoreno za misli koje vrijedi sačuvati.</p><span>© {new Date().getFullYear()} Smart Notes</span></footer>
  </>;
}
function ArrowDownIcon(){return <span aria-hidden="true">↓</span>;}
