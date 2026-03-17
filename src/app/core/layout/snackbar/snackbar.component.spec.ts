import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal }                    from '@angular/core';

import { SnackbarComponent }              from './snackbar.component';
import { SnackbarService, SnackbarState } from '../../services/snackbar.service';

// ---------------------------------------------------------------------------
// Spec de SnackbarComponent
//
// Qué probamos:
//   1. Creación del componente sin errores.
//   2. El snackbar NO se renderiza cuando visible=false.
//   3. El snackbar SÍ se renderiza cuando visible=true.
//   4. El mensaje correcto aparece en el DOM.
//   5. La clase de tipo correcta se aplica (success / error).
//   6. El icono correcto se muestra según el tipo.
//
// Técnica de mock:
//   El componente solo LEE del servicio — no llama show().
//   Creamos un spy con un Signal mutable (fakeState) que nosotros
//   controlamos desde los tests. Así podemos simular cualquier estado
//   sin esperar timers ni llamar al servicio real.
// ---------------------------------------------------------------------------

describe('SnackbarComponent', () => {
  let fixture:   ComponentFixture<SnackbarComponent>;
  let component: SnackbarComponent;

  // Signal mutable que el spy expone — lo mutamos en cada test
  const fakeState = signal<SnackbarState>({
    message: '',
    type:    'success',
    visible: false,
  });

  // Spy del servicio: solo expone state como un signal de lectura.
  // El componente nunca llama show() — solo lee state().
  const snackbarServiceSpy = {
    state: fakeState.asReadonly(),
  };

  beforeEach(async () => {
    // Resetea el estado antes de cada test para evitar contaminación
    fakeState.set({ message: '', type: 'success', visible: false });

    await TestBed.configureTestingModule({
      imports:   [SnackbarComponent],
      providers: [
        { provide: SnackbarService, useValue: snackbarServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Visibilidad — estado invisible ───────────────────────────────────────
  // El @if del template NO debe renderizar el div cuando visible=false.
  // querySelector devuelve null si el elemento no existe en el DOM.

  it('should NOT render the snackbar element when visible is false', () => {
    const el = fixture.nativeElement.querySelector('.snackbar');
    expect(el).toBeNull();
  });

  // ─── Visibilidad — estado visible ─────────────────────────────────────────
  // Al poner visible=true, el @if debe renderizar el elemento.
  // detectChanges() fuerza a Angular a re-evaluar el template con el nuevo state.

  it('should render the snackbar element when visible is true', () => {
    fakeState.set({ message: 'Producto creado', type: 'success', visible: true });
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.snackbar');
    expect(el).toBeTruthy();
  });

  // ─── Mensaje ───────────────────────────────────────────────────────────────
  // El texto del mensaje debe aparecer en el DOM.

  it('should display the correct message', () => {
    fakeState.set({ message: 'Usuario guardado', type: 'success', visible: true });
    fixture.detectChanges();

    const msgEl = fixture.nativeElement.querySelector('.snackbar__message') as HTMLElement;
    expect(msgEl.textContent?.trim()).toBe('Usuario guardado');
  });

  // ─── Clase de tipo: success ────────────────────────────────────────────────
  // La clase CSS snackbar--success debe estar presente para tipo 'success'.

  it('should apply snackbar--success class for success type', () => {
    fakeState.set({ message: 'OK', type: 'success', visible: true });
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.snackbar') as HTMLElement;
    expect(el.classList.contains('snackbar--success')).toBe(true);
  });

  // ─── Clase de tipo: error ──────────────────────────────────────────────────
  // La clase CSS snackbar--error debe estar presente para tipo 'error'.

  it('should apply snackbar--error class for error type', () => {
    fakeState.set({ message: 'Error', type: 'error', visible: true });
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.snackbar') as HTMLElement;
    expect(el.classList.contains('snackbar--error')).toBe(true);
  });

  // ─── Icono según tipo ──────────────────────────────────────────────────────
  // El icono ✓ debe mostrarse para success, ✕ para error.

  it('should show the checkmark icon for success type', () => {
    fakeState.set({ message: 'OK', type: 'success', visible: true });
    fixture.detectChanges();

    const iconEl = fixture.nativeElement.querySelector('.snackbar__icon') as HTMLElement;
    expect(iconEl.textContent?.trim()).toBe('✓');
  });

  it('should show the cross icon for error type', () => {
    fakeState.set({ message: 'Error', type: 'error', visible: true });
    fixture.detectChanges();

    const iconEl = fixture.nativeElement.querySelector('.snackbar__icon') as HTMLElement;
    expect(iconEl.textContent?.trim()).toBe('✕');
  });
});
