import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ConfirmDialogService } from '../../services/confirm-dialog.service';

// ---------------------------------------------------------------------------
// ConfirmDialogComponent
//
// ANALOGÍA: la ventana física del notario. El servicio decide cuándo abrirla
// y qué texto pone adentro. Este componente solo la dibuja y conecta los
// dos botones con answer(true) y answer(false).
//
// Posición en el árbol de componentes:
//   layout.component.html → <app-confirm-dialog />  (fuera del router-outlet)
//
// Estructura visual:
//   ┌─────────────────── overlay (fondo oscuro, full-screen) ──────────────┐
//   │                                                                       │
//   │          ┌─────────── dialog (tarjeta centrada) ───────────┐         │
//   │          │  "¿Desactivar a Distribuidora Colombia?"        │         │
//   │          │                                                 │         │
//   │          │        [Cancelar]    [Confirmar]                │         │
//   │          └─────────────────────────────────────────────────┘         │
//   │                                                                       │
//   └───────────────────────────────────────────────────────────────────────┘
//
// El overlay tiene z-index 10000 — encima del spinner (9999) y del snackbar
// (9000). Cuando hay un diálogo de confirmación, el usuario no puede hacer
// otra acción hasta que responda.
// ---------------------------------------------------------------------------
@Component({
  selector:        'app-confirm-dialog',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:     './confirm-dialog.component.html',
  styleUrl:        './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {

  // El mismo servicio que el componente de lista inyecta para llamar confirm().
  // Es un singleton: ambos apuntan al mismo objeto en memoria.
  protected readonly confirmService = inject(ConfirmDialogService);
}
