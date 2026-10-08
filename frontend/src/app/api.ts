import { Injectable } from '@angular/core';
export interface Liste { _id: string; titre: string; }
export interface Piece { _id: string; _listeId: string; titre: string; achetee: boolean; }
@Injectable({ providedIn: 'root' })
export class Api {
  private refresh?: Promise<void>;
  hasSession() { return !!localStorage.getItem('x-refresh-token'); }
  clearSession() { for (const key of ['idUtilisateur', 'x-access-token', 'x-refresh-token']) localStorage.removeItem(key); }
  async auth(path: string, body: object) {
    const response = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const user = await this.read(response);
    localStorage.setItem('idUtilisateur', user._id);
    localStorage.setItem('x-access-token', response.headers.get('x-access-token') || '');
    localStorage.setItem('x-refresh-token', response.headers.get('x-refresh-token') || '');
  }
  async logout() {
    try { await fetch('/api/utilisateurs/logout', { method: 'POST', headers: this.sessionHeaders() }); }
    finally { this.clearSession(); }
  }
  private sessionHeaders() { return { '_id': localStorage.getItem('idUtilisateur') || '', 'x-refresh-token': localStorage.getItem('x-refresh-token') || '' }; }
  private async refreshToken() {
    const response = await fetch('/api/utilisateurs/moi/access-token', { headers: this.sessionHeaders() });
    const data = await this.read(response);
    localStorage.setItem('x-access-token', data.accessToken);
  }
  async request<T>(path: string, method = 'GET', body?: object, retry = true): Promise<T> {
    const response = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('x-access-token') || '' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 401 && retry && this.hasSession()) {
      try {
        this.refresh ||= this.refreshToken().finally(() => { this.refresh = undefined; });
        await this.refresh;
        return await this.request<T>(path, method, body, false);
      } catch (error) { this.clearSession(); throw error; }
    }
    if (response.status === 401) this.clearSession();
    return this.read(response);
  }
  private async read(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Le serveur ne répond pas. Réessayez.');
    return data;
  }
}
