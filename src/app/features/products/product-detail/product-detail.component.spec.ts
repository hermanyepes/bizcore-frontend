import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProductDetailComponent }          from './product-detail.component';
import { ProductsService }                 from '../products.service';
import { Product }                         from '../../../core/models/product.model';

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

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductDetailComponent', () => {

  let fixture:   ComponentFixture<ProductDetailComponent>;
  let component: ProductDetailComponent;

  const productsServiceSpy = {
    getProduct: vi.fn().mockReturnValue(of(makeProduct())),
  };

  // Mock de ActivatedRoute — el id del producto es un número en la URL como string
  const activatedRouteMock = {
    paramMap: of(convertToParamMap({ id: '42' })),
  };

  beforeEach(async () => {
    productsServiceSpy.getProduct.mockReturnValue(of(makeProduct()));

    await TestBed.configureTestingModule({
      imports:   [ProductDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService,  useValue: productsServiceSpy  },
        { provide: ActivatedRoute,   useValue: activatedRouteMock  },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;

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

  it('should call getProduct with the numeric id from the URL', () => {
    // La URL tiene "42" como string; el componente convierte a Number(42)
    expect(productsServiceSpy.getProduct).toHaveBeenCalledWith(42);
  });

  // ─── Estado después de recibir datos ────────────────────────────────────

  it('should not be loading after data arrives', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should not be in not-found state when data arrives', () => {
    expect(component.isNotFound()).toBe(false);
  });

  // ─── Renderizado ─────────────────────────────────────────────────────────

  it('should display the product name', () => {
    const el = fixture.nativeElement.querySelector('.profile-name') as HTMLElement;
    expect(el.textContent?.trim()).toBe('Café Premium');
  });

  it('should display the product id', () => {
    const el = fixture.nativeElement.querySelector('.profile-id .mono') as HTMLElement;
    expect(el.textContent?.trim()).toBe('42');
  });

  it('should display the description', () => {
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[0].textContent?.trim()).toBe('Café de origen colombiano');
  });

  it('should display the price formatted as COP', () => {
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[1].textContent?.trim()).toContain('15.000');
  });

  it('should display the stock', () => {
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[2].textContent?.trim()).toContain('100');
  });

  it('should display the category', () => {
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[3].textContent?.trim()).toBe('Bebidas');
  });

  // ─── formatPrice ─────────────────────────────────────────────────────────

  it('should format price correctly', () => {
    expect(component.formatPrice(15000)).toContain('15.000');
    expect(component.formatPrice(2500000)).toContain('2.500.000');
  });

  // ─── Category badge ───────────────────────────────────────────────────────

  it('should show the category badge when category is set', () => {
    const badge = fixture.nativeElement.querySelector('.badge--category') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('Bebidas');
  });

  it('should NOT show the category badge when category is null', () => {
    productsServiceSpy.getProduct.mockReturnValue(of(makeProduct({ category: null })));
    fixture   = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge--category');
    expect(badge).toBeNull();
  });

  // ─── Status badge ─────────────────────────────────────────────────────────

  it('should show "Activo" badge for an active product', () => {
    const badge = fixture.nativeElement.querySelector('.badge--active') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('Activo');
  });

  it('should show "Inactivo" badge for an inactive product', () => {
    productsServiceSpy.getProduct.mockReturnValue(of(makeProduct({ is_active: false })));
    fixture   = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge--inactive') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('Inactivo');
  });

  // ─── Campos nulos ─────────────────────────────────────────────────────────

  it('should show dash for null updated_at', () => {
    // makeProduct() devuelve updated_at: null
    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[5].textContent?.trim()).toBe('—');
  });

  it('should show dash for null description', () => {
    productsServiceSpy.getProduct.mockReturnValue(of(makeProduct({ description: null })));
    fixture   = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const values = fixture.nativeElement.querySelectorAll('.field-value') as NodeListOf<HTMLElement>;
    expect(values[0].textContent?.trim()).toBe('—');
  });

  // ─── Estado: no encontrado ────────────────────────────────────────────────

  describe('when getProduct returns an error', () => {
    beforeEach(() => {
      productsServiceSpy.getProduct.mockReturnValue(throwError(() => new Error('404 Not Found')));
      fixture   = TestBed.createComponent(ProductDetailComponent);
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

    it('should render the error card', () => {
      const card = fixture.nativeElement.querySelector('.state-card--error') as HTMLElement;
      expect(card).toBeTruthy();
    });

    it('should NOT render the profile card', () => {
      const card = fixture.nativeElement.querySelector('.profile-card');
      expect(card).toBeNull();
    });
  });

});
