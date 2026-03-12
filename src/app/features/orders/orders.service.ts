// ============================================================
// BizCore — Servicio para Orders
// ============================================================
//
// ANALOGÍA: este servicio es el asistente de compras que trabaja
// entre el componente (tú) y el backend (el almacén).
// El componente nunca escribe una URL — solo llama métodos aquí.
//
// Endpoints que cubre:
//   GET    /api/v1/orders              → getOrders()
//   GET    /api/v1/orders/{id}         → getOrder()
//   POST   /api/v1/orders              → createOrder()
//   PUT    /api/v1/orders/{id}         → updateOrder()
//   DELETE /api/v1/orders/{id}         → cancelOrder()
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Order,
  OrderCreate,
  OrderUpdate,
  OrderPaginated,
} from './order.model';


// ------------------------------------------------------------
// OrderListParams — filtros opcionales para el listado
// ------------------------------------------------------------
// El componente construye este objeto y lo pasa a getOrders().
// Todos los campos son opcionales: si no se envían, el backend
// devuelve todos los pedidos sin filtrar.
export interface OrderListParams {
  page?:        number;
  page_size?:   number;
  status?:      string;  // 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO'
  supplier_id?: number;  // filtra pedidos de un proveedor específico
}


// ------------------------------------------------------------
// OrdersService
// ------------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class OrdersService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  // ----------------------------------------------------------
  // getOrders — lista paginada con filtros opcionales
  // GET /api/v1/orders?page=1&status=PENDIENTE&supplier_id=3
  // ----------------------------------------------------------
  getOrders(params: OrderListParams = {}): Observable<OrderPaginated> {
    let httpParams = new HttpParams()
      .set('page',      params.page      ?? 1)
      .set('page_size', params.page_size ?? 10);

    // status y supplier_id son opcionales: solo se añaden si vienen.
    // Si no se envían, el backend devuelve todos los pedidos.
    if (params.status !== undefined) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.supplier_id !== undefined) {
      httpParams = httpParams.set('supplier_id', params.supplier_id);
    }

    return this.http.get<OrderPaginated>(this.baseUrl + '/', { params: httpParams });
  }

  // ----------------------------------------------------------
  // getOrder — detalle de un pedido por su id
  // GET /api/v1/orders/{id}
  // La respuesta incluye los ítems anidados (items[]).
  // ----------------------------------------------------------
  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  // ----------------------------------------------------------
  // createOrder — registra un pedido nuevo con sus ítems
  // POST /api/v1/orders
  //
  // El payload incluye una lista anidada de ítems.
  // Angular serializa el objeto completo a JSON automáticamente:
  //   { supplier_id: 1, notes: null, items: [{...}, {...}] }
  // ----------------------------------------------------------
  createOrder(payload: OrderCreate): Observable<Order> {
    return this.http.post<Order>(this.baseUrl + '/', payload);
  }

  // ----------------------------------------------------------
  // updateOrder — cambia el estado y/o las notas de un pedido
  // PUT /api/v1/orders/{id}
  //
  // Los ítems son inmutables: no se pueden cambiar después de
  // crear el pedido. Solo status y notes son editables.
  // ----------------------------------------------------------
  updateOrder(id: number, payload: OrderUpdate): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${id}`, payload);
  }

  // ----------------------------------------------------------
  // cancelOrder — cancela un pedido (soft delete vía DELETE)
  // DELETE /api/v1/orders/{id}
  //
  // En el backend esto pone status = 'CANCELADO'.
  // No borra el registro de la BD — el historial se conserva.
  // ----------------------------------------------------------
  cancelOrder(id: number): Observable<Order> {
    return this.http.delete<Order>(`${this.baseUrl}/${id}`);
  }
}
