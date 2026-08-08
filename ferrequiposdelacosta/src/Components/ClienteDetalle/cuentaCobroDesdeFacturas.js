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
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  calcularCuentaFactura,
  obtenerFechaHoyBogota,
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

// Los equipos que se agregaron después del alta traen su propio depósito y
// transporte, cargados en el primero de cada lote. Suman a los de la factura.
const sumarDeAgregados = (equipos, campo) =>
  equipos
    .filter((equipo) => equipo?.agregadoPosteriormente)
    .reduce((total, equipo) => total + numero(equipo[campo]), 0);

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
  const ampliacion = calcularAmpliacionEquipo(equipo, hoyIso);
  const cantidad = numero(equipo.cantidad);
  const dias = numero(equipo.dias) + ampliacion.dias;
  const valor = numero(equipo.valor);

  return {
    // El número de factura tiene columna propia en el documento y se repite en
    // cada equipo que venga de ella. Vacío cuando no se rotula: ahí el
    // documento no dibuja la columna.
    factura: rotularFactura ? String(factura.numeroFactura ?? "s/n") : "",
    description: equipo.nombre || "",
    quantity: cantidad,
    day: dias,
    price: valor,
    subtotal: cantidad * dias * valor,
    fechaDespacho: equipo.fechaDespacho || factura.fecha || "",
    fechaDevolucion: equipo.vencimientoIndefinido
      ? hoyIso
      : equipo.fechaVencimiento || "",
  };
};

// Las facturas viejas migradas del Excel guardan los equipos como simples
// nombres, sin cantidad ni valor. Entran igual, con el renglón en blanco para
// que se complete a mano.
const itemDeNombreSuelto = (nombre, factura, { rotularFactura }) => ({
  factura: rotularFactura ? String(factura.numeroFactura ?? "s/n") : "",
  description: nombre,
  quantity: 0,
  day: 0,
  price: 0,
  subtotal: 0,
  fechaDespacho: factura.fecha || "",
  fechaDevolucion: "",
});

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
      const equipos = Array.isArray(factura.equipos) ? factura.equipos : [];
      const sonObjetos = equipos.length > 0 && typeof equipos[0] === "object";

      if (sonObjetos) {
        // Igual que en el reporte: primero los del alta, después los que se
        // agregaron a la factura más tarde.
        const originales = equipos.filter((equipo) => !equipo.agregadoPosteriormente);
        const agregados = equipos.filter((equipo) => equipo.agregadoPosteriormente);
        [...originales, ...agregados].forEach((equipo) => {
          items.push(itemDeEquipo(equipo, factura, opciones));
        });
      } else {
        equipos.forEach((nombre) => {
          items.push(itemDeNombreSuelto(nombre, factura, opciones));
        });
      }

      const ampliacion = calcularAmpliacionFactura(factura, hoyIso);
      const cuenta = calcularCuentaFactura(factura, hoyIso);
      const equiposObjeto = sonObjetos ? equipos : [];

      return {
        iva: acumulado.iva + (ampliacion.hay ? ampliacion.nuevoIva : numero(factura.iva)),
        // Lo que se descontó en las renovaciones, para restarlo una sola vez
        // al final: los ítems van a precio de lista.
        descuento: acumulado.descuento + ampliacion.descuento,
        deposito:
          acumulado.deposito +
          numero(factura.deposito) +
          sumarDeAgregados(equiposObjeto, "deposito"),
        transporte:
          acumulado.transporte +
          numero(factura.valorTransporte) +
          sumarDeAgregados(equiposObjeto, "valorTransporte"),
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
  const facturaConTransporte = lista.find(
    (factura) => factura.transporte && factura.transporte !== "Sin transporte",
  );
  const transporte =
    resumen.transporte > 0
      ? facturaConTransporte?.transporte || "Ida y vuelta"
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
