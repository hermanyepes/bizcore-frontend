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

import { ProductsService, ProductCreatePayload, PRODUCT_CATEGORIES } from '../products.service';

// ---------------------------------------------------------------------------
// ProductCreateModalComponent — formulario de CREACIÓN de producto para modal
//
// Mismo patrón que UserCreateModalComponent:
//   - Sin router: no lee URL, no navega
//   - Sin snackbar: el padre lo maneja
//   - Emite output() saved cuando el backend confirma la creación
//
// Campos incluidos (solo creación):
//   name        — obligatorio
//   description — opcional, textarea
//   price       — obligatorio, > 0
//   category    — opcional, lista predefinida
//
// Campos EXCLUIDOS deliberadamente:
//   stock     — solo se modifica desde el módulo de Inventario
//   is_active — el backend crea el producto activo por defecto
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-product-create-modal',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [ReactiveFormsModule],
  templateUrl:     './product-create-modal.component.html',
  styleUrl:        './product-create-modal.component.scss',
})
export class ProductCreateModalComponent {

  private readonly productsService = inject(ProductsService);

  // Categorías disponibles — se usan en el <select> del template
  readonly categories = PRODUCT_CATEGORIES;

  // ── Output — señal al padre de que la creación fue exitosa ────────────────
  readonly saved = output<void>();

  // ── Estados reactivos ─────────────────────────────────────────────────────
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ── FormGroup ─────────────────────────────────────────────────────────────
  // No necesita ngOnInit porque todos los validators son estáticos —
  // no hay modo editar que requiera habilitar/deshabilitar campos.
  readonly form = new FormGroup({
    name:        new FormControl('',   [Validators.required, Validators.maxLength(120)]),
    description: new FormControl<string | null>(null),
    price:       new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    category:    new FormControl<string | null>(null),
  });

  // ── save ──────────────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    const v = this.form.value;

    const payload: ProductCreatePayload = {
      name:        v.name!,
      description: v.description || null,
      price:       v.price!,
      category:    v.category    || null,
    };

    this.productsService.createProduct(payload).subscribe({
      next: () => {
        // El padre cierra el modal, muestra el snackbar y recarga la lista
        this.saved.emit();
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al crear el producto.');
        this.isSaving.set(false);
      },
    });
  }
}
