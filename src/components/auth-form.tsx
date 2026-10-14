"use client";
import { useState,useTransition } from "react";
import { ArrowRight,LoaderCircle } from "lucide-react";
import { authenticate } from "@/app/actions/auth";
import { Button,Alert } from "./ui";
export function AuthForm({configured}:{configured:boolean}) {
  const [message,setMessage]=useState("");
  const [pending,startTransition]=useTransition();
  return <form action={form=>startTransition(async()=>{
    setMessage("");
    try {
      const result=await authenticate(form);
      if(!result.ok) setMessage(result.error);
    } catch(error) {
      // Next.js redirects are handled by the framework, not swallowed as errors.
      if(error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
      setMessage("Veza nije uspjela. Pokušajte ponovno.");
    }
  })} className="auth-form">
    {!configured && <Alert>Prijava čeka konfiguraciju Supabase projekta. Upute su u README-u.</Alert>}
    {message && <Alert>{message}</Alert>}
    <label>E-mail<input type="email" name="email" placeholder="ti@primjer.hr" autoComplete="email" required maxLength={254}/></label>
    <label>Lozinka<input type="password" name="password" placeholder="Najmanje 8 znakova" autoComplete="current-password" minLength={8} maxLength={128} required/></label>
    <Button type="submit" disabled={pending||!configured}>{pending?<LoaderCircle size={17} className="spin"/>:null}Prijavi se<ArrowRight size={17}/></Button>
    <p className="auth-switch">Za demonstraciju koristi pripremljeni demo račun. Pristupne podatke dobivaš od autora aplikacije.</p>
  </form>;
}
