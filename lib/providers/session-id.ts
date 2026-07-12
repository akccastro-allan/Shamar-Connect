export const SESSION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-0[1-9]$/;

export function isValidSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

export function buildSessionId(companySlug: string, sequence: number): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(companySlug)) {
    throw new Error("Company slug must use lowercase letters, numbers and hyphens.");
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9) {
    throw new Error("Session sequence must be between 1 and 9.");
  }

  return `${companySlug}-0${sequence}`;
}

export function parseSessionId(value: string): { companySlug: string; sequence: number } | null {
  if (!isValidSessionId(value)) return null;

  const parts = value.split("-");
  const sequenceText = parts.pop();
  if (!sequenceText) return null;

  return {
    companySlug: parts.join("-"),
    sequence: Number(sequenceText),
  };
}
