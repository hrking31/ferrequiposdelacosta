import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  agruparLotesAgregados,
  normalizarPagos,
  sumarAbonos,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  formatearFechaLegible,
  ESTADO_FACTURA_INFO,
} from "../ClienteDetalle/facturaUtils";

const GRIS = [68, 68, 68];
const NEGRO = [0, 0, 0];
// Mismo sombreado neutro que el reporte de facturas: alcanza para no perder
// la fila al leer, sin colores por sección.
const GRIS_ENCABEZADO = [225, 225, 225];
const GRIS_FILA = [244, 244, 244];
const ESTILO_TABLA = {
  theme: "striped",
  headStyles: { fillColor: GRIS_ENCABEZADO, textColor: NEGRO, fontStyle: "bold" },
  alternateRowStyles: { fillColor: GRIS_FILA },
};

const moneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
  });

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


const TIPOS_PAGO = {
  total: "Total",
  parcial: "Parcial",
  conAbono: "Total",
  sinPago: "Sin pago",
};

// El PDF de una factura: los mismos datos que muestra ClienteDetalle, en
// hoja. Tamaño carta, sin colores en las tablas (mismo estilo que el reporte
// de facturas del cliente) y con el membrete —logo, nombre y NIT— repetido en
// cada hoja, así que el contenido de las hojas después de la primera arranca
// más abajo (`inicioPaginaSiguiente`), dejándole sitio.
export default function generarFacturaPdf({ factura, cliente }) {
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

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Factura ${factura.numeroFactura ?? "s/n"}`, 200, 12, {
    align: "right",
  });

  // ── Cliente y fecha ────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(
    `Barranquilla, ${formatearFechaLegible(factura.fecha) || ""}`,
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
  doc.text(`FACTURA ${factura.numeroFactura ?? "s/n"}`, centro, 80, {
    align: "center",
  });

  doc.setFontSize(10);
  const nombreEstado =
    ESTADO_FACTURA_INFO[factura.estado]?.label || factura.estado || "";
  doc.text(nombreEstado, centro, 86, {
    align: "center",
  });

  let y = 92;

  // Escribe el rótulo de una sección y devuelve dónde sigue. Salta de hoja si
  // no queda sitio antes del pie.
  const titulo = (texto) => {
    if (y > limiteContenido) {
      doc.addPage();
      y = inicioPaginaSiguiente;
    }
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text(texto, 20, y);
    return y + 3;
  };

  const saltarSiNoCabe = () => {
    if (y > limiteContenido) {
      doc.addPage();
      y = inicioPaginaSiguiente;
    }
  };

  // Tabla estándar: la usan los equipos, los pagos y los cargos.
  const tabla = ({ head, body, startY }) => {
    saltarSiNoCabe();
    autoTable(doc, {
      startY,
      head,
      body,
      ...ESTILO_TABLA,
      styles: { fontSize: 9 },
      margin: margenTablas,
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  const equipos = Array.isArray(factura.equipos) ? factura.equipos : [];
  const sonObjetos = equipos.length > 0 && typeof equipos[0] === "object";

  // Cada equipo en su fila: cantidad, nombre (con los días ampliados y el
  // descuento como nota si los tiene), despacho y devolución en su propia
  // columna, días, valor por día y subtotal.
  const filaDeEquipo = (equipo) => {
    const ampliacion = calcularAmpliacionEquipo(equipo);
    const subtotal =
      (Number(equipo.cantidad) || 0) *
      (Number(equipo.dias) || 0) *
      (Number(equipo.valor) || 0);

    const detalles = [equipo.nombre];
    if (ampliacion.dias > 0) {
      detalles.push(
        `+${ampliacion.dias} día(s) ampliado(s): ${moneda(ampliacion.neto)}`,
      );
    }
    if (ampliacion.descuento > 0) {
      detalles.push(`Descuento: ${moneda(ampliacion.descuento)}`);
    }

    return [
      equipo.cantidad ?? "",
      detalles.join("\n"),
      formatearFechaLegible(equipo.fechaDespacho) || "—",
      equipo.vencimientoIndefinido
        ? "Indefinida"
        : formatearFechaLegible(equipo.fechaVencimiento) || "—",
      equipo.dias ?? "",
      moneda(equipo.valor),
      moneda(subtotal + ampliacion.neto),
    ];
  };

  const tablaEquipos = (lista) =>
    tabla({
      head: [["Cant.", "Equipo", "Despacho", "Devolución", "Días", "Valor/día", "Subtotal"]],
      body: lista.map(filaDeEquipo),
      startY: y,
    });

  // El pago de un lote: cuándo entró, de qué tipo y por qué medios.
  const tablaPago = ({ pagos, tipoPago, fecha }) => {
    const medios = pagos.filter((pago) => pago.medio);
    if (medios.length === 0 && !TIPOS_PAGO[tipoPago]) return;

    y = titulo("INFORMACIÓN DE PAGO");
    tabla({
      head: [["Fecha", "Pago", "Medio", "Valor"]],
      body:
        medios.length > 0
          ? medios.map((pago, indice) => [
              indice === 0 ? formatearFechaLegible(fecha) || "" : "",
              indice === 0 ? TIPOS_PAGO[tipoPago] || "" : "",
              pago.medio,
              moneda(pago.monto),
            ])
          : [
              [
                formatearFechaLegible(fecha) || "",
                TIPOS_PAGO[tipoPago] || "",
                "—",
                moneda(0),
              ],
            ],
      startY: y,
    });
  };

  // Lo que se cobra aparte del alquiler.
  const tablaAdicionales = ({ iva, deposito, transporteTipo, transporteMonto }) => {
    const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
    const filas = [];
    if (iva > 0) filas.push(["IVA (19%)", moneda(iva)]);
    if (deposito > 0) filas.push(["Depósito", moneda(deposito)]);
    if (hayTransporte) {
      filas.push([
        `Transporte · ${transporteTipo}`,
        moneda(transporteMonto),
      ]);
    }
    if (filas.length === 0) return;

    const total =
      (iva > 0 ? iva : 0) +
      (deposito > 0 ? deposito : 0) +
      (hayTransporte ? transporteMonto : 0);
    filas.push(["Total", moneda(total)]);

    y = titulo("CARGOS ADICIONALES");
    tabla({
      head: [["Concepto", "Valor"]],
      body: filas,
      startY: y,
    });
  };

  // El IVA de un grupo de equipos: cada uno respeta su propia marca y suma
  // también los días que se le ampliaron, igual que en pantalla.
  const ivaDeEquipos = (lista) =>
    lista.reduce((total, equipo) => {
      const llevaIva = equipo.aplicaIva ?? Boolean(factura.aplicaIva);
      if (!llevaIva) return total;
      const base =
        (Number(equipo.cantidad) || 0) *
          (Number(equipo.dias) || 0) *
          (Number(equipo.valor) || 0) +
        calcularAmpliacionEquipo(equipo).neto;
      return total + base * 0.19;
    }, 0);

  if (sonObjetos) {
    const originales = equipos.filter((e) => !e.agregadoPosteriormente);
    const agregados = equipos.filter((e) => e.agregadoPosteriormente);

    if (originales.length > 0) {
      y = titulo(`EQUIPOS (${originales.length})`);
      tablaEquipos(originales);

      tablaPago({
        pagos: normalizarPagos(
          factura.pagos,
          factura.modoPago,
          factura.montoPagado,
        ),
        tipoPago: factura.tipoPago,
        fecha: factura.fecha,
      });

      tablaAdicionales({
        iva: ivaDeEquipos(originales),
        deposito: Number(factura.deposito) || 0,
        transporteTipo: factura.transporte,
        transporteMonto: Number(factura.valorTransporte) || 0,
      });
    }

    // Cada lote agregado va completo: sus equipos, su pago y sus cargos.
    agruparLotesAgregados(agregados).forEach((lote, indice) => {
      const solicitud = lote.cabecera.fechaAgregado
        ? ` · solicitado el ${formatearFechaLegible(lote.cabecera.fechaAgregado)}`
        : "";
      y = titulo(
        `EQUIPOS AGREGADOS ${indice + 1} (${lote.equipos.length})${solicitud}`,
      );
      tablaEquipos(lote.equipos);

      tablaPago({
        pagos: normalizarPagos(lote.cabecera.pagos, lote.cabecera.modoPago, null),
        tipoPago: lote.cabecera.tipoPago,
        fecha: lote.cabecera.fechaAgregado,
      });

      tablaAdicionales({
        iva: ivaDeEquipos(lote.equipos),
        deposito: Number(lote.cabecera.deposito) || 0,
        transporteTipo: lote.cabecera.transporte,
        transporteMonto: Number(lote.cabecera.valorTransporte) || 0,
      });
    });
  } else if (equipos.length > 0) {
    // Facturas viejas migradas del Excel: los equipos son solo nombres.
    y = titulo(`EQUIPOS (${equipos.length})`);
    tabla({
      head: [["Equipo"]],
      body: equipos.map((nombre) => [nombre]),
      startY: y,
    });
  }

  // ── Abonos ─────────────────────────────────────────────────────────────
  const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];
  const totalAbonos = sumarAbonos(abonos);
  if (abonos.length > 0) {
    y = titulo("ABONOS");
    tabla({
      head: [["Abono", "Medio", "Valor"]],
      body: [
        ...abonos.map((abono) => [
          formatearFechaLegible(abono.fecha) || "",
          abono.medio || "",
          moneda(abono.monto),
        ]),
        ["", "Total abonado", moneda(totalAbonos)],
      ],
      startY: y,
    });
  }

  // ── Totales y estado de cuenta ─────────────────────────────────────────
  //
  // Los importes van con los días ampliados ya sumados, igual que en la
  // pantalla: el guardado en la factura es de antes de la ampliación.
  const ampliacion = calcularAmpliacionFactura(factura);
  const totalFactura = ampliacion.hay
    ? ampliacion.nuevoTotal
    : Number(factura.valorTotal) || 0;
  const subtotal = ampliacion.hay
    ? ampliacion.nuevoSubtotal
    : Number(factura.subtotal) || 0;
  const iva = ampliacion.hay ? ampliacion.nuevoIva : Number(factura.iva) || 0;

  const equiposAgregados = sonObjetos
    ? equipos.filter((e) => e.agregadoPosteriormente)
    : [];
  const sumarDeAgregados = (campo) =>
    equiposAgregados.reduce(
      (total, equipo) => total + (Number(equipo[campo]) || 0),
      0,
    );
  const depositoTotal =
    (Number(factura.deposito) || 0) + sumarDeAgregados("deposito");
  const transporteTotal =
    (Number(factura.valorTransporte) || 0) + sumarDeAgregados("valorTransporte");

  const pagadoEnFactura =
    normalizarPagos(factura.pagos, factura.modoPago, factura.montoPagado).reduce(
      (total, pago) => total + (Number(pago.monto) || 0),
      0,
    ) +
    equiposAgregados.reduce(
      (total, equipo) =>
        total +
        normalizarPagos(equipo.pagos, equipo.modoPago, null).reduce(
          (suma, pago) => suma + (Number(pago.monto) || 0),
          0,
        ),
      0,
    );

  const recibido = pagadoEnFactura + totalAbonos;
  const saldoPendiente = Math.max(0, totalFactura - recibido);
  const saldoAFavor = Math.max(0, recibido - totalFactura);

  const filasTotales = [];
  if (subtotal > 0) filasTotales.push(["Subtotal", moneda(subtotal)]);
  if (iva > 0) filasTotales.push(["IVA (19%)", moneda(iva)]);
  if (depositoTotal > 0) filasTotales.push(["Depósito", moneda(depositoTotal)]);
  if (transporteTotal > 0) {
    filasTotales.push(["Transporte", moneda(transporteTotal)]);
  }
  filasTotales.push(["TOTAL FACTURA", moneda(totalFactura)]);
  filasTotales.push(["Pagado", moneda(pagadoEnFactura)]);
  if (totalAbonos > 0) filasTotales.push(["Abonos", moneda(totalAbonos)]);
  filasTotales.push([
    saldoAFavor > 0 ? "SALDO A FAVOR" : "SALDO PENDIENTE",
    moneda(saldoAFavor > 0 ? saldoAFavor : saldoPendiente),
  ]);

  y = titulo("TOTAL FACTURA");
  saltarSiNoCabe();
  autoTable(doc, {
    startY: y,
    body: filasTotales,
    ...ESTILO_TABLA,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120, halign: "right" },
      1: { cellWidth: 50, halign: "right" },
    },
    margin: margenTablas,
    // Las dos filas fuertes —el total y el saldo— van en negrita para que se
    // encuentren de un vistazo. La lista es explícita: comparar contra el
    // texto en mayúsculas también agarraba "IVA (19%)".
    didParseCell: (data) => {
      const destacadas = ["TOTAL FACTURA", "SALDO PENDIENTE", "SALDO A FAVOR"];
      if (destacadas.includes(String(data.row.raw[0] || ""))) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
      }
    },
  });

  // ── Membrete (logo, nombre y NIT) y pie, en todas las hojas ────────────
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

  doc.save(`Factura-${factura.numeroFactura ?? "s-n"}.pdf`);
}
