import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import {
  unEquipo,
  unEquipoDevuelto,
  unaFactura,
  unTramoVencido,
} from "../../test/facturas";

// La tarjeta de cartera: un cliente al que hay que cobrarle, con la factura que
// lo tiene ahí y lo que se puede hacer para destrabarla.
//
// Lo más valioso de probar es el RECORDATORIO DE WHATSAPP: hay un texto
// distinto según la gestión de esa factura, porque no es lo mismo escribirle a
// quien no contesta que a quien ya devolvió todo y solo debe plata. Ese texto
// se arma adentro del componente, así que se lo verifica por donde sale: lo que
// recibe abrirWhatsapp al tocar el botón.
const abrirWhatsapp = vi.hoisted(() => vi.fn());
vi.mock("../../Utils/whatsapp", async (importarOriginal) => ({
  ...(await importarOriginal()),
  abrirWhatsapp,
}));

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: (_db, ...partes) => partes.join("/"),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  writeBatch: () => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) }),
}));

const HOY = "2026-08-20";

const cliente = {
  id: "cli1",
  tipo: "persona",
  nombres: "Aida",
  apellido: "Pérez",
  telefono: "3116576633",
};

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 5,
    dias: 3,
    valorDia: 20000,
    fechaDespacho: "2026-08-01",
    ...extra,
  });

const facturaCon = (extra = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    subtotal: 300000,
    total: 300000,
    equipos: [andamio()],
    ...extra,
  }),
});

// Vencida hace rato, sin pagar y con el equipo todavía afuera.
const facturaVencida = facturaCon();

// Ya devolvió todo, pero quedó debiendo: esto es cobranza pura. Volvió el 05,
// dos días después de vencer, así que estuvo 5 días afuera.
const facturaEnCobro = facturaCon({
  equipos: [
    unEquipoDevuelto({
      nombre: "ANDAMIO",
      cantidad: 5,
      dias: 3,
      valorDia: 20000,
      fechaDespacho: "2026-08-01",
      // Cubierto hasta el 03 y volvió el 05: esos dos días de más son los
      // que hacen que la devolución cuente como cobranza.
      vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: "2026-08-05" })],
      fechaDevolucion: "2026-08-05",
    }),
  ],
});

// Sigue vencida por el ANDAMIO que no volvió, pero la MEZCLADORA el cliente la
// devolvió antes de que se venciera: esa devolución no fue cobranza.
const facturaConDevueltoEnPlazo = facturaCon({
  equipos: [
    andamio(),
    unEquipoDevuelto({
      nombre: "MEZCLADORA",
      cantidad: 1,
      dias: 4,
      valorDia: 50000,
      fechaDespacho: "2026-08-01",
      fechaDevolucion: "2026-08-04",
    }),
  ],
});

// Vencida por UN gato, con seis mezcladoras agregadas después que todavía
// están en plazo. Son 7 equipos afuera, pero solo 1 se le puede reclamar hoy.
const facturaConEquiposEnPlazo = facturaCon({
  equipos: [
    unEquipo({
      nombre: "GATO",
      cantidad: 1,
      dias: 3,
      valorDia: 20000,
      fechaDespacho: "2026-08-01",
    }),
    unEquipo({
      nombre: "MEZCLADORA",
      cantidad: 6,
      dias: 10,
      valorDia: 30000,
      fechaDespacho: "2026-08-15",
    }),
  ],
});

// Devolvió 4 de los 5 andamios y le queda uno afuera, ya vencido.
const facturaParcial = facturaCon({
  equipos: [andamio({ cantidad: 1 })],
  gestiones: [{ tipo: "devolucionParcial", unidades: 4, fecha: "2026-08-10" }],
});

// Le renovaron el equipo hasta 2099, así que ya no hay nada vencido, pero
// sigue debiendo lo de antes de esa renovación.
const facturaRenovada = facturaCon({
  equipos: [
    andamio({
      ampliaciones: [
        {
          fecha: "2026-08-03",
          dias: 30,
          desde: "2026-08-04",
          hasta: "2026-09-02",
          descuento: 0,
        },
      ],
    }),
  ],
});

