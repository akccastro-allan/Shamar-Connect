export type Category = "whatsapp" | "crm" | "atendimento" | "ia" | "vendas" | "organizacao";

export type Post = {
  title: string;
  description: string;
  href: string;
  category: Category;
  categoryLabel: string;
  readTime: string;
  featured?: boolean;
  publishedAt?: string;
};

export const CATEGORIES: Record<Category, string> = {
  whatsapp: "WhatsApp",
  crm: "CRM",
  atendimento: "Atendimento",
  ia: "IA",
  vendas: "Vendas",
  organizacao: "Organização",
};

export const posts: Post[] = [
  // WhatsApp
  {
    title: "Como reduzir o tempo de resposta no WhatsApp da empresa",
    description: "Guia prático para responder mais rápido no WhatsApp sem perder qualidade.",
    href: "/blog/como-reduzir-o-tempo-de-resposta-no-whatsapp-da-empresa",
    category: "whatsapp",
    categoryLabel: "WhatsApp",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "Como usar respostas rápidas sem deixar o atendimento robótico",
    description: "Guia prático para usar respostas rápidas com contexto e atendimento humano.",
    href: "/blog/como-usar-respostas-rapidas-sem-deixar-o-atendimento-robotico",
    category: "whatsapp",
    categoryLabel: "WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Respostas rápidas no WhatsApp: como padronizar o atendimento",
    description: "Como usar respostas rápidas no WhatsApp para padronizar o atendimento comercial e reduzir tempo de resposta.",
    href: "/blog/respostas-rapidas-no-whatsapp-como-padronizar-o-atendimento-comercial",
    category: "whatsapp",
    categoryLabel: "WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Como responder clientes mais rápido no WhatsApp sem perder qualidade",
    description: "Como responder mais rápido usando respostas rápidas, CRM, organização, equipe e IA.",
    href: "/blog/como-responder-clientes-mais-rapido-no-whatsapp-sem-perder-qualidade",
    category: "whatsapp",
    categoryLabel: "WhatsApp",
    readTime: "7 min",
  },
  {
    title: "Atendimento multiatendente no WhatsApp: quando usar",
    description: "Quando sua empresa precisa de atendimento multiatendente e como organizar responsáveis, histórico e equipe.",
    href: "/blog/atendimento-multiatendente-no-whatsapp-quando-sua-empresa-precisa-disso",
    category: "whatsapp",
    categoryLabel: "WhatsApp",
    readTime: "7 min",
  },
  // CRM
  {
    title: "CRM com WhatsApp: como funciona na prática",
    description: "Como um CRM com WhatsApp ajuda a organizar conversas, clientes, oportunidades e funil de vendas.",
    href: "/blog/crm-com-whatsapp-como-funciona-na-pratica",
    category: "crm",
    categoryLabel: "CRM",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "CRM para equipe comercial: como organizar vendedores e atendentes",
    description: "Como organizar equipe comercial, responsáveis, etapas e oportunidades com CRM.",
    href: "/blog/crm-para-equipe-comercial-como-organizar-vendedores-e-atendentes",
    category: "crm",
    categoryLabel: "CRM",
    readTime: "7 min",
  },
  {
    title: "CRM para WhatsApp: como organizar vendas e atendimento em um só lugar",
    description: "Como um CRM para WhatsApp ajuda pequenas empresas a organizar atendimento, vendas e clientes.",
    href: "/blog/crm-para-whatsapp-como-organizar-vendas-e-atendimento-em-um-so-lugar",
    category: "crm",
    categoryLabel: "CRM",
    readTime: "7 min",
  },
  {
    title: "Melhor CRM para pequenas empresas: como escolher sem complicar",
    description: "Como escolher o melhor CRM considerando simplicidade, WhatsApp, funil de vendas e controle comercial.",
    href: "/blog/melhor-crm-para-pequenas-empresas-como-escolher-sem-complicar",
    category: "crm",
    categoryLabel: "CRM",
    readTime: "7 min",
  },
  // Atendimento
  {
    title: "Atendimento comercial pelo WhatsApp: como criar um processo simples",
    description: "Como criar um processo comercial simples para atendimento pelo WhatsApp.",
    href: "/blog/atendimento-comercial-pelo-whatsapp-como-criar-um-processo-simples",
    category: "atendimento",
    categoryLabel: "Atendimento",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "Como organizar o histórico de clientes no WhatsApp",
    description: "Como organizar histórico de clientes, conversas e contexto no atendimento.",
    href: "/blog/como-organizar-o-historico-de-clientes-no-whatsapp",
    category: "atendimento",
    categoryLabel: "Atendimento",
    readTime: "7 min",
  },
  {
    title: "Como controlar atendentes no WhatsApp sem perder qualidade",
    description: "Como controlar atendentes com responsáveis, histórico, indicadores e CRM.",
    href: "/blog/como-controlar-atendentes-no-whatsapp-sem-perder-qualidade",
    category: "atendimento",
    categoryLabel: "Atendimento",
    readTime: "7 min",
  },
  {
    title: "Indicadores de atendimento no WhatsApp: o que o gestor precisa acompanhar",
    description: "Quais indicadores acompanhar para melhorar atendimento e vendas pelo WhatsApp.",
    href: "/blog/indicadores-de-atendimento-no-whatsapp-o-que-o-gestor-precisa-acompanhar",
    category: "atendimento",
    categoryLabel: "Atendimento",
    readTime: "7 min",
  },
  // IA
  {
    title: "IA no atendimento pelo WhatsApp: como usar sem perder o toque humano",
    description: "Como usar IA para apoiar o atendimento comercial sem abrir mão da supervisão humana.",
    href: "/blog/ia-no-atendimento-pelo-whatsapp-como-usar-sem-perder-o-toque-humano",
    category: "ia",
    categoryLabel: "IA",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "Transcrição de áudio no WhatsApp: por que isso ajuda no atendimento",
    description: "Como a transcrição de áudio aumenta produtividade e organização no atendimento.",
    href: "/blog/transcricao-de-audio-no-whatsapp-ajuda-no-atendimento",
    category: "ia",
    categoryLabel: "IA",
    readTime: "7 min",
  },
  // Vendas
  {
    title: "Funil de vendas no WhatsApp: como acompanhar cada cliente",
    description: "Como usar um funil de vendas para acompanhar clientes, orçamentos, follow-ups e fechamentos.",
    href: "/blog/funil-de-vendas-no-whatsapp-como-acompanhar-cada-cliente",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "Como não perder vendas que chegam pelo WhatsApp",
    description: "Como evitar perdas comerciais com organização, CRM, follow-up e acompanhamento da equipe.",
    href: "/blog/como-nao-perder-vendas-que-chegam-pelo-whatsapp",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
  },
  {
    title: "Como saber se sua equipe está perdendo vendas no WhatsApp",
    description: "Como identificar perdas comerciais no atendimento pelo WhatsApp.",
    href: "/blog/como-saber-se-sua-equipe-esta-perdendo-vendas-no-whatsapp",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
  },
  {
    title: "Como transformar conversas do WhatsApp em oportunidades de venda",
    description: "Como transformar conversas em oportunidades com qualificação, CRM, funil e histórico.",
    href: "/blog/como-transformar-conversas-do-whatsapp-em-oportunidades-de-venda",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
  },
  {
    title: "Como acompanhar orçamentos enviados pelo WhatsApp",
    description: "Como acompanhar orçamentos com follow-up, etapas comerciais, CRM e histórico.",
    href: "/blog/como-acompanhar-orcamentos-enviados-pelo-whatsapp",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
  },
  {
    title: "Como organizar clientes no WhatsApp sem perder vendas",
    description: "Como organizar clientes, controlar orçamentos, follow-ups e evitar perdas comerciais.",
    href: "/blog/como-organizar-clientes-no-whatsapp-sem-perder-vendas",
    category: "vendas",
    categoryLabel: "Vendas",
    readTime: "7 min",
  },
  // Organização
  {
    title: "Como organizar atendimento, vendas e CRM em uma única operação",
    description: "Como integrar atendimento, vendas, CRM, histórico e IA em uma única operação.",
    href: "/blog/como-organizar-atendimento-vendas-e-crm-em-uma-unica-operacao",
    category: "organizacao",
    categoryLabel: "Organização",
    readTime: "7 min",
    featured: true,
  },
  {
    title: "Como organizar prioridades no atendimento pelo WhatsApp",
    description: "Como priorizar conversas, oportunidades e próximas ações no WhatsApp.",
    href: "/blog/como-organizar-prioridades-no-atendimento-pelo-whatsapp",
    category: "organizacao",
    categoryLabel: "Organização",
    readTime: "7 min",
  },
  {
    title: "Como organizar o follow-up de vendas pelo WhatsApp",
    description: "Como estruturar follow-ups no WhatsApp para não perder oportunidades e fechar mais vendas.",
    href: "/blog/como-organizar-follow-up-de-vendas-pelo-whatsapp",
    category: "organizacao",
    categoryLabel: "Organização",
    readTime: "7 min",
  },
];

export function getPostsByCategory(category?: Category | null): Post[] {
  if (!category) return posts;
  return posts.filter((p) => p.category === category);
}

export function getFeaturedPosts(): Post[] {
  return posts.filter((p) => p.featured);
}
