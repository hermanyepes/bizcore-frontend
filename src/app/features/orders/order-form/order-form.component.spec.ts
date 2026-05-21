import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OrderFormComponent }  from './order-form.component';
import { OrdersService }       from '../orders.service';
import { SuppliersService }    from '../../suppliers/suppliers.service';
import { ProductsService }     from '../../products/products.service';
import { Order, OrderItem }    from '../order.model';
import { Supplier, SupplierPaginated } from '../../../core/models/supplier.model';
import { Product, ProductPaginated }   from '../../../core/models/product.model';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id:          10,
    name:        'Café 500g',
    description: null,
    price:       12000,
    stock:       100,
    category:    null,
    is_active:   true,
    created_at:  '2026-01-01T00:00:00Z',
    updated_at:  null,
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id:            1,
    name:          'Distribuidora Colombia',
    contact_email: null,
    phone:         null,
    address:       null,
    nit:           null,
    is_active:     true,
    created_at:    '2026-01-01T00:00:00Z',
    updated_at:    null,
    ...overrides,
  };
}

function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id:         1,
    order_id:   5,
    product_id: 10,
    quantity:   3,
    unit_price: 12000,
    subtotal:   36000,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id:            5,
    supplier_id:   1,
    created_by_id: 'admin@bizcore.com',
    status:        'PENDIENTE',
    notes:         'Pedido mensual',
    created_at:    '2026-03-12T16:00:00Z',
    items:         [makeOrderItem()],
    ...overrides,
  };
}

function makeSupplierPaginated(): SupplierPaginated {
  return { items: [makeSupplier()], total: 1, page: 1, page_size: 100, pages: 1 };
}

