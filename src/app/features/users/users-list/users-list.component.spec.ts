import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter }             from '@angular/router';
import { of }                        from 'rxjs';

import { UsersListComponent }    from './users-list.component';
import { UsersService }          from '../users.service';
import { User, UserPaginated }   from '../../../core/models/user.model';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────

// Crea un Usuario completo con valores por defecto.
// `overrides` permite cambiar solo los campos que importan en cada test.
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

// Crea una respuesta paginada con un usuario por defecto.
function makePaginated(overrides: Partial<UserPaginated> = {}): UserPaginated {
  return {
    items:     [makeUser()],
    total:     1,
    page:      1,
    page_size: 10,
    pages:     1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('UsersListComponent', () => {
  let fixture:   ComponentFixture<UsersListComponent>;
  let component: UsersListComponent;

  // Mock del servicio — getUsers devuelve un Observable síncrono con datos de prueba.
  // `of()` es síncrono: el subscribe se ejecuta en el mismo instante, sin red real.
  const usersServiceSpy = {
    getUsers: vi.fn().mockReturnValue(of(makePaginated())),
    getUser:  vi.fn(),
  };

  beforeEach(async () => {
    // Resetea el mock antes de cada test para evitar contaminación entre tests
    usersServiceSpy.getUsers.mockReturnValue(of(makePaginated()));

    await TestBed.configureTestingModule({
      imports:   [UsersListComponent],
      providers: [
        provideRouter([]),  // necesario para [routerLink] en el template
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;

    // Primera pasada: Angular construye el componente y registra los effects
    fixture.detectChanges();
    // flushEffects(): ejecuta los effects pendientes (toObservable usa effect() internamente)
    // Esto hace que la pipeline toObservable→switchMap→toSignal resuelva síncronamente
    TestBed.flushEffects();
    // Segunda pasada: el DOM refleja los datos que llegaron del Observable
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Llamada al servicio ───────────────────────────────────────────────────

  it('should call getUsers on init with page 1 and page_size 10', () => {
    // El servicio se llama una vez al iniciar el componente con los params por defecto
    expect(usersServiceSpy.getUsers).toHaveBeenCalledWith({ page: 1, page_size: 10 });
  });

  // ─── Estado después de recibir datos ──────────────────────────────────────

  it('should not be loading after data arrives', () => {
    // of() es síncrono — después de flushEffects el Observable ya emitió
    expect(component.isLoading()).toBe(false);
  });

  it('should expose the users list from the response', () => {
    expect(component.users().length).toBe(1);
    expect(component.users()[0].full_name).toBe('Juan Pérez');
  });

  it('should expose the correct total items', () => {
    expect(component.totalItems()).toBe(1);
  });

  it('should expose the correct total pages', () => {
    expect(component.totalPages()).toBe(1);
  });

  it('should expose the correct current page', () => {
    expect(component.currentPage()).toBe(1);
  });

  // ─── Renderizado de la tabla ───────────────────────────────────────────────

  it('should render a row for each user', () => {
    const rows = fixture.nativeElement.querySelectorAll('.users-list__row');
    expect(rows.length).toBe(1);
  });

  it('should display the full name in the table', () => {
    const nameEl = fixture.nativeElement.querySelector('.users-list__full-name') as HTMLElement;
    expect(nameEl.textContent?.trim()).toBe('Juan Pérez');
  });

  it('should display the document id in the table', () => {
    const docEl = fixture.nativeElement.querySelector('.users-list__doc-id') as HTMLElement;
    expect(docEl.textContent?.trim()).toBe('1000000001');
  });

  // ─── Badges de rol ────────────────────────────────────────────────────────

  it('should apply badge--admin class for Administrador role', () => {
    const badge = fixture.nativeElement.querySelector('.users-list__badge') as HTMLElement;
    expect(badge.classList.contains('users-list__badge--admin')).toBe(true);
  });

  it('should apply badge--employee class for Empleado role', () => {
    // Configuramos el mock para devolver un usuario con rol Empleado
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ items: [makeUser({ role: 'Empleado' })] }))
    );
    // Cambiamos params para forzar una nueva request con el nuevo mock
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.users-list__badge') as HTMLElement;
    expect(badge.classList.contains('users-list__badge--employee')).toBe(true);
  });

  // ─── Estado activo/inactivo ───────────────────────────────────────────────

  it('should show "Activo" for an active user', () => {
    const statusEl = fixture.nativeElement.querySelector('.users-list__status') as HTMLElement;
    expect(statusEl.textContent?.trim()).toBe('Activo');
    expect(statusEl.classList.contains('users-list__status--active')).toBe(true);
  });

  it('should show "Inactivo" for an inactive user', () => {
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ items: [makeUser({ is_active: false })] }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const statusEl = fixture.nativeElement.querySelector('.users-list__status') as HTMLElement;
    expect(statusEl.textContent?.trim()).toBe('Inactivo');
    expect(statusEl.classList.contains('users-list__status--inactive')).toBe(true);
  });

  // ─── Estado vacío ─────────────────────────────────────────────────────────

  it('should show empty message when there are no users', () => {
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ items: [], total: 0, pages: 0 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('.users-list__empty') as HTMLElement;
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent?.trim()).toContain('No se encontraron usuarios');
  });

  // ─── Paginador ────────────────────────────────────────────────────────────

  it('should NOT render the paginator when there is only one page', () => {
    // La respuesta por defecto tiene pages: 1 — el paginador no debe aparecer
    const paginator = fixture.nativeElement.querySelector('.users-list__pagination');
    expect(paginator).toBeNull();
  });

  it('should render the paginator when there are multiple pages', () => {
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const paginator = fixture.nativeElement.querySelector('.users-list__pagination');
    expect(paginator).toBeTruthy();
  });

  // ─── goToPage ─────────────────────────────────────────────────────────────

  it('should NOT go below page 1', () => {
    component.goToPage(0);
    expect(component.params().page).toBe(1); // sigue en página 1
  });

  it('should NOT go above total pages', () => {
    // Con pages: 1, intentar ir a página 2 no debe cambiar nada
    component.goToPage(2);
    expect(component.params().page).toBe(1);
  });

  it('should update params and call getUsers when changing page', () => {
    // Configuramos 3 páginas para que goToPage(2) sea válido
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    // Limpiamos las llamadas anteriores para contar solo la nueva
    usersServiceSpy.getUsers.mockClear();
    usersServiceSpy.getUsers.mockReturnValue(
      of(makePaginated({ page: 2, total: 25, pages: 3 }))
    );

    component.goToPage(2);
    TestBed.flushEffects();

    // Verifica que se llamó al servicio con la nueva página
    expect(usersServiceSpy.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });
});
