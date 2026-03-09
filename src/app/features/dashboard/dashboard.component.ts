import { Component, ChangeDetectionStrategy } from '@angular/core';

// Componente placeholder — en fases futuras tendrá métricas y gráficas.
// Por ahora solo confirma que el routing interno funciona.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-placeholder">
      <h2>Dashboard</h2>
      <p>Módulo en construcción — Phase 8.4</p>
    </div>
  `,
  styles: [`
    .dashboard-placeholder {
      padding: 2rem;
      color: var(--color-text-primary, #f1f5f9);
    }
  `],
})
export class DashboardComponent {}
