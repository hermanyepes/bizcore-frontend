import { TestBed }        from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

// ---------------------------------------------------------------------------
// Spec del SnackbarService
//
// Qué probamos:
//   1. Estado inicial — el snackbar debe nacer invisible.
//   2. show() básico   — mensaje, tipo, visible.
//   3. Defaults        — type='success' y duration=3500 cuando no se pasan.
//   4. Auto-dismiss    — después del tiempo configurado, visible vuelve a false.
//   5. Reemplazo       — un segundo show() cancela el timer del primero.
//
// Técnica para los timers:
//   vi.useFakeTimers() congela el reloj del navegador.
//   vi.advanceTimersByTime(N) avanza el reloj N ms sin esperar tiempo real.
//   Así podemos probar el auto-dismiss en microsegundos, no en 3.5 segundos.
// ---------------------------------------------------------------------------

describe('SnackbarService', () => {
  let service: SnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnackbarService);
  });

  afterEach(() => {
    // Restaura el reloj real y limpia timers pendientes después de cada test
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  // ─── Creación ──────────────────────────────────────────────────────────────
  // Verifica que Angular puede inyectar el servicio sin errores.

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Estado inicial ────────────────────────────────────────────────────────
  // El snackbar no debe mostrarse al arrancar la app.

  it('should start with visible=false', () => {
    expect(service.state().visible).toBe(false);
  });

  // ─── show() — mensaje y tipo ───────────────────────────────────────────────
  // Después de llamar show(), el state debe reflejar el mensaje y ser visible.

  it('should set visible=true with the correct message after show()', () => {
    service.show('Producto guardado');

    expect(service.state().visible).toBe(true);
    expect(service.state().message).toBe('Producto guardado');
  });

  it('should default to type "success" when no type is passed', () => {
    service.show('OK');

    expect(service.state().type).toBe('success');
  });

  it('should respect an explicit type when passed', () => {
    service.show('Error al conectar', 'error');

    expect(service.state().type).toBe('error');
  });

  // ─── Auto-dismiss ──────────────────────────────────────────────────────────
  // Después de la duración configurada, visible debe volver a false.
  // Usamos reloj falso para no esperar 3.5 segundos reales.

  it('should auto-dismiss after the configured duration', () => {
    vi.useFakeTimers();

    service.show('Guardado', 'success', 3500);
    expect(service.state().visible).toBe(true); // antes del tiempo: visible

    vi.advanceTimersByTime(3500); // avanzamos el reloj 3.5 segundos

    expect(service.state().visible).toBe(false); // después: invisible
  });

  it('should still be visible before the duration elapses', () => {
    vi.useFakeTimers();

    service.show('Guardado', 'success', 3500);
    vi.advanceTimersByTime(3499); // un ms antes del dismiss

    expect(service.state().visible).toBe(true); // todavía visible
  });

  // ─── Reemplazo de snackbar ─────────────────────────────────────────────────
  // Si show() se llama dos veces, el primer timer debe cancelarse.
  // El segundo snackbar debe durar sus propios 3.5s desde que fue creado.
  //
  // Escenario:
  //   t=0:    show("Primera") — arranca timer de 3.5s
  //   t=1000: show("Segunda") — cancela el timer anterior, arranca nuevo
  //   t=3499: (el primer timer hubiera disparado) — el snackbar sigue visible
  //   t=4500: (3.5s desde "Segunda") — ahora sí desaparece

  it('should cancel the previous timer when show() is called again', () => {
    vi.useFakeTimers();

    service.show('Primera', 'success', 3500);
    vi.advanceTimersByTime(1000); // pasa 1 segundo

    service.show('Segunda', 'error', 3500); // segundo snackbar

    vi.advanceTimersByTime(2600); // el timer original hubiera disparado aquí (t=3600 > 3500)
    expect(service.state().visible).toBe(true);  // sigue visible — el timer se canceló
    expect(service.state().message).toBe('Segunda');

    vi.advanceTimersByTime(1000); // t=4600 — 3.5s desde el segundo show()
    expect(service.state().visible).toBe(false); // ahora sí desaparece
  });
});
