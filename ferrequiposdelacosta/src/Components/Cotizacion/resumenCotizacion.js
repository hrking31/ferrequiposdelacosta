// LO QUE DICE UNA COTIZACIÓN: el subtotal, el IVA, el transporte, el total y,
// aparte, el depósito. Lo leen el formulario, la hoja y el PDF, así que los tres
// dicen siempre lo mismo (como resumenCuentaCobro en la cuenta de cobro).
//
// EL DEPÓSITO NO SUMA AL TOTAL (pedido del dueño, 2026-11-05), igual que en la
// factura y en la cuenta de cobro: es una garantía que se entrega y se
// devuelve. Lo que el cliente lleva el día del despacho es el total más el
// depósito: "Para despachar".
//
// Todo se calcula desde las partes y no desde el total guardado: las
// cotizaciones guardadas antes de esto traen el depósito sumado en su total, y
// tomarlo de ahí lo contaría dos veces.
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
  const transporte =
    cotizacion.transporte === "Sin transporte" ? 0 : numero(cotizacion.valorTransporte);
  const total = subtotal + iva + transporte;
  const deposito = cotizacion.deposito ? numero(cotizacion.valorDeposito) : 0;

  return { subtotal, iva, transporte, total, deposito, paraDespachar: total + deposito };
}
