import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormControl, Validators,
         ReactiveFormsModule }                         from '@angular/forms';
import { ActivatedRoute, Router, RouterLink }          from '@angular/router';

import { SuppliersService, SupplierCreatePayload,
         SupplierUpdatePayload }                       from '../suppliers.service';
import { SnackbarService }                            from '../../../core/services/snackbar.service';
import { nitValidator }                               from '../../../shared/validators/nit.validator';

// ---------------------------------------------------------------------------
// SupplierFormComponent — mismo patrón dual que ProductFormComponent:
//
//   /suppliers/new       → isEditMode = false → CREAR
//   /suppliers/3/edit    → isEditMode = true  → EDITAR
//
// Diferencias clave respecto a ProductFormComponent:
//
//   1. No hay price ni stock — los proveedores no tienen precio propio.
//   2. No hay category — los proveedores no se categorizan en BizCore.
//   3. contact_email usa Validators.email (formato), pero NO required.
//      Un proveedor puede no tener email registrado.
//   4. Después de crear O editar, volvemos a la lista (/suppliers).
//      No hay detail page para proveedores.
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-supplier-form',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [ReactiveFormsModule, RouterLink],
  templateUrl:     './supplier-form.component.html',
  styleUrl:        './supplier-form.component.scss',
})
export class SupplierFormComponent implements OnInit {

  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly suppliersService = inject(SuppliersService);
  private readonly snackbarService  = inject(SnackbarService);

  // ---------------------------------------------------------------------------
  // Detección de modo
  //
  // La URL /suppliers/3/edit tiene el parámetro :id = "3".
  // URL params son siempre strings → Number() lo convierte a entero.
  // La URL /suppliers/new no tiene :id → get('id') devuelve null → modo crear.
  // ---------------------------------------------------------------------------
  readonly supplierId = this.route.snapshot.paramMap.get('id')
    ? Number(this.route.snapshot.paramMap.get('id'))
    : null;
  readonly isEditMode = this.supplierId !== null;

  // Estados reactivos de la pantalla
  readonly isLoading   = signal(false);
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // FormGroup
  //
  // name:          obligatorio, máx 150 chars (igual que el backend).
  // contact_email: opcional pero validado si tiene contenido. Validators.email
  //                valida el formato "alguien@dominio.com" solo cuando el campo
  //                no está vacío — si está vacío, lo considera válido.
  // phone:         opcional, máx 20 chars. String, no number (nadie suma teléfonos).
  // address:       opcional, máx 255 chars.
  // is_active:     solo relevante en modo editar; al crear siempre empieza en true.
  // ---------------------------------------------------------------------------
  readonly form = new FormGroup({
    name:          new FormControl('',                    [Validators.required, Validators.maxLength(150)]),
    contact_email: new FormControl<string | null>(null,  [Validators.email,    Validators.maxLength(100)]),
    phone:         new FormControl<string | null>(null,  [Validators.maxLength(20)]),
    address:       new FormControl<string | null>(null,  [Validators.maxLength(255)]),
    nit:           new FormControl<string | null>(null,  [Validators.maxLength(15), nitValidator()]),
    is_active:     new FormControl(true),
  });

  ngOnInit(): void {
    if (this.isEditMode) {
      this.loadSupplier();
    }
    // En modo crear no hay configuración adicional:
    // el form ya tiene los defaults correctos.
  }

  // ---------------------------------------------------------------------------
  // loadSupplier — pre-pobla el form con los datos actuales (modo editar)
  // ---------------------------------------------------------------------------
  private loadSupplier(): void {
    this.isLoading.set(true);

    this.suppliersService.getOne(this.supplierId!).subscribe({
      next: (supplier) => {
        this.form.patchValue({
          name:          supplier.name,
          contact_email: supplier.contact_email,
          phone:         supplier.phone,
          address:       supplier.address,
          nit:           supplier.nit,
          is_active:     supplier.is_active,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.serverError.set('No se pudo cargar el proveedor. Verifica la conexión.');
        this.isLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // save — punto de entrada único. Delega según el modo.
  // ---------------------------------------------------------------------------
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    if (this.isEditMode) {
      this.saveUpdate();
    } else {
      this.saveCreate();
    }
  }

  private saveCreate(): void {
    const v = this.form.value;

    // String vacío ('') → null para respetar el unique=True del backend.
    // Dos proveedores con email '' romperían la restricción de unicidad.
    const payload: SupplierCreatePayload = {
      name:          v.name!,
      contact_email: v.contact_email || null,
      phone:         v.phone         || null,
      address:       v.address       || null,
      nit:           v.nit           || null,
    };

    this.suppliersService.create(payload).subscribe({
      next:  () => {
        this.snackbarService.show('Proveedor creado');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al crear el proveedor.');
        this.isSaving.set(false);
      },
    });
  }

  private saveUpdate(): void {
    const v = this.form.value;

    const payload: SupplierUpdatePayload = {
      name:          v.name          || null,
      contact_email: v.contact_email || null,
      phone:         v.phone         || null,
      address:       v.address       || null,
      nit:           v.nit           || null,
      is_active:     v.is_active     ?? null,
    };

    this.suppliersService.update(this.supplierId!, payload).subscribe({
      next:  () => {
        this.snackbarService.show('Proveedor actualizado');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al actualizar el proveedor.');
        this.isSaving.set(false);
      },
    });
  }
}
