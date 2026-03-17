// ============================================================
// BizCore — Orders List Component
// ============================================================
//
// ANALOGÍA: el tablero de control del despachador de bodega.
// Muestra todos los pedidos con dos selectores arriba:
//   - filtrar por estado (PENDIENTE / COMPLETADO / CANCELADO)
//   - filtrar por proveedor
//
// La novedad respecto a módulos anteriores: al iniciar,
// hace DOS llamadas HTTP en paralelo:
//   1. cargar los pedidos (página 1, sin filtros)
//   2. cargar todos los proveedores para popular el dropdown
// ============================================================

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { OrdersService, OrderListParams } from '../orders.service';
import { SuppliersService }               from '../../suppliers/suppliers.service';
import { Order, OrderStatus }             from '../order.model';
import { Supplier }                       from '../../../core/models/supplier.model';
import { SnackbarService }                from '../../../core/services/snackbar.service';
import { ConfirmDialogService }           from '../../../core/services/confirm-dialog.service';

// ─── Estado de carga ──────────────────────────────────────────────────────────
// Tres estados posibles para la pantalla: cargando, datos listos, o error.
type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector:        'app-orders-list',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [RouterLink],
  templateUrl:     './orders-list.component.html',
  styleUrl:        './orders-list.component.scss',
})
export class OrdersListComponent implements OnInit {

  private readonly ordersService    = inject(OrdersService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly snackbarService  = inject(SnackbarService);
  private readonly confirmService   = inject(ConfirmDialogService);

  // ─── Estado de la pantalla ────────────────────────────────────────────────
  readonly loadState = signal<LoadState>('loading');

  // Lista de pedidos de la página actual
  readonly orders = signal<Order[]>([]);

  // Lista de proveedores para el dropdown de filtro
  // Se carga una sola vez al iniciar — no cambia mientras navegas
  readonly suppliers = signal<Supplier[]>([]);

  // ─── Paginación ───────────────────────────────────────────────────────────
  readonly currentPage = signal(1);
  readonly totalPages  = signal(1);
  readonly totalItems  = signal(0);
  readonly pageSize    = 10;

  // ─── Filtros activos ──────────────────────────────────────────────────────
  // '' = sin filtro (todos los estados)
  // Guardamos como string porque viene del value de un <select> HTML
  readonly filterStatus     = signal<'' | OrderStatus>('');

  // 0 = sin filtro (todos los proveedores)
  // Guardamos como number porque supplier_id es un número
  readonly filterSupplierId = signal<number>(0);

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Al arrancar, hacemos las dos cargas en paralelo:
    // la lista de pedidos y la lista de proveedores para el dropdown.
    this.loadSuppliers();
    this.loadPage(1);
  }

  // ─── Carga de proveedores para el dropdown ────────────────────────────────
  // Solo necesitamos los proveedores activos.
  // page_size=100 garantiza que cargamos todos (en producción real
  // se usaría un endpoint de "autocomplete", pero aquí es suficiente).
  private loadSuppliers(): void {
    this.suppliersService.getSuppliers({ page: 1, page_size: 100, is_active: true })
      .subscribe({
        next: (data) => this.suppliers.set(data.items),
        error: ()    => {
          // Si falla el dropdown, no bloqueamos la pantalla entera.
          // El usuario puede seguir viendo pedidos sin filtrar por proveedor.
          this.suppliers.set([]);
        },
      });
  }

  // ─── Carga de pedidos ─────────────────────────────────────────────────────
  // Construye los parámetros según los filtros activos en ese momento
  // y pide la página indicada al servicio.
  loadPage(page: number): void {
    this.loadState.set('loading');
    this.currentPage.set(page);

    const params: OrderListParams = { page, page_size: this.pageSize };

    // Solo añadimos los filtros si el usuario los activó
    const status     = this.filterStatus();
    const supplierId = this.filterSupplierId();

    if (status !== '') {
      params.status = status;
    }
    if (supplierId !== 0) {
      params.supplier_id = supplierId;
    }

    this.ordersService.getOrders(params).subscribe({
      next: (data) => {
        this.orders.set(data.items);
        this.totalPages.set(data.pages);
        this.totalItems.set(data.total);
        this.loadState.set('loaded');
      },
      error: () => {
        this.loadState.set('error');
      },
    });
  }

  // ─── Manejadores de eventos del template ──────────────────────────────────

  // El usuario cambió el filtro de estado — volvemos a página 1
  onStatusChange(value: string): void {
    this.filterStatus.set(value as '' | OrderStatus);
    this.loadPage(1);
  }

  // El usuario cambió el filtro de proveedor — volvemos a página 1
  // value viene del <select> como string — convertimos a number
  onSupplierChange(value: string): void {
    this.filterSupplierId.set(Number(value));
    this.loadPage(1);
  }

  // El usuario hizo clic en "Anterior" o "Siguiente"
  onPageChange(delta: number): void {
    const next = this.currentPage() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.loadPage(next);
  }

  // ─── Cancelar un pedido ───────────────────────────────────────────────────
  // Llama al DELETE, que en el backend cambia status a 'CANCELADO'.
  // El historial se conserva — nunca se borra la fila de la BD.
  cancelOrder(order: Order): void {
    this.confirmService
      .confirm(`¿Cancelar el pedido #${order.id}?`)
      .then(confirmed => {
        if (!confirmed) return;

        this.ordersService.cancelOrder(order.id).subscribe({
          next: () => {
            this.snackbarService.show('Pedido cancelado');
            this.loadPage(this.currentPage());
          },
          error: () => this.snackbarService.show(
            'No se pudo cancelar el pedido.',
            'error',
          ),
        });
      });
  }

  // ─── Helpers para el template ─────────────────────────────────────────────

  // Busca el nombre del proveedor en la lista ya cargada.
  // Evita una segunda llamada HTTP por cada pedido de la tabla.
  getSupplierName(supplierId: number): string {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier ? supplier.name : `#${supplierId}`;
  }

  // Calcula el total del pedido sumando los subtotales de sus ítems.
  // El backend guarda cada subtotal — solo sumamos.
  getOrderTotal(order: Order): number {
    return order.items.reduce((acc, item) => acc + item.subtotal, 0);
  }

  // Formatea un número en pesos colombianos: 950000 → "$950.000"
  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style:                 'currency',
      currency:              'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  // Formatea la fecha ISO a formato legible: "12/03/2026"
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    });
  }
}
