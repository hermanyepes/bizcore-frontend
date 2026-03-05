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
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Captura errores no manejados y los reporta en consola
    provideBrowserGlobalErrorListeners(),

    // Sistema de rutas — withComponentInputBinding permite pasar params de
    // ruta directamente como @Input() en los componentes (Angular 16+)
    provideRouter(routes, withComponentInputBinding()),

    // Cliente HTTP con el interceptor de auth registrado.
    // withInterceptors([]) acepta interceptores funcionales (Angular 17+).
    // El interceptor adjunta automáticamente el Bearer token a cada request.
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
