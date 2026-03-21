import { inject }      from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';

// -----------------------------------------------------------------------------
// GenericCrudService<T, C, U>
//
// Clase base abstracta que centraliza las 4 operaciones HTTP comunes a todos
// los módulos CRUD: leer uno, crear, actualizar y eliminar.
//
// Por qué abstracta: no tiene sentido instanciarla sola — baseUrl estaría
// vacío y cada llamada HTTP fallaría. El modificador 'abstract' hace que
// TypeScript lo impida en tiempo de compilación.
//
// Parámetros de tipo (los "moldes"):
//   T — la entidad que el backend devuelve     (User, Product, Supplier…)
//   C — el payload para crear un registro      (UserCreatePayload…)
//   U — el payload para actualizar un registro (UserUpdatePayload…)
//
// Uso: cada servicio de módulo extiende esta clase y solo necesita
// declarar su propia baseUrl + su método de listado paginado.
// -----------------------------------------------------------------------------
export abstract class GenericCrudService<T, C, U> {

  // inject() funciona en una clase no-@Injectable porque la subclase SÍ
  // tiene @Injectable — la instancia se construye dentro del contexto de
  // inyección de Angular, y ese contexto está activo cuando se ejecuta
  // el inicializador de esta propiedad.
  protected readonly http = inject(HttpClient);

  // Propiedad abstracta: cada subclase DEBE declarar su propio valor.
  // Si una subclase omite esta línea, TypeScript lanza un error de compilación
  // antes de que el código llegue al navegador.
  protected abstract readonly baseUrl: string;

  // ---------------------------------------------------------------------------
  // getOne — trae un único registro por su identificador
  // GET /api/v1/{recurso}/{id}
  //
  // Acepta string | number porque distintos módulos usan distintos tipos de PK:
  // usuarios usan document_id (string), productos y proveedores usan id (number).
  // ---------------------------------------------------------------------------
  getOne(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  // ---------------------------------------------------------------------------
  // create — registra un recurso nuevo en el backend
  // POST /api/v1/{recurso}/
  //
  // El tipo C (Create payload) garantiza que cada módulo envíe exactamente
  // los campos que su endpoint espera — ni más ni menos.
  // ---------------------------------------------------------------------------
  create(payload: C): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/`, payload);
  }

  // ---------------------------------------------------------------------------
  // update — modifica un recurso existente (payload parcial)
  // PUT /api/v1/{recurso}/{id}
  //
  // El tipo U (Update payload) suele tener todos los campos opcionales porque
  // el admin puede cambiar solo un campo sin enviar los demás.
  // ---------------------------------------------------------------------------
  update(id: string | number, payload: U): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, payload);
  }

  // ---------------------------------------------------------------------------
  // remove — elimina (o desactiva) un recurso
  // DELETE /api/v1/{recurso}/{id}
  //
  // El backend decide si es hard delete o soft delete (is_active = false).
  // El frontend no necesita saberlo — solo llama remove() y reacciona al
  // Observable resultante.
  // ---------------------------------------------------------------------------
  remove(id: string | number): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${id}`);
  }
}
