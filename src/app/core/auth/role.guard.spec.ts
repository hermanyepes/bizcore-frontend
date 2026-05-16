import { TestBed }                   from '@angular/core/testing';
import { provideHttpClient }         from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { roleGuard } from './role.guard';

// ─── Helper: fabrica un token JWT falso con el rol indicado ──────────────────
// Mismo patrón que en auth.service.spec.ts: header y firma son inventados,
// solo el payload (parte del medio) es real y tiene los campos que el código lee.
function makeToken(role: string): string {
  const payload = btoa(JSON.stringify({
    sub: 'user@test.com',
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  return `fakeheader.${payload}.fakesignature`;
}

describe('roleGuard', () => {
  let httpMock: HttpTestingController;

  // Router falso — solo necesitamos registrar qué URL tree se creó
  const routerSpy = {
    navigate:      vi.fn(),
    createUrlTree: vi.fn().mockImplementation((commands: unknown[]) => commands as unknown as UrlTree),
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verificamos que roleGuard no disparó ninguna petición HTTP inesperada
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return true when user role is in allowedRoles', () => {
    localStorage.setItem('bizcore_access', makeToken('Administrador'));

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['Administrador'])(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      )
    );

    expect(result).toBe(true);
  });

  it('should redirect to /dashboard when user role is not in allowedRoles', () => {
    localStorage.setItem('bizcore_access', makeToken('Empleado'));

    TestBed.runInInjectionContext(() =>
      roleGuard(['Administrador'])(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      )
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should redirect to /login when there is no session (currentUser is null)', () => {
    // localStorage vacío → AuthService.currentUser() retorna null
    TestBed.runInInjectionContext(() =>
      roleGuard(['Administrador'])(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      )
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should allow Supervisor when role is in allowedRoles', () => {
    localStorage.setItem('bizcore_access', makeToken('Supervisor'));

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['Superadmin', 'Administrador', 'Supervisor'])(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      )
    );

    expect(result).toBe(true);
  });
});
