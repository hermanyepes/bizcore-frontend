// Interfaces TypeScript que reflejan los schemas de auth del backend FastAPI.
// No tienen lógica — solo definen la "forma" de los datos.
// El compilador usa estas interfaces para avisarnos si usamos mal los datos.

// Lo que enviamos al backend para hacer login
// Espejo de LoginRequest en app/schemas/auth.py
export interface LoginRequest {
  email: string;
  password: string;
}

// Lo que el backend nos devuelve al hacer login exitoso
// Espejo de TokenResponse en app/schemas/auth.py
export interface TokenResponse {
  access_token: string;   // JWT — cadena larga cifrada
  refresh_token: string;  // Token para renovar el access_token sin re-login
  token_type: string;     // Siempre "bearer" — indica cómo enviarlo en el header
}

// Lo que enviamos al endpoint /auth/refresh para renovar el access_token
export interface RefreshRequest {
  refresh_token: string;
}

// Los datos del usuario que podemos extraer del JWT (payload decodificado).
// El JWT tiene estos campos embebidos — no necesitamos llamar al backend para leerlos.
export interface TokenPayload {
  sub: string;    // "subject" — el email del usuario (estándar JWT)
  role: string;   // 'Administrador' o 'Empleado'
  exp: number;    // "expiration" — timestamp Unix cuando expira el token
}
