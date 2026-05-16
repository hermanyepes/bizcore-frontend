import { inject }        from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';

import { AuthService } from './auth.service';

// Factory que devuelve un guard configurado para los roles recibidos.
// Separa autorización (este guard) de autenticación (authGuard),
// siguiendo el principio de responsabilidad única:
//   authGuard → ¿hay sesión activa?
//   roleGuard → ¿el rol tiene permiso para esta ruta?
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    const user = authService.currentUser();

    // Caso defensivo: authGuard ya intercepta rutas sin sesión antes de llegar aquí.
    // Si de alguna forma currentUser es null, enviamos al login para no romper la UX.
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // El usuario está autenticado pero no tiene el rol requerido para esta ruta.
    // Redirigimos a /dashboard en lugar de mostrar un 403 porque el usuario sí
    // tiene sesión válida — la restricción es de permiso, no de identidad.
    // Este caso solo ocurre si alguien teclea la URL directamente, ya que los
    // links del menú ya están ocultos según el rol.
    return router.createUrlTree(['/dashboard']);
  };
}
