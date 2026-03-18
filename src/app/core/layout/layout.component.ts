import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService }              from '../auth/auth.service';
import { LoadingSpinnerComponent }  from './loading-spinner/loading-spinner.component';
import { SnackbarComponent }        from './snackbar/snackbar.component';
import { ConfirmDialogComponent }   from './confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // RouterOutlet: renderiza el componente hijo activo (dashboard, productos, etc.)
  // RouterLink / RouterLinkActive: navegación declarativa en el sidebar
  // LoadingSpinnerComponent: overlay global de carga (se activa vía LoadingService)
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LoadingSpinnerComponent, SnackbarComponent, ConfirmDialogComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  // Signal desktop: sidebar colapsado (solo iconos) o expandido (iconos + texto).
  // Empieza expandido — el usuario puede colapsarlo con el botón del navbar.
  sidebarCollapsed = signal(false);

  // Signal mobile: controla si el drawer del sidebar está abierto o cerrado.
  // Empieza cerrado — en mobile el sidebar está oculto hasta que el usuario lo abre.
  mobileOpen = signal(false);

  // Datos del usuario logueado — viene de AuthService (readonly Signal).
  currentUser = this.authService.currentUser;

  // Alterna el sidebar.
  // Actualiza ambos signals: el CSS decide cuál importa según el viewport.
  // En desktop, mobileOpen es irrelevante (CSS lo ignora con @media).
  // En mobile, sidebarCollapsed es irrelevante (CSS lo ignora con @media).
  toggleSidebar(): void {
    this.sidebarCollapsed.update(collapsed => !collapsed);
    this.mobileOpen.update(open => !open);
  }

  // Cierra el drawer en mobile — se llama al navegar a una sección o al tocar el overlay.
  closeMobileSidebar(): void {
    this.mobileOpen.set(false);
  }

  // Cierra sesión: limpia el estado local y redirige al login
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
