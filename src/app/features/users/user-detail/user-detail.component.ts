import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal }                     from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SlicePipe, UpperCasePipe, DatePipe } from '@angular/common';
import { switchMap, catchError }        from 'rxjs/operators';
import { of }                           from 'rxjs';

import { UsersService }         from '../users.service';
import { AuthService }          from '../../../core/auth/auth.service';
import { SnackbarService }      from '../../../core/services/snackbar.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { User }                 from '../../../core/models/user.model';

@Component({
  selector:    'app-user-detail',
  standalone:  true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:     [RouterLink, SlicePipe, UpperCasePipe, DatePipe],
  templateUrl: './user-detail.component.html',
  styleUrl:    './user-detail.component.scss',
})
export class UserDetailComponent {

  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly usersService  = inject(UsersService);
  private readonly authService   = inject(AuthService);
  private readonly snackbar      = inject(SnackbarService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  // ---------------------------------------------------------------------------
  // Pipeline reactivo: URL param → request HTTP → Signal
  //
  // ActivatedRoute.paramMap es un Observable que emite cada vez que los
  // parámetros de la URL cambian. Para /users/CC-123, emite { id: 'CC-123' }.
  //
  // switchMap lee el id del mapa de parámetros y lanza la request HTTP.
  //   Si el usuario navega a /users/otro-id antes de que llegue la respuesta,
  //   switchMap CANCELA la request anterior y lanza una nueva. Evita
  //   respuestas fuera de orden (race condition).
  //
  // catchError atrapa cualquier error del backend (404, 500, red caída) y
  //   devuelve of(null) — un Observable que emite null y completa limpiamente.
  //   Así el pipeline nunca "muere"; el componente puede mostrar un mensaje
  //   de "no encontrado" en lugar de quedar en blanco.
  // ---------------------------------------------------------------------------
  private readonly user$ = this.route.paramMap.pipe(
    switchMap(params => {
      const id = params.get('id') ?? '';
      return this.usersService.getOne(id).pipe(
        catchError(() => of(null))
      );
    })
  );

  // toSignal convierte el Observable en un Signal.
  // Tres estados posibles del Signal:
  //   undefined → la request todavía no respondió (cargando)
  //   null      → el backend devolvió error (usuario no encontrado / 500)
  //   User      → datos del usuario listos para mostrar
  readonly user = toSignal<User | null | undefined>(this.user$, { initialValue: undefined });

  // Computed Signals que el template usa para decidir qué renderizar.
  // Se recalculan solos cuando `user` o `currentUser` cambia.
  readonly isLoading   = computed(() => this.user() === undefined);
  readonly isNotFound  = computed(() => this.user() === null);
  readonly isSuperadmin = computed(() => this.authService.currentUser()?.role === 'Superadmin');

  // ---------------------------------------------------------------------------
  // hardDeleteUser — elimina físicamente el usuario tras confirmación explícita
  //
  // Solo visible si el usuario está inactivo: primero desactivar (soft delete),
  // luego eliminar permanentemente. Este doble paso es intencional para evitar
  // borrados accidentales.
  // ---------------------------------------------------------------------------
  async hardDeleteUser(): Promise<void> {
    const u = this.user();
    if (!u) return;

    const confirmed = await this.confirmDialog.confirm(
      `¿Eliminar a ${u.full_name} de forma permanente? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    this.usersService.hardDelete(u.document_id).subscribe({
      next: () => {
        this.snackbar.show('Usuario eliminado permanentemente');
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.snackbar.show(err.error?.detail ?? 'Error al eliminar el usuario.');
      },
    });
  }
}
