import { Pipe, PipeTransform } from '@angular/core';

/**
 * CurrencyCopPipe — filtro de tubería para formatear precios en pesos colombianos.
 *
 * Analogía: es el filtro instalado en la tubería de la casa.
 * El agua (número crudo) entra sucia y sale limpia (texto formateado)
 * para CUALQUIER grifo (componente) que lo solicite.
 *
 * Uso en template:  {{ product.price | currencyCop }}
 * Resultado:        $ 15.000
 */
@Pipe({
  name: 'currencyCop', // nombre que se escribe en el template después del pipe "|"
  standalone: true,    // no necesita declararse en un NgModule; se importa directo
  pure: true,          // Angular solo recalcula si el valor de entrada cambia (optimización)
})
export class CurrencyCopPipe implements PipeTransform {
  /**
   * transform — el único método requerido por la interfaz PipeTransform.
   *
   * Angular lo llama automáticamente cuando detecta "valor | currencyCop" en el template.
   *
   * @param value  El número a formatear (ej: 15000)
   * @returns      Cadena formateada en pesos colombianos (ej: "$ 15.000")
   */
  transform(value: number): string {
    return value.toLocaleString('es-CO', {
      style:                 'currency', // indica que es un valor monetario
      currency:              'COP',      // peso colombiano
      minimumFractionDigits: 0,          // sin centavos
      maximumFractionDigits: 0,          // sin centavos
    });
  }
}
