// Interfaces TypeScript que reflejan los schemas de usuario del backend FastAPI.
// Espejo de UserResponse y UserPaginated en app/schemas/user.py
// No tienen lógica — solo definen la "forma" de los datos que llegan del backend.

// Un usuario completo tal como el backend lo devuelve.
// Espejo de UserResponse en app/schemas/user.py
// Nota: join_date, created_at, updated_at llegan como strings ISO 8601 (JSON no tiene tipo Date).
// Ejemplo: "2024-01-15T10:30:00.123456"
export interface User {
  document_id:   string;
  document_type: string;
  full_name:     string;
  phone:         string | null;
  email:         string;
  city:          string | null;
  role:          'Administrador' | 'Empleado';
  join_date:     string;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string | null; // null si nunca fue actualizado
}

// Respuesta paginada para el listado de usuarios.
// Espejo de UserPaginated en app/schemas/user.py
// El backend devuelve esto en GET /api/v1/users?page=1&page_size=10
export interface UserPaginated {
  items:     User[];  // lista de usuarios de la página actual
  total:     number;  // total de usuarios en la BD (para calcular cuántas páginas hay)
  page:      number;  // página actual
  page_size: number;  // cuántos registros por página
  pages:     number;  // total de páginas (= ceil(total / page_size))
}
