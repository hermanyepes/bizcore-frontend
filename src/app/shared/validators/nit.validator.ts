// ---------------------------------------------------------------------------
// nitValidator — Validador de NIT colombiano (DIAN módulo 11)
//
// Mismo algoritmo que el backend (app/schemas/supplier.py).
//
// Pesos aplicados de derecha a izquierda sobre cada dígito del NIT:
//   pos 1 (unidades): 3
//   pos 2:            7
//   pos 3:            13
//   ...
//
// Ejemplo: NIT 899999230, DV esperado = 7
//   suma = 0*3 + 3*7 + 2*13 + 9*17 + 9*19 + 9*23 + 9*29 + 9*37 + 8*41
//        = 1500
//   1500 % 11 = 4  →  DV = 11 - 4 = 7 ✓
// ---------------------------------------------------------------------------

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
const NIT_PATTERN = /^(\d{9,11})(?:-(\d))?$/;

function computeDv(nit: string): number {
  const digits = nit.split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * NIT_WEIGHTS[i], 0);
  const rem = sum % 11;
  return rem <= 1 ? rem : 11 - rem;
}

export function nitValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw: string = (control.value ?? '').trim();

    // campo vacío = válido (el NIT es opcional en el formulario de proveedor)
    if (!raw) return null;

    const match = raw.match(NIT_PATTERN);
    if (!match) {
      return {
        nit: {
          message: 'Formato inválido. Solo dígitos, 9-11 caracteres (ej: 800123456 o 800123456-7).',
        },
      };
    }

    const [, body, dv] = match;

    if (dv !== undefined) {
      const expected = computeDv(body);
      if (expected !== Number(dv)) {
        return {
          nit: {
            message: `Dígito de verificación incorrecto. El DV correcto para ${body} es ${expected}.`,
          },
        };
      }
    }

    return null;
  };
}
