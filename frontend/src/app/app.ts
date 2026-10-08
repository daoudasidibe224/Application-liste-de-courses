import { Component, inject, DestroyRef } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  private router = inject(Router);
  constructor() {
    const sync = (event: StorageEvent) => {
      if (!['x-refresh-token', 'idUtilisateur'].includes(event.key || ''))
        return;
      if (!localStorage.getItem('x-refresh-token'))
        void this.router.navigateByUrl('/login');
      else if (
        event.key === 'idUtilisateur' &&
        event.oldValue !== event.newValue
      )
        location.reload();
    };
    window.addEventListener('storage', sync);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener('storage', sync),
    );
  }
}
