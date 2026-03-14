import { Component, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';

import { LoadingService } from '../../services/loading.service';

/**
 * Componente visual del spinner global de carga.
 *
 * No tiene lógica propia — solo observa el signal `isLoading`
 * del LoadingService y se muestra u oculta según su valor.
 *
 * Se renderiza en el layout principal para estar presente en
 * todas las páginas sin necesidad de declararlo en cada una.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
})
export class LoadingSpinnerComponent {
  // inject() en el cuerpo de la clase es la forma moderna de inyectar
  // servicios en componentes standalone (equivalente al constructor privado).
  protected readonly loadingService = inject(LoadingService);
}
