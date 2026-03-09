import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InventoryMovement,
  InventoryMovementPaginated,
  MovementType,
} from '../../core/models/inventory.model';

// ─── Parámetros para el listado paginado ─────────────────────────────────────
// Espejo de los query params que acepta GET /api/v1/inventory/.
// Todos son opcionales: se pueden combinar o usar por separado.

export interface InventoryListParams {
  page?:          number;        // default 1
  page_size?:     number;        // default 10, máx 100
  product_id?:    number;        // filtrar movimientos de un producto específico
  movement_type?: MovementType;  // filtrar por tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
}

// ─── Payload para crear un nuevo movimiento ───────────────────────────────────
// Espejo de InventoryMovementCreate en app/schemas/inventory_movement.py.
// Campos ausentes del payload: id (PG), created_at (PG), created_by_id (JWT).
// El backend extrae el creador del token — jamás lo aceptaría del body por seguridad.

export interface InventoryMovementCreatePayload {
  product_id:    number;        // qué producto se mueve
  movement_type: MovementType;  // tipo de movimiento
  quantity:      number;        // cuántas unidades (≥1)
  notes?:        string | null; // contexto opcional (máx 300 chars)
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class InventoryService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  // ---------------------------------------------------------------------------
  // getMovements — historial paginado con filtros opcionales
  // GET /api/v1/inventory/?page=1&page_size=10&product_id=5&movement_type=ENTRADA
  // ---------------------------------------------------------------------------
  getMovements(params: InventoryListParams = {}): Observable<InventoryMovementPaginated> {
    let httpParams = new HttpParams()
      .set('page',      params.page      ?? 1)
      .set('page_size', params.page_size ?? 10);

    // Solo añadimos el filtro si el llamador lo especificó.
    // Si pasáramos product_id=undefined al backend, enviaría "undefined" como string.
    if (params.product_id !== undefined) {
      httpParams = httpParams.set('product_id', params.product_id);
    }
    if (params.movement_type !== undefined) {
      httpParams = httpParams.set('movement_type', params.movement_type);
    }

    return this.http.get<InventoryMovementPaginated>(this.baseUrl + '/', { params: httpParams });
  }

  // ---------------------------------------------------------------------------
  // getMovement — detalle de un movimiento por su id
  // GET /api/v1/inventory/{id}
  // ---------------------------------------------------------------------------
  getMovement(id: number): Observable<InventoryMovement> {
    return this.http.get<InventoryMovement>(`${this.baseUrl}/${id}`);
  }

  // ---------------------------------------------------------------------------
  // createMovement — registra un nuevo movimiento y actualiza el stock
  // POST /api/v1/inventory/
  // Efecto lateral en el backend: actualiza Product.stock según el tipo.
  // ---------------------------------------------------------------------------
  createMovement(payload: InventoryMovementCreatePayload): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(this.baseUrl + '/', payload);
  }
}
