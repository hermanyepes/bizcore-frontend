import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/**
 * Paginador reutilizable.
 *
 * Recibe la página actual y el total de páginas desde el componente padre,
 * y emite el número de página al que el usuario quiere ir.
 *
 * No sabe nada sobre HTTP, servicios ni modelos — solo renderiza controles
 * y comunica la intención del usuario hacia afuera.
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {

  // ─── Inputs ───────────────────────────────────────────────────────────────
  // input.required<T>() = el padre DEBE pasar este valor; el componente
  // no arranca sin él. Son Signals de solo lectura desde dentro del componente.

  /** Página que está visible ahora mismo (empieza en 1). */
  currentPage = input.required<number>();

  /** Cuántas páginas existen en total. */
  totalPages = input.required<number>();

  // ─── Output ───────────────────────────────────────────────────────────────
  // output<T>() reemplaza a EventEmitter en componentes modernos.
  // El padre escucha con (pageChange)="miMetodo($event)".

  /** Emite el número de página absoluto al que el usuario quiere navegar. */
  pageChange = output<number>();

  // ─── Métodos ──────────────────────────────────────────────────────────────

  /**
   * Navega a una página específica.
   * Ignora peticiones fuera del rango [1, totalPages] para evitar
   * que el padre reciba un número inválido.
   */
  goTo(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageChange.emit(page);
  }
}
