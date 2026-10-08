import { Directive, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, Liste, Piece } from './api';
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
  private async load() {
    const version = ++this.loadVersion;
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    this.error.set('');
    this.notice.set('');
    this.search = '';
    this.filter = 'all';
    this.title = '';
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
      if (this.mode() === 'edit-piece')
        this.title =
          pieces.find((piece) => piece._id === this.pieceId)?.titre || '';
    } catch (error) {
      if (version === this.loadVersion) this.report(error);
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }
  protected report(error: unknown) {
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
