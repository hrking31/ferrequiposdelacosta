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
} from "../ClienteDetalle/facturaUtils";

// El PDF de una factura: los mismos datos que muestra ClienteDetalle, en hoja.
//
// Los colores repiten el código de la pantalla —verde el pago, azul los
// equipos del alta, violeta los agregados, naranja los cargos y azul los
// abonos— para que quien vea el papel y la app reconozca lo mismo. Acá van
// como RGB numérico porque jspdf no lee el tema de MUI.
const VERDE = [34, 197, 94];
const AZUL = [59, 130, 246];
const VIOLETA = [168, 85, 247];
const NARANJA = [249, 115, 22];
const AZUL_ABONO = [14, 165, 233];
const GRIS = [68, 68, 68];
const NEGRO = [0, 0, 0];

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

const ESTADOS = {
  pendienteDespacho: "Pendiente despacho",
  despachada: "Despachada",
  devolucionParcial: "Devolución parcial",
  finalizada: "Finalizada",
};

const TIPOS_PAGO = {
  total: "Total",
  parcial: "Parcial",
  conAbono: "Total",
  sinPago: "Sin pago",
};

export default function generarFacturaPdf({ factura, cliente }) {
  const doc = new jsPDF();
  const anchoHoja = doc.internal.pageSize.getWidth();
  const centro = anchoHoja / 2;

  // ── Encabezado, igual que la cotización ────────────────────────────────
  doc.addImage(LogoFerrequipos, "PNG", 30, 10, 25, 25);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Factura ${factura.numeroFactura ?? "s/n"}`, 200, 12, {
    align: "right",
  });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 255);
  doc.text("FERREQUIPOS DE LA COSTA", centro, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(255, 0, 0);
  doc.text("Alquiler de equipos para la construcción", centro, 26, {
    align: "center",
  });
  doc.text("Nit: 22.736.950 - 1", centro, 31, { align: "center" });

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
  doc.text(ESTADOS[factura.estado] || factura.estado || "", centro, 86, {
    align: "center",
  });

  let y = 92;

  // Escribe el rótulo de una sección con su color, y devuelve dónde sigue.
  const titulo = (texto, color) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(texto, 20, y);
    return y + 3;
  };

  // Tabla estándar: la usan los equipos, los pagos y los cargos.
  const tabla = ({ head, body, startY, colores }) => {
    autoTable(doc, {
      startY,
      head,
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: colores, textColor: [255, 255, 255] },
      margin: { left: 20, right: 20 },
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  const equipos = Array.isArray(factura.equipos) ? factura.equipos : [];
  const sonObjetos = equipos.length > 0 && typeof equipos[0] === "object";

  // Cada equipo en una fila, con sus fechas y sus días ampliados.
  const filaDeEquipo = (equipo) => {
    const ampliacion = calcularAmpliacionEquipo(equipo);
    const subtotal =
      (Number(equipo.cantidad) || 0) *
      (Number(equipo.dias) || 0) *
      (Number(equipo.valor) || 0);

    const detalles = [equipo.nombre];
    if (equipo.fechaDespacho) {
      detalles.push(`Despacho: ${formatearFechaLegible(equipo.fechaDespacho)}`);
    }
    if (equipo.vencimientoIndefinido) {
      detalles.push("Entrega indefinida");
    } else if (equipo.fechaVencimiento) {
      detalles.push(`Devuelve: ${formatearFechaLegible(equipo.fechaVencimiento)}`);
    }
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
      equipo.dias ?? "",
      moneda(equipo.valor),
      moneda(subtotal + ampliacion.neto),
    ];
  };

  const tablaEquipos = (lista, colores) =>
    tabla({
      head: [["Cant.", "Equipo", "Días", "Valor/día", "Subtotal"]],
      body: lista.map(filaDeEquipo),
      startY: y,
      colores,
    });

  // El pago de un lote: cuándo entró, de qué tipo y por qué medios.
  const tablaPago = ({ pagos, tipoPago, fecha }) => {
    const medios = pagos.filter((pago) => pago.medio);
    if (medios.length === 0 && !TIPOS_PAGO[tipoPago]) return;

    y = titulo("INFORMACIÓN DE PAGO", VERDE);
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
      colores: VERDE,
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

    y = titulo("CARGOS ADICIONALES", NARANJA);
    tabla({
      head: [["Concepto", "Valor"]],
      body: filas,
      startY: y,
      colores: NARANJA,
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
      y = titulo(`EQUIPOS (${originales.length})`, AZUL);
      tablaEquipos(originales, AZUL);

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
        VIOLETA,
      );
      tablaEquipos(lote.equipos, VIOLETA);

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
    y = titulo(`EQUIPOS (${equipos.length})`, AZUL);
    tabla({
      head: [["Equipo"]],
      body: equipos.map((nombre) => [nombre]),
      startY: y,
      colores: AZUL,
    });
  }

  // ── Abonos ─────────────────────────────────────────────────────────────
  const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];
  const totalAbonos = sumarAbonos(abonos);
  if (abonos.length > 0) {
    y = titulo("ABONOS", AZUL_ABONO);
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
      colores: AZUL_ABONO,
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

  y = titulo("TOTAL FACTURA", GRIS);
  autoTable(doc, {
    startY: y,
    body: filasTotales,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120, halign: "right" },
      1: { cellWidth: 50, halign: "right" },
    },
    margin: { left: 20, right: 20 },
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

  // ── Pie de página, en todas las hojas ──────────────────────────────────
  const paginas = doc.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 255);
    doc.text("www.ferrequiposdelacosta.com", centro, 270, { align: "center" });
    doc.text("ferrequipos07@hotmail.com", centro, 275, { align: "center" });
    doc.text(
      "Kra 38 # 108 – 23. Tel 605 3356050 - 311 6576633 - 310 6046465",
      centro,
      280,
      { align: "center" },
    );
    doc.text("BARRANQUILLA - COLOMBIA", centro, 285, { align: "center" });
  }

  doc.save(`Factura-${factura.numeroFactura ?? "s-n"}.pdf`);
}
