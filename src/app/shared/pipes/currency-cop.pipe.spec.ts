import { CurrencyCopPipe } from './currency-cop.pipe';

/**
 * Suite de tests para CurrencyCopPipe.
 *
 * A diferencia de los componentes, un Pipe se puede testear
 * instanciando la clase directamente — sin TestBed, sin módulos.
 * Es el test más simple posible en Angular.
 */
describe('CurrencyCopPipe', () => {
  // instancia única reutilizada en todos los tests
  let pipe: CurrencyCopPipe;

  beforeEach(() => {
    pipe = new CurrencyCopPipe();
  });

  // ─── Instanciación ────────────────────────────────────────────────────────

  it('should create', () => {
    // verifica que la clase existe y se puede instanciar
    expect(pipe).toBeTruthy();
  });

  // ─── Formato general ─────────────────────────────────────────────────────

  it('should format 15000 as a COP currency string containing "15.000"', () => {
    // el separador de miles en es-CO es punto
    expect(pipe.transform(15000)).toContain('15.000');
  });

  it('should format 1500000 as a COP currency string containing "1.500.000"', () => {
    // verifica que el separador de miles escala correctamente a millones
    expect(pipe.transform(1500000)).toContain('1.500.000');
  });

  it('should include the COP currency symbol or code in the output', () => {
    // toLocaleString con style:'currency' siempre añade el símbolo o código
    const result = pipe.transform(10000);
    const hasCurrencyMarker = result.includes('$') || result.includes('COP');
    expect(hasCurrencyMarker).toBe(true);
  });

  // ─── Sin decimales ───────────────────────────────────────────────────────

  it('should not include decimal separators for whole numbers', () => {
    // minimumFractionDigits:0 y maximumFractionDigits:0 eliminan los centavos
    const result = pipe.transform(50000);
    expect(result).not.toContain(',');  // sin coma decimal (formato es-CO)
  });

  // ─── Casos borde ─────────────────────────────────────────────────────────

  it('should format 0 without errors', () => {
    // el cero es un caso borde válido (producto sin precio cargado aún)
    expect(() => pipe.transform(0)).not.toThrow();
  });

  it('should format large values (e.g. 99999999) correctly', () => {
    // verifica que el separador de millones también funciona
    expect(pipe.transform(99999999)).toContain('99.999.999');
  });
});
