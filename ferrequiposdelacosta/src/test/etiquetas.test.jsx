import { screen } from "@testing-library/react";
import { renderConProviders } from "./utils";
import Cotizacion from "../Components/Cotizacion/Cotizacion";
import CuentaDeCobro from "../Components/CuentaDeCobro/CuentaDeCobro";
import DatosClienteModal from "../Components/DatosClienteModal/DatosClienteModal";

// Cazador de ETIQUETAS HUÉRFANAS.
//
// Chrome avisa en su pestaña "Issues": «Incorrect use of <label for=...> — the
// label's for attribute doesn't match any element id». Una etiqueta así no
// nombra a nada: quien usa un lector de pantalla escucha un campo sin nombre, y
// hacer clic en el texto no enfoca el campo.
//
// Ese aviso quedó abierto desde el 2026-07-10 en la pantalla de cotización,
// porque se intentó arreglar leyendo el código sin poder mirar el DOM real. Con
// las pruebas de pantalla ya no hace falta el navegador: acá se dibuja de
// verdad y se revisa el HTML que sale.
//
// Es una red para toda la app: si mañana alguien agrega un campo con una
// etiqueta mal apuntada, esta prueba lo caza antes de que llegue a producción.

// Devuelve las etiquetas cuyo "for" no encuentra a nadie.
const etiquetasHuerfanas = (contenedor) =>
  Array.from(contenedor.querySelectorAll("label[for]"))
    .filter((etiqueta) => !contenedor.querySelector(`#${CSS.escape(etiqueta.htmlFor)}`))
    .map((etiqueta) => ({ texto: etiqueta.textContent, apuntaA: etiqueta.htmlFor }));

// Y las que apuntan bien pero a un elemento que no es un campo: también quedan
// sin nombrar nada útil.
const etiquetasQueNoNombranUnCampo = (contenedor) =>
  Array.from(contenedor.querySelectorAll("label[for]"))
    .map((etiqueta) => ({
      etiqueta,
      destino: contenedor.querySelector(`#${CSS.escape(etiqueta.htmlFor)}`),
    }))
    .filter(({ destino }) => destino && !["INPUT", "SELECT", "TEXTAREA"].includes(destino.tagName))
    .map(({ etiqueta, destino }) => ({
      texto: etiqueta.textContent,
      apuntaA: `${etiqueta.htmlFor} (${destino.tagName})`,
    }));

// Los formularios grandes de la app que se pueden dibujar solos. Los que
// necesitan Firebase ya tienen su propia prueba y no hacen falta acá: lo que se
// revisa es el HTML de las etiquetas, no lo que guardan.
const formularios = [
  ["Cotización", <Cotizacion key="cot" />],
  ["Cuenta de cobro", <CuentaDeCobro key="cc" />],
  ["Datos del cliente", <DatosClienteModal key="dc" open onClose={() => {}} modoCliente />],
];

describe.each(formularios)("Etiquetas de formulario — %s", (_nombre, componente) => {
  it("ninguna etiqueta apunta a un elemento que no existe", () => {
    const { container } = renderConProviders(componente);

    expect(etiquetasHuerfanas(container)).toEqual([]);
  });

  it("todas las etiquetas nombran a un campo de verdad", () => {
    const { container } = renderConProviders(componente);

    expect(etiquetasQueNoNombranUnCampo(container)).toEqual([]);
  });
});

describe("Etiquetas de formulario — los desplegables de la cotización", () => {

  it("los tres desplegables se anuncian con su nombre", () => {
    // La prueba de fuego: un lector de pantalla busca el campo por el nombre
    // que le da su etiqueta. Si el "for" no llegara a destino, estos tres no
    // tendrían nombre y no se encontrarían así.
    //
    // Se piden por rol y no con getByLabelText porque un desplegable de MUI
    // son DOS elementos con la misma etiqueta (el campo oculto que guarda el
    // valor y el que se ve), y buscar por etiqueta encuentra los dos.
    renderConProviders(<Cotizacion />);

    expect(screen.getByRole("combobox", { name: /Departamento/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Municipio/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Transporte/ })).toBeInTheDocument();
  });
});
