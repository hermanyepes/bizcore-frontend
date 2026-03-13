// ============================================================
// BizCore — DashboardService
// ============================================================
//
// ANALOGÍA: el mensajero más sencillo del proyecto.
// Solo hace un viaje: va al backend, trae el resumen del negocio,
// y lo entrega al componente. Un método, una URL, cero parámetros.
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { Observable }         from 'rxjs';

import { environment }      from '../../../environments/environment';
import { DashboardSummary } from './dashboard.model';


@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Llama GET /api/v1/dashboard/summary y devuelve un Observable
  // con los datos del tablero. El componente se suscribe al resultado.
  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`);
  }
}
