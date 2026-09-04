import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  calcularEquipo,
  diasDeEquipo,
  calcularCuentaFactura,
  calcularCuentaCliente,
  calcularDepositoTotal,
  calcularTransporteTotal,
  datosFactura,
  gruposDe,
  abonosDe,
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
// propio detalle —equipos, equipos agregados, cargos y abonos, plegados en un
// solo total por factura— y al final la discriminación de TODAS juntas.
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

  // Cantidad, nombre, despacho y devolución en su propia columna cada uno, y
  // —si los tiene— los días ampliados y el descuento como nota bajo el
  // nombre. Misma tabla para el alta y para lo agregado después.
  const filaDeEquipo = (equipo) => {
    const cuentaEquipo = calcularEquipo(equipo);
    const porDia =
      (Number(equipo.cantidadEquipos) || 0) * (Number(equipo.valorDia) || 0);

    const detalles = [equipo.nombre];
    // El reparto de días es el mismo que usa el desglose de la ficha, así que
    // el documento y la pantalla no pueden nombrar distinto la misma plata.
    const dias = diasDeEquipo(equipo);
    const ampliados = dias.ampliados;
    if (ampliados > 0) {
      detalles.push(
        `+${ampliados} día(s) ampliado(s): ${formatearMoneda(ampliados * porDia)}`,
      );
    }
    if (cuentaEquipo.descuento > 0) {
      detalles.push(`Descuento: ${formatearMoneda(cuentaEquipo.descuento)}`);
    }
    if (dias.vencidos > 0) {
      detalles.push(
        `+${dias.vencidos} día(s) vencido(s): ${formatearMoneda(dias.vencidos * porDia)}`,
      );
    }

    // La columna de días muestra los que se COBRAN. Para un equipo devuelto
    // son los que de verdad estuvo afuera, así que días por valor vuelve a dar
    // el subtotal sin ninguna nota que lo explique.
    return [
      equipo.cantidadEquipos ?? "",
      detalles.join("\n"),
      formatearFechaLegible(equipo.fechaDespacho) || "—",
      equipo.devolucion?.fechaDevolucion
        ? formatearFechaLegible(equipo.devolucion.fechaDevolucion)
        : equipo.vencimientoIndefinido
          ? "Indefinida"
          : formatearFechaLegible(equipo.fechaVencimiento) || "—",
      cuentaEquipo.dias ?? "",
      formatearMoneda(equipo.valorDia),
      formatearMoneda(cuentaEquipo.neto),
    ];
  };

  const tablaEquipos = (lista) => {
    saltarSiNoCabe();
    autoTable(doc, {
      startY: y,
      head: [["Cant.", "Equipo", "Despacho", "Devolución", "Días", "Valor/día", "Subtotal"]],
      body: lista.map(filaDeEquipo),
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
  let depositoGeneral = 0;

  // ── El detalle de una factura: equipos, agregados, y un solo total que
  //    junta cargos (IVA, depósito, transporte, descuento) y abonos ───────
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
    const descuentoTotal = cuentaFactura.descuento;
    const depositoTotal = calcularDepositoTotal(factura);
    const transporteTotal = calcularTransporteTotal(factura);

    subtotalGeneral += subtotal;
    ivaGeneral += iva;
    depositoGeneral += depositoTotal;

    const abonos = abonosDe(factura);

    // Un solo total por factura: cargos, el total, lo pagado, cada abono (si
    // los tiene) y el saldo. Nada de "Cargos adicionales" aparte.
    const filas = [];
    if (iva > 0) filas.push(["IVA (19%)", formatearMoneda(iva)]);
    if (depositoTotal > 0) filas.push(["Depósito", formatearMoneda(depositoTotal)]);
    if (transporteTotal > 0) filas.push(["Transporte", formatearMoneda(transporteTotal)]);
    if (descuentoTotal > 0) filas.push(["Descuento", formatearMoneda(descuentoTotal)]);
    filas.push(["TOTAL FACTURA", formatearMoneda(cuentaFactura.total)]);
    filas.push(["Pagado", formatearMoneda(cuentaFactura.pagado)]);
    abonos.forEach((abono) => {
      filas.push([
        `Abono ${formatearFechaLegible(abono.fecha) || ""} · ${abono.medio || ""}`,
        formatearMoneda(abono.monto),
      ]);
    });
    if (cuentaFactura.abonos > 0) {
      filas.push(["Abonos", formatearMoneda(cuentaFactura.abonos)]);
    }
    filas.push([
      cuentaFactura.saldoAFavor > 0 ? "SALDO A FAVOR" : "SALDO PENDIENTE",
      formatearMoneda(
        cuentaFactura.saldoAFavor > 0
          ? cuentaFactura.saldoAFavor
          : cuentaFactura.saldoPendiente,
      ),
    ]);

    saltarSiNoCabe();
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
  y = titulo("RESUMEN GENERAL");
  autoTable(doc, {
    startY: y,
    body: [
      ["Subtotal", formatearMoneda(subtotalGeneral)],
      ["IVA (19%)", formatearMoneda(ivaGeneral)],
      ["Depósito", formatearMoneda(depositoGeneral)],
      ["TOTAL FACTURAS", formatearMoneda(cuentaGeneral.total)],
      ["Pagado", formatearMoneda(cuentaGeneral.pagado)],
      ["Abonos", formatearMoneda(cuentaGeneral.abonos)],
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
