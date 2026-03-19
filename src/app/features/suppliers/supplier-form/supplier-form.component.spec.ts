import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SupplierFormComponent }      from './supplier-form.component';
import { SuppliersService }           from '../suppliers.service';
import { Supplier }                   from '../../../core/models/supplier.model';

// ─── Helper — dato de prueba ──────────────────────────────────────────────────

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id:            3,
    name:          'Distribuidora Colombia',
    contact_email: 'contacto@distcol.com',
    phone:         '3101234567',
    address:       'Calle 10 # 5-20, Bogotá',
    is_active:     true,
    created_at:    '2026-01-15T10:00:00Z',
    updated_at:    null,
    ...overrides,
  };
}

// ─── Mocks compartidos ────────────────────────────────────────────────────────

const suppliersServiceSpy = {
  getOne:    vi.fn().mockReturnValue(of(makeSupplier())),
  create: vi.fn().mockReturnValue(of(makeSupplier())),
  update: vi.fn().mockReturnValue(of(makeSupplier())),
};

// ─── Modo CREAR — /suppliers/new (paramMap sin 'id') ─────────────────────────

describe('SupplierFormComponent — modo CREAR', () => {

  let fixture:   ComponentFixture<SupplierFormComponent>;
  let component: SupplierFormComponent;
  let router:    Router;

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({}) }, // sin 'id'
  };

  beforeEach(async () => {
    suppliersServiceSpy.create.mockReturnValue(of(makeSupplier()));

    await TestBed.configureTestingModule({
      imports:   [SupplierFormComponent],
      providers: [
        provideRouter([]),
        { provide: SuppliersService, useValue: suppliersServiceSpy },
        { provide: ActivatedRoute,   useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(SupplierFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Detección de modo ─────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect create mode correctly', () => {
    expect(component.isEditMode).toBe(false);
    expect(component.supplierId).toBeNull();
  });

  it('should NOT call getOne on init in create mode', () => {
    expect(suppliersServiceSpy.getOne).not.toHaveBeenCalled();
  });

  // ─── Validación del formulario ─────────────────────────────────────────────

  it('should have the form invalid when empty', () => {
    // name está vacío → requerido → form inválido
    expect(component.form.invalid).toBe(true);
  });

  it('should require name', () => {
    const ctrl = component.form.get('name')!;
    ctrl.setValue('');
    expect(ctrl.invalid).toBe(true);
  });

  it('should have the form valid when only name is filled', () => {
    // contact_email, phone y address son todos opcionales
    component.form.patchValue({ name: 'Distribuidora Colombia' });
    expect(component.form.valid).toBe(true);
  });

  // ─── Validación de contact_email ──────────────────────────────────────────
  // contact_email es opcional: vacío = válido. Con contenido: debe ser email real.

  it('should accept empty contact_email as valid', () => {
    const ctrl = component.form.get('contact_email')!;
    ctrl.setValue(null);
    expect(ctrl.valid).toBe(true);
  });

  it('should reject an invalid email format', () => {
    const ctrl = component.form.get('contact_email')!;
    ctrl.setValue('no-es-un-email');
    expect(ctrl.invalid).toBe(true);
  });

  it('should accept a valid email format', () => {
    const ctrl = component.form.get('contact_email')!;
    ctrl.setValue('ventas@proveedor.com');
    expect(ctrl.valid).toBe(true);
  });

  // ─── save() — guardas ─────────────────────────────────────────────────────

  it('should NOT call create if form is invalid', () => {
    component.save(); // name vacío → inválido
    expect(suppliersServiceSpy.create).not.toHaveBeenCalled();
  });

  it('should NOT call create if isSaving is true', () => {
    component.form.patchValue({ name: 'Distri Colombia' });
    component.isSaving.set(true);
    component.save();
    expect(suppliersServiceSpy.create).not.toHaveBeenCalled();
  });

  // ─── saveCreate — payload correcto ────────────────────────────────────────

  it('should call create with the correct payload', () => {
    component.form.patchValue({
      name:          'Distribuidora Colombia',
      contact_email: 'contacto@distcol.com',
      phone:         '3101234567',
      address:       'Calle 10 # 5-20',
    });
    component.save();

    expect(suppliersServiceSpy.create).toHaveBeenCalledWith({
      name:          'Distribuidora Colombia',
      contact_email: 'contacto@distcol.com',
      phone:         '3101234567',
      address:       'Calle 10 # 5-20',
    });
  });

  it('should send null contact_email when left empty', () => {
    // String vacío → null para no romper la restricción unique del backend
    component.form.patchValue({ name: 'Distri', contact_email: '' });
    component.save();

    expect(suppliersServiceSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ contact_email: null })
    );
  });

  it('should send null phone when left empty', () => {
    component.form.patchValue({ name: 'Distri', phone: '' });
    component.save();

    expect(suppliersServiceSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null })
    );
  });

  it('should send null address when left empty', () => {
    component.form.patchValue({ name: 'Distri', address: '' });
    component.save();

    expect(suppliersServiceSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: null })
    );
  });

  // ─── Navegación después de crear ──────────────────────────────────────────

  it('should navigate to /suppliers after successful create', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.form.patchValue({ name: 'Distri Colombia' });
    component.save();

    expect(navigateSpy).toHaveBeenCalledWith(['/suppliers']);
  });

  // ─── Errores del servidor ──────────────────────────────────────────────────

  it('should set serverError when create fails', () => {
    suppliersServiceSpy.create.mockReturnValue(
      throwError(() => ({ error: { detail: 'El nombre ya existe.' } }))
    );
    component.form.patchValue({ name: 'Distri Colombia' });
    component.save();

    expect(component.serverError()).toBe('El nombre ya existe.');
    expect(component.isSaving()).toBe(false);
  });

  it('should show fallback error message when detail is missing', () => {
    suppliersServiceSpy.create.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.form.patchValue({ name: 'Distri Colombia' });
    component.save();

    expect(component.serverError()).toBe('Error al crear el proveedor.');
  });

  // ─── Renderizado ──────────────────────────────────────────────────────────

  it('should show "Nuevo proveedor" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Nuevo proveedor');
  });

  it('should show "Crear proveedor" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Crear proveedor');
  });

  it('should NOT show the is_active field in create mode', () => {
    const select = fixture.nativeElement.querySelector('#is_active');
    expect(select).toBeNull();
  });
});

