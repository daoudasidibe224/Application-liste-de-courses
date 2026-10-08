import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent, CoursesPage } from './app/app';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  ...['login', 'inscription', 'listes', 'listes/:listeId', 'nouvelle-liste', 'modifier-liste/:listeId', 'listes/:listeId/nouvelle-piece', 'listes/:listeId/modifier-piece/:pieceId'].map(path => ({ path, component: CoursesPage })),
  { path: '**', redirectTo: 'listes' }
];
bootstrapApplication(AppComponent, { providers: [provideRouter(routes)] }).catch(console.error);
