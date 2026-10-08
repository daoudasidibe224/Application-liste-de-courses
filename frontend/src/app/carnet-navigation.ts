import { Component, input, output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Liste } from './api';
@Component({
  selector: 'app-carnet-nav',
  imports: [RouterLink],
  template: `<header class="header carnet-navigation">
    <a class="brand" routerLink="/listes"
      ><span class="carnet-symbol" aria-hidden="true">▤</span>Carnet de
      courses</a
    >
    <nav aria-label="Votre carnet" class="carnet-index">
      <a class="inventory-link" routerLink="/listes"
        >Mes listes <span>{{ lists().length }}</span></a
      >
      @if (selected()) {
        <label class="list-picker"
          ><span class="sr-only">Ouvrir une liste</span
          ><select aria-label="Ouvrir une liste" (change)="choose($event)">
            <option value="">Toutes mes listes</option>
            @for (list of lists(); track list._id) {
              <option
                [value]="list._id"
                [selected]="selected() === list._id"
                [textContent]="list.titre + (list.archived ? ' · archive' : '')"
              ></option>
            }</select
        ></label>
      }
      <a class="new-list" routerLink="/nouvelle-liste">+ Nouvelle liste</a>
      <button class="quiet" (click)="logout.emit()" [disabled]="busy()">
        Déconnexion
      </button>
    </nav>
  </header>`,
})
export class CarnetNavigation {
  lists = input<Liste[]>([]);
  selected = input('');
  busy = input(false);
  logout = output<void>();
  private router = inject(Router);
  choose(event: Event) {
    if (event.target instanceof HTMLSelectElement)
      void this.router.navigateByUrl(
        event.target.value ? '/listes/' + event.target.value : '/listes',
      );
  }
}
