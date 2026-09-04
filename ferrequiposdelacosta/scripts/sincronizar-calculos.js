// Copia el modelo y las cuentas de las facturas a la carpeta de las Cloud
// Functions.
//
// POR QUÉ HACE FALTA COPIAR EN VEZ DE IMPORTAR
//
// Al desplegar, Firebase sube SOLO la carpeta functions/. Un import que
// apunte a ../src compila en la máquina de uno y falla en el servidor, porque
// allá esa carpeta no existe. Por eso los archivos viajan como copia.
//
// La copia es DERIVADA, no una segunda versión: se genera sola en cada
// despliegue (ver el "predeploy" de functions en firebase.json) y no se edita
// nunca a mano. El original sigue siendo uno solo.
//
// Son DOS archivos porque las cuentas leen el documento a través del modelo:
// facturaCuentas.js importa de facturaModelo.js, así que si viajara solo uno
// el servidor no arrancaría.
//
// Y para que no puedan quedar viejas sin que nadie se entere, hay una prueba
// —facturaCuentas.sincronizado.test.js— que compara original y copia de cada
// uno y falla si difieren. Se corre con el resto de las pruebas, o sea antes
// de desplegar.
//
// Uso: node scripts/sincronizar-calculos.js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..");

const origen = (archivo) =>
  resolve(raiz, "src/Components/ClienteDetalle", archivo);
const destino = (archivo) => resolve(raiz, "functions/compartido", archivo);

// Los archivos que viajan, en orden de dependencia.
export const ARCHIVOS = ["facturaModelo.js", "facturaCuentas.js"];

const aviso = (archivo) => `// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/ClienteDetalle/${archivo}, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar una cuenta, tocá el original. Es el mismo archivo que usa la
// app, así que la corrección vale para las dos partes a la vez.

`;

// Lo que TIENE que haber en el destino, dado el origen de hoy. La prueba usa
// esta misma función, así que comparar es exactamente preguntar "¿la copia
// está al día?".
export const contenidoEsperado = (archivo) =>
  aviso(archivo) + readFileSync(origen(archivo), "utf8");

export const rutaDestino = (archivo) => destino(archivo);

export const sincronizar = () => {
  mkdirSync(destino("."), { recursive: true });
  return ARCHIVOS.map((archivo) => {
    const contenido = contenidoEsperado(archivo);
    writeFileSync(destino(archivo), contenido);
    return { archivo, bytes: contenido.length };
  });
};

// Solo cuando se corre directo desde la consola, no cuando lo importa la prueba.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  sincronizar().forEach(({ archivo, bytes }) => {
    console.log(`${archivo} copiado a functions/compartido (${bytes} caracteres).`);
  });
}
