// ============================================================
// BizCore — Modelo TypeScript para Orders
// ============================================================
//
// ANALOGÍA: una factura de proveedor en papel tiene dos partes:
//   1. Encabezado: quién, cuándo, estado de la factura.
//   2. Cuerpo: cada fila = un producto con cantidad y precio.
//
// Aquí modelamos exactamente eso:
//   OrderItem = una fila de la factura (producto, cantidad, precio)
//   Order     = la factura completa (encabezado + lista de filas)
//
// La novedad respecto a módulos anteriores: Order CONTIENE una
// lista de OrderItem. Un tipo anida dentro del otro.
// ============================================================


// ------------------------------------------------------------
// OrderItem — una fila de la factura
// ------------------------------------------------------------
// Espeja OrderItemResponse del backend.
// El frontend NUNCA calcula unit_price ni subtotal:
// los recibe ya calculados desde la API.
export interface OrderItem {
  id: number;
  order_id: number;      // a qué pedido pertenece esta fila
  product_id: number;    // qué producto se pidió
  quantity: number;      // cuántas unidades
  unit_price: number;    // precio congelado al momento del pedido (en pesos)
  subtotal: number;      // quantity × unit_price, calculado por el backend
}


// ------------------------------------------------------------
// Order — la factura completa
// ------------------------------------------------------------
// Espeja OrderResponse del backend.
// El campo `items` es una lista de OrderItem — tipo compuesto.
export interface Order {
  id: number;
  supplier_id: number;
  created_by_id: string | null;  // null si el usuario fue eliminado
  status: OrderStatus;           // estado actual del pedido
  notes: string | null;          // comentario libre, opcional
  created_at: string;            // ISO 8601 — ej: "2026-03-12T16:00:00"
  items: OrderItem[];            // lista de filas de la factura (mín. 1)
}


// ------------------------------------------------------------
// OrderStatus — los tres estados posibles de un pedido
// ------------------------------------------------------------
// Se usa `type` en lugar de `interface` porque no es un objeto,
// es simplemente un conjunto cerrado de strings válidos.
// El compilador de TypeScript rechaza cualquier otro valor.
export type OrderStatus = 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';


// ------------------------------------------------------------
// OrderItemCreate — lo que enviamos por ítem al crear
// ------------------------------------------------------------
// Espeja OrderItemCreate del backend.
// Solo product_id y quantity — el precio lo asigna el backend.
export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}


// ------------------------------------------------------------
// OrderCreate — el body del POST /api/v1/orders
// ------------------------------------------------------------
// Espeja OrderCreate del backend.
// items debe tener al menos 1 elemento (validado en el formulario).
export interface OrderCreate {
  supplier_id: number;
  notes: string | null;
  items: OrderItemCreate[];
}


// ------------------------------------------------------------
// OrderUpdate — el body del PUT /api/v1/orders/{id}
// ------------------------------------------------------------
// Espeja OrderUpdate del backend.
// Solo se puede cambiar el estado y las notas.
// Los ítems son históricos e inmutables.
export interface OrderUpdate {
  status: OrderStatus | null;
  notes: string | null;
}


// ------------------------------------------------------------
// OrderPaginated — respuesta del GET /api/v1/orders (listado)
// ------------------------------------------------------------
// Mismo patrón de paginación que en Products, Inventory, Suppliers.
export interface OrderPaginated {
  items: Order[];    // pedidos de esta página
  total: number;     // total de pedidos en la BD
  page: number;      // página actual
  page_size: number; // pedidos por página
  pages: number;     // total de páginas
}
