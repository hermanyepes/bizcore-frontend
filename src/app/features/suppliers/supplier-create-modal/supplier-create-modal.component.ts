import {
  Component,
  inject,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { SuppliersService, SupplierCreatePayload } from '../suppliers.service';

// ---------------------------------------------------------------------------
// SupplierCreateModalComponent — formulario de CREACIÓN de proveedor para modal
//
// Mismo patrón que UserCreateModalComponent y ProductCreateModalComponent.
//
// Campos incluidos:
//   name          — obligatorio, máx. 150 caracteres
//   contact_email — opcional, validación de formato email
//   phone         — opcional
//   address       — opcional
//
// Campos EXCLUIDOS:
//   is_active — el backend crea el proveedor activo por defecto
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-supplier-create-modal',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [ReactiveFormsModule],
  templateUrl:     './supplier-create-modal.component.html',
  styleUrl:        './supplier-create-modal.component.scss',
})
export class SupplierCreateModalComponent {

  private readonly suppliersService = inject(SuppliersService);

  // ── Output ────────────────────────────────────────────────────────────────
  readonly saved = output<void>();

  // ── Estados reactivos ─────────────────────────────────────────────────────
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ── FormGroup ─────────────────────────────────────────────────────────────
  readonly form = new FormGroup({
    name:          new FormControl('',   [Validators.required, Validators.maxLength(150)]),
    contact_email: new FormControl<string | null>(null, [Validators.email]),
    phone:         new FormControl<string | null>(null),
    address:       new FormControl<string | null>(null),
  });

  // ── save ──────────────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    const v = this.form.value;

    const payload: SupplierCreatePayload = {
      name:          v.name!,
      contact_email: v.contact_email || null,
      phone:         v.phone         || null,
      address:       v.address       || null,
    };

    this.suppliersService.create(payload).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al crear el proveedor.');
        this.isSaving.set(false);
      },
    });
  }
}
