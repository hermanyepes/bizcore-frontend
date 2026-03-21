// ============================================================
// BizCore — Order Form Component
// ============================================================
//
// ANALOGÍA: una orden de pedido en papel con dos partes:
//   Parte 1 — Encabezado: proveedor + notas.
//   Parte 2 — Tabla de productos: filas dinámicas donde cada
//             fila es un producto con su cantidad.
//
// La novedad técnica: FormArray.
// El formulario principal (FormGroup) contiene adentro un
// FormArray — una lista de FormGroups, uno por cada fila
// de producto. El usuario puede agregar y eliminar filas.
//
// Modos:
//   /orders/new       → isEditMode = false → solo CREAR
//   /orders/3/edit    → isEditMode = true  → EDITAR estado + notas
//
// En modo editar los ítems son inmutables (históricos).
// Solo se pueden cambiar status y notes.
// ============================================================

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OrdersService }    from '../orders.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { ProductsService }  from '../../products/products.service';
import { SnackbarService }  from '../../../core/services/snackbar.service';
import { Order, OrderCreate, OrderStatus } from '../order.model';
import { Supplier }         from '../../../core/models/supplier.model';
import { Product }          from '../../../core/models/product.model';
import { CurrencyCopPipe }  from '../../../shared/pipes/currency-cop.pipe';


@Component({
  selector:  'app-order-form',
  standalone: true,
  // Sin OnPush: este componente tiene valores calculados (getProductPrice,
  // getSubtotal, getFormTotal) que dependen de FormControl values dentro de
  // un FormArray. Los FormControls no son Signals, así que OnPush impediría
  // que el template se re-evaluara al seleccionar un producto o cambiar cantidad.
  imports:   [ReactiveFormsModule, RouterLink, CurrencyCopPipe],
  templateUrl:     './order-form.component.html',
  styleUrl:        './order-form.component.scss',
})
export class OrderFormComponent implements OnInit {

  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly ordersService    = inject(OrdersService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly productsService  = inject(ProductsService);
  private readonly snackbarService  = inject(SnackbarService);

  // ----------------------------------------------------------
  // Detección de modo (crear vs editar)
  // ----------------------------------------------------------
  // /orders/new    → get('id') devuelve null  → isEditMode = false
  // /orders/3/edit → get('id') devuelve '3'  → isEditMode = true
  readonly orderId    = this.route.snapshot.paramMap.get('id')
    ? Number(this.route.snapshot.paramMap.get('id'))
    : null;
  readonly isEditMode = this.orderId !== null;

  // ----------------------------------------------------------
  // Estado reactivo de la pantalla
  // ----------------------------------------------------------
  readonly isLoading   = signal(false);
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // Listas para los dropdowns — se cargan al iniciar
  readonly suppliers = signal<Supplier[]>([]);
  readonly products  = signal<Product[]>([]);

  // En modo editar: guardamos el pedido cargado para mostrar
  // los ítems históricos (solo lectura) en el template
  readonly loadedOrder = signal<Order | null>(null);

  // ----------------------------------------------------------
  // FormGroup principal — Parte 1: encabezado
  // ----------------------------------------------------------
  // En modo CREAR: supplier_id + notes + items (FormArray)
  // En modo EDITAR: solo status + notes (ítems son inmutables)
  readonly form = new FormGroup({
    // Parte 1 — encabezado
    supplier_id: new FormControl<number | null>(null, Validators.required),
    notes:       new FormControl<string | null>(null, Validators.maxLength(300)),

    // Parte 2 — tabla de ítems (solo en modo crear)
    // FormArray: lista de FormGroups, uno por fila de producto.
    // Empieza vacío — el usuario agrega filas con addItem().
    items: new FormArray<FormGroup>([]),

    // Solo en modo editar: cambiar el estado del pedido
    status: new FormControl<OrderStatus | null>(null),
  });

  // ----------------------------------------------------------
  // Getter de conveniencia para el FormArray
  // ----------------------------------------------------------
  // Cada vez que escribimos this.items en el .ts, Angular nos
  // da el FormArray ya tipado — sin casteos manuales.
  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  // ----------------------------------------------------------
  // ngOnInit — carga de datos inicial
  // ----------------------------------------------------------
  ngOnInit(): void {
    // Siempre cargamos proveedores y productos para los dropdowns
    this.loadSuppliers();
    this.loadProducts();

    if (this.isEditMode) {
      // En modo editar: cargamos el pedido y ajustamos el form
      this.loadOrder();
    } else {
      // En modo crear: empezamos con una fila vacía por defecto
      // para que el usuario no vea la tabla completamente vacía
      this.addItem();

      // supplier_id y items son obligatorios en modo crear
      // status no se usa en modo crear (el backend lo pone a PENDIENTE)
      this.form.get('status')!.disable();
    }
  }

  // ----------------------------------------------------------
  // loadSuppliers — proveedores activos para el dropdown
  // ----------------------------------------------------------
  private loadSuppliers(): void {
    this.suppliersService.getSuppliers({ page: 1, page_size: 100, is_active: true })
      .subscribe({
        next:  (data) => this.suppliers.set(data.items),
        error: ()     => this.suppliers.set([]),
      });
  }

  // ----------------------------------------------------------
  // loadProducts — productos activos para el dropdown de ítems
  // page_size=100 es el máximo que acepta el backend (le=100 en Query).
  // ----------------------------------------------------------
  private loadProducts(): void {
    this.productsService.getProducts({ page: 1, page_size: 100, is_active: true })
      .subscribe({
        next:  (data) => this.products.set(data.items),
        error: ()     => this.products.set([]),
      });
  }

  // ----------------------------------------------------------
  // loadOrder — carga el pedido en modo editar
  // ----------------------------------------------------------
  private loadOrder(): void {
    this.isLoading.set(true);

    this.ordersService.getOrder(this.orderId!).subscribe({
      next: (order) => {
        // Guardamos el pedido completo para mostrar los ítems históricos
        this.loadedOrder.set(order);

        // Solo pre-poblamos status y notes — ítems son inmutables
        this.form.patchValue({
          notes:  order.notes,
          status: order.status,
        });

        // En modo editar: deshabilitamos supplier_id (no se puede cambiar)
        // e items (no existen filas dinámicas — se muestran en modo lectura)
        this.form.get('supplier_id')!.disable();

        this.isLoading.set(false);
      },
      error: () => {
        this.serverError.set('No se pudo cargar el pedido. Verifica la conexión.');
        this.isLoading.set(false);
      },
    });
  }

  // ----------------------------------------------------------
  // addItem — agrega una fila vacía al FormArray
  // ----------------------------------------------------------
  // Cada fila es un FormGroup con product_id y quantity.
  // El usuario puede agregar tantas filas como quiera.
  addItem(): void {
    const itemGroup = new FormGroup({
      product_id: new FormControl<number | null>(null, Validators.required),
      quantity:   new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(1),
      ]),
    });

