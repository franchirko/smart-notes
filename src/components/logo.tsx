import Link from "next/link";
import { Sparkles } from "lucide-react";
export function Logo({light=false}:{light?:boolean}) {
  return <Link href="/" className={`logo ${light?"logo-light":""}`} aria-label="Smart Notes početna stranica">
    <span className="logo-icon"><Sparkles size={21}/></span><span>smart<span className="logo-weight">notes</span><span className="logo-dot">.</span></span>
  </Link>;
}
