import { Injectable, signal } from '@angular/core';

// ---------------------------------------------------------------------------
// ConfirmDialogState — lo que el componente necesita para renderizar el diálogo
//
// message:      el mensaje a mostrar al usuario.
// visible:      si el diálogo debe estar en el DOM.
// requiredText: si está definido, el usuario debe escribir exactamente este
//               texto para que el botón "Confirmar" se habilite.
//               Patrón GitHub para borrar repos o desactivar usuarios activos.
// ---------------------------------------------------------------------------
interface ConfirmDialogState {
  message: string;
  visible: boolean;
  requiredText?: string;
}

// ---------------------------------------------------------------------------
// ConfirmDialogService
//
// ANALOGÍA: el notario que muestra el documento y espera la firma.
//   confirm(message) = "aquí está el documento, espero tu firma"
//                      devuelve una Promise que pausa al código que la llama
//   answer(confirmed) = "firmé / no firmé"
//                       resuelve la Promise y cierra el diálogo
//
// Flujo de uso en un componente de lista:
//
//   const ok = await this.confirmService.confirm('¿Desactivar proveedor?');
//   if (!ok) return;
//   this.suppliersService.updateSupplier(...).subscribe(...);
//
// El código espera en el 'await' hasta que el usuario haga clic en
// Confirmar o Cancelar en el ConfirmDialogComponent.
//
// Por qué el resolver no está en el Signal:
//   Los Signals están pensados para datos que el template lee y renderiza.
//   Una función (el resolver) no es un dato renderizable — meterla en el Signal
//   complicaría el tipado y podría causar problemas en SSR y DevTools.
//   Por eso el resolver vive en una variable privada normal (_resolve).
// ---------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {

  // ── Estado público — lo que el componente renderiza ────────────────────────
  readonly state = signal<ConfirmDialogState>({
    message: '',
    visible: false,
  });

  // ── Resolver privado — la "firma pendiente" ────────────────────────────────
  // Guardamos aquí la función resolve() de la Promise activa.
  // answer() la llama cuando el usuario responde.
  // null = no hay diálogo abierto ahora mismo.
  private _resolve: ((confirmed: boolean) => void) | null = null;

  // ---------------------------------------------------------------------------
  // confirm() — muestra el diálogo y devuelve una Promise que se resolverá
  //             cuando el usuario haga clic en Confirmar o Cancelar.
  //
  // requiredText (opcional): si se pasa, el botón "Confirmar" queda
  //   deshabilitado hasta que el usuario escriba exactamente ese texto.
  //   Patrón GitHub — usado en acciones destructivas críticas como
  //   desactivar un usuario activo o eliminar permanentemente un recurso.
  //
  // Cómo funciona la Promise con resolver externo:
  //
  //   new Promise(resolve => { this._resolve = resolve; })
  //
  //   El constructor de Promise recibe una función que se ejecuta
  //   INMEDIATAMENTE y recibe como argumento el 'resolve' — la función
  //   que le dice a la Promise cuál es su valor final.
  //   En lugar de llamar resolve() ahora, la guardamos en _resolve para
  //   llamarla más tarde, desde answer().
  //
  //   La Promise queda "en espera" hasta que alguien llame _resolve(true/false).
  // ---------------------------------------------------------------------------
  confirm(message: string, requiredText?: string): Promise<boolean> {
    this.state.set({ message, visible: true, requiredText });

    return new Promise<boolean>(resolve => {
      this._resolve = resolve;
    });
  }

  // ---------------------------------------------------------------------------
  // answer() — resuelve la Promise con el valor que el usuario eligió.
  //
  // Lo llama ConfirmDialogComponent cuando el usuario hace clic en
  // "Confirmar" (confirmed=true) o "Cancelar" (confirmed=false).
  //
  // Pasos:
  //   1. Cierra el diálogo (visible=false)
  //   2. Llama al resolver con el valor → la Promise se resuelve
  //   3. Limpia el resolver para evitar llamadas dobles
  // ---------------------------------------------------------------------------
  answer(confirmed: boolean): void {
    // Paso 1: cierra el diálogo y limpia el texto requerido
    this.state.update(s => ({ ...s, visible: false, requiredText: undefined }));

    // Paso 2: resuelve la Promise — el código que hizo 'await confirm()' continúa
    this._resolve?.(confirmed);

    // Paso 3: limpia el resolver — null indica que no hay diálogo activo
    this._resolve = null;
  }
}
