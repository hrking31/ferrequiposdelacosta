import { obtenerClientes, invalidarCopiaClientes } from "./clientesCache";

// La copia local de la lista de clientes: lo que evita leer 200 documentos cada
// vez que alguien abre la pantalla.
//
// La idea es simple y el riesgo también: si la copia se usa cuando NO
// corresponde, la lista muestra datos viejos. Estas pruebas fijan las dos
// mitades — cuándo se aprovecha y cuándo se tira.
const sello = vi.hoisted(() => vi.fn());

vi.mock("../Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: () => ({}),
  getDoc: () => Promise.resolve(sello()),
}));
vi.mock("../../Views/AdminForms/totalesPanelDb", () => ({
  COLECCION: "resumen",
  DOCUMENTO: "totales",
}));

// El sello es la fecha del último cambio que hubo en los clientes, y lo
// mantiene el servidor.
const conSello = (fecha) =>
  sello.mockReturnValue({ exists: () => true, data: () => ({ clientesActualizadoEn: fecha }) });

const sinDocumentoDeSello = () => sello.mockReturnValue({ exists: () => false });

const listaDe = (...nombres) => nombres.map((nombre, i) => ({ id: `c${i}`, nombre }));

beforeEach(() => {
  localStorage.clear();
  sello.mockReset();
});

describe("clientesCache — la primera vez", () => {
  it("trae todo de la base y guarda la copia", async () => {
    conSello(1000);
    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida", "Pedro")));

    const resultado = await obtenerClientes(traerTodos);

    expect(traerTodos).toHaveBeenCalledTimes(1);
    expect(resultado.desdeCopia).toBe(false);
    expect(resultado.clientes).toHaveLength(2);
  });
});

describe("clientesCache — cuando nadie tocó nada", () => {
  it("usa la copia y no vuelve a leer los clientes", async () => {
    conSello(1000);
    await obtenerClientes(() => Promise.resolve(listaDe("Aida", "Pedro")));

    // Segunda visita, con el mismo sello: no hay por qué pedir nada.
    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida", "Pedro")));
    const resultado = await obtenerClientes(traerTodos);

    expect(traerTodos).not.toHaveBeenCalled();
    expect(resultado.desdeCopia).toBe(true);
    expect(resultado.clientes).toHaveLength(2);
  });
});

describe("clientesCache — cuando algo cambió", () => {
  it("con un sello más nuevo, vuelve a traer todo", async () => {
    conSello(1000);
    await obtenerClientes(() => Promise.resolve(listaDe("Aida")));

    // Alguien tocó un cliente: el servidor movió el sello.
    conSello(2000);
    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida", "Pedro")));
    const resultado = await obtenerClientes(traerTodos);

    expect(traerTodos).toHaveBeenCalledTimes(1);
    expect(resultado.desdeCopia).toBe(false);
    expect(resultado.clientes).toHaveLength(2);
  });

  it("al invalidarla a mano, la próxima vez lee de la base", async () => {
    // Es lo que hace la pantalla cuando ella misma acaba de crear o borrar un
    // cliente: el servidor tarda un instante en mover el sello, y en ese
    // instante la copia todavía diría que no cambió nada.
    conSello(1000);
    await obtenerClientes(() => Promise.resolve(listaDe("Aida")));

    invalidarCopiaClientes();

    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida", "Pedro")));
    await obtenerClientes(traerTodos);

    expect(traerTodos).toHaveBeenCalledTimes(1);
  });
});

describe("clientesCache — cuando algo sale mal", () => {
  it("una copia corrupta no tumba la pantalla: se lee de nuevo", async () => {
    localStorage.setItem("clientes_copia", "{esto no es json");
    conSello(1000);

    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida")));
    const resultado = await obtenerClientes(traerTodos);

    expect(traerTodos).toHaveBeenCalledTimes(1);
    expect(resultado.clientes).toHaveLength(1);
  });

  it("una copia vieja se descarta aunque el sello coincida", async () => {
    // La red de seguridad: si el sello alguna vez no se escribiera, la copia no
    // puede quedarse vigente para siempre. Se le pone media hora y un minuto.
    conSello(1000);
    localStorage.setItem(
      "clientes_copia",
      JSON.stringify({
        sello: 1000,
        clientes: listaDe("Viejo"),
        guardadaEn: Date.now() - 31 * 60 * 1000,
      }),
    );

    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida")));
    const resultado = await obtenerClientes(traerTodos);

    expect(traerTodos).toHaveBeenCalledTimes(1);
    expect(resultado.clientes[0].nombre).toBe("Aida");
  });

  it("sin documento de sello todavía, funciona igual", async () => {
    // Base recién creada: nadie tocó un cliente, así que no hay sello.
    sinDocumentoDeSello();

    const traerTodos = vi.fn(() => Promise.resolve(listaDe("Aida")));
    const resultado = await obtenerClientes(traerTodos);

    expect(resultado.clientes).toHaveLength(1);
  });
});
