import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:{default:"Smart Notes — mjesto za tvoje ideje",template:"%s | Smart Notes"},
  description:"Piši, dijeli i pronađi bilješke po značenju. AI pretraga koja razumije tvoje ideje i slike."};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="hr" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
