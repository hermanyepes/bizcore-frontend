import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe }                                                 from '@angular/common';

import { UsersService }    from '../users/users.service';
import { AuthService }     from '../../core/auth/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { User }            from '../../core/models/user.model';

// ---------------------------------------------------------------------------
// ProfileComponent — pantalla "Mi Perfil"
//
// Accesible en /profile para cualquier rol autenticado.
//
// Tres secciones en una sola página:
//   1. Vista de datos — muestra full_name, email, rol, teléfono, ciudad, etc.
//   2. Formulario de edición (inline) — full_name, phone, city.
//   3. Formulario de cambio de contraseña (inline) — current + new + confirm.
//
// Diseño sin modal: la edición ocurre in-place usando @if para alternar
// entre vista y formulario. Más simple que un modal para el author/estudiante.
//
// Después de cambiar la contraseña:
//   - Se muestra snackbar "Contraseña actualizada. Inicia sesión de nuevo."
//   - Se llama AuthService.logout() que redirige a /login
// ---------------------------------------------------------------------------

@Component({
  selector:        'app-profile',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:         [ReactiveFormsModule, DatePipe],
  templateUrl:     './profile.component.html',
  styleUrl:        './profile.component.scss',
})
export class ProfileComponent implements OnInit {

  private readonly usersService  = inject(UsersService);
  private readonly authService   = inject(AuthService);
  private readonly snackbar      = inject(SnackbarService);

  // ── Estado de carga ────────────────────────────────────────────────────────
  readonly isLoading   = signal(true);
  readonly loadError   = signal(false);
  readonly userData    = signal<User | null>(null);

  // ── Modo edición de perfil ─────────────────────────────────────────────────
  readonly isEditingProfile   = signal(false);
  readonly isSavingProfile    = signal(false);
  readonly profileServerError = signal<string | null>(null);

  // ── Modo cambio de contraseña ──────────────────────────────────────────────
  readonly isChangingPassword    = signal(false);
  readonly isSavingPassword      = signal(false);
  readonly passwordServerError   = signal<string | null>(null);
  readonly passwordMismatch      = signal(false);

  // ── Formularios reactivos ──────────────────────────────────────────────────
  readonly profileForm = new FormGroup({
    full_name: new FormControl('', [Validators.required, Validators.maxLength(80)]),
    phone:     new FormControl<string | null>(null, Validators.maxLength(15)),
    city:      new FormControl<string | null>(null, Validators.maxLength(50)),
  });

  readonly passwordForm = new FormGroup({
    current_password:  new FormControl('', [Validators.required, Validators.minLength(1)]),
    new_password:      new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirm_password:  new FormControl('', [Validators.required]),
  });

  // ── Computed helpers ───────────────────────────────────────────────────────
  readonly initials = computed(() => {
    const name = this.userData()?.full_name ?? '';
    return name.slice(0, 2).toUpperCase();
  });

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: (user) => {
        this.userData.set(user);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // ── Editar perfil ──────────────────────────────────────────────────────────

  openEditProfile(): void {
    const u = this.userData();
    if (!u) return;
    this.profileForm.patchValue({
      full_name: u.full_name,
      phone:     u.phone,
      city:      u.city,
    });
    this.profileServerError.set(null);
    this.isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.isEditingProfile.set(false);
    this.profileServerError.set(null);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSavingProfile()) return;

    this.isSavingProfile.set(true);
    this.profileServerError.set(null);

    const v = this.profileForm.value;
    this.usersService.updateMe({
      full_name: v.full_name ?? undefined,
      phone:     v.phone     || null,
      city:      v.city      || null,
    }).subscribe({
      next: (updated) => {
        this.userData.set(updated);
        this.isEditingProfile.set(false);
        this.isSavingProfile.set(false);
        this.snackbar.show('Perfil actualizado');
      },
      error: (err) => {
        this.profileServerError.set(err.error?.detail ?? 'Error al actualizar el perfil.');
        this.isSavingProfile.set(false);
      },
    });
  }

  // ── Cambiar contraseña ─────────────────────────────────────────────────────

  openChangePassword(): void {
    this.passwordForm.reset();
    this.passwordServerError.set(null);
    this.passwordMismatch.set(false);
    this.isChangingPassword.set(true);
  }

  cancelChangePassword(): void {
    this.isChangingPassword.set(false);
    this.passwordServerError.set(null);
    this.passwordMismatch.set(false);
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.isSavingPassword()) return;

    const v = this.passwordForm.value;

    // Validación frontend: new_password == confirm_password
    if (v.new_password !== v.confirm_password) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.isSavingPassword.set(true);
    this.passwordServerError.set(null);

    this.authService.changePassword(v.current_password!, v.new_password!).subscribe({
      next: () => {
        // El backend revocó todos los tokens — forzamos logout en el cliente
        this.snackbar.show('Contraseña actualizada. Inicia sesión de nuevo.');
        this.authService.logout();
      },
      error: (err) => {
        this.passwordServerError.set(err.error?.detail ?? 'Error al cambiar la contraseña.');
        this.isSavingPassword.set(false);
      },
    });
  }
}
