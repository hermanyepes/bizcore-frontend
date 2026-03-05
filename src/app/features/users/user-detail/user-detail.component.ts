import { Component, inject, computed } from '@angular/core';
import { toSignal }                     from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink }   from '@angular/router';
import { SlicePipe, UpperCasePipe, DatePipe } from '@angular/common';
import { switchMap, catchError }        from 'rxjs/operators';
import { of }                           from 'rxjs';

import { UsersService } from '../users.service';
import { User }         from '../../../core/models/user.model';

@Component({
  selector:    'app-user-detail',
  standalone:  true,
  imports:     [RouterLink, SlicePipe, UpperCasePipe, DatePipe],
  templateUrl: './user-detail.component.html',
  styleUrl:    './user-detail.component.scss',
})
export class UserDetailComponent {

  private readonly route        = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);

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
      return this.usersService.getUser(id).pipe(
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
  // Se recalculan solos cuando `user` cambia — no hay que llamarlos manualmente.
  readonly isLoading  = computed(() => this.user() === undefined);
  readonly isNotFound = computed(() => this.user() === null);
}
