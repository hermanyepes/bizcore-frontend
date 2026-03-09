import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router }     from '@angular/router';
import { of, throwError }            from 'rxjs';

import { InventoryListComponent }                        from './inventory-list.component';
import { InventoryService }                              from '../inventory.service';
import { InventoryMovement, InventoryMovementPaginated } from '../../../core/models/inventory.model';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────
// Fábricas que crean objetos con valores por defecto.
// Cada prueba puede sobreescribir solo los campos que le importan.

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

function makePaginated(overrides: Partial<InventoryMovementPaginated> = {}): InventoryMovementPaginated {
  return {
    items:     [makeMovement()],
    total:     1,
    page:      1,
    page_size: 10,
    pages:     1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryListComponent', () => {
  let fixture:   ComponentFixture<InventoryListComponent>;
  let component: InventoryListComponent;

  // Doble del servicio — reemplaza al real en todas las pruebas.
  // mockReturnValue(of(...)) simula una respuesta exitosa del backend.
  const inventoryServiceSpy = {
    getMovements: vi.fn().mockReturnValue(of(makePaginated())),
  };

  beforeEach(async () => {
    // Reiniciamos el mock antes de cada prueba para que no haya contaminación
    inventoryServiceSpy.getMovements.mockReturnValue(of(makePaginated()));

    await TestBed.configureTestingModule({
      imports:   [InventoryListComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(InventoryListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();      // dispara ngOnInit → llama getMovements
    TestBed.flushEffects();       // procesa efectos reactivos pendientes
    fixture.detectChanges();      // actualiza el DOM con los datos recibidos
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación ─────────────────────────────────────────────────────────────
  // Prueba mínima: verifica que el componente se monta sin errores.

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  // ─── Llamada inicial al servicio ──────────────────────────────────────────
  // Al montar, el componente debe pedir la página 1 con page_size 10.
  // Verifica que el parámetro llega exactamente como el backend espera.

  it('debería llamar getMovements en ngOnInit con página 1', () => {
    expect(inventoryServiceSpy.getMovements).toHaveBeenCalledWith({
      page:      1,
      page_size: 10,
    });
  });

  // ─── Estado después de recibir datos ──────────────────────────────────────

  it('debería pasar a estado "loaded" al recibir datos', () => {
    expect(component.loadState()).toBe('loaded');
  });

  it('debería exponer los movimientos de la respuesta', () => {
    expect(component.movements().length).toBe(1);
    expect(component.movements()[0].movement_type).toBe('ENTRADA');
  });

  it('debería exponer el total de items', () => {
    expect(component.totalItems()).toBe(1);
  });

  it('debería exponer el total de páginas', () => {
    expect(component.totalPages()).toBe(1);
  });

  it('debería estar en la página 1 al iniciar', () => {
    expect(component.currentPage()).toBe(1);
  });

  // ─── Renderizado de la tabla ──────────────────────────────────────────────
  // Verifica que el HTML refleja los datos correctamente.

  it('debería renderizar una fila por cada movimiento', () => {
    const rows = fixture.nativeElement.querySelectorAll('.animate-stagger');
    expect(rows.length).toBe(1);
  });

  it('debería mostrar el id del movimiento en la primera celda', () => {
    const firstCell = fixture.nativeElement.querySelector('.table__cell--mono') as HTMLElement;
    expect(firstCell.textContent?.trim()).toBe('1');
  });

  // ─── Badges de tipo ───────────────────────────────────────────────────────
  // Verifica que cada tipo recibe la clase CSS correcta para su color.

  it('debería aplicar badge--entrada para movimientos de tipo ENTRADA', () => {
    expect(component.badgeClass('ENTRADA')).toBe('badge--entrada');
  });

  it('debería aplicar badge--salida para movimientos de tipo SALIDA', () => {
    expect(component.badgeClass('SALIDA')).toBe('badge--salida');
  });

  it('debería aplicar badge--ajuste para movimientos de tipo AJUSTE', () => {
    expect(component.badgeClass('AJUSTE')).toBe('badge--ajuste');
  });

  // ─── formatDate ───────────────────────────────────────────────────────────
  // Verifica que la fecha ISO se convierte a un formato legible.

  it('debería formatear la fecha ISO a formato legible', () => {
    const result = component.formatDate('2025-03-09T14:30:00Z');
    // No verificamos el string exacto porque depende del locale del SO,
    // pero sí que contiene el año y el mes
    expect(result).toContain('2025');
    expect(result).toContain('mar');
  });

  // ─── Estado vacío ─────────────────────────────────────────────────────────
  // Cuando el backend devuelve items:[], el componente debe mostrar el mensaje vacío.

  it('debería mostrar mensaje vacío cuando no hay movimientos', () => {
    inventoryServiceSpy.getMovements.mockReturnValue(
      of(makePaginated({ items: [], total: 0, pages: 0 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('.inventory-list__empty') as HTMLElement;
    expect(emptyEl).toBeTruthy();
  });

  // ─── Estado error ─────────────────────────────────────────────────────────
  // Cuando el backend falla, el loadState debe pasar a 'error'.

  it('debería pasar a estado "error" si el servicio falla', () => {
    inventoryServiceSpy.getMovements.mockReturnValue(
      throwError(() => new Error('Error de red'))
    );
    component.loadPage(1);
    fixture.detectChanges();

    expect(component.loadState()).toBe('error');
  });

  it('debería mostrar el mensaje de error en el DOM', () => {
    inventoryServiceSpy.getMovements.mockReturnValue(
      throwError(() => new Error('Error de red'))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.inventory-list__feedback--error') as HTMLElement;
    expect(errorEl).toBeTruthy();
  });

  // ─── Filtro por tipo ──────────────────────────────────────────────────────
  // Al cambiar el filtro, debe llamar al servicio con movement_type en los params.

  it('debería incluir movement_type en los params al filtrar por tipo', () => {
    inventoryServiceSpy.getMovements.mockClear();
    inventoryServiceSpy.getMovements.mockReturnValue(of(makePaginated()));

    component.filterType.set('SALIDA');
    component.onFilterChange();
    fixture.detectChanges();

    expect(inventoryServiceSpy.getMovements).toHaveBeenCalledWith(
      expect.objectContaining({ movement_type: 'SALIDA' })
    );
  });

  it('debería volver a página 1 al cambiar el filtro', () => {
    // Simulamos estar en página 2
    component.currentPage.set(2);

    inventoryServiceSpy.getMovements.mockReturnValue(of(makePaginated()));
    component.filterType.set('ENTRADA');
    component.onFilterChange();

    expect(component.currentPage()).toBe(1);
  });

  it('debería omitir movement_type de los params cuando el filtro es vacío', () => {
    inventoryServiceSpy.getMovements.mockClear();
    inventoryServiceSpy.getMovements.mockReturnValue(of(makePaginated()));

    component.filterType.set('');
    component.onFilterChange();

    const callArgs = inventoryServiceSpy.getMovements.mock.calls[0][0];
    expect(callArgs.movement_type).toBeUndefined();
  });

  // ─── Paginación ───────────────────────────────────────────────────────────

  it('debería no ir por debajo de la página 1', () => {
    component.onPageChange(-1);
    expect(component.currentPage()).toBe(1);
  });

  it('debería no ir por encima del total de páginas', () => {
    component.totalPages.set(3);
    component.currentPage.set(3);
    component.onPageChange(1);
    expect(component.currentPage()).toBe(3);
  });

  it('debería avanzar a la siguiente página si existe', () => {
    inventoryServiceSpy.getMovements.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3, page: 2 }))
    );
    component.totalPages.set(3);
    component.onPageChange(1);

    expect(component.currentPage()).toBe(2);
  });

  // ─── Navegación al detalle ────────────────────────────────────────────────
  // onRowClick navega a /inventory/:id. Verificamos que llama al router.

  it('debería navegar al detalle al hacer clic en una fila', () => {
    const router       = TestBed.inject(Router);
    const navigateSpy  = vi.spyOn(router, 'navigate');

    component.onRowClick(42);

    expect(navigateSpy).toHaveBeenCalledWith(['/inventory', 42]);
  });
});
