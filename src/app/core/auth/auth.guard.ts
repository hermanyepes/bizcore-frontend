import { inject }       from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';

import { AuthService } from './auth.service';

// Guard funcional (Angular 17+).
// Se ejecuta antes de cargar cualquier ruta que lo tenga asignado.
// Devuelve true si el usuario puede entrar, o redirige al login si no.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isLoggedIn()) {
    // Hay sesión activa y el token no está vencido — dejar pasar
    return true;
  }

  // No hay sesión — redirigir al login
  // router.createUrlTree() crea una redirección limpia (mejor que navigate() en guards)
  return router.createUrlTree(['/login']);
};
