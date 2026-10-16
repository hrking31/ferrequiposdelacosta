// EL REGISTRO DE CAMBIOS DE UNA FACTURA, puesto en palabras.
//
// El servidor anota cada cambio con la factura entera de antes y de después
// (ver anotarCambioDeFactura en functions/index.js). Eso sirve de prueba, pero
// no se puede leer: acá se comparan las dos y se dice QUÉ cambió, en
// renglones. Lo que no sabe describir lo dice igual, sin detalle, antes que
// callarlo.
//
// Y separa las dos clases de cambio. El servidor anota TODO —la base no
// distingue una corrección de un abono—, pero la pantalla muestra solo las
// CORRECCIONES: el dueño pidió el 2026-10-15 saber quién corrigió qué y
// cuándo, no ver el trabajo de todos los días.
//
//   corrige   cambia o quita algo que ya estaba escrito: una fecha, un monto,
//             un abono que desaparece.
//   anota     agrega algo nuevo: un abono, una devolución, una ampliación,
//             la entrega pactada, una llamada, la mora de la madrugada.
//
// Se reconoce por lo que cambió y no por la pantalla que lo hizo: así
// también aparece lo que se cambió por fuera de la pantalla de corregir.
import { calcularCuentaFactura, hechosDeEquipo } from "./facturaCuentas";
import {
  abonosDe,
  adicionalesDe,
  datosFactura,
  descuentosDe,
  entregasDe,
  estaDevuelto,
  gestionesDe,
  gruposDe,
  pagosDe,
  tipoPagoDe,
  tramoVencidoAbierto,
  vencidosDe,
} from "./facturaModelo";
import { nombreDelGrupo } from "./correccionFactura";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";
import { mismoContenido } from "../../Utils/mismoContenido";

const numero = (valor) => Number(valor) || 0;
// Sin mirar el orden de los campos: el mismo registro, leído dos veces, puede
// traerlos en otro orden, y lo que no cambió se describía como cambiado.
const igual = mismoContenido;
const plata = (valor) => formatearMoneda(numero(valor));
const fecha = (iso) => (iso ? formatearFechaLegible(iso) : "sin fecha");
const sumar = (lista) => lista.reduce((total, { monto }) => total + numero(monto), 0);

