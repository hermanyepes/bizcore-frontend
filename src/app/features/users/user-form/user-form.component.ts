import { Component, inject, signal, OnInit }          from '@angular/core';
import { FormGroup, FormControl, Validators,
         ReactiveFormsModule }                         from '@angular/forms';
import { ActivatedRoute, Router, RouterLink }          from '@angular/router';

import { UsersService, UserCreatePayload,
         UserUpdatePayload }                           from '../users.service';

// ---------------------------------------------------------------------------
// UserFormComponent
//
// ANALOGÍA: es como una ficha de empleado que sirve para dos situaciones:
//   - Contratar a alguien nuevo (modo CREAR): todos los campos vacíos,
//     incluidos cédula, tipo de documento y correo.
//   - Actualizar datos de alguien que ya existe (modo EDITAR): la ficha
//     viene pre-llenada y algunos campos están bloqueados (cédula, correo)
//     porque el empleado ya está registrado y no se pueden cambiar.
//
// El mismo papel (componente), dos usos distintos. El componente detecta
// en qué situación está leyendo la URL:
//   /users/new         → paramMap.get('id') es null  → CREAR
//   /users/CC-123/edit → paramMap.get('id') es string → EDITAR
// ---------------------------------------------------------------------------

@Component({
  selector:    'app-user-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html',
  styleUrl:    './user-form.component.scss',
})
export class UserFormComponent implements OnInit {

  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly usersService = inject(UsersService);

  // ---------------------------------------------------------------------------
  // Detección de modo
  //
  // snapshot.paramMap es una foto instantánea de los parámetros en el momento
  // en que se crea el componente. A diferencia de paramMap (Observable), no
  // emite actualizaciones — pero para un formulario está bien: el modo no
  // cambia mientras el usuario está en la página.
  //
  // /users/new         → get('id') === null  → isEditMode = false
  // /users/CC-123/edit → get('id') === 'CC-123' → isEditMode = true
  // ---------------------------------------------------------------------------
  readonly documentId  = this.route.snapshot.paramMap.get('id');
  readonly isEditMode  = this.documentId !== null;

  // ---------------------------------------------------------------------------
  // Estados reactivos del componente
  //
  // isLoading: true mientras cargamos los datos del usuario (solo modo editar)
  // isSaving:  true mientras esperamos respuesta del servidor al guardar
  // serverError: mensaje de error del backend (null si no hay error)
  // ---------------------------------------------------------------------------
  readonly isLoading   = signal(false);
  readonly isSaving    = signal(false);
  readonly serverError = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // FormGroup — la "carpeta" que agrupa todos los campos del formulario
  //
  // Cada FormControl recibe:
  //   1. El valor inicial (string vacío, null, etc.)
  //   2. Un array de Validators — las reglas que debe cumplir
  //
  // Los campos document_id, document_type y email están aquí para CREAR.
  // En modo EDITAR los deshabilitamos en ngOnInit (disable() los excluye
  // de form.value pero los mantiene en el DOM para mostrar los datos).
  //
  // password: en CREAR es obligatoria (mínimo 8 caracteres).
  //           en EDITAR es opcional — si se deja vacía, la contraseña
  //           actual no cambia.
  // ---------------------------------------------------------------------------
  readonly form = new FormGroup({
    // ── Campos solo activos en modo CREAR ────────────────────────────────────
    document_id:   new FormControl('',       [Validators.required, Validators.maxLength(20)]),
    document_type: new FormControl('',       [Validators.required, Validators.maxLength(10)]),
    email:         new FormControl('',       [Validators.required, Validators.email]),

    // ── Campos editables en AMBOS modos ──────────────────────────────────────
    full_name:     new FormControl('',       [Validators.required, Validators.maxLength(80)]),
    phone:         new FormControl<string | null>(null, [Validators.maxLength(15)]),
    city:          new FormControl<string | null>(null, [Validators.maxLength(50)]),
    role:          new FormControl<'Administrador' | 'Empleado'>('Empleado', [Validators.required]),

    // is_active: solo visible/relevante en modo EDITAR.
    // Al crear, el usuario nace activo por defecto (lo define el backend).
    is_active:     new FormControl(true),

    // password sin validators aquí — se agregan condicionalmente en ngOnInit
    password:      new FormControl(''),
  });

