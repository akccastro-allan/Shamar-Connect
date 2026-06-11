import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://shamarconnect.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShamarConnect | CRM, WhatsApp e IA para pequenas empresas",
    template: "%s | ShamarConnect",
  },
  description:
    "Centralize o WhatsApp, organize contatos, acompanhe oportunidades no CRM e use IA para melhorar o atendimento comercial da sua empresa.",
  applicationName: "ShamarConnect",
  authors: [{ name: "Moriah Systems Serviços Ltda" }],
  creator: "Moriah Systems Serviços Ltda",
  publisher: "Moriah Systems Serviços Ltda",
  keywords: [
    "ShamarConnect",
    "CRM para WhatsApp",
    "atendimento por WhatsApp",
    "CRM para pequenas empresas",
    "automação WhatsApp",
    "IA para atendimento",
    "funil de vendas",
    "multiatendimento WhatsApp",
  ],
  icons: {
    icon: "/brand/shamar-connect-icon.svg",
    shortcut: "/brand/shamar-connect-icon.svg",
    apple: "/brand/shamar-connect-icon.svg",
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "ShamarConnect",
    title: "ShamarConnect | CRM, WhatsApp e IA para pequenas empresas",
    description:
      "Centralize o WhatsApp, organize contatos, acompanhe oportunidades no CRM e use IA para melhorar o atendimento comercial da sua empresa.",
    images: [
      {
        url: "/brand/shamar-connect-logo.svg",
        width: 1200,
        height: 630,
        alt: "ShamarConnect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShamarConnect | CRM, WhatsApp e IA para pequenas empresas",
    description:
      "Centralize o WhatsApp, organize contatos, acompanhe oportunidades no CRM e use IA para melhorar o atendimento comercial da sua empresa.",
    images: ["/brand/shamar-connect-logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
