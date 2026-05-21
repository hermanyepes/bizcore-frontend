import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
// Estructura visual — modo normal:
//   ┌─────────── dialog ───────────┐
//   │  "¿Desactivar proveedor X?"  │
//   │  [Cancelar]  [Confirmar]     │
//   └──────────────────────────────┘
//
// Estructura visual — modo type-to-confirm (requiredText definido):
//   ┌─────────────────────────────────────┐
//   │  "¿Eliminar a Juan Pérez?"          │
//   │  Escribe "Juan Pérez" para confirmar│
//   │  [___________________]              │
//   │  [Cancelar]  [Confirmar ←disabled]  │
//   └─────────────────────────────────────┘
//
// El overlay tiene z-index 10000 — encima del spinner (9999) y del snackbar
// (9000). Cuando hay un diálogo de confirmación, el usuario no puede hacer
// otra acción hasta que responda.
// ---------------------------------------------------------------------------
@Component({
  selector:        'app-confirm-dialog',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [FormsModule],
  templateUrl:     './confirm-dialog.component.html',
  styleUrl:        './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {

  // El mismo servicio que el componente de lista inyecta para llamar confirm().
  // Es un singleton: ambos apuntan al mismo objeto en memoria.
  protected readonly confirmService = inject(ConfirmDialogService);

  // Texto del input en modo type-to-confirm.
  protected readonly typedText  = signal('');

  // Texto del textarea en modo reason-input.
  protected readonly reasonText = signal('');

  // El botón "Confirmar" se habilita según el modo activo:
  //   - Modo normal      → siempre habilitado
  //   - type-to-confirm  → solo cuando typedText coincide exactamente
  //   - reason-input     → solo cuando reasonText tiene al menos un carácter
  protected readonly canConfirm = computed(() => {
    const state = this.confirmService.state();
    if (state.requiredText) return this.typedText() === state.requiredText;
    if (state.reasonInput)  return !!this.reasonText().trim();
    return true;
  });

  // Cancelar — cierra el diálogo según el modo activo y limpia los campos.
  protected cancel(): void {
    const hasReason = !!this.confirmService.state().reasonInput;
    this.typedText.set('');
    this.reasonText.set('');
    if (hasReason) {
      this.confirmService.answerWithReason(null);
    } else {
      this.confirmService.answer(false);
    }
  }

  // Confirmar — resuelve la Promise según el modo activo.
  protected confirm(): void {
    if (!this.canConfirm()) return;
    const state  = this.confirmService.state();
    const reason = this.reasonText();
    this.typedText.set('');
    this.reasonText.set('');
    if (state.reasonInput) {
      this.confirmService.answerWithReason(reason);
    } else {
      this.confirmService.answer(true);
    }
  }
}
