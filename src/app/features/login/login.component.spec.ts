import { TestBed } from '@angular/core/testing';
import { provideRouter, Router }    from '@angular/router';
import { of, throwError }           from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService }    from '../../core/auth/auth.service';

// ─── AuthService falso (mock) ─────────────────────────────────────────────────
// No queremos llamadas HTTP reales en los tests del componente.
// Creamos un objeto que imita la forma del AuthService real con funciones falsas.
// vi.fn() crea una función vacía que registra cuántas veces fue llamada y con qué argumentos.
const authServiceMock = {
  login: vi.fn(),
};
// ─────────────────────────────────────────────────────────────────────────────

describe('LoginComponent', () => {
  let component: LoginComponent;
  let router: Router;

  beforeEach(async () => {
    // Reiniciamos el mock antes de cada test para evitar residuos entre tests
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      // Importamos el componente standalone directamente — no necesita NgModule
      imports: [LoginComponent],
      providers: [
        // Rutas mínimas para que Router funcione en los tests
        provideRouter([{ path: 'dashboard', component: LoginComponent }]),
        // Reemplazamos el AuthService real por el mock
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    const fixture  = TestBed.createComponent(LoginComponent);
    component      = fixture.componentInstance;
    router         = TestBed.inject(Router);

    fixture.detectChanges(); // inicializa el componente
  });

  // ─── Estado inicial ────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an invalid form', () => {
    // Los campos están vacíos al inicio — el formulario debe ser inválido
    expect(component.form.invalid).toBe(true);
  });

  it('should start with isLoading = false', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should start with no error message', () => {
    expect(component.errorMessage()).toBeNull();
  });

  // ─── Validaciones del formulario ──────────────────────────────────────────

  it('should mark email as invalid when empty', () => {
    component.emailControl.setValue('');
    expect(component.emailControl.hasError('required')).toBe(true);
  });

  it('should mark email as invalid when format is wrong', () => {
    component.emailControl.setValue('esto-no-es-un-email');
    expect(component.emailControl.hasError('email')).toBe(true);
  });

  it('should mark email as valid when format is correct', () => {
    component.emailControl.setValue('admin@bizcore.com');
    expect(component.emailControl.valid).toBe(true);
  });

  it('should mark password as invalid when shorter than 8 characters', () => {
    component.passwordControl.setValue('abc');
    expect(component.passwordControl.hasError('minlength')).toBe(true);
  });

  it('should mark password as valid when 8 or more characters', () => {
    component.passwordControl.setValue('Admin1234');
    expect(component.passwordControl.valid).toBe(true);
  });

  // ─── onSubmit con formulario inválido ─────────────────────────────────────

  it('should NOT call auth.login if the form is invalid', () => {
    // El formulario está vacío (inválido) — onSubmit no debe llamar al servicio
    component.onSubmit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('should mark all fields as touched when submitting invalid form', () => {
    component.onSubmit();
    // Todos los campos deben quedar "touched" para mostrar sus errores
    expect(component.emailControl.touched).toBe(true);
    expect(component.passwordControl.touched).toBe(true);
  });

  // ─── onSubmit con credenciales correctas (happy path) ─────────────────────

  it('should navigate to /dashboard after successful login', () => {
    // of() es síncrono — el subscribe se ejecuta en el mismo instante, sin tick()
    authServiceMock.login.mockReturnValue(of({ access_token: 'tok', refresh_token: 'ref' }));

    const navigateSpy = vi.spyOn(router, 'navigate');

    component.emailControl.setValue('admin@bizcore.com');
    component.passwordControl.setValue('Admin1234');

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isLoading()).toBe(false);
  });

  // ─── onSubmit con credenciales incorrectas ────────────────────────────────

  it('should show "Correo o contraseña incorrectos" on 401 error', () => {
    // throwError() también es síncrono — el error callback se ejecuta de inmediato
    authServiceMock.login.mockReturnValue(
      throwError(() => ({ status: 401 }))
    );

    component.emailControl.setValue('admin@bizcore.com');
    component.passwordControl.setValue('WrongPass1');

    component.onSubmit();

    expect(component.errorMessage()).toBe('Correo o contraseña incorrectos.');
    expect(component.isLoading()).toBe(false);
  });

  it('should show generic error message on non-401 error', () => {
    // Simulamos un error 500 (fallo del servidor)
    authServiceMock.login.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    component.emailControl.setValue('admin@bizcore.com');
    component.passwordControl.setValue('Admin1234');

    component.onSubmit();

    expect(component.errorMessage()).toBe('Error al conectar con el servidor. Intenta de nuevo.');
    expect(component.isLoading()).toBe(false);
  });

  // ─── togglePassword ───────────────────────────────────────────────────────

  it('should toggle showPassword signal', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePassword();
    expect(component.showPassword()).toBe(true);
    component.togglePassword();
    expect(component.showPassword()).toBe(false);
  });
});
