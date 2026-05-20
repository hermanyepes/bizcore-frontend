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
// El campo `status` es un selector de transición: muestra solo
// los estados válidos desde el estado actual (máquina de estados).
// ============================================================

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OrdersService }    from '../orders.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { ProductsService }  from '../../products/products.service';
import { SnackbarService }      from '../../../core/services/snackbar.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Order, OrderCreate, OrderStatus } from '../order.model';
import { Supplier }         from '../../../core/models/supplier.model';
import { Product }          from '../../../core/models/product.model';
import { CurrencyCopPipe }  from '../../../shared/pipes/currency-cop.pipe';


// ------------------------------------------------------------
// Validator a nivel de FormGroup:
// cancel_reason es obligatorio cuando el nuevo status = CANCELADA.
// Al estar fuera de la clase, no depende de `this` ni de Angular DI.
// ------------------------------------------------------------
function requireCancelReason(group: AbstractControl): ValidationErrors | null {
  const status       = group.get('status')?.value;
  const cancelReason = group.get('cancel_reason')?.value;
  if (status === 'CANCELADA' && !cancelReason?.trim()) {
    return { cancelReasonRequired: true };
  }
  return null;
}


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
  private readonly confirmService   = inject(ConfirmDialogService);

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
  // FormGroup principal
  // ----------------------------------------------------------
  // La segunda opción de FormGroup acepta validadores a nivel de grupo.
  // requireCancelReason dispara error 'cancelReasonRequired' cuando
  // el usuario elige CANCELADA sin llenar cancel_reason.
  readonly form = new FormGroup({
    supplier_id:   new FormControl<number | null>(null, Validators.required),
    notes:         new FormControl<string | null>(null, Validators.maxLength(300)),
    items:         new FormArray<FormGroup>([]),
    // Selector de transición en modo editar — empieza en null
    // (el usuario debe elegir explícitamente adónde transitar)
    status:        new FormControl<OrderStatus | null>(null),
    cancel_reason: new FormControl<string | null>(null),
  }, { validators: requireCancelReason });

  // ----------------------------------------------------------
  // Getter de conveniencia para el FormArray
  // ----------------------------------------------------------
  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  // ----------------------------------------------------------
  // availableStatusOptions — transiciones válidas desde el estado actual
  // ----------------------------------------------------------
  // El usuario solo ve las opciones a las que puede ir desde el estado
  // actual del pedido. Nunca aparece PENDIENTE (no hay retorno).
  get availableStatusOptions(): { value: OrderStatus; label: string }[] {
    const order = this.loadedOrder();
    if (!order) return [];

    const map: Partial<Record<OrderStatus, { value: OrderStatus; label: string }[]>> = {
      'PENDIENTE': [
        { value: 'APROBADA',  label: 'Aprobar pedido' },
        { value: 'CANCELADA', label: 'Cancelar pedido' },
      ],
      'APROBADA': [
        { value: 'ENTREGADA', label: 'Marcar como entregada' },
        { value: 'CANCELADA', label: 'Cancelar pedido' },
      ],
    };
    return map[order.status] ?? [];
  }

  // ----------------------------------------------------------
  // isTerminalState — ENTREGADA y CANCELADA no admiten más cambios
  // ----------------------------------------------------------
  get isTerminalState(): boolean {
    const order = this.loadedOrder();
    return order?.status === 'ENTREGADA' || order?.status === 'CANCELADA';
  }

  // ----------------------------------------------------------
  // ngOnInit — carga de datos inicial
  // ----------------------------------------------------------
  ngOnInit(): void {
    this.loadSuppliers();
    this.loadProducts();

    if (this.isEditMode) {
      this.loadOrder();
    } else {
      // En modo crear: fila vacía por defecto
      this.addItem();
      // status y cancel_reason no se usan al crear (el backend asigna PENDIENTE)
      this.form.get('status')!.disable();
      this.form.get('cancel_reason')!.disable();
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
  // page_size=100 es el máximo que acepta el backend.
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
        this.loadedOrder.set(order);

        // Solo pre-poblamos notes. El campo status es un selector de
        // TRANSICIÓN, no refleja el estado actual — el usuario elige
        // adónde quiere moverse desde availableStatusOptions.
        this.form.patchValue({ notes: order.notes });

        // supplier_id es inmutable en edición
        this.form.get('supplier_id')!.disable();

        // En estado terminal deshabilitamos también el selector de transición
        if (order.status === 'ENTREGADA' || order.status === 'CANCELADA') {
          this.form.get('status')!.disable();
          this.form.get('cancel_reason')!.disable();
        }

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
  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  // ----------------------------------------------------------
  // getProductPrice — precio del producto seleccionado en una fila
  // ----------------------------------------------------------
  getProductPrice(index: number): number | null {
    const productId = this.items.at(index).get('product_id')?.value;
    if (!productId) return null;

    const product = this.products().find(p => p.id === productId);
    return product ? product.price : null;
  }

  // ----------------------------------------------------------
  // getSubtotal — subtotal de una fila (precio × cantidad)
  // ----------------------------------------------------------
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
  // save — punto de entrada único, delega según el modo.
  // Si el nuevo estado es CANCELADA, pide confirmación antes
  // de ejecutar para evitar cancelaciones accidentales.
  // ----------------------------------------------------------
  async save(): Promise<void> {
    if (this.form.invalid || this.isSaving()) return;

    const newStatus = this.form.value.status as OrderStatus | null | undefined;

    if (this.isEditMode && newStatus === 'CANCELADA') {
      const order = this.loadedOrder();
      const orderLabel = order ? `pedido #${order.id}` : 'este pedido';
      const confirmed = await this.confirmService.confirm(
        `Vas a cancelar el ${orderLabel}. Esta acción no se puede deshacer. ¿Continuar?`
      );
      if (!confirmed) return;
    }

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
  // saveUpdate — modo editar
  // ----------------------------------------------------------
  // Si el usuario eligió una transición → PUT /{id}/status (máquina de estados).
  // Si solo actualizó notas sin cambiar estado → PUT /{id} (legacy, solo notes).
  private saveUpdate(): void {
    const v         = this.form.value;
    const newStatus = v.status as OrderStatus | null | undefined;

    if (newStatus) {
      // Cambio de estado — endpoint de máquina de estados
      const cancelReason = newStatus === 'CANCELADA' ? (v.cancel_reason || null) : null;

      this.ordersService.updateStatus(this.orderId!, newStatus, cancelReason).subscribe({
        next:  () => {
          this.snackbarService.show('Pedido actualizado');
          this.router.navigate(['/orders']);
        },
        error: (err) => {
          this.serverError.set(err.error?.detail ?? 'Error al actualizar el pedido.');
          this.isSaving.set(false);
        },
      });
    } else {
      // Solo notas — endpoint legacy (sin cambio de estado)
      this.ordersService.updateOrder(this.orderId!, {
        notes: v.notes || null,
      }).subscribe({
        next:  () => {
          this.snackbarService.show('Notas actualizadas');
          this.router.navigate(['/orders']);
        },
        error: (err) => {
          this.serverError.set(err.error?.detail ?? 'Error al actualizar el pedido.');
          this.isSaving.set(false);
        },
      });
    }
  }

  // ----------------------------------------------------------
  // Helpers para el template
  // ----------------------------------------------------------

  getSupplierName(supplierId: number): string {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier ? supplier.name : `#${supplierId}`;
  }

  getProductName(productId: number): string {
    const product = this.products().find(p => p.id === productId);
    return product ? product.name : `#${productId}`;
  }

  getLoadedOrderTotal(): number {
    const order = this.loadedOrder();
    if (!order) return 0;
    return order.items.reduce((acc, item) => acc + item.subtotal, 0);
  }

}
