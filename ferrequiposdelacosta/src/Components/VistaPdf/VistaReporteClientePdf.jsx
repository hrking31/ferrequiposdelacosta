import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  agruparLotesAgregados,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  calcularCuentaFactura,
  calcularCuentaCliente,
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
    const ampliacion = calcularAmpliacionEquipo(equipo);
    const subtotal =
      (Number(equipo.cantidad) || 0) *
      (Number(equipo.dias) || 0) *
      (Number(equipo.valor) || 0);

    const detalles = [equipo.nombre];
    if (ampliacion.dias > 0) {
      detalles.push(
        `+${ampliacion.dias} día(s) ampliado(s): ${formatearMoneda(ampliacion.neto)}`,
      );
    }
    if (ampliacion.descuento > 0) {
      detalles.push(`Descuento: ${formatearMoneda(ampliacion.descuento)}`);
    }

    return [
      equipo.cantidad ?? "",
      detalles.join("\n"),
      formatearFechaLegible(equipo.fechaDespacho) || "—",
      equipo.vencimientoIndefinido
        ? "Indefinida"
        : formatearFechaLegible(equipo.fechaVencimiento) || "—",
      equipo.dias ?? "",
      formatearMoneda(equipo.valor),
      formatearMoneda(subtotal + ampliacion.neto),
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
    y = titulo(
      `FACTURA ${factura.numeroFactura ?? "s/n"} · ${formatearFechaLegible(factura.fecha) || ""}`,
    );

    const equipos = Array.isArray(factura.equipos) ? factura.equipos : [];
    const sonObjetos = equipos.length > 0 && typeof equipos[0] === "object";

    if (sonObjetos) {
      const originales = equipos.filter((equipo) => !equipo.agregadoPosteriormente);
      const agregados = equipos.filter((equipo) => equipo.agregadoPosteriormente);

      if (originales.length > 0) tablaEquipos(originales);
      agruparLotesAgregados(agregados).forEach((lote) => tablaEquipos(lote.equipos));
    } else if (equipos.length > 0) {
      // Facturas viejas migradas del Excel: los equipos son solo nombres.
      saltarSiNoCabe();
      autoTable(doc, {
        startY: y,
        head: [["Equipo"]],
        body: equipos.map((nombre) => [nombre]),
        ...ESTILO_TABLA,
        styles: { fontSize: 9 },
        margin: margenTablas,
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // Los importes van con los días ampliados ya sumados, igual que en la
    // pantalla: el guardado en la factura es de antes de la ampliación.
    const ampliacion = calcularAmpliacionFactura(factura);
    const subtotal = ampliacion.hay
      ? ampliacion.nuevoSubtotal
      : Number(factura.subtotal) || 0;
    const iva = ampliacion.hay ? ampliacion.nuevoIva : Number(factura.iva) || 0;
    const descuentoTotal = ampliacion.descuento || 0;

    const equiposAgregados = sonObjetos
      ? equipos.filter((equipo) => equipo.agregadoPosteriormente)
      : [];
    const depositoTotal =
      (Number(factura.deposito) || 0) +
      equiposAgregados.reduce(
        (total, equipo) => total + (Number(equipo.deposito) || 0),
        0,
      );
    const transporteTotal =
      (Number(factura.valorTransporte) || 0) +
      equiposAgregados.reduce(
        (total, equipo) => total + (Number(equipo.valorTransporte) || 0),
        0,
      );

    subtotalGeneral += subtotal;
    ivaGeneral += iva;
    depositoGeneral += depositoTotal;

    const cuentaFactura = calcularCuentaFactura(factura);
    const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];

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
