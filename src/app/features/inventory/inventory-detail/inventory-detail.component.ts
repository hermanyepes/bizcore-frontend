import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { InventoryService }          from '../inventory.service';
import { InventoryMovement, MovementType } from '../../../core/models/inventory.model';

// ─── Estado de carga ──────────────────────────────────────────────────────────
type LoadState = 'loading' | 'loaded' | 'error' | 'not-found';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailComponent implements OnInit {

  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly inventoryService = inject(InventoryService);

  // ─── Estado ───────────────────────────────────────────────────────────────
  readonly loadState = signal<LoadState>('loading');
  readonly movement  = signal<InventoryMovement | null>(null);

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void {
    // El id llega como string en la URL — lo convertimos a número.
    // Si no existe o no es un número válido, volvemos al listado.
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.router.navigate(['/inventory']);
      return;
    }

    this.inventoryService.getMovement(id).subscribe({
      next: (data) => {
        this.movement.set(data);
        this.loadState.set('loaded');
      },
      error: (err) => {
        // 404 → el movimiento no existe; cualquier otro error → fallo genérico
        if (err.status === 404) {
          this.loadState.set('not-found');
        } else {
          this.loadState.set('error');
        }
      },
    });
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

  // Texto legible para cada tipo de movimiento
  movementLabel(type: MovementType): string {
    const map: Record<MovementType, string> = {
      ENTRADA: 'Entrada de stock',
      SALIDA:  'Salida de stock',
      AJUSTE:  'Ajuste de inventario',
    };
    return map[type];
  }
}