  // ---------------------------------------------------------------------------
  // ngOnInit — se ejecuta una vez, después de que Angular crea el componente
  //
  // Aquí configuramos el formulario según el modo detectado:
  //   CREAR: agrega validators obligatorios a password
  //   EDITAR: deshabilita campos inmutables y carga datos del usuario
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    if (this.isEditMode) {
      // En modo editar: bloquear los campos que el backend no permite cambiar.
      // disable() hace dos cosas:
      //   1. El input queda como readonly visualmente
      //   2. form.value NO incluye el campo (pero form.getRawValue() sí lo haría)
      this.form.get('document_id')!.disable();
      this.form.get('document_type')!.disable();
      this.form.get('email')!.disable();

      // Cargar los datos actuales del usuario para pre-poblar el formulario
      this.loadUser();
    } else {
      // En modo crear: la contraseña es obligatoria
      // addValidators agrega reglas a un control ya creado — no las reemplaza.
      this.form.get('password')!.addValidators([
        Validators.required,
        Validators.minLength(8),
      ]);
      // Forzar re-evaluación para que el estado invalid/valid sea correcto
      this.form.get('password')!.updateValueAndValidity();
    }
  }

  // ---------------------------------------------------------------------------
  // loadUser — carga los datos del usuario para pre-poblar el formulario
  // Solo se llama en modo EDITAR
  // ---------------------------------------------------------------------------
  private loadUser(): void {
    this.isLoading.set(true);

    this.usersService.getUser(this.documentId!).subscribe({
      next: (user) => {
        // patchValue llena solo los campos que existen en el objeto pasado.
        // A diferencia de setValue, no exige que estén TODOS los campos —
        // ideal para actualizar un subconjunto del FormGroup.
        this.form.patchValue({
          full_name: user.full_name,
          phone:     user.phone,
          city:      user.city,
          role:      user.role,
          is_active: user.is_active,
          // Nota: document_id, document_type, email no se patchean aquí
          // porque están deshabilitados. Tampoco se patchea password —
          // el usuario debe escribir una nueva si quiere cambiarla.
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.serverError.set('No se pudo cargar el usuario. Verifica la conexión.');
        this.isLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // save — se ejecuta al enviar el formulario
  //
  // Guarda a dos cosas antes de llamar al backend:
  //   1. form.invalid: si algún campo viola sus validators, no enviamos nada
  //   2. isSaving():   evita doble-click (envío duplicado)
  //
  // Según el modo, llama a createUser o updateUser y navega en caso de éxito.
  // ---------------------------------------------------------------------------
  save(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.serverError.set(null);

    if (this.isEditMode) {
      this.saveUpdate();
    } else {
      this.saveCreate();
    }
  }

  private saveCreate(): void {
    const v = this.form.value;

    const payload: UserCreatePayload = {
      document_id:   v.document_id!,
      document_type: v.document_type!,
      email:         v.email!,
      full_name:     v.full_name!,
      phone:         v.phone   || null,
      city:          v.city    || null,
      role:          v.role!,
      password:      v.password!,
    };

    this.usersService.createUser(payload).subscribe({
      // Al crear, el backend devuelve el User completo con su document_id.
      // Navegamos al detalle del usuario recién creado.
      next:  (user) => this.router.navigate(['/users', user.document_id]),
      error: (err)  => {
        // err.error.detail es el mensaje que devuelve FastAPI en los 4xx/5xx
        this.serverError.set(err.error?.detail ?? 'Error al crear el usuario.');
        this.isSaving.set(false);
      },
    });
  }

  private saveUpdate(): void {
    const v = this.form.value;

    const payload: UserUpdatePayload = {
      full_name: v.full_name || null,
      phone:     v.phone     || null,
      city:      v.city      || null,
      role:      v.role      ?? null,
      is_active: v.is_active ?? null,
      // Si password está vacía, no la incluimos → la contraseña actual no cambia.
      // Si el usuario escribió algo, la enviamos para que el backend la hashee.
      password:  v.password  || null,
    };

    this.usersService.updateUser(this.documentId!, payload).subscribe({
      // Al actualizar, navegamos al detalle del mismo usuario
      next:  ()    => this.router.navigate(['/users', this.documentId]),
      error: (err) => {
        this.serverError.set(err.error?.detail ?? 'Error al actualizar el usuario.');
        this.isSaving.set(false);
      },
    });
  }
}
