import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }            from 'rxjs';

import { environment }                    from '../../../environments/environment';
import { Supplier, SupplierPaginated }    from '../../core/models/supplier.model';

// ─── Parámetros para el listado paginado ─────────────────────────────────────
// El componente de lista construye este objeto y lo pasa a getSuppliers().
// Todos opcionales: si no se envían, el backend usa sus propios defaults.

export interface SupplierListParams {
  page?:      number;
  page_size?: number;
  is_active?: boolean; // true = solo activos; false = solo inactivos; ausente = todos
}

// ─── Payload para crear un proveedor nuevo ────────────────────────────────────
// Espejo de SupplierCreate en app/schemas/supplier.py.
// Campos ausentes: id (lo genera PG), created_at (server_default),
// is_active (siempre empieza en true — un proveedor nuevo está activo).

export interface SupplierCreatePayload {
  name:          string;
  contact_email: string | null; // null si el admin dejó el campo vacío
  phone:         string | null;
  address:       string | null;
}

// ─── Payload para actualizar un proveedor existente ──────────────────────────
// Todos los campos son opcionales: el admin puede cambiar solo el teléfono
// sin tocar el nombre. Espejo de SupplierUpdate en app/schemas/supplier.py.
// is_active: false activa el soft delete desde este mismo endpoint.

export interface SupplierUpdatePayload {
  name?:          string | null;
  contact_email?: string | null;
  phone?:         string | null;
  address?:       string | null;
  is_active?:     boolean | null;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SuppliersService {

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/suppliers`;

  // ---------------------------------------------------------------------------
  // getSuppliers — lista paginada con filtros opcionales
  // GET /api/v1/suppliers?page=1&page_size=10&is_active=true
  // ---------------------------------------------------------------------------
  getSuppliers(params: SupplierListParams = {}): Observable<SupplierPaginated> {
    let httpParams = new HttpParams()
      .set('page',      params.page      ?? 1)
      .set('page_size', params.page_size ?? 10);

    // is_active es boolean: solo se añade si viene explícito.
    // Si no se envía, el backend devuelve activos e inactivos.
    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', params.is_active);
    }

    return this.http.get<SupplierPaginated>(this.baseUrl + '/', { params: httpParams });
  }

  // ---------------------------------------------------------------------------
  // getSupplier — detalle de un proveedor por su id numérico
  // GET /api/v1/suppliers/{id}
  // ---------------------------------------------------------------------------
  getSupplier(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.baseUrl}/${id}`);
  }

  // ---------------------------------------------------------------------------
  // createSupplier — registra un proveedor nuevo
  // POST /api/v1/suppliers
  // Solo el Administrador puede crear (el backend valida el rol del token).
  // ---------------------------------------------------------------------------
  createSupplier(payload: SupplierCreatePayload): Observable<Supplier> {
    return this.http.post<Supplier>(this.baseUrl + '/', payload);
  }

  // ---------------------------------------------------------------------------
  // updateSupplier — actualiza campos de un proveedor existente
  // PUT /api/v1/suppliers/{id}
  // Payload parcial — solo los campos que cambiaron.
  // ---------------------------------------------------------------------------
  updateSupplier(id: number, payload: SupplierUpdatePayload): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/${id}`, payload);
  }
}
