import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent }        from './paginator.component';

// ─── Helper ───────────────────────────────────────────────────────────────────
// setInputs: asigna currentPage y totalPages de una vez y fuerza la detección
// de cambios. Evitar repetir las 3 líneas en cada test.
function setInputs(
  fixture: ComponentFixture<PaginatorComponent>,
  currentPage: number,
  totalPages: number,
): void {
  fixture.componentRef.setInput('currentPage', currentPage);
  fixture.componentRef.setInput('totalPages', totalPages);
  fixture.detectChanges();
}

describe('PaginatorComponent', () => {
  let fixture:   ComponentFixture<PaginatorComponent>;
  let component: PaginatorComponent;
  let el:        HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent],
    }).compileComponents();

    fixture   = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
    el        = fixture.nativeElement;

    // Valores por defecto para que el componente arranque sin errores.
    // La mayoría de tests los sobreescribirá con setInputs().
    setInputs(fixture, 1, 3);
  });

  // ─── Grupo 1: montaje ─────────────────────────────────────────────────────
  // Verifica que el componente existe y que sus inputs son accesibles.
  describe('creation', () => {
    it('should create', () => {
      // Prueba: el componente se instanció sin errores.
      expect(component).toBeTruthy();
    });
  });

  // ─── Grupo 2: visibilidad ─────────────────────────────────────────────────
  // El paginador solo debe mostrarse cuando hay más de una página.
  // Con una página no hay nada que paginar.
  describe('visibility', () => {
    it('should render the nav when totalPages > 1', () => {
      // Precondición: 3 páginas — el @if externo debe dejar pasar el nav.
      setInputs(fixture, 1, 3);
      expect(el.querySelector('nav.paginator')).not.toBeNull();
    });

    it('should NOT render the nav when totalPages is 1', () => {
      // Con una sola página el @if es false — no debe haber nada en el DOM.
      setInputs(fixture, 1, 1);
      expect(el.querySelector('nav.paginator')).toBeNull();
    });

    it('should NOT render the nav when totalPages is 0', () => {
      // Caso borde: 0 páginas (lista vacía en el backend).
      setInputs(fixture, 1, 0);
      expect(el.querySelector('nav.paginator')).toBeNull();
    });
  });

  // ─── Grupo 3: información textual ─────────────────────────────────────────
  // El span central debe mostrar "Página X de Y" con los valores reales.
  describe('page info text', () => {
    it('should display "Página 2 de 5"', () => {
      setInputs(fixture, 2, 5);
      const info = el.querySelector('.paginator__info')?.textContent?.trim();
      expect(info).toBe('Página 2 de 5');
    });

    it('should display "Página 1 de 3" with default inputs', () => {
      // El beforeEach arranca con page=1, total=3.
      const info = el.querySelector('.paginator__info')?.textContent?.trim();
      expect(info).toBe('Página 1 de 3');
    });
  });

  // ─── Grupo 4: estado disabled de los botones ──────────────────────────────
  // Verifica que los botones se deshabilitan correctamente en los extremos
  // para que el usuario no pueda ir a páginas inexistentes.
  describe('button disabled state', () => {
    it('should disable the "previous" button on page 1', () => {
      setInputs(fixture, 1, 3);
      const [prevBtn] = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      // En la primera página no hay página anterior — el botón debe estar deshabilitado.
      expect(prevBtn.disabled).toBe(true);
    });

    it('should enable the "previous" button when not on page 1', () => {
      setInputs(fixture, 2, 3);
      const [prevBtn] = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      expect(prevBtn.disabled).toBe(false);
    });

    it('should disable the "next" button on the last page', () => {
      setInputs(fixture, 3, 3);
      const buttons = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      const nextBtn = buttons[buttons.length - 1];
      // En la última página no hay página siguiente.
      expect(nextBtn.disabled).toBe(true);
    });

    it('should enable the "next" button when not on the last page', () => {
      setInputs(fixture, 2, 3);
      const buttons = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      const nextBtn = buttons[buttons.length - 1];
      expect(nextBtn.disabled).toBe(false);
    });

    it('should disable both buttons when there is only one page', () => {
      // Caso raro: totalPages=1 pero de todas formas verificamos si el nav aparece.
      // Con 1 página el @if lo oculta, así que no hay botones en el DOM.
      setInputs(fixture, 1, 1);
      const buttons = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      expect(buttons.length).toBe(0);
    });
  });

  // ─── Grupo 5: emisión del output ──────────────────────────────────────────
  // Verifica que al hacer clic en los botones el output emite el número
  // de página correcto — y que NO emite cuando el botón está deshabilitado.
  describe('pageChange output', () => {
    it('should emit the next page number when clicking "next"', () => {
      setInputs(fixture, 2, 5);

      // outputFromComponent nos da un array con todos los valores emitidos.
      const emitted: number[] = [];
      component.pageChange.subscribe((p: number) => emitted.push(p));

      const buttons = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      const nextBtn = buttons[buttons.length - 1];
      nextBtn.click();

      // Estamos en la página 2 — al hacer clic en "siguiente" debe emitir 3.
      expect(emitted).toEqual([3]);
    });

    it('should emit the previous page number when clicking "previous"', () => {
      setInputs(fixture, 3, 5);

      const emitted: number[] = [];
      component.pageChange.subscribe((p: number) => emitted.push(p));

      const [prevBtn] = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      prevBtn.click();

      // Estamos en la página 3 — "anterior" debe emitir 2.
      expect(emitted).toEqual([2]);
    });

    it('should NOT emit when clicking a disabled "previous" button', () => {
      // El botón tiene [disabled] — el browser no debería disparar el click,
      // pero verificamos que goTo() tampoco emite fuera de rango.
      setInputs(fixture, 1, 3);

      const emitted: number[] = [];
      component.pageChange.subscribe((p: number) => emitted.push(p));

      // Llamamos goTo directamente con un valor inválido para probar la guardia.
      component.goTo(0);

      expect(emitted).toEqual([]);
    });

    it('should NOT emit when clicking a disabled "next" button', () => {
      setInputs(fixture, 3, 3);

      const emitted: number[] = [];
      component.pageChange.subscribe((p: number) => emitted.push(p));

      // Valor fuera de rango — goTo debe ignorarlo.
      component.goTo(4);

      expect(emitted).toEqual([]);
    });
  });

  // ─── Grupo 6: accesibilidad ───────────────────────────────────────────────
  describe('accessibility', () => {
    it('should have aria-label on the nav element', () => {
      setInputs(fixture, 1, 3);
      const nav = el.querySelector('nav[aria-label="Paginación"]');
      expect(nav).not.toBeNull();
    });

    it('should have aria-label="Página anterior" on the first button', () => {
      setInputs(fixture, 2, 3);
      const [prevBtn] = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      expect(prevBtn.getAttribute('aria-label')).toBe('Página anterior');
    });

    it('should have aria-label="Página siguiente" on the last button', () => {
      setInputs(fixture, 2, 3);
      const buttons = el.querySelectorAll<HTMLButtonElement>('.paginator__btn');
      const nextBtn = buttons[buttons.length - 1];
      expect(nextBtn.getAttribute('aria-label')).toBe('Página siguiente');
    });
  });
});
