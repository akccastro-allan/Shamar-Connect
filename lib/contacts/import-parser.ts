export type ContactImportSource = "manual_paste" | "txt" | "csv" | "spreadsheet" | "google_export" | "microsoft_export" | "whatsapp_group";

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
  return ["nome", "name", "given name", "family name", "telefone", "phone", "celular", "mobile", "e-mail", "email", "empresa", "company", "organization"].some((word) => joined.includes(word));
}

function findEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function findPhone(text: string) {
  const match = text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/);
  return match?.[0];
}

function getHeaderMap(headerLine?: string) {
  if (!headerLine) return null;
  const headers = splitLine(headerLine).map((item) => item.toLowerCase().trim());
  if (!looksLikeHeader(headers)) return null;

  const findIndex = (terms: string[]) => headers.findIndex((header) => terms.some((term) => header.includes(term)));

  return {
    name: findIndex(["nome", "name", "given name", "first name", "display name"]),
    lastName: findIndex(["sobrenome", "family name", "last name"]),
    phone: findIndex(["telefone", "phone", "mobile", "celular", "whatsapp"]),
    email: findIndex(["email", "e-mail"]),
    company: findIndex(["empresa", "company", "organization", "org"]),
  };
}

export function parseContactsFromText(text: string, source: ContactImportSource = "manual_paste") {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const headerMap = getHeaderMap(lines[0]);
  const rows = headerMap ? lines.slice(1) : lines;

  const contacts = rows.map((line) => {
    const parts = splitLine(line).map(cleanValue);

    const mappedName = headerMap?.name !== undefined && headerMap.name >= 0 ? parts[headerMap.name] : undefined;
    const mappedLastName = headerMap?.lastName !== undefined && headerMap.lastName >= 0 ? parts[headerMap.lastName] : undefined;
    const mappedPhone = headerMap?.phone !== undefined && headerMap.phone >= 0 ? parts[headerMap.phone] : undefined;
    const mappedEmail = headerMap?.email !== undefined && headerMap.email >= 0 ? parts[headerMap.email] : undefined;
    const mappedCompany = headerMap?.company !== undefined && headerMap.company >= 0 ? parts[headerMap.company] : undefined;

    const email = mappedEmail || findEmail(line) || parts.find((part) => part.includes("@"));
    const phone = mappedPhone || findPhone(line) || parts.find((part) => normalizePhone(part).length >= 10);
    const phoneDigits = normalizePhone(phone);

    const fallbackName = parts.find((part) => {
      const digits = normalizePhone(part);
      return part && !part.includes("@") && digits.length < 8;
    });

    const fullName = [mappedName, mappedLastName].filter(Boolean).join(" ").trim();

    return {
      name: fullName || mappedName || fallbackName || phoneDigits || email || "Contato sem nome",
      phone: phoneDigits || undefined,
      email: email ? cleanValue(email).toLowerCase() : undefined,
      company: mappedCompany || (parts.length >= 4 ? cleanValue(parts[3]) : undefined),
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
