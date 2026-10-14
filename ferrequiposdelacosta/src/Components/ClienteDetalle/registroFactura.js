// EL REGISTRO DE CAMBIOS DE UNA FACTURA, puesto en palabras.
//
// El servidor anota cada cambio con la factura entera de antes y de después
// (ver anotarCambioDeFactura en functions/index.js). Eso sirve de prueba, pero
// no se puede leer: acá se comparan las dos y se dice QUÉ cambió, en
// renglones.
//
// No intenta adivinar la intención —"fue una corrección", "fue un abono"—:
// dice los hechos que se movieron y, al final, cómo quedó el saldo. Lo que no
// sabe describir lo dice igual, sin detalle, antes que callarlo.
import { calcularCuentaFactura, hechosDeEquipo } from "./facturaCuentas";
import {
  abonosDe,
  adicionalesDe,
  datosFactura,
  entregasDe,
  estaDevuelto,
  gestionesDe,
  gruposDe,
  pagosDe,
  tipoPagoDe,
  tramoVencidoAbierto,
} from "./facturaModelo";
import { nombreDelGrupo } from "./correccionFactura";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";

const numero = (valor) => Number(valor) || 0;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const plata = (valor) => formatearMoneda(numero(valor));
const fecha = (iso) => (iso ? formatearFechaLegible(iso) : "sin fecha");
const sumar = (lista) => lista.reduce((total, { monto }) => total + numero(monto), 0);

// El día del cambio en Colombia: la cuenta de una factura depende de la
// fecha, y la de antes y la de después se miden el mismo día.
const diaDelCambio = (cuando) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(cuando),
  );

// Cuándo se hizo, como se lee: "13/10/2026, 5:40 p. m.".
export const cuandoLegible = (cuando) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(cuando));

// Quién lo hizo. El servidor guarda el identificador que le da Firestore; acá
// se busca a qué usuario de la app corresponde. Sin persona detrás —el repaso
// de la madrugada, la consola de Firebase— se dice eso.
export const autorLegible = ({ quien, tipoDeAutor }, usuarios = []) => {
  const usuario = usuarios.find(
    ({ id, email }) => quien && (id === quien || email === quien),
  );
  if (usuario) return usuario.name || usuario.email || quien;
  if (tipoDeAutor === "system" || tipoDeAutor === "service_account") return "El sistema";
  return quien || "Autor desconocido";
};

const DATOS_DEL_EQUIPO = [
  ["cantidadEquipos", "cantidad", String],
  ["diasAlquilados", "días", String],
  ["valorDia", "precio por día", plata],
  ["fechaDespacho", "despacho", fecha],
  ["aplicaIva", "IVA", (lleva) => (lleva ? "sí" : "no")],
];

