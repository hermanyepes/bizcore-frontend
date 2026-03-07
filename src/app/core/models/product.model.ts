// Espejo exacto de app/schemas/product.py en el backend.
// Cada interface corresponde a un schema Pydantic:
//   Product          ↔  ProductResponse
//   ProductPaginated ↔  ProductPaginated
//   (Los payloads de create/update viven en products.service.ts,
//    igual que UserCreatePayload y UserUpdatePayload en users.service.ts)

// ─── Entidad completa devuelta por el backend ─────────────────────────────────

export interface Product {
  id:          number;          // autoincrement — lo genera PostgreSQL
  name:        string;
  description: string | null;
  price:       number;          // entero COP — sin decimales
  stock:       number;          // unidades disponibles
  category:    string | null;   // texto libre en el backend; select fijo en el frontend
  is_active:   boolean;
  created_at:  string;          // ISO 8601 — Date se construye al mostrar
  updated_at:  string | null;   // null si nunca fue actualizado
}

// ─── Respuesta paginada — espejo de ProductPaginated ─────────────────────────

export interface ProductPaginated {
  items:     Product[];  // productos de esta página
  total:     number;     // total de productos en la BD
  page:      number;     // página actual
  page_size: number;     // cuántos por página
  pages:     number;     // total de páginas
}
