// La copia de la lista de clientes guardada en el equipo.
//
// EL PROBLEMA
//
// La lista tiene que traer a TODOS los clientes, no a los nueve que se ven:
// el buscador encuentra por cualquier pedazo del nombre ("rez" tiene que
// encontrar a "Pérez") y los contadores de la izquierda cuentan sobre el
// total. Con 200 clientes son 200 lecturas cada vez que alguien la abre, y se
// abre muchas veces al día. Pero de una visita a la otra casi nunca cambió
// nada.
//
// CÓMO SE RESUELVE
//
// El servidor mantiene una sola fecha —el sello— con el último cambio que hubo
// en los clientes (ver sellarCambioDeClientes en functions/index.js). Al abrir
// la lista se mira SOLO esa fecha, que es 1 lectura:
//
//   - coincide con la de la copia guardada  ->  se usa la copia, 0 lecturas
//   - es más nueva                          ->  se traen los 200 y se guarda
//
// Una mañana en la que nadie tocó un cliente pasa de 3.000 lecturas a 15.
//
// El sello lo escribe el SERVIDOR y no la app, así que también se entera de lo
// que se edita a mano en la consola de Firebase.
import { doc, getDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import { COLECCION, DOCUMENTO } from "../../Views/AdminForms/totalesPanelDb";

const CLAVE = "clientes_copia";

// Aunque el sello no haya cambiado, la copia se descarta pasado este rato. Es
// una red por si alguna vez el sello no se escribe (la función falló, alguien
// tocó la base por otra vía): el costo de equivocarse es mostrar datos viejos,
// y media hora es lo máximo que vale la pena arriesgar.
const VIGENCIA_MS = 30 * 60 * 1000;

const leerSello = async () => {
  const snap = await getDoc(doc(db, COLECCION, DOCUMENTO));
  // Sin documento o sin el campo, el sello es 0: sirve igual para comparar, y
  // en cuanto alguien toque un cliente pasa a ser una fecha real.
  if (!snap.exists()) return 0;
  return Number(snap.data().clientesActualizadoEn) || 0;
};

const leerCopia = () => {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (!guardado) return null;

    const copia = JSON.parse(guardado);
    if (!Array.isArray(copia?.clientes)) return null;
    if (Date.now() - (copia.guardadaEn || 0) > VIGENCIA_MS) return null;

    return copia;
  } catch {
    // Un JSON corrupto no puede tumbar la pantalla: se trata como si no
    // hubiera copia y se vuelve a pedir todo.
    return null;
  }
};

const guardarCopia = (sello, clientes) => {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ sello, clientes, guardadaEn: Date.now() }),
    );
  } catch {
    // El espacio del navegador se puede llenar. Que no se guarde la copia solo
    // significa volver a leer la próxima vez, no un error para el usuario.
  }
};

// Se llama cuando es la propia app la que acaba de cambiar algo (crear,
// editar o eliminar un cliente). Sin esto habría una carrera: el servidor
// tarda un segundo en escribir el sello, y en ese segundo la pantalla se
// refrescaría con la copia vieja y el cambio recién hecho no aparecería.
export const invalidarCopiaClientes = () => {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que hacer: si no se puede borrar, la vigencia de arriba la vence.
  }
};

// Devuelve la lista, de donde se pueda. `traerTodos` es quien sabe pedirla a
// Firestore; se recibe como parámetro para que este archivo no dependa de cómo
// consulta la pantalla.
export const obtenerClientes = async (traerTodos) => {
  const sello = await leerSello();
  const copia = leerCopia();

  if (copia && copia.sello === sello) {
    return { clientes: copia.clientes, desdeCopia: true };
  }

  const clientes = await traerTodos();
  guardarCopia(sello, clientes);

  return { clientes, desdeCopia: false };
};
