import { Component, inject, signal, computed } from '@angular/core';
import { toSignal }                            from '@angular/core/rxjs-interop';
import { RouterLink }                          from '@angular/router';
import { switchMap }                           from 'rxjs/operators';
import { toObservable }                        from '@angular/core/rxjs-interop';

import { UsersService, UserListParams } from '../users.service';
import { User }                         from '../../../core/models/user.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './users-list.component.html',
  styleUrl:    './users-list.component.scss',
})
export class UsersListComponent {

  private readonly usersService = inject(UsersService);

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

  // Array de números de página para el paginador en el template.
  // Computed: se recalcula cuando totalPages cambia.
  // Ejemplo: totalPages = 4 → [1, 2, 3, 4]
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );
}
