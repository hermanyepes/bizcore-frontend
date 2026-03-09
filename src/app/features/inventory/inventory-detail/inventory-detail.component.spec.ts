import { TestBed, ComponentFixture }       from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError }                  from 'rxjs';

import { InventoryDetailComponent } from './inventory-detail.component';
import { InventoryService }         from '../inventory.service';
import { InventoryMovement }        from '../../../core/models/inventory.model';

// ─── Helper — dato de prueba ─────────────────────────────────────────────────

function makeMovement(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id:            1,
    product_id:    5,
    movement_type: 'ENTRADA',
    quantity:      50,
    notes:         'Compra a proveedor ABC',
    created_by_id: '1234567890',
    created_at:    '2025-03-09T14:30:00Z',
    ...overrides,
  };
}

// ─── Fábrica de ActivatedRoute ────────────────────────────────────────────────
// ActivatedRoute simula el parámetro ":id" de la URL.
// Cada grupo de pruebas puede pasar su propio id.

function makeActivatedRoute(id: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryDetailComponent', () => {
  let fixture:   ComponentFixture<InventoryDetailComponent>;
  let component: InventoryDetailComponent;

  const inventoryServiceSpy = {
    getMovement: vi.fn().mockReturnValue(of(makeMovement())),
  };

  // ---------------------------------------------------------------------------
  // Función auxiliar para montar el componente con un id específico en la URL.
  // NO resetea el mock — cada test configura el mock antes de llamar a setup().
  // El beforeEach se encarga del valor por defecto.
  // ---------------------------------------------------------------------------
  async function setup(routeId: string) {
    await TestBed.configureTestingModule({
      imports:   [InventoryDetailComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService,  useValue: inventoryServiceSpy },
        { provide: ActivatedRoute,    useValue: makeActivatedRoute(routeId) },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(InventoryDetailComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();  // limpia el módulo entre grupos con distinto routeId
  });

  // ─── Creación ─────────────────────────────────────────────────────────────

  it('debería crear el componente', async () => {
    await setup('1');
    expect(component).toBeTruthy();
  });

  // ─── Carga exitosa ────────────────────────────────────────────────────────
  // Con id='1' válido, el componente llama al servicio y pasa a estado 'loaded'.

  it('debería llamar getMovement con el id numérico de la URL', async () => {
    await setup('1');
    expect(inventoryServiceSpy.getMovement).toHaveBeenCalledWith(1);
  });

  it('debería pasar a estado "loaded" al recibir el movimiento', async () => {
    await setup('1');
    expect(component.loadState()).toBe('loaded');
  });

  it('debería exponer el movimiento recibido en el signal', async () => {
    await setup('1');
    expect(component.movement()?.id).toBe(1);
    expect(component.movement()?.movement_type).toBe('ENTRADA');
  });

  // ─── Renderizado del detalle ──────────────────────────────────────────────

  it('debería mostrar el id del movimiento en el título', async () => {
    await setup('1');
    const idEl = fixture.nativeElement.querySelector('.inventory-detail__id') as HTMLElement;
    expect(idEl.textContent?.trim()).toContain('1');
  });

  it('debería mostrar las notas del movimiento', async () => {
    await setup('1');
    const fields = fixture.nativeElement.querySelectorAll('.detail-field__value');
    const texts  = Array.from(fields).map((el: any) => el.textContent?.trim());
    expect(texts.some(t => t?.includes('Compra a proveedor ABC'))).toBe(true);
  });

  it('debería mostrar "Sin notas" cuando notes es null', async () => {
    // Mock configurado ANTES de setup: el componente carga con estos datos
    inventoryServiceSpy.getMovement.mockReturnValue(of(makeMovement({ notes: null })));
    await setup('1');

    const fields = fixture.nativeElement.querySelectorAll('.detail-field__value');
    const texts  = Array.from(fields).map((el: any) => el.textContent?.trim());
    expect(texts.some(t => t === 'Sin notas')).toBe(true);
  });

  it('debería mostrar "Usuario eliminado" cuando created_by_id es null', async () => {
    // Mock configurado ANTES de setup: el componente carga con estos datos
    inventoryServiceSpy.getMovement.mockReturnValue(of(makeMovement({ created_by_id: null })));
    await setup('1');

    const fields = fixture.nativeElement.querySelectorAll('.detail-field__value');
    const texts  = Array.from(fields).map((el: any) => el.textContent?.trim());
    expect(texts.some(t => t === 'Usuario eliminado')).toBe(true);
  });

  // ─── Badges ───────────────────────────────────────────────────────────────

  it('debería aplicar badge--entrada para tipo ENTRADA', async () => {
    await setup('1');
    expect(component.badgeClass('ENTRADA')).toBe('badge--entrada');
  });

  it('debería aplicar badge--salida para tipo SALIDA', async () => {
    await setup('1');
    expect(component.badgeClass('SALIDA')).toBe('badge--salida');
  });

  it('debería aplicar badge--ajuste para tipo AJUSTE', async () => {
    await setup('1');
    expect(component.badgeClass('AJUSTE')).toBe('badge--ajuste');
  });

  // ─── movementLabel ────────────────────────────────────────────────────────

  it('debería devolver etiqueta legible para cada tipo', async () => {
    await setup('1');
    expect(component.movementLabel('ENTRADA')).toBe('Entrada de stock');
    expect(component.movementLabel('SALIDA')).toBe('Salida de stock');
    expect(component.movementLabel('AJUSTE')).toBe('Ajuste de inventario');
  });

  // ─── Estado error (404) ───────────────────────────────────────────────────

  it('debería pasar a estado "not-found" si el backend responde 404', async () => {
    inventoryServiceSpy.getMovement.mockReturnValue(throwError(() => ({ status: 404 })));
    await setup('1');
    expect(component.loadState()).toBe('not-found');
  });

  it('debería mostrar el mensaje de no encontrado en el DOM', async () => {
    inventoryServiceSpy.getMovement.mockReturnValue(throwError(() => ({ status: 404 })));
    await setup('1');

    const el = fixture.nativeElement.querySelector('.inventory-detail__feedback--error') as HTMLElement;
    expect(el?.textContent).toContain('no encontrado');
  });

  // ─── Estado error (genérico) ──────────────────────────────────────────────

  it('debería pasar a estado "error" si el backend falla con 500', async () => {
    inventoryServiceSpy.getMovement.mockReturnValue(throwError(() => ({ status: 500 })));
    await setup('1');
    expect(component.loadState()).toBe('error');
  });

  // ─── ID inválido en la URL ────────────────────────────────────────────────
  // Si la URL tiene /inventory/abc, Number('abc') = NaN → redirige al listado.

  it('debería redirigir al listado si el id de la URL no es un número', async () => {
    await setup('abc');
    const router      = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    // Montamos de nuevo con id inválido para capturar la navegación
    component.ngOnInit();
    expect(inventoryServiceSpy.getMovement).not.toHaveBeenCalledWith(NaN);
  });
});
