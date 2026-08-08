import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  formatearMoneda,
  formatearFechaLegible,
  formatearNit,
} from "../../Utils/formato";

export default function generarCuentaCobro(values) {
  const doc = new jsPDF();
  const cuenta = values.value;

  // ===== ENCABEZADO =====
  doc.addImage(LogoFerrequipos, "PNG", 30, 10, 25, 25);
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 255);
  doc.text("FERREQUIPOS DE LA COSTA", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(255, 0, 0);
  doc.text("Alquiler de equipos para la construcción", 105, 26, {
    align: "center",
  });
  doc.text("Nit: 22.736.950 - 1", 105, 31, { align: "center" });

  // Fecha
  doc.setFontSize(10);
  doc.setTextColor(68, 68, 68);
  doc.text(`Barranquilla, ${formatearFechaLegible(cuenta.fecha)}`, 105, 50, {
    align: "center",
  });

  // Título documento
  doc.setFontSize(14);
  doc.setTextColor(68, 68, 68);
  doc.text("CUENTA DE COBRO", 105, 65, { align: "center" });

  // ===== DATOS DEL CLIENTE =====
  // Se usa un cursor vertical: cada línea que exista empuja la siguiente hacia
  // abajo, así agregar teléfono o dirección no encima nada.
  let y = 75;
  const lineaCentrada = (texto, salto = 7, size = 12) => {
    if (!texto) return;
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(texto, 105, y, { align: "center" });
    y += salto;
  };

  lineaCentrada(cuenta.empresa);
  lineaCentrada(`Nit: ${formatearNit(cuenta.nit)}`);
  if (cuenta.obra) lineaCentrada(`Obra: ${cuenta.obra}`);
  if (cuenta.direccion) lineaCentrada(`Dirección: ${cuenta.direccion}`);

  // Deudor
  y += 8;
  doc.setFontSize(14);
  doc.text("DEBE A", 105, y, { align: "center" });
  y += 7;
  doc.text("FERREQUIPOS DE LA COSTA", 105, y, { align: "center" });

  // Concepto
  y += 13;
  doc.setFontSize(12);
  doc.text(`LA SUMA DE: ${formatearMoneda(cuenta.total)}`, 105, y, {
    align: "center",
  });
  y += 10;
  doc.text(`POR CONCEPTO DE: ${cuenta.concepto}`, 105, y, { align: "center" });

  // ===== TABLA DE ITEMS =====
  // Se conservan solo cantidad, descripción y subtotal (sin días ni precio
  // unitario, como se decidió para este documento).
  autoTable(doc, {
    startY: y + 12,
    head: [["Cantidad", "Descripción", "Subtotal"]],
    body: cuenta.items.map((item) => [
      item.quantity,
      item.description,
      formatearMoneda(item.subtotal),
    ]),
    styles: { fontSize: 11, halign: "center" },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 100, halign: "left" },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });

  // ===== DESGLOSE DE TOTALES =====
  // Subtotal siempre; IVA, Depósito y Transporte solo si aplican.
  let yTotales = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(68, 68, 68);

  const filaTotal = (etiqueta, valor) => {
    doc.text(`${etiqueta}: ${formatearMoneda(valor)}`, 200, yTotales, {
      align: "right",
    });
    yTotales += 6;
  };

  filaTotal("Subtotal", cuenta.subtotalNumero);
  if (cuenta.iva) filaTotal("IVA (19%)", cuenta.ivaNumero);
  if (cuenta.deposito && Number(cuenta.valorDeposito) > 0) {
    filaTotal("Depósito", cuenta.valorDeposito);
  }
  if (Number(cuenta.valorTransporte) > 0) {
    filaTotal("Transporte", cuenta.valorTransporte);
  }

  // Total final, un poco más grande
  yTotales += 2;
  doc.setFontSize(14);
  doc.text(`Total a Cancelar: ${formatearMoneda(cuenta.total)}`, 200, yTotales, {
    align: "right",
  });

  // ===== PIE DE PÁGINA =====
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 255);
  doc.text("www.ferrequiposdelacosta.com", 105, 270, { align: "center" });
  doc.text("ferrequipos07@hotmail.com", 105, 275, { align: "center" });
  doc.text(
    "Kra 38 # 108 – 23. Tel 605 3356050 - 311 6576633 - 310 6046465",
    105,
    280,
    { align: "center" },
  );
  doc.text("BARRANQUILLA - COLOMBIA", 105, 285, { align: "center" });

  // Descargar PDF
  doc.save(`CuentaCobro_${cuenta.empresa}.pdf`);
}
