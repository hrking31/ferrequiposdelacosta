// LO QUE DICE UNA COTIZACIÓN: el subtotal, el IVA, el depósito, el transporte
// y el total. Lo leen el formulario, la hoja y el PDF, así que los tres dicen
// siempre lo mismo (como resumenCuentaCobro en la cuenta de cobro).
//
// EL TOTAL INCLUYE EL DEPÓSITO (decisión del dueño, 2026-11-05): es lo que el
// cliente paga, y la hoja y el PDF aclaran que el depósito se devuelve al
// recibir los equipos. Es el mismo total que se guarda y muestra la lista.
//
// Todo se calcula desde las partes y no desde el total guardado: así las
// cuatro cifras de abajo cuadran siempre con lo que dice el total.
const numero = (valor) => Number(valor) || 0;

const TASA_IVA = 0.19;

export const subtotalDeItems = (items) =>
  (items || []).reduce(
    (suma, item) => suma + numero(item.quantity) * numero(item.price) * numero(item.day),
    0,
  );

export default function resumenCotizacion(cotizacion) {
  const subtotal = subtotalDeItems(cotizacion.items);
  const iva = cotizacion.iva ? subtotal * TASA_IVA : 0;
  const deposito = cotizacion.deposito ? numero(cotizacion.valorDeposito) : 0;
  const transporte =
    cotizacion.transporte === "Sin transporte" ? 0 : numero(cotizacion.valorTransporte);

  return { subtotal, iva, deposito, transporte, total: subtotal + iva + deposito + transporte };
}