const cambiosDeEquipo = (antes, despues) => {
  const lineas = [];
  const quien = despues.nombre || antes.nombre;
  const decir = (texto) => lineas.push(`${quien}: ${texto}`);

  if (antes.nombre !== despues.nombre) {
    lineas.push(`Equipo: ${antes.nombre} → ${despues.nombre}`);
  }
  DATOS_DEL_EQUIPO.forEach(([campo, rotulo, mostrar]) => {
    if (antes[campo] !== despues[campo]) {
      decir(`${rotulo} ${mostrar(antes[campo])} → ${mostrar(despues[campo])}`);
    }
  });

  const hechosDe = (equipo, tipo) =>
    hechosDeEquipo(equipo).filter((hecho) => hecho.tipo === tipo);

  const [volvioAntes] = hechosDe(antes, "devolucion");
  const [volvioDespues] = hechosDe(despues, "devolucion");
  if (!volvioAntes && volvioDespues) {
    decir(`se registró la devolución del ${fecha(volvioDespues.fecha)}`);
  } else if (volvioAntes && !volvioDespues) {
    decir(`se quitó la devolución del ${fecha(volvioAntes.fecha)}`);
  } else if (volvioAntes && volvioDespues) {
    if (volvioAntes.fecha !== volvioDespues.fecha) {
      decir(`devolución ${fecha(volvioAntes.fecha)} → ${fecha(volvioDespues.fecha)}`);
    }
    if (volvioAntes.cobraElDia !== volvioDespues.cobraElDia) {
      decir(
        volvioDespues.cobraElDia
          ? "ahora se cobra el día de la devolución"
          : "ya no se cobra el día de la devolución",
      );
    }
    const estado = ({ devolucion }) => [devolucion?.buenEstado !== false, devolucion?.motivo || ""];
    if (!igual(estado(volvioAntes), estado(volvioDespues))) {
      decir(
        volvioDespues.devolucion?.buenEstado === false
          ? `volvió con novedad: ${volvioDespues.devolucion.motivo || "sin detalle"}`
          : "volvió en buen estado",
      );
    }
    const retenido = ({ devolucion }) => numero(devolucion?.valorRetenido);
    if (retenido(volvioAntes) !== retenido(volvioDespues)) {
      decir(`retenido ${plata(retenido(volvioAntes))} → ${plata(retenido(volvioDespues))}`);
    }
  }

  const ampliacionesAntes = hechosDe(antes, "ampliacion");
  const ampliacionesDespues = hechosDe(despues, "ampliacion");
  if (ampliacionesDespues.length === ampliacionesAntes.length + 1) {
    const nueva = ampliacionesDespues.at(-1);
    decir(`se amplió ${nueva.dias} ${nueva.dias === 1 ? "día" : "días"} el ${fecha(nueva.fecha)}`);
  } else if (!igual(ampliacionesAntes, ampliacionesDespues)) {
    decir("cambiaron sus ampliaciones");
  }

  const [pactadaAntes] = hechosDe(antes, "entregaPactada");
  const [pactadaDespues] = hechosDe(despues, "entregaPactada");
  if (!pactadaAntes && pactadaDespues) {
    decir(`se pactó la entrega el ${fecha(pactadaDespues.fecha)}`);
  } else if (pactadaAntes && !pactadaDespues) {
    decir("se quitó la entrega pactada");
  } else if (pactadaAntes?.fecha !== pactadaDespues?.fecha) {
    decir(`entrega pactada ${fecha(pactadaAntes.fecha)} → ${fecha(pactadaDespues.fecha)}`);
  }
  if (
    hechosDe(antes, "entregaAnulada").length === 0 &&
    hechosDe(despues, "entregaAnulada").length > 0
  ) {
    decir("se anuló la entrega pactada");
  }

  if (
    hechosDe(antes, "indefinida").length === 0 &&
    hechosDe(despues, "indefinida").length > 0
  ) {
    decir("quedó sin fecha de entrega");
  }

  // Lo único que cambia solo, sin que nadie haga nada: la madrugada le abre
  // la mora al que amaneció pasado de plazo.
  const abierto = tramoVencidoAbierto(despues);
  if (!tramoVencidoAbierto(antes) && abierto && sigueIgualSalvoLaMora(antes, despues)) {
    decir(`empezó a correr la mora desde el ${fecha(abierto.desde)}`);
  }

  // Cambió y nada de lo anterior lo explica: se dice igual.
  if (lineas.length === 0 && !igual(antes, despues)) {
    decir("cambiaron sus días vencidos");
  }
  return lineas;
};

const sigueIgualSalvoLaMora = (antes, despues) =>
  igual({ ...antes, vencidos: null }, { ...despues, vencidos: null });

const unidades = (equipos) =>
  equipos.reduce((total, equipo) => total + numero(equipo?.cantidadEquipos), 0);

const cambiosDeGrupo = (antes, despues) => {
  const lineas = [];
  const despacho = nombreDelGrupo(despues.grupo);
  const decir = (texto) => lineas.push(`${despacho}: ${texto}`);

  if (antes.fechaSolicitud !== despues.fechaSolicitud) {
    decir(`fecha ${fecha(antes.fechaSolicitud)} → ${fecha(despues.fechaSolicitud)}`);
  }

  const adicionalesAntes = adicionalesDe(antes);
  const adicionalesDespues = adicionalesDe(despues);
  if (
    (adicionalesAntes.transporte || "") !== (adicionalesDespues.transporte || "") ||
    numero(adicionalesAntes.valorTransporte) !== numero(adicionalesDespues.valorTransporte)
  ) {
    const transporte = ({ transporte: tipo, valorTransporte }) =>
      `${tipo || "Sin transporte"} ${plata(valorTransporte)}`;
    decir(`transporte ${transporte(adicionalesAntes)} → ${transporte(adicionalesDespues)}`);
  }
  if (numero(adicionalesAntes.valorDeposito) !== numero(adicionalesDespues.valorDeposito)) {
    decir(
      `depósito ${plata(adicionalesAntes.valorDeposito)} → ${plata(adicionalesDespues.valorDeposito)}`,
    );
  }

  if (
    tipoPagoDe(antes) !== tipoPagoDe(despues) ||
    !igual(pagosDe(antes), pagosDe(despues))
  ) {
    decir(`pago ${plata(sumar(pagosDe(antes)))} → ${plata(sumar(pagosDe(despues)))}`);
  }

  const equiposAntes = antes.equipos ?? [];
  const equiposDespues = despues.equipos ?? [];
  if (equiposAntes.length === equiposDespues.length) {
    equiposAntes.forEach((equipo, indice) => {
      lineas.push(...cambiosDeEquipo(equipo, equiposDespues[indice]));
    });
  } else {
    // Una línea se partió —devolvió una parte— o se cargó o quitó un equipo:
    // las de antes ya no se corresponden una a una con las de después.
    const devueltas = (equipos) => unidades(equipos.filter(estaDevuelto));
    decir(
      `${unidades(equiposAntes)} → ${unidades(equiposDespues)} unidades, ` +
        `${devueltas(equiposAntes)} → ${devueltas(equiposDespues)} devueltas`,
    );
  }
  return lineas;
};

