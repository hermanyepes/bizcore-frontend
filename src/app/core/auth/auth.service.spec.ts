import { TestBed }                                         from '@angular/core/testing';
import { provideHttpClient }                               from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router }                                          from '@angular/router';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

// ─── Helpers para fabricar tokens JWT falsos ────────────────────────────────
// Un JWT real tiene header.payload.signature — aquí fabricamos el payload
// con los campos que nuestro código necesita leer (sub, role, exp).
// "header" y "signature" son texto inventado — no llegan al backend.

function makeToken(exp: number, role = 'Administrador', sub = 'admin@bizcore.com'): string {
  const payload = btoa(JSON.stringify({ sub, role, exp }));
  return `fakeheader.${payload}.fakesignature`;
}

// Token que vence en 1 hora — sesión válida
function validToken(): string {
  return makeToken(Math.floor(Date.now() / 1000) + 3600);
}

// Token que venció hace 1 hora — sesión expirada
function expiredToken(): string {
  return makeToken(Math.floor(Date.now() / 1000) - 3600);
}
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  // Router falso con Vitest — vi.fn() crea una función vacía que registra sus llamadas
  const routerSpy = {
    navigate:      vi.fn(),
    createUrlTree: vi.fn(),
  };

  beforeEach(() => {
    // Limpiamos localStorage antes de cada test para que no haya residuos
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    // NOTA: NO inyectamos el servicio aquí.
    // Cada test configura localStorage primero y luego inyecta el servicio,
    // para que el signal lea el estado correcto al inicializarse.
  });

  afterEach(() => {
    // Verificamos que no quedaron requests HTTP sin responder
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ─── isLoggedIn ────────────────────────────────────────────────────────────

  it('should return false when there is no token', () => {
    // localStorage vacío — sin sesión
    service = TestBed.inject(AuthService);
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should return false when the token is expired', () => {
    // Simulamos una sesión guardada con token vencido
    localStorage.setItem('bizcore_access', expiredToken());
    service = TestBed.inject(AuthService);

    expect(service.isLoggedIn()).toBe(false);
  });

  it('should return true when the token is valid', () => {
    localStorage.setItem('bizcore_access', validToken());
    service = TestBed.inject(AuthService);

    expect(service.isLoggedIn()).toBe(true);
  });

  // ─── currentUser ──────────────────────────────────────────────────────────

  it('should return null when there is no token', () => {
    service = TestBed.inject(AuthService);
    expect(service.currentUser()).toBeNull();
  });

  it('should return the user payload from a valid token', () => {
    localStorage.setItem('bizcore_access', validToken());
    service = TestBed.inject(AuthService);

    const user = service.currentUser();

    // Verificamos que decodificó correctamente los campos del token
    expect(user).not.toBeNull();
    expect(user?.sub).toBe('admin@bizcore.com');
    expect(user?.role).toBe('Administrador');
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  it('should clear tokens and navigate to /login on logout', () => {
    // Establecemos una sesión activa
    localStorage.setItem('bizcore_access',  validToken());
    localStorage.setItem('bizcore_refresh', 'fake-refresh-token');
    service = TestBed.inject(AuthService);

    service.logout();

    // El backend recibe el aviso de logout — respondemos con 200
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    // Los tokens deben haber sido borrados del localStorage
    expect(localStorage.getItem('bizcore_access')).toBeNull();
    expect(localStorage.getItem('bizcore_refresh')).toBeNull();

    // El Signal también debe estar en null
    expect(service.accessToken()).toBeNull();

    // Debe haber redirigido al login
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
