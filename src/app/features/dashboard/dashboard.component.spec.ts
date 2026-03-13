// ============================================================
// BizCore — DashboardComponent Spec
// ============================================================
//
// ¿Cómo mockeamos Chart.js sin vi.mock (bloqueado en Angular)?
// Usamos ChartBuilderService como intermediario:
//   - En producción: ChartBuilderService llama new Chart() real
//   - En tests: proveemos un spy con { provide: ChartBuilderService, useValue: ... }
//   - El componente nunca sabe la diferencia
//
// Grupos de tests:
//   1. Creación
//   2. Estado inicial (loading)
//   3. Datos cargados — tarjetas y gráfico
//   4. Stock bajo — tabla y mensaje positivo
//   5. Estado de error
//   6. Ciclo de vida — ngOnDestroy
// ============================================================

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError }            from 'rxjs';

import { DashboardComponent }                from './dashboard.component';
import { DashboardService }                  from './dashboard.service';
import { ChartBuilderService }               from './chart-builder.service';
import { DashboardSummary, LowStockProduct } from './dashboard.model';


// ─── Helpers — datos de prueba ───────────────────────────────────────────────

function makeLowStockProduct(overrides: Partial<LowStockProduct> = {}): LowStockProduct {
  return {
    id:    1,
    name:  'Café molido 500g',
    stock: 3,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    total_active_users:    12,
    total_active_products: 48,
    total_stock:           1240,
    total_inventory_value: 47350000,
    orders_by_status: {
      PENDIENTE:  8,
      EN_PROCESO: 5,
      ENTREGADO:  12,
      CANCELADO:  3,
    },
    low_stock_products: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardComponent', () => {
  let fixture:   ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  // Spy del service de datos
  const dashboardServiceSpy = {
    getSummary: vi.fn(),
  };

  // Spy de Chart.js — devuelve un objeto falso con destroy()
  // Angular inyecta este spy en lugar del ChartBuilderService real
  const mockChart = { destroy: vi.fn() };
  const chartBuilderSpy = {
    createDoughnut: vi.fn().mockReturnValue(mockChart),
  };

  beforeEach(async () => {
    dashboardServiceSpy.getSummary.mockReturnValue(of(makeSummary()));

    await TestBed.configureTestingModule({
      imports:   [DashboardComponent],
      providers: [
        { provide: DashboardService,    useValue: dashboardServiceSpy },
        { provide: ChartBuilderService, useValue: chartBuilderSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => vi.clearAllMocks());


  // ─── Grupo 1: Creación ────────────────────────────────────────────────────

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });


  // ─── Grupo 2: Estado inicial ──────────────────────────────────────────────
  // Sin detectChanges: ngAfterViewInit todavía no se ejecutó.

  it('should start with isLoading true and no data', () => {
    expect(component.isLoading()).toBe(true);
    expect(component.summary()).toBeNull();
    expect(component.error()).toBeNull();
  });

  it('should call getSummary once on init', () => {
    fixture.detectChanges();
    expect(dashboardServiceSpy.getSummary).toHaveBeenCalledTimes(1);
  });


  // ─── Grupo 3: Datos cargados ──────────────────────────────────────────────

  it('should set summary signal when data loads', () => {
    fixture.detectChanges();
    expect(component.summary()).toEqual(makeSummary());
  });

  it('should set isLoading to false after data loads', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
  });

  it('should render total_active_users in the DOM', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12');
  });

  it('should render total_active_products in the DOM', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('48');
  });

  it('should call createDoughnut to render the chart', () => {
    fixture.detectChanges();
    expect(chartBuilderSpy.createDoughnut).toHaveBeenCalledTimes(1);
    // Verificamos que el segundo argumento contiene los datos correctos
    const chartData = chartBuilderSpy.createDoughnut.mock.calls[0][1];
    expect(chartData.datasets[0].data).toEqual([8, 5, 12, 3]);
  });

  it('should compute orderEntries from orders_by_status', () => {
    fixture.detectChanges();
    const entries = component.orderEntries();
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({ key: 'PENDIENTE',  value: 8  });
    expect(entries[1]).toEqual({ key: 'EN_PROCESO', value: 5  });
    expect(entries[2]).toEqual({ key: 'ENTREGADO',  value: 12 });
    expect(entries[3]).toEqual({ key: 'CANCELADO',  value: 3  });
  });

  it('should render order status labels in the legend', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PENDIENTE');
    expect(text).toContain('ENTREGADO');
  });


  // ─── Grupo 4: Stock bajo ──────────────────────────────────────────────────

  it('should show low stock table when products exist', () => {
    dashboardServiceSpy.getSummary.mockReturnValue(
      of(makeSummary({ low_stock_products: [makeLowStockProduct()] }))
    );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Café molido 500g');
    expect(text).toContain('stock bajo');
  });

  it('should show healthy inventory message when no low stock products', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('niveles saludables');
    expect(text).not.toContain('stock bajo');
  });

  it('should show stock value as danger badge in low stock table', () => {
    dashboardServiceSpy.getSummary.mockReturnValue(
      of(makeSummary({ low_stock_products: [makeLowStockProduct({ stock: 3 })] }))
    );
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.status-badge--danger');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });


  // ─── Grupo 5: Estado de error ─────────────────────────────────────────────

  it('should set error signal when service fails', () => {
    dashboardServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('500'))
    );
    fixture.detectChanges();
    expect(component.error()).toBeTruthy();
    expect(component.summary()).toBeNull();
  });

  it('should set isLoading to false on error', () => {
    dashboardServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('500'))
    );
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
  });

  it('should render error message in the DOM', () => {
    dashboardServiceSpy.getSummary.mockReturnValue(
      throwError(() => new Error('500'))
    );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No se pudo cargar');
  });


  // ─── Grupo 6: Ciclo de vida — ngOnDestroy ─────────────────────────────────

  it('should call chart.destroy() when component is destroyed', () => {
    fixture.detectChanges(); // crea el gráfico
    fixture.destroy();       // dispara ngOnDestroy
    expect(mockChart.destroy).toHaveBeenCalledTimes(1);
  });

  it('should not throw if destroyed before chart was created', () => {
    // Sin detectChanges: ngAfterViewInit nunca corrió, chart es null
    expect(() => fixture.destroy()).not.toThrow();
  });
});
