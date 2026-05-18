// ============================================================
// BizCore — DashboardComponent
// ============================================================
//
// ANALOGÍA: el dueño del almacén parado frente al tablero.
// Coordina dos tareas:
//   1. Pedirle el resumen al mensajero (DashboardService)
//   2. Pasarle los datos al pintor (Chart.js) para la dona
//
// CICLO DE VIDA RELEVANTE:
//   ngAfterViewInit → el DOM ya existe → el <canvas> está disponible
//   ngOnDestroy     → el usuario navega fuera → destruir el gráfico
//
// ¿Por qué NO usamos ngOnInit para cargar datos?
// Chart.js necesita el <canvas> del HTML. Ese canvas solo existe
// después de que Angular construye el DOM (AfterViewInit).
// Si cargamos datos en ngOnInit y el backend responde muy rápido,
// intentaríamos dibujar sobre un canvas que todavía no existe → error.
// Cargar en ngAfterViewInit garantiza que el canvas siempre está listo.
// ============================================================

import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Chart,
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend,
  type ChartData,
} from 'chart.js';

import { DashboardService }    from './dashboard.service';
import { ChartBuilderService } from './chart-builder.service';
import { DashboardSummary }    from './dashboard.model';

// ------------------------------------------------------------
// Registro de módulos Chart.js (tree-shaking)
// Chart.js v3+ no incluye nada por defecto para reducir el
// tamaño del bundle. Hay que registrar explícitamente solo
// los módulos que vamos a usar:
//   ArcElement         → dibuja los arcos de la dona
//   DoughnutController → sabe cómo construir un gráfico de dona
//   Tooltip            → muestra el tooltip al pasar el mouse
//   Legend             → registrado por convención aunque lo ocultemos
// ------------------------------------------------------------
Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

// ------------------------------------------------------------
// Colores del gráfico — alineados con el dark theme de BizCore.
// Se define fuera de la clase porque es una constante del módulo,
// no un estado del componente.
// El fallback '#6b7280' (gris) cubre cualquier estado inesperado.
// ------------------------------------------------------------
const CHART_COLORS: Record<string, string> = {
  PENDIENTE:  '#f59e0b', // ámbar  — acento principal de BizCore
  EN_PROCESO: '#3b82f6', // azul
  ENTREGADO:  '#10b981', // verde
  CANCELADO:  '#ef4444', // rojo
};


