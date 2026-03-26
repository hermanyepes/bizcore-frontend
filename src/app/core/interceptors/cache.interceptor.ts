import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap }                         from 'rxjs';

// ---------------------------------------------------------------------------
// Estructura de cada entrada en el caché.
// Guardamos el cuerpo de la respuesta (body) y el momento exacto en que expira
// (expiry), expresado como timestamp Unix en milisegundos.
// ---------------------------------------------------------------------------
interface CacheEntry {
  body:   unknown;
  expiry: number;
}

// ---------------------------------------------------------------------------
// El mapa de caché vive FUERA de la función del interceptor.
// Esto es intencional: necesita sobrevivir entre peticiones.
// Si viviera dentro de la función, se reiniciaría en cada request y el caché
// nunca tendría datos útiles.
//
// La clave es la URL completa incluyendo query params (req.urlWithParams),
// por ejemplo: "https://localhost:8000/api/v1/products?page=1&size=10"
// Dos URLs distintas → dos entradas distintas en el mapa.
// ---------------------------------------------------------------------------
const cache = new Map<string, CacheEntry>();

// Tiempo de vida de cada entrada: 30 segundos en milisegundos.
// Pasado este tiempo, la entrada se considera expirada y se hace una
// petición nueva al servidor.
const CACHE_TTL_MS = 30_000;

// Limpia todas las entradas del caché.
// Usado en los tests para aislar cada caso — el mapa es de módulo y persiste
// entre tests si no se reinicia explícitamente.
export function clearCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Interceptor funcional de caché.
// Solo actúa sobre peticiones GET — las mutaciones (POST, PUT, DELETE)
// nunca deben cachearse porque cambian el estado del servidor.
// ---------------------------------------------------------------------------
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {

  // --- Paso 1: ignorar todo lo que no sea GET --------------------------
  // next(req) delega el request al siguiente interceptor de la cadena
  // sin que este interceptor haga nada más.
  if (req.method !== 'GET') {
    return next(req);
  }

  // --- Paso 2: buscar una entrada válida en el mapa --------------------
  const cached = cache.get(req.urlWithParams);

  // Date.now() devuelve el timestamp actual en milisegundos.
  // Si la entrada existe Y aún no ha expirado, la devolvemos directamente.
  if (cached && cached.expiry > Date.now()) {
    // of() crea un Observable que emite un único valor inmediatamente
    // y completa. Es como decir "aquí está la respuesta, sin ir al servidor".
    // HttpResponse es el objeto que Angular espera como respuesta HTTP;
    // lo construimos manualmente con el body guardado.
    return of(new HttpResponse({ body: cached.body, status: 200 }));
  }

  // --- Paso 3: caché MISS — dejar pasar la petición al servidor --------
  // pipe() encadena operadores RxJS sobre el Observable que devuelve next().
  // tap() "espía" los eventos del Observable sin modificarlos:
  //   - ejecuta un efecto secundario (guardar en caché)
  //   - deja que el valor original llegue al componente intacto
  return next(req).pipe(
    tap(event => {
      // El Observable de HttpClient emite varios tipos de eventos
      // (HttpSentEvent, HttpHeaderResponse, HttpResponse, etc.).
      // Solo nos interesa el HttpResponse final — el que contiene el body.
      if (event instanceof HttpResponse) {
        cache.set(req.urlWithParams, {
          body:   event.body,
          expiry: Date.now() + CACHE_TTL_MS,
        });
      }
    }),
  );
};
