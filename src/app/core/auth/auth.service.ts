import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient }                            from '@angular/common/http';
import { Router }                                from '@angular/router';
import { Observable }                            from 'rxjs';
import { tap, shareReplay }                      from 'rxjs/operators';

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

  // --- Guardia anti-race-condition para el refresh ---
  // Si dos requests 401 llegan al mismo tiempo, solo se hace UN POST a /auth/refresh.
  // El segundo suscriptor se engancha al Observable ya en vuelo en lugar de crear otro.
  private _isRefreshing   = false;
  private refreshInFlight$: Observable<TokenResponse> | null = null;

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
  // changePassword — cambia la contraseña del usuario autenticado
  // POST /api/v1/auth/change-password
  // El backend revoca todos los refresh tokens → el caller debe hacer logout.
  // -------------------------------------------------------------------------
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/change-password`,
      { current_password: currentPassword, new_password: newPassword }
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
        .subscribe({ error: (_err) => { /* fallo silencioso — el token local ya fue eliminado */ } });
    }

    this.clearTokens();
    this.router.navigate(['/login']);
  }

  // -------------------------------------------------------------------------
  // refreshAccessToken — usa el refresh_token para obtener un nuevo access_token.
  // Lo llama el interceptor automáticamente cuando recibe un 401.
  //
  // Patrón anti-race-condition:
  //   - Si ya hay una petición de refresh en vuelo (_isRefreshing === true),
  //     devolvemos el mismo Observable (refreshInFlight$) en lugar de crear uno nuevo.
  //   - shareReplay(1) garantiza que cualquier suscriptor que llegue tarde
  //     reciba el último resultado emitido sin relanzar el POST.
  //   - Al completar (tap final), limpiamos los flags para la próxima vez.
  // -------------------------------------------------------------------------
  refreshAccessToken(): Observable<TokenResponse> | null {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      // No hay refresh_token guardado — la sesión está muerta
      this.clearTokens();
      return null;
    }

    // Si ya hay un refresh en vuelo, devolvemos ese mismo Observable.
    // El interceptor se suscribe a él y recibirá el resultado cuando llegue,
    // sin disparar un segundo POST al backend.
    if (this._isRefreshing && this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const body: RefreshRequest = { refresh_token: refreshToken };

    this._isRefreshing = true;
    this.refreshInFlight$ = this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, body)
      .pipe(
        // Guardamos los tokens nuevos tan pronto llegue la respuesta
        tap(response => this.saveTokens(response)),
        // Limpiamos los flags al terminar (tanto en éxito como en error)
        tap({
          next:  () => { this._isRefreshing = false; this.refreshInFlight$ = null; },
          error: () => { this._isRefreshing = false; this.refreshInFlight$ = null; },
        }),
        // shareReplay(1): comparte esta única ejecución entre todos los suscriptores.
        // Si el interceptor se suscribe dos veces, ambos reciben el mismo resultado.
        shareReplay(1),
      );

    return this.refreshInFlight$;
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
