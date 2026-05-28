import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShamarConnect",
  description: "Inbox, CRM e IA comercial para WhatsApp.",
  icons: {
    icon: "/brand/shamar-connect-icon.svg",
    shortcut: "/brand/shamar-connect-icon.svg",
    apple: "/brand/shamar-connect-icon.svg",
  },
  openGraph: {
    title: "ShamarConnect",
    description: "Inbox, CRM e IA comercial para WhatsApp.",
    images: ["/brand/shamar-connect-logo.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
