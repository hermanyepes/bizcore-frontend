import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { SuppliersService, SupplierListParams } from '../suppliers.service';
import { Supplier }                             from '../../../core/models/supplier.model';
import { SnackbarService }                      from '../../../core/services/snackbar.service';
import { ConfirmDialogService }                 from '../../../core/services/confirm-dialog.service';
import { PaginatorComponent }                   from '../../../shared/paginator/paginator.component';
import { ModalComponent }                       from '../../../shared/modal/modal.component';
import { SupplierCreateModalComponent }         from '../supplier-create-modal/supplier-create-modal.component';

// ─── Estado de carga ──────────────────────────────────────────────────────────
// Tres estados posibles para la pantalla: cargando, datos listos, o error.
// Controlamos qué se muestra en el template según este valor.
type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector:        'app-suppliers-list',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [RouterLink, PaginatorComponent, ModalComponent, SupplierCreateModalComponent],
  templateUrl:     './suppliers-list.component.html',
  styleUrl:        './suppliers-list.component.scss',
})
export class SuppliersListComponent implements OnInit {

  private readonly suppliersService = inject(SuppliersService);
  private readonly snackbarService  = inject(SnackbarService);
  private readonly confirmService   = inject(ConfirmDialogService);

  @ViewChild(SupplierCreateModalComponent)
  private createModalRef?: SupplierCreateModalComponent;

  readonly showCreateModal = signal(false);

  onCloseRequested(): void {
    if (!this.createModalRef?.form.dirty) {
      this.showCreateModal.set(false);
      return;
    }
    this.confirmService
      .confirm('¿Descartar los cambios sin guardar?')
      .then(confirmed => {
        if (confirmed) this.showCreateModal.set(false);
      });
  }

  onSupplierCreated(): void {
    this.showCreateModal.set(false);
    this.loadPage(1);
    this.snackbarService.show('Proveedor creado');
  }

  // ─── Estado de la pantalla ────────────────────────────────────────────────
  readonly loadState = signal<LoadState>('loading');

  // Lista de proveedores de la página actual
  readonly suppliers  = signal<Supplier[]>([]);

  // ─── Paginación ───────────────────────────────────────────────────────────
  readonly currentPage = signal(1);
  readonly totalPages  = signal(1);
  readonly totalItems  = signal(0);
  readonly pageSize    = 10; // fijo — igual que el backend por defecto

  // ─── Filtro activo/inactivo ───────────────────────────────────────────────
  // '' = sin filtro (todos); 'true' = solo activos; 'false' = solo inactivos.
  // Es string porque viene del value de un <select> HTML (siempre string).
  readonly filterActive = signal<'' | 'true' | 'false'>('true');

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Al arrancar la pantalla, cargamos la primera página con el filtro inicial.
    this.loadPage(1);
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────
  // Pide una página al servicio con los filtros activos en ese momento.
  // Se llama al arrancar (ngOnInit) y cada vez que el usuario cambia de
  // página, cambia el filtro, o después de desactivar un proveedor.

  loadPage(page: number): void {
    this.loadState.set('loading');
    this.currentPage.set(page);

    // Construimos el objeto de parámetros solo con los campos que aplican.
    const params: SupplierListParams = { page, page_size: this.pageSize };

    // Convertimos el string del <select> al boolean que el backend espera.
    // Si el filtro está vacío ('') no añadimos is_active — el backend devuelve todos.
    const f = this.filterActive();
    if (f !== '') {
      params.is_active = f === 'true';
    }

    this.suppliersService.getSuppliers(params).subscribe({
      next: (data) => {
        this.suppliers.set(data.items);
        this.totalPages.set(data.pages);
        this.totalItems.set(data.total);
        this.loadState.set('loaded');
      },
      error: () => {
        // No exponemos el error técnico al usuario — solo mostramos el estado.
        this.loadState.set('error');
      },
    });
  }

  // ─── Manejadores de eventos del template ──────────────────────────────────

  // El usuario cambió el filtro activo/inactivo — volvemos a página 1
  // para no quedar en una página que ya no existe con el nuevo filtro.
  onFilterChange(value: string): void {
    this.filterActive.set(value as '' | 'true' | 'false');
    this.loadPage(1);
  }

  // El usuario seleccionó una página en el paginador compartido
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadPage(page);
  }

  // ─── Desactivar un proveedor ──────────────────────────────────────────────
  // Llama al PUT con is_active: false (soft delete).
  // Cuando el backend confirma, recarga la página actual para reflejar el cambio.
  // No usamos DELETE — el proveedor queda en la BD para mantener el historial
  // de pedidos que lo referencian.
  deactivate(supplier: Supplier): void {
    this.confirmService
      .confirm(`¿Desactivar a "${supplier.name}"?`)
      .then(confirmed => {
        if (!confirmed) return;

        this.suppliersService
          .updateSupplier(supplier.id, { is_active: false })
          .subscribe({
            next: () => {
              this.snackbarService.show('Proveedor desactivado');
              this.loadPage(this.currentPage());
            },
            error: () => this.snackbarService.show(
              'No se pudo desactivar el proveedor.',
              'error',
            ),
          });
      });
  }

  // ─── Helpers para el template ─────────────────────────────────────────────

  // Formatea la fecha ISO a algo legible: "09 mar 2026, 2:30 p.m."
  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-CO', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  }
}
