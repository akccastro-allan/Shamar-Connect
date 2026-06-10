import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamarconnect.com.br"),
  title: {
    default: "ShamarConnect — WhatsApp + CRM + IA",
    template: "%s | ShamarConnect",
  },
  description:
    "Atenda mais, venda mais e organize seu WhatsApp com CRM, automações e IA. Planos a partir de R$ 97/mês.",
  keywords: [
    "CRM WhatsApp",
    "atendimento WhatsApp",
    "sistema WhatsApp empresa",
    "CRM para pequenas empresas",
    "WhatsApp com IA",
    "automação WhatsApp",
    "ShamarConnect",
  ],
  open