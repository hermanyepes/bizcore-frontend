import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  // RouterOutlet: renderiza el componente hijo activo (dashboard, productos, etc.)
  // RouterLink / RouterLinkActive: navegación declarativa en el sidebar
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  // Signal que controla si el sidebar está colapsado (solo iconos) o expandido (iconos + texto).
  // Empieza expandido — el usuario puede colapsarlo con el botón del navbar.
  sidebarCollapsed = signal(false);

  // Datos del usuario logueado — viene de AuthService (readonly Signal).
  // Se usa en el navbar para mostrar nombre y rol.
  currentUser = this.authService.currentUser;

  // Alterna el sidebar entre colapsado y expandido
  toggleSidebar(): void {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  // Cierra sesión: limpia el estado local y redirige al login
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
