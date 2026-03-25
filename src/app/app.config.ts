// Configuración global de la aplicación Angular.
// Aquí registramos los "providers" — servicios disponibles en toda la app.
// Es el equivalente al módulo raíz (AppModule) en Angular antiguo.
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors }      from '@angular/common/http';
import { routes }          from './app.routes';
import { authInterceptor }    from './core/auth/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorInterceptor }   from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Captura errores no manejados y los reporta en consola
    provideBrowserGlobalErrorListeners(),

    // Sistema de rutas — withComponentInputBinding permite pasar params de
    // ruta directamente como @Input() en los componentes (Angular 16+)
    provideRouter(routes, withComponentInputBinding()),

    // Cliente HTTP con la cadena de interceptores registrada.
    // withInterceptors([]) acepta interceptores funcionales (Angular 17+).
    // El orden importa — los errores recorren la cadena en orden INVERSO:
    //   loading  → primero en salida, último en llegada (envuelve todo)
    //   error    → recibe los errores que auth no resolvió y muestra snackbar
    //   auth     → recibe los errores del servidor primero; maneja el 401
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor, authInterceptor])),
  ],
};
