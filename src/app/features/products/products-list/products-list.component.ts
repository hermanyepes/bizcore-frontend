import { Component, inject, signal, computed } from '@angular/core';
import { toSignal }                            from '@angular/core/rxjs-interop';
import { toObservable }                        from '@angular/core/rxjs-interop';
import { RouterLink }                          from '@angular/router';
import { switchMap }                           from 'rxjs/operators';

import { ProductsService, ProductListParams, PRODUCT_CATEGORIES } from '../products.service';
import { Product }                                                 from '../../../core/models/product.model';

@Component({
  selector:    'app-products-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './products-list.component.html',
  styleUrl:    './products-list.component.scss',
})
export class ProductsListComponent {

  private readonly productsService = inject(ProductsService);

  // Categorías disponibles — usadas para poblar el <select> de filtro
  readonly categories = PRODUCT_CATEGORIES;

  // ─── Estado de la paginación y filtros ───────────────────────────────────
  // Signal mutable: cada cambio (nueva página, nuevo filtro) dispara una
  // nueva request al backend gracias al pipeline reactivo de abajo.
  params = signal<ProductListParams>({ page: 1, page_size: 10 });

  // ─── Pipeline reactivo ────────────────────────────────────────────────────
  // Mismo patrón que UsersListComponent:
  //   params (Signal) → toObservable → switchMap → nueva request → toSignal
  // switchMap cancela la request anterior si llega un nuevo valor antes de
  // que responda el servidor (evita race conditions en filtros rápidos).
  private readonly response = toSignal(
    toObservable(this.params).pipe(
      switchMap(p => this.productsService.getProducts(p))
    ),
    { initialValue: undefined }
  );

  // ─── Computed Signals derivados de la respuesta ───────────────────────────
  products    = computed((): Product[] => this.response()?.items ?? []);
  totalPages  = computed(() => this.response()?.pages     ?? 0);
  totalItems  = computed(() => this.response()?.total     ?? 0);
  currentPage = computed(() => this.response()?.page      ?? 1);
  isLoading   = computed(() => this.response() === undefined);

  // Array de números de página para el paginador en el template
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // ─── Paginación ───────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.params.update(p => ({ ...p, page }));
  }

  // ─── Filtro por categoría ─────────────────────────────────────────────────
  // Al cambiar la categoría volvemos a página 1 para no quedar en una
  // página que ya no existe con el nuevo filtro.
  filterByCategory(category: string): void {
    const cat = category || undefined; // string vacío = sin filtro
    this.params.update(p => ({ ...p, page: 1, category: cat }));
  }

  // ─── Filtro activo/inactivo ───────────────────────────────────────────────
  filterByStatus(value: string): void {
    const is_active = value === '' ? undefined : value === 'true';
    this.params.update(p => ({ ...p, page: 1, is_active }));
  }

  // ─── Formateador de precio COP ────────────────────────────────────────────
  // Convierte 15000 → "$15.000"
  // Locale 'es-CO': separador de miles = punto, sin decimales.
  // Se llama desde el template para cada fila de la tabla.
  formatPrice(price: number): string {
    return price.toLocaleString('es-CO', {
      style:                 'currency',
      currency:              'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
