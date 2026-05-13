import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

export default function generarCotizacion(values) {
  const doc = new jsPDF();

  // === ENCABEZADO ===
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
  doc.text(`Barranquilla, ${values.value.fecha}`, 20, 50);

  // Datos del cliente
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Señores: ${values.value.empresa}`, 20, 63);
  doc.text(`Nit: ${values.value.nit}`, 20, 70);
  doc.text(`Obra: ${values.value.direccion}`, 20, 77);

  // Título de la cotización
  doc.setFontSize(16);
  doc.setTextColor(68, 68, 68);
  doc.text("COTIZACIÓN", 105, 100, { align: "center" });

  // === TABLA DE ITEMS ===
  autoTable(doc, {
    startY: 105,
    head: [["Cantidad", "Descripción", "Subtotal"]],
    body: values.value.items.map((item) => [
      item.quantity,
      item.description,
      item.subtotal,
    ]),
    styles: { fontSize: 11, halign: "center" },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 100, halign: "left" },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });

  // === VALORES DE TRANSPORTE Y TOTAL ===
const tableEndY = doc.lastAutoTable.finalY;
doc.setFontSize(12);
doc.setTextColor(0, 0, 0);
const transporteTexto = `Transporte: ${values.value.transporte}`;
const valorTransporte = Number(values.value.valorTransporte).toLocaleString(
  "es-CO",
  {
    style: "currency",
    currency: "COP",
  },
);
// Posiciones
const leftX = 20;
const rightX = 190;
const lineY = tableEndY + 15;
// Texto izquierda
doc.text(transporteTexto, leftX, lineY);
// Texto derecha
doc.text(valorTransporte, rightX, lineY, {
  align: "right",
});
// Línea punteada
doc.setLineDash([1, 1], 0);
doc.line(85, lineY - 1, 160, lineY - 1);
// Restaurar línea normal
doc.setLineDash([], 0);

// Total
  doc.setFontSize(14);
  doc.text(`Total: ${values.value.total}`, 200, tableEndY + 35, {
    align: "right",
  });

  // === PIE DE PÁGINA ===
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

  // Guardar PDF
  doc.save(`Cotizacion_${values.value.empresa}.pdf`);
}
