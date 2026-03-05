import { inject }                                       from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError }              from 'rxjs';

import { AuthService }   from './auth.service';
import { TokenResponse } from '../models/auth.model';

// Endpoints de autenticación — estos NO llevan token en el header.
// Si los interceptáramos, crearíamos un bucle infinito:
// refresh falla → interceptor intenta refresh → refresh falla → ...
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

// Verifica si la URL corresponde a un endpoint público
function isAuthPath(url: string): boolean {
  return AUTH_PATHS.some(path => url.includes(path));
}

// Clona el request añadiendo el header Authorization.
// HttpRequest es inmutable — no se puede modificar directamente, hay que clonar.
function withBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

// Interceptor funcional (Angular 17+).
// Recibe cada request saliente y puede modificarlo o reaccionar a la respuesta.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // --- Paso 1: dejar pasar los endpoints de auth sin modificar ---
  if (isAuthPath(req.url)) {
    return next(req);
  }

  // --- Paso 2: adjuntar el token si existe ---
  const token = authService.accessToken();
  const outgoingReq = token ? withBearerToken(req, token) : req;

  // --- Paso 3: enviar el request y vigilar la respuesta ---
  return next(outgoingReq).pipe(
    catchError(error => {
      // Solo nos interesa el 401 — cualquier otro error lo dejamos pasar sin tocar
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // Recibimos 401: el access_token venció.
      // Intentamos renovarlo con el refresh_token.
      const refresh$ = authService.refreshAccessToken();

      if (!refresh$) {
        // No hay refresh_token guardado — la sesión está muerta
        authService.logout();
        return throwError(() => error);
      }

      return refresh$.pipe(
        // switchMap recibe el TokenResponse del refresh exitoso
        // y reenvía el request original con el nuevo access_token
        switchMap((newTokens: TokenResponse) =>
          next(withBearerToken(req, newTokens.access_token))
        ),

        // Si el refresh también falla (token revocado, expirado en BD)
        // no hay más opciones — cerramos sesión
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
