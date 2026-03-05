import { Component, inject, signal }        from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router }                            from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  // ReactiveFormsModule: necesario para usar [formGroup] y formControlName en el template
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent {

  // Inyecciones — dependencias que este componente necesita
  private readonly fb      = inject(FormBuilder); // fábrica de formularios reactivos
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);

  // -----------------------------------------------------------------------
  // El formulario reactivo — definido completamente en TypeScript
  // FormBuilder.group() crea un FormGroup con dos FormControl internos
  // -----------------------------------------------------------------------
  readonly form = this.fb.group({
    // Cada campo: [valor_inicial, [validadores...]]
    email: [
      '',
      [
        Validators.required,            // no puede estar vacío
        Validators.email,               // debe tener formato de email
      ],
    ],
    password: [
      '',
      [
        Validators.required,            // no puede estar vacío
        Validators.minLength(8),        // mínimo 8 caracteres
      ],
    ],
  });

  // -----------------------------------------------------------------------
  // Estado de la UI — Signals para reflejar cambios en el template
  // -----------------------------------------------------------------------

  // true mientras esperamos respuesta del backend
  readonly isLoading = signal(false);

  // Mensaje de error que se muestra si el login falla (credenciales incorrectas, red caída)
  readonly errorMessage = signal<string | null>(null);

  // true = mostrar contraseña como texto, false = ocultar con puntos
  readonly showPassword = signal(false);

  // -----------------------------------------------------------------------
  // Getters de conveniencia — acceden al FormControl de cada campo
  // Usados en el template para leer el estado de validación de cada campo
  // -----------------------------------------------------------------------

  get emailControl()    { return this.form.controls.email;    }
  get passwordControl() { return this.form.controls.password; }

  // -----------------------------------------------------------------------
  // onSubmit — se llama cuando el usuario hace clic en "Ingresar"
  // -----------------------------------------------------------------------
  onSubmit(): void {
    // Seguro de doble validación: si el formulario no es válido, no hacemos nada.
    // Esto cubre el caso de que alguien llame onSubmit() sin pasar por el botón.
    if (this.form.invalid) {
      // markAllAsTouched() activa los mensajes de error en TODOS los campos
      // (normalmente los errores se muestran solo cuando el usuario tocó el campo)
      this.form.markAllAsTouched();
      return;
    }

    // Limpiamos errores previos y activamos el estado de carga
    this.errorMessage.set(null);
    this.isLoading.set(true);

    // form.value puede tener nulls si los campos están deshabilitados,
    // por eso usamos el cast con 'as'
    const credentials = this.form.value as { email: string; password: string };

    // Llamamos al AuthService — él retorna un Observable
    // subscribe() es donde realmente se ejecuta la petición HTTP
    this.auth.login(credentials).subscribe({
      // next: se ejecuta cuando el backend responde con éxito (200 OK)
      next: () => {
        this.isLoading.set(false);
        // Redirigimos al dashboard — el guard de las rutas internas verificará el token
        this.router.navigate(['/dashboard']);
      },
      // error: se ejecuta si el backend responde con error (401, 422, 500) o sin red
      error: (err) => {
        this.isLoading.set(false);
        // 401 = credenciales incorrectas, cualquier otro = problema inesperado
        if (err.status === 401) {
          this.errorMessage.set('Correo o contraseña incorrectos.');
        } else {
          this.errorMessage.set('Error al conectar con el servidor. Intenta de nuevo.');
        }
      },
    });
  }

  // Alterna visibilidad de la contraseña entre texto plano y puntos
  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
