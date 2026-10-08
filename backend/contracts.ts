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
    throw new HttpError(
      "Le mot de passe doit compter au moins 8 caractères et rester sous 72 octets.",
      400,
    );
  return { email: text(body.email, 254).toLowerCase(), mdp: body.mdp };
}
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new TypeError("Version invalide");
  return value;
}

export const units = [
  "pièce",
  "kg",
  "g",
  "L",
  "mL",
  "paquet",
  "bouteille",
] as const;
export const categories = [
  "Fruits et légumes",
  "Frais",
  "Épicerie",
  "Boulangerie",
  "Maison",
  "Autres",
] as const;
export function productDetails(
  body: Record<string, unknown>,
  creation = false,
) {
  const updates: { quantity?: number; unit?: string; category?: string } = {};
  if (creation || Object.hasOwn(body, "quantity")) {
    const value = Object.hasOwn(body, "quantity") ? body.quantity : 1;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 999 ||
      Math.abs(Math.round(value * 1000) - value * 1000) > 0.000001
    )
      throw new HttpError(
        "La quantité doit être comprise entre 0,001 et 999 (trois décimales maximum).",
        400,
      );
    updates.quantity = value;
  }
  if (creation || Object.hasOwn(body, "unit")) {
    const value = Object.hasOwn(body, "unit") ? body.unit : "pièce";
    if (typeof value !== "string" || !units.some((unit) => unit === value))
      throw new HttpError("Choisissez une unité proposée.", 400);
    updates.unit = value;
  }
  if (creation || Object.hasOwn(body, "category")) {
    const value = Object.hasOwn(body, "category") ? body.category : "Autres";
    if (
      typeof value !== "string" ||
      !categories.some((category) => category === value)
    )
      throw new HttpError("Choisissez un rayon proposé.", 400);
    updates.category = value;
  }
  return updates;
}
