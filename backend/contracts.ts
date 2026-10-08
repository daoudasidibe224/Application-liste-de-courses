import type { Request } from "express";
export type ApiRequest = Request<Record<string, string>, unknown, unknown>;
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError("Objet attendu");
  return Object.fromEntries(Object.entries(value));
}
export function text(value: unknown, maximum = 200) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maximum
  )
    throw new TypeError("Texte invalide");
  return value.trim();
}
export function credentials(value: unknown) {
  const body = record(value);
  if (
    typeof body.mdp !== "string" ||
    body.mdp.length < 8 ||
    Buffer.byteLength(body.mdp) > 72
  )
    throw new TypeError("Mot de passe invalide");
  return { email: text(body.email, 254).toLowerCase(), mdp: body.mdp };
}
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
