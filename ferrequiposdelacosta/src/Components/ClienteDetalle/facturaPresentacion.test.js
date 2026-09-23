// Las pruebas de lo que se DIBUJA de un equipo: su historia hito por hito,
// y el último acuerdo que cartera lee antes de llamar al cliente.
//
// Las dos salen de acá y no de cada pantalla por un motivo ya pagado: cuando
// Seguimiento y la ficha del cliente armaban lo suyo por separado, terminaron
// contando cosas distintas del mismo equipo.
import { describe, it, expect } from "vitest";
import {
  describirSalidaEquipo,
  historialEquipo,
  ultimoAcuerdoEquipo,
} from "./facturaPresentacion";
import {
  unaAmpliacion,
  unEquipo,
  unEquipoDevuelto,
  unTramoVencido,
} from "../../test/facturas";


describe("historialEquipo", () => {
  // Salió el 01/09 por 7 días, así que vencía el 07. Se le pasaron 2 días, el
  // 09 el cliente pagó esos días y quedó sin fecha de entrega; se le pasaron
  // otros 2 y el 11 se le pactaron 3 más, que corrieron desde ese día.
  const compresor = unEquipo({
    nombre: "COMPRESOR NEUMATICO INGERSOLLRAND 185",
    cantidad: 1,
    valorDia: 150000,
    dias: 7,
    fechaDespacho: "2026-09-01",
    // Estuvo sin fecha de entrega del 09 al 11.
    indefinida: { activa: false, desde: "2026-09-09", hasta: "2026-09-11" },
    // Sus dos tramos de mora, ya cerrados. El segundo corrió con permiso:
    // el cliente había avisado que no sabía cuándo devolvía.
    vencidos: [
      unTramoVencido({ desde: "2026-09-08", hasta: "2026-09-09" }),
      unTramoVencido({
        desde: "2026-09-10",
        hasta: "2026-09-11",
        indefinida: true,
      }),
    ],
    // Y lo único que pidió: 3 días, del 12 al 14.
    ampliaciones: [
      {
        fecha: "2026-09-11",
        dias: 3,
        desde: "2026-09-12",
        hasta: "2026-09-14",
        descuento: 0,
      },
    ],
  });

  const HOY_COMPRESOR = "2026-09-12";
  const titulos = (equipo, hoy = HOY_COMPRESOR) =>
    historialEquipo(equipo, hoy).map((hito) => hito.titulo);
  const buscar = (equipo, clave, hoy = HOY_COMPRESOR) =>
    historialEquipo(equipo, hoy).find((hito) => hito.clave === clave);

  it("cuenta la historia completa, en el orden en que pasó", () => {
    expect(titulos(compresor)).toEqual([
      "Salida en alquiler",
      "Venció el plazo",
      "Días vencidos",
      "Seguimiento con cliente",
      "Entrega indefinida",
      "Seguimiento con cliente",
      "Próximo vencimiento",
    ]);
  });

  it("la salida vale los días con los que se despachó", () => {
    const salida = buscar(compresor, "salida");
    expect(salida.fecha).toBe("2026-09-01");
    expect(salida.detalle).toBe("Se entregó el equipo por 7 días.");
    expect(salida.valor).toBe(1050000);
  });

  // La fecha del tramo es la del ÚLTIMO día contado, no la del primero: es
  // cuando el contador llegó a ese número. Con la del primero, el renglón se
  // leería como si ese día ya fueran dos.
  it("el tramo vencido se fecha en su último día y vale sus días", () => {
    const tramo = buscar(compresor, "vencidos-0");
    expect(tramo.fecha).toBe("2026-09-09");
    // Solo los días: si el cliente los pagó no se dice acá.
    expect(tramo.detalle).toBe("2 días");
    // El COSTO sí se muestra, que es lo que deja confirmar la cuenta.
    expect(tramo.valor).toBe(300000);
  });

  // La entrega indefinida no es un estado aparte: el equipo está vencido
  // igual, solo que con permiso. Por eso el tramo posterior al acuerdo cambia
  // de NOMBRE y conserva el tono del vencimiento.
  it("después del acuerdo el tramo se llama entrega indefinida, sin cambiar de tono", () => {
    const tramo = buscar(compresor, "vencidos-1");
    expect(tramo.titulo).toBe("Entrega indefinida");
    expect(tramo.tono).toBe("vencido");
    expect(tramo.detalle).toBe("2 días");
  });

  it("lo pactado se cuenta por los días que se pidieron, no por los consolidados", () => {
    const pactado = buscar(compresor, "pactado-0");
    expect(pactado.fecha).toBe("2026-09-11");
    expect(pactado.detalle).toBe("Se pactaron 3 días");
    // Los 3 días pedidos, no los 5 que corrió la fecha: los otros 2 ya están
    // contados en su propio tramo y sumarlos acá los cobraría dos veces.
    expect(pactado.valor).toBe(450000);
  });

  // El nodo de la entrega indefinida guarda las dos fechas: desde cuándo
  // estuvo sin fecha y hasta cuándo. La marca de arriba ya está apagada
  // —volvió a tener plazo— y aun así el hito se cuenta.
  it("recuerda el día en que quedó sin fecha de entrega, aunque ya no lo esté", () => {
    const acuerdo = buscar(compresor, "indefinida");
    expect(acuerdo.fecha).toBe("2026-09-09");
    expect(acuerdo.chip).toBe("indefinida");
    expect(compresor.indefinida.activa).toBe(false);
  });

  it("cierra con la fecha vigente y el estado del equipo", () => {
    const proximo = buscar(compresor, "proximo-vencimiento");
    expect(proximo.fecha).toBe("2026-09-14");
    expect(proximo.chip).toBe("ampliacion");
  });

  // Lo que todavía corre es lo único que se le reclama, y por eso es lo único
  // que va en rojo: los tramos ya cerrados son plata acordada.
  it("el tramo que sigue corriendo va en rojo y los cerrados en el acento", () => {
    // Cubierto hasta el 14; la madrugada del 15 le abrió otro tramo.
    const conTramoAbierto = {
      ...compresor,
      vencidos: [
        ...compresor.vencidos,
        unTramoVencido({ desde: "2026-09-15", hasta: null }),
      ],
    };
    const corriendo = historialEquipo(conTramoAbierto, "2026-09-16");
    expect(buscar(compresor, "vencidos-0").valorTono).toBe("acordado");
    expect(
      corriendo.find((hito) => hito.clave === "vencidos-hoy").valorTono,
    ).toBe("vencido");
  });

  // El caso de la 0123 de ReYaz: los gatos vencían el 11 y ese mismo 11 se les
  // pactaron 4 días. No se pasó ni un día, pero ese día el equipo ya estaba
  // vencido —así entra a cartera, para poder avisarle al cliente que vence
  // mañana— y el renglón tiene que decirlo.
  //
  // El 2026-09-22 se probó quitarle el chip —"hubo acuerdo, no hubo mora"— y
  // el dueño lo devolvió a esta regla el mismo día: el tramo vacío está
  // justamente para dejar escrito que llegó a vencerse. No volver a proponerlo.
  it("marca vencido el renglón del equipo que se renovó el día que vencía", () => {
    const renovadoEseDia = unEquipo({
      cantidad: 10,
      valorDia: 1500,
      dias: 3,
      fechaDespacho: "2026-09-09",
      // Cubierto hasta el 11, y ese mismo 11 se le pactaron 4 días. No se
      // pasó ni uno, pero ese día ya estaba vencido: queda un tramo que no
      // suma días y solo deja escrito que llegó a vencerse.
      vencidos: [unTramoVencido({ desde: "2026-09-12", hasta: "2026-09-11" })],
      ampliaciones: [
        {
          fecha: "2026-09-11",
          dias: 4,
          desde: "2026-09-12",
          hasta: "2026-09-15",
          descuento: 0,
        },
      ],
    });

    const renglon = buscar(renovadoEseDia, "vencimiento-0", "2026-09-12");
    expect(renglon.titulo).toBe("Venció el plazo");
    expect(renglon.chip).toBe("vencido");
  });

  // Y el espejo: al que le dieron más días antes de su fecha no se le venció
  // nada, así que su renglón no lleva chip.
  it("no marca vencido al que se renovó antes de su fecha", () => {
    const renovadoAntes = unEquipo({
      cantidad: 10,
      valorDia: 1500,
      dias: 3,
      fechaDespacho: "2026-09-09",
      // Se le dieron los 4 días el 10, un día ANTES de que se le acabara el
      // plazo: nunca se venció, así que no tiene ni un tramo.
      ampliaciones: [
        {
          fecha: "2026-09-10",
          dias: 4,
          desde: "2026-09-12",
          hasta: "2026-09-15",
          descuento: 0,
        },
      ],
    });

    expect(buscar(renovadoAntes, "vencimiento-0", "2026-09-12").chip).toBe(null);
  });

  // EL CASO QUE LO DESTAPÓ: el BENITIN de la 8154. Salió el 10 por 5 días,
  // venció el 14, ese mismo 14 se le pactaron 2 días —hasta el 16—, se pasó 6
  // y volvió el 22.
  //
  // Su vencimiento del 16 solo se veía abajo, como próximo vencimiento, y ese
  // renglón se apaga cuando el equipo vuelve: la historia pasaba de "se
  // pactaron 2 días" a "6 días vencidos" sin decir nunca desde cuándo
  // corrían. Ahora cada plazo cumplido deja su propio renglón, y quedan los
  // dos.
  describe("los dos plazos del BENITIN de la 8154", () => {
    const benitin = unEquipoDevuelto({
      nombre: "BENITIN",
      cantidad: 1,
      valorDia: 120000,
      dias: 5,
      fechaDespacho: "2026-09-10",
      fechaDevolucion: "2026-09-22",
      vencidos: [
        // El que no suma días: se abrió y se cerró el 14, cuando renovó.
        unTramoVencido({ desde: "2026-09-15", hasta: "2026-09-14" }),
        unTramoVencido({ desde: "2026-09-17", hasta: "2026-09-22" }),
      ],
      ampliaciones: [
        unaAmpliacion({
          fecha: "2026-09-14",
          dias: 2,
          desde: "2026-09-15",
          hasta: "2026-09-16",
        }),
      ],
    });

    const HOY = "2026-09-22";

    it("cuenta los dos vencimientos aunque el equipo ya haya vuelto", () => {
      expect(titulos(benitin, HOY)).toEqual([
        "Salida en alquiler",
        "Venció el plazo", // el 14, el del alta
        "Seguimiento con cliente",
        "Venció el plazo", // el 16, el de los 2 días que pidió
        "Días vencidos",
        "Devolución",
      ]);
    });

    // Los dos llevan chip: el del 14 porque llegó a vencerse aunque renovara
    // ese mismo día (el tramo vacío lo deja escrito), y el del 16 porque ahí
    // arrancó la mora de verdad.
    it("el del alta lleva chip: ese día llegó a estar vencido", () => {
      const alta = buscar(benitin, "vencimiento-0", HOY);
      expect(alta.fecha).toBe("2026-09-14");
      expect(alta.chip).toBe("vencido");
    });

    it("y el de la ampliación también, que es donde arrancó la mora", () => {
      const ampliado = buscar(benitin, "vencimiento-1", HOY);
      expect(ampliado.fecha).toBe("2026-09-16");
      expect(ampliado.chip).toBe("vencido");
    });

    // El que volvió ANTES de su fecha no tiene ningún plazo cumplido: nunca
    // llegó a vencer, y un renglón diciendo que venció sería falso.
    it("al que volvió antes de tiempo no le inventa un vencimiento", () => {
      const anticipado = unEquipoDevuelto({
        cantidad: 1,
        valorDia: 120000,
        dias: 5,
        fechaDespacho: "2026-09-10",
        fechaDevolucion: "2026-09-12",
      });

      expect(titulos(anticipado, HOY)).toEqual([
        "Salida en alquiler",
        "Devolución",
      ]);
    });
  });

  it("al que todavía no sale le cuenta la salida como programada", () => {
    const porSalir = unEquipo({
      cantidad: 1,
      valorDia: 80000,
      dias: 5,
      fechaDespacho: "2026-09-20",
    });
    const salida = buscar(porSalir, "salida", "2026-09-12");
    expect(salida.titulo).toBe("Salida programada");
    expect(salida.detalle).toBe("Pendiente: se entrega por 5 días.");
  });

  // Lo que dijo el cliente al devolverlo cuelga del hito que explica, con su
  // fecha. Antes vivía suelto bajo el nombre del equipo, sin decir cuándo.
  it("el motivo de la devolución va en su hito", () => {
    const conMotivo = unEquipoDevuelto({
      cantidad: 1,
      valorDia: 150000,
      dias: 5,
      fechaDespacho: "2026-09-01",
      fechaVencimiento: "2026-09-07",
      fechaDevolucion: "2026-09-05",
    });
    // Ojo, son dos campos distintos: `motivo` es por qué volvió dañado;
    // `motivoDevolucion` es lo que dijo el cliente al devolverlo antes de
    // tiempo, que es el que se muestra acá.
    conMotivo.devolucion.motivoDevolucion = "ya no lo necesita";

    expect(buscar(conMotivo, "devolucion").detalle).toBe(
      "Cliente: ya no lo necesita",
    );
  });

  it("al devuelto le agrega su vuelta a bodega y le saca el vencimiento", () => {
    const devuelto = unEquipoDevuelto({
      cantidad: 1,
      valorDia: 150000,
      dias: 7,
      fechaDespacho: "2026-09-01",
      fechaVencimiento: "2026-09-07",
      fechaDevolucion: "2026-09-07",
    });
    expect(titulos(devuelto)).toEqual(["Salida en alquiler", "Devolución"]);
  });
});

