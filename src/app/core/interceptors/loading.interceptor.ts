import { inject }           from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize }          from 'rxjs/operators';

import { LoadingService } from '../services/loading.service';

/**
 * Interceptor funcional que activa y desactiva el spinner global
 * en cada petición HTTP que hace la aplicación.
 *
 * Flujo:
 *   1. Petición sale  → loadingService.show()   (incrementa contador)
 *   2. Petición entra → finalize()              (decrementa contador)
 *      finalize se ejecuta SIEMPRE: tanto en éxito como en error.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() permite obtener servicios dentro de una función interceptora.
  // No podemos usar el constructor porque no es una clase — es una función pura.
  const loadingService = inject(LoadingService);

  // --- Paso 1: avisar al servicio que hay una petición en vuelo ---
  loadingService.show();

  // --- Paso 2: dejar pasar el request y engancharse al final ---
  return next(req).pipe(
    // finalize = "sin importar cómo termine este Observable, ejecuta esto"
    // Es el equivalente del bloque `finally` en un try/catch/finally.
    // Se ejecuta tanto si llega una respuesta 200 como si llega un 500 o
    // si el usuario navega fuera antes de que termine (cancelación).
    finalize(() => loadingService.hide()),
  );
};
