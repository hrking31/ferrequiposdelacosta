import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

export default function generarCuentaCobro(values) {
  const doc = new jsPDF();

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
  doc.text(`Barranquilla, ${values.value.fecha}`, 105, 50, { align: "center" });

  // Título documento
  doc.setFontSize(14);
  doc.setTextColor(68, 68, 68);
  doc.text("CUENTA DE COBRO", 105, 65, { align: "center" });

  // ===== DATOS EMPRESA =====
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(values.value.empresa, 105, 75, { align: "center" });
  doc.text(`Nit: ${values.value.nit}`, 105, 82, { align: "center" });
  doc.text(`Obra: ${values.value.obra}`, 105, 89, { align: "center" });

  // Deudor
  doc.setFontSize(14);
  doc.text("DEBE A", 105, 105, { align: "center" });
  doc.text("FERREQUIPOS DE LA COSTA", 105, 112, { align: "center" });

  // Concepto
  doc.setFontSize(12);
  doc.text(`LA SUMA DE: ${values.value.total}`, 105, 125, { align: "center" });
  doc.text(`POR CONCEPTO DE: ${values.value.concepto}`, 105, 135, {
    align: "center",
  });

  // ===== TABLA DE ITEMS =====
  autoTable(doc, {
    startY: 150,
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

  // ===== TOTAL FINAL =====
  doc.setFontSize(14);
  // doc.setFont(undefined, "bold");
  doc.setTextColor(68, 68, 68);
  doc.text(
    `Total a Cancelar: ${values.value.total}`,
    200,
    doc.lastAutoTable.finalY + 12,
    { align: "right" }
  );

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
    { align: "center" }
  );
  doc.text("BARRANQUILLA - COLOMBIA", 105, 285, { align: "center" });

  // Descargar PDF
  doc.save(`CuentaCobro_${values.value.empresa}.pdf`);
}
