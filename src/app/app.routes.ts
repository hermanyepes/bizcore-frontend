import { Routes }   from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Ruta pública — accesible sin sesión
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },

  // Ruta raíz — redirige al dashboard si hay sesión, o al login si no
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  // Ruta comodín — cualquier URL desconocida redirige al dashboard
  // (el guard se encargará de redirigir al login si no hay sesión)
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