// Con el tramo vencido ya abierto: del 04 al 20 son 17 dias de mora a
// $100.000 el dia (5 andamios x $20.000), y este equipo lleva IVA.
const facturaConMora = facturaCon({
  equipos: [
    andamio({
      aplicaIva: true,
      vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: null })],
    }),
  ],
});

// Se le acaba el plazo HOY: entra a cartera para poder avisarle, pero
// todavia no le corre ni un dia de mora.
const facturaQueVenceHoy = facturaCon({
  equipos: [andamio({ dias: 20 })],
});

// El cliente se lo quedo y avisara: no hay fecha que mostrar, pero si el dia
// en que se pacto.
const facturaSinFechaDeEntrega = facturaCon({
  equipos: [
    andamio({ indefinida: { activa: true, desde: "2026-08-10", hasta: null } }),
  ],
});

// Cuatro equipos vencidos: uno mas de los que entran en el renglon de la
// tarjeta plegada.
const facturaConCuatroEquipos = facturaCon({
  equipos: [
    andamio(),
    andamio({ nombre: "GATO", cantidad: 2 }),
    andamio({ nombre: "MEZCLADORA", cantidad: 1 }),
    andamio({ nombre: "SALTARIN", cantidad: 1 }),
  ],
});

const mostrar = (facturas = [facturaVencida], datosCliente = cliente) =>
  renderConProviders(
    <ClienteSeguimientoCard cliente={datosCliente} facturas={facturas} hoy={HOY} />,
  );

const botonWhatsapp = () =>
  screen.getAllByTestId("WhatsAppIcon")[0].closest("button");

const botonAbono = () =>
  screen.getAllByTestId("AttachMoneyIcon")[0].closest("button");

// Las facturas arrancan plegadas —de un cliente con varias se ve la lista de un
// vistazo—, así que el detalle de equipos ni se dibuja hasta desplegarla. Sin
// esto, una prueba que busca lo que NO debe aparecer pasa siempre.
const desplegarFactura = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Mostrar factura" }));

beforeEach(() => {
  abrirWhatsapp.mockClear();
});