// Cada renglón con su clase (ver arriba).
const anota = (texto) => ({ texto, corrige: false });
const corrige = (texto) => ({ texto, corrige: true });

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
  const renglones = [];
  const quien = despues.nombre || antes.nombre;
  const decir = (clase, texto) => renglones.push(clase(`${quien}: ${texto}`));

  if (antes.nombre !== despues.nombre) {
    renglones.push(corrige(`Equipo: ${antes.nombre} → ${despues.nombre}`));
  }
  DATOS_DEL_EQUIPO.forEach(([campo, rotulo, mostrar]) => {
    if (antes[campo] !== despues[campo]) {
      decir(corrige, `${rotulo} ${mostrar(antes[campo])} → ${mostrar(despues[campo])}`);
    }
  });

  const hechosDe = (equipo, tipo) =>
    hechosDeEquipo(equipo).filter((hecho) => hecho.tipo === tipo);

  const [volvioAntes] = hechosDe(antes, "devolucion");
  const [volvioDespues] = hechosDe(despues, "devolucion");
  if (!volvioAntes && volvioDespues) {
    decir(anota, `se registró la devolución del ${fecha(volvioDespues.fecha)}`);
  } else if (volvioAntes && !volvioDespues) {
    decir(corrige, `se quitó la devolución del ${fecha(volvioAntes.fecha)}`);
  } else if (volvioAntes && volvioDespues) {
    if (volvioAntes.fecha !== volvioDespues.fecha) {
      decir(corrige, `devolución ${fecha(volvioAntes.fecha)} → ${fecha(volvioDespues.fecha)}`);
    }
    if (volvioAntes.cobraElDia !== volvioDespues.cobraElDia) {
      decir(
        corrige,
        volvioDespues.cobraElDia
          ? "ahora se cobra el día de la devolución"
          : "ya no se cobra el día de la devolución",
      );
    }
    const estado = ({ devolucion }) => [devolucion?.buenEstado !== false, devolucion?.motivo || ""];
    if (!igual(estado(volvioAntes), estado(volvioDespues))) {
      decir(
        corrige,
        volvioDespues.devolucion?.buenEstado === false
          ? `volvió con novedad: ${volvioDespues.devolucion.motivo || "sin detalle"}`
          : "volvió en buen estado",
      );
    }
    const retenido = ({ devolucion }) => numero(devolucion?.valorRetenido);
    if (retenido(volvioAntes) !== retenido(volvioDespues)) {
      decir(corrige, `retenido ${plata(retenido(volvioAntes))} → ${plata(retenido(volvioDespues))}`);
    }
  }

  // La pantalla de corregir no agrega ampliaciones: una de más es siempre la
  // que pidió el cliente.
  const ampliacionesAntes = hechosDe(antes, "ampliacion");
  const ampliacionesDespues = hechosDe(despues, "ampliacion");
  if (ampliacionesDespues.length === ampliacionesAntes.length + 1) {
    const nueva = ampliacionesDespues.at(-1);
    decir(anota, `se amplió ${nueva.dias} ${nueva.dias === 1 ? "día" : "días"} el ${fecha(nueva.fecha)}`);
  } else if (!igual(ampliacionesAntes, ampliacionesDespues)) {
    decir(corrige, "cambiaron sus ampliaciones");
  }

  const [pactadaAntes] = hechosDe(antes, "entregaPactada");
  const [pactadaDespues] = hechosDe(despues, "entregaPactada");
  if (!pactadaAntes && pactadaDespues) {
    decir(anota, `se pactó la entrega el ${fecha(pactadaDespues.fecha)}`);
  } else if (pactadaAntes && !pactadaDespues) {
    decir(corrige, "se quitó la entrega pactada");
  } else if (pactadaAntes?.fecha !== pactadaDespues?.fecha) {
    decir(corrige, `entrega pactada ${fecha(pactadaAntes.fecha)} → ${fecha(pactadaDespues.fecha)}`);
  }

  // Quitar la entrega pactada se lleva su anulación: eso ya lo dijo el
  // renglón de arriba.
  const [anuladaAntes] = hechosDe(antes, "entregaAnulada");
  const [anuladaDespues] = hechosDe(despues, "entregaAnulada");
  if (!anuladaAntes && anuladaDespues) {
    decir(anota, "se anuló la entrega pactada");
  } else if (anuladaAntes && !anuladaDespues && pactadaDespues) {
    decir(corrige, "se quitó la anulación de la entrega pactada");
  } else if (anuladaAntes && anuladaDespues && anuladaAntes.fecha !== anuladaDespues.fecha) {
    decir(
      corrige,
      `anulación de la entrega ${fecha(anuladaAntes.fecha)} → ${fecha(anuladaDespues.fecha)}`,
    );
  }

  if (
    hechosDe(antes, "indefinida").length === 0 &&
    hechosDe(despues, "indefinida").length > 0
  ) {
    decir(anota, "quedó sin fecha de entrega");
  }

  // Lo único que cambia solo, sin que nadie haga nada: la madrugada le abre
  // la mora al que amaneció pasado de plazo.
  const abierto = tramoVencidoAbierto(despues);
  if (!tramoVencidoAbierto(antes) && abierto && sigueIgualSalvoLaMora(antes, despues)) {
    decir(anota, `empezó a correr la mora desde el ${fecha(abierto.desde)}`);
  }

  // Cambió y nada de lo anterior lo explica. Si fue un pago que saldó la
  // factura, que le cierra la mora al equipo, es trabajo de todos los días;
  // si no, se tocaron los días vencidos o su descuento.
  if (renglones.length === 0 && !igual(antes, despues)) {
    if (soloSeCerroLaMora(antes, despues)) {
      decir(anota, `se cerró la mora el ${fecha(vencidosDe(despues).at(-1).hasta)}`);
    } else {
      decir(corrige, "cambiaron sus días vencidos");
    }
  }
  return renglones;
};

const sigueIgualSalvoLaMora = (antes, despues) =>
  igual({ ...antes, vencidos: null }, { ...despues, vencidos: null });

