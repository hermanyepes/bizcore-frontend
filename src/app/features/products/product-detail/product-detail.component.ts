import { Component, inject, computed } from '@angular/core';
import { toSignal }                     from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink }   from '@angular/router';
import { SlicePipe, UpperCasePipe, DatePipe } from '@angular/common';
import { switchMap, catchError }        from 'rxjs/operators';
import { of }                           from 'rxjs';

import { ProductsService } from '../products.service';
import { Product }         from '../../../core/models/product.model';

@Component({
  selector:    'app-product-detail',
  standalone:  true,
  imports:     [RouterLink, SlicePipe, UpperCasePipe, DatePipe],
  templateUrl: './product-detail.component.html',
  styleUrl:    './product-detail.component.scss',
})
export class ProductDetailComponent {

  private readonly route           = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  // ---------------------------------------------------------------------------
  // Pipeline reactivo: URL param → request HTTP → Signal
  //
  // Mismo patrón que UserDetailComponent. La única diferencia:
  // el id en la URL es un string ("42"), pero getProduct espera un número.
  // Number() lo convierte: "42" → 42.
  // Si params.get('id') es null (URL mal formada), Number(null) = 0,
  // lo que devuelve un 404 del backend → catchError lo convierte en null.
  // ---------------------------------------------------------------------------
  private readonly product$ = this.route.paramMap.pipe(
    switchMap(params => {
      const id = Number(params.get('id'));
      return this.productsService.getProduct(id).pipe(
        catchError(() => of(null))
      );
    })
  );

  // Tres estados posibles:
  //   undefined → cargando (la request todavía no respondió)
  //   null      → error del backend (404 / 500)
  //   Product   → datos listos
  readonly product = toSignal<Product | null | undefined>(this.product$, { initialValue: undefined });

  readonly isLoading  = computed(() => this.product() === undefined);
  readonly isNotFound = computed(() => this.product() === null);

  // Formateador de precio COP — mismo que en ProductsListComponent
  formatPrice(price: number): string {
    return price.toLocaleString('es-CO', {
      style:                 'currency',
      currency:              'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
