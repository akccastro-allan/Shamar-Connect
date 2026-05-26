import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShamarConnect",
  description: "Inbox, CRM e IA comercial para WhatsApp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