const cambiosDePlata = (rotulo, antes, despues) => {
  if (igual(antes, despues)) return [];
  if (despues.length === antes.length + 1 && igual(despues.slice(0, -1), antes)) {
    const nuevo = despues.at(-1);
    return [`${rotulo} de ${plata(nuevo.monto)} por ${nuevo.medio || "—"} (${fecha(nuevo.fecha)})`];
  }
  // Los mismos, uno corregido: se dice qué cambió en cada uno. Con la suma
  // sola, corregir el medio se leía "Abonos: $20.000 → $20.000".
  if (despues.length === antes.length) {
    return despues.flatMap((nuevo, indice) => {
      const viejo = antes[indice];
      if (igual(viejo, nuevo)) return [];
      const partes = [];
      if (viejo.fecha !== nuevo.fecha) {
        partes.push(`fecha ${fecha(viejo.fecha)} → ${fecha(nuevo.fecha)}`);
      }
      if (viejo.medio !== nuevo.medio) {
        partes.push(`medio ${viejo.medio || "—"} → ${nuevo.medio || "—"}`);
      }
      if (Number(viejo.monto) !== Number(nuevo.monto)) {
        partes.push(`${plata(viejo.monto)} → ${plata(nuevo.monto)}`);
      }
      if (partes.length === 0) partes.push("cambió la factura que nombra");
      return [`${rotulo} del ${fecha(viejo.fecha)}: ${partes.join(", ")}`];
    });
  }
  return [`${rotulo}s: ${plata(sumar(antes))} → ${plata(sumar(despues))}`];
};

// Los renglones de UN cambio, tal como lo anotó el servidor.
export const describirCambio = ({ clase, antes, despues, cuando }) => {
  if (clase === "creada") return ["Se creó la factura."];
  if (clase === "borrada") return ["Se borró la factura."];

  const lineas = [];
  const datosAntes = datosFactura(antes);
  const datosDespues = datosFactura(despues);

  if (datosAntes.numeroFactura !== datosDespues.numeroFactura) {
    lineas.push(`Número: ${datosAntes.numeroFactura} → ${datosDespues.numeroFactura}`);
  }
  if (datosAntes.fechaCreacion !== datosDespues.fechaCreacion) {
    lineas.push(
      `Fecha de creación: ${fecha(datosAntes.fechaCreacion)} → ${fecha(datosDespues.fechaCreacion)}`,
    );
  }

  const gruposAntes = gruposDe(antes);
  gruposDe(despues).forEach((grupo) => {
    const previo = gruposAntes.find((cada) => cada.grupo === grupo.grupo);
    if (previo) {
      lineas.push(...cambiosDeGrupo(previo, grupo));
    } else {
      lineas.push(
        `Se agregó el ${nombreDelGrupo(grupo.grupo).toLowerCase()}: ${unidades(grupo.equipos ?? [])} unidades.`,
      );
    }
  });
  gruposAntes
    .filter((grupo) => !gruposDe(despues).some((cada) => cada.grupo === grupo.grupo))
    .forEach((grupo) =>
      lineas.push(`Se quitó el ${nombreDelGrupo(grupo.grupo).toLowerCase()}.`),
    );

  lineas.push(...cambiosDePlata("Abono", abonosDe(antes), abonosDe(despues)));
  lineas.push(...cambiosDePlata("Entrega", entregasDe(antes), entregasDe(despues)));

  if (gestionesDe(despues).length > gestionesDe(antes).length) {
    lineas.push("Se anotó una gestión de cobranza.");
  }
  if (Boolean(datosAntes.depositoResuelto) !== Boolean(datosDespues.depositoResuelto)) {
    lineas.push(
      datosDespues.depositoResuelto
        ? "El depósito quedó resuelto."
        : "El depósito volvió a quedar pendiente.",
    );
  }

  // Y lo que le importa al dueño: si el cambio movió la plata que se debe.
  const dia = diaDelCambio(cuando);
  const saldoAntes = calcularCuentaFactura(antes, dia).saldoPendiente;
  const saldoDespues = calcularCuentaFactura(despues, dia).saldoPendiente;
  if (saldoAntes !== saldoDespues) {
    lineas.push(`Saldo pendiente: ${plata(saldoAntes)} → ${plata(saldoDespues)}`);
  }

  return lineas.length > 0 ? lineas : ["Cambió la factura, sin detalle que mostrar."];
};
