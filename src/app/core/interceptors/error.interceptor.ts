import { inject }                                    from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse }      from '@angular/common/http';
import { catchError, throwError }                    from 'rxjs';

import { SnackbarService } from '../services/snackbar.service';

// ---------------------------------------------------------------------------
// errorInterceptor
//
// ANALOGÍA: servicio al cliente en la zona de llegadas.
//   Cuando un paquete (respuesta HTTP) llega dañado, este interceptor avisa
//   al usuario con un snackbar. No retiene el error — lo re-lanza siempre
//   para que el componente pueda reaccionar también si necesita.
//
// Responsabilidades:
//   403 → el usuario no tiene permisos para esa acción
//   404 → el recurso que buscaba no existe
//   500 → algo explotó en el servidor
//     0 → no hay conexión a Internet / el servidor no responde
//
// Qué NO maneja:
//   401 → lo gestiona authInterceptor (refresh + logout). Tocarlo aquí
//          produciría un doble mensaje durante el flujo de refresh.
//
// Posición en la cadena:
//   [loadingInterceptor, errorInterceptor, authInterceptor]
//   En el camino de vuelta (errores), auth lo recibe PRIMERO.
//   Solo lo que auth no resuelve llega a este interceptor.
// ---------------------------------------------------------------------------
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() obtiene servicios dentro de una función — no hay constructor aquí
  const snackbar = inject(SnackbarService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // Filtro de seguridad: solo procesamos HttpErrorResponse.
      // Si llega otro tipo de error (ej: error de programación JS),
      // lo dejamos pasar sin tocar para no enmascarar bugs.
      if (error instanceof HttpErrorResponse) {

        // 401 queda excluido — authInterceptor ya lo maneja con refresh/logout.
        // Mostrar un snackbar aquí causaría mensajes duplicados o confusos
        // durante el flujo de renovación de token.
        switch (error.status) {
          case 403:
            // El usuario está autenticado pero no tiene permisos para esta acción
            snackbar.show('No tienes permisos para esta acción.', 'error');
            break;

          case 404:
            // El recurso que se buscaba no existe en el servidor
            snackbar.show('Recurso no encontrado.', 'error');
            break;

          case 500:
            // Error inesperado en el servidor — no hay nada que el usuario pueda hacer
            snackbar.show('Error interno del servidor. Intenta de nuevo.', 'error');
            break;

          case 0:
            // status=0 significa que la petición nunca llegó al servidor:
            // sin internet, servidor caído, o bloqueado por CORS sin respuesta
            snackbar.show('Sin conexión al servidor.', 'error');
            break;

          // Cualquier otro código (400, 409, 422...) los dejan pasar sin snackbar.
          // Los componentes los manejan individualmente con mensajes más específicos
          // (ej: "El email ya está registrado" en vez de un mensaje genérico).
        }
      }

      // Siempre re-lanza el error — el interceptor no lo "consume".
      // Así el componente que hizo la petición también puede reaccionar:
      // limpiar un form, marcar un campo en rojo, redirigir, etc.
      return throwError(() => error);
    }),
  );
};
