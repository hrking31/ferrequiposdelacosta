// Cuántas cotizaciones y cuentas de cobro van en el mes, para los recuadros del
// menú. Se le pregunta a la base en cada visita: contar no trae los documentos,
// así que cuesta 1 lectura por recuadro sin importar cuántos sean.
//
// Del 2026-10-22 al 23 estos números los llevaba el servidor en la pizarra,
// con su detalle por estado. El dueño decidió volver a contarlos acá
// (2026-10-23): eran tres funciones despertándose con cada cotización y cada
// cuenta para ahorrar dos lecturas por visita, y el detalle por estado se quitó.
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";

// Cuándo empezó el mes de hoy en Colombia, en milisegundos. Colombia no cambia
// de hora en el año: siempre es 5 horas menos que la hora universal.
export const inicioDeMesBogota = (ms = Date.now()) => {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(ms))
    .split("-")
    .map(Number);
  return Date.UTC(anio, mes - 1, 1, 5);
};

const contar = async (consulta) => (await getCountFromServer(consulta)).data().count;

// Todas las que llegaron este mes, en cualquier estado.
export const contarCotizacionesDelMes = () =>
  contar(query(collection(db, "cotizaciones"), where("createdAt", ">=", inicioDeMesBogota())));

// Solo las EMITIDAS: un borrador no se facturó. `emitida` no se deshace aunque
// la cuenta vuelva a quedar pausada (ver cuentasCobroDb). Esta pregunta usa el
// índice (emitida, creadaEn) de firestore.indexes.json.
export const contarCuentasCobroDelMes = () =>
  contar(
    query(
      collection(db, "cuentasCobro"),
      where("emitida", "==", true),
      where("creadaEn", ">=", inicioDeMesBogota()),
    ),
  );
