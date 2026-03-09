import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink }                                      from '@angular/router';

import { InventoryService }                         from '../inventory.service';
import { MovementType }                             from '../../../core/models/inventory.model';

// ─── Opciones del select de tipo ─────────────────────────────────────────────
// Array de objetos para mostrar etiquetas legibles en el <select>
// mientras el value sigue siendo el string que el backend espera.

export const MOVEMENT_TYPE_OPTIONS: { value: MovementType; label: string; hint: string }[] = [
  {
    value: 'ENTRADA',
    label: 'Entrada',
    hint:  'Suma unidades al stock (llegó mercancía)',
  },
  {
    value: 'SALIDA',
    label: 'Salida',
    hint:  'Resta unidades del stock (salió mercancía)',
  },
  {
    value: 'AJUSTE',
    label: 'Ajuste',
    hint:  'Establece el stock al valor exacto (corrección física)',
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inventory-form.component.html',
  styleUrl: './inventory-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFormComponent {

  private readonly inventoryService = inject(InventoryService);
  private readonly router           = inject(Router);

  // Opciones del select — accesibles desde el template
  readonly movementTypeOptions = MOVEMENT_TYPE_OPTIONS;

  // ─── Estados reactivos ────────────────────────────────────────────────────
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ─── FormGroup ────────────────────────────────────────────────────────────
  // Cuatro campos — espejo exacto de InventoryMovementCreatePayload.
  //
  // product_id:    número obligatorio (>0). Input type="number" devuelve null
  //                cuando está vacío, por eso es FormControl<number|null>.
  //
  // movement_type: obligatorio. Arranca vacío ('') para forzar al usuario
  //                a escoger explícitamente — evita registrar ENTRADA por accidente.
  //
  // quantity:      número obligatorio, mínimo 1. El backend rechaza 0 con 422.
  //
  // notes:         texto libre opcional, máx 300 chars. Igual que el backend.

  readonly form = new FormGroup({
    product_id:    new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    movement_type: new FormControl<MovementType | ''>('' , [
      Validators.required,
    ]),
    quantity:      new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    notes:         new FormControl<string | null>(null, [
      Validators.maxLength(300),
    ]),
  });

  // ─── Helpers para el template ─────────────────────────────────────────────

  // Devuelve true si el campo fue tocado y tiene error — para mostrar el mensaje
  hasError(field: string, error: string): boolean {
    const control = this.form.get(field);
    return !!(control?.touched && control.hasError(error));
  }

  // Devuelve la descripción (hint) del tipo seleccionado actualmente
  get currentHint(): string {
    const selected = this.movementTypeOptions.find(
      opt => opt.value === this.form.value.movement_type
    );
    return selected?.hint ?? '';
  }

  // ─── Envío del formulario ─────────────────────────────────────────────────

  submit(): void {
    // Marcamos todos los campos como tocados para que aparezcan los errores
    this.form.markAllAsTouched();

    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    const v = this.form.value;

    this.inventoryService.createMovement({
      product_id:    v.product_id!,
      movement_type: v.movement_type as MovementType,
      quantity:      v.quantity!,
      notes:         v.notes || null,
    }).subscribe({
      // Al crear exitosamente, navegamos al detalle del movimiento registrado
      next: (movement) => this.router.navigate(['/inventory', movement.id]),
      error: (err) => {
        // El backend puede responder:
        //   400 → stock insuficiente o producto inactivo (detail en español)
        //   404 → producto no encontrado
        //   422 → validación fallida (no debería pasar si el form es válido)
        this.serverError.set(
          err.error?.detail ?? 'Error al registrar el movimiento.'
        );
        this.isSaving.set(false);
      },
    });
  }
}
