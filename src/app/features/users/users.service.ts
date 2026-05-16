import { Injectable }   from '@angular/core';
import { HttpParams }   from '@angular/common/http';
import { Observable }   from 'rxjs';

import { environment }                        from '../../../environments/environment';
import { User, UserPaginated }                from '../../core/models/user.model';
import { GenericCrudService }                 from '../../shared/services/generic-crud.service';

// Parámetros opcionales para el listado paginado.
// Todos son opcionales — si no se envían, el backend devuelve todos los registros.
export interface UserListParams {
  page?:      number;
  page_size?: number;
  is_active?: boolean;
  role?:      'Superadmin' | 'Administrador' | 'Supervisor' | 'Empleado';
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
  role:          'Superadmin' | 'Administrador' | 'Supervisor' | 'Empleado';
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
  role?:      'Superadmin' | 'Administrador' | 'Supervisor' | 'Empleado' | null;
  password?:  string | null;
  is_active?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService extends GenericCrudService<User, UserCreatePayload, UserUpdatePayload> {

  // getOne / create / update / remove vienen de GenericCrudService.
  // Solo declaramos baseUrl (obligatorio por 'abstract') y getUsers
  // (específico de este módulo — la lista tiene params propios).
  protected readonly baseUrl = `${environment.apiUrl}/users`;

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
}
