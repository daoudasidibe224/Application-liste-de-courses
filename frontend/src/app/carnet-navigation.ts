import { Component, input, output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Liste } from './api';
@Component({
  selector: 'app-carnet-nav',
  imports: [RouterLink],
  template: ` <header class="header carnet-navigation">
    <p class="nav-caption">Votre carnet personnel</p>
    <a class="brand" routerLink="/listes">Carnet de courses</a>
    <div class="carnet-index">
      <label
        >Ouvrir une liste<select
          aria-label="Ouvrir une liste"
          (change)="choose($event)"
        >
          <option value="" [selected]="!selected()">Toutes mes listes</option>
          @for (list of lists(); track list._id) {
            <option [value]="list._id" [selected]="selected() === list._id">{{ list.titre }}</option>
          }
        </select></label
      ><a class="new-list" routerLink="/nouvelle-liste">+ Nouvelle liste</a
      ><button class="quiet" (click)="logout.emit()" [disabled]="busy()">
        Déconnexion
      </button>
    </div>
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
