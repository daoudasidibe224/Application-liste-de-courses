import { Directive, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, ApiError, Liste, Piece, units, categories } from './api';
import { listArray, pieceArray } from './api';
@Directive()
export abstract class WorkspaceController {
  protected api = inject(Api);
  router = inject(Router);
  lists = signal<Liste[]>([]);
  pieces = signal<Piece[]>([]);
  busy = signal(false);
  loading = signal(false);
  error = signal('');
  notice = signal('');
  mode = signal('login');
  selected = signal('');
  pieceId = '';
  title = '';
  search = '';
  filter = 'all';
  units = units;
  categories = categories;
  quantity = 1;
  unit = 'pièce';
  category = 'Autres';
  detailsOpen = false;
  storeMode = false;
  sort = 'category';
  private loadVersion = 0;
  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) void this.load();
      });
    void this.load();
  }
  list() {
    return this.lists().find((list) => list._id === this.selected());
  }
  remaining() {
    return this.pieces().filter((piece) => !piece.achetee).length;
  }
  validDetails() {
    return (
      Number.isFinite(this.quantity) &&
      this.quantity > 0 &&
      this.quantity <= 999 &&
      Math.abs(Math.round(this.quantity * 1000) - this.quantity * 1000) <
        0.000001
    );
  }
  saveView() {
    try {
      localStorage.setItem(
        'courses-view-' + (localStorage.getItem('idUtilisateur') || ''),
        JSON.stringify({ storeMode: this.storeMode, sort: this.sort }),
      );
    } catch {
      this.error.set(
        'Le navigateur ne peut pas retenir vos préférences. Vos courses restent enregistrées.',
      );
    }
  }
  toggleStore() {
    this.storeMode = !this.storeMode;
    if (this.storeMode) {
      this.search = '';
      this.filter = 'all';
    }
    this.saveView();
  }
  groups() {
    const items = this.visiblePieces().slice();
    if (this.sort === 'name')
      items.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    if (this.sort === 'remaining')
      items.sort((a, b) => Number(a.achetee) - Number(b.achetee));
    if (this.sort !== 'category')
      return [{ category: 'Tous les produits', pieces: items }];
    return this.categories
      .map((category) => ({
        category,
        pieces: items.filter((piece) => piece.category === category),
      }))
      .filter((group) => group.pieces.length);
  }
  visiblePieces() {
    return this.pieces().filter(
      (piece) =>
        piece.titre
          .toLocaleLowerCase('fr')
          .includes(this.search.toLocaleLowerCase('fr')) &&
        (this.filter === 'all' ||
          (this.filter === 'remaining' ? !piece.achetee : piece.achetee)),
    );
  }
  retry() {
    void this.load(true);
  }
  private async load(preserveDraft = false) {
    const draft = {
      title: this.title,
      quantity: this.quantity,
      unit: this.unit,
      category: this.category,
    };
    const version = ++this.loadVersion;
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    this.error.set('');
    this.notice.set('');
    this.search = '';
    this.filter = 'all';
    this.title = '';
    this.quantity = 1;
    this.unit = 'pièce';
    this.category = 'Autres';
    this.pieceId = segments[3] || '';
    this.selected.set(
      segments[0] === 'modifier-liste'
        ? segments[1] || ''
        : segments[0] === 'listes'
          ? segments[1] || ''
          : '',
    );
    this.mode.set(
      segments[0] === 'login' || segments[0] === 'inscription'
        ? segments[0]
        : segments[0] === 'nouvelle-liste'
          ? 'new-list'
          : segments[0] === 'modifier-liste'
            ? 'edit-list'
            : segments[2] === 'nouvelle-piece'
              ? 'new-piece'
              : segments[2] === 'modifier-piece'
                ? 'edit-piece'
                : 'lists',
    );
    if (['login', 'inscription'].includes(this.mode())) return;
    if (!this.api.hasSession()) {
      await this.router.navigateByUrl('/login');
      return;
    }
    this.loading.set(true);
    try {
      const [lists, pieces] = await Promise.all([
        this.api.request('listes', listArray),
        this.selected()
          ? this.api.request(`listes/${this.selected()}/pieces`, pieceArray)
          : Promise.resolve([]),
      ]);
      if (version !== this.loadVersion) return;
      this.lists.set(lists);
      this.pieces.set(pieces);
      if (this.mode() === 'edit-list') this.title = this.list()?.titre || '';
      if (this.mode() === 'edit-piece') {
        const piece = pieces.find((piece) => piece._id === this.pieceId);
        this.title = piece?.titre || '';
        this.quantity = piece?.quantity || 1;
        this.unit = piece?.unit || 'pièce';
        this.category = piece?.category || 'Autres';
      }
      if (preserveDraft) Object.assign(this, draft);
      try {
        const preference: unknown = JSON.parse(
          localStorage.getItem(
            'courses-view-' + (localStorage.getItem('idUtilisateur') || ''),
          ) || 'null',
        );
        if (preference && typeof preference === 'object') {
          if (
            'storeMode' in preference &&
            typeof preference.storeMode === 'boolean'
          )
            this.storeMode = preference.storeMode;
          if (
            'sort' in preference &&
            typeof preference.sort === 'string' &&
            ['category', 'name', 'remaining', 'created'].includes(
              preference.sort,
            )
          )
            this.sort = preference.sort;
        }
      } catch {
        /* Les préférences facultatives ne bloquent pas les listes. */
      }
    } catch (error) {
      if (version === this.loadVersion) this.report(error);
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }
  protected report(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      const message = error.message;
      void this.load(true).then(() => this.error.set(message));
    }
    this.error.set(
      error instanceof Error
        ? error.message
        : 'La connexion a échoué. Réessayez.',
    );
    if (
      !this.api.hasSession() &&
      !['login', 'inscription'].includes(this.mode())
    )
      void this.router.navigateByUrl('/login');
  }
  async logout() {
    this.busy.set(true);
    try {
      await this.api.logout();
    } catch {
      /* La session locale est tout de même supprimée. */
    } finally {
      this.busy.set(false);
      await this.router.navigateByUrl('/login');
    }
  }
}
