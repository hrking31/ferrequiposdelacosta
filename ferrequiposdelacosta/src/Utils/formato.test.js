import {
  formatearMoneda,
  formatearMonedaOVacio,
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearNit,
  limpiarNit,
  formatearFechaLegible,
  formatearHoraLegible,
} from "./formato";

// Pruebas de las funciones de formato (presentación de importes, NIT, fechas y
// horas). Son funciones puras: reciben un valor y devuelven texto, sin tocar el
// DOM ni la red, así que se prueban directamente.
//
// Nota: para los importes NO comparamos el texto exacto de Intl (el espacio
// entre "$" y el número puede variar entre entornos); verificamos que aparezcan
// el signo y los dígitos agrupados, que es lo que de verdad importa.

describe("formatearMoneda", () => {
  it("muestra el importe en pesos con separador de miles", () => {
    const resultado = formatearMoneda(1234567);
    expect(resultado).toContain("$");
    expect(resultado).toContain("1.234.567");
  });

  it("trata null, undefined y cadena vacía como cero", () => {
    expect(formatearMoneda(null)).toContain("0");
    expect(formatearMoneda(undefined)).toContain("0");
    expect(formatearMoneda("")).toContain("0");
  });
});

describe("formatearMonedaOVacio", () => {
  it("formatea cuando el valor es un número", () => {
    expect(formatearMonedaOVacio(1000)).toContain("1.000");
  });

  it("cero es un número válido y se muestra", () => {
    expect(formatearMonedaOVacio(0)).toContain("0");
  });

  it("devuelve null cuando el valor no es un número", () => {
    expect(formatearMonedaOVacio(undefined)).toBeNull();
    expect(formatearMonedaOVacio(null)).toBeNull();
    expect(formatearMonedaOVacio("1000")).toBeNull();
  });
});

describe("formatearMonedaInput", () => {
  it("agrupa los miles mientras se escribe", () => {
    expect(formatearMonedaInput(1000)).toBe("1.000");
  });

  it("devuelve cadena vacía para valores vacíos o cero", () => {
    expect(formatearMonedaInput("")).toBe("");
    expect(formatearMonedaInput(0)).toBe("");
  });
});

describe("limpiarMonedaInput", () => {
  it("deja solo los dígitos", () => {
    expect(limpiarMonedaInput("$ 1.234.567")).toBe("1234567");
    expect(limpiarMonedaInput("abc123")).toBe("123");
  });
});

describe("limpiarNit", () => {
  it("quita los puntos y conserva dígitos y el guion del DV", () => {
    expect(limpiarNit("900.427.333-6")).toBe("900427333-6");
  });

  it("recorta a 11 caracteres como máximo", () => {
    expect(limpiarNit("123456789012345").length).toBeLessThanOrEqual(11);
  });
});

describe("formatearNit", () => {
  it("agrega los puntos de miles a un NIT sin formato", () => {
    expect(formatearNit("900427333")).toBe("900.427.333");
  });
});

describe("formatearFechaLegible", () => {
  it("convierte AAAA-MM-DD a DD/MM/AAAA", () => {
    expect(formatearFechaLegible("2026-08-07")).toBe("07/08/2026");
  });

  it("devuelve cadena vacía si no hay fecha", () => {
    expect(formatearFechaLegible("")).toBe("");
    expect(formatearFechaLegible(undefined)).toBe("");
  });
});

describe("formatearHoraLegible", () => {
  it("convierte la tarde a formato de 12 horas p. m.", () => {
    expect(formatearHoraLegible("14:30")).toBe("2:30 p. m.");
  });

  it("convierte la mañana a formato de 12 horas a. m.", () => {
    expect(formatearHoraLegible("09:05")).toBe("9:05 a. m.");
  });

  it("medianoche y mediodía se muestran como las 12", () => {
    expect(formatearHoraLegible("00:30")).toBe("12:30 a. m.");
    expect(formatearHoraLegible("12:30")).toBe("12:30 p. m.");
  });

  it("devuelve cadena vacía si no hay hora", () => {
    expect(formatearHoraLegible("")).toBe("");
  });
});
