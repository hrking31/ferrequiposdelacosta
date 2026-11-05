import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  calcularEquipo,
  calcularCuentaFactura,
  calcularCuentaCliente,
  calcularTransporteTotal,
  datosFactura,
  gruposDe,
  obtenerFechaHoyBogota,
} from "../ClienteDetalle/facturaUtils";
import { formatearMoneda, formatearFechaLegible } from "../../Utils/formato";

const GRIS = [68, 68, 68];
const NEGRO = [0, 0, 0];
// Sombreado neutro para todas las tablas: alcanza para no perder la fila al
// leer, sin volver a los colores por sección que tenía antes.
const GRIS_ENCABEZADO = [225, 225, 225];
const GRIS_FILA = [244, 244, 244];
const ESTILO_TABLA = {
  theme: "striped",
  headStyles: { fillColor: GRIS_ENCABEZADO, textColor: NEGRO, fontStyle: "bold" },
  alternateRowStyles: { fillColor: GRIS_FILA },
};

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

// El reporte de las facturas de un cliente: cada factura seleccionada con su
// propio detalle —equipos, equipos agregados, cargos y el total de abonos,
// plegados en un solo total por factura— y al final la discriminación de TODAS juntas.
//
// Tamaño carta, a diferencia de los demás PDF de la app (que son A4): así se
// pidió para este reporte. El pie de página se calcula desde el alto real de
// la hoja para no invadirlo si el tamaño cambia. El membrete (logo, nombre y
// NIT) se repite en cada hoja, así que el contenido de las hojas después de
// la primera arranca más abajo (`inicioPaginaSiguiente`), dejándole sitio.
export default function generarReporteFacturasPdf({ cliente, facturas }) {
  const doc = new jsPDF({ format: "letter" });
  const anchoHoja = doc.internal.pageSize.getWidth();
  const altoHoja = doc.internal.pageSize.getHeight();
  const centro = anchoHoja / 2;

  const margenPie = 34;
  const limiteContenido = altoHoja - margenPie;
  const inicioPaginaSiguiente = 40;
  const margenTablas = {
    left: 20,
    right: 20,
    top: inicioPaginaSiguiente,
    bottom: margenPie,
  };

  // ── Cliente y título, en la primera hoja (el membrete va aparte, se repite
  //    en todas al final) ──────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(
    `Barranquilla, ${formatearFechaLegible(obtenerFechaHoyBogota()) || ""}`,
    20,
    45,
  );

  doc.setFontSize(12);
  doc.setTextColor(...NEGRO);
  doc.text(
    `${cliente?.tipo === "empresa" ? "Señores" : "Nombre"}: ${obtenerNombreCliente(cliente)}`,
    20,
    55,
  );
  if (cliente?.telefono) doc.text(`Tel: ${cliente.telefono}`, 20, 62);
  if (cliente?.direccion) doc.text(`Dirección: ${cliente.direccion}`, 20, 69);

  doc.setFontSize(16);
  doc.setTextColor(...GRIS);
  doc.text(`REPORTE DE FACTURAS (${facturas.length})`, centro, 80, {
    align: "center",
  });

  let y = 92;

  // Escribe el rótulo de una sección y devuelve dónde sigue. Salta de hoja si
  // no queda sitio antes del pie.
  const titulo = (texto, color = NEGRO) => {
    if (y > limiteContenido) {
      doc.addPage();
      y = inicioPaginaSiguiente;
    }
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(texto, 20, y);
    return y + 3;
  };

  const saltarSiNoCabe = () => {
    if (y > limiteContenido) {
      doc.addPage();
      y = inicioPaginaSiguiente;
    }
  };

  // Los totales y el depósito se leen enteros: si no entran en lo que queda de
  // hoja, pasan completos a la siguiente en vez de partirse.
  const reservarSitio = (cantidadFilas) => {
    const ALTO_FILA = 8;
    const ALTO_ROTULO = 3;
    if (y + ALTO_ROTULO + cantidadFilas * ALTO_FILA > limiteContenido) {
      doc.addPage();
      y = inicioPaginaSiguiente;
    }
  };

  // La sección DEPÓSITO, con los rótulos del PDF de la factura. Va antes de los
  // totales y fuera de la suma: es una garantía que se entrega y se devuelve.
  const seccionDeposito = ({
    recibido,
    porCobrar,
    retenido,
    aplicado,
    devuelto,
    enGarantia,
    porDevolver,
  }) => {
    const opcionales = [
      ["Por cobrar", porCobrar],
      ["Retenido por daños", retenido],
      ["Aplicado a la factura", aplicado],
      ["Devuelto", devuelto],
      ["En garantía", enGarantia],
      ["Por devolver", porDevolver],
    ].filter(([, valor]) => valor > 0);
    const body = [["Recibido", recibido], ...opcionales].map(([rotulo, valor]) => [
      rotulo,
      formatearMoneda(valor),
    ]);

    // Una fila más por el encabezado de la tabla.
    reservarSitio(body.length + 1);
    y = titulo("DEPÓSITO");
    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Valor"]],
      body,
      ...ESTILO_TABLA,
      styles: { fontSize: 9 },
      margin: margenTablas,
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  // Lo que mueve la suma entre el total y el saldo, cada renglón con su signo
  // para poder seguir la cuenta. Lo pagado es lo que le llegó a la FACTURA, sin
  // la parte que quedó de garantía; lo que falta dejar de garantía sí se cobra.
  const filasDeMovimientos = ({
    pagado,
    abonos,
    retenido,
    descuentoAlCobrar,
    devueltoDeMas,
    depositoPorCobrar,
  }) =>
    [
      ["Pagado", pagado, "-"],
      ["Abonos", abonos, "-"],
      ["Retenido por daños", retenido, "-"],
      ["Descuento", descuentoAlCobrar, "-"],
      ["Devuelto al cliente", devueltoDeMas, "+"],
      ["Depósito por cobrar", depositoPorCobrar, "+"],
    ]
      .filter(([, valor]) => valor > 0)
      .map(([rotulo, valor, signo]) => [rotulo, `${signo} ${formatearMoneda(valor)}`]);

  // Cantidad, nombre, despacho y devolución en su propia columna cada uno. Misma
  // tabla para el alta y para lo agregado después.
  const filasDeEquipo = (equipo) => {
    const cuentaEquipo = calcularEquipo(equipo);

    // El documento NO desglosa los días por tramo. La fila ya dice cuántos
    // días se cobran, a cuánto el día y cuánto suman; abrirlos debajo del
    // nombre en "ampliados", "vencidos" y "vencidos pagados" le contaba al
    // cliente un reparto que es nuestro, no suyo, y el subtotal los incluye
    // a todos igual. El descuento sí queda: no es un tramo de días, es plata
    // que se le perdonó y tiene que verse. Arriba va el valor completo y, en
    // su propia fila, el descuento con el valor ya rebajado.
    const filaDescuento =
      cuentaEquipo.descuento > 0
        ? [[
            "",
            `Descuento: ${formatearMoneda(cuentaEquipo.descuento)}`,
            "",
            "",
            "",
            "",
            formatearMoneda(cuentaEquipo.neto),
          ]]
        : [];

    // La columna de días muestra los que se COBRAN. Para un equipo devuelto
    // son los que de verdad estuvo afuera, así que días por valor vuelve a dar
    // el subtotal sin ninguna nota que lo explique.
    //
    // La de devolución va vacía mientras el equipo no vuelva: una fecha ahí
    // afirma una devolución que no ocurrió (ver VistaFacturaPdf, mismo caso).
    return [
      [
        equipo.cantidadEquipos ?? "",
        equipo.nombre,
        formatearFechaLegible(equipo.fechaDespacho) || "—",
        equipo.devolucion?.fechaDevolucion
          ? formatearFechaLegible(equipo.devolucion.fechaDevolucion)
          : "",
        cuentaEquipo.dias ?? "",
        formatearMoneda(equipo.valorDia),
        formatearMoneda(cuentaEquipo.bruto),
      ],
      ...filaDescuento,
    ];
  };

  const tablaEquipos = (lista) => {
    saltarSiNoCabe();
    autoTable(doc, {
      startY: y,
      head: [["Cant.", "Equipo", "Despacho", "Devolución", "Días", "Valor/día", "Subtotal"]],
      body: lista.flatMap(filasDeEquipo),
      ...ESTILO_TABLA,
      styles: { fontSize: 9 },
      margin: margenTablas,
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  // Acumulan, factura por factura, lo que al final se discrimina UNA sola
  // vez para todas juntas.
  let subtotalGeneral = 0;
  let ivaGeneral = 0;
  let transporteGeneral = 0;
  let danosGeneral = 0;
  let devueltoDeMasGeneral = 0;
  const depositoGeneral = {
    pactado: 0,
    recibido: 0,
    porCobrar: 0,
    retenido: 0,
    aplicado: 0,
    devuelto: 0,
    enGarantia: 0,
    porDevolver: 0,
  };

  // ── El detalle de una factura: equipos, agregados, su depósito y un solo
  //    total que junta cargos (IVA, transporte, daños) y abonos ──────────
  const seccionFactura = (factura) => {
    const datos = datosFactura(factura);
    y = titulo(
      `FACTURA ${datos.numeroFactura ?? "s/n"} · ${
        formatearFechaLegible(datos.fechaCreacion) || ""
      }`,
    );

    // Una tabla por despacho, en orden: el del alta primero.
    gruposDe(factura).forEach((grupo) => {
      const equiposDelGrupo = grupo?.equipos ?? [];
      if (equiposDelGrupo.length > 0) tablaEquipos(equiposDelGrupo);
    });

    // Los importes son los de HOY —con los días ampliados y los vencidos ya
    // sumados—, igual que en la pantalla, y salen de la misma cuenta.
    const cuentaFactura = calcularCuentaFactura(factura);
    const subtotal = cuentaFactura.subtotal;
    const iva = cuentaFactura.iva;
    const transporteTotal = calcularTransporteTotal(factura);
    const { deposito } = cuentaFactura;
    // Un pago de más que ya se le devolvió al cliente: ya no paga la factura.
    const devueltoDeMas = cuentaFactura.entregas - deposito.devuelto;
    const depositoFactura = {
      ...deposito,
      enGarantia: deposito.guardado - deposito.porDevolver,
    };

    subtotalGeneral += subtotal;
    ivaGeneral += iva;
    transporteGeneral += transporteTotal;
    danosGeneral += cuentaFactura.danos;
    devueltoDeMasGeneral += devueltoDeMas;
    Object.keys(depositoGeneral).forEach((clave) => {
      depositoGeneral[clave] += depositoFactura[clave];
    });

    if (deposito.pactado > 0) seccionDeposito(depositoFactura);

    // Un solo total por factura: cargos, el total, lo pagado, los abonos en
    // UNA línea y el saldo. El detalle abono por abono queda para el PDF de
    // una sola factura: este es un resumen. Nada de "Cargos adicionales" aparte.
    const filas = [];
    if (iva > 0) filas.push(["IVA (19%)", formatearMoneda(iva)]);
    if (transporteTotal > 0) filas.push(["Transporte", formatearMoneda(transporteTotal)]);
    if (cuentaFactura.danos > 0) filas.push(["Daños", formatearMoneda(cuentaFactura.danos)]);
    filas.push(["TOTAL FACTURA", formatearMoneda(cuentaFactura.total)]);
    filas.push(
      ...filasDeMovimientos({
        pagado: cuentaFactura.pagadoFactura,
        abonos: cuentaFactura.abonosFactura,
        retenido: cuentaFactura.retenidoFactura,
        // El de arriba es el de los días; este, lo rebajado al cobrar.
        descuentoAlCobrar: cuentaFactura.descuentoAlCobrar,
        devueltoDeMas,
        depositoPorCobrar: deposito.porCobrar,
      }),
    );
    filas.push([
      cuentaFactura.saldoAFavor > 0 ? "SALDO A FAVOR" : "SALDO PENDIENTE",
      formatearMoneda(
        cuentaFactura.saldoAFavor > 0
          ? cuentaFactura.saldoAFavor
          : cuentaFactura.saldoPendiente,
      ),
    ]);

    reservarSitio(filas.length);
    autoTable(doc, {
      startY: y,
      body: filas,
      ...ESTILO_TABLA,
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120, halign: "right" },
        1: { cellWidth: 50, halign: "right" },
      },
      margin: margenTablas,
      // El total y el saldo van en negrita para que se encuentren de un
      // vistazo.
      didParseCell: (data) => {
        const destacadas = ["TOTAL FACTURA", "SALDO PENDIENTE", "SALDO A FAVOR"];
        if (destacadas.includes(String(data.row.raw[0] || ""))) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = doc.lastAutoTable.finalY + 12;
  };

  facturas.forEach(seccionFactura);

  // ── Discriminación del valor, al cierre y de TODAS las facturas juntas ──
  // Siempre en su propia hoja: así queda como cierre del reporte y no a
  // medio camino de la última página de facturas.
  const cuentaGeneral = calcularCuentaCliente(facturas);
  doc.addPage();
  y = inicioPaginaSiguiente;
  if (depositoGeneral.pactado > 0) seccionDeposito(depositoGeneral);
  y = titulo("RESUMEN GENERAL");
  autoTable(doc, {
    startY: y,
    body: [
      ["Subtotal", formatearMoneda(subtotalGeneral)],
      ["IVA (19%)", formatearMoneda(ivaGeneral)],
      ...(transporteGeneral > 0
        ? [["Transporte", formatearMoneda(transporteGeneral)]]
        : []),
      ...(danosGeneral > 0 ? [["Daños", formatearMoneda(danosGeneral)]] : []),
      ["TOTAL FACTURAS", formatearMoneda(cuentaGeneral.total)],
      ...filasDeMovimientos({
        pagado: cuentaGeneral.pagadoFactura,
        abonos: cuentaGeneral.abonosFactura,
        retenido: cuentaGeneral.retenidoFactura,
        descuentoAlCobrar: cuentaGeneral.descuentoAlCobrar,
        devueltoDeMas: devueltoDeMasGeneral,
        depositoPorCobrar: cuentaGeneral.depositoPorCobrar,
      }),
      [
        cuentaGeneral.saldoAFavor > 0 ? "SALDO A FAVOR" : "SALDO PENDIENTE",
        formatearMoneda(
          cuentaGeneral.saldoAFavor > 0
            ? cuentaGeneral.saldoAFavor
            : cuentaGeneral.saldoPendiente,
        ),
      ],
    ],
    ...ESTILO_TABLA,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120, halign: "right" },
      1: { cellWidth: 50, halign: "right" },
    },
    margin: margenTablas,
    didParseCell: (data) => {
      const destacadas = ["TOTAL FACTURAS", "SALDO PENDIENTE", "SALDO A FAVOR"];
      if (destacadas.includes(String(data.row.raw[0] || ""))) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Membrete (logo, nombre y NIT) y pie, en TODAS las hojas ────────────
  const paginas = doc.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);

    doc.addImage(LogoFerrequipos, "PNG", 30, 10, 25, 25);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 255);
    doc.text("FERREQUIPOS DE LA COSTA", centro, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(255, 0, 0);
    doc.text("Alquiler de equipos para la construcción", centro, 26, {
      align: "center",
    });
    doc.text("Nit: 22.736.950 - 1", centro, 31, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 255);
    doc.text("www.ferrequiposdelacosta.com", centro, altoHoja - 24, {
      align: "center",
    });
    doc.text("ferrequipos07@hotmail.com", centro, altoHoja - 19, {
      align: "center",
    });
    doc.text(
      "Kra 38 # 108 – 23. Tel 605 3356050 - 311 6576633 - 310 6046465",
      centro,
      altoHoja - 14,
      { align: "center" },
    );
    doc.text("BARRANQUILLA - COLOMBIA", centro, altoHoja - 9, {
      align: "center",
    });
  }

  doc.save(`Reporte-Facturas-${obtenerNombreCliente(cliente) || "cliente"}.pdf`);
}
