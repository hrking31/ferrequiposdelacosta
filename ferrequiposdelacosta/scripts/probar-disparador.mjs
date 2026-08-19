// Prueba el disparador ajustarTotalesPanel contra los emuladores.
//
// Escribe una factura en el Firestore emulado y comprueba que el disparador
// haya movido la pizarra `resumen/totales`. Todo local: nunca toca producción.
//
// CÓMO SE CORRE
//
//   firebase emulators:exec --only functions,firestore \
//     "node scripts/probar-disparador.mjs"
//
// OJO: el emulador de Firestore corre sobre JAVA, y en la PC del dueño no
// está instalado — falla con "Could not spawn `java -version`". Se resuelve
// con `winget install Microsoft.OpenJDK.21`. El emulador de FUNCTIONS solo sí
// arranca sin Java, pero ahí los disparadores quedan sin registrar ("function
// ignored because the firestore emulator ... is not running") y esta prueba
// no sirve.
//
// Se escribió el 2026-08-18 para verificar el salto de firebase-admin 13 → 14
// sin tocar producción, que era lo único que faltaba comprobar de ese cambio.
// Sirve igual para cualquier cambio futuro en el disparador.
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

initializeApp({projectId: "ferrequiposdelacosta-e2457"});
const db = getFirestore();

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const leerTotales = async () => {
  const snap = await db.doc("resumen/totales").get();
  return snap.exists ? snap.data() : null;
};

// Una factura con un equipo despachado hoy, sin devolver y sin pagar: aporta
// 1 equipo activo y su saldo a lo pendiente.
const hoy = new Date().toISOString().slice(0, 10);
const factura = {
  numeroFactura: 9999,
  fecha: hoy,
  aplicaIva: false,
  subtotal: 100000,
  valorTotal: 100000,
  equipos: [
    {
      nombre: "PRUEBA ADMIN 14",
      cantidad: 1,
      dias: 5,
      valor: 20000,
      fechaDespacho: hoy,
      fechaVencimiento: hoy,
    },
  ],
};

console.log("Totales ANTES:", await leerTotales());

const ref = db.doc("clientes/prueba-admin14/facturas/f1");
await ref.set(factura);
console.log("Factura escrita, esperando al disparador…");

let despues = null;
for (let intento = 0; intento < 20; intento += 1) {
  await esperar(500);
  despues = await leerTotales();
  if (despues) break;
}

console.log("Totales DESPUES:", despues);

const facturaGuardada = (await ref.get()).data();
console.log("Campo `cerrada` que le puso el disparador:", facturaGuardada.cerrada);

if (!despues) {
  console.log("\nRESULTADO: FALLO — el disparador no escribio la pizarra.");
  process.exit(1);
}

const okEquipos = despues.equiposActivos === 1;
const okPagos = despues.pagosPendientes === 100000;
const okCerrada = facturaGuardada.cerrada === false;

console.log("\nequiposActivos == 1 ..........", okEquipos ? "OK" : "FALLO");
console.log("pagosPendientes == 100.000 ...", okPagos ? "OK" : "FALLO");
console.log("cerrada == false .............", okCerrada ? "OK" : "FALLO");

console.log(
    okEquipos && okPagos && okCerrada ?
      "\nRESULTADO: el disparador funciona con firebase-admin 14." :
      "\nRESULTADO: FALLO — revisar.",
);
process.exit(okEquipos && okPagos && okCerrada ? 0 : 1);
