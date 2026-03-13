// ============================================================
// BizCore — ChartBuilderService
// ============================================================
//
// ¿Por qué existe este service?
// `new Chart(canvas, config)` necesita un <canvas> real con contexto
// WebGL/2D. JSDOM (el DOM virtual de los tests) no lo tiene.
//
// Si DashboardComponent llamara `new Chart()` directamente, no
// habría forma de reemplazarlo en los tests usando Angular TestBed
// (que no permite vi.mock sobre imports de módulos externos).
//
// Solución: envolver la creación del gráfico en un service injectable.
// En tests, Angular reemplaza este service por un spy con useValue.
// El componente nunca sabe si está hablando con Chart.js real o el doble.
// ============================================================

import { Injectable }            from '@angular/core';
import { Chart, type ChartData } from 'chart.js';


@Injectable({
  providedIn: 'root',
})
export class ChartBuilderService {

  // Crea un gráfico de dona sobre el canvas recibido y lo devuelve.
  // El llamador es responsable de destruirlo con chart.destroy().
  createDoughnut(
    canvas:  HTMLCanvasElement,
    data:    ChartData<'doughnut'>,
    options: object,
  ): Chart<'doughnut'> {
    return new Chart<'doughnut'>(canvas, {
      type: 'doughnut',
      data,
      options,
    });
  }
}
