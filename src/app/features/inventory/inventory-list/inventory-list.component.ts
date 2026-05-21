import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { InventoryService }                          from '../inventory.service';
import { InventoryMovement, MovementType }           from '../../../core/models/inventory.model';
import { AuthService }                               from '../../../core/auth/auth.service';
import { PaginatorComponent }                        from '../../../shared/paginator/paginator.component';

// ─── Estado de carga ──────────────────────────────────────────────────────────
// Tres estados posibles para la pantalla: cargando, datos listos, o error.
type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [RouterLink, FormsModule, PaginatorComponent],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent implements OnInit {

  private readonly inventoryService = inject(InventoryService);
  private readonly router           = inject(Router);
  private readonly authService      = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  // ─── Estado de la pantalla ────────────────────────────────────────────────
  // Signal de estado: controla si mostramos el spinner, la tabla, o el error.
  readonly loadState = signal<LoadState>('loading');

  // Lista de movimientos de la página actual
  readonly movements = signal<InventoryMovement[]>([]);

  // ─── Paginación ───────────────────────────────────────────────────────────
  readonly currentPage  = signal(1);
  readonly totalPages   = signal(1);
  readonly totalItems   = signal(0);
  readonly pageSize     = 10; // fijo — igual que el backend por defecto

  // ─── Filtros ──────────────────────────────────────────────────────────────
  // '' significa "sin filtro" — mostramos todos los tipos
  readonly filterType = signal<MovementType | ''>('');

  // ─── Opciones para el <select> de tipo ───────────────────────────────────
  // Array de objetos para que el template pueda mostrar etiquetas legibles
  // mientras el value sigue siendo el string que el backend espera.
  readonly movementTypeOptions: { value: MovementType | ''; label: string }[] = [
    { value: '',        label: 'Todos los tipos'  },
    { value: 'ENTRADA', label: 'Entrada'          },
    { value: 'SALIDA',  label: 'Salida'           },
    { value: 'AJUSTE',  label: 'Ajuste'           },
  ];

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadPage(1);
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────
  // Pide una página al servicio con los filtros activos.
  // Siempre vuelve a la página 1 cuando cambia un filtro.

  loadPage(page: number): void {
    this.loadState.set('loading');
    this.currentPage.set(page);

    // Construimos los params solo con lo que tiene valor
    const params: Parameters<InventoryService['getMovements']>[0] = {
      page,
      page_size: this.pageSize,
    };

    if (this.filterType() !== '') {
      params.movement_type = this.filterType() as MovementType;
    }

    this.inventoryService.getMovements(params).subscribe({
      next: (data) => {
        this.movements.set(data.items);
        this.totalPages.set(data.pages);
        this.totalItems.set(data.total);
        this.loadState.set('loaded');
      },
      error: () => {
        this.loadState.set('error');
      },
    });
  }

  // ─── Manejadores de eventos del template ─────────────────────────────────

  // El usuario cambió el filtro de tipo — volvemos a página 1
  onFilterChange(): void {
    this.loadPage(1);
  }

  // El usuario seleccionó una página en el paginador compartido
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadPage(page);
  }

  // Navega al detalle de un movimiento
  onRowClick(id: number): void {
    this.router.navigate(['/inventory', id]);
  }

  // ─── Helpers para el template ─────────────────────────────────────────────

  // Devuelve la clase CSS del badge según el tipo de movimiento
  badgeClass(type: MovementType): string {
    const map: Record<MovementType, string> = {
      ENTRADA: 'badge--entrada',
      SALIDA:  'badge--salida',
      AJUSTE:  'badge--ajuste',
    };
    return map[type];
  }

  // Formatea la fecha ISO a algo legible: "09 mar 2025, 2:30 p.m."
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