// Lo que hace un pago que salda la factura (ver sellarFacturaPagada): cierra
// el tramo que venía corriendo, o anota uno ya cerrado. Nada más se mueve: ni
// los tramos viejos ni ningún descuento.
const soloSeCerroLaMora = (antes, despues) => {
  if (!sigueIgualSalvoLaMora(antes, despues)) return false;
  const tramosAntes = vencidosDe(antes);
  const tramosDespues = vencidosDe(despues);
  if (tramosDespues.length < tramosAntes.length) return false;

  const losDeAntesSiguen = tramosAntes.every((tramo, indice) => {
    const ahora = tramosDespues[indice];
    if (igual(tramo, ahora)) return true;
    return (
      !tramo?.hasta &&
      Boolean(ahora?.hasta) &&
      igual({ ...tramo, hasta: null }, { ...ahora, hasta: null })
    );
  });
  const losNuevosCerrados = tramosDespues
    .slice(tramosAntes.length)
    .every((tramo) => Boolean(tramo?.hasta) && numero(tramo?.descuento) === 0);

  return losDeAntesSiguen && losNuevosCerrados;
};

const unidades = (equipos) =>
  equipos.reduce((total, equipo) => total + numero(equipo?.cantidadEquipos), 0);

const cambiosDeGrupo = (antes, despues) => {
  const renglones = [];
  const despacho = nombreDelGrupo(despues.grupo);
  const decir = (clase, texto) => renglones.push(clase(`${despacho}: ${texto}`));

  if (antes.fechaSolicitud !== despues.fechaSolicitud) {
    decir(corrige, `fecha ${fecha(antes.fechaSolicitud)} → ${fecha(despues.fechaSolicitud)}`);
  }

  const adicionalesAntes = adicionalesDe(antes);
  const adicionalesDespues = adicionalesDe(despues);
  if (
    (adicionalesAntes.transporte || "") !== (adicionalesDespues.transporte || "") ||
    numero(adicionalesAntes.valorTransporte) !== numero(adicionalesDespues.valorTransporte)
  ) {
    const transporte = ({ transporte: tipo, valorTransporte }) =>
      `${tipo || "Sin transporte"} ${plata(valorTransporte)}`;
    decir(corrige, `transporte ${transporte(adicionalesAntes)} → ${transporte(adicionalesDespues)}`);
  }
  if (numero(adicionalesAntes.valorDeposito) !== numero(adicionalesDespues.valorDeposito)) {
    decir(
      corrige,
      `depósito ${plata(adicionalesAntes.valorDeposito)} → ${plata(adicionalesDespues.valorDeposito)}`,
    );
  }

  if (
    tipoPagoDe(antes) !== tipoPagoDe(despues) ||
    !igual(pagosDe(antes), pagosDe(despues))
  ) {
    decir(corrige, `pago ${plata(sumar(pagosDe(antes)))} → ${plata(sumar(pagosDe(despues)))}`);
  }

  const equiposAntes = antes.equipos ?? [];
  const equiposDespues = despues.equipos ?? [];
  if (equiposAntes.length === equiposDespues.length) {
    equiposAntes.forEach((equipo, indice) => {
      renglones.push(...cambiosDeEquipo(equipo, equiposDespues[indice]));
    });
  } else {
    // Una línea se partió —devolvió o pactó una parte— o se cargó o quitó un
    // equipo: las de antes ya no se corresponden una a una con las de
    // después. Partirla no cambia cuántas unidades salieron; cargar o quitar
    // un equipo, sí.
    const devueltas = (equipos) => unidades(equipos.filter(estaDevuelto));
    const sePartio =
      unidades(equiposAntes) === unidades(equiposDespues) &&
      devueltas(equiposDespues) >= devueltas(equiposAntes);
    decir(
      sePartio ? anota : corrige,
      `${unidades(equiposAntes)} → ${unidades(equiposDespues)} unidades, ` +
        `${devueltas(equiposAntes)} → ${devueltas(equiposDespues)} devueltas`,
    );
  }
  return renglones;
};

