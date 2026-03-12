import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter }             from '@angular/router';
import { of, throwError }            from 'rxjs';

import { OrdersListComponent }          from './orders-list.component';
import { OrdersService }                from '../orders.service';
import { SuppliersService }             from '../../suppliers/suppliers.service';
import { Order, OrderItem, OrderPaginated } from '../order.model';
import { Supplier, SupplierPaginated }  from '../../../core/models/supplier.model';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────

function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id:         1,
    order_id:   1,
    product_id: 10,
    quantity:   5,
    unit_price: 12000,
    subtotal:   60000,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id:             1,
    supplier_id:    1,
    created_by_id:  'admin@bizcore.com',
    status:         'PENDIENTE',
    notes:          null,
    created_at:     '2026-03-12T16:00:00Z',
    items:          [makeOrderItem()],
    ...overrides,
  };
}

function makeOrderPaginated(overrides: Partial<OrderPaginated> = {}): OrderPaginated {
  return {
    items:     [makeOrder()],
    total:     1,
    page:      1,
    page_size: 10,
    pages:     1,
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id:            1,
    name:          'Distribuidora Colombia',
    contact_email: 'contacto@distcol.com',
    phone:         '3101234567',
    address:       'Calle 10 # 5-20',
    is_active:     true,
    created_at:    '2026-01-15T10:00:00Z',
    updated_at:    null,
    ...overrides,
  };
}