describe("ClienteSeguimientoCard — lo que muestra", () => {
  it("dice de quién es la deuda y por qué factura", () => {
    mostrar();

    expect(screen.getByText("Aida Pérez")).toBeInTheDocument();
    expect(screen.getByText(/1573/)).toBeInTheDocument();
  });

  // La barra de valores es la MISMA que la del encabezado del cliente en su
  // ficha: sale de casillasDeCuenta y renderPizarraTotales, no se arma acá.
  // Así la misma cuenta no puede mostrarse de dos formas según la pantalla.
  it("muestra la barra con los cuatro valores de la cuenta", async () => {
    const { usuario } = mostrar();
    await desplegarFactura(usuario);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Abonos")).toBeInTheDocument();
    expect(screen.getByText("Saldo")).toBeInTheDocument();
  });

  // Cartera cuenta lo que se consiguió cobrando. Un equipo que volvió después
  // de vencer es exactamente eso.
  it("muestra lo que el cliente devolvió después de vencer", async () => {
    const { usuario } = mostrar([facturaEnCobro]);
    await desplegarFactura(usuario);

    expect(screen.getByText("Devuelto")).toBeInTheDocument();
  });

  // Y lo contrario: la factura entró a Seguimiento con los equipos que
  // QUEDARON. Mostrar los que ya habían vuelto obliga a quien cobra a
  // preguntarse cuándo y por qué volvieron, y eso no pasó en esta pantalla.
  // La factura entra a cartera por lo que venció. Un equipo agregado después,
  // todavía en fecha, no se le puede reclamar hoy: verlo acá hace preguntarse
  // por qué aparece algo que nadie tiene que devolver.
  it("no muestra los equipos que todavía están en plazo", async () => {
    const { usuario } = mostrar([facturaConEquiposEnPlazo]);
    await desplegarFactura(usuario);

    expect(screen.getByText(/GATO/)).toBeInTheDocument();
    expect(screen.queryByText(/MEZCLADORA/)).not.toBeInTheDocument();
  });

  // Una factura puede seguir en cartera sin un solo equipo vencido: le
  // renovaron el que la trajo y se queda por la plata. No lleva aviso — el
  // equipo simplemente no aparece, y el recuadro de la cuenta de arriba ya
  // dice cuánto falta cobrar.
  it("la factura sin equipos vencidos no muestra ninguno", async () => {
    const { usuario } = mostrar([facturaRenovada]);
    await desplegarFactura(usuario);

    expect(screen.queryByText(/ANDAMIO/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sigue en cartera/)).not.toBeInTheDocument();
  });

  it("no muestra lo que el cliente había devuelto en plazo", async () => {
    const { usuario } = mostrar([facturaConDevueltoEnPlazo]);
    await desplegarFactura(usuario);

    // El ANDAMIO sí está: es el que la tiene en cartera.
    expect(screen.getByText(/ANDAMIO/)).toBeInTheDocument();
    expect(screen.queryByText(/MEZCLADORA/)).not.toBeInTheDocument();
    expect(screen.queryByText("Devuelto")).not.toBeInTheDocument();
  });

  // La pregunta que le da nombre a esta pantalla: que hay afuera. Antes habia
  // que abrir cada tarjeta para contestarla.
  it("sin abrir la tarjeta ya dice que equipos hay afuera", () => {
    mostrar([facturaVencida]);

    expect(screen.getByText("5 ANDAMIO")).toBeInTheDocument();
  });

  // Se nombran tres y el resto se cuenta: la idea es reconocer el equipo de un
  // vistazo, no leer el inventario.
  it("con mas de tres equipos cuenta los que faltan", () => {
    mostrar([facturaConCuatroEquipos]);

    expect(screen.getByText("y 1 más")).toBeInTheDocument();
  });

  // Abierta, el equipo pasa a su ficha de cuatro columnas: el chip de arriba
  // se va y el nombre reaparece en la primera casilla.
  it("al abrir la tarjeta el equipo pasa a su ficha", async () => {
    const { usuario } = mostrar([facturaVencida]);
    expect(screen.getByText("5 ANDAMIO")).toBeInTheDocument();
    expect(screen.queryByText("Vencido")).not.toBeInTheDocument();

    await desplegarFactura(usuario);

    // En su ficha ya no es un texto solo: la cantidad vuelve a su recuadro, al
    // lado del nombre, y las otras casillas hablan de él.
    expect(screen.getByText("ANDAMIO")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText("Vencido")).toBeInTheDocument();
  });

  // Negociar por un equipo que lleva veinte dias en la obra no es lo mismo que
  // por uno que salio anteayer, y el plazo solo no lo dice. Son dos de las
  // cuatro casillas de sus condiciones.
  it("dice desde cuando esta afuera cada equipo", async () => {
    const { usuario } = mostrar([facturaVencida]);
    await desplegarFactura(usuario);

    // La salida acompaña al nombre en su casilla, con su calendario al lado;
    // los días afuera cierran la fila, con el tramo que los cuenta debajo.
    // Con que salió: el día y los días que se le contrataron.
    expect(screen.getByText("01/08/2026 · 3 días")).toBeInTheDocument();
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    // La mora arrancó el 04, al día siguiente de su plazo, y corre hasta hoy.
    expect(screen.getByText("04/08/2026 - 20/08/2026")).toBeInTheDocument();
  });

  // "Debe X" se discute; "el compresor solo ya va en Y" se negocia. Y va en el
  // equipo que lo genera: arriba, con la cuenta, no se sabria cual de los
  // cinco esta corriendo esa plata.
  // La casilla usa el rotulo para los dias y el valor para la plata, que es
  // como se dice al hablar: "17 dias vencidos, un millon setecientos".
  it("cada equipo dice cuanto cuestan sus dias vencidos", async () => {
    const { usuario } = mostrar([facturaConMora]);
    await desplegarFactura(usuario);

    // 5 andamios a $20.000 por 17 dias. La cifra va sin IVA, con el "+ IVA"
    // al lado, que es como se cotiza.
    expect(screen.getByText(/1\.700\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\+ IVA/)).toBeInTheDocument();
  });

  // Al que se le acaba el plazo hoy no se le cobra nada todavia, y su casilla
  // queda con una raya: la ficha tiene siempre las mismas cuatro columnas.
  it("al que vence hoy no le inventa dias vencidos", async () => {
    const { usuario } = mostrar([facturaQueVenceHoy]);
    await desplegarFactura(usuario);

    expect(screen.getByText("0 días vencidos")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  // Al que quedo sin fecha no se le puede decir "vencia el 10": lo que hay que
  // recordarle es el acuerdo y desde cuando corre.
  it("el equipo sin fecha de entrega dice cuando se pacto", async () => {
    const { usuario } = mostrar([facturaSinFechaDeEntrega]);
    await desplegarFactura(usuario);

    expect(screen.getByText("Entrega indefinida")).toBeInTheDocument();
    // Sin un "hasta" que contar: justamente no tiene fecha.
    expect(screen.getByText("10/08/2026")).toBeInTheDocument();
  });

  it("sin un teléfono usable no ofrece escribirle: no hay a dónde", () => {
    // Cuando el cliente no dio teléfono se carga un código —"SN", "NT",
    // "N/A"—, no un número inventado. Eso es lo que la tarjeta reconoce como
    // "no tiene".
    mostrar([facturaVencida], { ...cliente, telefono: "SN" });

    expect(screen.queryByTestId("WhatsAppIcon")).not.toBeInTheDocument();
  });
});

describe("ClienteSeguimientoCard — el recordatorio de WhatsApp", () => {
  it("le escribe al número del cliente, no al de la empresa", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    expect(abrirWhatsapp).toHaveBeenCalledTimes(1);
    expect(abrirWhatsapp.mock.calls[0][0]).toBe("3116576633");
  });

  it("al que todavía tiene equipos afuera le habla de la devolución", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Aida Pérez");
    expect(mensaje).toContain("1573");
    expect(mensaje).toMatch(/devoluci[óo]n/i);
  });

  it("al que ya devolvió todo solo se le cobra: no se le menciona devolver", async () => {
    const { usuario } = mostrar([facturaEnCobro]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Ya recibimos todos los equipos");
    expect(mensaje).toContain("solo queda pendiente el pago");
  });

  // El caso real: una factura vencida por UN equipo, con seis agregados
  // después que todavía están en plazo. El mensaje le reclamaba los siete.
  it("solo le reclama los equipos vencidos, no los que siguen en plazo", async () => {
    const { usuario } = mostrar([facturaConEquiposEnPlazo]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("1 equipo pendiente de devolución");
    expect(mensaje).not.toContain("7 equipos");
  });

  // "Todavía quedan 1 equipo" no concuerda. Con un equipo suelto es el caso
  // más común al final de una devolución parcial, así que se lee seguido.
  it("al que devolvió una parte le habla con el verbo concordado", async () => {
    const { usuario } = mostrar([facturaParcial]);

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("Todavía tienes 1 equipo pendiente de devolución");
    expect(mensaje).not.toContain("quedan 1 equipo");
  });

  it("el mensaje trae el saludo y la despedida de la empresa", async () => {
    const { usuario } = mostrar();

    await usuario.click(botonWhatsapp());

    const mensaje = abrirWhatsapp.mock.calls[0][1];
    expect(mensaje).toContain("👋 Hola, Aida Pérez.");
    expect(mensaje).toContain("Gracias por confiar en Ferrequipos de la Costa.");
  });
});

describe("ClienteSeguimientoCard — lo que se puede hacer desde cartera", () => {
  it("ofrece registrar la llamada, ampliar el vencimiento y registrar la devolución", () => {
    mostrar();

    // Son botones de solo ícono; se los ubica por el ícono de MUI.
    expect(screen.getAllByTestId("PhoneIcon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("UpdateIcon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("AssignmentReturnIcon").length).toBeGreaterThan(0);
  });

  // El orden de los botones cuenta el flujo del cobro: primero se resuelve el
  // EQUIPO —devolver, o pactarle plazo— y recién después la PLATA. Al revés se
  // cobraba primero y el equipo quedaba sin definir.
  it("pone los botones en el orden en que ocurre el cobro", () => {
    mostrar();

    // Los tres íconos, en el orden en que salen en el documento. La factura
    // arranca plegada, así que los únicos de la tarjeta son los de esta fila.
    const deLaFila = ["AssignmentReturnIcon", "UpdateIcon", "AttachMoneyIcon"];
    const orden = Array.from(document.querySelectorAll("svg[data-testid]"))
      .map((icono) => icono.getAttribute("data-testid"))
      .filter((nombre) => deLaFila.includes(nombre));

    expect(orden).toEqual(deLaFila);
  });

  // La plata que sale hacia el cliente: el depósito que vuelve, o lo que pagó
  // de más. Vivía solo en la ficha del cliente, y esa era la falla — la
  // factura se queda en cartera justamente por eso, así que se tiene que poder
  // resolver acá.
  it("ofrece devolverle la plata al cliente cuando la factura le quedó debiendo", () => {
    // Devolvió todo y había pagado de más: le quedan $100.000 a favor.
    const aFavor = facturaCon({
      equipos: [
        unEquipoDevuelto({
          nombre: "ANDAMIO",
          cantidad: 5,
          dias: 3,
          valorDia: 20000,
          fechaDespacho: "2026-08-01",
          fechaDevolucion: "2026-08-03",
        }),
      ],
      pagos: [{ medio: "Efectivo", monto: 400000 }],
    });

    mostrar([aFavor]);

    // CON EL MONTO ESCRITO. Era un ícono suelto entre otros tres —y pegado al
    // de abonar, que se apaga justo cuando este aparece—, así que no se veía.
    const boton = screen.getByRole("button", { name: /Devolver/ });
    expect(boton).toHaveTextContent(/100\.000/);
  });

  // Su lugar es el estado de cuenta, al lado de la cifra "A favor" que lo
  // explica. Pero ese recuadro solo existe con la factura abierta, y la
  // factura arranca cerrada: por eso el botón también sube a la fila. Nunca
  // están los dos a la vez.
  it("al abrir la factura, el botón de devolver pasa al estado de cuenta", async () => {
    const aFavor = facturaCon({
      equipos: [
        unEquipoDevuelto({
          nombre: "ANDAMIO",
          cantidad: 5,
          dias: 3,
          valorDia: 20000,
          fechaDespacho: "2026-08-01",
          fechaDevolucion: "2026-08-03",
        }),
      ],
      pagos: [{ medio: "Efectivo", monto: 400000 }],
    });

    const { usuario } = mostrar([aFavor]);

    await usuario.click(screen.getByRole("button", { name: "Mostrar factura" }));

    // Uno solo, y ya sin el monto: al lado está la casilla "A favor" que lo dice.
    const botones = screen.getAllByRole("button", { name: /Devolver/ });
    expect(botones).toHaveLength(1);
    expect(botones[0]).toHaveTextContent(/^Devolver$/);
    expect(screen.getByText("A favor")).toBeInTheDocument();
  });

  it("y no lo ofrece cuando no hay nada que devolverle", () => {
    mostrar();

    expect(screen.queryByTestId("CurrencyExchangeIcon")).not.toBeInTheDocument();
  });

  // A un cliente que no debe nada no se le registra un abono: no habría entre
  // qué facturas repartirlo. El botón se apaga en vez de esconderse, para que
  // el globo pueda decir por qué.
  //
  // Esto prueba la REGLA, no que el botón esté: si desapareciera, la prueba
  // fallaría igual porque no lo encontraría.
  it("con el cliente al día no deja registrar un abono", () => {
    const pagada = facturaCon({ pagos: [{ medio: "Efectivo", monto: 9999999 }] });

    mostrar([pagada]);

    expect(botonAbono()).toBeDisabled();
  });
});
