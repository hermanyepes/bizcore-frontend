import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';

// ---------------------------------------------------------------------------
// ModalComponent — contenedor reutilizable para formularios flotantes
//
// ANALOGÍA: una vitrina de vidrio con una puerta y un título en la parte
// superior. La vitrina siempre tiene la misma forma (overlay + tarjeta +
// encabezado + botón X). Lo que hay adentro (el formulario) lo decide quien
// usa el componente, via <ng-content>.
//
// Uso típico en una lista:
//
//   @if (showModal()) {
//     <app-modal title="Nuevo usuario" (close)="showModal.set(false)">
//       <app-user-create-modal (saved)="onUserCreated()" />
//     </app-modal>
//   }
//
// Responsabilidades de este componente:
//   - Dibujar el overlay semitransparente
//   - Dibujar la tarjeta centrada con título y botón X
//   - Emitir (close) cuando el usuario cierra
//   - NO saber nada del contenido — eso es responsabilidad del padre
//
// Posición en el árbol:
//   Vive directamente en la plantilla de cada lista (users-list, products-list,
//   suppliers-list). A diferencia del ConfirmDialog, NO vive en el layout
//   global porque su contenido cambia por módulo.
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-modal',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:     './modal.component.html',
  styleUrl:        './modal.component.scss',
})
export class ModalComponent {

  // Título que aparece en el encabezado de la tarjeta.
  // input() es la nueva API de Angular 17+ — equivale a @Input() pero como Signal.
  // El padre lo pasa así: <app-modal title="Nuevo usuario">
  readonly title = input.required<string>();

  // Evento que el componente emite cuando el usuario INTENTA cerrar el modal.
  // Usamos "closeRequested" en lugar de "close" porque este componente NO decide
  // si puede cerrarse — solo señala la intención. El padre decide qué hacer:
  //   - Si el formulario está limpio → cerrar inmediatamente
  //   - Si el formulario tiene datos → pedir confirmación primero
  // output() es la nueva API equivalente a @Output() + EventEmitter.
  readonly closeRequested = output<void>();

}
