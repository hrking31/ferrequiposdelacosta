import { describe, expect, it } from "vitest";
import { hayCambios } from "./cambios";

describe("hayCambios", () => {
  it("no ve cambios entre dos formularios iguales", () => {
    const uno = { empresa: "Ana", total: 100 };
    expect(hayCambios(uno, { ...uno })).toBe(false);
  });

  it("ve un dato distinto", () => {
    expect(hayCambios({ empresa: "Ana" }, { empresa: "Luis" })).toBe(true);
  });

  it("ignora los campos internos que se le pasen", () => {
    const guardada = { empresa: "Ana", status: "pausada", id: "abc" };
    const emitida = { empresa: "Ana", status: "creada", id: "abc" };
    expect(hayCambios(emitida, guardada, ["status", "id"])).toBe(false);
  });

  it("sin lista de campos internos, todo cuenta", () => {
    const guardada = { empresa: "Ana", status: "pausada" };
    const emitida = { empresa: "Ana", status: "creada" };
    expect(hayCambios(emitida, guardada)).toBe(true);
  });

  it("no le afecta el orden de las claves", () => {
    expect(hayCambios({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("aguanta que falte el original", () => {
    expect(hayCambios({ empresa: "Ana" }, undefined)).toBe(true);
    expect(hayCambios({}, undefined)).toBe(false);
  });

  it("ve un ítem agregado, quitado o modificado", () => {
    const base = { items: [{ description: "Andamio", quantity: 2 }] };
    expect(hayCambios({ items: [] }, base)).toBe(true);
    expect(
      hayCambios({ items: [{ description: "Andamio", quantity: 5 }] }, base),
    ).toBe(true);
  });
});