function makeSupplierPaginated(overrides: Partial<SupplierPaginated> = {}): SupplierPaginated {
  return {
    items:     [makeSupplier()],
    total:     1,
    page:      1,
    page_size: 100,
    pages:     1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('OrdersListComponent', () => {
  let fixture:   ComponentFixture<OrdersListComponent>;
  let component: OrdersListComponent;

  // Spies — reemplazan los servicios reales: ninguna llamada HTTP real ocurre
  const ordersServiceSpy = {
    getOrders:   vi.fn(),
    cancelOrder: vi.fn(),
  };

  const suppliersServiceSpy = {
    getSuppliers: vi.fn(),
  };

  beforeEach(async () => {
    // Cada test parte de un estado limpio y con datos por defecto
    ordersServiceSpy.getOrders.mockReturnValue(of(makeOrderPaginated()));
    ordersServiceSpy.cancelOrder.mockReturnValue(of(makeOrder({ status: 'CANCELADO' })));
    suppliersServiceSpy.getSuppliers.mockReturnValue(of(makeSupplierPaginated()));

    await TestBed.configureTestingModule({
      imports:   [OrdersListComponent],
      providers: [
        provideRouter([]),
        { provide: OrdersService,    useValue: ordersServiceSpy },
        { provide: SuppliersService, useValue: suppliersServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(OrdersListComponent);
    component = fixture.componentInstance;

    // detectChanges dispara ngOnInit → loadSuppliers() + loadPage(1)
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Grupo 1: Creación ────────────────────────────────────────────────────
  // Prueba mínima: el componente existe sin errores de compilación.

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Grupo 2: Inicialización — dos llamadas HTTP en paralelo ──────────────
  // Al arrancar, el componente hace DOS requests: pedidos + proveedores.
  // Verificamos que ambos servicios fueron llamados.

  it('should call getOrders on init with page 1 and no filters', () => {
    expect(ordersServiceSpy.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 10 })
    );
  });

  it('should call getSuppliers on init to populate the filter dropdown', () => {
    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 100, is_active: true })
    );
  });

  it('should NOT send status filter on init (no filter selected)', () => {
    const calledWith = ordersServiceSpy.getOrders.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty('status');
  });

  it('should NOT send supplier_id filter on init (no filter selected)', () => {
    const calledWith = ordersServiceSpy.getOrders.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty('supplier_id');
  });

  // ─── Grupo 3: Estado después de recibir datos ─────────────────────────────
  // Cuando el servicio responde con éxito, las señales deben tener los valores
  // correctos y loadState debe ser 'loaded'.

  it('should set loadState to loaded after orders arrive', () => {
    expect(component.loadState()).toBe('loaded');
  });

  it('should populate orders signal from response', () => {
    expect(component.orders().length).toBe(1);
    expect(component.orders()[0].id).toBe(1);
  });

  it('should populate suppliers signal from response', () => {
    expect(component.suppliers().length).toBe(1);
    expect(component.suppliers()[0].name).toBe('Distribuidora Colombia');
  });

  it('should set correct pagination values', () => {
    expect(component.currentPage()).toBe(1);
    expect(component.totalPages()).toBe(1);
    expect(component.totalItems()).toBe(1);
  });

  // ─── Grupo 4: Estado de error ─────────────────────────────────────────────
  // Si getOrders falla, loadState pasa a 'error'.
  // Si getSuppliers falla, suppliers queda vacío pero la pantalla no se rompe.

  it('should set loadState to error when getOrders fails', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    component.loadPage(1);
    fixture.detectChanges();

    expect(component.loadState()).toBe('error');
  });

  it('should set suppliers to empty array when getSuppliers fails', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    // Forzamos recarga del componente
    component['loadSuppliers']();
    fixture.detectChanges();

    expect(component.suppliers()).toEqual([]);
  });

  // ─── Grupo 5: Renderizado de la tabla ─────────────────────────────────────
  // El HTML debe reflejar correctamente los datos recibidos.

  it('should render one row per order', () => {
    const rows = fixture.nativeElement.querySelectorAll('.animate-stagger');
    expect(rows.length).toBe(1);
  });

  it('should display order id with # prefix', () => {
    const cells = fixture.nativeElement.querySelectorAll('.animate-stagger td');
    expect(cells[0].textContent?.trim()).toBe('#1');
  });

  it('should display supplier name resolved from suppliers list', () => {
    const cells = fixture.nativeElement.querySelectorAll('.animate-stagger td');
    expect(cells[1].textContent?.trim()).toBe('Distribuidora Colombia');
  });

  it('should display fallback supplier name when supplier not found', () => {
    // Pedido con supplier_id=99 que no está en la lista de proveedores
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ supplier_id: 99 })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('.animate-stagger td');
    expect(cells[1].textContent?.trim()).toBe('#99');
  });

  // ─── Grupo 6: Badge de estado ─────────────────────────────────────────────
  // Cada estado debe mostrar el badge con la clase CSS correcta.

  it('should show PENDIENTE badge with warning class', () => {
    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('PENDIENTE');
    expect(badge.classList.contains('status-badge--warning')).toBe(true);
  });

  it('should show COMPLETADO badge with success class', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ status: 'COMPLETADO' })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('COMPLETADO');
    expect(badge.classList.contains('status-badge--success')).toBe(true);
  });

  it('should show CANCELADO badge with danger class', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ status: 'CANCELADO' })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('CANCELADO');
    expect(badge.classList.contains('status-badge--danger')).toBe(true);
  });

  // ─── Grupo 7: Columna Ítems y Total ───────────────────────────────────────
  // items.length es la cantidad de productos distintos en el pedido.
  // El total es la suma de los subtotales de cada ítem.

  it('should display the number of items in the order', () => {
    const cells = fixture.nativeElement.querySelectorAll('.animate-stagger td');
    // columna Ítems (índice 3) — el pedido de prueba tiene 1 ítem
    expect(cells[3].textContent?.trim()).toBe('1');
  });

  it('should display the sum of item subtotals as the order total', () => {
    // makeOrderItem tiene subtotal=60000; formatPrice lo convierte a "$60.000"
    const result = component.getOrderTotal(makeOrder());
    expect(result).toBe(60000);
  });

  it('should sum multiple item subtotals correctly', () => {
    const order = makeOrder({
      items: [
        makeOrderItem({ subtotal: 60000 }),
        makeOrderItem({ id: 2, subtotal: 40000 }),
      ],
    });
    expect(component.getOrderTotal(order)).toBe(100000);
  });

  // ─── Grupo 8: Notas opcionales ────────────────────────────────────────────

  it('should show a dash when notes is null', () => {
    // makeOrder tiene notes: null por defecto
    const mutedCells = fixture.nativeElement.querySelectorAll('.cell--muted');
    const hasDash    = Array.from(mutedCells).some(
      (el: any) => el.textContent?.trim() === '—'
    );
    expect(hasDash).toBe(true);
  });

  it('should show note text when notes is not null', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ notes: 'Pedido urgente' })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const notesCell = fixture.nativeElement.querySelector('.cell--notes') as HTMLElement;
    expect(notesCell.textContent?.trim()).toBe('Pedido urgente');
  });

  // ─── Grupo 9: Botón Cancelar condicional ──────────────────────────────────
  // Solo aparece para pedidos PENDIENTE.
  // Para COMPLETADO y CANCELADO, el botón no existe en el DOM.

  it('should show Cancel button for PENDIENTE orders', () => {
    const btn = fixture.nativeElement.querySelector('.action-link--danger') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent?.trim()).toBe('Cancelar');
  });

  it('should NOT show Cancel button for COMPLETADO orders', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ status: 'COMPLETADO' })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.action-link--danger');
    expect(btn).toBeNull();
  });

  it('should NOT show Cancel button for CANCELADO orders', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [makeOrder({ status: 'CANCELADO' })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.action-link--danger');
    expect(btn).toBeNull();
  });

  // ─── Grupo 10: cancelOrder() ──────────────────────────────────────────────
  // Cuando el usuario confirma, llama a cancelOrder del servicio.
  // Después recarga la página actual.
  // Si cancela el confirm, no se hace ninguna llamada.

  it('should call cancelOrder service when user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.cancelOrder(makeOrder());

    expect(ordersServiceSpy.cancelOrder).toHaveBeenCalledWith(1);
  });

  it('should reload current page after cancellation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    ordersServiceSpy.getOrders.mockClear();

    component.cancelOrder(makeOrder());

    expect(ordersServiceSpy.getOrders).toHaveBeenCalledTimes(1);
  });

  it('should NOT call cancelOrder when user dismisses confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.cancelOrder(makeOrder());

    expect(ordersServiceSpy.cancelOrder).not.toHaveBeenCalled();
  });

  // ─── Grupo 11: Filtro de estado ───────────────────────────────────────────
  // Al cambiar el filtro de estado, se vuelve a página 1 con el nuevo valor.

  it('should send status filter when onStatusChange is called', () => {
    ordersServiceSpy.getOrders.mockClear();
    component.onStatusChange('PENDIENTE');

    expect(ordersServiceSpy.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, status: 'PENDIENTE' })
    );
  });

  it('should NOT send status in params when filter is cleared', () => {
    ordersServiceSpy.getOrders.mockClear();
    component.onStatusChange('');

    const calledWith = ordersServiceSpy.getOrders.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty('status');
  });

  // ─── Grupo 12: Filtro de proveedor ────────────────────────────────────────
  // Al cambiar el filtro de proveedor, se vuelve a página 1 con supplier_id.

  it('should send supplier_id filter when onSupplierChange is called', () => {
    ordersServiceSpy.getOrders.mockClear();
    component.onSupplierChange('3');

    expect(ordersServiceSpy.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, supplier_id: 3 })
    );
  });

  it('should NOT send supplier_id in params when filter is reset to 0', () => {
    ordersServiceSpy.getOrders.mockClear();
    component.onSupplierChange('0');

    const calledWith = ordersServiceSpy.getOrders.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty('supplier_id');
  });

  // ─── Grupo 13: Paginación ─────────────────────────────────────────────────

  it('should NOT render the paginator when there is only one page', () => {
    const paginator = fixture.nativeElement.querySelector('.pagination');
    expect(paginator).toBeNull();
  });

  it('should render the paginator when there are multiple pages', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ total: 25, pages: 3 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const paginator = fixture.nativeElement.querySelector('.pagination');
    expect(paginator).toBeTruthy();
  });

  it('should NOT go below page 1', () => {
    component.onPageChange(-1);
    expect(component.currentPage()).toBe(1);
  });

  it('should NOT go above the last page', () => {
    component.onPageChange(1); // totalPages() es 1 — no puede avanzar
    expect(component.currentPage()).toBe(1);
  });

  it('should advance to the next page when more pages exist', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ total: 25, pages: 3 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    ordersServiceSpy.getOrders.mockClear();
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ page: 2, total: 25, pages: 3 }))
    );

    component.onPageChange(1);
    expect(ordersServiceSpy.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  // ─── Grupo 14: Estado vacío ───────────────────────────────────────────────

  it('should show empty message when there are no orders', () => {
    ordersServiceSpy.getOrders.mockReturnValue(
      of(makeOrderPaginated({ items: [], total: 0, pages: 0 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('.empty-state') as HTMLElement;
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent?.trim()).toContain('No hay pedidos');
  });

  // ─── Grupo 15: Helpers ────────────────────────────────────────────────────

  it('should format a date ISO string to contain the year', () => {
    const result = component.formatDate('2026-03-12T16:00:00Z');
    expect(result).toContain('2026');
  });

  it('should format price as Colombian peso string', () => {
    const result = component.formatPrice(950000);
    expect(result).toContain('950');
    expect(result).toContain('$');
  });
});
