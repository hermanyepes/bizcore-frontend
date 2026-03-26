import { TestBed }              from '@angular/core/testing';
import { HttpClient }           from '@angular/common/http';
import {
  provideHttpClient,
  withInterceptors,
}                               from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
}                               from '@angular/common/http/testing';

import { errorInterceptor }  from './error.interceptor';
import { SnackbarService }   from '../services/snackbar.service';

// ---------------------------------------------------------------------------
// Spec del errorInterceptor
//
// Técnica central — HTTP falso con HttpTestingController:
//   - provideHttpClient + withInterceptors([errorInterceptor]) registra el
//     interceptor en la cadena HTTP del entorno de tests.
//   - provideHttpClientTesting() reemplaza el transporte TCP real por uno
//     controlado: las peticiones no salen a Internet, las controlamos nosotros.
//   - controller.expectOne('/test') captura la petición pendiente y nos deja
//     responder con el status code que queremos simular.
//
// Tests organizados por grupos:
//   1. Errores que muestran snackbar (403 / 404 / 500 / 0)
//   2. Errores que NO muestran snackbar (401 — lo maneja authInterceptor)
//   3. Respuestas exitosas — snackbar no se llama nunca
//   4. Re-lanzamiento — el error siempre llega al subscriber
// ---------------------------------------------------------------------------

describe('errorInterceptor', () => {
  let http:       HttpClient;
  let controller: HttpTestingController;
  let snackbar:   SnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // Registra el interceptor en la cadena HTTP del test
        provideHttpClient(withInterceptors([errorInterceptor])),
        // Activa el transporte falso — ninguna petición sale a Internet
        provideHttpClientTesting(),
      ],
    });

    http       = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    snackbar   = TestBed.inject(SnackbarService);

    // Espiamos show() para verificar si fue llamado y con qué argumentos.
    // vi.spyOn reemplaza el método real con una versión que registra las llamadas.
    vi.spyOn(snackbar, 'show');
  });

  afterEach(() => {
    // Verifica que no quedaron peticiones HTTP sin responder.
    // Si quedara una, significa que el test no está bien armado.
    controller.verify();
  });

  // ─── Creación ────────────────────────────────────────────────────────────
  // Verifica que el interceptor se registra sin errores en el entorno de test.

  it('should configure without errors', () => {
    expect(http).toBeTruthy();
  });

  // ─── 403 Forbidden ───────────────────────────────────────────────────────
  // El usuario está autenticado pero no tiene permisos.
  // Esperamos el mensaje de permisos con tipo 'error'.

  it('should show permission-denied snackbar on 403', () => {
    // Hacemos la petición — no importa la URL en tests
    http.get('/test').subscribe({ error: () => {} });

    // Respondemos con 403 Forbidden
    controller.expectOne('/test').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(snackbar.show).toHaveBeenCalledWith(
      'No tienes permisos para esta acción.',
      'error',
    );
  });

  // ─── 404 Not Found ───────────────────────────────────────────────────────
  // El recurso buscado no existe en el servidor.

  it('should show not-found snackbar on 404', () => {
    http.get('/test').subscribe({ error: () => {} });

    controller.expectOne('/test').flush(null, { status: 404, statusText: 'Not Found' });

    expect(snackbar.show).toHaveBeenCalledWith(
      'Recurso no encontrado.',
      'error',
    );
  });

  // ─── 500 Internal Server Error ───────────────────────────────────────────
  // Algo falló en el servidor — el usuario no puede hacer nada.

  it('should show server-error snackbar on 500', () => {
    http.get('/test').subscribe({ error: () => {} });

    controller.expectOne('/test').flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(snackbar.show).toHaveBeenCalledWith(
      'Error interno del servidor. Intenta de nuevo.',
      'error',
    );
  });

  // ─── Status 0 — sin conexión ─────────────────────────────────────────────
  // status=0 significa que la petición nunca llegó al servidor.
  // Se simula con error() en vez de flush() — flush simula una respuesta HTTP,
  // error() simula un fallo de red a nivel de transporte.

  it('should show no-connection snackbar on status 0', () => {
    http.get('/test').subscribe({ error: () => {} });

    // ProgressEvent simula un fallo de red (lo que lanza el navegador sin conexión)
    controller.expectOne('/test').error(new ProgressEvent('error'));

    expect(snackbar.show).toHaveBeenCalledWith(
      'Sin conexión al servidor.',
      'error',
    );
  });

  // ─── 401 — NO debe mostrar snackbar ──────────────────────────────────────
  // El 401 lo maneja authInterceptor.
  // Si errorInterceptor también mostrara un snackbar, el usuario vería
  // dos mensajes durante el flujo de refresh o de logout — uno falso.

  it('should NOT show snackbar on 401 (handled by authInterceptor)', () => {
    http.get('/test').subscribe({ error: () => {} });

    controller.expectOne('/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(snackbar.show).not.toHaveBeenCalled();
  });

  // ─── 200 OK — NO debe mostrar snackbar ───────────────────────────────────
  // Una respuesta exitosa nunca debe activar el interceptor de errores.

  it('should NOT show snackbar on successful 200 response', () => {
    http.get('/test').subscribe();

    controller.expectOne('/test').flush({ id: 1 }, { status: 200, statusText: 'OK' });

    expect(snackbar.show).not.toHaveBeenCalled();
  });

  // ─── Re-lanzamiento ───────────────────────────────────────────────────────
  // El interceptor muestra el snackbar pero SIEMPRE re-lanza el error.
  // El componente que hizo la petición debe seguir recibiendo el error
  // en su callback para poder limpiar formularios, redirigir, etc.

  it('should re-throw the error so the subscriber still receives it', () => {
    // Función vacía que registrará si el error llegó al subscriber
    const errorSpy = vi.fn();

    http.get('/test').subscribe({ error: errorSpy });

    controller.expectOne('/test').flush(null, { status: 500, statusText: 'Internal Server Error' });

    // El snackbar se mostró Y el subscriber recibió el error — ambas cosas deben pasar
    expect(snackbar.show).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  // ─── Códigos sin snackbar (400, 409, 422) ─────────────────────────────────
  // Estos errores los manejan los componentes individualmente con mensajes
  // más específicos. El interceptor no debe interferir.

  it('should NOT show snackbar on 400 (handled by individual components)', () => {
    http.get('/test').subscribe({ error: () => {} });

    controller.expectOne('/test').flush(null, { status: 400, statusText: 'Bad Request' });

    expect(snackbar.show).not.toHaveBeenCalled();
  });

  it('should NOT show snackbar on 409 (handled by individual components)', () => {
    http.get('/test').subscribe({ error: () => {} });

    controller.expectOne('/test').flush(null, { status: 409, statusText: 'Conflict' });

    expect(snackbar.show).not.toHaveBeenCalled();
  });
});
