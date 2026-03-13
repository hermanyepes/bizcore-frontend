// ============================================================
// BizCore — Interfaces TypeScript para el módulo Dashboard
// ============================================================
//
// ANALOGÍA: este archivo es el molde de la caja que llega del
// backend. Describe exactamente qué forma tienen los datos de
// GET /api/v1/dashboard/summary antes de que lleguen.
//
// ESPEJO DEL BACKEND:
//   Python (schemas/dashboard.py)      TypeScript (dashboard.model.ts)
//   ──────────────────────────────     ────────────────────────────────
//   class LowStockProduct(BaseModel)   interface LowStockProduct
//   class DashboardSummary(BaseModel)  interface DashboardSummary
// ============================================================


// ------------------------------------------------------------
// LowStockProduct
// Representa un producto con stock crítico (< 10 unidades).
// Aparece en la tabla de alertas al pie del dashboard.
// ------------------------------------------------------------
export interface LowStockProduct {
  id:    number; // identificador del producto
  name:  string; // nombre para mostrar en la tabla
  stock: number; // unidades disponibles — siempre < 10 por definición del backend
}


// ------------------------------------------------------------
// DashboardSummary
// Respuesta completa de GET /api/v1/dashboard/summary.
// Contiene todo lo que el dashboard necesita para pintarse.
// ------------------------------------------------------------
export interface DashboardSummary {
  // --- Tarjetas de conteo ---
  total_active_users:    number; // usuarios con is_active=true
  total_active_products: number; // productos con is_active=true
  total_stock:           number; // suma de stock de todos los productos activos
  total_inventory_value: number; // suma(stock × price) — entero COP, sin decimales

  // --- Gráfico de dona ---
  // Ejemplo: { "PENDIENTE": 3, "EN_PROCESO": 7, "ENTREGADO": 20, "CANCELADO": 1 }
  orders_by_status: Record<string, number>;

  // --- Tabla de alertas ---
  // Lista ordenada por stock ascendente (el más crítico primero)
  low_stock_products: LowStockProduct[];
}
