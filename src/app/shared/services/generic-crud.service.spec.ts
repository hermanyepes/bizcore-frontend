import { Injectable }                                    from '@angular/core';
import { TestBed }                                       from '@angular/core/testing';
import { provideHttpClient }                             from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { GenericCrudService } from './generic-crud.service';

// -----------------------------------------------------------------------------
// Tipos mínimos para este spec — no tienen que coincidir con ningún modelo real.
// Su único propósito es ocupar los tres "moldes" <T, C, U> de la clase base.
// -----------------------------------------------------------------------------
interface TestEntity { id: number; name: string }
interface TestCreate { name: string }
interface TestUpdate { name?: string }

// -----------------------------------------------------------------------------
// Subclase concreta de prueba.
//
// No podemos instanciar GenericCrudService directamente porque es abstracta.
// Creamos este "apartamento de maqueta" solo para verificar que el plano base
// construye las URLs y los métodos HTTP correctamente.
//
// No se exporta ni se usa fuera de este archivo.
// -----------------------------------------------------------------------------
@Injectable()
class TestCrudService extends GenericCrudService<TestEntity, TestCreate, TestUpdate> {
  // URL fija y predecible para poder afirmar la URL exacta en cada test.
  protected readonly baseUrl = 'http://api.test/items';
}

// -----------------------------------------------------------------------------
// Suite principal
// -----------------------------------------------------------------------------
describe('GenericCrudService', () => {

  let service:     TestCrudService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TestCrudService,
        provideHttpClient(),
        // provideHttpClientTesting reemplaza HttpClient con un interceptor
        // que captura los requests en lugar de enviarlos a la red real.
        provideHttpClientTesting(),
      ],
    });

    service     = TestBed.inject(TestCrudService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // Después de cada test, verify() lanza error si quedó algún request
  // pendiente sin responder — evita que un test "contamine" al siguiente.
  afterEach(() => httpTesting.verify());

  // ---------------------------------------------------------------------------
  // getOne
  // ---------------------------------------------------------------------------
  describe('getOne', () => {

    it('should send GET to /baseUrl/{id} with a numeric id', () => {
      service.getOne(42).subscribe();

      // expectOne intercepta el único request esperado y devuelve el handle.
      // Si no hay ninguno (o hay más de uno), el test falla aquí.
      const req = httpTesting.expectOne('http://api.test/items/42');
      expect(req.request.method).toBe('GET');

      // flush simula la respuesta del servidor — necesario para completar el Observable.
      req.flush({ id: 42, name: 'test' });
    });

    it('should send GET to /baseUrl/{id} with a string id', () => {
      service.getOne('abc-123').subscribe();

      const req = httpTesting.expectOne('http://api.test/items/abc-123');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 1, name: 'test' });
    });

  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {

    it('should send POST to /baseUrl/ with the payload in the body', () => {
      const payload: TestCreate = { name: 'nuevo item' };
      service.create(payload).subscribe();

      const req = httpTesting.expectOne('http://api.test/items/');
      expect(req.request.method).toBe('POST');
      // Verificamos que el cuerpo del request es exactamente el payload.
      // Si create() olvidara pasar el payload, este assert lo detectaría.
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 1, name: 'nuevo item' });
    });

  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {

    it('should send PUT to /baseUrl/{id} with the payload in the body', () => {
      const payload: TestUpdate = { name: 'nombre actualizado' };
      service.update(5, payload).subscribe();

      const req = httpTesting.expectOne('http://api.test/items/5');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 5, name: 'nombre actualizado' });
    });

  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {

    it('should send DELETE to /baseUrl/{id}', () => {
      service.remove(7).subscribe();

      const req = httpTesting.expectOne('http://api.test/items/7');
      expect(req.request.method).toBe('DELETE');
      // DELETE generalmente no tiene body — solo verificamos el método y la URL.
      req.flush({ id: 7, name: 'eliminado' });
    });

    it('should send DELETE to /baseUrl/{id} with a string id', () => {
      service.remove('doc-999').subscribe();

      const req = httpTesting.expectOne('http://api.test/items/doc-999');
      expect(req.request.method).toBe('DELETE');
      req.flush({ id: 1, name: 'eliminado' });
    });

  });

});
