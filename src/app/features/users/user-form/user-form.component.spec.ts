import { TestBed, ComponentFixture }                   from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router,
         convertToParamMap }                           from '@angular/router';
import { of, throwError, Subject }                     from 'rxjs';

import { UserFormComponent }                           from './user-form.component';
import { UsersService }                                from '../users.service';
import { User }                                        from '../../../core/models/user.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Dato de prueba base — los tests sobrescriben solo lo que necesitan
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

// Llena el formulario con valores válidos para modo CREAR.
// Necesario para superar la validación antes de llamar a save().
function fillCreateForm(component: UserFormComponent): void {
  component.form.patchValue({
    document_type: 'CC',
    document_id:   '1000000001',
    email:         'juan@test.com',
    full_name:     'Juan Pérez',
    phone:         '3001234567',
    city:          'Bogotá',
    role:          'Administrador',
    password:      'password123',
  });
}

// =============================================================================
// MODO CREAR — /users/new
// =============================================================================

describe('UserFormComponent — modo CREAR', () => {

  let fixture:   ComponentFixture<UserFormComponent>;
  let component: UserFormComponent;
  let router:    Router;

  // snapshot.paramMap sin 'id' → el componente detecta modo CREAR
  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({}) },
  };

  const usersServiceSpy = {
    getUser:    vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  };

  beforeEach(async () => {
    // Resetea spies antes de cada test para evitar contaminación entre tests
    usersServiceSpy.createUser.mockReturnValue(of(makeUser()));

    await TestBed.configureTestingModule({
      imports:   [UserFormComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService,   useValue: usersServiceSpy    },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges(); // ejecuta ngOnInit → configura validators de modo crear
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación y modo ────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isEditMode false when there is no id in the URL', () => {
    expect(component.isEditMode).toBe(false);
  });

  it('should show "Nuevo usuario" in the page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Nuevo usuario');
  });

  // ─── Renderizado del formulario ─────────────────────────────────────────────

  it('should render the document_id input', () => {
    const el = fixture.nativeElement.querySelector('#document_id');
    expect(el).toBeTruthy();
  });

  it('should render the email input', () => {
    const el = fixture.nativeElement.querySelector('#email');
    expect(el).toBeTruthy();
  });

  it('should NOT render the is_active select (solo modo editar)', () => {
    const el = fixture.nativeElement.querySelector('#is_active');
    expect(el).toBeNull();
  });

  // ─── Validaciones ───────────────────────────────────────────────────────────

  it('password should be required in create mode', () => {
    // ngOnInit agrega Validators.required a password en modo crear
    const ctrl = component.form.get('password')!;
    ctrl.setValue('');
    ctrl.markAsTouched();
    expect(ctrl.hasError('required')).toBe(true);
  });

  it('password should require at least 8 characters in create mode', () => {
    const ctrl = component.form.get('password')!;
    ctrl.setValue('abc');
    expect(ctrl.hasError('minlength')).toBe(true);
  });

  it('email control should be invalid with a malformed address', () => {
    const ctrl = component.form.get('email')!;
    ctrl.setValue('no-es-un-email');
    expect(ctrl.hasError('email')).toBe(true);
  });

  it('submit button should be disabled when the form is invalid', () => {
    // El formulario inicia inválido — campos obligatorios vacíos
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit button should be enabled when the form is valid', () => {
    fillCreateForm(component);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  // ─── Llamada al servicio ────────────────────────────────────────────────────

  it('should NOT call createUser if the form is invalid', () => {
    // El formulario vacío es inválido — save() debe hacer guardia y salir
    component.save();
    expect(usersServiceSpy.createUser).not.toHaveBeenCalled();
  });

  it('should call createUser with the correct payload on submit', () => {
    fillCreateForm(component);
    component.save();

    expect(usersServiceSpy.createUser).toHaveBeenCalledWith({
      document_id:   '1000000001',
      document_type: 'CC',
      email:         'juan@test.com',
      full_name:     'Juan Pérez',
      phone:         '3001234567',
      city:          'Bogotá',
      role:          'Administrador',
      password:      'password123',
    });
  });

  it('should NOT call createUser a second time if isSaving is already true', () => {
    // Simula que el primer envío ya está en curso
    component['isSaving'].set(true);
    fillCreateForm(component);
    component.save();
    expect(usersServiceSpy.createUser).not.toHaveBeenCalled();
  });

  // ─── Navegación ─────────────────────────────────────────────────────────────

  it('should navigate to the user detail page on successful create', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    fillCreateForm(component);
    component.save();
    // El backend devuelve makeUser() con document_id = '1000000001'
    expect(navigateSpy).toHaveBeenCalledWith(['/users', '1000000001']);
  });

  // ─── Manejo de errores ──────────────────────────────────────────────────────

  it('should display the server error message on API error', () => {
    usersServiceSpy.createUser.mockReturnValue(
      throwError(() => ({ error: { detail: 'El documento ya existe.' } }))
    );

    fillCreateForm(component);
    component.save();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.server-error') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('El documento ya existe.');
  });

  it('should set isSaving back to false after a create API error', () => {
    usersServiceSpy.createUser.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error' } }))
    );

    fillCreateForm(component);
    component.save();

    expect(component.isSaving()).toBe(false);
  });

});