@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {

  private readonly dashboardService  = inject(DashboardService);
  private readonly chartBuilder      = inject(ChartBuilderService);
  // ChangeDetectorRef: fuerza un re-render síncrono del template.
  // Necesario para que @if (summary()) muestre el <canvas> antes
  // de que renderChart() intente accederlo via ViewChild.
  private readonly cdr               = inject(ChangeDetectorRef);

  // --- Signals de estado ---
  summary      = signal<DashboardSummary | null>(null);
  isLoading    = signal(true);
  error        = signal<string | null>(null);
  accessDenied = signal(false);

  // ------------------------------------------------------------
  // chartColors — exposición pública de CHART_COLORS para el template.
  // El template no puede acceder a constantes del módulo directamente,
  // solo a propiedades de la clase. readonly porque nunca debe cambiar.
  // ------------------------------------------------------------
  readonly chartColors = CHART_COLORS;

  // ------------------------------------------------------------
  // computed: convierte orders_by_status (objeto) en array
  // para poder usar @for en el template sin el pipe keyvalue.
  //
  // ANALOGÍA: computed es la calculadora automática — cada vez
  // que summary() cambia, orderEntries se recalcula solo.
  //
  // Resultado: [{ key: 'PENDIENTE', value: 8 }, ...]
  // ------------------------------------------------------------
  orderEntries = computed(() => {
    const data = this.summary();
    if (!data) return [];
    return Object.entries(data.orders_by_status)
      .map(([key, value]) => ({ key, value }));
  });

  // ------------------------------------------------------------
  // ViewChild: le dice a Angular "dame la referencia al elemento
  // del HTML que tiene la variable de referencia #ordersChart".
  //
  // ElementRef<HTMLCanvasElement> es el tipo exacto del elemento
  // — un <canvas>. El ! le dice a TypeScript "esto existirá en
  // el momento que lo uses, confía en mí" (non-null assertion).
  // ------------------------------------------------------------
  @ViewChild('ordersChart')
  private chartCanvas!: ElementRef<HTMLCanvasElement>;

  // Guardamos la instancia del gráfico para destruirla en ngOnDestroy.
  // Empieza en null porque el gráfico no existe hasta que llegan los datos.
  private chart: Chart | null = null;


  // ------------------------------------------------------------
  // ngAfterViewInit
  // Se ejecuta UNA VEZ después de que Angular termina de construir
  // el DOM. Es el primer momento en que chartCanvas está disponible.
  // ------------------------------------------------------------
  ngAfterViewInit(): void {
    this.loadData();
  }


  // ------------------------------------------------------------
  // ngOnDestroy
  // Se ejecuta cuando el usuario navega a otra ruta y Angular
  // destruye este componente.
  //
  // ¿Por qué hay que destruir el gráfico manualmente?
  // Chart.js registra listeners de eventos en el canvas y guarda
  // referencias internas. Si no llamamos destroy(), esos recursos
  // permanecen en memoria aunque el componente ya no exista
  // → memory leak que se acumula cada vez que el usuario visita
  // y sale del dashboard.
  //
  // El ?. (optional chaining) evita errores si el usuario navega
  // antes de que los datos lleguen y el gráfico nunca se creó.
  // ------------------------------------------------------------
  ngOnDestroy(): void {
    this.chart?.destroy();
  }


  // ------------------------------------------------------------
  // loadData (privado)
  // Llama al service, actualiza las signals y, si todo sale bien,
  // le pasa los datos a renderChart().
  // ------------------------------------------------------------
  private loadData(): void {
    this.dashboardService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
        // El canvas vive dentro de @if (summary()). Tras summary.set(),
        // Angular todavía no re-renderizó el template → el canvas no existe.
        // detectChanges() fuerza el re-render síncrono antes de pintar.
        this.cdr.detectChanges();
        this.renderChart(data);
      },
      error: (err) => {
        this.isLoading.set(false);
        // 403: el Empleado no tiene permiso (matriz-permisos.md sección 2.6).
        // Mostramos mensaje específico en vez del error genérico.
        if (err.status === 403) {
          this.accessDenied.set(true);
        } else {
          this.error.set('No se pudo cargar el resumen del negocio.');
        }
      },
    });
  }


  // ------------------------------------------------------------
  // renderChart (privado)
  // Construye el gráfico de dona con Chart.js.
  //
  // Pasos:
  //   1. Extraer labels (nombres de estados) y values (conteos)
  //   2. Asignar colores según CHART_COLORS
  //   3. Crear la instancia Chart sobre el canvas nativo
  //
  // nativeElement: ElementRef es el envoltorio Angular.
  // nativeElement es el elemento DOM real que Chart.js entiende.
  // ------------------------------------------------------------
  private renderChart(data: DashboardSummary): void {
    const labels = Object.keys(data.orders_by_status);
    const values = Object.values(data.orders_by_status);
    const colors = labels.map(label => CHART_COLORS[label] ?? '#6b7280');

    const chartData: ChartData<'doughnut'> = {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     colors,
        borderWidth:     2,
        hoverOffset:     8, // la rebanada se separa 8px al pasar el mouse
      }],
    };

    // ChartBuilderService envuelve new Chart() para que sea reemplazable en tests.
    this.chart = this.chartBuilder.createDoughnut(
      this.chartCanvas.nativeElement,
      chartData,
      {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: { label: string; parsed: number }) =>
                ` ${ctx.label}: ${ctx.parsed} pedidos`,
            },
          },
        },
      },
    );
  }
}
