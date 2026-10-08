import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app';
import { AuthPage } from './app/auth-page';
import { ListsWorkspace } from './app/lists-workspace';
import { TitleEditor } from './app/title-editor';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  ...['login', 'inscription'].map(path => ({ path, component: AuthPage })),
  ...['listes', 'listes/:listeId'].map(path => ({ path, component: ListsWorkspace })),
  ...['nouvelle-liste', 'modifier-liste/:listeId', 'listes/:listeId/nouvelle-piece', 'listes/:listeId/modifier-piece/:pieceId'].map(path => ({ path, component: TitleEditor })),
  { path: '**', redirectTo: 'listes' }
];
bootstrapApplication(AppComponent, { providers: [provideRouter(routes)] }).catch(console.error);
