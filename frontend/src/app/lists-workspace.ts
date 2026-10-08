import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Piece } from './api';
import { pieceData, ignoreData } from './api';
import { WorkspaceController } from './workspace-controller';
@Component({ selector: 'app-lists', imports: [FormsModule, RouterLink], templateUrl: './lists-workspace.html' })
export class ListsWorkspace extends WorkspaceController {
  async addQuick() {
    if (this.busy() || !this.title.trim()) return;
    this.busy.set(true); this.error.set('');
    try {
      const piece = await this.api.request(`listes/${this.selected()}/pieces`, pieceData, 'POST', { titre: this.title.trim() });
      this.pieces.update(items => [...items, piece]); this.title = ''; this.notice.set('Produit ajouté.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async toggle(piece: Piece) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      const updated = await this.api.request(`listes/${this.selected()}/pieces/${piece._id}`, pieceData, 'PATCH', { achetee: !piece.achetee });
      this.pieces.update(items => items.map(item => item._id === updated._id ? updated : item));
      this.notice.set(updated.achetee ? 'Produit acheté.' : 'Produit remis dans les courses à faire.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
  async remove(piece?: Piece) {
    if (this.busy() || !window.confirm(piece ? `Supprimer « ${piece.titre} » ?` : 'Supprimer cette liste et tous ses produits ?')) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.api.request(`listes/${this.selected()}` + (piece ? '/pieces/' + piece._id : ''), ignoreData, 'DELETE');
      if (piece) { this.pieces.update(items => items.filter(item => item._id !== piece._id)); this.notice.set('Produit supprimé.'); }
      else await this.router.navigateByUrl('/listes');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }

}
