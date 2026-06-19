/**
 * Content message builder for Viciados em Trilhas distribution.
 * Produces ready-to-send text for WhatsApp groups, Telegram channels, etc.
 */

export type ArticleBroadcastInput = {
  title: string;
  url: string;
  excerpt?: string | null;
};

export type EventBroadcastInput = {
  title: string;
  url: string;
  date?: string | null;
  location?: string | null;
};

export function buildArticleBroadcastMessage(input: ArticleBroadcastInput): string {
  const { title, url, excerpt } = input;
  const excerptBlock = excerpt ? `\n${excerpt.trim()}\n` : "";

  return `🌿 Novo conteúdo no blog dos Viciados em Trilhas!

*${title}*
${excerptBlock}
Preparamos esse artigo para te ajudar a viver melhor suas próximas aventuras.

Leia aqui:
${url}

Saímos juntos e voltamos juntos.
Viciados em Trilhas.`;
}

export function buildEventBroadcastMessage(input: EventBroadcastInput): string {
  const { title, url, date, location } = input;

  const dateBlock = date ? `\n📅 Data: ${date}` : "";
  const locationBlock = location ? `\n📍 Local: ${location}` : "";

  return `🥾 Próxima aventura dos Viciados em Trilhas!

*${title}*${dateBlock}${locationBlock}

Confira detalhes, vagas e orientações pelo link:
${url}

Saímos juntos e voltamos juntos.
Viciados em Trilhas.`;
}

export function buildManualBroadcastMessage(text: string): string {
  return text.trim();
}

/**
 * Returns a suggested message text based on source type and inputs.
 */
export function buildBroadcastMessage(
  sourceType: "article" | "event" | "manual",
  opts: {
    title?: string;
    url?: string;
    text?: string;
    excerpt?: string | null;
    date?: string | null;
    location?: string | null;
  },
): string {
  if (sourceType === "article" && opts.title && opts.url) {
    return buildArticleBroadcastMessage({ title: opts.title, url: opts.url, excerpt: opts.excerpt });
  }
  if (sourceType === "event" && opts.title && opts.url) {
    return buildEventBroadcastMessage({ title: opts.title, url: opts.url, date: opts.date, location: opts.location });
  }
  return buildManualBroadcastMessage(opts.text || "");
}
