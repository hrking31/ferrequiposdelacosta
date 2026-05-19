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
  doc.text(
    `${values.value.tipo === "empresa" ? "Señores" : "Nombre"}: ${
      values.value.empresa
    }`,
    20,
    63,
  );

  doc.text(
    `${values.value.tipo === "empresa" ? "NIT" : "Cédula"}: ${
      values.value.nit
    }`,
    20,
    70,
  );

  doc.text(
    `${
      values.value.tipo === "empresa" ? "Obra" : "Dirección"
    }: ${values.value.direccion} ${values.value.barrio}${
      values.value.otrosDatos ? `, ${values.value.otrosDatos}` : ""
    }`,
    20,
    77,
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
      ...values.value.items.map((item) => [
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

      // Subtotal
      ["", "Subtotal", values.value.subtotal],

      // IVA
      [
        `IVA`,
        "",
        Number(values.value.ivaNumero).toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
        }),
      ],

      // Depósito
      [
        `Depósito`,
        "",
        Number(values.value.valorDeposito).toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
        }),
      ],

      // Transporte
      [
        `Transporte`,
        `${values.value.transporte}`,
        Number(values.value.valorTransporte).toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
        }),
      ],

      // Total
      ["", "TOTAL", values.value.total],
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

    didParseCell: function (data) {
      const rowIndex = data.row.index;
      const itemsLength = values.value.items.length;

      // Subtotal
      if (rowIndex === itemsLength + 1) {
        data.cell.styles.fontSize = 12;
        data.cell.styles.fontStyle = "bold";
        if (data.column.index === 1) {
          data.cell.styles.halign = "right";
        }
      }

      // Total
      if (rowIndex === itemsLength + 5) {
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
  doc.save(`Cotizacion_${values.value.empresa}.pdf`);
}
