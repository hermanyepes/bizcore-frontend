import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }            from 'rxjs';

import { environment }              from '../../../environments/environment';
import { User, UserPaginated }      from '../../core/models/user.model';

// Parámetros opcionales para el listado paginado.
// Todos son opcionales — si no se envían, el backend devuelve todos los registros.
export interface UserListParams {
  page?:      number;
  page_size?: number;
  is_active?: boolean;
  role?:      'Administrador' | 'Empleado';
}

@Injectable({ providedIn: 'root' })
export class UsersService {

  private readonly http = inject(HttpClient);

  // URL base para todos los endpoints de usuario
  private readonly baseUrl = `${environment.apiUrl}/users`;

  // -------------------------------------------------------------------------
  // getUsers — trae una página de usuarios con filtros opcionales
  // GET /api/v1/users?page=1&page_size=10&is_active=true&role=Empleado
  // -------------------------------------------------------------------------
  getUsers(params: UserListParams = {}): Observable<UserPaginated> {
    // HttpParams construye el query string de forma segura.
    // Es inmutable: cada .set() devuelve una nueva instancia.
    // Equivalente manual: ?page=1&page_size=10
    let httpParams = new HttpParams()
      .set('page',      params.page      ?? 1)
      .set('page_size', params.page_size ?? 10);

    // Solo agregamos los filtros opcionales si el llamador los envía.
    // Si enviáramos is_active=undefined al backend, FastAPI lo rechazaría.
    if (params.is_active !== undefined) {
      httpParams = httpParams.set('is_active', params.is_active);
    }
    if (params.role !== undefined) {
      httpParams = httpParams.set('role', params.role);
    }

    // El interceptor agrega el Bearer token automáticamente — no hay que hacerlo aquí.
    // El tipo genérico <UserPaginated> le dice a Angular qué forma tiene la respuesta.
    return this.http.get<UserPaginated>(this.baseUrl + '/', { params: httpParams });
  }

  // -------------------------------------------------------------------------
  // getUser — trae un usuario por su document_id
  // GET /api/v1/users/{document_id}
  // -------------------------------------------------------------------------
  getUser(documentId: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${documentId}`);
  }
}
