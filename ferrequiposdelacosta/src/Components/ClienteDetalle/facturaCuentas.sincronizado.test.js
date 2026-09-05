import { existsSync, readFileSync } from "node:fs";
import {
  ARCHIVOS,
  contenidoEsperado,
  rutaDestino,
} from "../../../scripts/sincronizar-calculos.js";

// LA ALARMA de la copia compartida.
//
// El modelo y las cuentas de las facturas corren en dos lados: en la app y
// adentro de la Cloud Function que mantiene los totales del menú. Como
// Firebase solo sube la carpeta functions/, allá van copias (ver
// scripts/sincronizar-calculos.js).
//
// El riesgo de tener dos copias es que se separen: alguien corrige un cálculo
// en el original, no se copia, y a partir de ahí el menú y la ficha del cliente
// muestran números distintos sin que nadie se dé cuenta. Nadie sabría cuál de
// los dos está bien.
//
// Esta prueba lo hace imposible de pasar por alto: se corre con todas las
// demás, o sea antes de cualquier despliegue.
describe("los archivos compartidos con el servidor", () => {
  it.each(ARCHIVOS)(
    "%s está copiado y al día (si falla: npm run sincronizar-calculos)",
    (archivo) => {
      const destino = rutaDestino(archivo);

      expect(
        existsSync(destino),
        `Falta functions/compartido/${archivo}. Correr: npm run sincronizar-calculos`,
      ).toBe(true);

      expect(
        readFileSync(destino, "utf8"),
        `La copia del servidor de ${archivo} quedó vieja. Correr: npm run sincronizar-calculos`,
      ).toBe(contenidoEsperado(archivo));
    },
  );

  it.each(ARCHIVOS)("%s no arrastra nada de pantalla (ni React, ni MUI, ni Firebase)", (archivo) => {
    // Este es el motivo de haber partido facturaUtils.js en tres. Con un solo
    // import de pantalla, el archivo deja de poder correr en el servidor —y el
    // error aparecería recién al desplegar, no acá.
    //
    // Lo único que pueden importarse es entre ellos: las cuentas leen el
    // documento a través del modelo, y por eso los dos viajan juntos.
    const copia = readFileSync(rutaDestino(archivo), "utf8");
    const permitidos = ARCHIVOS.map((nombre) => `./${nombre}`);

    const externos = (copia.match(/from\s+"([^"]+)"/g) || [])
      .map((linea) => linea.replace(/^from\s+"|"$/g, ""))
      .filter((ruta) => !permitidos.includes(ruta));

    expect(
      externos,
      `El archivo compartido no puede importar nada de afuera: ${externos.join(", ")}`,
    ).toEqual([]);
  });
});