// ─── Modo EDITAR — /suppliers/3/edit ─────────────────────────────────────────

describe('SupplierFormComponent — modo EDITAR', () => {

  let fixture:   ComponentFixture<SupplierFormComponent>;
  let component: SupplierFormComponent;
  let router:    Router;

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({ id: '3' }) },
  };

  beforeEach(async () => {
    suppliersServiceSpy.getOne.mockReturnValue(of(makeSupplier()));
    suppliersServiceSpy.update.mockReturnValue(of(makeSupplier()));

    await TestBed.configureTestingModule({
      imports:   [SupplierFormComponent],
      providers: [
        provideRouter([]),
        { provide: SuppliersService, useValue: suppliersServiceSpy },
        { provide: ActivatedRoute,   useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(SupplierFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Detección de modo ─────────────────────────────────────────────────────

  it('should create in edit mode', () => {
    expect(component).toBeTruthy();
  });

  it('should detect edit mode correctly', () => {
    expect(component.isEditMode).toBe(true);
    expect(component.supplierId).toBe(3);
  });

  it('should call getOne on init with the correct id', () => {
    expect(suppliersServiceSpy.getOne).toHaveBeenCalledWith(3);
  });

  // ─── Pre-población del formulario ──────────────────────────────────────────

  it('should pre-populate name from the loaded supplier', () => {
    expect(component.form.get('name')!.value).toBe('Distribuidora Colombia');
  });

  it('should pre-populate contact_email from the loaded supplier', () => {
    expect(component.form.get('contact_email')!.value).toBe('contacto@distcol.com');
  });

  it('should pre-populate phone from the loaded supplier', () => {
    expect(component.form.get('phone')!.value).toBe('3101234567');
  });

  it('should pre-populate address from the loaded supplier', () => {
    expect(component.form.get('address')!.value).toBe('Calle 10 # 5-20, Bogotá');
  });

  it('should pre-populate is_active from the loaded supplier', () => {
    expect(component.form.get('is_active')!.value).toBe(true);
  });

  // ─── saveUpdate — payload correcto ────────────────────────────────────────

  it('should call update with the correct id and payload', () => {
    component.form.patchValue({ name: 'Distri Colombia Editada' });
    component.save();

    expect(suppliersServiceSpy.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ name: 'Distri Colombia Editada' })
    );
  });

  // ─── Navegación después de editar ─────────────────────────────────────────

  it('should navigate to /suppliers after successful update', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.save();
    expect(navigateSpy).toHaveBeenCalledWith(['/suppliers']);
  });

  // ─── Error del servidor al actualizar ─────────────────────────────────────

  it('should set serverError when update fails', () => {
    suppliersServiceSpy.update.mockReturnValue(
      throwError(() => ({ error: { detail: 'Email ya en uso.' } }))
    );
    component.save();

    expect(component.serverError()).toBe('Email ya en uso.');
    expect(component.isSaving()).toBe(false);
  });

  // ─── Renderizado en modo editar ───────────────────────────────────────────

  it('should show "Editar proveedor" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Editar proveedor');
  });

  it('should show "Guardar cambios" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Guardar cambios');
  });

  it('should show the is_active select in edit mode', () => {
    const select = fixture.nativeElement.querySelector('#is_active');
    expect(select).toBeTruthy();
  });

  // ─── Error al cargar el proveedor ─────────────────────────────────────────

  it('should set serverError when getOne fails on load', () => {
    suppliersServiceSpy.getOne.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    fixture   = TestBed.createComponent(SupplierFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.serverError()).toBe('No se pudo cargar el proveedor. Verifica la conexión.');
    expect(component.isLoading()).toBe(false);
  });
});
