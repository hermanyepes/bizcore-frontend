import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent }   from './loading-spinner.component';
import { LoadingService }            from '../../services/loading.service';

describe('LoadingSpinnerComponent', () => {
  let fixture: ComponentFixture<LoadingSpinnerComponent>;
  let loadingService: LoadingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Como es standalone, se importa directamente — no hay NgModule que lo declare.
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture       = TestBed.createComponent(LoadingSpinnerComponent);
    // Obtenemos la MISMA instancia del servicio que usa el componente.
    // TestBed.inject busca en el árbol de providers igual que inject() en el componente.
    loadingService = TestBed.inject(LoadingService);

    fixture.detectChanges();
  });

  // ─── Grupo 1: montaje básico ──────────────────────────────────────────────
  describe('creation', () => {
    it('should create', () => {
      // Prueba: el componente se instancia sin errores.
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  // ─── Grupo 2: visibilidad según el signal ─────────────────────────────────
  describe('visibility', () => {
    it('should not render the overlay when isLoading is false', () => {
      // Precondición: el signal empieza en false (valor por defecto del servicio).
      loadingService.isLoading.set(false);
      fixture.detectChanges();

      // El @if debe haber eliminado el nodo del DOM.
      const overlay = fixture.nativeElement.querySelector('.spinner-overlay');
      expect(overlay).toBeNull();
    });

    it('should render the overlay when isLoading is true', () => {
      // Acción: encendemos el signal desde el servicio — igual que haría el interceptor.
      loadingService.isLoading.set(true);
      fixture.detectChanges();

      // El @if debe haber insertado el nodo en el DOM.
      const overlay = fixture.nativeElement.querySelector('.spinner-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should remove the overlay when isLoading goes back to false', () => {
      // Encendemos primero
      loadingService.isLoading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.spinner-overlay')).not.toBeNull();

      // Luego apagamos — simula que la petición HTTP terminó
      loadingService.isLoading.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.spinner-overlay')).toBeNull();
    });
  });

  // ─── Grupo 3: accesibilidad ───────────────────────────────────────────────
  describe('accessibility', () => {
    beforeEach(() => {
      // Activamos el spinner para que el overlay esté en el DOM
      loadingService.isLoading.set(true);
      fixture.detectChanges();
    });

    it('should have role="status" for screen readers', () => {
      // Los lectores de pantalla usan role="status" para anunciar
      // actualizaciones sin interrumpir al usuario.
      const overlay = fixture.nativeElement.querySelector('[role="status"]');
      expect(overlay).not.toBeNull();
    });

    it('should have an aria-label describing the loading state', () => {
      // El aria-label permite que el lector de pantalla diga "Cargando..."
      // cuando el overlay aparece en pantalla.
      const overlay = fixture.nativeElement.querySelector('[aria-label="Cargando..."]');
      expect(overlay).not.toBeNull();
    });
  });
});