const cambiosDePlata = (rotulo, antes, despues, { sinMedio = false } = {}) => {
  if (igual(antes, despues)) return [];
  // Los de antes siguen tal cual y llegaron otros: un abono con depósito y
  // plata trae dos de una vez.
  if (despues.length > antes.length && igual(despues.slice(0, antes.length), antes)) {
    return despues
      .slice(antes.length)
      .map((nuevo) =>
        anota(
          // El descuento no tiene medio: no entró plata por ningún lado.
          `${rotulo} de ${plata(nuevo.monto)}${
            sinMedio ? "" : ` por ${nuevo.medio || "—"}`
          } (${fecha(nuevo.fecha)})`,
        ),
      );
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
      return [corrige(`${rotulo} del ${fecha(viejo.fecha)}: ${partes.join(", ")}`)];
    });
  }
  return [corrige(`${rotulo}s: ${plata(sumar(antes))} → ${plata(sumar(despues))}`)];
};

// Los renglones de UN cambio, tal como lo anotó el servidor, cada uno con su
// clase.
const renglonesDelCambio = ({ clase, antes, despues, cuando }) => {
  if (clase === "creada") return [anota("Se creó la factura.")];
  if (clase === "borrada") return [corrige("Se borró la factura.")];

  const renglones = [];
  const datosAntes = datosFactura(antes);
  const datosDespues = datosFactura(despues);

  if (datosAntes.numeroFactura !== datosDespues.numeroFactura) {
    renglones.push(corrige(`Número: ${datosAntes.numeroFactura} → ${datosDespues.numeroFactura}`));
  }
  if (datosAntes.fechaCreacion !== datosDespues.fechaCreacion) {
    renglones.push(
      corrige(
        `Fecha de creación: ${fecha(datosAntes.fechaCreacion)} → ${fecha(datosDespues.fechaCreacion)}`,
      ),
    );
  }

  const gruposAntes = gruposDe(antes);
  gruposDe(despues).forEach((grupo) => {
    const previo = gruposAntes.find((cada) => cada.grupo === grupo.grupo);
    if (previo) {
      renglones.push(...cambiosDeGrupo(previo, grupo));
    } else {
      renglones.push(
        anota(
          `Se agregó el ${nombreDelGrupo(grupo.grupo).toLowerCase()}: ${unidades(grupo.equipos ?? [])} unidades.`,
        ),
      );
    }
  });
  gruposAntes
    .filter((grupo) => !gruposDe(despues).some((cada) => cada.grupo === grupo.grupo))
    .forEach((grupo) =>
      renglones.push(corrige(`Se quitó el ${nombreDelGrupo(grupo.grupo).toLowerCase()}.`)),
    );

  renglones.push(...cambiosDePlata("Abono", abonosDe(antes), abonosDe(despues)));
  renglones.push(...cambiosDePlata("Entrega", entregasDe(antes), entregasDe(despues)));
  renglones.push(
    ...cambiosDePlata("Descuento", descuentosDe(antes), descuentosDe(despues), { sinMedio: true }),
  );

  if (gestionesDe(despues).length > gestionesDe(antes).length) {
    renglones.push(anota("Se anotó una gestión de cobranza."));
  }
  // Lo resuelve la devolución, o sale solo de una corrección que ya tiene
  // su propio renglón.
  if (Boolean(datosAntes.depositoResuelto) !== Boolean(datosDespues.depositoResuelto)) {
    renglones.push(
      anota(
        datosDespues.depositoResuelto
          ? "El depósito quedó resuelto."
          : "El depósito volvió a quedar pendiente.",
      ),
    );
  }

  // Y lo que le importa al dueño: si el cambio movió la plata que se debe.
  // Es una consecuencia, no un cambio en sí: acompaña al que lo provocó.
  const dia = diaDelCambio(cuando);
  const saldoAntes = calcularCuentaFactura(antes, dia).saldoPendiente;
  const saldoDespues = calcularCuentaFactura(despues, dia).saldoPendiente;
  if (saldoAntes !== saldoDespues) {
    renglones.push(anota(`Saldo pendiente: ${plata(saldoAntes)} → ${plata(saldoDespues)}`));
  }

  // Lo que no se sabe nombrar se muestra: puede ser justo lo que se busca.
  return renglones.length > 0
    ? renglones
    : [corrige("Cambió la factura, sin detalle que mostrar.")];
};

export const describirCambio = (cambio) =>
  renglonesDelCambio(cambio).map(({ texto }) => texto);

// Si el cambio corrigió algo: cambió o quitó lo que ya estaba escrito.
export const esCorreccion = (cambio) =>
  renglonesDelCambio(cambio).some((renglon) => renglon.corrige);
