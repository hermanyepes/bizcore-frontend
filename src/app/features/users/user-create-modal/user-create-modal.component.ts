import {
  Component,
  inject,
  output,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { UsersService, UserCreatePayload } from '../users.service';

// ---------------------------------------------------------------------------
// UserCreateModalComponent — formulario de CREACIÓN de usuario para modal
//
// DIFERENCIA CLAVE con UserFormComponent:
//
//   UserFormComponent          UserCreateModalComponent
//   ─────────────────          ────────────────────────
//   Vive en una página propia  Vive dentro del ModalComponent
//   Lee la URL (ActivatedRoute) No lee la URL — no la necesita
//   Navega con Router.navigate  Emite output() saved al padre
//   Maneja snackbar interno     El padre maneja el snackbar
//   Tiene modo crear Y editar   Solo modo CREAR
//
// Cuando el backend confirma que el usuario se creó:
//   → this.saved.emit()          (señal al padre: "listo")
//   → el padre cierra el modal, muestra el snackbar y recarga la lista
//
// El componente NO sabe que está dentro de un modal — podría estar en
// cualquier contenedor. Eso lo hace reutilizable.
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-user-create-modal',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [ReactiveFormsModule],
  templateUrl:     './user-create-modal.component.html',
  styleUrl:        './user-create-modal.component.scss',
})
export class UserCreateModalComponent implements OnInit {

  private readonly usersService = inject(UsersService);

  // ── Output ────────────────────────────────────────────────────────────────
  // El padre escucha este evento para saber que la creación fue exitosa.
  // Emite void porque el padre no necesita los datos del usuario creado —
  // solo necesita saber que debe cerrar el modal y recargar la lista.
  readonly saved = output<void>();

  // ── Estados reactivos ─────────────────────────────────────────────────────
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ── FormGroup — solo campos de creación ───────────────────────────────────
  // A diferencia de UserFormComponent, no hay campos de edición (is_active).
  // No hay lógica de disable/enable — todos los campos siempre están activos.
  readonly form = new FormGroup({
    // ── Identificación ───────────────────────────────────────────────────
    document_id:   new FormControl('', [Validators.required, Validators.maxLength(20)]),
    document_type: new FormControl('', [Validators.required, Validators.maxLength(10)]),
    email:         new FormControl('', [Validators.required, Validators.email]),

    // ── Datos personales ─────────────────────────────────────────────────
    full_name: new FormControl('', [Validators.required, Validators.maxLength(80)]),
    phone:     new FormControl<string | null>(null, [Validators.maxLength(15)]),
    city:      new FormControl<string | null>(null, [Validators.maxLength(50)]),

    // ── Acceso ───────────────────────────────────────────────────────────
    role:     new FormControl<'Administrador' | 'Empleado'>('Empleado', [Validators.required]),
    // password sin validators en la declaración — se agregan en ngOnInit
    // para seguir el mismo patrón que UserFormComponent
    password: new FormControl(''),
  });

  // ── ngOnInit — agrega validators a password ───────────────────────────────
  // En CREAR la contraseña es obligatoria. Lo hacemos en ngOnInit (no en la
  // declaración) para seguir el patrón establecido en UserFormComponent.
  ngOnInit(): void {
    this.form.get('password')!.addValidators([
      Validators.required,
      Validators.minLength(8),
    ]);
    this.form.get('password')!.updateValueAndValidity();
  }

  // ── save — se ejecuta al enviar el formulario ─────────────────────────────
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    const v = this.form.value;

    const payload: UserCreatePayload = {
      document_id:   v.document_id!,
      document_type: v.document_type!,
      email:         v.email!,
      full_name:     v.full_name!,
      phone:         v.phone    || null,
      city:          v.city     || null,
      role:          v.role!,
      password:      v.password!,
    };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        // No navegamos, no mostramos snackbar — eso es responsabilidad del padre.
        // Solo avisamos que la operación fue exitosa.
        this.saved.emit();
      },
      error: (err) => {
        // Si hay error del backend (email duplicado, documento existente, etc.)
        // lo mostramos dentro del modal — el usuario debe corregir y reintentar.
        this.serverError.set(err.error?.detail ?? 'Error al crear el usuario.');
        this.isSaving.set(false);
      },
    });
  }
}
