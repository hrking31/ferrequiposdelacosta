import { faltanEnLaClave } from "./requisitosClave";

// La contraseña exigente. Lo que más importa: no aceptar nada que Firebase no
// cuente, porque esa cuenta se crearía y después no podría entrar.
describe("faltanEnLaClave", () => {
  it("una clave que cumple todo no tiene faltantes", () => {
    expect(faltanEnLaClave("Ferrequipos#2026")).toEqual([]);
  });

  it("dice todo lo que falta, en palabras", () => {
    expect(faltanEnLaClave("abc")).toEqual([
      "12 caracteres o más",
      "una mayúscula",
      "un número",
      "un signo, como ! @ # % & * ?",
    ]);
  });

  it("vacía, le falta todo", () => {
    expect(faltanEnLaClave()).toHaveLength(5);
  });

  it("la Ñ y las tildes no cuentan como mayúscula ni minúscula", () => {
    expect(faltanEnLaClave("ÑÁÉ#123456789")).toEqual(
      expect.arrayContaining(["una mayúscula", "una minúscula"]),
    );
  });

  it("el espacio, el guion y el más no son signos para Firebase", () => {
    expect(faltanEnLaClave("Ferrequipos 2026-+=")).toContain(
      "un signo, como ! @ # % & * ?",
    );
  });
});