// Lo que cartera lee debajo del plazo, antes de llamar al cliente.
describe("ultimoAcuerdoEquipo", () => {
  it("al que nunca se le pactó nada no le inventa un antecedente", () => {
    expect(ultimoAcuerdoEquipo(unEquipo())).toBeNull();
  });

  it("dice cuántos días se le dieron y qué día fue", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-19",
      texto: "Se le dieron 3 días",
    });
  });

  it("un solo día se lee en singular", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 1 })],
    });

    expect(ultimoAcuerdoEquipo(equipo).texto).toBe("Se le dieron 1 día");
  });

  it("con varias prórrogas muestra la última, no la primera", () => {
    const equipo = unEquipo({
      ampliaciones: [
        unaAmpliacion({ fecha: "2026-08-19", dias: 3 }),
        unaAmpliacion({ fecha: "2026-08-23", dias: 5 }),
      ],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-23",
      texto: "Se le dieron 5 días",
    });
  });

  // El acuerdo vigente manda: es el que explica por qué este equipo no tiene
  // fecha, y reclamarle una sería reclamarle algo que se le concedió.
  it("sin fecha de entrega manda sobre la prórroga anterior", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
      indefinida: { activa: true, desde: "2026-08-24", hasta: null },
    });

    expect(ultimoAcuerdoEquipo(equipo)).toEqual({
      fecha: "2026-08-24",
      texto: "Quedó sin fecha de entrega",
    });
  });

  it("la entrega indefinida que ya se cerró deja de mandar", () => {
    const equipo = unEquipo({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-25", dias: 2 })],
      indefinida: { activa: false, desde: "2026-08-24", hasta: "2026-08-25" },
    });

    expect(ultimoAcuerdoEquipo(equipo).texto).toBe("Se le dieron 2 días");
  });

  it("al equipo devuelto no le queda nada que acordar", () => {
    const equipo = unEquipoDevuelto({
      ampliaciones: [unaAmpliacion({ fecha: "2026-08-19", dias: 3 })],
    });

    expect(ultimoAcuerdoEquipo(equipo)).toBeNull();
  });
});

