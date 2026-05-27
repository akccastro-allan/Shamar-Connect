export type ContactImportSource = "manual_paste" | "txt" | "csv" | "spreadsheet" | "google" | "microsoft" | "whatsapp_group";

export type ParsedContact = {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  source: ContactImportSource;
};

function cleanValue(value?: string) {
  return String(value || "").trim().replace(/^"|"$/g, "").trim();
}

export function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function splitLine(line: string) {
  if (line.includes(";")) return line.split(";");
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(",")) return line.split(",");
  return line.split(/\s{2,}/g);
}

function looksLikeHeader(parts: string[]) {
  const joined = parts.join(" ").toLowerCase();
  return ["nome", "name", "telefone", "phone", "celular", "email", "empresa", "company"].some((word) => joined.includes(word));
}

function findEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function findPhone(text: string) {
  const match = text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/);
  return match?.[0];
}

export function parseContactsFromText(text: string, source: ContactImportSource = "manual_paste") {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const withoutHeader = lines.length > 0 && looksLikeHeader(splitLine(lines[0])) ? lines.slice(1) : lines;

  const contacts = withoutHeader.map((line) => {
    const parts = splitLine(line).map(cleanValue);
    const email = findEmail(line) || parts.find((part) => part.includes("@"));
    const phone = findPhone(line) || parts.find((part) => normalizePhone(part).length >= 10);
    const phoneDigits = normalizePhone(phone);

    const name = parts.find((part) => {
      const digits = normalizePhone(part);
      return part && !part.includes("@") && digits.length < 8;
    });

    const company = parts.length >= 4 ? parts[3] : undefined;

    return {
      name: name || phoneDigits || email || "Contato sem nome",
      phone: phoneDigits || undefined,
      email: email ? cleanValue(email).toLowerCase() : undefined,
      company: company ? cleanValue(company) : undefined,
      source,
    } satisfies ParsedContact;
  });

  const unique = new Map<string, ParsedContact>();

  for (const contact of contacts) {
    const key = contact.phone || contact.email;
    if (!key) continue;
    if (!unique.has(key)) unique.set(key, contact);
  }

  return Array.from(unique.values());
}
