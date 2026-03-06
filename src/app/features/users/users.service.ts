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

// Datos necesarios para crear un usuario nuevo.
// Espejo de UserCreate en app/schemas/user.py
// phone y city son opcionales (el backend los acepta como null).
export interface UserCreatePayload {
  document_id:   string;
  document_type: string;
  full_name:     string;
  phone?:        string | null;
  email:         string;
  city?:         string | null;
  role:          'Administrador' | 'Empleado';
  password:      string;
}

// Datos actualizables de un usuario existente. Todos son opcionales:
// el cliente puede enviar solo los campos que quiere cambiar.
// Espejo de UserUpdate en app/schemas/user.py
// Nota: document_id, document_type y email NO están aquí — el backend no
// permite cambiarlos una vez creados.
export interface UserUpdatePayload {
  full_name?: string | null;
  phone?:     string | null;
  city?:      string | null;
  role?:      'Administrador' | 'Empleado' | null;
  password?:  string | null;
  is_active?: boolean | null;
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

  // -------------------------------------------------------------------------
  // createUser — crea un usuario nuevo
  // POST /api/v1/users
  // Devuelve el User creado tal como el backend lo guarda (con created_at, etc.)
  // -------------------------------------------------------------------------
  createUser(payload: UserCreatePayload): Observable<User> {
    return this.http.post<User>(this.baseUrl + '/', payload);
  }

  // -------------------------------------------------------------------------
  // updateUser — actualiza campos de un usuario existente
  // PUT /api/v1/users/{document_id}
  // Solo se envían los campos que se quieren cambiar (payload parcial).
  // -------------------------------------------------------------------------
  updateUser(documentId: string, payload: UserUpdatePayload): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${documentId}`, payload);
  }
}
