"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({reset}:{error:Error;reset:()=>void}) {
  return <main className="setup-page"><h1>Nešto je zapelo.</h1><p>Podaci nisu dostupni. Provjerite konfiguraciju i pokušajte ponovno.</p><Button onClick={reset}>Pokušaj ponovno</Button></main>;
}
