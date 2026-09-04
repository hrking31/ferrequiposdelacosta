// Pasar las facturas de un cliente a una cuenta de cobro.
//
// Lo que sale de acá es el `value` entero del slice `cuentacobro`, listo para
// despacharlo con setFormCuentaCobro. La regla es la del reporte en PDF (ver
// VistaReporteClientePdf): los importes se muestran CON los días ampliados,
// aunque en la factura estén guardados sin ellos.
//
// No se copia el teléfono —la cuenta de cobro no lo lleva— ni el "por concepto
// de", que lo escribe quien emite el documento.
import {
  calcularEquipo,
  calcularCuentaFactura,
  calcularDepositoTotal,
  calcularTransporteTotal,
  obtenerFechaHoyBogota,
  datosFactura,
  equiposDe,
  adicionalesDe,
  grupoInicialDe,
} from "./facturaUtils";

const numero = (valor) => Number(valor) || 0;

const obtenerNombreCliente = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") {
    return cliente.razonSocial || cliente.nombreOriginal || "";
  }
  return (
    [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.nombreOriginal ||
    ""
  );
};

// Un renglón de la cuenta de cobro por cada línea de equipo de la factura.
//
// Los días de las renovaciones se suman a los días del alquiler, así el ítem
// queda con el total de días cobrados y su subtotal (cantidad x días x valor)
// da lo mismo que el reporte. Eso vale también para los equipos que quedaron
// con devolución indefinida: se cobran hasta hoy, y hoy es la fecha de
// devolución que se muestra.
//
// El descuento que se haya pactado en una renovación NO se resta acá: sale
// aparte, como un renglón del resumen, para que la suma de los ítems siga
// cuadrando con el subtotal.
const itemDeEquipo = (equipo, factura, { rotularFactura, hoyIso }) => {
  const datos = datosFactura(factura);
  // Los días que se cobran de verdad. Ya no hay que armarlos sumando y
  // restando: la cuenta del equipo los da hechos —lo pactado más lo vencido si
  // sigue afuera, o los que de verdad estuvo si ya volvió—.
  const cuenta = calcularEquipo(equipo, hoyIso);
  const cantidad = numero(equipo.cantidadEquipos);
  const valor = numero(equipo.valorDia);

  return {
    // El número de factura tiene columna propia en el documento y se repite en
    // cada equipo que venga de ella. Vacío cuando no se rotula: ahí el
    // documento no dibuja la columna.
    factura: rotularFactura ? String(datos.numeroFactura ?? "s/n") : "",
    description: equipo.nombre || "",
    quantity: cantidad,
    day: cuenta.dias,
    price: valor,
    subtotal: cantidad * cuenta.dias * valor,
    fechaDespacho: equipo.fechaDespacho || datos.fechaCreacion || "",
    fechaDevolucion: equipo.devolucion?.fechaDevolucion
      ? equipo.devolucion.fechaDevolucion
      : equipo.vencimientoIndefinido
        ? hoyIso
        : equipo.fechaVencimiento || "",
  };
};

// Las facturas viejas migradas del Excel guardan los equipos como simples
// nombres, sin cantidad ni valor. Entran igual, con el renglón en blanco para
// que se complete a mano.
export default function construirCuentaCobroDesdeFacturas({
  cliente,
  facturas,
  hoyIso = obtenerFechaHoyBogota(),
}) {
  const lista = Array.isArray(facturas) ? facturas : [];
  // Solo el cliente de tipo persona lleva el número de factura delante de cada
  // equipo; a las empresas se les emite la cuenta con el equipo pelado.
  const rotularFactura = cliente?.tipo !== "empresa";
  const opciones = { rotularFactura, hoyIso };

  const items = [];
  const resumen = lista.reduce(
    (acumulado, factura) => {
      // Los equipos vienen ya en el orden de los despachos: primero el del
      // alta y después lo que se fue agregando.
      equiposDe(factura).forEach(({ equipo }) => {
        items.push(itemDeEquipo(equipo, factura, opciones));
      });

      const cuenta = calcularCuentaFactura(factura, hoyIso);

      return {
        iva: acumulado.iva + cuenta.iva,
        // Lo que se descontó en las renovaciones, para restarlo una sola vez
        // al final: los ítems van a precio de lista.
        descuento: acumulado.descuento + cuenta.descuento,
        // El de TODOS los despachos, cada uno con el suyo.
        deposito: acumulado.deposito + calcularDepositoTotal(factura),
        transporte: acumulado.transporte + calcularTransporteTotal(factura),
        total: acumulado.total + cuenta.total,
        pagado: acumulado.pagado + cuenta.pagado,
        abonos: acumulado.abonos + cuenta.abonos,
      };
    },
    {
      iva: 0,
      descuento: 0,
      deposito: 0,
      transporte: 0,
      total: 0,
      pagado: 0,
      abonos: 0,
    },
  );

  const subtotal = items.reduce((total, item) => total + item.subtotal, 0);

  // El tipo de transporte no se suma: se toma el de la primera factura que lo
  // tenga, porque es un rótulo ("Ida y vuelta"), no un importe. Sin transporte
  // cobrado, el select queda en "Sin transporte" y su campo deshabilitado.
  const tipoTransporteDe = (factura) =>
    adicionalesDe(grupoInicialDe(factura)).transporte;
  const facturaConTransporte = lista.find((factura) => {
    const tipo = tipoTransporteDe(factura);
    return tipo && tipo !== "Sin transporte";
  });
  const transporte =
    resumen.transporte > 0
      ? tipoTransporteDe(facturaConTransporte) || "Ida y vuelta"
      : "Sin transporte";

  return {
    // De qué cliente salió, para poder encontrar después sus cuentas sin
    // buscarlas por nombre. El número del documento y el id en la base los
    // pone la pantalla, no esto.
    clienteId: cliente?.id || null,
    tipo: cliente?.tipo === "empresa" ? "empresa" : "persona",
    empresa: obtenerNombreCliente(cliente),
    obra: cliente?.obra || "",
    concepto: "",
    nit: cliente?.nit || "",
    direccion: cliente?.direccion || "",
    fecha: hoyIso,
    items,
    transporte,
    valorTransporte: resumen.transporte,
    iva: resumen.iva > 0,
    ivaNumero: resumen.iva,
    valorDeposito: resumen.deposito,
    descuento: resumen.descuento,
    subtotalNumero: subtotal,
    total: resumen.total,
    pagado: resumen.pagado,
    abonos: resumen.abonos,
    saldo: Math.max(0, resumen.total - resumen.pagado - resumen.abonos),
    // Mientras esté marcada, el IVA no se recalcula: es el que traen las
    // facturas, que puede no ser el 19% redondo si algunas se emitieron sin
    // IVA. Se apaga sola en cuanto se toca un ítem o la casilla de IVA (ver
    // CuentaDeCobro.jsx).
    desdeFacturas: true,
  };
}
