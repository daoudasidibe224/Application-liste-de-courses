import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, Liste, Piece } from './api';
@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
export class AppComponent {}
@Component({ selector: 'app-courses', imports: [FormsModule, RouterLink], templateUrl: './page.html' })
export class CoursesPage {
  private api = inject(Api);
  router = inject(Router);
  lists = signal<Liste[]>([]); pieces = signal<Piece[]>([]);
  busy = signal(false); loading = signal(false); error = signal(''); notice = signal('');
  mode = signal('login'); selected = signal(''); pieceId = '';
  title = ''; email = ''; password = ''; firstName = ''; lastName = ''; search = ''; filter = 'all';
  private loadVersion = 0;
  constructor() {
    this.router.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(event => { if (event instanceof NavigationEnd) void this.load(); });
    void this.load();
  }
  list() { return this.lists().find(list => list._id === this.selected()); }
  remaining() { return this.pieces().filter(piece => !piece.achetee).length; }
  visiblePieces() { return this.pieces().filter(piece => piece.titre.toLocaleLowerCase('fr').includes(this.search.toLocaleLowerCase('fr')) && (this.filter === 'all' || (this.filter === 'remaining' ? !piece.achetee : piece.achetee))); }
  private async load() {
    const version = ++this.loadVersion;
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    this.error.set(''); this.notice.set(''); this.search = ''; this.filter = 'all'; this.title = '';
    this.pieceId = segments[3] || '';
    this.selected.set(segments[0] === 'modifier-liste' ? segments[1] || '' : segments[0] === 'listes' ? segments[1] || '' : '');
    this.mode.set(segments[0] === 'login' || segments[0] === 'inscription' ? segments[0] : segments[0] === 'nouvelle-liste' ? 'new-list' : segments[0] === 'modifier-liste' ? 'edit-list' : segments[2] === 'nouvelle-piece' ? 'new-piece' : segments[2] === 'modifier-piece' ? 'edit-piece' : 'lists');
    if (['login', 'inscription'].includes(this.mode())) return;
    if (!this.api.hasSession()) { await this.router.navigateByUrl('/login'); return; }
    this.loading.set(true);
    try {
      const [lists, pieces] = await Promise.all([this.api.request<Liste[]>('listes'), this.selected() ? this.api.request<Piece[]>(`listes/${this.selected()}/pieces`) : Promise.resolve([])]);
      if (version !== this.loadVersion) return;
      this.lists.set(lists); this.pieces.set(pieces);
      if (this.mode() === 'edit-list') this.title = this.list()?.titre || '';
      if (this.mode() === 'edit-piece') this.title = pieces.find(piece => piece._id === this.pieceId)?.titre || '';
    } catch (error) { if (version === this.loadVersion) this.report(error); }
    finally { if (version === this.loadVersion) this.loading.set(false); }
  }
  private report(error: unknown) {
    this.error.set(error instanceof Error ? error.message : 'La connexion a échoué. Réessayez.');
    if (!this.api.hasSession() && !['login', 'inscription'].includes(this.mode())) void this.router.navigateByUrl('/login');
  }
  async authenticate() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.api.auth(this.mode() === 'login' ? 'utilisateurs/login' : 'utilisateurs', { email: this.email, mdp: this.password, nom: this.lastName, prenom: this.firstName });
      this.password = ''; await this.router.navigateByUrl('/listes');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async saveTitle() {
    if (this.busy() || !this.title.trim()) return;
    this.busy.set(true); this.error.set('');
    try {
      if (this.mode() === 'new-list') {
        const list = await this.api.request<Liste>('listes', 'POST', { titre: this.title.trim() });
        await this.router.navigateByUrl('/listes/' + list._id);
      } else {
        const path = this.mode() === 'edit-list' ? `listes/${this.selected()}` : `listes/${this.selected()}/pieces` + (this.mode() === 'edit-piece' ? '/' + this.pieceId : '');
        await this.api.request(path, this.mode() === 'new-piece' ? 'POST' : 'PATCH', { titre: this.title.trim() });
        await this.router.navigateByUrl('/listes/' + this.selected());
      }
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async addQuick() {
    if (this.busy() || !this.title.trim()) return;
    this.busy.set(true); this.error.set('');
    try {
      const piece = await this.api.request<Piece>(`listes/${this.selected()}/pieces`, 'POST', { titre: this.title.trim() });
      this.pieces.update(items => [...items, piece]); this.title = ''; this.notice.set('Produit ajouté.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async toggle(piece: Piece) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const updated = await this.api.request<Piece>(`listes/${this.selected()}/pieces/${piece._id}`, 'PATCH', { achetee: !piece.achetee });
      this.pieces.update(items => items.map(item => item._id === updated._id ? updated : item));
      this.notice.set(updated.achetee ? 'Produit acheté.' : 'Produit remis dans les courses à faire.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async remove(piece?: Piece) {
    if (this.busy() || !window.confirm(piece ? `Supprimer « ${piece.titre} » ?` : 'Supprimer cette liste et tous ses produits ?')) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.api.request(`listes/${this.selected()}` + (piece ? '/pieces/' + piece._id : ''), 'DELETE');
      if (piece) { this.pieces.update(items => items.filter(item => item._id !== piece._id)); this.notice.set('Produit supprimé.'); }
      else await this.router.navigateByUrl('/listes');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async logout() {
    this.busy.set(true);
    try { await this.api.logout(); } catch { /* La session locale est tout de même supprimée. */ }
    finally { this.busy.set(false); await this.router.navigateByUrl('/login'); }
  }
}
