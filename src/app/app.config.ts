// Configuración global de la aplicación Angular.
// Aquí registramos los "providers" — servicios disponibles en toda la app.
// Es el equivalente al módulo raíz (AppModule) en Angular antiguo.
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Captura errores no manejados y los reporta en consola
    provideBrowserGlobalErrorListeners(),

    // Sistema de rutas — withComponentInputBinding permite pasar params de
    // ruta directamente como @Input() en los componentes (Angular 16+)
    provideRouter(routes, withComponentInputBinding()),

    // Cliente HTTP para llamar al backend FastAPI
    // withInterceptorsFromDi habilita el interceptor de auth que crearemos en Phase 8.2
    provideHttpClient(withInterceptorsFromDi()),

    // Animaciones de Angular Material cargadas de forma asíncrona (mejor performance)
    provideAnimationsAsync(),
  ],
};
