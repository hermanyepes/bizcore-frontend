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
      // Formulario de usuario — modo CREAR
      // IMPORTANTE: debe estar ANTES de 'users/:id'. Angular evalúa rutas
      // en orden; si 'users/:id' fuera primero, "new" se leería como el id
      // y se cargaría UserDetailComponent en vez del formulario.
      {
        path: 'users/new',
        loadComponent: () =>
          import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent),
      },
      // Módulo de usuarios — detalle de un usuario por document_id
      // :id es el parámetro dinámico; ActivatedRoute lo lee en el componente
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/users/user-detail/user-detail.component').then(m => m.UserDetailComponent),
      },
      // Formulario de usuario — modo EDITAR
      // Usa el mismo componente que /users/new. El componente detecta el modo
      // leyendo si existe el parámetro :id en la URL.
      {
        path: 'users/:id/edit',
        loadComponent: () =>
          import('./features/users/user-form/user-form.component').then(m => m.UserFormComponent),
      },
      // Módulo de productos — lista paginada
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products-list/products-list.component').then(m => m.ProductsListComponent),
      },
      // Formulario de producto — modo CREAR
      // IMPORTANTE: debe estar ANTES de 'products/:id' por la misma razón
      // que 'users/new': si ':id' fuera primero, "new" se leería como el id.
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent),
      },
      // Detalle de un producto por su id numérico
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/products/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
      },
      // Formulario de producto — modo EDITAR
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/products/product-form/product-form.component').then(m => m.ProductFormComponent),
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
