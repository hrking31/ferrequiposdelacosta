import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  calcularEquipo,
  equipoLlevaIva,
  estaDevuelto,
  diasDeEquipo,
  calcularCuentaFactura,
  calcularDepositoTotal,
  calcularTransporteTotal,
  formatearFechaLegible,
  calcularEstadoFactura,
  IVA,
  GRUPO_INICIAL,
  datosFactura,
  gruposDe,
  grupoInicialDe,
  pagosDe,
  adicionalesDe,
  abonosDe,
  tipoPagoDe,
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
  // Subtotal, IVA, total, transporte y depósito viven juntos en el documento;
  // se leen por el lector compartido y no a mano (ver datosFactura).
  const datos = datosFactura(factura);
  // La cuenta de HOY: el alquiler con sus días corridos, los fletes, el
  // depósito y lo que el cliente entregó. Es la misma que muestra la pantalla.
  const cuenta = calcularCuentaFactura(factura);
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
  doc.text(`Factura ${datos.numeroFactura ?? "s/n"}`, 200, 12, {
    align: "right",
  });

  // ── Cliente y fecha ────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(
    `Barranquilla, ${formatearFechaLegible(datos.fechaCreacion) || ""}`,
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
  doc.text(`FACTURA ${datos.numeroFactura ?? "s/n"}`, centro, 80, {
    align: "center",
  });

  doc.setFontSize(10);
  const nombreEstado =
    ESTADO_FACTURA_INFO[calcularEstadoFactura(factura)]?.label || "";
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

  // Los despachos: el del alta primero y después los agregados, cada uno con
  // sus equipos, su pago y sus cargos.
  const grupoInicial = grupoInicialDe(factura);
  const gruposAgregados = gruposDe(factura).filter(
    (grupo) => grupo?.grupo !== GRUPO_INICIAL,
  );

  // Cada equipo en su fila: cantidad, nombre (con los días ampliados y el
  // descuento como nota si los tiene), despacho y devolución en su propia
  // columna, días, valor por día y subtotal.
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
      detalles.push(`+${ampliados} día(s) ampliado(s): ${moneda(ampliados * porDia)}`);
    }
    if (cuentaEquipo.descuento > 0) {
      detalles.push(`Descuento: ${moneda(cuentaEquipo.descuento)}`);
    }
    if (dias.vencidos > 0) {
      detalles.push(
        `+${dias.vencidos} día(s) vencido(s): ${moneda(dias.vencidos * porDia)}`,
      );
    }

    // La columna de días muestra los que se COBRAN, que para un equipo ya
    // devuelto son los que de verdad estuvo afuera. Así los días por el valor
    // por día vuelven a dar el subtotal de la fila, sin nota que lo explique.
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
      moneda(equipo.valorDia),
      moneda(cuentaEquipo.neto),
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
    lista.reduce(
      (total, equipo) =>
        equipoLlevaIva(equipo) ? total + calcularEquipo(equipo).neto * IVA : total,
      0,
    );

  // Cada despacho, todos con la misma forma: los equipos, el pago de ese
  // despacho y sus cargos.
  //
  // El rótulo no lleva la cantidad entre paréntesis. Contaba RENGLONES, y una
  // devolución parcial parte el renglón en dos —lo que volvió y lo que sigue
  // afuera—, así que un despacho de un solo equipo con una devolución encima
  // anunciaba "(2)". La ficha del cliente ya cuenta por despacho y nombre por
  // esto mismo; acá directamente no se anuncia.
  const bloqueDeGrupo = (grupo, rotulo) => {
    const equiposDelGrupo = grupo?.equipos ?? [];
    if (equiposDelGrupo.length === 0) return;

    const adicionales = adicionalesDe(grupo);
    y = titulo(rotulo);
    // Primero lo que sigue alquilado y después lo devuelto, igual que en la
    // ficha del cliente: lo que está en la calle va arriba y la parte ya
    // cerrada queda al final. Sin esto el orden lo decidía el momento en que
    // se partió el renglón, que no le dice nada a nadie. El sort de JS es
    // estable, así que dentro de cada mitad se respeta el orden de carga.
    tablaEquipos(
      [...equiposDelGrupo].sort((a, b) => Number(estaDevuelto(a)) - Number(estaDevuelto(b))),
    );

    tablaPago({
      pagos: pagosDe(grupo),
      tipoPago: tipoPagoDe(grupo),
      fecha: grupo.fechaSolicitud,
    });

    tablaAdicionales({
      iva: ivaDeEquipos(equiposDelGrupo),
      deposito: Number(adicionales.valorDeposito) || 0,
      transporteTipo: adicionales.transporte,
      transporteMonto: Number(adicionales.valorTransporte) || 0,
    });
  };

  // Los despachos van en el orden en que ocurrieron: el alta primero y después
  // cada tanda agregada, 1, 2, 3. Es el orden de los movimientos de la
  // factura, el mismo de los grupos en la base. Lo único que se reordena es la
  // lista DENTRO de cada grupo, donde lo devuelto baja al final.
  //
  // La fecha del pedido no va en el rótulo: cada despacho la muestra en su
  // propia tabla de pago, que es donde se lee junto a lo que se pagó ese día.
  bloqueDeGrupo(grupoInicial, "EQUIPOS");

  gruposAgregados.forEach((grupo, indice) => {
    bloqueDeGrupo(grupo, `EQUIPOS AGREGADOS ${indice + 1}`);
  });

  // ── Abonos ─────────────────────────────────────────────────────────────
  const abonos = abonosDe(factura);
  const totalAbonos = cuenta.abonos;
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
  const totalFactura = cuenta.total;
  const subtotal = cuenta.subtotal;
  const iva = cuenta.iva;
  const depositoTotal = calcularDepositoTotal(factura);
  const transporteTotal = calcularTransporteTotal(factura);
  const pagadoEnFactura = cuenta.pagado;
  const saldoPendiente = cuenta.saldoPendiente;
  const saldoAFavor = cuenta.saldoAFavor;

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

  doc.save(`Factura-${datos.numeroFactura ?? "s-n"}.pdf`);
}
