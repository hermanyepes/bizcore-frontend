import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { UserDetailComponent } from './user-detail.component';
import { UsersService }        from '../users.service';
import { User }                from '../../../core/models/user.model';

// ─── Helper — dato de prueba ──────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    document_id:   '1000000001',
    document_type: 'CC',
    full_name:     'Juan Pérez',
    phone:         '3001234567',
    email:         'juan@test.com',
    city:          'Bogotá',
    role:          'Administrador',
    join_date:     '2024-01-15T00:00:00',
    is_active:     true,
    created_at:    '2024-01-15T10:00:00',
    updated_at:    null,
    ...overrides,
  };
}

// ─── Helpers de setup — evitan repetir el bloque TestBed en cada describe ────

// configureTestingModule se llama una sola vez (en el beforeEach del describe raíz).
// Los describes anidados solo crean un nuevo fixture con el mock ya configurado.

describe('UserDetailComponent', () => {

  let fixture:   ComponentFixture<UserDetailComponent>;
  let component: UserDetailComponent;

  // Mock del servicio — solo getUser nos importa aquí
  const usersServiceSpy = {
    getUser:  vi.fn().mockReturnValue(of(makeUser())),
    getUsers: vi.fn(),
  };

  // Mock de ActivatedRoute — expone paramMap como Observable síncrono.
  // convertToParamMap({ id: '...' }) crea un objeto ParamMap real de Angular,
  // el mismo que devuelve ActivatedRoute en producción.
  // of() lo convierte en Observable que emite una sola vez y completa.
  const activatedRouteMock = {
    paramMap: of(convertToParamMap({ id: '1000000001' })),
  };

  // ── Setup común — configura el módulo una sola vez ────────────────────────

  beforeEach(async () => {
    // Resetea el spy antes de cada test para evitar contaminación
    usersServiceSpy.getUser.mockReturnValue(of(makeUser()));

    await TestBed.configureTestingModule({
      imports:   [UserDetailComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService,   useValue: usersServiceSpy    },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;

    // Mismo patrón de tres pasos que UsersListComponent:
    // 1. detectChanges: Angular construye el componente y registra efectos
    // 2. flushEffects:  ejecuta los efectos (toSignal usa effect() internamente)
    // 3. detectChanges: el DOM refleja los datos que ya llegaron
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación ────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Llamada al servicio ──────────────────────────────────────────────────

  it('should call getUser with the id from the URL', () => {
    // Verifica que el switchMap leyó el id del paramMap y llamó al servicio
    expect(usersServiceSpy.getUser).toHaveBeenCalledWith('1000000001');
  });

  // ─── Estado después de recibir datos ────────────────────────────────────

  it('should not be loading after data arrives', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should not be in not-found state when data arrives', () => {
    expect(component.isNotFound()).toBe(false);
  });

  // ─── Renderizado del perfil ───────────────────────────────────────────────

  it('should display the full name', () => {
    const el = fixture.nativeElement.querySelector('.profile-name') as HTMLElement;
    expect(el.textContent?.trim()).toBe('Juan Pérez');
  });

  it('should display the document id', () => {
    // El document_id está dentro de .profile-docid > .mono
    const el = fixture.nativeElement.querySelector('.profile-docid .mono') as HTMLElement;
    expect(el.textContent?.trim()).toBe('1000000001');
  });

  it('should display the email', () => {
    // Los field-value se renderizan en orden: email, phone, city, join_date, created_at, updated_at
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[0].textContent?.trim()).toBe('juan@test.com');
  });

  it('should display the phone', () => {
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[1].textContent?.trim()).toBe('3001234567');
  });

  // ─── Badges de rol ───────────────────────────────────────────────────────

  it('should apply badge--admin for Administrador role', () => {
    // Primer badge en .profile-badges = badge de rol
    const badge = fixture.nativeElement.querySelector('.profile-badges .badge') as HTMLElement;
    expect(badge.classList.contains('badge--admin')).toBe(true);
  });

  // ─── Badges de estado ────────────────────────────────────────────────────

  it('should apply badge--active and show "Activo" for an active user', () => {
    // Segundo badge en .profile-badges = badge de estado (is_active)
    const badges = fixture.nativeElement.querySelectorAll('.profile-badges .badge') as NodeListOf<HTMLElement>;
    const statusBadge = badges[1];
    expect(statusBadge.textContent?.trim()).toBe('Activo');
    expect(statusBadge.classList.contains('badge--active')).toBe(true);
  });

  // ─── Campos nulos ─────────────────────────────────────────────────────────

  it('should display a dash for null updated_at', () => {
    // makeUser() devuelve updated_at: null — el template debe mostrar "—"
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[5].textContent?.trim()).toBe('—');
  });

  // ─── Usuario con rol Empleado ─────────────────────────────────────────────

  describe('when the user has role Empleado', () => {
    beforeEach(() => {
      // Cambiamos el mock y re-creamos el fixture para que el nuevo mock aplique
      usersServiceSpy.getUser.mockReturnValue(of(makeUser({ role: 'Empleado' })));
      fixture   = TestBed.createComponent(UserDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();
    });

    it('should apply badge--empleado for Empleado role', () => {
      const badge = fixture.nativeElement.querySelector('.profile-badges .badge') as HTMLElement;
      expect(badge.classList.contains('badge--empleado')).toBe(true);
    });
  });

  // ─── Usuario inactivo ────────────────────────────────────────────────────

  describe('when the user is inactive', () => {
    beforeEach(() => {
      usersServiceSpy.getUser.mockReturnValue(of(makeUser({ is_active: false })));
      fixture   = TestBed.createComponent(UserDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();
    });

    it('should apply badge--inactive and show "Inactivo"', () => {
      const badges = fixture.nativeElement.querySelectorAll('.profile-badges .badge') as NodeListOf<HTMLElement>;
      const statusBadge = badges[1];
      expect(statusBadge.textContent?.trim()).toBe('Inactivo');
      expect(statusBadge.classList.contains('badge--inactive')).toBe(true);
    });
  });

  // ─── Estado: no encontrado ────────────────────────────────────────────────

  describe('when getUser returns an error', () => {
    beforeEach(() => {
      // throwError() crea un Observable que falla inmediatamente.
      // El catchError del componente lo convierte en of(null) → isNotFound = true.
      usersServiceSpy.getUser.mockReturnValue(throwError(() => new Error('404 Not Found')));
      fixture   = TestBed.createComponent(UserDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();
    });

    it('should have isNotFound true', () => {
      expect(component.isNotFound()).toBe(true);
    });

    it('should have isLoading false', () => {
      expect(component.isLoading()).toBe(false);
    });

    it('should render the error card in the DOM', () => {
      const errorCard = fixture.nativeElement.querySelector('.state-card--error') as HTMLElement;
      expect(errorCard).toBeTruthy();
    });

    it('should NOT render the profile card in the DOM', () => {
      const profileCard = fixture.nativeElement.querySelector('.profile-card');
      expect(profileCard).toBeNull();
    });
  });

});
