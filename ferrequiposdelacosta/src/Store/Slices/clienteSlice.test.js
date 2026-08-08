import clienteReducer, {
  setCliente,
  actualizarCliente,
  actualizarDireccion,
  clearCliente,
} from "./clienteSlice";

describe("clienteSlice", () => {
  const clienteCompleto = {
    tipo: "persona",
    nombre: "Ana",
    telefono: "300",
    identificacion: "123",
    direccion: { detalle: "Calle 1", otrosDatos: "", barrio: "Centro", departamento: "Atlántico", municipio: "Barranquilla" },
    iva: true,
    deposito: false,
  };

  it("setCliente carga todos los datos del cliente", () => {
    const estado = clienteReducer(undefined, setCliente(clienteCompleto));
    expect(estado.nombre).toBe("Ana");
    expect(estado.direccion.municipio).toBe("Barranquilla");
    expect(estado.deposito).toBe(false);
  });

  it("actualizarCliente solo toca los campos que vienen definidos", () => {
    const inicial = clienteReducer(undefined, setCliente(clienteCompleto));
    const estado = clienteReducer(inicial, actualizarCliente({ nombre: "Beto" }));
    expect(estado.nombre).toBe("Beto");
    expect(estado.telefono).toBe("300"); // sin cambios
  });

  it("actualizarDireccion cambia solo los campos de dirección enviados", () => {
    const inicial = clienteReducer(undefined, setCliente(clienteCompleto));
    const estado = clienteReducer(inicial, actualizarDireccion({ barrio: "Norte" }));
    expect(estado.direccion.barrio).toBe("Norte");
    expect(estado.direccion.detalle).toBe("Calle 1"); // sin cambios
  });

  it("clearCliente vuelve al estado inicial", () => {
    const inicial = clienteReducer(undefined, setCliente(clienteCompleto));
    const estado = clienteReducer(inicial, clearCliente());
    expect(estado.nombre).toBe("");
    expect(estado.iva).toBe(true);
  });
});
