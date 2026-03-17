import { TestBed }              from '@angular/core/testing';
import { ConfirmDialogService } from './confirm-dialog.service';

// ---------------------------------------------------------------------------
// Spec del ConfirmDialogService
//
// Qué probamos:
//   1. Estado inicial — el diálogo debe nacer invisible.
//   2. confirm() — pone el diálogo visible con el mensaje correcto.
//   3. confirm() — devuelve una Promise (no un Observable ni un valor directo).
//   4. answer(true)  — resuelve la Promise con true y cierra el diálogo.
//   5. answer(false) — resuelve la Promise con false y cierra el diálogo.
//
// Técnica para probar Promises:
//   Los tests son 'async' y usan 'await' igual que el código de producción.
//   await promise espera a que la Promise se resuelva antes de hacer el expect.
// ---------------------------------------------------------------------------

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Estado inicial ────────────────────────────────────────────────────────
  // El diálogo no debe mostrarse al arrancar la app.

  it('should start with visible=false', () => {
    expect(service.state().visible).toBe(false);
  });

  // ─── confirm() — visibilidad y mensaje ────────────────────────────────────
  // Al llamar confirm(), el estado debe reflejar el mensaje y estar visible.
  // Luego llamamos answer() para no dejar la Promise sin resolver (limpieza).

  it('should set visible=true with the correct message when confirm() is called', () => {
    service.confirm('¿Desactivar proveedor?');

    expect(service.state().visible).toBe(true);
    expect(service.state().message).toBe('¿Desactivar proveedor?');

    service.answer(false); // limpieza — resuelve la Promise para no dejar colgada
  });

  // ─── confirm() — devuelve una Promise ─────────────────────────────────────
  // El tipo de retorno importa: el código de producción usa 'await confirm()'.
  // Si devolviera un Observable o un valor síncrono, el await no funcionaría.

  it('should return a Promise', () => {
    const result = service.confirm('¿Confirmar?');

    expect(result).toBeInstanceOf(Promise);

    service.answer(false); // limpieza
  });

  // ─── answer(true) ─────────────────────────────────────────────────────────
  // El test es async porque necesita 'await' para esperar la Promise.
  // Flujo: confirm() crea la Promise → answer(true) la resuelve → await la recibe.

  it('should resolve the Promise with true when answer(true) is called', async () => {
    const promise = service.confirm('¿Confirmar?');

    service.answer(true); // resuelve la Promise

    const result = await promise; // espera el valor
    expect(result).toBe(true);
  });

  it('should hide the dialog after answer(true)', async () => {
    const promise = service.confirm('¿Confirmar?');
    service.answer(true);
    await promise; // esperamos para que el estado se actualice

    expect(service.state().visible).toBe(false);
  });

  // ─── answer(false) ────────────────────────────────────────────────────────
  // Mismo flujo pero con false — el usuario canceló.

  it('should resolve the Promise with false when answer(false) is called', async () => {
    const promise = service.confirm('¿Confirmar?');

    service.answer(false);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('should hide the dialog after answer(false)', async () => {
    const promise = service.confirm('¿Confirmar?');
    service.answer(false);
    await promise;

    expect(service.state().visible).toBe(false);
  });
});
