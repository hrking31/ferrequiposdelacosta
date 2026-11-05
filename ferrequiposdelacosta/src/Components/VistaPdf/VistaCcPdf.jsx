import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  formatearMoneda,
  formatearFechaLegible,
  formatearNit,
} from "../../Utils/formato";
import resumenCuentaCobro, {
  columnaDeTiempo,
  valorDeFila,
} from "../CuentaDeCobro/resumenCuentaCobro";

// La cuenta de cobro en PDF.
//
// Tamaño carta, igual que el reporte de facturas del cliente. El membrete
// (logo, nombre y NIT) y el pie se repiten en todas las hojas, así que las
// tablas dejan sitio arriba y abajo: si los equipos no entran en una hoja,
// siguen en la próxima sin pisar nada.
export default function generarCuentaCobro(values) {
  const doc = new jsPDF({ format: "letter" });
  const cuenta = values.value;

  const anchoHoja = doc.internal.pageSize.getWidth();
  const altoHoja = doc.internal.pageSize.getHeight();
  const centro = anchoHoja / 2;

  // El sitio que se les reserva al pie y al membrete en cada hoja.
  const margenPie = 34;
  const inicioPaginaSiguiente = 40;
  const margenTablas = {
    left: 20,
    right: 20,
    top: inicioPaginaSiguiente,
    bottom: margenPie,
  };

  const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(cuenta);

  // Fecha
  doc.setFontSize(10);
  doc.setTextColor(68, 68, 68);
  doc.text(`Barranquilla, ${formatearFechaLegible(cuenta.fecha)}`, centro, 50, {
    align: "center",
  });

  // Título documento
  doc.setFontSize(14);
  doc.setTextColor(68, 68, 68);
  doc.text("CUENTA DE COBRO", centro, 65, { align: "center" });

  // ===== DATOS DEL CLIENTE =====
  // Se usa un cursor vertical: cada línea que exista empuja la siguiente hacia
  // abajo, así agregar la obra o la dirección no encima nada.
  let y = 75;
  const lineaCentrada = (texto, salto = 7, size = 12) => {
    if (!texto) return;
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(texto, centro, y, { align: "center" });
    y += salto;
  };

  lineaCentrada(cuenta.empresa);
  lineaCentrada(`Nit: ${formatearNit(cuenta.nit)}`);
  if (cuenta.obra) lineaCentrada(`Obra: ${cuenta.obra}`);
  // La dirección lleva renglón fijo: va siempre, aunque esté vacía.
  lineaCentrada(`Dirección: ${cuenta.direccion || ""}`);

  // Deudor
  y += 8;
  doc.setFontSize(14);
  doc.text("DEBE A", centro, y, { align: "center" });
  y += 7;
  doc.text("FERREQUIPOS DE LA COSTA", centro, y, { align: "center" });

  // Concepto
  y += 13;
  doc.setFontSize(12);
  doc.text(`LA SUMA DE: ${formatearMoneda(aCancelar)}`, centro, y, {
    align: "center",
  });
  y += 10;
  doc.text(`POR CONCEPTO DE: ${cuenta.concepto}`, centro, y, { align: "center" });

  // ===== TABLA DE ITEMS =====
  // Cantidad, equipo, días y subtotal. El valor por día se guarda en cada ítem,
  // pero no va en este documento.
  //
  // La primera columna es el número de factura, y solo se dibuja si los ítems
  // lo traen (se rotula a las personas, no a las empresas: ver
  // cuentaCobroDesdeFacturas.js). Se repite en cada equipo de la misma
  // factura. El Subtotal va con más aire a su izquierda para que no se lea
  // pegado a los días.
  const conFactura =
    cuenta.tipo !== "empresa" && cuenta.items.some((item) => item.factura);
  const tiempo = columnaDeTiempo(cuenta.items);

  autoTable(doc, {
    startY: y + 12,
    head: [
      [...(conFactura ? ["Factura"] : []), "Cant.", "Equipo", tiempo.titulo, "Subtotal"],
    ],
    body: cuenta.items.map((item) => [
      ...(conFactura ? [item.factura || ""] : []),
      item.quantity,
      item.description,
      tiempo.valorDe(item),
      formatearMoneda(item.subtotal),
    ]),
    styles: { fontSize: 10, halign: "center" },
    columnStyles: conFactura
      ? {
          0: { cellWidth: 25, halign: "center" },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: 70, halign: "left" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 42, halign: "right", cellPadding: { left: 8, right: 2, top: 2, bottom: 2 } },
        }
      : {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 85, halign: "left" },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 48, halign: "right", cellPadding: { left: 8, right: 2, top: 2, bottom: 2 } },
        },
    margin: margenTablas,
    // Que ninguna fila de equipo quede cortada a la mitad entre dos hojas.
    rowPageBreak: "avoid",
  });

  // ===== DEPÓSITO =====
  // Antes de los totales y fuera de la suma, con el título y los rótulos de la
  // factura: es una garantía que se entrega y se devuelve. Se lee entero: si con
  // su título no entra en lo que queda de hoja, pasa completo a la siguiente.
  if (filasDeposito.length > 0) {
    const ALTO_FILA = 8;
    const ALTO_ROTULO = 3;
    let yDeposito = doc.lastAutoTable.finalY + 14;
    if (
      yDeposito + ALTO_ROTULO + filasDeposito.length * ALTO_FILA >
      altoHoja - margenPie
    ) {
      doc.addPage();
      yDeposito = inicioPaginaSiguiente;
    }
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("DEPÓSITO", 20, yDeposito);
    autoTable(doc, {
      startY: yDeposito + ALTO_ROTULO,
      body: filasDeposito.map((fila) => [fila.etiqueta, valorDeFila(fila)]),
      styles: { fontSize: 10, textColor: [68, 68, 68] },
      columnStyles: {
        0: { cellWidth: 125, halign: "left" },
        1: { cellWidth: 50, halign: "right" },
      },
      margin: margenTablas,
      rowPageBreak: "avoid",
    });
  }

  // ===== DESGLOSE DE TOTALES =====
  // Va como tabla, rayada en gris y blanco igual que la de los equipos. El
  // Subtotal siempre; el resto de los renglones solo si tienen valor, para no
  // ensuciar el documento con cifras en cero.
  //
  // Los tres renglones fuertes —Subtotal, Total y Total a cancelar— llevan su
  // rótulo pegado a la cifra (alineado a la derecha, con aire en medio), más
  // grande y en negrita; los demás lo llevan al principio, a la izquierda.
  const DESTACADAS = ["Subtotal", "Total", "Total a Cancelar"];

  autoTable(doc, {
    // Bien separada de la tabla de equipos: son dos cosas distintas y pegadas
    // se leían como una sola.
    startY: doc.lastAutoTable.finalY + 22,
    body: [
      ...filas.map((fila) => [fila.etiqueta, valorDeFila(fila)]),
      ["Total a Cancelar", formatearMoneda(aCancelar)],
    ],
    styles: { fontSize: 10, textColor: [68, 68, 68] },
    columnStyles: {
      0: { cellWidth: 125, halign: "left" },
      1: { cellWidth: 50, halign: "right" },
    },
    margin: margenTablas,
    // La discriminación se lee entera o no se lee: si no entra en lo que queda
    // de hoja, se va completa a la siguiente en vez de partirse.
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      if (!DESTACADAS.includes(String(data.row.raw[0] || ""))) return;
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fontSize = 12;
      // El rótulo se corre hasta el borde de la cifra, pero con espacio entre
      // los dos: la celda es ancha y el relleno de la derecha hace de aire.
      if (data.column.index === 0) {
        data.cell.styles.halign = "right";
        data.cell.styles.cellPadding = { left: 2, right: 10, top: 2, bottom: 2 };
      }
    },
  });

  // ===== MEMBRETE Y PIE, EN TODAS LAS HOJAS =====
  // Se dibujan al final, cuando ya se sabe cuántas hojas quedaron.
  const paginas = doc.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);

    // El número del documento, arriba a la derecha y en gris claro: se lee si
    // se lo busca, pero no compite con el membrete. Igual que en la
    // cotización, y en todas las hojas para que ninguna quede suelta.
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(cuenta.cuentaCobroId || "", anchoHoja - 15, 12, { align: "right" });

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

  // Descargar PDF. El archivo se llama con el número del documento, igual que
  // la cotización: así el nombre coincide con lo que se ve en la hoja.
  doc.save(`${cuenta.cuentaCobroId || "CuentaCobro"}.pdf`);
}
