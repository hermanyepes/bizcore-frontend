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

  // Texto que el usuario escribe en el input de type-to-confirm.
  // Se reinicia cada vez que el diálogo se abre (lo hace el template con [ngModel]).
  protected readonly typedText = signal('');

  // El botón "Confirmar" se habilita cuando:
  //   - No hay requiredText (modo normal) → siempre habilitado
  //   - Hay requiredText → solo cuando typedText coincide exactamente
  protected readonly canConfirm = computed(() => {
    const required = this.confirmService.state().requiredText;
    if (!required) return true;
    return this.typedText() === required;
  });

  // Se llama desde el template cuando el diálogo se cierra (overlay o Cancelar).
  // Reinicia el texto para que la próxima apertura empiece limpio.
  protected cancel(): void {
    this.typedText.set('');
    this.confirmService.answer(false);
  }

  // Se llama desde el botón "Confirmar".
  protected confirm(): void {
    if (!this.canConfirm()) return;
    this.typedText.set('');
    this.confirmService.answer(true);
  }
}
