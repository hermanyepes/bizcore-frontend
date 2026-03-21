import { Injectable }  from '@angular/core';
import { HttpParams }  from '@angular/common/http';
import { Observable }  from 'rxjs';

import { environment }                        from '../../../environments/environment';
import { Product, ProductPaginated }          from '../../core/models/product.model';
import { GenericCrudService }                 from '../../shared/services/generic-crud.service';

// ─── Categorías fijas del frontend ───────────────────────────────────────────
// El backend acepta cualquier texto libre en `category`.
// El frontend restringe las opciones con este array para mantener consistencia
// en los datos (evitar "alimentos", "Alimentos", "ALIMENTOS" como tres valores
// distintos en la BD). Se exporta para que product-form lo use en el <select>.
export const PRODUCT_CATEGORIES = [
  'Alimentos',
  'Bebidas',
  'Limpieza',
  'Papelería',
  'Electrónica',
  'Ropa y Calzado',
  'Otros',
] as const;

// El tipo literal de las categorías — útil para el FormControl tipado.
// 'Alimentos' | 'Bebidas' | 'Limpieza' | ...
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// ─── Parámetros para el listado paginado ─────────────────────────────────────

export interface ProductListParams {
  page?:      number;
  page_size?: number;
  is_active?: boolean;
  category?:  string;   // filtro opcional por categoría
}

// ─── Payload para crear un producto nuevo ────────────────────────────────────
// Espejo de ProductCreate en app/schemas/product.py.
// Campos ausentes: id (lo genera PG), created_at (server_default), is_active
// (siempre empieza en true — no tiene sentido crear uno inactivo).
// stock viene del backend con default=0; lo enviamos solo si el admin lo define.

export interface ProductCreatePayload {
  name:        string;
  description: string | null;
  price:       number;
  stock?:      number;         // opcional — el backend lo pone en 0 si no llega
  category:    string | null;
}

// ─── Payload para actualizar un producto existente ───────────────────────────
// Todos los campos son opcionales: el admin puede cambiar solo el precio
// sin tocar el nombre. Espejo de ProductUpdate en app/schemas/product.py.
// Nota: stock NO está aquí — en BizCore el stock solo se modifica desde
// el módulo de Inventario mediante movimientos (entradas/salidas).

export interface ProductUpdatePayload {
  name?:        string | null;
  description?: string | null;
  price?:       number | null;
  category?:    string | null;
  is_active?:   boolean | null;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ProductsService extends GenericCrudService<Product, ProductCreatePayload, ProductUpdatePayload> {

  // getOne / create / update / remove vienen de GenericCrudService.
  protected readonly baseUrl = `${environment.apiUrl}/products`;

  // ---------------------------------------------------------------------------
  // getProducts — lista paginada con filtros opcionales
  // GET /api/v1/products?page=1&page_size=10&is_active=true&category=Bebidas
  // ---------------------------------------------------------------------------
  getProducts(params: ProductListParams = {}): Observable<ProductPaginated> {
    let httpParams = new HttpParams()
      .set('page',      params.page      ?? 1)
      .set('page_size', params.page_size ?? 10);

    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', params.is_active);
    }
    if (params.category !== undefined) {
      httpParams = httpParams.set('category', params.category);
    }

    return this.http.get<ProductPaginated>(this.baseUrl + '/', { params: httpParams });
  }
}
