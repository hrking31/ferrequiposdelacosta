import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import { formatearMoneda } from "../../Utils/formato";
import resumenCotizacion from "../Cotizacion/resumenCotizacion";

// Los renglones de la cuenta que van destacados, más grandes y en negrita.
const DESTACADOS = ["Subtotal", "TOTAL", "PARA DESPACHAR"];

export default function generarCotizacion(values) {
  const doc = new jsPDF();
  // Las mismas cifras del formulario y de la hoja (pedido del dueño,
  // 2026-11-05): el depósito ya no suma al total, va aparte después de él.
  const resumen = resumenCotizacion(values);

  // === ENCABEZADO ===
  doc.addImage(LogoFerrequipos, "PNG", 30, 10, 25, 25);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(values.cotizacionId || "", 200, 12, { align: "right" });

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
  doc.text(`Barranquilla, ${values.fecha}`, 20, 50);

  // Datos del cliente
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `${values.tipo === "empresa" ? "Señores" : "Nombre"}: ${values.empresa}`,
    20,
    63,
  );

  doc.text(
    `${values.tipo === "empresa" ? "NIT" : "Cédula"}: ${values.nit}`,
    20,
    70,
  );

  doc.text(`Tel: ${values.telefono}`, 20, 77);

  doc.text(
    `${
      values.tipo === "empresa" ? "Obra" : "Dirección"
    }: ${values.direccion} ${values.barrio}${
      values.otrosDatos ? `, ${values.otrosDatos}` : ""
    }`,
    20,
    84,
  );

  doc.text(
    `${values.municipio}${
      values.municipio && values.departamento ? ", " : ""
    }${values.departamento}`,
    20,
    91,
  );

  // Título de la cotización
  doc.setFontSize(16);
  doc.setTextColor(68, 68, 68);
  doc.text("COTIZACIÓN", 105, 100, { align: "center" });

  // === TABLA DE ITEMS ===
  autoTable(doc, {
    startY: 105,

    head: [["Cantidad", "Descripción", "Valor"]],

    body: [
      ...values.items.map((item) => [
        item.quantity,
        [
          item.description,
          item.day === "1" ? `${item.day} día` : `${item.day} días`,
        ]
          .filter(Boolean)
          .join(" x "),
        item.subtotal,
      ]),

      // Espacio
      ["", "", ""],

      ["", "Subtotal", formatearMoneda(resumen.subtotal)],
      ["IVA", "", formatearMoneda(resumen.iva)],
      ["Transporte", `${values.transporte ?? ""}`, formatearMoneda(resumen.transporte)],
      ["", "TOTAL", formatearMoneda(resumen.total)],

      // El depósito, aparte del total: se devuelve al recibir los equipos. Con
      // él, lo que el cliente lleva el día del despacho.
      ...(resumen.deposito > 0
        ? [
            ["Depósito", "Se devuelve al recibir los equipos", formatearMoneda(resumen.deposito)],
            ["", "PARA DESPACHAR", formatearMoneda(resumen.paraDespachar)],
          ]
        : []),
    ],

    styles: {
      fontSize: 10,
      halign: "center",
    },

    columnStyles: {
      0: {
        cellWidth: 30,
        halign: "center",
      },

      1: {
        cellWidth: 100,
        halign: "left",
      },

      2: {
        cellWidth: 40,
        halign: "right",
      },
    },

    margin: {
      left: 20,
      right: 20,
    },

    // Subtotal, Total y Para despachar, destacados. Se reconocen por el rótulo
    // de su segunda columna y no por su posición: el depósito puede estar o no.
    didParseCell: function (data) {
      if (data.section !== "body") return;
      const desdeLosItems = data.row.index >= values.items.length;
      if (desdeLosItems && DESTACADOS.includes(data.row.raw[1])) {
        data.cell.styles.fontSize = 12;
        data.cell.styles.fontStyle = "bold";
        if (data.column.index === 1) {
          data.cell.styles.halign = "right";
        }
      }
    },
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
  doc.save(`${values.cotizacionId}.pdf`);
}
