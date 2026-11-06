// LO QUE DICE UNA CUENTA DE COBRO: los renglones de la suma, la sección del
// depósito y lo que se cobra. Lo leen el formulario, la hoja, el PDF y la lista,
// así que los cuatro dicen siempre lo mismo.
//
// El depósito funciona igual que en la factura: no entra en el total. Es una
// garantía que se entrega y se devuelve. De la suma solo hace parte lo que el
// cliente todavía no dejó.
//
// Con la 0783: Total $376.000, consignó $350.000 y el depósito es de $100.000.
// De lo consignado, $100.000 quedan de garantía y $250.000 pagan la cuenta:
// Total $376.000 - Pagado $250.000 = Total a Cancelar $126.000.
//
// Si el cliente pagó de más, el sobrante sale como "Saldo a favor", con el
// mismo cierre de la factura (`cerrarCuenta`).
import { formatearMoneda } from "../../Utils/formato";
import {
  cerrarCuenta,
  depositoRecibido,
  pagoAlDeposito,
} from "../ClienteDetalle/facturaCuentas";

const numero = (valor) => Number(valor) || 0;

// Una cuenta escrita a mano solo sabe lo consignado y el valor del depósito. Se
// aplican las reglas de la factura, como si fuera un solo despacho: el pago
// cubre primero el depósito, y los abonos completan lo que falte.
const desgloseDigitado = (cuenta) => {
  const pactado = numero(cuenta.valorDeposito);
  const pagos = numero(cuenta.pagado);
  const abonos = numero(cuenta.abonos);

  const conLosPagos = pagoAlDeposito(pactado, pagos);
  const { conAbonos, recibido, porCobrar } = depositoRecibido({
    pactado,
    conLosPagos,
    abonos,
  });

  return {
    pagado: pagos - conLosPagos,
    abonos: abonos - conAbonos,
    retenido: 0,
    devueltoDeMas: 0,
    deposito: {
      recibido,
      porCobrar,
      aplicado: 0,
      devuelto: 0,
      enGarantia: recibido,
      porDevolver: 0,
    },
  };
};

export default function resumenCuentaCobro(cuenta) {
  const total = numero(cuenta.total);
  // La cuenta traída de las facturas ya viene con la cuenta de cada una hecha:
  // el reparto entre depósito y pagos se calcula por despacho, y con los solos
  // totales no se podría repetir.
  const { pagado, abonos, retenido, devueltoDeMas, deposito } =
    cuenta.desgloseFacturas ?? desgloseDigitado(cuenta);

  // Lo mismo que la factura llama `neto`: el total menos lo que le llegó.
  const { saldoPendiente: aCancelar, saldoAFavor } = cerrarCuenta(
    total - pagado - abonos - retenido + devueltoDeMas,
    deposito.porCobrar,
  );

  // Cada renglón sale solo si tiene valor. Los que mueven la suma llevan su
  // signo para que el cliente pueda seguir la cuenta hasta el Total a Cancelar.
  const movimientos = [
    { etiqueta: "Pagado", valor: pagado, signo: "-" },
    { etiqueta: "Abonos", valor: abonos, signo: "-" },
    { etiqueta: "Retenido por daños", valor: retenido, signo: "-" },
    { etiqueta: "Devuelto al cliente", valor: devueltoDeMas, signo: "+" },
    { etiqueta: "Depósito por cobrar", valor: deposito.porCobrar, signo: "+" },
  ].filter(({ valor }) => valor > 0);

  const cargos = [
    { etiqueta: "Descuento", valor: numero(cuenta.descuento), signo: "-" },
    {
      etiqueta: "IVA (19%)",
      valor: cuenta.iva ? numero(cuenta.ivaNumero) : 0,
    },
    { etiqueta: "Transporte", valor: numero(cuenta.valorTransporte) },
  ].filter(({ valor }) => valor > 0);

  // Sin movimientos, el total y lo que se cobra son la misma cifra y el renglón
  // sobraría.
  const hayMovimientos = movimientos.length > 0;

  const filas = [
    { etiqueta: "Subtotal", valor: numero(cuenta.subtotalNumero), fuerte: true },
    ...cargos,
    ...(hayMovimientos ? [{ etiqueta: "Total", valor: total, fuerte: true }] : []),
    ...movimientos,
  ];

  // Los mismos rótulos de la sección DEPÓSITO del PDF de la factura. Va aparte
  // de la suma: solo informa.
  const filasDeposito =
    numero(cuenta.valorDeposito) > 0
      ? [
          { etiqueta: "Recibido", valor: deposito.recibido, siempre: true },
          { etiqueta: "Por cobrar", valor: deposito.porCobrar },
          { etiqueta: "Retenido por daños", valor: retenido },
          { etiqueta: "Aplicado a la factura", valor: deposito.aplicado },
          { etiqueta: "Devuelto", valor: deposito.devuelto },
          { etiqueta: "En garantía", valor: deposito.enGarantia },
          { etiqueta: "Por devolver", valor: deposito.porDevolver },
        ].filter(({ valor, siempre }) => siempre || valor > 0)
      : [];

  // El renglón que cierra la cuenta, igual que en la factura: el saldo a favor
  // si el cliente pagó de más, y si no, lo que se cobra. Nunca los dos.
  const cierre =
    saldoAFavor > 0
      ? { etiqueta: "Saldo a favor", valor: saldoAFavor, aFavor: true }
      : { etiqueta: "Total a Cancelar", valor: aCancelar, aFavor: false };

  return { filas, filasDeposito, aCancelar, saldoAFavor, cierre, hayMovimientos };
}

