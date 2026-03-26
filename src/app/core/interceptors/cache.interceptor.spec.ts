import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { cacheInterceptor, clearCache } from './cache.interceptor';

// ---------------------------------------------------------------------------
// URL de prueba — cualquier string sirve; usamos uno descriptivo
// ---------------------------------------------------------------------------
const TEST_URL      = '/api/products';
const TEST_URL_P2   = '/api/products?page=2';
const MOCK_BODY     = [{ id: 1, name: 'Producto A' }];
const MOCK_BODY_P2  = [{ id: 2, name: 'Producto B' }];

// ---------------------------------------------------------------------------
// Helper: realiza un GET y responde con el mock desde el servidor de prueba.
// Devuelve el body recibido por el suscriptor.
// ---------------------------------------------------------------------------
function doGetAndFlush(
  http: HttpClient,
  controller: HttpTestingController,
  url:  string,
  body: unknown,
): unknown {
  let result: unknown;
  http.get(url).subscribe(r => (result = r));
  // expectOne() verifica que llegó EXACTAMENTE una petición a esa URL
  // y devuelve un objeto con el que podemos simular la respuesta del servidor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controller.expectOne(url).flush(body as any);
  return result;
}

// ---------------------------------------------------------------------------
// IMPORTANTE: el mapa de caché vive en el módulo y persiste entre tests.
// Necesitamos reiniciarlo antes de cada test para que no haya interferencias.
// Lo hacemos haciendo peticiones que expiren — en este archivo usamos
// vi.useFakeTimers() para controlar el reloj sin esperar tiempos reales.
// ---------------------------------------------------------------------------

describe('cacheInterceptor', () => {
  let http:       HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    // Limpiamos el mapa antes de cada test — el Map vive a nivel de módulo
    // y persistiría entre tests si no se reinicia, causando falsos hits de caché
    clearCache();

    // Usamos temporizadores falsos para poder avanzar el reloj manualmente
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http       = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifica que no quedaron peticiones pendientes sin responder
    controller.verify();
    // Restaura el reloj real y avanza el tiempo para expirar cualquier
    // entrada que haya quedado en el mapa entre tests
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Grupo 1: comportamiento básico del caché
  // -------------------------------------------------------------------------
  describe('caché GET', () => {

    it('debe dejar pasar la primera petición GET al servidor', () => {
      // Escenario: el mapa está vacío → la petición debe llegar al servidor.
      // expectOne() lanzaría error si la petición NO llegara al servidor.
      const result = doGetAndFlush(http, controller, TEST_URL, MOCK_BODY);
      expect(result).toEqual(MOCK_BODY);
    });

    it('debe devolver la respuesta cacheada en la segunda petición sin ir al servidor', () => {
      // Primera petición — llena el caché
      doGetAndFlush(http, controller, TEST_URL, MOCK_BODY);

      // Segunda petición — debe resolverse desde el caché
      let result: unknown;
      http.get(TEST_URL).subscribe(r => (result = r));

      // expectNone() verifica que NO llegó ninguna petición al servidor
      controller.expectNone(TEST_URL);
      expect(result).toEqual(MOCK_BODY);
    });

    it('debe volver al servidor cuando el caché ha expirado', () => {
      // Primera petición — llena el caché
      doGetAndFlush(http, controller, TEST_URL, MOCK_BODY);

      // Avanzamos el reloj 31 segundos → la entrada ya expiró
      vi.advanceTimersByTime(31_000);

      // Segunda petición — el caché expiró, debe ir al servidor
      const freshBody = [{ id: 99, name: 'Nuevo producto' }];
      const result    = doGetAndFlush(http, controller, TEST_URL, freshBody);
      expect(result).toEqual(freshBody);
    });

    it('debe seguir devolviendo el caché si aún no han pasado 30 segundos', () => {
      // Primera petición — llena el caché
      doGetAndFlush(http, controller, TEST_URL, MOCK_BODY);

      // Avanzamos solo 29 segundos — el caché sigue vigente
      vi.advanceTimersByTime(29_000);

      let result: unknown;
      http.get(TEST_URL).subscribe(r => (result = r));

      controller.expectNone(TEST_URL);
      expect(result).toEqual(MOCK_BODY);
    });

  });

  // -------------------------------------------------------------------------
  // Grupo 2: los métodos que mutan estado nunca se cachean
  // -------------------------------------------------------------------------
  describe('métodos no-GET', () => {

    it('debe dejar pasar POST sin cachear', () => {
      const payload = { name: 'Nuevo producto' };
      let result: unknown;

      http.post(TEST_URL, payload).subscribe(r => (result = r));
      controller.expectOne(TEST_URL).flush({ id: 10, ...payload });

      expect(result).toEqual({ id: 10, ...payload });
    });

    it('debe dejar pasar PUT sin cachear', () => {
      const payload = { name: 'Editado' };
      let result: unknown;

      http.put(`${TEST_URL}/1`, payload).subscribe(r => (result = r));
      controller.expectOne(`${TEST_URL}/1`).flush({ id: 1, ...payload });

      expect(result).toEqual({ id: 1, ...payload });
    });

    it('debe dejar pasar DELETE sin cachear', () => {
      let result: unknown;

      http.delete(`${TEST_URL}/1`).subscribe(r => (result = r));
      controller.expectOne(`${TEST_URL}/1`).flush(null);

      expect(result).toBeNull();
    });

    it('dos POST consecutivos a la misma URL deben llegar ambos al servidor', () => {
      // Verifica que los POST nunca se cachean entre sí
      http.post(TEST_URL, {}).subscribe();
      http.post(TEST_URL, {}).subscribe();

      // expect(2) verifica que llegaron EXACTAMENTE 2 peticiones
      const requests = controller.match(TEST_URL);
      expect(requests).toHaveLength(2);
      requests.forEach(r => r.flush({}));
    });

  });

  // -------------------------------------------------------------------------
  // Grupo 3: URLs distintas tienen entradas independientes en el mapa
  // -------------------------------------------------------------------------
  describe('aislamiento por URL', () => {

    it('debe cachear cada URL de forma independiente', () => {
      // Llenamos el caché para dos URLs distintas
      doGetAndFlush(http, controller, TEST_URL,    MOCK_BODY);
      doGetAndFlush(http, controller, TEST_URL_P2, MOCK_BODY_P2);

      // La segunda visita a cada una debe venir del caché
      let r1: unknown, r2: unknown;
      http.get(TEST_URL).subscribe(r => (r1 = r));
      http.get(TEST_URL_P2).subscribe(r => (r2 = r));

      controller.expectNone(TEST_URL);
      controller.expectNone(TEST_URL_P2);

      expect(r1).toEqual(MOCK_BODY);
      expect(r2).toEqual(MOCK_BODY_P2);
    });

    it('cachear /products no debe afectar /api/users', () => {
      doGetAndFlush(http, controller, TEST_URL, MOCK_BODY);

      // /api/users es una URL diferente — debe ir al servidor
      let result: unknown;
      http.get('/api/users').subscribe(r => (result = r));
      controller.expectOne('/api/users').flush([{ id: 1 }]);

      expect(result).toEqual([{ id: 1 }]);
    });

  });

});
