import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter }             from '@angular/router';
import { of }                        from 'rxjs';

import { ProductsListComponent }            from './products-list.component';
import { ProductsService }                  from '../products.service';
import { Product, ProductPaginated }        from '../../../core/models/product.model';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id:          1,
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

function makePaginated(overrides: Partial<ProductPaginated> = {}): ProductPaginated {
  return {
    items:     [makeProduct()],
    total:     1,
    page:      1,
    page_size: 10,
    pages:     1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsListComponent', () => {
  let fixture:   ComponentFixture<ProductsListComponent>;
  let component: ProductsListComponent;

  const productsServiceSpy = {
    getProducts: vi.fn().mockReturnValue(of(makePaginated())),
  };

  beforeEach(async () => {
    productsServiceSpy.getProducts.mockReturnValue(of(makePaginated()));

    await TestBed.configureTestingModule({
      imports:   [ProductsListComponent],
      providers: [
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProductsListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Llamada al servicio ───────────────────────────────────────────────────

  it('should call getProducts on init with page 1 and page_size 10', () => {
    expect(productsServiceSpy.getProducts).toHaveBeenCalledWith({ page: 1, page_size: 10 });
  });

  // ─── Estado después de recibir datos ──────────────────────────────────────

  it('should not be loading after data arrives', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should expose the products list from the response', () => {
    expect(component.products().length).toBe(1);
    expect(component.products()[0].name).toBe('Café Premium');
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

  it('should render a row for each product', () => {
    const rows = fixture.nativeElement.querySelectorAll('.animate-stagger');
    expect(rows.length).toBe(1);
  });

  it('should display the product name in the table', () => {
    const nameEl = fixture.nativeElement.querySelector('.cell--name') as HTMLElement;
    expect(nameEl.textContent?.trim()).toBe('Café Premium');
  });

  it('should display the product price formatted as COP', () => {
    const priceEl = fixture.nativeElement.querySelector('.cell--price') as HTMLElement;
    // formatPrice(15000) → "$15.000"
    expect(priceEl.textContent?.trim()).toContain('15.000');
  });

  // ─── formatPrice ──────────────────────────────────────────────────────────

  it('should format price with COP locale', () => {
    expect(component.formatPrice(15000)).toContain('15.000');
    expect(component.formatPrice(1500000)).toContain('1.500.000');
  });

  // ─── Category badge ───────────────────────────────────────────────────────

  it('should show category badge when product has a category', () => {
    const badge = fixture.nativeElement.querySelector('.category-badge') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('Bebidas');
  });

  it('should show dash when product has no category', () => {
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ items: [makeProduct({ category: null })] }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.category-badge');
    expect(badge).toBeNull();
  });

  // ─── Status badge ─────────────────────────────────────────────────────────

  it('should show "Activo" for an active product', () => {
    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Activo');
    expect(badge.classList.contains('status-badge--active')).toBe(true);
  });

  it('should show "Inactivo" for an inactive product', () => {
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ items: [makeProduct({ is_active: false })] }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Inactivo');
    expect(badge.classList.contains('status-badge--inactive')).toBe(true);
  });

  // ─── Estado vacío ─────────────────────────────────────────────────────────

  it('should show empty message when there are no products', () => {
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ items: [], total: 0, pages: 0 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('.empty-state') as HTMLElement;
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent?.trim()).toContain('No hay productos');
  });

  // ─── Paginador ────────────────────────────────────────────────────────────

  it('should NOT render the paginator when there is only one page', () => {
    const paginator = fixture.nativeElement.querySelector('.pagination');
    expect(paginator).toBeNull();
  });

  it('should render the paginator when there are multiple pages', () => {
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    const paginator = fixture.nativeElement.querySelector('.pagination');
    expect(paginator).toBeTruthy();
  });

  // ─── goToPage ─────────────────────────────────────────────────────────────

  it('should NOT go below page 1', () => {
    component.goToPage(0);
    expect(component.params().page).toBe(1);
  });

  it('should NOT go above total pages', () => {
    component.goToPage(2);
    expect(component.params().page).toBe(1);
  });

  it('should update params when changing page', () => {
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.params.update(p => ({ ...p }));
    TestBed.flushEffects();
    fixture.detectChanges();

    productsServiceSpy.getProducts.mockClear();
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ page: 2, total: 25, pages: 3 }))
    );

    component.goToPage(2);
    TestBed.flushEffects();

    expect(productsServiceSpy.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  // ─── filterByCategory ─────────────────────────────────────────────────────

  it('should reset to page 1 and set category when filtering', () => {
    // Primero vamos a página 2
    productsServiceSpy.getProducts.mockReturnValue(
      of(makePaginated({ page: 2, total: 25, pages: 3 }))
    );
    component.params.update(p => ({ ...p, page: 2 }));
    TestBed.flushEffects();
    fixture.detectChanges();

    // Al filtrar por categoría, volvemos a página 1
    component.filterByCategory('Bebidas');
    expect(component.params().page).toBe(1);
    expect(component.params().category).toBe('Bebidas');
  });

  it('should remove category filter when selecting empty string', () => {
    component.filterByCategory('');
    expect(component.params().category).toBeUndefined();
  });

  // ─── filterByStatus ───────────────────────────────────────────────────────

  it('should set is_active=true when filtering by "true"', () => {
    component.filterByStatus('true');
    expect(component.params().is_active).toBe(true);
  });

  it('should set is_active=false when filtering by "false"', () => {
    component.filterByStatus('false');
    expect(component.params().is_active).toBe(false);
  });

  it('should remove is_active filter when selecting empty string', () => {
    component.filterByStatus('');
    expect(component.params().is_active).toBeUndefined();
  });
});
