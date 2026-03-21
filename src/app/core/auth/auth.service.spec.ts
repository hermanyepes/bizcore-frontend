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

  // ─── refreshAccessToken ───────────────────────────────────────────────────

  it('should return null when there is no refresh token', () => {
    // localStorage vacío — no hay refresh_token que enviar
    service = TestBed.inject(AuthService);

    const result = service.refreshAccessToken();

    expect(result).toBeNull();
  });

  it('should POST to /auth/refresh and save new tokens', () => {
    // Sesión con refresh_token guardado
    localStorage.setItem('bizcore_access',  validToken());
    localStorage.setItem('bizcore_refresh', 'old-refresh-token');
    service = TestBed.inject(AuthService);

    const newAccess  = validToken();
    const newRefresh = 'new-refresh-token';

    // Suscribimos para activar el Observable
    service.refreshAccessToken()!.subscribe();

    // Verificamos que se hizo exactamente UN POST con el refresh_token correcto
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.body).toEqual({ refresh_token: 'old-refresh-token' });

    // Respondemos con tokens nuevos
    req.flush({ access_token: newAccess, refresh_token: newRefresh });

    // Los tokens nuevos deben haber sido guardados
    expect(localStorage.getItem('bizcore_access')).toBe(newAccess);
    expect(localStorage.getItem('bizcore_refresh')).toBe(newRefresh);
    expect(service.accessToken()).toBe(newAccess);
  });

  it('should share a single in-flight request when called twice simultaneously', () => {
    // Este test prueba el fix del race condition:
    // dos llamadas simultáneas a refreshAccessToken() deben producir un solo POST.
    localStorage.setItem('bizcore_refresh', 'old-refresh-token');
    service = TestBed.inject(AuthService);

    const obs1 = service.refreshAccessToken();
    const obs2 = service.refreshAccessToken(); // segunda llamada antes de que resuelva la primera

    // Ambos deben ser el mismo Observable (misma referencia)
    expect(obs1).toBe(obs2);

    obs1!.subscribe();
    obs2!.subscribe();

    // expectOne falla si hay más de un request — verifica que solo se hizo UNO
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush({ access_token: validToken(), refresh_token: 'new-refresh-token' });
  });

  it('should reset refresh flags after a failed refresh so future calls can retry', () => {
    // Si el refresh falla, _isRefreshing debe volver a false
    // para que el próximo 401 pueda intentar un refresh nuevo.
    localStorage.setItem('bizcore_refresh', 'expired-refresh-token');
    service = TestBed.inject(AuthService);

    service.refreshAccessToken()!.subscribe({ error: () => {} });

    // Simulamos error del backend (refresh_token revocado)
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush({ detail: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    // Después del fallo, una segunda llamada debe crear un Observable nuevo (no el mismo)
    // Si los flags no se limpiaron, devolvería el Observable muerto anterior
    localStorage.setItem('bizcore_refresh', 'new-refresh-token');
    const retryObs = service.refreshAccessToken();

    expect(retryObs).not.toBeNull();

    // Consumimos el request del reintento para que httpMock.verify() no se queje
    retryObs!.subscribe({ error: () => {} });
    const retryReq = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    retryReq.flush({ access_token: validToken(), refresh_token: 'newest-token' });
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