// LAS HORAS: un ítem se cobra por días o por horas, y la cuenta es la misma:
// cantidad × tiempo × precio. Si va por horas, el precio es el de cada hora. Un
// ítem sin unidad —una cuenta guardada antes de esto— va por días.
export const UNIDADES_DE_TIEMPO = [
  { valor: "dias", rotulo: "Días" },
  { valor: "horas", rotulo: "Horas" },
];

const esPorHoras = (item) => item?.unidad === "horas";

// La cifra con coma decimal: 1,5.
const cifraDeTiempo = (item) => String(numero(item.day)).replace(".", ",");

// "8 horas", "1 día", "1,5 horas". Vacío si el renglón no lleva tiempo, como el
// de los daños.
export const textoDeTiempo = (item) => {
  if (item?.day === "" || item?.day == null) return "";
  const cantidad = numero(item.day);
  const singular = cantidad === 1;
  const unidad = esPorHoras(item)
    ? singular ? "hora" : "horas"
    : singular ? "día" : "días";
  return `${cifraDeTiempo(item)} ${unidad}`;
};

// La columna de tiempo del documento. Con una sola unidad se llama como ella
// —"Días" u "Horas"— y lleva solo el número. Solo cuando se combinan se llama
// "Duración" y cada renglón dice su unidad. El renglón sin tiempo, como el de
// los daños, no cuenta para decidirlo.
export const columnaDeTiempo = (items) => {
  const conTiempo = (items || []).filter((item) => item.day !== "" && item.day != null);
  const porHoras = conTiempo.filter(esPorHoras).length;

  if (porHoras === 0) return { titulo: "Días", valorDe: (item) => item.day };
  if (porHoras === conTiempo.length) {
    return {
      titulo: "Horas",
      valorDe: (item) => (item.day === "" || item.day == null ? "" : cifraDeTiempo(item)),
    };
  }
  return { titulo: "Duración", valorDe: textoDeTiempo };
};

// La cifra de un renglón, con su signo si lo lleva.
export const valorDeFila = ({ valor, signo }) =>
  signo ? `${signo} ${formatearMoneda(valor)}` : formatearMoneda(valor);