// Desde cuando esta afuera el equipo, que es lo primero que se pregunta al
// negociar por telefono.
describe("describirSalidaEquipo", () => {
  it("cuenta hasta hoy mientras el equipo siga afuera", () => {
    const equipo = unEquipo({ fechaDespacho: "2026-08-01" });

    expect(describirSalidaEquipo(equipo, "2026-08-20")).toEqual({
      fecha: "2026-08-01",
      dias: 20,
    });
  });

  // El dia de salida cuenta: sale y vuelve el mismo dia es 1 dia, no 0.
  it("el dia de la salida ya cuenta", () => {
    const equipo = unEquipo({ fechaDespacho: "2026-08-20" });

    expect(describirSalidaEquipo(equipo, "2026-08-20").dias).toBe(1);
  });

  // El que volvio dejo de estar afuera: su cuenta se corta ahi y no sigue
  // creciendo con el calendario.
  it("el devuelto se corta el dia que volvio", () => {
    const equipo = unEquipoDevuelto({
      fechaDespacho: "2026-08-01",
      fechaDevolucion: "2026-08-05",
    });

    expect(describirSalidaEquipo(equipo, "2026-08-20").dias).toBe(5);
  });

  it("el que todavia no sale no lleva dias afuera", () => {
    const equipo = unEquipo({ fechaDespacho: "2026-08-25" });

    expect(describirSalidaEquipo(equipo, "2026-08-20").dias).toBe(0);
  });

  it("sin fecha de despacho no hay nada que decir", () => {
    expect(describirSalidaEquipo(unEquipo({ fechaDespacho: null }))).toBeNull();
  });
});
