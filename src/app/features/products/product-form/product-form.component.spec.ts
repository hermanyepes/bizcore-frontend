import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProductFormComponent }        from './product-form.component';
import { ProductsService }             from '../products.service';
import { Product }                     from '../../../core/models/product.model';

// ─── Helper — dato de prueba ──────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id:          42,
    name:        'Café Premium',
    description: 'Café de origen colombiano',
    price:       15000,
    stock:       100,
    category:    'Bebidas',
    is_active:   true,
    created_at:  '2024-01-15T10:00:00',
    updated_at:  null,
    ...overrides,
  };
}

// ─── Mocks compartidos ────────────────────────────────────────────────────────

const productsServiceSpy = {
  getProduct:    vi.fn().mockReturnValue(of(makeProduct())),
  createProduct: vi.fn().mockReturnValue(of(makeProduct())),
  updateProduct: vi.fn().mockReturnValue(of(makeProduct())),
};

// ─── Modo CREAR — /products/new (paramMap sin 'id') ──────────────────────────

describe('ProductFormComponent — modo CREAR', () => {

  let fixture:   ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;
  let router:    Router;

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({}) },  // sin 'id'
  };

  beforeEach(async () => {
    productsServiceSpy.createProduct.mockReturnValue(of(makeProduct()));

    await TestBed.configureTestingModule({
      imports:   [ProductFormComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: ActivatedRoute,  useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Detección de modo ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect create mode correctly', () => {
    expect(component.isEditMode).toBe(false);
    expect(component.productId).toBeNull();
  });

  it('should NOT call getProduct on init in create mode', () => {
    expect(productsServiceSpy.getProduct).not.toHaveBeenCalled();
  });

  // ─── Validación del formulario ────────────────────────────────────────────

  it('should have the form invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should require name', () => {
    const nameCtrl = component.form.get('name')!;
    nameCtrl.setValue('');
    expect(nameCtrl.invalid).toBe(true);
  });

  it('should require price', () => {
    const priceCtrl = component.form.get('price')!;
    priceCtrl.setValue(null);
    expect(priceCtrl.invalid).toBe(true);
  });

  it('should reject price less than 1', () => {
    const priceCtrl = component.form.get('price')!;
    priceCtrl.setValue(0);
    expect(priceCtrl.invalid).toBe(true);
  });

  it('should accept valid price', () => {
    const priceCtrl = component.form.get('price')!;
    priceCtrl.setValue(15000);
    expect(priceCtrl.valid).toBe(true);
  });

  it('should have stock disabled at all times', () => {
    expect(component.form.get('stock')!.disabled).toBe(true);
  });

  it('should have the form valid when name and price are filled', () => {
    component.form.patchValue({ name: 'Café', price: 5000 });
    expect(component.form.valid).toBe(true);
  });

  // ─── save() — validaciones de guarda ─────────────────────────────────────

  it('should NOT call createProduct if form is invalid', () => {
    component.save();
    expect(productsServiceSpy.createProduct).not.toHaveBeenCalled();
  });

  it('should NOT call createProduct if isSaving is true', () => {
    component.form.patchValue({ name: 'Café', price: 5000 });
    component.isSaving.set(true);
    component.save();
    expect(productsServiceSpy.createProduct).not.toHaveBeenCalled();
  });

  // ─── saveCreate — llamada al servicio ────────────────────────────────────

  it('should call createProduct with the correct payload', () => {
    component.form.patchValue({
      name:        'Café Premium',
      description: 'Descripción test',
      price:       15000,
      category:    'Bebidas',
    });
    component.save();

    expect(productsServiceSpy.createProduct).toHaveBeenCalledWith({
      name:        'Café Premium',
      description: 'Descripción test',
      price:       15000,
      category:    'Bebidas',
    });
  });

  it('should send null description when left empty', () => {
    component.form.patchValue({ name: 'Café', price: 5000, description: '' });
    component.save();

    expect(productsServiceSpy.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should send null category when none selected', () => {
    component.form.patchValue({ name: 'Café', price: 5000, category: null });
    component.save();

    expect(productsServiceSpy.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ category: null })
    );
  });

  it('should navigate to product detail after successful create', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.form.patchValue({ name: 'Café', price: 5000 });
    component.save();

    expect(navigateSpy).toHaveBeenCalledWith(['/products', 42]);
  });

  it('should set serverError when createProduct fails', () => {
    productsServiceSpy.createProduct.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error de prueba' } }))
    );
    component.form.patchValue({ name: 'Café', price: 5000 });
    component.save();

    expect(component.serverError()).toBe('Error de prueba');
    expect(component.isSaving()).toBe(false);
  });

  it('should show fallback error message when detail is missing', () => {
    productsServiceSpy.createProduct.mockReturnValue(
      throwError(() => ({ error: {} }))
    );
    component.form.patchValue({ name: 'Café', price: 5000 });
    component.save();

    expect(component.serverError()).toBe('Error al crear el producto.');
  });

  // ─── Renderizado del formulario ───────────────────────────────────────────

  it('should show "Nuevo producto" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Nuevo producto');
  });

  it('should show "Crear producto" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Crear producto');
  });

  it('should NOT show the is_active field in create mode', () => {
    const select = fixture.nativeElement.querySelector('#is_active');
    expect(select).toBeNull();
  });

  it('should render the category select with all options', () => {
    const options = fixture.nativeElement.querySelectorAll('#category option');
    // 1 opción "Sin categoría" + 7 categorías = 8 total
    expect(options.length).toBe(8);
  });
});