    this.items.push(itemGroup);
  }

  // ----------------------------------------------------------
  // removeItem — elimina la fila en el índice dado
  // ----------------------------------------------------------
  // Protección: no permitimos eliminar la última fila.
  // Un pedido debe tener al menos 1 ítem.
  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  // ----------------------------------------------------------
  // getProductPrice — precio del producto seleccionado en una fila
  // ----------------------------------------------------------
  // Busca en la lista ya cargada en memoria — sin llamada HTTP.
  // Se llama desde el template para mostrar el precio unitario
  // en tiempo real cuando el usuario elige un producto.
  getProductPrice(index: number): number | null {
    const productId = this.items.at(index).get('product_id')?.value;
    if (!productId) return null;

    const product = this.products().find(p => p.id === productId);
    return product ? product.price : null;
  }

  // ----------------------------------------------------------
  // getSubtotal — subtotal de una fila (precio × cantidad)
  // ----------------------------------------------------------
  // También se calcula en memoria — el backend lo confirma al crear.
  getSubtotal(index: number): number | null {
    const price    = this.getProductPrice(index);
    const quantity = this.items.at(index).get('quantity')?.value;

    if (price === null || !quantity || quantity < 1) return null;
    return price * quantity;
  }

  // ----------------------------------------------------------
  // getFormTotal — suma de todos los subtotales visibles
  // ----------------------------------------------------------
  getFormTotal(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getSubtotal(i) ?? 0;
    }
    return total;
  }

  // ----------------------------------------------------------
  // save — punto de entrada único, delega según el modo
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // saveCreate — POST /api/v1/orders
  // ----------------------------------------------------------
  private saveCreate(): void {
    const v = this.form.value;

    const payload: OrderCreate = {
      supplier_id: v.supplier_id!,
      notes:       v.notes || null,
      // Mapeamos cada FormGroup del array al formato que espera el backend
      items: (v.items as { product_id: number; quantity: number }[]).map(item => ({
        product_id: item.product_id,
        quantity:   item.quantity,
      })),
    };

    this.ordersService.createOrder(payload).subscribe({
      next:  () => {
        this.snackbarService.show('Pedido creado');
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al crear el pedido.');
        this.isSaving.set(false);
      },
    });
  }

  // ----------------------------------------------------------
  // saveUpdate — PUT /api/v1/orders/{id}
  // ----------------------------------------------------------
  // Solo enviamos status y notes — ítems son inmutables.
  private saveUpdate(): void {
    const v = this.form.value;

    this.ordersService.updateOrder(this.orderId!, {
      status: v.status ?? null,
      notes:  v.notes  || null,
    }).subscribe({
      next:  () => {
        this.snackbarService.show('Pedido actualizado');
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al actualizar el pedido.');
        this.isSaving.set(false);
      },
    });
  }

  // ----------------------------------------------------------
  // Helpers para el template
  // ----------------------------------------------------------

  // Nombre del proveedor del pedido cargado (modo editar)
  getSupplierName(supplierId: number): string {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier ? supplier.name : `#${supplierId}`;
  }

  // Nombre del producto dado su id (para la tabla histórica en modo editar)
  getProductName(productId: number): string {
    const product = this.products().find(p => p.id === productId);
    return product ? product.name : `#${productId}`;
  }

  // Total del pedido cargado en modo editar (suma de subtotales históricos)
  getLoadedOrderTotal(): number {
    const order = this.loadedOrder();
    if (!order) return 0;
    return order.items.reduce((acc, item) => acc + item.subtotal, 0);
  }

}
