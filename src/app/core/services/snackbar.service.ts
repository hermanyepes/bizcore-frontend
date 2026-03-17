import { Injectable, signal } from '@angular/core';

// ---------------------------------------------------------------------------
// Tipos públicos — exportados para que el componente y los módulos los usen
// sin importar rutas largas.
//
// SnackbarType controla el color y el icono del snackbar:
//   'success' → verde (operación exitosa)
//   'error'   → rojo  (algo salió mal)
//   'info'    → azul  (información neutral)
// ---------------------------------------------------------------------------
export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarState {
  message: string;
  type:    SnackbarType;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// SnackbarService
//
// ANALOGÍA: tablero de pedidos de restaurante con borrador automático.
//   - state Signal = el letrero actual (qué dice, de qué color, si está visible).
//   - show()       = poner un nuevo letrero y arrancar el borrador automático.
//   - _timer       = referencia al borrador para poder cancelarlo si llega
//                    un segundo pedido antes de que el primero se borre.
//
// Es un singleton (providedIn: 'root') igual que LoadingService.
// Cualquier módulo puede inyectarlo y llamar show() — el componente en el
// layout lo lee y muestra el snackbar automáticamente.
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SnackbarService {

  // ── Estado público ─────────────────────────────────────────────────────────
  // El componente SnackbarComponent lee este signal para decidir si renderizar
  // y con qué contenido. Arranca invisible y vacío.
  readonly state = signal<SnackbarState>({
    message: '',
    type:    'success',
    visible: false,
  });

  // ── Timer privado ──────────────────────────────────────────────────────────
  // Guardamos la referencia del setTimeout para poder cancelarlo.
  // Es null cuando no hay ningún snackbar activo.
  // ReturnType<typeof setTimeout> es el tipo correcto en Node y en el browser
  // sin necesidad de castear a 'any' ni a 'number'.
  private _timer: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------------------
  // show() — muestra un snackbar con mensaje, tipo y duración configurables
  //
  // Parámetros:
  //   message  — el texto que verá el usuario
  //   type     — 'success' | 'error' | 'info'  (default: 'success')
  //   duration — milisegundos antes de auto-ocultar  (default: 3500)
  //
  // Flujo:
  //   1. Cancela el timer anterior (si existía) para no borrar el nuevo
  //      snackbar antes de tiempo.
  //   2. Pone el estado en visible=true con el mensaje y tipo recibidos.
  //   3. Arranca un nuevo timer que apagará el snackbar pasado `duration` ms.
  // ---------------------------------------------------------------------------
  show(
    message:  string,
    type:     SnackbarType = 'success',
    duration: number       = 3500,
  ): void {
    // Paso 1: cancela el borrador anterior
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    // Paso 2: muestra el nuevo snackbar
    this.state.set({ message, type, visible: true });

    // Paso 3: programa el borrado automático
    this._timer = setTimeout(() => {
      // update() preserva el mensaje y el tipo — solo cambia visible.
      // Así el componente no hace un "parpadeo" mientras desaparece.
      this.state.update(s => ({ ...s, visible: false }));
      this._timer = null;
    }, duration);
  }
}
