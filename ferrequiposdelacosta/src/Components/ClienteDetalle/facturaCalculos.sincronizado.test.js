import { existsSync, readFileSync } from "node:fs";
import {
  DESTINO,
  contenidoEsperado,
} from "../../../scripts/sincronizar-calculos.js";

// LA ALARMA de la copia compartida.
//
// Las cuentas de las facturas corren en dos lados: en la app y adentro de la
// Cloud Function que mantiene los totales del menú. Como Firebase solo sube la
// carpeta functions/, allá va una copia (ver scripts/sincronizar-calculos.js).
//
// El riesgo de tener dos copias es que se separen: alguien corrige un cálculo
// en el original, no se copia, y a partir de ahí el menú y la ficha del cliente
// muestran números distintos sin que nadie se dé cuenta. Nadie sabría cuál de
// los dos está bien.
//
// Esta prueba lo hace imposible de pasar por alto: se corre con todas las
// demás, o sea antes de cualquier despliegue.
describe("las cuentas compartidas con el servidor", () => {
  it("están copiadas y al día (si falla: npm run sincronizar-calculos)", () => {
    expect(
      existsSync(DESTINO),
      "Falta functions/compartido/facturaCalculos.js. Correr: npm run sincronizar-calculos",
    ).toBe(true);

    expect(
      readFileSync(DESTINO, "utf8"),
      "La copia del servidor quedó vieja: el original cambió y no se copió. Correr: npm run sincronizar-calculos",
    ).toBe(contenidoEsperado());
  });

  it("no arrastran nada de pantalla (ni React, ni MUI, ni Firebase)", () => {
    // Este es el motivo de haber partido facturaUtils.js en dos. Con un solo
    // import de pantalla, el archivo deja de poder correr en el servidor —y el
    // error aparecería recién al desplegar, no acá.
    const copia = readFileSync(DESTINO, "utf8");
    const imports = copia.match(/^\s*import\s.+$/gm) || [];

    expect(imports, `El archivo compartido no puede importar nada: ${imports.join(", ")}`).toEqual([]);
  });
});
