import { Injectable, signal } from '@angular/core';

/**
 * Servicio global para controlar el estado de carga de la aplicación.
 *
 * Funciona como un interruptor de luz centralizado:
 *   - El interceptor HTTP lo ENCIENDE cuando sale una petición.
 *   - El interceptor HTTP lo APAGA cuando llega la respuesta (o un error).
 *   - El componente spinner lo OBSERVA para saber si debe mostrarse.
 *
 * El contador `_requestCount` permite manejar peticiones simultáneas:
 *   si hay 3 peticiones en vuelo y termina 1, el spinner NO debe apagarse
 *   todavía porque las otras 2 siguen pendientes.
 */
@Injectable({
  // providedIn: 'root' hace que Angular cree UNA SOLA instancia para toda
  // la app (singleton). Así el interceptor y el spinner hablan con el
  // MISMO objeto — no copias separadas.
  providedIn: 'root',
})
export class LoadingService {
  // Contador interno: cuántas peticiones HTTP están en vuelo ahora mismo.
  // Es privado porque nadie fuera del servicio debe modificarlo directamente.
  private _requestCount = 0;

  // Signal pública (solo lectura desde afuera): true = hay peticiones activas.
  // El componente spinner se suscribe a este signal para renderizarse.
  // Usamos `signal(false)` como valor inicial — al arrancar no hay carga.
  readonly isLoading = signal(false);

  /**
   * Llama este método al INICIO de cada petición HTTP.
   * Incrementa el contador y activa el spinner.
   */
  show(): void {
    this._requestCount++;
    // Solo actualizamos el signal si aún no estaba en true,
    // para evitar renders innecesarios cuando ya había otra petición activa.
    if (!this.isLoading()) {
      this.isLoading.set(true);
    }
  }

  /**
   * Llama este método al FINAL de cada petición HTTP (éxito o error).
   * Decrementa el contador y apaga el spinner solo cuando no quedan peticiones.
   */
  hide(): void {
    // Math.max evita que el contador baje de 0 (defensa contra hide() huérfanos).
    this._requestCount = Math.max(0, this._requestCount - 1);
    if (this._requestCount === 0) {
      this.isLoading.set(false);
    }
  }
}
