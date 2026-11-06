import { screen, within } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import CuentaDeCobro from "./CuentaDeCobro";
import resumenCuentaCobro from "./resumenCuentaCobro";

const cuenta = (extra = {}) => ({
  tipo: "persona",
  empresa: "Ana Pérez",
  obra: "",
  concepto: "",
  nit: "",
  direccion: "",
  fecha: "2026-11-04",
  transporte: "Sin transporte",
  valorTransporte: 0,
  iva: false,
  ivaNumero: 0,
  valorDeposito: 0,
  descuento: 0,
  pagado: 0,
  abonos: 0,
  subtotalNumero: 400000,
  total: 400000,
  desdeFacturas: false,
  desgloseFacturas: null,
  items: [
    {
      factura: "",
      description: "RETROEXCAVADORA",
      quantity: 1,
      day: 8,
      price: 50000,
      subtotal: 400000,
    },
  ],
  ...extra,
});

const abrir = (value, forma) =>
  renderConProviders(<CuentaDeCobro forma={forma} />, {
    estadoInicial: { cuentacobro: { value, original: value } },
  });

// Una cuenta traída de las facturas con su desglose ya hecho: así se elige
// exactamente qué le llegó a la cuenta y qué al depósito.
const conDesglose = ({ total = 400000, pagado = 0, deposito = {}, retenido = 0 } = {}) =>
  cuenta({
    desdeFacturas: true,
    valorDeposito: deposito.recibido ?? 0,
    subtotalNumero: total,
    total,
    desgloseFacturas: {
      pagado,
      abonos: 0,
      retenido,
      devueltoDeMas: 0,
      deposito: {
        recibido: 0,
        porCobrar: 0,
        aplicado: 0,
        devuelto: 0,
        enGarantia: 0,
        porDevolver: 0,
        ...deposito,
      },
    },
  });

// La pizarra (el Paper) que contiene un texto.
const pizarraDe = (texto) => screen.getByText(texto).closest(".MuiPaper-root");

describe("los días o las horas de cada ítem", () => {
  it("un ítem guardado sin unidad se lee como días", () => {
    abrir(cuenta());

    expect(screen.getByRole("combobox", { name: /Unidad/ })).toHaveTextContent("Días");
    expect(screen.getByRole("spinbutton", { name: "Días" })).toHaveValue(8);
    expect(screen.getByLabelText("Valor día")).toHaveValue("50.000");
  });

  it("al elegir horas guarda la unidad y no cambia la cuenta", async () => {
    const { store, usuario } = abrir(cuenta());

    await usuario.click(screen.getByRole("combobox", { name: /Unidad/ }));
    await usuario.click(within(screen.getByRole("listbox")).getByText("Horas"));

    const { items, total } = store.getState().cuentacobro.value;
    expect(items[0].unidad).toBe("horas");
    expect(items[0].subtotal).toBe(400000);
    expect(total).toBe(400000);
    expect(screen.getByRole("spinbutton", { name: "Horas" })).toHaveValue(8);
    expect(screen.getByLabelText("Valor hora")).toHaveValue("50.000");
  });

  it("un ítem nuevo arranca en días", async () => {
    const { store, usuario } = abrir(cuenta());

    await usuario.click(screen.getByRole("button", { name: "Agregar Ítem" }));

    const nuevo = store.getState().cuentacobro.value.items[1];
    expect(nuevo.unidad).toBe("dias");
    expect(nuevo).not.toHaveProperty("fechaDespacho");
    expect(nuevo).not.toHaveProperty("fechaDevolucion");
  });
});

describe("el número de factura de cada ítem", () => {
  it("a una persona se le muestra y se le puede escribir", () => {
    abrir(cuenta({ tipo: "persona" }));

    expect(screen.getByLabelText("Factura")).toBeEnabled();
  });

  it("a una empresa no se le muestra", () => {
    abrir(cuenta({ tipo: "empresa" }));

    expect(screen.queryByLabelText("Factura")).not.toBeInTheDocument();
  });

  it("tampoco a una empresa traída de las facturas", () => {
    abrir(cuenta({ tipo: "empresa", desdeFacturas: true }));

    expect(screen.queryByLabelText("Factura")).not.toBeInTheDocument();
  });
});

describe("la cuenta escrita a mano", () => {
  it("el depósito no suma al total y lo pagado lo cubre primero", async () => {
    const { store, usuario } = abrir(cuenta());

    await usuario.type(screen.getByLabelText("Valor Depósito"), "100000");
    await usuario.type(screen.getByLabelText("Valor Pagado"), "350000");

    const value = store.getState().cuentacobro.value;
    expect(value.total).toBe(400000);
    // $350.000 consignados: $100.000 de depósito y $250.000 de la cuenta.
    expect(resumenCuentaCobro(value).aCancelar).toBe(150000);
    expect(value).not.toHaveProperty("saldo");
  });
});