function makeProductPaginated(): ProductPaginated {
  return { items: [makeProduct()], total: 1, page: 1, page_size: 200, pages: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO CREAR — /orders/new (paramMap sin 'id')
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderFormComponent — modo CREAR', () => {

  let fixture:   ComponentFixture<OrderFormComponent>;
  let component: OrderFormComponent;
  let router:    Router;

  const ordersServiceSpy = {
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    getOrder:    vi.fn(),
  };

  const suppliersServiceSpy = {
    getSuppliers: vi.fn(),
  };

  const productsServiceSpy = {
    getProducts: vi.fn(),
  };

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({}) }, // sin 'id' → modo crear
  };

  beforeEach(async () => {
    ordersServiceSpy.createOrder.mockReturnValue(of(makeOrder()));
    suppliersServiceSpy.getSuppliers.mockReturnValue(of(makeSupplierPaginated()));
    productsServiceSpy.getProducts.mockReturnValue(of(makeProductPaginated()));

    await TestBed.configureTestingModule({
      imports:   [OrderFormComponent],
      providers: [
        provideRouter([]),
        { provide: OrdersService,    useValue: ordersServiceSpy },
        { provide: SuppliersService, useValue: suppliersServiceSpy },
        { provide: ProductsService,  useValue: productsServiceSpy },
        { provide: ActivatedRoute,   useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Grupo 1: Creación y detección de modo ────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect create mode correctly', () => {
    expect(component.isEditMode).toBe(false);
    expect(component.orderId).toBeNull();
  });

  // ─── Grupo 2: Carga inicial de dropdowns ──────────────────────────────────
  // Al iniciar en modo crear, se cargan proveedores y productos para los selects.
  // getOrder NO debe llamarse — no hay id todavía.

  it('should load suppliers on init for the dropdown', () => {
    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 100, is_active: true })
    );
  });

  it('should load products on init for the item dropdown', () => {
    expect(productsServiceSpy.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 100, is_active: true })
    );
  });

  it('should NOT call getOrder on init in create mode', () => {
    expect(ordersServiceSpy.getOrder).not.toHaveBeenCalled();
  });

  it('should populate suppliers signal from response', () => {
    expect(component.suppliers().length).toBe(1);
    expect(component.suppliers()[0].name).toBe('Distribuidora Colombia');
  });

  it('should populate products signal from response', () => {
    expect(component.products().length).toBe(1);
    expect(component.products()[0].name).toBe('Café 500g');
  });

  // ─── Grupo 3: FormArray — fila inicial ────────────────────────────────────
  // En modo crear, ngOnInit agrega automáticamente una fila vacía
  // para que el usuario no vea la tabla de ítems completamente vacía.

  it('should start with one empty item row', () => {
    expect(component.items.length).toBe(1);
  });

  it('should have the first item row invalid (fields empty)', () => {
    expect(component.items.at(0).invalid).toBe(true);
  });

  // ─── Grupo 4: addItem() y removeItem() ────────────────────────────────────
  // addItem empuja un FormGroup nuevo al FormArray.
  // removeItem elimina la fila en ese índice, excepto si es la última.

  it('should add a new item row when addItem is called', () => {
    component.addItem();
    expect(component.items.length).toBe(2);
  });

  it('should remove an item row when removeItem is called', () => {
    component.addItem(); // ahora hay 2 filas
    component.removeItem(1);
    expect(component.items.length).toBe(1);
  });

  it('should NOT remove the last item row', () => {
    // Solo hay 1 fila — removeItem debe ignorar la solicitud
    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  // ─── Grupo 5: Cálculos en memoria ─────────────────────────────────────────
  // getProductPrice busca en la lista cargada — sin HTTP.
  // getSubtotal multiplica precio × cantidad del form.
  // getFormTotal suma todos los subtotales.

  it('should return null for getProductPrice when no product is selected', () => {
    expect(component.getProductPrice(0)).toBeNull();
  });

  it('should return the product price when a product is selected', () => {
    // Seleccionamos el producto con id=10 (precio=12000)
    component.items.at(0).get('product_id')!.setValue(10);
    expect(component.getProductPrice(0)).toBe(12000);
  });

  it('should return null for getSubtotal when fields are incomplete', () => {
    expect(component.getSubtotal(0)).toBeNull();
  });

  it('should calculate subtotal as price × quantity', () => {
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(5);
    // 12000 × 5 = 60000
    expect(component.getSubtotal(0)).toBe(60000);
  });

  it('should sum all subtotals in getFormTotal', () => {
    // Fila 0: producto 10, cantidad 5 → subtotal 60000
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(5);
    // Agregamos una segunda fila: misma cantidad → otros 60000
    component.addItem();
    component.items.at(1).get('product_id')!.setValue(10);
    component.items.at(1).get('quantity')!.setValue(5);

    expect(component.getFormTotal()).toBe(120000);
  });

  it('should return 0 for getFormTotal when no items are complete', () => {
    expect(component.getFormTotal()).toBe(0);
  });

  // ─── Grupo 6: Validación del formulario ───────────────────────────────────

  it('should have the form invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should require supplier_id', () => {
    const ctrl = component.form.get('supplier_id')!;
    ctrl.setValue(null);
    expect(ctrl.invalid).toBe(true);
  });

  it('should be valid when supplier and one complete item are filled', () => {
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    expect(component.form.valid).toBe(true);
  });

  it('should reject quantity less than 1', () => {
    component.items.at(0).get('quantity')!.setValue(0);
    expect(component.items.at(0).get('quantity')!.invalid).toBe(true);
  });

  // ─── Grupo 7: Guardas de save() ───────────────────────────────────────────

  it('should NOT call createOrder if form is invalid', () => {
    component.save();
    expect(ordersServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('should NOT call createOrder if isSaving is true', () => {
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    component.isSaving.set(true);
    component.save();
    expect(ordersServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  // ─── Grupo 8: saveCreate — payload correcto ───────────────────────────────
  // El payload debe tener supplier_id, notes y el array de ítems
  // con product_id y quantity. El backend calcula el resto.

  it('should call createOrder with the correct payload', () => {
    component.form.get('supplier_id')!.setValue(1);
    component.form.get('notes')!.setValue('Pedido urgente');
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);

    component.save();

    expect(ordersServiceSpy.createOrder).toHaveBeenCalledWith({
      supplier_id: 1,
      notes:       'Pedido urgente',
      items:       [{ product_id: 10, quantity: 3 }],
    });
  });

  it('should send null notes when left empty', () => {
    component.form.get('supplier_id')!.setValue(1);
    component.form.get('notes')!.setValue('');
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);

    component.save();

    expect(ordersServiceSpy.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null })
    );
  });

  it('should include multiple items in the payload', () => {
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    component.addItem();
    component.items.at(1).get('product_id')!.setValue(10);
    component.items.at(1).get('quantity')!.setValue(2);

    component.save();

    const called = ordersServiceSpy.createOrder.mock.calls[0][0];
    expect(called.items.length).toBe(2);
    expect(called.items[1].quantity).toBe(2);
  });

  // ─── Grupo 9: Navegación y errores ────────────────────────────────────────

  it('should navigate to /orders after successful create', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    component.save();

    expect(navigateSpy).toHaveBeenCalledWith(['/orders']);
  });

  it('should set serverError and reset isSaving when createOrder fails', () => {
    ordersServiceSpy.createOrder.mockReturnValue(
      throwError(() => ({ error: { detail: 'Proveedor no encontrado.' } }))
    );
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    component.save();

    expect(component.serverError()).toBe('Proveedor no encontrado.');
    expect(component.isSaving()).toBe(false);
  });

  it('should use fallback error message when detail is missing', () => {
    ordersServiceSpy.createOrder.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.form.get('supplier_id')!.setValue(1);
    component.items.at(0).get('product_id')!.setValue(10);
    component.items.at(0).get('quantity')!.setValue(3);
    component.save();

    expect(component.serverError()).toBe('Error al crear el pedido.');
  });

  // ─── Grupo 10: Renderizado en modo crear ──────────────────────────────────

  it('should show "Nuevo pedido" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Nuevo pedido');
  });

  it('should show "Crear pedido" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Crear pedido');
  });

  it('should render the items table with one row', () => {
    const rows = fixture.nativeElement.querySelectorAll('.items-table__row');
    expect(rows.length).toBe(1);
  });

  it('should NOT show the status select in create mode', () => {
    const select = fixture.nativeElement.querySelector('#status');
    expect(select).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MODO EDITAR — /orders/5/edit
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderFormComponent — modo EDITAR', () => {

  let fixture:   ComponentFixture<OrderFormComponent>;
  let component: OrderFormComponent;
  let router:    Router;

  const ordersServiceSpy = {
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    getOrder:    vi.fn(),
  };

  const suppliersServiceSpy = {
    getSuppliers: vi.fn(),
  };

  const productsServiceSpy = {
    getProducts: vi.fn(),
  };

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({ id: '5' }) }, // id presente → modo editar
  };

  const ordersServiceEditSpy = {
    createOrder:  vi.fn(),
    updateOrder:  vi.fn(),
    updateStatus: vi.fn(),
    getOrder:     vi.fn(),
  };

  beforeEach(async () => {
    ordersServiceEditSpy.getOrder.mockReturnValue(of(makeOrder()));
    ordersServiceEditSpy.updateOrder.mockReturnValue(of(makeOrder()));
    ordersServiceEditSpy.updateStatus.mockReturnValue(of(makeOrder({ status: 'ENTREGADA' })));
    suppliersServiceSpy.getSuppliers.mockReturnValue(of(makeSupplierPaginated()));
    productsServiceSpy.getProducts.mockReturnValue(of(makeProductPaginated()));

    await TestBed.configureTestingModule({
      imports:   [OrderFormComponent],
      providers: [
        provideRouter([]),
        { provide: OrdersService,    useValue: ordersServiceEditSpy },
        { provide: SuppliersService, useValue: suppliersServiceSpy },
        { provide: ProductsService,  useValue: productsServiceSpy },
        { provide: ActivatedRoute,   useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Grupo 11: Detección de modo ──────────────────────────────────────────

  it('should create in edit mode', () => {
    expect(component).toBeTruthy();
  });

  it('should detect edit mode correctly', () => {
    expect(component.isEditMode).toBe(true);
    expect(component.orderId).toBe(5);
  });

  it('should call getOrder on init with the correct id', () => {
    expect(ordersServiceEditSpy.getOrder).toHaveBeenCalledWith(5);
  });

  // ─── Grupo 12: Pre-población del formulario ───────────────────────────────
  // En modo editar solo se pre-poblan notes y status.
  // El FormArray de ítems permanece vacío — los ítems se muestran como texto.

  it('should pre-populate notes from the loaded order', () => {
    expect(component.form.get('notes')!.value).toBe('Pedido mensual');
  });

  it('should store the current status in loadedOrder (not in the form control)', () => {
    // El control 'status' representa el NUEVO estado a aplicar (empieza en null).
    // El estado actual del pedido vive en loadedOrder().status.
    expect(component.form.get('status')!.value).toBeNull();
    expect(component.loadedOrder()?.status).toBe('PENDIENTE');
  });

  it('should store the loaded order in the loadedOrder signal', () => {
    expect(component.loadedOrder()).not.toBeNull();
    expect(component.loadedOrder()!.id).toBe(5);
  });

  it('should have zero rows in the FormArray in edit mode', () => {
    // Los ítems se muestran en modo lectura, no en el FormArray
    expect(component.items.length).toBe(0);
  });

  // ─── Grupo 13: Campos deshabilitados en modo editar ───────────────────────
  // supplier_id se deshabilita porque el proveedor del pedido es inmutable.

  it('should have supplier_id disabled in edit mode', () => {
    expect(component.form.get('supplier_id')!.disabled).toBe(true);
  });

  // ─── Grupo 14: getLoadedOrderTotal ────────────────────────────────────────
  // Suma los subtotales de los ítems históricos del pedido cargado.

  it('should calculate the total of the loaded order correctly', () => {
    // makeOrderItem tiene subtotal=36000, hay 1 ítem
    expect(component.getLoadedOrderTotal()).toBe(36000);
  });

  it('should return 0 when loadedOrder is null', () => {
    component.loadedOrder.set(null);
    expect(component.getLoadedOrderTotal()).toBe(0);
  });

  // ─── Grupo 15: saveUpdate — payload correcto ──────────────────────────────
  // Solo envía status y notes — nunca los ítems.

  it('should call updateStatus when a new status is selected', () => {
    // Cuando se selecciona un nuevo estado, save() llama updateStatus(), no updateOrder().
    component.form.get('status')!.setValue('ENTREGADA');
    component.form.get('notes')!.setValue('Entregado correctamente');
    component.save();

    expect(ordersServiceEditSpy.updateStatus).toHaveBeenCalledWith(5, 'ENTREGADA', null);
    expect(ordersServiceEditSpy.updateOrder).not.toHaveBeenCalled();
  });

  it('should send null notes when the field is empty on update', () => {
    component.form.get('notes')!.setValue('');
    component.save();

    expect(ordersServiceEditSpy.updateOrder).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ notes: null })
    );
  });

  // ─── Grupo 16: Navegación y errores en modo editar ────────────────────────

  it('should navigate to /orders after successful update', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.save();
    expect(navigateSpy).toHaveBeenCalledWith(['/orders']);
  });

  it('should set serverError when updateOrder fails', () => {
    ordersServiceEditSpy.updateOrder.mockReturnValue(
      throwError(() => ({ error: { detail: 'Estado inválido.' } }))
    );
    component.save();

    expect(component.serverError()).toBe('Estado inválido.');
    expect(component.isSaving()).toBe(false);
  });

  it('should set serverError when getOrder fails on load', () => {
    ordersServiceEditSpy.getOrder.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    fixture   = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.serverError()).toBe('No se pudo cargar el pedido. Verifica la conexión.');
    expect(component.isLoading()).toBe(false);
  });

  // ─── Grupo 17: Renderizado en modo editar ─────────────────────────────────

  it('should show "Editar pedido #5" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Editar pedido #5');
  });

  it('should show "Guardar cambios" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Guardar cambios');
  });

  it('should show the status select in edit mode', () => {
    const select = fixture.nativeElement.querySelector('#status');
    expect(select).toBeTruthy();
  });

  it('should NOT show the add-item button in edit mode', () => {
    const btn = fixture.nativeElement.querySelector('.btn--sm');
    expect(btn).toBeNull();
  });
});
