// Espejo exacto de app/schemas/inventory_movement.py en el backend.
// Cada interface corresponde a un schema Pydantic:
//   InventoryMovement          ↔  InventoryMovementResponse
//   InventoryMovementPaginated ↔  InventoryMovementPaginated

// ─── Los únicos 3 valores que acepta el backend ───────────────────────────────
// Type alias en vez de enum: los enums numéricos de TS compilan ENTRADA → 0,
// lo que rompería el JSON enviado al backend. El alias deja pasar el string puro.

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

// ─── Un movimiento de inventario — espejo de InventoryMovementResponse ────────

export interface InventoryMovement {
  id:            number;         // PK autoincrement — lo genera PostgreSQL
  product_id:    number;         // FK → products.id
  movement_type: MovementType;   // 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  quantity:      number;         // siempre positivo (≥1); la dirección la da el type
  notes:         string | null;  // texto libre, máx 300 chars, opcional
  created_by_id: string | null;  // document_id del creador; null si fue eliminado
  created_at:    string;         // ISO 8601 — ej: "2025-03-09T14:30:45Z"
}

// ─── Respuesta paginada — espejo de InventoryMovementPaginated ────────────────

export interface InventoryMovementPaginated {
  items:     InventoryMovement[];  // movimientos de esta página
  total:     number;               // total en la BD (todas las páginas)
  page:      number;               // página actual
  page_size: number;               // cuántos por página
  pages:     number;               // total de páginas
}
