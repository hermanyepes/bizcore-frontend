import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient }                            from '@angular/common/http';
import { Router }                                from '@angular/router';
import { tap }                                   from 'rxjs/operators';

import { environment }    from '../../../environments/environment';
import {
  LoginRequest,
  TokenResponse,
  RefreshRequest,
  TokenPayload,
} from '../models/auth.model';

// Claves para localStorage — centralizadas aquí para no escribirlas a mano en varios lugares
const ACCESS_TOKEN_KEY  = 'bizcore_access';
const REFRESH_TOKEN_KEY = 'bizcore_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  // --- Estado reactivo con Signals ---
  // Signal privado: solo este servicio puede cambiarlo
  // Leemos el token de localStorage al arrancar la app (si hay sesión guardada)
  private readonly _accessToken = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );

  // Signal público de solo lectura: cualquier componente puede leerlo, nadie puede mutarlo
  readonly accessToken = this._accessToken.asReadonly();

  // Computed: se recalcula automáticamente cuando _accessToken cambia
  // true si hay token Y no está vencido
  readonly isLoggedIn = computed(() => {
    const token = this._accessToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  });

  // Computed: decodifica el payload del JWT para exponer rol y email
  // Retorna null si no hay sesión activa
  readonly currentUser = computed((): TokenPayload | null => {
    const token = this._accessToken();
    if (!token) return null;
    return this.decodeToken(token);
  });

  // -------------------------------------------------------------------------
  // login — envía credenciales al backend y guarda los tokens
  // -------------------------------------------------------------------------
  login(credentials: LoginRequest) {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        // tap = "escucha de paso" — ejecuta un efecto secundario sin modificar el valor
        // El componente de login recibirá la respuesta igual, pero aquí guardamos los tokens
        tap(response => this.saveTokens(response))
      );
  }

  // -------------------------------------------------------------------------
  // logout — borra tokens locales y redirige al login
  // -------------------------------------------------------------------------
  logout(): void {
    // Intentamos avisar al backend para invalidar el refresh_token en BD
    // Si falla (sin red, token ya inválido), no importa — borramos local de todas formas
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refresh_token: refreshToken })
        .subscribe({ error: () => {} }); // ignoramos errores — el logout local ya ocurrió
    }

    this.clearTokens();
    this.router.navigate(['/login']);
  }

  // -------------------------------------------------------------------------
  // refreshAccessToken — usa el refresh_token para obtener un nuevo access_token
  // Lo llama el interceptor automáticamente cuando recibe un 401
  // -------------------------------------------------------------------------
  refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      // No hay refresh_token guardado — la sesión está muerta
      this.clearTokens();
      return null;
    }

    const body: RefreshRequest = { refresh_token: refreshToken };

    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, body)
      .pipe(
        tap(response => this.saveTokens(response))
      );
  }

  // -------------------------------------------------------------------------
  // Métodos privados — infraestructura interna del servicio
  // -------------------------------------------------------------------------

  private saveTokens(response: TokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY,  response.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
    // Actualizamos el signal → todos los computed que dependen de él se recalculan
    this._accessToken.set(response.access_token);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this._accessToken.set(null);
  }

  // Decodifica la parte del medio del JWT (payload) sin verificar la firma.
  // La verificación de firma la hace el BACKEND — aquí solo leemos los datos.
  private decodeToken(token: string): TokenPayload | null {
    try {
      // Un JWT tiene 3 partes: header.payload.signature — separadas por "."
      // La parte [1] es el payload, codificado en Base64
      const payload = token.split('.')[1];
      // atob() decodifica Base64 a string JSON
      return JSON.parse(atob(payload)) as TokenPayload;
    } catch {
      // Si el token está malformado, tratamos la sesión como inválida
      return null;
    }
  }

  // Compara el tiempo de expiración del token con la hora actual
  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload) return true;
    // payload.exp está en segundos Unix — Date.now() está en milisegundos
    return payload.exp * 1000 < Date.now();
  }
}
