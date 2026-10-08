import { CarnetNavigation } from './carnet-navigation';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { listData, ignoreData } from './api';
import { WorkspaceController } from './workspace-controller';
@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink, CarnetNavigation],
  templateUrl: './title-editor.html',
})
export class TitleEditor extends WorkspaceController {
  async saveTitle() {
    if (this.busy() || !this.title.trim()) return;
    const route = this.router.url;
    const listId = this.selected();
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'new-list') {
        const list = await this.api.request('listes', listData, 'POST', {
          titre: this.title.trim(),
        });
        if (route === this.router.url)
          await this.router.navigateByUrl('/listes/' + list._id);
      } else {
        const path =
          this.mode() === 'edit-list'
            ? `listes/${this.selected()}`
            : `listes/${this.selected()}/pieces` +
              (this.mode() === 'edit-piece' ? '/' + this.pieceId : '');
        await this.api.request(
          path,
          ignoreData,
          this.mode() === 'new-piece' ? 'POST' : 'PATCH',
          {
            titre: this.title.trim(),
            ...(['edit-piece', 'new-piece'].includes(this.mode())
              ? {
                  quantity: this.quantity,
                  unit: this.unit,
                  category: this.category,
                }
              : {}),
            version:
              this.mode() === 'edit-list'
                ? this.list()?.version
                : this.pieces().find((piece) => piece._id === this.pieceId)
                    ?.version,
          },
        );
        if (route === this.router.url)
          await this.router.navigateByUrl('/listes/' + listId);
      }
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
}
