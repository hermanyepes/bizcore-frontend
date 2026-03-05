// Componente raíz de BizCore.
// Su único trabajo es ser el "contenedor vacío" donde el router carga
// cada página. No tiene lógica propia — todo lo interesante pasa
// dentro del <router-outlet>.
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
})
export class App {}
