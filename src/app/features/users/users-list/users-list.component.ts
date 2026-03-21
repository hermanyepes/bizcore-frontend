import { Component, inject, signal, computed, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { toSignal }                            from '@angular/core/rxjs-interop';
import { RouterLink }                          from '@angular/router';
import { switchMap }                           from 'rxjs/operators';
import { toObservable }                        from '@angular/core/rxjs-interop';

import { UsersService, UserListParams }      from '../users.service';
import { User }                              from '../../../core/models/user.model';
import { PaginatorComponent }               from '../../../shared/paginator/paginator.component';
import { ModalComponent }                   from '../../../shared/modal/modal.component';
import { UserCreateModalComponent }         from '../user-create-modal/user-create-modal.component';
import { SnackbarService }                  from '../../../core/services/snackbar.service';
import { ConfirmDialogService }             from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PaginatorComponent, ModalComponent, UserCreateModalComponent],
  templateUrl: './users-list.component.html',
  styleUrl:    './users-list.component.scss',
})
export class UsersListComponent {

  private readonly usersService    = inject(UsersService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly confirmService  = inject(ConfirmDialogService);

  // ── ViewChild al formulario dentro del modal ──────────────────────────────
  // Permite consultar form.dirty desde esta lista sin acoplar la lógica
  // de "¿puedo cerrar?" al ModalComponent ni al formulario hijo.
  // { static: false } porque vive dentro de un @if — no existe en el DOM
  // hasta que isCreateModalOpen() sea true.
  @ViewChild(UserCreateModalComponent)
  private createModalRef?: UserCreateModalComponent;

  // ── Modal de creación ─────────────────────────────────────────────────────
  readonly isCreateModalOpen = signal(false);

  // Se ejecuta cuando el usuario intenta cerrar el modal (clic X o fondo).
  // Patrón close guard: pregunta antes de descartar si hay datos sin guardar.
  onCloseRequested(): void {
    if (!this.createModalRef?.form.dirty) {
      // Formulario vacío o sin cambios → cerrar sin preguntar
      this.isCreateModalOpen.set(false);
      return;
    }
    // Formulario con datos → pedir confirmación antes de descartar
    this.confirmService
      .confirm('¿Descartar los cambios sin guardar?')
      .then(confirmed => {
        if (confirmed) this.isCreateModalOpen.set(false);
      });
  }

  // Se ejecuta cuando UserCreateModalComponent emite (saved).
  onUserCreated(): void {
    this.isCreateModalOpen.set(false);
    this.params.update(p => ({ ...p, page: 1 }));
    this.snackbarService.show('Usuario creado');
  }

  // -------------------------------------------------------------------------
  // Estado de la paginación — Signal mutable que el componente controla.
  // Cada vez que cambia (nueva página, nuevo filtro), dispara una nueva request.
  // -------------------------------------------------------------------------
  params = signal<UserListParams>({ page: 1, page_size: 10 });

  // -------------------------------------------------------------------------
  // Pipeline reactivo: params Signal → Observable → nueva request → Signal
  //
  // toObservable(): convierte el Signal `params` en un Observable.
  //   Cada vez que params cambia, emite el nuevo valor.
  //
  // switchMap(): cuando llega un nuevo valor de params, CANCELA la request
  //   anterior (si todavía estaba en vuelo) y lanza una nueva.
  //   Nombre: "switch" = cambia al nuevo Observable, descarta el viejo.
  //   Útil para búsquedas y paginación — evita que lleguen respuestas
  //   fuera de orden (race conditions).
  //
  // toSignal(): suscribe al Observable resultante y expone el valor
  //   como un Signal. Angular maneja el unsubscribe automáticamente.
  //   { initialValue: undefined } = valor mientras llega la primera respuesta.
  // -------------------------------------------------------------------------
  private readonly response = toSignal(
    toObservable(this.params).pipe(
      switchMap(p => this.usersService.getUsers(p))
    ),
    { initialValue: undefined }
  );

  // -------------------------------------------------------------------------
  // Computed Signals derivados de `response` — se recalculan solos
  // cuando llega una nueva respuesta del backend.
  // -------------------------------------------------------------------------

  // Lista de usuarios de la página actual (undefined mientras carga)
  users = computed((): User[] => this.response()?.items ?? []);

  // Metadatos de paginación
  totalPages  = computed(() => this.response()?.pages     ?? 0);
  totalItems  = computed(() => this.response()?.total     ?? 0);
  currentPage = computed(() => this.response()?.page      ?? 1);

  // true mientras no ha llegado la primera respuesta
  isLoading = computed(() => this.response() === undefined);

  // -------------------------------------------------------------------------
  // Paginación — cambia el Signal params, lo que dispara una nueva request
  // -------------------------------------------------------------------------
  goToPage(page: number): void {
    // Evita ir a páginas fuera de rango
    if (page < 1 || page > this.totalPages()) return;
    // update() preserva todos los params existentes y solo cambia la página
    this.params.update(p => ({ ...p, page }));
  }

}
