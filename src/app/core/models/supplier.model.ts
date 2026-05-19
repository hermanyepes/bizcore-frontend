// Espejo exacto de app/schemas/supplier.py en el backend.
// Cada interface corresponde a un schema Pydantic:
//   Supplier          ↔  SupplierResponse
//   SupplierPaginated ↔  SupplierPaginated
//
// ¿Qué NO está aquí?
//   SupplierCreate y SupplierUpdate viven en suppliers.service.ts,
//   igual que ProductCreatePayload y ProductUpdatePayload en products.service.ts.
//   Son payloads de salida (lo que enviamos), no de entrada (lo que recibimos).

// ─── Entidad completa devuelta por el backend ─────────────────────────────────

export interface Supplier {
  id:            number;        // PK autoincrement — lo genera PostgreSQL
  name:          string;        // obligatorio y único — el nombre del proveedor
  contact_email: string | null; // opcional — null si no tiene email registrado
  phone:         string | null; // opcional — string, no number (nadie suma teléfonos)
  address:       string | null; // opcional — dirección de la bodega del proveedor
  nit:           string | null; // opcional — NIT colombiano con o sin DV (DIAN módulo 11)
  is_active:     boolean;       // false = soft delete; el registro no se borra
  created_at:    string;        // ISO 8601 — ej: "2026-01-15T10:30:00Z"
  updated_at:    string | null; // null hasta el primer PUT sobre este proveedor
}

// ─── Respuesta paginada — espejo de SupplierPaginated ────────────────────────

export interface SupplierPaginated {
  items:     Supplier[]; // proveedores de esta página
  total:     number;     // total de proveedores en la BD (todas las páginas)
  page:      number;     // página actual (empieza en 1)
  page_size: number;     // cuántos proveedores por página
  pages:     number;     // total de páginas
}
