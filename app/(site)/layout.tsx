import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamarconnect.com.br"),
  title: {
    default: "ShamarConnect — WhatsApp + CRM + IA",
    template: "%s | ShamarConnect",
  },
  description:
    "Atenda melhor, organize contatos, acompanhe oportunidades e profissionalize sua operação comercial no WhatsApp com CRM, automações e IA.",
  keywords: [
    "CRM WhatsApp",
    "atendimento WhatsApp",
    "sistema WhatsApp empresa",
    "CRM para pequenas empresas",
    "WhatsApp com IA",
    "automação WhatsApp",
    "ShamarConnect",
  ],
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Site