describe("la cuenta traída de las facturas", () => {
  const traida = () =>
    cuenta({
      desdeFacturas: true,
      valorDeposito: 100000,
      pagado: 350000,
      subtotalNumero: 430000,
      total: 430000,
      desgloseFacturas: {
        pagado: 250000,
        abonos: 0,
        retenido: 0,
        devueltoDeMas: 0,
        deposito: {
          recibido: 100000,
          porCobrar: 0,
          aplicado: 0,
          devuelto: 0,
          enGarantia: 100000,
          porDevolver: 0,
        },
      },
      items: [
        ...cuenta().items,
        // El renglón de los daños no tiene días: no se puede volver a sumar.
        {
          factura: "",
          description: "DAÑOS (retenido del depósito)",
          quantity: 1,
          day: "",
          price: 30000,
          subtotal: 30000,
        },
      ],
    });

  it("trae los campos llenos y bloqueados, sin agregar ni eliminar ítems", () => {
    abrir(traida());

    expect(screen.getByLabelText("Valor Depósito")).toBeDisabled();
    expect(screen.getByLabelText("Valor Depósito")).toHaveValue("100.000");
    expect(screen.getByLabelText("Valor Pagado")).toBeDisabled();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    screen.getAllByLabelText("Descripción").forEach((campo) => {
      expect(campo).toBeDisabled();
    });
    expect(screen.getAllByRole("combobox", { name: /Unidad/ })[0]).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Agregar Ítem" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Ítem" })).not.toBeInTheDocument();
  });

  it("escribir el concepto no recalcula nada ni pierde los daños", async () => {
    const { store, usuario } = abrir(traida());

    await usuario.type(screen.getByLabelText("Por concepto de"), "ALQUILER");

    const value = store.getState().cuentacobro.value;
    expect(value.concepto).toBe("ALQUILER");
    expect(value.subtotalNumero).toBe(430000);
    expect(value.total).toBe(430000);
    expect(value.desdeFacturas).toBe(true);
  });
});

describe("las dos pizarras, como el estado de cuenta de la factura", () => {
  it("sin pagos la cuenta cierra con el Total y el depósito dice que no hay", () => {
    abrir(cuenta());

    const cierre = pizarraDe("Subtotal").querySelector(".fila:last-of-type");
    expect(cierre).toHaveTextContent(/^Total/);
    expect(cierre).toHaveClass("total");
    expect(screen.queryByText("Saldo a cancelar")).not.toBeInTheDocument();
    expect(within(pizarraDe("DEPÓSITO")).getByText("Sin depósito")).toBeInTheDocument();
  });

  it("con lo que falta por pagar, el saldo cierra en rojo", () => {
    abrir(conDesglose({ total: 400000, pagado: 250000 }));

    const saldo = screen.getByText("Saldo a cancelar").closest(".fila");
    expect(saldo).toHaveClass("alerta");
    expect(saldo).not.toHaveClass("ok");
    expect(saldo).toHaveTextContent("150.000");
  });

  it("pagada entera, el saldo cierra en verde y en cero", () => {
    abrir(conDesglose({ total: 400000, pagado: 400000 }));

    const saldo = screen.getByText("Saldo a cancelar").closest(".fila");
    expect(saldo).toHaveClass("ok");
    expect(saldo).not.toHaveClass("alerta");
    // Con o sin ",00": Intl lo escribe distinto en el navegador y en Node.
    expect(saldo).toHaveTextContent(/\$\s*0(,00)?$/);
  });

  it("el depósito va en su pizarra, con lo que sale de él en negativo", () => {
    abrir(
      conDesglose({
        retenido: 30000,
        deposito: { recibido: 100000, aplicado: 20000, enGarantia: 50000 },
      }),
    );

    const deposito = within(pizarraDe("DEPÓSITO"));
    expect(deposito.queryByText("Sin depósito")).not.toBeInTheDocument();
    expect(deposito.getByText("Recibido").closest(".fila")).not.toHaveTextContent("-");
    expect(deposito.getByText("Retenido por daños").closest(".fila")).toHaveTextContent(
      /-\s*\$\s*30\.000/,
    );
    expect(deposito.getByText("Aplicado a la factura").closest(".fila")).toHaveTextContent(
      /-\s*\$\s*20\.000/,
    );
    // Lo que queda cierra resaltado, y no se repite como renglón suelto.
    const cierre = deposito.getByText("En garantía").closest(".fila");
    expect(cierre).toHaveClass("resaltada");
    expect(cierre).toHaveTextContent("50.000");
    expect(deposito.getAllByText("En garantía")).toHaveLength(1);
  });

  it("con depósito pero nada en garantía, igual cierra diciéndolo", () => {
    abrir(conDesglose({ deposito: { recibido: 100000, devuelto: 100000 } }));

    const cierre = within(pizarraDe("DEPÓSITO")).getByText("En garantía").closest(".fila");
    expect(cierre).toHaveClass("resaltada");
    expect(cierre).toHaveTextContent(/\$\s*0(,00)?$/);
  });
});

describe("el contador de ítems del iPad de pie", () => {
  it("dice cuántos ítems hay, al lado del botón de agregar", () => {
    abrir(cuenta(), "dePie");

    const contador = screen.getByText("Ítems").parentElement;
    expect(contador).toHaveTextContent(/^Ítems1$/);
    expect(contador.parentElement).toContainElement(
      screen.getByRole("button", { name: "Agregar Ítem" }),
    );
  });

  it("sin ítems no sale: queda solo el botón", () => {
    abrir(cuenta({ items: [] }), "dePie");

    expect(screen.queryByText("Ítems")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Ítem" })).toBeInTheDocument();
  });

  it("en las demás formas no hay contador", () => {
    abrir(cuenta());

    expect(screen.queryByText("Ítems")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Ítem" })).toBeInTheDocument();
  });
});