// =============================================================================
// MODO EDITAR — /users/:id/edit
// =============================================================================

describe('UserFormComponent — modo EDITAR', () => {

  let fixture:   ComponentFixture<UserFormComponent>;
  let component: UserFormComponent;
  let router:    Router;

  // snapshot.paramMap con 'id' → el componente detecta modo EDITAR
  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({ id: '1000000001' }) },
  };

  const usersServiceSpy = {
    getUser:    vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  };

  beforeEach(async () => {
    usersServiceSpy.getUser.mockReturnValue(of(makeUser()));
    usersServiceSpy.updateUser.mockReturnValue(of(makeUser()));

    await TestBed.configureTestingModule({
      imports:   [UserFormComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService,   useValue: usersServiceSpy    },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    // detectChanges ejecuta ngOnInit → disable() + loadUser() → patchValue()
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación y modo ────────────────────────────────────────────────────────

  it('should create in edit mode', () => {
    expect(component).toBeTruthy();
  });

  it('should have isEditMode true when id is present in the URL', () => {
    expect(component.isEditMode).toBe(true);
  });

  it('should show "Editar usuario" in the page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Editar usuario');
  });

  // ─── Carga de datos ─────────────────────────────────────────────────────────

  it('should call getUser with the id from the URL', () => {
    expect(usersServiceSpy.getUser).toHaveBeenCalledWith('1000000001');
  });

  it('should patch full_name with the loaded user data', () => {
    expect(component.form.get('full_name')!.value).toBe('Juan Pérez');
  });

  it('should patch role with the loaded user data', () => {
    expect(component.form.get('role')!.value).toBe('Administrador');
  });

  it('should patch is_active with the loaded user data', () => {
    expect(component.form.get('is_active')!.value).toBe(true);
  });

  // ─── Campos deshabilitados ──────────────────────────────────────────────────

  it('document_id control should be disabled in edit mode', () => {
    expect(component.form.get('document_id')!.disabled).toBe(true);
  });

  it('document_type control should be disabled in edit mode', () => {
    expect(component.form.get('document_type')!.disabled).toBe(true);
  });

  it('email control should be disabled in edit mode', () => {
    expect(component.form.get('email')!.disabled).toBe(true);
  });

  // ─── Renderizado del formulario ─────────────────────────────────────────────

  it('should NOT render the identification section in edit mode', () => {
    // El @if (!isEditMode) oculta todo el fieldset de identificación
    const el = fixture.nativeElement.querySelector('#document_id');
    expect(el).toBeNull();
  });

  it('should render the is_active select in edit mode', () => {
    const el = fixture.nativeElement.querySelector('#is_active');
    expect(el).toBeTruthy();
  });

  // ─── Validaciones ───────────────────────────────────────────────────────────

  it('password should NOT be required in edit mode', () => {
    // En modo editar la contraseña es opcional — dejarlo vacío está bien
    const ctrl = component.form.get('password')!;
    ctrl.setValue('');
    ctrl.markAsTouched();
    expect(ctrl.hasError('required')).toBe(false);
  });

  // ─── Llamada al servicio ────────────────────────────────────────────────────

  it('should call updateUser with the correct document_id and payload', () => {
    // El form ya viene pre-poblado por patchValue en loadUser()
    component.save();

    expect(usersServiceSpy.updateUser).toHaveBeenCalledWith(
      '1000000001',
      expect.objectContaining({ full_name: 'Juan Pérez', role: 'Administrador' })
    );
  });

  it('should NOT call updateUser if isSaving is already true', () => {
    component['isSaving'].set(true);
    component.save();
    expect(usersServiceSpy.updateUser).not.toHaveBeenCalled();
  });

  // ─── Navegación ─────────────────────────────────────────────────────────────

  it('should navigate to the user detail page on successful update', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.save();
    expect(navigateSpy).toHaveBeenCalledWith(['/users', '1000000001']);
  });

  // ─── Manejo de errores ──────────────────────────────────────────────────────

  it('should display the server error message on update API error', () => {
    usersServiceSpy.updateUser.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error de servidor.' } }))
    );

    component.save();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.server-error') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Error de servidor.');
  });

  it('should set isSaving back to false after an update API error', () => {
    usersServiceSpy.updateUser.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error' } }))
    );

    component.save();
    expect(component.isSaving()).toBe(false);
  });

  // ─── Estado de carga ────────────────────────────────────────────────────────

  it('should show a spinner while loading user data', () => {
    // Subject que nunca emite simula latencia de red infinita → isLoading = true
    usersServiceSpy.getUser.mockReturnValue(new Subject<User>());

    // Recreamos el fixture para que ngOnInit llame al nuevo mock
    const newFixture = TestBed.createComponent(UserFormComponent);
    newFixture.detectChanges();

    const spinner = newFixture.nativeElement.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });

  it('should show a server error if getUser fails on load', () => {
    usersServiceSpy.getUser.mockReturnValue(
      throwError(() => new Error('500 Internal Server Error'))
    );

    const newFixture = TestBed.createComponent(UserFormComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.serverError()).toContain('No se pudo cargar');
  });

});
