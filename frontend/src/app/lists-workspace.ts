import { CarnetNavigation } from './carnet-navigation';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Piece } from './api';
import { type Liste, listData } from './api';
import { pieceData, ignoreData } from './api';
import { WorkspaceController } from './workspace-controller';
@Component({
  selector: 'app-lists',
  imports: [FormsModule, RouterLink, CarnetNavigation],
  templateUrl: './lists-workspace.html',
})
export class ListsWorkspace extends WorkspaceController {
  listSearch = '';
  listFilter = 'active';
  page = 1;
  inventory() {
    return this.lists().filter(
      (entry) =>
        entry.titre
          .toLocaleLowerCase('fr')
          .includes(this.listSearch.toLocaleLowerCase('fr')) &&
        (this.listFilter === 'all' ||
          entry.archived === (this.listFilter === 'archived')),
    );
  }
  pages() {
    return Math.max(1, Math.ceil(this.inventory().length / 12));
  }
  pageEntries() {
    return this.inventory().slice((this.page - 1) * 12, this.page * 12);
  }
  async manage(entry: Liste, action: 'duplicate' | 'archive' | 'delete') {
    if (
      this.busy() ||
      (action === 'delete' &&
        !confirm(`Supprimer « ${entry.titre} » et tous ses produits ?`))
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.request(
        `listes/${entry._id}` + (action === 'duplicate' ? '/duplicate' : ''),
        listData,
        action === 'duplicate'
          ? 'POST'
          : action === 'archive'
            ? 'PATCH'
            : 'DELETE',
        {
          version: entry.version,
          ...(action === 'archive' ? { archived: !entry.archived } : {}),
        },
      );
      if (action === 'duplicate')
        await this.router.navigateByUrl('/listes/' + result._id);
      else {
        this.page = 1;
        this.retry();
      }
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
  async addQuick() {
    if (this.busy() || !this.title.trim()) return;
    const listId = this.selected();
    this.busy.set(true);
    this.error.set('');
    try {
      const piece = await this.api.request(
        `listes/${this.selected()}/pieces`,
        pieceData,
        'POST',
        {
          titre: this.title.trim(),
          quantity: this.quantity,
          unit: this.unit,
          category: this.category,
        },
      );
      if (listId !== this.selected()) return;
      this.pieces.update((items) => [...items, piece]);
      this.title = '';
      this.quantity = 1;
      document.getElementById('quick-title')?.focus();
      this.notice.set('Produit ajouté.');
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
  async toggle(piece: Piece, event: Event) {
    if (this.busy()) return;
    const listId = this.selected();
    this.busy.set(true);
    this.error.set('');
    try {
      const updated = await this.api.request(
        `listes/${this.selected()}/pieces/${piece._id}`,
        pieceData,
        'PATCH',
        { achetee: !piece.achetee, version: piece.version },
      );
      if (listId !== this.selected()) return;
      this.pieces.update((items) =>
        items.map((item) => (item._id === updated._id ? updated : item)),
      );
      this.notice.set(
        updated.achetee
          ? 'Produit acheté.'
          : 'Produit remis dans les courses à faire.',
      );
    } catch (error) {
      if (event.target instanceof HTMLInputElement)
        event.target.checked = piece.achetee;
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
  print() {
    window.print();
  }
  async remove(piece?: Piece) {
    if (
      this.busy() ||
      !window.confirm(
        piece
          ? `Supprimer « ${piece.titre} » ?`
          : 'Supprimer cette liste et tous ses produits ?',
      )
    )
      return;
    const listId = this.selected();
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.request(
        `listes/${this.selected()}` + (piece ? '/pieces/' + piece._id : ''),
        ignoreData,
        'DELETE',
        { version: piece ? piece.version : this.list()?.version },
      );
      if (listId !== this.selected()) return;
      if (piece) {
        if (listId !== this.selected()) return;
        this.pieces.update((items) =>
          items.filter((item) => item._id !== piece._id),
        );
        this.notice.set('Produit supprimé.');
      } else await this.router.navigateByUrl('/listes');
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
}
