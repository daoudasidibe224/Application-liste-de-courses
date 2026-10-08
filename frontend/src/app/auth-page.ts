import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api } from './api';
@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-page.html',
})
export class AuthPage {
  private api = inject(Api);
  router = inject(Router);
  mode = signal(
    this.router.url.startsWith('/inscription') ? 'inscription' : 'login',
  );
  busy = signal(false);
  error = signal('');
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.mode.set(
            this.router.url.startsWith('/inscription')
              ? 'inscription'
              : 'login',
          );
          this.error.set('');
        }
      });
  }
  private report(error: unknown) {
    this.error.set(error instanceof Error ? error.message : 'Réessayez.');
  }
  async authenticate() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.auth(
        this.mode() === 'login' ? 'utilisateurs/login' : 'utilisateurs',
        {
          email: this.email,
          mdp: this.password,
          nom: this.lastName,
          prenom: this.firstName,
        },
      );
      this.password = '';
      await this.router.navigateByUrl('/listes');
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }
}
