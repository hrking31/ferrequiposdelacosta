// Copia las cuentas de las facturas a la carpeta de las Cloud Functions.
//
// POR QUÉ HACE FALTA COPIAR EN VEZ DE IMPORTAR
//
// Al desplegar, Firebase sube SOLO la carpeta functions/. Un import que
// apunte a ../src compila en la máquina de uno y falla en el servidor, porque
// allá esa carpeta no existe. Por eso el archivo viaja como copia.
//
// La copia es DERIVADA, no una segunda versión: se genera sola en cada
// despliegue (ver el "predeploy" de functions en firebase.json) y no se edita
// nunca a mano. El original sigue siendo uno solo.
//
// Y para que no pueda quedar vieja sin que nadie se entere, hay una prueba
// —facturaCalculos.sincronizado.test.js— que compara las dos y falla si
// difieren. Se corre con el resto de las pruebas, o sea antes de desplegar.
//
// Uso: node scripts/sincronizar-calculos.js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..");

export const ORIGEN = resolve(
  raiz,
  "src/Components/ClienteDetalle/facturaCalculos.js",
);

export const DESTINO = resolve(raiz, "functions/compartido/facturaCalculos.js");

const AVISO = `// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/ClienteDetalle/facturaCalculos.js, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar una cuenta, tocá el original. Es el mismo archivo que usa la
// app, así que la corrección vale para las dos partes a la vez.

`;

// Lo que TIENE que haber en el destino, dado el origen de hoy. La prueba usa
// esta misma función, así que comparar es exactamente preguntar "¿la copia
// está al día?".
export const contenidoEsperado = () => AVISO + readFileSync(ORIGEN, "utf8");

export const sincronizar = () => {
  const contenido = contenidoEsperado();
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, contenido);
  return contenido.length;
};

// Solo cuando se corre directo desde la consola, no cuando lo importa la prueba.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const bytes = sincronizar();
  console.log(`Cuentas copiadas a functions/compartido (${bytes} caracteres).`);
}
