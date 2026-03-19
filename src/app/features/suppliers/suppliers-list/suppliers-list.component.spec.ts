import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter }             from '@angular/router';
import { of, throwError }            from 'rxjs';

import { SuppliersListComponent }          from './suppliers-list.component';
import { SuppliersService }                from '../suppliers.service';
import { Supplier, SupplierPaginated }     from '../../../core/models/supplier.model';
import { SnackbarService }                 from '../../../core/services/snackbar.service';
import { ConfirmDialogService }            from '../../../core/services/confirm-dialog.service';

// ─── Helpers — datos de prueba ───────────────────────────────────────────────
// makeSupplier construye un Supplier completo con defaults razonables.
// overrides permite cambiar solo los campos necesarios para cada test.

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id:            1,
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

function makePaginated(overrides: Partial<SupplierPaginated> = {}): SupplierPaginated {
  return {
    items:     [makeSupplier()],
    total:     1,
    page:      1,
    page_size: 10,
    pages:     1,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SuppliersListComponent', () => {
  let fixture:   ComponentFixture<SuppliersListComponent>;
  let component: SuppliersListComponent;

  // El spy reemplaza al servicio real — no se hace ninguna llamada HTTP real.
  const suppliersServiceSpy = {
    getSuppliers:    vi.fn(),
    update:  vi.fn(),
  };

  // Spy del ConfirmDialogService — por defecto confirma (true).
  // Los tests que prueban la cancelación lo sobreescriben con mockResolvedValue(false).
  const confirmServiceSpy = {
    confirm: vi.fn().mockResolvedValue(true),
  };

  // Spy del SnackbarService — no necesitamos verificar mensajes específicos aquí,
  // solo que no lanza errores al ser llamado.
  const snackbarServiceSpy = {
    show: vi.fn(),
  };

  beforeEach(async () => {
    // Reseteamos el spy antes de cada test para evitar que un test contamine al siguiente.
    suppliersServiceSpy.getSuppliers.mockReturnValue(of(makePaginated()));
    suppliersServiceSpy.update.mockReturnValue(of(makeSupplier()));

    await TestBed.configureTestingModule({
      imports:   [SuppliersListComponent],
      providers: [
        provideRouter([]),
        { provide: SuppliersService,    useValue: suppliersServiceSpy },
        { provide: ConfirmDialogService, useValue: confirmServiceSpy  },
        { provide: SnackbarService,      useValue: snackbarServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(SuppliersListComponent);
    component = fixture.componentInstance;

    // detectChanges dispara ngOnInit → loadPage(1) → subscribe → datos llegan
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restaura el default: confirmar (true) para que los tests independientes
    // no se vean afectados por un test previo que lo cambió a false.
    confirmServiceSpy.confirm.mockResolvedValue(true);
  });

  // ─── Creación ──────────────────────────────────────────────────────────────
  // Verifica que el componente se instancia sin errores.

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Llamada al servicio en ngOnInit ──────────────────────────────────────
  // Al arrancar, el componente debe pedir la página 1 con el filtro 'true'
  // (solo activos) que es el valor inicial de filterActive.

  it('should call getSuppliers on init with page 1 and is_active=true', () => {
    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, is_active: true })
    );
  });

  // ─── Estado después de recibir datos ──────────────────────────────────────
  // Cuando el servicio responde con éxito, loadState debe ser 'loaded'.

  it('should set loadState to loaded after data arrives', () => {
    expect(component.loadState()).toBe('loaded');
  });

  it('should expose the suppliers list from the response', () => {
    expect(component.suppliers().length).toBe(1);
    expect(component.suppliers()[0].name).toBe('Distribuidora Colombia');
  });

  it('should expose correct pagination values', () => {
    expect(component.totalItems()).toBe(1);
    expect(component.totalPages()).toBe(1);
    expect(component.currentPage()).toBe(1);
  });

  // ─── Estado de error ──────────────────────────────────────────────────────
  // Si el servicio falla, loadState debe ser 'error'.

  it('should set loadState to error when the service fails', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      throwError(() => new Error('Network error'))
    );
    component.loadPage(1);
    fixture.detectChanges();

    expect(component.loadState()).toBe('error');
  });

  // ─── Renderizado de la tabla ───────────────────────────────────────────────
  // Verifica que el HTML refleja los datos recibidos.

  it('should render a row for each supplier', () => {
    const rows = fixture.nativeElement.querySelectorAll('.animate-stagger');
    expect(rows.length).toBe(1);
  });

  it('should display the supplier name in the table', () => {
    const nameEl = fixture.nativeElement.querySelector('.cell--name') as HTMLElement;
    expect(nameEl.textContent?.trim()).toBe('Distribuidora Colombia');
  });

  // ─── Campos opcionales: email, phone, address ──────────────────────────────
  // Cuando el campo tiene valor, se muestra. Cuando es null, se muestra "—".

  it('should show email when present', () => {
    // Buscamos la celda con el email — es la tercera td (índice 2) de la fila
    const cells = fixture.nativeElement.querySelectorAll('.animate-stagger td');
    expect(cells[2].textContent?.trim()).toBe('contacto@distcol.com');
  });

  it('should show dash when contact_email is null', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ items: [makeSupplier({ contact_email: null })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const mutedCells = fixture.nativeElement.querySelectorAll('.cell--muted');
    // Al menos una celda debe mostrar "—" (email vacío)
    const hasEmptyDash = Array.from(mutedCells).some(
      (el: any) => el.textContent?.trim() === '—'
    );
    expect(hasEmptyDash).toBe(true);
  });

  // ─── Status badge ─────────────────────────────────────────────────────────
  // El badge debe mostrar "Activo" o "Inactivo" según el campo is_active.

  it('should show "Activo" badge for an active supplier', () => {
    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Activo');
    expect(badge.classList.contains('status-badge--active')).toBe(true);
  });

  it('should show "Inactivo" badge for an inactive supplier', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ items: [makeSupplier({ is_active: false })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Inactivo');
    expect(badge.classList.contains('status-badge--inactive')).toBe(true);
  });

  // ─── Botón desactivar ─────────────────────────────────────────────────────
  // Solo aparece cuando el proveedor está activo.
  // Cuando el proveedor está inactivo, no debe renderizarse.

  it('should show the deactivate button for an active supplier', () => {
    const btn = fixture.nativeElement.querySelector('.action-link--danger') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent?.trim()).toBe('Desactivar');
  });

  it('should NOT show the deactivate button for an inactive supplier', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ items: [makeSupplier({ is_active: false })] }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.action-link--danger');
    expect(btn).toBeNull();
  });

  // ─── deactivate() ─────────────────────────────────────────────────────────
  // Cuando el usuario confirma, llama al servicio con is_active: false
  // y luego recarga la página actual.

  it('should call update with is_active:false when confirmed', async () => {
    confirmServiceSpy.confirm.mockResolvedValue(true);

    component.deactivate(makeSupplier());
    await Promise.resolve(); // deja que el .then() de la Promise se ejecute

    expect(suppliersServiceSpy.update).toHaveBeenCalledWith(
      1,
      { is_active: false }
    );
  });

  it('should reload the current page after deactivation', async () => {
    confirmServiceSpy.confirm.mockResolvedValue(true);
    suppliersServiceSpy.getSuppliers.mockClear();

    component.deactivate(makeSupplier());
    await Promise.resolve();

    // getSuppliers se llama de nuevo para recargar la lista
    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledTimes(1);
  });

  it('should NOT call update when the user cancels the confirm', async () => {
    confirmServiceSpy.confirm.mockResolvedValue(false);

    component.deactivate(makeSupplier());
    await Promise.resolve();

    expect(suppliersServiceSpy.update).not.toHaveBeenCalled();
  });

  // ─── Estado vacío ─────────────────────────────────────────────────────────

  it('should show empty message when there are no suppliers', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ items: [], total: 0, pages: 0 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('.empty-state') as HTMLElement;
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent?.trim()).toContain('No hay proveedores');
  });

  // ─── Paginador ────────────────────────────────────────────────────────────

  it('should NOT render the paginator when there is only one page', () => {
    const paginator = fixture.nativeElement.querySelector('nav.paginator');
    expect(paginator).toBeNull();
  });

  it('should render the paginator when there are multiple pages', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    const paginator = fixture.nativeElement.querySelector('nav.paginator');
    expect(paginator).toBeTruthy();
  });

  // ─── onPageChange() ───────────────────────────────────────────────────────

  it('should NOT go below page 1', () => {
    component.onPageChange(0); // página 0 es inválida
    expect(component.currentPage()).toBe(1);
  });

  it('should NOT go above the last page', () => {
    component.onPageChange(2); // estamos en página 1 de 1 — página 2 no existe
    expect(component.currentPage()).toBe(1);
  });

  it('should go to the next page when there are more pages', () => {
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ total: 25, pages: 3 }))
    );
    component.loadPage(1);
    fixture.detectChanges();

    suppliersServiceSpy.getSuppliers.mockClear();
    suppliersServiceSpy.getSuppliers.mockReturnValue(
      of(makePaginated({ page: 2, total: 25, pages: 3 }))
    );

    component.onPageChange(2); // página absoluta 2
    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  // ─── onFilterChange() ─────────────────────────────────────────────────────
  // Al cambiar el filtro, el componente vuelve a página 1 con el nuevo valor.

  it('should reset to page 1 and set is_active=true when filtering activos', () => {
    suppliersServiceSpy.getSuppliers.mockClear();
    component.onFilterChange('true');

    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, is_active: true })
    );
  });

  it('should send is_active=false when filtering inactivos', () => {
    suppliersServiceSpy.getSuppliers.mockClear();
    component.onFilterChange('false');

    expect(suppliersServiceSpy.getSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, is_active: false })
    );
  });

  it('should NOT send is_active when filtering todos', () => {
    suppliersServiceSpy.getSuppliers.mockClear();
    component.onFilterChange('');

    // El objeto de params no debe tener la clave is_active
    const calledWith = suppliersServiceSpy.getSuppliers.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty('is_active');
  });

  // ─── formatDate ───────────────────────────────────────────────────────────

  it('should format an ISO date to a human-readable string', () => {
    const result = component.formatDate('2026-01-15T10:00:00Z');
    // Verifica que contiene el año — el formato exacto depende del sistema operativo
    expect(result).toContain('2026');
  });
});
