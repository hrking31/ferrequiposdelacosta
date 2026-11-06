import intercalarMarca, { FOTOS_ENTRE_MARCAS } from "./intercalarMarca";

// LA PAUSA DE MARCA de los carruseles (protector del kiosko y tienda): cada
// tres fotos, una diapositiva con el logo. Las dos pantallas leen la regla de
// acá, así que la regla se fija acá.
const MARCA = { marca: true };
const fotos = (n) => Array.from({ length: n }, (_, i) => `foto-${i}`);

describe("intercalarMarca", () => {
  it("es cada tres fotos", () => {
    expect(FOTOS_ENTRE_MARCAS).toBe(3);
  });

  it("mete el logo después de cada tercera foto", () => {
    expect(intercalarMarca(fotos(7))).toEqual([
      "foto-0", "foto-1", "foto-2", MARCA,
      "foto-3", "foto-4", "foto-5", MARCA,
      "foto-6",
    ]);
  });

  it("con un múltiplo exacto de tres, la vuelta termina en el logo", () => {
    expect(intercalarMarca(fotos(3))).toEqual(["foto-0", "foto-1", "foto-2", MARCA]);
  });

  // Si no, con una o dos fotos el logo no saldría nunca.
  it("con menos de tres fotos, el logo va una vez al final de la vuelta", () => {
    expect(intercalarMarca(fotos(1))).toEqual(["foto-0", MARCA]);
    expect(intercalarMarca(fotos(2))).toEqual(["foto-0", "foto-1", MARCA]);
  });

  it("sin fotos no hay nada que mostrar, ni siquiera el logo", () => {
    expect(intercalarMarca([])).toEqual([]);
  });

  it("no toca las fotos: pasan tal cual, sean lo que sean", () => {
    const conDatos = [{ url: "a", equipoId: "e1" }];
    expect(intercalarMarca(conDatos)[0]).toBe(conDatos[0]);
  });
});
