import { Routes }   from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Ruta pública — accesible sin sesión
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },

  // Ruta shell — el "edificio" protegido por authGuard.
  // LayoutComponent es el contenedor (navbar + sidebar + router-outlet).
  // Todas las rutas hijas heredan la protección del guard automáticamente.
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      // Dashboard — primera "oficina" dentro del edificio
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      // Módulo de usuarios — lista
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users-list/users-list.component').then(m => m.UsersListComponent),
      },
      // Módulo de usuarios — detalle de un usuario por document_id
      // :id es el parámetro dinámico; ActivatedRoute lo lee en el componente
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/users/user-detail/user-detail.component').then(m => m.UserDetailComponent),
      },
      // Ruta raíz vacía — redirige al dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Comodín — cualquier URL desconocida vuelve al dashboard
  // (el guard interceptará si no hay sesión)
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
