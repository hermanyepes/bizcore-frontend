import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { SnackbarService, SnackbarType } from '../../services/snackbar.service';

// ---------------------------------------------------------------------------
// SnackbarComponent
//
// ANALOGÍA: pantalla de un almacén que muestra lo que hay escrito en el
// tablero (SnackbarService). No decide nada — solo lee y renderiza.
//
// Posición en el árbol de componentes:
//   layout.component.html → <app-snackbar />  (fuera del router-outlet)
//
// Al vivir fuera del router-outlet, el snackbar persiste aunque el usuario
// navegue de página. Por eso un formulario puede:
//   1. Mostrar el snackbar  ("Producto creado ✓")
//   2. Navegar a la lista
//   ...y el snackbar sigue visible en la lista durante 3.5 segundos.
// ---------------------------------------------------------------------------
@Component({
  selector:        'app-snackbar',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:     './snackbar.component.html',
  styleUrl:        './snackbar.component.scss',
})
export class SnackbarComponent {

  // El servicio es singleton — es el mismo objeto que el formulario usó
  // para llamar show(). El Signal que exponemos aquí es el mismo que cambió.
  protected readonly snackbarService = inject(SnackbarService);

  // ---------------------------------------------------------------------------
  // iconFor() — icono visual según el tipo de snackbar
  //
  // Se llama desde el template con el tipo del estado actual.
  // Devuelve un carácter Unicode — sin librerías de iconos extra.
  // ---------------------------------------------------------------------------
  iconFor(type: SnackbarType): string {
    const icons: Record<SnackbarType, string> = {
      success: '✓',
      error:   '✕',
      info:    'ℹ',
    };
    return icons[type];
  }
}