// ─── Modo EDITAR — /products/42/edit ─────────────────────────────────────────

describe('ProductFormComponent — modo EDITAR', () => {

  let fixture:   ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;
  let router:    Router;

  const activatedRouteMock = {
    snapshot: { paramMap: convertToParamMap({ id: '42' }) },
  };

  beforeEach(async () => {
    productsServiceSpy.getProduct.mockReturnValue(of(makeProduct()));
    productsServiceSpy.updateProduct.mockReturnValue(of(makeProduct()));

    await TestBed.configureTestingModule({
      imports:   [ProductFormComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: ActivatedRoute,  useValue: activatedRouteMock },
      ],
    }).compileComponents();

    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Detección de modo ────────────────────────────────────────────────────

  it('should create in edit mode', () => {
    expect(component).toBeTruthy();
  });

  it('should detect edit mode correctly', () => {
    expect(component.isEditMode).toBe(true);
    expect(component.productId).toBe(42);
  });

  it('should call getProduct on init with the correct id', () => {
    expect(productsServiceSpy.getProduct).toHaveBeenCalledWith(42);
  });

  // ─── Pre-población del formulario ─────────────────────────────────────────

  it('should pre-populate name from the loaded product', () => {
    expect(component.form.get('name')!.value).toBe('Café Premium');
  });

  it('should pre-populate price from the loaded product', () => {
    expect(component.form.get('price')!.value).toBe(15000);
  });

  it('should pre-populate category from the loaded product', () => {
    expect(component.form.get('category')!.value).toBe('Bebidas');
  });

  it('should pre-populate stock (disabled) from the loaded product', () => {
    // getRawValue() incluye controles deshabilitados
    expect(component.form.getRawValue().stock).toBe(100);
  });

  it('should have stock disabled in edit mode too', () => {
    expect(component.form.get('stock')!.disabled).toBe(true);
  });

  // ─── saveUpdate — llamada al servicio ────────────────────────────────────

  it('should call updateProduct with the correct payload', () => {
    component.form.patchValue({ name: 'Café Editado', price: 18000 });
    component.save();

    expect(productsServiceSpy.updateProduct).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ name: 'Café Editado', price: 18000 })
    );
  });

  it('should NOT include stock in the update payload', () => {
    component.save();

    const call = productsServiceSpy.updateProduct.mock.calls[0][1];
    expect(call).not.toHaveProperty('stock');
  });

  it('should navigate to product detail after successful update', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.save();
    expect(navigateSpy).toHaveBeenCalledWith(['/products', 42]);
  });

  it('should set serverError when updateProduct fails', () => {
    productsServiceSpy.updateProduct.mockReturnValue(
      throwError(() => ({ error: { detail: 'Error de actualización' } }))
    );
    component.save();
    expect(component.serverError()).toBe('Error de actualización');
    expect(component.isSaving()).toBe(false);
  });

  // ─── Renderizado en modo editar ───────────────────────────────────────────

  it('should show "Editar producto" as page title', () => {
    const title = fixture.nativeElement.querySelector('.page-title') as HTMLElement;
    expect(title.textContent?.trim()).toBe('Editar producto');
  });

  it('should show "Guardar cambios" in the submit button', () => {
    const btn = fixture.nativeElement.querySelector('[type="submit"]') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain('Guardar cambios');
  });

  it('should show the is_active select in edit mode', () => {
    const select = fixture.nativeElement.querySelector('#is_active');
    expect(select).toBeTruthy();
  });

  // ─── Error al cargar el producto ─────────────────────────────────────────

  it('should set serverError when getProduct fails on load', async () => {
    productsServiceSpy.getProduct.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    fixture   = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.serverError()).toBe('No se pudo cargar el producto. Verifica la conexión.');
    expect(component.isLoading()).toBe(false);
  });
});
