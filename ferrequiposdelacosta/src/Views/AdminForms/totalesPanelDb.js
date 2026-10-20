// La pizarra: los totales del panel del menú, leídos de un solo documento.
//
// Antes estos dos números se calculaban acá: el menú pedía TODOS los clientes
// y después, por cada uno, sus facturas, para sumar dos cifras. Con 200
// clientes y 2.000 facturas eran ~2.200 lecturas CADA VEZ que se entraba al
// menú — y desde el rediseño de estados se pasa por el menú al salir de cada
// cotización y de cada cuenta de cobro, así que eso se pagaba muchas veces al
// día.
//
// Ahora los mantiene el servidor (ver ajustarTotalesPanel y
// recalcularTotalesPanel en functions/index.js) y acá solo se leen: 1 lectura.
//
// El documento no lo puede escribir nadie desde el navegador, ni siquiera el
// administrador: sus reglas dicen `allow write: if false` y solo las funciones
// —que corren con permisos de administrador— lo tocan.
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

export const COLECCION = "resumen";
export const DOCUMENTO = "totales";

// Devuelve los dos números, o null si la pizarra todavía no existe (queda así
// hasta que corra por primera vez el recálculo; ver el paso de "sembrar" en la
// consola de Google Cloud).
//
// Con el detalle de los equipos afuera y el de la plata por estado, sin las
// casillas que quedaron en 0 (un equipo que volvió del todo sigue en la
// pizarra con 0 hasta el repaso de la madrugada). Si la pizarra todavía no
// tiene un detalle, ese va null.
const sinCeros = (detalle) =>
  detalle
    ? Object.fromEntries(
        Object.entries(detalle)
          .map(([clave, valor]) => [clave, Number(valor) || 0])
          .filter(([, valor]) => valor > 0),
      )
    : null;

export const leerTotalesPanel = async () => {
  const snap = await getDoc(doc(db, COLECCION, DOCUMENTO));
  if (!snap.exists()) return null;

  const datos = snap.data();

  return {
    equiposActivos: Number(datos.equiposActivos) || 0,
    pagosPendientes: Number(datos.pagosPendientes) || 0,
    equiposPorTipo: sinCeros(datos.equiposPorTipo),
    pagosPorEstado: sinCeros(datos.pagosPorEstado),
    actualizadoEn: datos.actualizadoEn ?? null,
  };
};
