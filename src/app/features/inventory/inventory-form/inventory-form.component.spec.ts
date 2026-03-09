import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router }     from '@angular/router';
import { of, throwError }            from 'rxjs';

import { InventoryFormComponent, MOVEMENT_TYPE_OPTIONS } from './inventory-form.component';
import { InventoryService }                              from '../inventory.service';
import { InventoryMovement }                             from '../../../core/models/inventory.model';

// ─── Helper — movimiento creado por el backend ────────────────────────────────

function makeCreatedMovement(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id:            99,
    product_id:    5,
    movement_type: 'ENTRADA',
    quantity:      50,
    notes:         null,
    created_by_id: '1234567890',
    created_at:    '2025-03-09T14:30:00Z',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryFormComponent', () => {
  let fixture:   ComponentFixture<InventoryFormComponent>;
  let component: InventoryFormComponent;

  const inventoryServiceSpy = {
    createMovement: vi.fn().mockReturnValue(of(makeCreatedMovement())),
  };

  beforeEach(async () => {
    inventoryServiceSpy.createMovement.mockReturnValue(of(makeCreatedMovement()));

    await TestBed.configureTestingModule({
      imports:   [InventoryFormComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(InventoryFormComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación ─────────────────────────────────────────────────────────────

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  // ─── Estado inicial del formulario ────────────────────────────────────────
  // Al montar, todos los campos deben estar vacíos y el form inválido.

  it('debería iniciar con el formulario inválido', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('debería iniciar con product_id vacío', () => {
    expect(component.form.get('product_id')?.value).toBeNull();
  });

  it('debería iniciar con movement_type vacío', () => {
    expect(component.form.get('movement_type')?.value).toBe('');
  });

  it('debería iniciar con quantity vacío', () => {
    expect(component.form.get('quantity')?.value).toBeNull();
  });

  it('debería iniciar sin estar guardando', () => {
    expect(component.isSaving()).toBe(false);
  });

  it('debería iniciar sin error de servidor', () => {
    expect(component.serverError()).toBeNull();
  });

  // ─── Opciones del select ──────────────────────────────────────────────────
  // Verifica que las 3 opciones existen con sus valores correctos.

  it('debería exponer las 3 opciones de tipo de movimiento', () => {
    expect(MOVEMENT_TYPE_OPTIONS.length).toBe(3);
    const values = MOVEMENT_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('ENTRADA');
    expect(values).toContain('SALIDA');
    expect(values).toContain('AJUSTE');
  });

  // ─── hasError ─────────────────────────────────────────────────────────────
  // hasError solo devuelve true si el campo fue tocado Y tiene ese error.

  it('debería NO mostrar error si el campo no fue tocado', () => {
    expect(component.hasError('product_id', 'required')).toBe(false);
  });

  it('debería mostrar error required si el campo fue tocado y está vacío', () => {
    component.form.get('product_id')?.markAsTouched();
    expect(component.hasError('product_id', 'required')).toBe(true);
  });

  it('debería mostrar error min si product_id es 0', () => {
    component.form.get('product_id')?.setValue(0);
    component.form.get('product_id')?.markAsTouched();
    expect(component.hasError('product_id', 'min')).toBe(true);
  });

  it('debería mostrar error min si quantity es 0', () => {
    component.form.get('quantity')?.setValue(0);
    component.form.get('quantity')?.markAsTouched();
    expect(component.hasError('quantity', 'min')).toBe(true);
  });

  it('debería mostrar error maxlength si notes supera 300 caracteres', () => {
    component.form.get('notes')?.setValue('x'.repeat(301));
    component.form.get('notes')?.markAsTouched();
    expect(component.hasError('notes', 'maxlength')).toBe(true);
  });

  // ─── currentHint ──────────────────────────────────────────────────────────

  it('debería devolver hint vacío cuando no hay tipo seleccionado', () => {
    expect(component.currentHint).toBe('');
  });

  it('debería devolver el hint de ENTRADA cuando ese tipo está seleccionado', () => {
    component.form.get('movement_type')?.setValue('ENTRADA');
    expect(component.currentHint).toContain('Suma unidades');
  });

  it('debería devolver el hint de SALIDA cuando ese tipo está seleccionado', () => {
    component.form.get('movement_type')?.setValue('SALIDA');
    expect(component.currentHint).toContain('Resta unidades');
  });

  it('debería devolver el hint de AJUSTE cuando ese tipo está seleccionado', () => {
    component.form.get('movement_type')?.setValue('AJUSTE');
    expect(component.currentHint).toContain('Establece el stock');
  });

  // ─── submit — formulario inválido ─────────────────────────────────────────
  // Si el form está incompleto, submit no debe llamar al servicio.

  it('no debería llamar al servicio si el formulario es inválido', () => {
    component.submit();
    expect(inventoryServiceSpy.createMovement).not.toHaveBeenCalled();
  });

  it('debería marcar todos los campos como tocados al intentar enviar inválido', () => {
    component.submit();
    expect(component.form.get('product_id')?.touched).toBe(true);
    expect(component.form.get('movement_type')?.touched).toBe(true);
    expect(component.form.get('quantity')?.touched).toBe(true);
  });

  // ─── submit — formulario válido ───────────────────────────────────────────

  function fillForm() {
    component.form.setValue({
      product_id:    5,
      movement_type: 'ENTRADA',
      quantity:      50,
      notes:         null,
    });
  }

  it('debería llamar createMovement con el payload correcto', () => {
    fillForm();
    component.submit();

    expect(inventoryServiceSpy.createMovement).toHaveBeenCalledWith({
      product_id:    5,
      movement_type: 'ENTRADA',
      quantity:      50,
      notes:         null,
    });
  });

  it('debería navegar al detalle del movimiento tras crear exitosamente', () => {
    const router      = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fillForm();
    component.submit();

    // El movimiento creado tiene id=99 (makeCreatedMovement)
    expect(navigateSpy).toHaveBeenCalledWith(['/inventory', 99]);
  });

  it('debería convertir notes vacío a null en el payload', () => {
    component.form.setValue({
      product_id:    5,
      movement_type: 'SALIDA',
      quantity:      10,
      notes:         '',   // string vacío → debe enviarse como null
    });
    component.submit();

    const payload = inventoryServiceSpy.createMovement.mock.calls[0][0];
    expect(payload.notes).toBeNull();
  });

  // ─── submit — error del servidor ──────────────────────────────────────────

  it('debería mostrar el detail del error si el backend responde con error', () => {
    inventoryServiceSpy.createMovement.mockReturnValue(
      throwError(() => ({ error: { detail: 'Stock insuficiente. Disponible: 5, solicitado: 50' } }))
    );
    fillForm();
    component.submit();

    expect(component.serverError()).toBe('Stock insuficiente. Disponible: 5, solicitado: 50');
  });

  it('debería mostrar mensaje genérico si el error no tiene detail', () => {
    inventoryServiceSpy.createMovement.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    fillForm();
    component.submit();

    expect(component.serverError()).toBe('Error al registrar el movimiento.');
  });

  it('debería volver isSaving a false tras un error', () => {
    inventoryServiceSpy.createMovement.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error' } }))
    );
    fillForm();
    component.submit();

    expect(component.isSaving()).toBe(false);
  });

  // ─── Renderizado ──────────────────────────────────────────────────────────

  it('debería renderizar el título "Nuevo movimiento"', () => {
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent?.trim()).toBe('Nuevo movimiento');
  });

  it('debería renderizar el botón de submit', () => {
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent?.trim()).toBe('Registrar movimiento');
  });

  it('debería mostrar el error del servidor en el DOM', () => {
    inventoryServiceSpy.createMovement.mockReturnValue(
      throwError(() => ({ error: { detail: 'Producto inactivo' } }))
    );
    fillForm();
    component.submit();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.form-server-error') as HTMLElement;
    expect(errorEl?.textContent?.trim()).toBe('Producto inactivo');
  });
});
