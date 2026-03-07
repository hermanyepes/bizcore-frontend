import { Component, inject, signal, OnInit }          from '@angular/core';
import { FormGroup, FormControl, Validators,
         ReactiveFormsModule }                         from '@angular/forms';
import { ActivatedRoute, Router, RouterLink }          from '@angular/router';

import { ProductsService, ProductCreatePayload,
         ProductUpdatePayload, PRODUCT_CATEGORIES }    from '../products.service';

// ---------------------------------------------------------------------------
// ProductFormComponent — mismo patrón dual que UserFormComponent:
//
//   /products/new        → isEditMode = false → CREAR
//   /products/42/edit    → isEditMode = true  → EDITAR
//
// Diferencias clave respecto a UserFormComponent:
//
//   1. id es número — se lee con Number(paramMap.get('id'))
//   2. price es FormControl<number|null> — el backend espera entero, no string
//   3. stock es siempre disabled — solo se modifica desde el módulo Inventario
//   4. category es un <select> con opciones fijas (PRODUCT_CATEGORIES)
//   5. No hay document_id, document_type, email, password — el form es más simple
// ---------------------------------------------------------------------------

@Component({
  selector:    'app-product-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl:    './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {

  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly productsService = inject(ProductsService);

  // Categorías disponibles — se usan para poblar el <select> del template
  readonly categories = PRODUCT_CATEGORIES;

  // ---------------------------------------------------------------------------
  // Detección de modo — igual que UserFormComponent pero con Number()
  // ---------------------------------------------------------------------------
  readonly productId  = this.route.snapshot.paramMap.get('id')
    ? Number(this.route.snapshot.paramMap.get('id'))
    : null;
  readonly isEditMode = this.productId !== null;

  // Estados reactivos
  readonly isLoading   = signal(false);
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // FormGroup
  //
  // price: FormControl<number|null> — no string. Cuando el input type="number"
  //   está vacío devuelve null; cuando tiene valor devuelve un número.
  //   Validators.min(1) rechaza precios de 0 o negativos (igual que el backend).
  //
  // stock: disabled desde el inicio — se construye deshabilitado y nunca
  //   se habilita. form.value no lo incluye; se muestra como campo informativo.
  //
  // is_active: solo relevante en modo editar. Al crear, el backend
  //   siempre lo pone en true.
  // ---------------------------------------------------------------------------
  readonly form = new FormGroup({
    name:        new FormControl('',                    [Validators.required, Validators.maxLength(120)]),
    description: new FormControl<string | null>(null,  [Validators.maxLength(500)]),
    price:       new FormControl<number | null>(null,  [Validators.required, Validators.min(1)]),
    stock:       new FormControl({ value: 0, disabled: true }),
    category:    new FormControl<string | null>(null),
    is_active:   new FormControl(true),
  });

  ngOnInit(): void {
    if (this.isEditMode) {
      this.loadProduct();
    }
    // En modo crear no hay configuración adicional:
    // stock ya nace deshabilitado, price ya tiene Validators.required
  }

  // ---------------------------------------------------------------------------
  // loadProduct — carga datos del producto para pre-poblar el form (modo editar)
  // ---------------------------------------------------------------------------
  private loadProduct(): void {
    this.isLoading.set(true);

    this.productsService.getProduct(this.productId!).subscribe({
      next: (product) => {
        this.form.patchValue({
          name:        product.name,
          description: product.description,
          price:       product.price,
          stock:       product.stock,    // se muestra en el campo disabled
          category:    product.category,
          is_active:   product.is_active,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.serverError.set('No se pudo cargar el producto. Verifica la conexión.');
        this.isLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // save — mismo patrón que UserFormComponent
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

    const payload: ProductCreatePayload = {
      name:        v.name!,
      description: v.description || null,
      price:       v.price!,
      category:    v.category    || null,
    };

    this.productsService.createProduct(payload).subscribe({
      // Al crear, el backend devuelve el Product con su id generado.
      // Navegamos al detalle del producto recién creado.
      next:  (product) => this.router.navigate(['/products', product.id]),
      error: (err)     => {
        this.serverError.set(err.error?.detail ?? 'Error al crear el producto.');
        this.isSaving.set(false);
      },
    });
  }

  private saveUpdate(): void {
    const v = this.form.value;

    const payload: ProductUpdatePayload = {
      name:        v.name        || null,
      description: v.description || null,
      price:       v.price       ?? null,
      category:    v.category    || null,
      is_active:   v.is_active   ?? null,
    };

    this.productsService.updateProduct(this.productId!, payload).subscribe({
      next:  ()    => this.router.navigate(['/products', this.productId]),
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al actualizar el producto.');
        this.isSaving.set(false);
      },
    });
  }
}
