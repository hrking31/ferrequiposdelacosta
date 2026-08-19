import { describe, it, expect } from "vitest";
import {
  normalizarTelefono,
  construirEnlacesWhatsapp,
  debeAbrirLaWeb,
} from "./whatsapp";

// Pruebas de los enlaces de WhatsApp. Lo que se verifica acá es lo que se rompe
// en la práctica: que el de la app use el esquema `whatsapp://` —el que entra a
// la aplicación instalada en vez de abrir WhatsApp Web— y que el número salga
// con el indicativo, escriba el usuario como escriba.
//
// `abrirWhatsapp` no se prueba: es el pedazo que toca window.location y el
// temporizador. La lógica que puede equivocarse está toda acá.

describe("normalizarTelefono", () => {
  it("le pone el indicativo de Colombia al número local", () => {
    expect(normalizarTelefono("3116576633")).toBe("573116576633");
  });

  it("no lo repite si el número ya lo trae", () => {
    expect(normalizarTelefono("573116576633")).toBe("573116576633");
  });

  it("aguanta espacios, signos y paréntesis", () => {
    expect(normalizarTelefono("+57 (311) 657-6633")).toBe("573116576633");
  });

  it("devuelve vacío cuando no hay teléfono", () => {
    expect(normalizarTelefono("")).toBe("");
    expect(normalizarTelefono(null)).toBe("");
    expect(normalizarTelefono(undefined)).toBe("");
  });
});

describe("construirEnlacesWhatsapp", () => {
  it("arma el de la app con el esquema que abre la aplicación instalada", () => {
    const { app } = construirEnlacesWhatsapp("3116576633", "Hola");

    expect(app).toBe("whatsapp://send?phone=573116576633&text=Hola");
  });

  it("deja la página web como respaldo", () => {
    const { web } = construirEnlacesWhatsapp("3116576633", "Hola");

    expect(web).toBe("https://wa.me/573116576633?text=Hola");
  });

  it("codifica el mensaje en los dos, para que no se corte con símbolos", () => {
    const { app, web } = construirEnlacesWhatsapp("3116576633", "Hola 👋 #1 & 2");

    expect(app).toContain("Hola%20%F0%9F%91%8B%20%231%20%26%202");
    expect(web).toContain("Hola%20%F0%9F%91%8B%20%231%20%26%202");
  });

  it("no rompe cuando el mensaje viene vacío", () => {
    const { app, web } = construirEnlacesWhatsapp("3116576633", "");

    expect(app).toBe("whatsapp://send?phone=573116576633&text=");
    expect(web).toBe("https://wa.me/573116576633?text=");
  });
});

// El respaldo a la página web solo debe dispararse cuando NO se abrió ninguna
// app. Estas pruebas fijan el caso que ya falló una vez en el computador.
describe("debeAbrirLaWeb", () => {
  it("no abre la web si la ventana perdió el foco (abrió WhatsApp Desktop)", () => {
    // El caso del computador: la pestaña sigue VISIBLE detrás de la app, así
    // que la única señal es el foco. Antes acá se abrían las dos cosas.
    expect(
      debeAbrirLaWeb({
        perdioElFoco: true,
        estaOculta: false,
        tieneElFoco: false,
      }),
    ).toBe(false);
  });

  it("no abre la web si la pestaña quedó oculta (abrió la app del celular)", () => {
    expect(
      debeAbrirLaWeb({
        perdioElFoco: false,
        estaOculta: true,
        tieneElFoco: true,
      }),
    ).toBe(false);
  });

  it("no abre la web si la página ya no tiene el foco", () => {
    expect(
      debeAbrirLaWeb({
        perdioElFoco: false,
        estaOculta: false,
        tieneElFoco: false,
      }),
    ).toBe(false);
  });

  it("abre la web cuando no pasó nada: no hay WhatsApp instalado", () => {
    expect(
      debeAbrirLaWeb({
        perdioElFoco: false,
        estaOculta: false,
        tieneElFoco: true,
      }),
    ).toBe(true);
  });
});
