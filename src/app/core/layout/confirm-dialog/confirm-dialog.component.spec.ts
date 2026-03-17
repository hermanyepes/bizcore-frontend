import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal }                    from '@angular/core';

import { ConfirmDialogComponent }              from './confirm-dialog.component';
import { ConfirmDialogService }                from '../../services/confirm-dialog.service';

// ---------------------------------------------------------------------------
// Spec de ConfirmDialogComponent
//
// Qué probamos:
//   1. Creación del componente sin errores.
//   2. El diálogo NO se renderiza cuando visible=false.
//   3. El diálogo SÍ se renderiza cuando visible=true.
//   4. El mensaje correcto aparece en el DOM.
//   5. Clic en "Confirmar" llama answer(true).
//   6. Clic en "Cancelar"  llama answer(false).
//   7. Clic en el overlay  llama answer(false).
//
// Técnica de mock:
//   Mismo patrón que SnackbarComponent:
//   - fakeState = Signal mutable que controlamos en los tests.
//   - confirmServiceSpy.answer = vi.fn() para verificar que se llama correctamente.
// ---------------------------------------------------------------------------

describe('ConfirmDialogComponent', () => {
  let fixture:   ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  // Signal mutable para controlar el estado del diálogo en cada test
  const fakeState = signal({ message: '', visible: false });

  // Spy del servicio: state como signal de lectura + answer como función espía
  const confirmServiceSpy = {
    state:  fakeState.asReadonly(),
    answer: vi.fn(),
  };

  beforeEach(async () => {
    // Resetea el estado y los spies antes de cada test
    fakeState.set({ message: '', visible: false });
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports:   [ConfirmDialogComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Visibilidad — estado invisible ───────────────────────────────────────
  // Cuando visible=false el overlay no debe existir en el DOM.

  it('should NOT render the dialog when visible is false', () => {
    const overlay = fixture.nativeElement.querySelector('.confirm-overlay');
    expect(overlay).toBeNull();
  });

  // ─── Visibilidad — estado visible ─────────────────────────────────────────
  // Cuando visible=true el overlay y la tarjeta deben aparecer.

  it('should render the dialog when visible is true', () => {
    fakeState.set({ message: '¿Confirmar?', visible: true });
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.confirm-overlay');
    expect(overlay).toBeTruthy();
  });

  // ─── Mensaje ───────────────────────────────────────────────────────────────
  // El texto del mensaje debe aparecer dentro de la tarjeta.

  it('should display the correct message', () => {
    fakeState.set({ message: '¿Desactivar proveedor?', visible: true });
    fixture.detectChanges();

    const msgEl = fixture.nativeElement.querySelector('.confirm-dialog__message') as HTMLElement;
    expect(msgEl.textContent?.trim()).toBe('¿Desactivar proveedor?');
  });

  // ─── Botón Confirmar ───────────────────────────────────────────────────────
  // Al hacer clic en "Confirmar", debe llamar answer(true).

  it('should call answer(true) when the confirm button is clicked', () => {
    fakeState.set({ message: '¿Confirmar?', visible: true });
    fixture.detectChanges();

    // Buscamos el botón peligroso (btn--danger = Confirmar)
    const confirmBtn = fixture.nativeElement.querySelector('.btn--danger') as HTMLButtonElement;
    confirmBtn.click();

    expect(confirmServiceSpy.answer).toHaveBeenCalledWith(true);
  });

  // ─── Botón Cancelar ────────────────────────────────────────────────────────
  // Al hacer clic en "Cancelar", debe llamar answer(false).

  it('should call answer(false) when the cancel button is clicked', () => {
    fakeState.set({ message: '¿Confirmar?', visible: true });
    fixture.detectChanges();

    // Buscamos el botón secundario (btn--secondary = Cancelar)
    const cancelBtn = fixture.nativeElement.querySelector('.btn--secondary') as HTMLButtonElement;
    cancelBtn.click();

    expect(confirmServiceSpy.answer).toHaveBeenCalledWith(false);
  });

  // ─── Clic en el overlay ────────────────────────────────────────────────────
  // El usuario puede "escapar" haciendo clic en el fondo semitransparente.
  // Ese clic también debe llamar answer(false) — equivale a cancelar.

  it('should call answer(false) when the overlay background is clicked', () => {
    fakeState.set({ message: '¿Confirmar?', visible: true });
    fixture.detectChanges();

    // Hacemos clic directamente en el overlay (no en el diálogo hijo)
    const overlay = fixture.nativeElement.querySelector('.confirm-overlay') as HTMLElement;
    overlay.click();

    expect(confirmServiceSpy.answer).toHaveBeenCalledWith(false);
  });
});
