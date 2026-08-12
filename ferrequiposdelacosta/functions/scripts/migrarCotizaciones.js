/*
  Copia las cotizaciones de la base en tiempo real (RTDB) a Firestore.

  Se corre UNA vez, a mano, el día de la mudanza. No es parte de la app ni se
  despliega: vive acá porque esta carpeta ya tiene instalado firebase-admin.

  QUÉ NO HACE, a propósito:

  - No borra ni modifica NADA en la base en tiempo real. Solo lee. El nodo
    viejo queda intacto como respaldo.
  - No pisa una cotización que ya exista en Firestore. Si se corre dos veces,
    la segunda no rompe nada: informa cuáles ya estaban y sigue de largo. Sin
    esto, una segunda corrida podría revertir un cambio hecho después de la
    primera.
  - Sin la opción --copiar no escribe una sola línea: solo cuenta y avisa qué
    haría.

  Cómo se usa (parado en la carpeta functions/):

    node scripts/migrarCotizaciones.js --clave=C:\\ruta\\clave.json
    node scripts/migrarCotizaciones.js --clave=C:\\ruta\\clave.json --copiar

  La primera forma REVISA (no escribe). La segunda COPIA de verdad.

  La clave es el archivo .json que se baja de la consola de Firebase, en
  Configuración del proyecto → Cuentas de servicio → Generar nueva clave
  privada. Es una credencial con permisos de administrador: conviene borrarla
  del disco cuando la migración termine, y nunca subirla a git.
*/

const {initializeApp, cert} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getDatabase} = require("firebase-admin/database");

const COLECCION = "cotizaciones";
const NODO = "cotizaciones";
// El límite de Firestore es 500 operaciones por lote; se deja margen.
const POR_LOTE = 400;

/**
 * Lee una opción de la línea de comandos con la forma --nombre=valor.
 * @param {string} nombre Nombre de la opción, sin los guiones.
 * @return {string|null} El valor, o null si no se pasó.
 */
function opcion(nombre) {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((arg) => arg.startsWith(prefijo));
  return encontrado ? encontrado.slice(prefijo.length) : null;
}

const rutaClave = opcion("clave");
const copiarDeVerdad = process.argv.includes("--copiar");

if (!rutaClave) {
  console.error(
      "Falta la clave. Ejemplo:\n" +
      "  node scripts/migrarCotizaciones.js --clave=C:\\ruta\\clave.json",
  );
  process.exit(1);
}

const credenciales = require(rutaClave);

// La dirección de la base en tiempo real. Casi siempre se deduce del id del
// proyecto; si la base está en otra región, se pasa con --db=...
const urlBase =
  opcion("db") ||
  `https://${credenciales.project_id}-default-rtdb.firebaseio.com`;

initializeApp({
  credential: cert(credenciales),
  databaseURL: urlBase,
});

const firestore = getFirestore();
const rtdb = getDatabase();

/**
 * Deja la cotización lista para Firestore.
 *
 * Lo único que se toca es `createdAt`: es el campo por el que Firestore ordena
 * y cuenta, y un documento SIN ese campo queda fuera de toda consulta ordenada
 * — o sea, invisible en el buzón. Las que no lo traigan se marcan con 0, que
 * las manda al final de la lista pero las deja a la vista.
 *
 * `id` no se guarda adentro: el identificador es el nombre del documento.
 *
 * @param {Object} datos La cotización tal como está en la base vieja.
 * @return {Object} La cotización lista para guardar.
 */
function prepararCotizacion(datos) {
  const copia = {...datos};
  delete copia.id;

  if (typeof copia.createdAt !== "number") {
    copia.createdAt = 0;
  }

  return copia;
}

/**
 * Corre la migración de punta a punta.
 * @return {Promise<void>}
 */
async function migrar() {
  console.log(`Proyecto: ${credenciales.project_id}`);
  console.log(`Base en tiempo real: ${urlBase}`);
  console.log(
      copiarDeVerdad ?
        "\nMODO COPIAR: se va a escribir en Firestore.\n" :
        "\nMODO REVISAR: no se escribe nada. Agregá --copiar para hacerlo.\n",
  );

  const snap = await rtdb.ref(NODO).get();

  if (!snap.exists()) {
    console.log("La base vieja no tiene ninguna cotización. No hay nada que " +
      "copiar.");
    return;
  }

  const entradas = Object.entries(snap.val());
  console.log(`En la base vieja hay ${entradas.length} cotizaciones.`);

  // Cuáles están ya en Firestore. Se pregunta una por una en vez de traer la
  // colección entera para que el resultado sea exacto aunque alguien haya
  // creado cotizaciones nuevas mientras tanto.
  const yaEstaban = [];
  const porCopiar = [];
  let sinFecha = 0;

  for (const [clave, datos] of entradas) {
    const existente = await firestore.collection(COLECCION).doc(clave).get();

    if (existente.exists) {
      yaEstaban.push(clave);
      continue;
    }

    const preparada = prepararCotizacion(datos);
    if (preparada.createdAt === 0) sinFecha += 1;
    porCopiar.push({clave, datos: preparada});
  }

  console.log(`Ya estaban en Firestore: ${yaEstaban.length}`);
  console.log(`Faltan copiar: ${porCopiar.length}`);
  if (sinFecha > 0) {
    console.log(
        `  (${sinFecha} no traían fecha de creación; se les pone 0 para que ` +
        "no queden invisibles en el buzón, y aparecerán al final de la lista)",
    );
  }

  if (!copiarDeVerdad) {
    console.log("\nNo se escribió nada. Volvé a correrlo con --copiar.");
    return;
  }

  if (porCopiar.length === 0) {
    console.log("\nNo hay nada que copiar.");
  }

  for (let i = 0; i < porCopiar.length; i += POR_LOTE) {
    const tanda = porCopiar.slice(i, i + POR_LOTE);
    const lote = firestore.batch();

    // create() —y no set()— para que Firestore RECHACE la escritura si el
    // documento apareció entre la revisión y este momento. Nunca pisa nada.
    tanda.forEach(({clave, datos}) => {
      lote.create(firestore.collection(COLECCION).doc(clave), datos);
    });

    await lote.commit();
    console.log(`Copiadas ${Math.min(i + POR_LOTE, porCopiar.length)} de ` +
      `${porCopiar.length}...`);
  }

  // La verificación final: se vuelve a contar de los dos lados.
  const totalFirestore = await firestore.collection(COLECCION).count().get();

  console.log("\n--- Resultado ---");
  console.log(`En la base vieja (intacta): ${entradas.length}`);
  console.log(`En Firestore ahora: ${totalFirestore.data().count}`);
  console.log(
      "\nNo se borró nada de la base vieja: queda como respaldo.",
  );
}

migrar()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\nLa migración se detuvo por un error:", error);
      console.error(
          "\nNo se perdió nada: la base vieja no se toca en ningún momento. " +
      "Se puede volver a correr el script; las que ya se copiaron se saltan.",
      );
      process.exit(1);
    });
