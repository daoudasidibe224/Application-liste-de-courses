import { Injectable } from '@angular/core';
export interface Liste {
  _id: string;
  titre: string;
  version: number;
}
export interface Piece {
  _id: string;
  _listeId: string;
  titre: string;
  version: number;
  achetee: boolean;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('Réponse serveur invalide.');
  return value;
}
type Decoder<T> = (value: unknown) => T;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Réponse serveur invalide.');
  return Object.fromEntries(Object.entries(value));
}
function field(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Réponse serveur invalide.');
  return value;
}
export const listData: Decoder<Liste> = (value) => {
  const item = object(value);
  return {
    _id: field(item._id),
    titre: field(item.titre),
    version: version(item.__v),
  };
};
export const pieceData: Decoder<Piece> = (value) => {
  const item = object(value);
  if (typeof item.achetee !== 'boolean')
    throw new Error('Réponse serveur invalide.');
  return {
    _id: field(item._id),
    _listeId: field(item._listeId),
    titre: field(item.titre),
    version: version(item.__v),
    achetee: item.achetee,
  };
};
export const listArray: Decoder<Liste[]> = (value) => {
  if (!Array.isArray(value)) throw new Error('Réponse serveur invalide.');
  return value.map(listData);
};
export const pieceArray: Decoder<Piece[]> = (value) => {
  if (!Array.isArray(value)) throw new Error('Réponse serveur invalide.');
  return value.map(pieceData);
};
export const ignoreData: Decoder<void> = () => undefined;
@Injectable({ providedIn: 'root' })
export class Api {
  private refresh?: Promise<void>;
  hasSession() {
    return !!localStorage.getItem('x-refresh-token');
  }
  clearSession() {
    for (const key of ['idUtilisateur', 'x-access-token', 'x-refresh-token'])
      localStorage.removeItem(key);
  }
  async auth(path: string, body: object) {
    const response = await fetch('/api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const user = object(await this.read(response));
    localStorage.setItem('idUtilisateur', field(user._id));
    localStorage.setItem(
      'x-access-token',
      response.headers.get('x-access-token') || '',
    );
    localStorage.setItem(
      'x-refresh-token',
      response.headers.get('x-refresh-token') || '',
    );
  }
  async logout() {
    try {
      await fetch('/api/utilisateurs/logout', {
        method: 'POST',
        headers: this.sessionHeaders(),
      });
    } finally {
      this.clearSession();
    }
  }
  private sessionHeaders() {
    return {
      _id: localStorage.getItem('idUtilisateur') || '',
      'x-refresh-token': localStorage.getItem('x-refresh-token') || '',
    };
  }
  private async refreshToken() {
    const response = await fetch('/api/utilisateurs/moi/access-token', {
      headers: this.sessionHeaders(),
    });
    const data = object(await this.read(response));
    localStorage.setItem('x-access-token', field(data.accessToken));
  }
  async request<T>(
    path: string,
    decode: Decoder<T>,
    method = 'GET',
    body?: object,
    retry = true,
    creationKey = method === 'POST' ? crypto.randomUUID() : '',
  ): Promise<T> {
    const response = await fetch('/api/' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': localStorage.getItem('x-access-token') || '',
        ...(creationKey ? { 'Idempotency-Key': creationKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401 && retry && this.hasSession()) {
      try {
        this.refresh ||= this.refreshToken().finally(() => {
          this.refresh = undefined;
        });
        await this.refresh;
        return await this.request(
          path,
          decode,
          method,
          body,
          false,
          creationKey,
        );
      } catch (error) {
        this.clearSession();
        throw error;
      }
    }
    if (response.status === 401) this.clearSession();
    return decode(await this.read(response));
  }
  private async read(response: Response) {
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = object(data);
      throw new ApiError(
        typeof body.message === 'string'
          ? body.message
          : 'Le serveur ne répond pas. Réessayez.',
        response.status,
      );
    }
    return data;
  }
}
