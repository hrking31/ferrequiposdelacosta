import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PlazoEquipo from "./PlazoEquipo";
import DescuentosAmpliacion, { DescuentoVencidos } from "./DescuentosAmpliacion";
import {
  ampliarEquipo,
  anularEntregaPactada,
  cerrarIndefinida,
  cerrarTramoVencido,
  cubiertoHasta,
  dejarSinFechaDeEntrega,
  descontarVencidosDeHoy,
  descuentoExcedido,
  diaAnterior,
  entregaPactadaDe,
  estaPorRecoger,
  pactarEntrega,
  partirLinea,
  proyectarAmpliacion,
  seCobraElDiaAlDevolver,
  ultimoDiaCobrado,
  equipoAlDia,
  equipoVencido,
  calcularEstadoCliente,
  obtenerFechaHoyBogota,
  obtenerGestiones,
  crearRegistroGestion,
  facturaEnSeguimiento,
  calcularDeposito,
  calcularDepositoTotal,
  formatearMonedaInput,
  limpiarMonedaInput,
  datosFactura,
  gruposDe,
  equiposDe,
  adicionalesDe,
  sigueAfuera,
} from "../ClienteDetalle/facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

// Lo que se escribe sobre UNA línea de equipo: cuánto vuelve, en qué estado
// volvió y —si queda un remanente afuera— qué plazo se le da a ese remanente.
//
// El estado arranca en "volvió bien", que es lo que pasa casi siempre.
const ESTADO_INICIAL_CAMBIO = {
  cantidad: "",
  dias: "",
  descuento: "",
  descuentoVencidos: "",
  // El descuento sobre los días vencidos de lo que VUELVE. Los dos de arriba
  // son del plazo nuevo de lo que se queda.
  descuentoDevueltos: "",
  indefinida: false,
  buenEstado: true,
  motivoEstado: "",
  retenidoEstado: "",
  // Solo para el equipo que ya tenía la entrega pactada: el cliente no
  // entregó y la cuenta vuelve a correr.
  anular: false,
};

// Las decisiones del paso 1, en una barra partida como la del abono. Cada una
// se ofrece solo si hay a quién aplicarla (ver `opciones`).
const DECISIONES = {
  llego: { Icono: WarehouseIcon, titulo: "Llegó a la bodega", pregunta: "¿Qué llegó?" },
  pactada: { Icono: LocalShippingIcon, titulo: "Entrega pactada", pregunta: "¿Qué se pacta?" },
  noEntrego: { Icono: EventBusyIcon, titulo: "No entregó", pregunta: "¿Qué no entregó?" },
};

const rotuloDiasVencidos = (dias) =>
  dias === 1 ? "1 día vencido" : `${dias} días vencidos`;

// El nodo `devolucion` que se le pone a la línea que volvió. Su sola
// presencia es lo que dice que ese equipo ya no está afuera —no hay que
// restar cantidades—, y por eso se escribe SIEMPRE, también cuando volvió
// bien: "volvió sin novedad" es un dato, y su ausencia no se distingue de una
// devolución vieja que nadie calificó.
//
// El tope de lo retenido es el depósito del DESPACHO en el que salió ese
// equipo: no se puede retener del Benetín más de lo que el cliente dejó al
// llevárselo.
const devolucionDe = (cambio, fecha, topeRetencion = Infinity, motivoDevolucion = "") => {
  const bien = cambio?.buenEstado !== false;
  const devolucion = {
    fechaDevolucion: fecha,
    buenEstado: bien,
    // `motivo` es qué le PASÓ al equipo: solo se llena si volvió mal.
    motivo: bien ? "" : (cambio.motivoEstado || "").trim(),
    valorRetenido: bien
      ? 0
      : Math.min(topeRetencion, Math.max(0, Number(cambio.retenidoEstado) || 0)),
  };
  // Y este es por qué lo DEVUELVE, que es otra cosa: un equipo puede volver
  // impecable y aun así importar saber que la obra terminó. Se escribe solo
  // si alguien lo anotó, para no llenar de campos vacíos las devoluciones
  // hechas desde Seguimiento, donde ni se pregunta.
  const porQue = (motivoDevolucion || "").trim();
  if (porQue) devolucion.motivoDevolucion = porQue;
  return devolucion;
};

// Registra qué se devolvió de cada línea de equipo (total o parcial) y, si
// queda un remanente, integra en el mismo formulario la nueva fecha de
// vencimiento (o "indefinida") para lo que sigue con el cliente — mismo
// cálculo que usa AmpliarVencimientoDialog.
//
// Se abre desde dos lados y no hace lo mismo en los dos. Desde Seguimiento es
// una gestión de cobranza completa: se devuelve cualquier equipo y se pacta el
// plazo de lo que queda. Desde la ficha del cliente solo se registra lo que
// volvió en plazo, sin plazos nuevos y sin anotar nada en la bitácora (ver
// `desdeLaFicha`).
export default function RegistrarDevolucionDialog({
  open,
  onClose,
  cliente,
  factura,
  onActualizado,
  // Abierto desde la ficha del cliente: ahí solo se devuelve lo que todavía
  // no venció. Los equipos vencidos se devuelven desde Seguimiento, que es
  // donde esa devolución queda anotada como gestión de cobranza.
  desdeLaFicha = false,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [cambios, setCambios] = useState({});
  // Por qué el cliente devuelve. Es UNO para toda la tanda —trae lo que trae
  // por un mismo motivo, terminó la obra— y no uno por equipo, que sería el
  // mismo texto repetido. Solo se pregunta desde la ficha del cliente: ahí lo
  // que vuelve está EN PLAZO, así que devolver es una decisión suya y saber
  // por qué es un dato. Desde Seguimiento el equipo ya venció y el motivo es
  // el vencimiento.
  const [motivoDevolucion, setMotivoDevolucion] = useState("");
  // Paso 1, QUÉ SE ESTÁ ANOTANDO: que el equipo llegó a la bodega ("llego"),
  // que el cliente avisó y llega después ("pactada") o que no entregó lo que
  // había pactado ("noEntrego"). Null hasta que se elige: de eso depende todo
  // lo que se pregunta después.
  const [decision, setDecision] = useState(null);
  // La entrega pactada detiene la cuenta sin dar el equipo por devuelto.
  const modoPactada = decision === "pactada";
  const modoAnular = decision === "noEntrego";
  // Si el equipo vencido que vuelve paga el día de hoy. Arranca según la
  // hora —antes de las 3 p.m. no— y se puede cambiar: el reloj mira cuándo
  // se anota, no cuándo entregó el cliente.
  const [cobrarHoy, setCobrarHoy] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
    setMotivoDevolucion("");
    setDecision(null);
    setCobrarHoy(seCobraElDiaAlDevolver());
  }, [open]);

  const hoyIso = obtenerFechaHoyBogota();
  const ayerIso = diaAnterior(hoyIso);

  // Cada línea se identifica por su despacho y su posición dentro de él: los
  // equipos viven repartidos en grupos, así que un número suelto no alcanza
  // para señalar una sola.
  const claveDe = (grupo, indice) => `${grupo?.grupo}#${indice}`;

  const todosLosEquipos = equiposDe(factura);
  const lineasDelDialogo = todosLosEquipos
    .map(({ equipo, grupo, indice }) => ({
      equipo,
      grupo,
      indice,
      clave: claveDe(grupo, indice),
    }))
    // Cada pantalla ofrece lo suyo y nada más: la ficha, lo que sigue en
    // plazo; Seguimiento, lo vencido. Un equipo en fecha no se devuelve desde
    // cartera —esa devolución no es cobranza— y así ninguna de las dos
    // pantallas muestra equipos que no le corresponden.
    //
    // El que está por recoger se ofrece en las dos: ya no corre ni vence, y
    // lo único que le falta es que alguien anote que llegó.
    .filter(
      ({ equipo }) =>
        estaPorRecoger(equipo) ||
        (desdeLaFicha
          ? equipoAlDia(equipo)
          : sigueAfuera(equipo) && equipoVencido(equipo)),
    );
  // Hay a quién pactarle la entrega: algún equipo que todavía corre.
  const hayParaPactar = lineasDelDialogo.some(
    ({ equipo }) => !estaPorRecoger(equipo),
  );
  // Y hay a quién anulársela: alguno que ya está por recoger.
  const hayPorRecoger = lineasDelDialogo.some(({ equipo }) =>
    estaPorRecoger(equipo),
  );
  const opciones = [
    "llego",
    ...(hayParaPactar ? ["pactada"] : []),
    ...(hayPorRecoger ? ["noEntrego"] : []),
  ];
  // Para el rótulo del paso 1: "el equipo" o "los equipos".
  const unidadesDelDialogo = lineasDelDialogo.reduce(
    (total, { equipo }) => total + (Number(equipo.cantidadEquipos) || 0),
    0,
  );
  // Cada decisión muestra sus equipos y nada más; antes de elegir, ninguno.
  // A la bodega puede llegar cualquiera. Al pactar no van los que ya tienen
  // la entrega pactada —no hay nada nuevo que acordarles— y "no entregó" es
  // solo de ellos.
  const equiposPendientes = lineasDelDialogo.filter(
    ({ equipo }) =>
      decision === "llego" ||
      (modoPactada && !estaPorRecoger(equipo)) ||
      (modoAnular && estaPorRecoger(equipo)),
  );

  // Hasta qué día se le cobra la mora a lo que se anota ahora. La entrega
  // pactada corta siempre ayer: el día del aviso no se cobra. La devolución
  // de un vencido, según la casilla "Cobrar el día de hoy".
  // Desde la ficha solo vuelve lo que está en plazo, que no tiene mora: ahí
  // la casilla ni se muestra.
  const corteDeLaMora =
    modoPactada || (!cobrarHoy && !desdeLaFicha) ? ayerIso : hoyIso;

  // Cuántas unidades tiene todavía afuera una línea. Una línea devuelta volvió
  // ENTERA —al devolver una parte se parte en dos—, así que no hay cantidades
  // que restar: o está toda afuera, o no está.
  const pendienteDe = (equipo) =>
    sigueAfuera(equipo) ? Number(equipo.cantidadEquipos) || 0 : 0;

  // Cuánto devuelve de cada línea con lo que hay escrito ahora mismo. Sirve
  // para saber, mientras el usuario escribe, si esta devolución deja la
  // factura sin nada afuera.
  const cantidadQueDevuelve = (equipo, clave) => {
    const cambio = cambios[clave];
    // El que se anula no vuelve: sigue afuera y se le vuelve a cobrar.
    if (!cambio || cambio.anular) return 0;
    return Math.max(0, Math.min(pendienteDe(equipo), Number(cambio.cantidad) || 0));
  };

  // ¿Queda algo afuera en TODA la factura? No alcanza con mirar lo que ESTA
  // pantalla ofrece —cartera muestra solo lo vencido; la ficha, solo lo que
  // está en plazo—, porque el depósito es de la factura entera: mientras un
  // equipo de cualquier despacho siga en la calle no se cierra nada.
  //
  // El caso que lo destapó, la 8932 de Hernando Rey: tres despachos y un solo
  // equipo vencido, el SALTARIN. Devolverlo desde cartera daba la factura por
  // terminada —y liquidaba las tres garantías, $240.000— con 20 andamios y 2
  // tablones todavía afuera y en plazo.
  //
  // Con la entrega pactada no vuelve nada: los equipos siguen afuera hasta
  // que lleguen, así que el depósito tampoco se toca.
  const quedanEquiposAfuera =
    modoPactada ||
    todosLosEquipos.some(
      ({ equipo, grupo, indice }) =>
        pendienteDe(equipo) - cantidadQueDevuelve(equipo, claveDe(grupo, indice)) > 0,
    );
  const hayDevolucion = equiposPendientes.some(
    ({ equipo, clave }) => cantidadQueDevuelve(equipo, clave) > 0,
  );

  // ── El estado en que volvió cada equipo, y la plata que eso cuesta ────
  //
  // Son dos cosas distintas y ocurren en momentos distintos.
  //
  // CALIFICAR se hace equipo por equipo, el día que ese equipo vuelve: es el
  // único momento en que alguien lo tiene delante. Antes esto colgaba de la
  // liquidación del depósito, así que solo aparecía con el último equipo: un
  // cliente que devolvía uno de siete hoy y el resto en tres semanas dejaba
  // sin registrar cómo volvió el de hoy, y para entonces ya no hay quién lo
  // recuerde.
  //
  // LIQUIDAR sigue siendo al final: los depósitos se devuelven cuando la
  // factura queda sin nada afuera, así que lo retenido en cada devolución se
  // va sumando hasta ese momento.
  //
  // El depósito es de cada DESPACHO, no de la factura ni del equipo suelto: el
  // cliente pidió el Benetín y dejó $100.000, y a los días pidió una Rana y
  // dejó otros $50.000. Por eso cada equipo muestra el de su entrega, y de ahí
  // sale el tope de lo que se le puede retener.
  // Ahora es una lectura directa: el depósito está arriba, en el grupo, y no
  // escondido dentro del primer equipo del lote.
  const depositoDelGrupo = (grupo) => Number(adicionalesDe(grupo).valorDeposito) || 0;
  const lotesConDeposito = gruposDe(factura).filter(
    (grupo) => depositoDelGrupo(grupo) > 0,
  );

  const depositoTotal = calcularDepositoTotal(factura);
  const resolverDeposito =
    hayDevolucion &&
    !quedanEquiposAfuera &&
    depositoTotal > 0 &&
    !datosFactura(factura).depositoResuelto;

  // Lo anotado en devoluciones ANTERIORES, que vive en la línea de cada equipo
  // que ya volvió.
  const retencionesPrevias = todosLosEquipos
    .filter(({ equipo }) => Number(equipo?.devolucion?.valorRetenido) > 0)
    .map(({ equipo }) => ({
      nombre: equipo.nombre,
      motivo: equipo.devolucion.motivo || "",
      monto: Number(equipo.devolucion.valorRetenido) || 0,
    }));

  // Y lo que se está anotando en ESTA tanda.
  const retenidoAhoraDe = (equipo, grupo, clave) =>
    !modoPactada &&
    cantidadQueDevuelve(equipo, clave) > 0 &&
    cambios[clave]?.buenEstado === false
      ? devolucionDe(cambios[clave], "", depositoDelGrupo(grupo)).valorRetenido
      : 0;
  const retencionesAhora = equiposPendientes
    .map(({ equipo, grupo, clave }) => ({
      nombre: equipo.nombre,
      motivo: (cambios[clave]?.motivoEstado || "").trim(),
      monto: retenidoAhoraDe(equipo, grupo, clave),
    }))
    .filter(({ monto }) => monto > 0);

  const retenciones = [...retencionesPrevias, ...retencionesAhora];
  // Topado al depósito: nunca se puede retener más de lo que el cliente dejó.
  const retenido = Math.min(
    depositoTotal,
    retenciones.reduce((total, { monto }) => total + monto, 0),
  );

  // CUÁNTO SE LE DEVUELVE AL CLIENTE cuando se liquide. Es la misma cuenta
  // que harán la ficha y el diálogo de abono (calcularDeposito), hecha sobre
  // la factura como quedará al guardar: el depósito resuelto y lo retenido
  // anotado en cada equipo. Así cuenta lo que el cliente de verdad pagó, lo
  // que ya se usó para pagar la factura y lo que ya se le devolvió — decir
  // "se le devuelve completo" de un depósito que no pagó sería mentirle a
  // quien recibe los equipos.
  const porDevolverAlCliente = resolverDeposito
    ? calcularDeposito({
        ...factura,
        grupos: gruposDe(factura).map((grupo) => ({
          ...grupo,
          equipos: (grupo.equipos ?? []).map((equipo, indice) => {
            const ahora = retenidoAhoraDe(equipo, grupo, claveDe(grupo, indice));
            return ahora > 0
              ? { ...equipo, devolucion: { ...(equipo.devolucion ?? {}), valorRetenido: ahora } }
              : equipo;
          }),
        })),
        factura: { ...datosFactura(factura), depositoResuelto: { retenido } },
      }).porDevolver
    : 0;
  const queSeLeDevuelve =
    porDevolverAlCliente <= 0
      ? "No queda nada por devolverle"
      : porDevolverAlCliente >= depositoTotal
        ? "Se le devuelve completo al cliente"
        : `Se le devuelven ${formatearMoneda(porDevolverAlCliente)} al cliente`;

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleCambiarCantidad = (index, valor, pendiente) => {
    const numero = valor === "" ? "" : Math.max(0, Math.min(pendiente, Number(valor) || 0));
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], cantidad: numero },
    }));
  };

  // Al volver a marcar "buen estado" se limpian el motivo y lo retenido: si
  // no, quedaban escritos abajo, invisibles, y se guardaban igual.
  const handleCambiarBuenEstado = (index, bien) => {
    setCambios((prev) => ({
      ...prev,
      [index]: {
        ...ESTADO_INICIAL_CAMBIO,
        ...prev[index],
        buenEstado: bien,
        motivoEstado: bien ? "" : prev[index]?.motivoEstado || "",
        retenidoEstado: bien ? "" : prev[index]?.retenidoEstado || "",
      },
    }));
  };

  const handleCambiarEstado = (index, campo, valor) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], [campo]: valor },
    }));
  };

  const handleCambiarIndefinida = (index, marcada) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], indefinida: marcada, dias: "" },
    }));
  };

  const handleCambiarDias = (index, valor) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], dias: valor },
    }));
  };

  // `campo` es "descuento" (los días nuevos), "descuentoVencidos" (los
  // vencidos de lo que se queda) o "descuentoDevueltos" (los de lo que vuelve).
  const handleCambiarDescuento = (index, campo, valor) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], [campo]: valor },
    }));
  };

  // Lo que queda afuera de una línea, con la cantidad que se queda: es sobre
  // eso que se da el plazo nuevo y se hacen los descuentos.
  const proyeccionDelResto = (equipo, clave) => {
    const restante = pendienteDe(equipo) - cantidadQueDevuelve(equipo, clave);
    return proyectarAmpliacion(
      { ...equipo, cantidadEquipos: restante },
      Number(cambios[clave]?.dias) || 0,
    );
  };

  // Lo que vuelve de una línea, con la cantidad que vuelve: sus días vencidos
  // son los que se cierran hoy al devolver, y de ahí sale el tope de su
  // descuento. Mismo cálculo que la ampliación, sin días nuevos.
  //
  // Se cierran en el día que se le cobra, que no siempre es hoy: antes de las
  // 3 p.m., o al pactar la entrega, el último día cobrado es ayer.
  const proyeccionDeLoQueVuelve = (equipo, clave, hasta = corteDeLaMora) =>
    proyectarAmpliacion(
      { ...equipo, cantidadEquipos: cantidadQueDevuelve(equipo, clave) },
      0,
      hasta,
    );

  // Lo que se deja de cobrar por no contar el día de hoy, sumando lo que
  // vuelve de cada línea. Es lo que se le dice a quien anota: "hoy no se
  // cobra · −$9.000".
  const ahorroDeHoy = equiposPendientes.reduce(
    (total, { equipo, clave }) =>
      estaPorRecoger(equipo) || cantidadQueDevuelve(equipo, clave) <= 0
        ? total
        : total +
          proyeccionDeLoQueVuelve(equipo, clave, hoyIso).valorVencidos -
          proyeccionDeLoQueVuelve(equipo, clave, ayerIso).valorVencidos,
    0,
  );

  // Cambiar de decisión arranca de cero: lo escrito para una no significa lo
  // mismo en la otra. "No entregó" trae marcados los que estaban por recoger
  // —es lo que se acaba de decir—, y se puede desmarcar el que sí va a llegar.
  const handleCambiarDecision = (nueva) => {
    setDecision(nueva);
    setCambios(
      nueva === "noEntrego"
        ? Object.fromEntries(
            lineasDelDialogo
              .filter(({ equipo }) => estaPorRecoger(equipo))
              .map(({ clave }) => [clave, { ...ESTADO_INICIAL_CAMBIO, anular: true }]),
          )
        : {},
    );
  };

  const handleCambiarAnular = (index, marcada) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, anular: marcada },
    }));
  };

  // El nombre de la casilla de lo que vuelve: "Descuento de…". La de lo que
  // se queda sigue diciendo "Descuento en…" y va más abajo, dentro de lo que
  // queda sin devolver.
  const etiquetaDescuentoDevueltos = (dias) =>
    dias === 1
      ? "Descuento del día vencido"
      : `Descuento de los ${dias} días vencidos`;

  // ── 3. Así queda ──────────────────────────────────────────────────────
  //
  // Lo que resulta de lo escrito arriba: hasta qué día se cobra y cuánto
  // valen los días vencidos que se cierran. No es una cuenta nueva —es la
  // misma proyección que usan las casillas de descuento—: acá solo se suma lo
  // que cada equipo ya decía por separado.
  const loQueSeAnota = equiposPendientes
    .map(({ equipo, clave }) => {
      const cambio = cambios[clave];

      if (modoAnular) {
        if (!cambio?.anular) return null;
        // La mora que se le vuelve a abrir: del día del aviso hasta hoy.
        const { diasVencidos, valorVencidos } = proyectarAmpliacion(
          anularEntregaPactada(equipo, hoyIso),
          0,
          hoyIso,
        );
        return {
          corte: entregaPactadaDe(equipo).fecha,
          dias: diasVencidos,
          valor: valorVencidos,
          descuento: 0,
        };
      }

      if (cantidadQueDevuelve(equipo, clave) <= 0) return null;

      // El que estaba por recoger llega sin sumar nada: se le cobra hasta
      // donde se había detenido.
      if (estaPorRecoger(equipo)) {
        return { corte: ultimoDiaCobrado(equipo, hoyIso), dias: 0, valor: 0, descuento: 0 };
      }

      const { diasVencidos, valorVencidos } = proyeccionDeLoQueVuelve(equipo, clave);
      return {
        corte: modoPactada
          ? ultimoDiaCobrado(pactarEntrega(equipo, hoyIso), hoyIso)
          : cubiertoHasta(equipo) < hoyIso
            ? corteDeLaMora
            : hoyIso,
        dias: diasVencidos,
        valor: valorVencidos,
        descuento: desdeLaFicha
          ? 0
          : Math.min(valorVencidos, Math.max(0, Number(cambio?.descuentoDevueltos) || 0)),
      };
    })
    .filter(Boolean);

  const sinRepetir = (valores) => [...new Set(valores)];
  const cortes = sinRepetir(loQueSeAnota.map(({ corte }) => corte));
  const diasEnMora = sinRepetir(
    loQueSeAnota.filter(({ dias }) => dias > 0).map(({ dias }) => dias),
  );
  const valorVencidos = loQueSeAnota.reduce((total, { valor }) => total + valor, 0);
  const descuentoVencidos = loQueSeAnota.reduce(
    (total, { descuento }) => total + descuento,
    0,
  );
  // Con equipos de distinto atraso no hay un solo número de días que decir.
  const rotuloVencidos =
    diasEnMora.length === 1 ? rotuloDiasVencidos(diasEnMora[0]) : "Días vencidos";

  const filasResumen = [
    // La fecha solo si es una para toda la tanda: con dos distintas, cada
    // equipo ya muestra la suya arriba.
    ...(cortes.length === 1
      ? [
          {
            rotulo: modoAnular ? "Vuelve a correr desde" : "Se cobra hasta",
            valor: formatearFechaLegible(cortes[0]),
          },
        ]
      : []),
    ...(valorVencidos > 0 && descuentoVencidos > 0
      ? [
          { rotulo: rotuloVencidos, valor: formatearMoneda(valorVencidos) },
          { rotulo: "Descuento", valor: `−${formatearMoneda(descuentoVencidos)}` },
        ]
      : []),
    ...(valorVencidos > 0
      ? [
          {
            rotulo: descuentoVencidos > 0 ? "Vencidos por cobrar" : rotuloVencidos,
            valor: formatearMoneda(valorVencidos - descuentoVencidos),
            clase: valorVencidos - descuentoVencidos > 0 ? "alerta" : "ok",
          },
        ]
      : []),
  ];

  const rotuloPaso = (numero, texto, mb = 1) => (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "flex", alignItems: "center", gap: 1, lineHeight: 1.6, mb }}
    >
      <Box
        component="span"
        sx={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: acento,
          color: theme.palette.getContrastText(acento),
          fontSize: "0.7rem",
          fontWeight: "bold",
        }}
      >
        {numero}
      </Box>
      {texto}
    </Typography>
  );

  const handleGuardar = async () => {
    const huboCambios = equiposPendientes.some(({ clave }) => {
      const cambio = cambios[clave];
      return cambio && (cambio.anular || Number(cambio.cantidad) > 0);
    });
    if (!huboCambios) {
      showSnackbar(
        modoAnular
          ? "Marcá al menos un equipo que no entregó."
          : modoPactada
            ? "Ingresá la cantidad con entrega pactada de al menos un equipo."
            : "Ingresá la cantidad que devuelve al menos un equipo.",
        "warning",
      );
      return;
    }

    // Marcar que un equipo volvió mal sin decir qué le pasó no sirve de nada:
    // eso es lo único que después justifica el descuento frente al cliente.
    // El monto sí puede quedar en blanco — a veces el daño se ve hoy y lo que
    // cuesta arreglarlo recién se sabe después.
    const sinMotivo = equiposPendientes.find(
      ({ equipo, clave }) =>
        cantidadQueDevuelve(equipo, clave) > 0 &&
        cambios[clave]?.buenEstado === false &&
        !(cambios[clave]?.motivoEstado || "").trim(),
    );
    if (sinMotivo) {
      showSnackbar(`Escribí qué le pasó al ${sinMotivo.equipo.nombre}.`, "warning");
      return;
    }

    // Y no se puede retener más de lo que el cliente dejó por ESA entrega.
    // Se avisa en vez de recortarlo solo: guardar un número menor que el
    // escrito, sin decirlo, es la forma de que alguien crea que retuvo una
    // plata que nunca se retuvo.
    const seExcede = equiposPendientes.find(
      ({ equipo, grupo, clave }) =>
        cantidadQueDevuelve(equipo, clave) > 0 &&
        cambios[clave]?.buenEstado === false &&
        Number(cambios[clave]?.retenidoEstado) > depositoDelGrupo(grupo),
    );
    if (seExcede) {
      showSnackbar(
        `Por la entrega del ${seExcede.equipo.nombre} el cliente dejó ${formatearMoneda(
          depositoDelGrupo(seExcede.grupo),
        )}.`,
        "warning",
      );
      return;
    }

    // Los descuentos del plazo nuevo, igual que en el diálogo de ampliar:
    // ninguno puede pasar de lo que valen sus días.
    const descuentoDeMas = equiposPendientes.some(({ equipo, clave }) => {
      const cambio = cambios[clave];
      const quedan = pendienteDe(equipo) - cantidadQueDevuelve(equipo, clave);
      return (
        cambio &&
        cantidadQueDevuelve(equipo, clave) > 0 &&
        quedan > 0 &&
        !cambio.indefinida &&
        Number(cambio.dias) > 0 &&
        descuentoExcedido(proyeccionDelResto(equipo, clave), cambio)
      );
    });
    // Y el de lo que vuelve, con la misma regla.
    const descuentoDevueltosDeMas = equiposPendientes.some(
      ({ equipo, clave }) =>
        !desdeLaFicha &&
        !estaPorRecoger(equipo) &&
        cantidadQueDevuelve(equipo, clave) > 0 &&
        Number(cambios[clave]?.descuentoDevueltos) >
          proyeccionDeLoQueVuelve(equipo, clave).valorVencidos,
    );
    if (descuentoDeMas || descuentoDevueltosDeMas) {
      showSnackbar("Un descuento pasa de lo que valen sus días.", "warning");
      return;
    }

    setGuardando(true);
    try {
      const hoy = obtenerFechaHoyBogota();
      let huboCierre = false;
      let huboAnulacion = false;
      // Cuántas unidades volvieron en esta tanda, para dejarlo escrito en la
      // línea de tiempo ("Devolución parcial: 3 equipos").
      let unidadesDevueltas = 0;

      // Lo que se queda afuera de una línea que se parte: más días, entrega
      // indefinida, o su misma fecha si no se le pactó nada.
      const conPlazoNuevo = (parteQueQueda, cambio) => {
        let restante = { ...parteQueQueda };
        // Lo que sigue afuera todavía no volvió.
        delete restante.devolucion;

        if (cambio.indefinida) return dejarSinFechaDeEntrega(restante, hoy);

        const extra = Number(cambio.dias) || 0;
        if (extra > 0) {
          // Mismo camino que el diálogo de ampliar: se cierra el tramo
          // vencido que venía corriendo y los días nuevos arrancan al
          // día siguiente (ver ampliarEquipo).
          restante = ampliarEquipo(
            restante,
            {
              dias: extra,
              descuento: Math.max(0, Number(cambio.descuento) || 0),
              descuentoVencidos: Math.max(0, Number(cambio.descuentoVencidos) || 0),
            },
            hoy,
          );
        }
        return restante;
      };

      const gruposActualizados = gruposDe(factura).map((grupo) => {
        const equiposActualizados = [];

        (grupo.equipos ?? []).forEach((equipo, indice) => {
          const clave = claveDe(grupo, indice);
          const pendiente = pendienteDe(equipo);
          const cambio = cambios[clave];
          const yaPactada = estaPorRecoger(equipo);

          // EL CLIENTE NO ENTREGÓ lo que había pactado: la cuenta vuelve a
          // correr desde el día en que se detuvo.
          if (yaPactada && cambio?.anular) {
            huboAnulacion = true;
            equiposActualizados.push(anularEntregaPactada(equipo, hoy));
            return;
          }

          const cantidadDevuelta =
            pendiente > 0 && cambio
              ? Math.max(0, Math.min(pendiente, Number(cambio.cantidad) || 0))
              : 0;

          if (cantidadDevuelta <= 0) {
            equiposActualizados.push(equipo);
            return;
          }

          huboCierre = true;
          unidadesDevueltas += cantidadDevuelta;

          // LA ENTREGA PACTADA: el equipo no vuelve hoy, pero deja de correr.
          // Sin nodo `devolucion` —sigue afuera— y sin calificar cómo volvió:
          // eso se anota el día que llegue a la bodega.
          if (modoPactada) {
            const pactar = (linea) =>
              descontarVencidosDeHoy(
                pactarEntrega(linea, hoy),
                desdeLaFicha ? 0 : cambio.descuentoDevueltos,
                corteDeLaMora,
              );

            if (cantidadDevuelta >= pendiente) {
              equiposActualizados.push(pactar(equipo));
              return;
            }

            const [parteQuePacta, parteQueQueda] = partirLinea(equipo, cantidadDevuelta);
            equiposActualizados.push(pactar(parteQuePacta));
            equiposActualizados.push(conPlazoNuevo(parteQueQueda, cambio));
            return;
          }

          const devolucion = devolucionDe(
            cambio,
            hoy,
            depositoDelGrupo(grupo),
            desdeLaFicha ? motivoDevolucion : "",
          );

          // LLEGÓ LO QUE YA TENÍA LA ENTREGA PACTADA. Su cuenta está detenida
          // desde el aviso, así que no hay mora que cerrar ni descuento que
          // hacer: solo se anota que volvió y cómo. Si llegó una parte, la
          // otra sigue por recoger, igual que estaba.
          if (yaPactada) {
            if (cantidadDevuelta >= pendiente) {
              equiposActualizados.push({ ...equipo, devolucion });
              return;
            }
            const [parteQueLlego, parteQueFalta] = partirLinea(equipo, cantidadDevuelta);
            equiposActualizados.push({ ...parteQueLlego, devolucion });
            equiposActualizados.push(parteQueFalta);
            return;
          }

          // El vencido que vuelve antes de las 3 p.m. no paga el día de hoy.
          // Queda escrito en la devolución, para que la historia del equipo
          // pueda decir por qué su mora termina un día antes de la fecha en
          // que volvió.
          if (corteDeLaMora !== hoy && cubiertoHasta(equipo) < hoy) {
            devolucion.diaCobrado = false;
          }

          // Lo que vuelve cierra su mora en el último día que se le cobra
          // —hoy, o ayer si no paga el día—, con el descuento que se le haya
          // hecho a esos días —el mismo lugar donde lo deja la ampliación—.
          // Desde la ficha no se ofrece: ahí solo vuelve lo que está en plazo.
          const cerrarLoQueVuelve = (linea) =>
            descontarVencidosDeHoy(
              cerrarIndefinida(
                cerrarTramoVencido(linea, corteDeLaMora),
                devolucion.fechaDevolucion,
              ),
              desdeLaFicha ? 0 : cambio.descuentoDevueltos,
              corteDeLaMora,
            );

          if (cantidadDevuelta >= pendiente) {
            // Vuelve la línea entera: se cierra donde está.
            //
            // Los días del alta NO se tocan: la cuenta ya se corta sola en
            // la fecha de devolución (ver calcularEquipo), así que
            // pisarlos borraría con cuántos días había salido.
            equiposActualizados.push({
              ...cerrarLoQueVuelve(equipo),
              devolucion,
            });
            return;
          }

          // Vuelve una parte: la línea se parte en dos, porque en la pantalla
          // cada equipo se pinta por separado y las dos mitades ya no tienen
          // la misma historia — una volvió hoy con los días que usó, la otra
          // sigue afuera con su propio plazo.
          //
          // Nada de la plata se copia: el pago, el flete y el depósito son
          // del GRUPO y se quedaron arriba. Con ellos abajo, partir la línea
          // duplicaba el pago y la factura inventaba un saldo a favor. Los
          // descuentos de la línea sí viajan, pero repartidos según la
          // cantidad (ver partirLinea).
          const [parteQueVuelve, parteQueQueda] = partirLinea(equipo, cantidadDevuelta);
          equiposActualizados.push({
            ...cerrarLoQueVuelve(parteQueVuelve),
            devolucion,
          });

          equiposActualizados.push(conPlazoNuevo(parteQueQueda, cambio));
        });

        return { ...grupo, equipos: equiposActualizados };
      });

      // El estado de la factura ya no se guarda: sale solo de los equipos y
      // del saldo (ver calcularEstadoFactura). Lo que sí se anota es la
      // gestión — si volvió todo o solo una parte—, que es el registro de lo
      // que se hizo.
      const quedanEquipos = gruposActualizados.some((grupo) =>
        (grupo.equipos ?? []).some((equipo) => sigueAfuera(equipo)),
      );
      // Este diálogo también se abre desde Detalle Cliente, donde la factura
      // puede estar al día: el cliente devuelve antes de que se venza. Eso NO
      // se anota como gestión —no es cobranza, nadie hizo nada para destrabar
      // un vencimiento que todavía no pasó—; queda registrado en el equipo de
      // la factura, que es donde la ficha del cliente lo muestra. Solo lo
      // hecho con la factura ya vencida entra a la bitácora de Seguimiento.
      //
      // Se mira el estado de ANTES de esta devolución, que es cuando se hizo:
      // devolver el último equipo puede dejar la factura en cobro, y esa
      // devolución sigue siendo la que la llevó ahí.
      // Y tampoco se anota lo devuelto desde la ficha cuando ahí solo se
      // ofrecen equipos al día: la factura puede estar vencida por otro
      // equipo, pero lo que volvió no venció, así que nadie hizo cobranza
      // para conseguirlo.
      //
      // La entrega pactada se anota SIEMPRE, venga de donde venga: es ella la
      // que deja la factura en Seguimiento —hay un equipo que ir a buscar— y
      // sin su registro aparecería ahí como "sin gestionar". Y si se anula,
      // también: es lo que explica que el equipo vuelva a figurar vencido.
      const enCobranza = !desdeLaFicha && facturaEnSeguimiento(factura);
      const gestiones = [
        ...obtenerGestiones(factura),
        ...(huboAnulacion ? [crearRegistroGestion("entregaAnulada")] : []),
        ...(huboCierre && modoPactada
          ? [crearRegistroGestion("entregaPactada", { unidades: unidadesDevueltas })]
          : []),
        ...(huboCierre && !modoPactada && enCobranza
          ? [
              crearRegistroGestion(
                quedanEquipos ? "devolucionParcial" : "devolucionTotal",
                { unidades: unidadesDevueltas },
              ),
            ]
          : []),
      ];

      // El estado del cliente resume TODAS sus facturas: hay que releerlas
      // de la base, no alcanza con la que tenemos en memoria.
      const facturasSnap = await getDocs(collection(db, "clientes", cliente.id, "facturas"));
      const todasLasFacturas = facturasSnap.docs.map((docSnap) =>
        docSnap.id === factura.id
          ? { id: docSnap.id, ...docSnap.data(), grupos: gruposActualizados, gestiones }
          : { id: docSnap.id, ...docSnap.data() },
      );

      // Con el último equipo de vuelta se define qué pasa con el depósito.
      // Queda escrito acá, pero la plata todavía no se movió: eso se hace al
      // liquidar con el cliente, desde el botón Abono.
      const cambiosFactura = { grupos: gruposActualizados, gestiones };
      if (resolverDeposito) {
        const resuelto = {
          retenido,
          // El motivo ya no se escribe acá: se arma con lo que se anotó en
          // cada equipo, para que la ficha del cliente pueda decir POR CUÁL
          // se retuvo y no solo cuánto.
          motivo: retenciones
            .map(({ nombre, motivo }) => `${nombre}: ${motivo}`)
            .join(" · "),
          fecha: hoy,
        };
        // Ruta completa, no el nodo entero: acá solo se resuelve el depósito
        // y escribir `factura: {...}` borraría el número, el total y el resto.
        cambiosFactura["factura.depositoResuelto"] = resuelto;
        // La copia local con la que se recalcula el estado del cliente tiene
        // que quedar igual que lo que se acaba de escribir.
        todasLasFacturas.forEach((item) => {
          if (item.id === factura.id) {
            item.factura = { ...(item.factura ?? {}), depositoResuelto: resuelto };
          }
        });
      }

      const batch = writeBatch(db);
      batch.update(
        doc(db, "clientes", cliente.id, "facturas", factura.id),
        cambiosFactura,
      );
      batch.update(doc(db, "clientes", cliente.id), {
        estado: calcularEstadoCliente(todasLasFacturas),
      });
      await batch.commit();

      showSnackbar(
        modoPactada
          ? "Entrega pactada registrada."
          : huboAnulacion && !huboCierre
            ? "Entrega pactada anulada."
            : "Devolución registrada correctamente.",
        "success",
      );
      onActualizado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al registrar la devolución: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* Pegado ARRIBA, no centrado: al subir la cantidad con las flechas
          aparecen casillas debajo, y centrado el diálogo se corría hacia
          arriba en cada clic —la flecha se iba de debajo del puntero—.
          Así solo crece hacia abajo y el campo no se mueve. */}
      <Dialog
        open={open}
        onClose={handleCerrar}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      >
        <DialogTitle sx={{ color: acento }}>Registrar devolución</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* ── 1. ¿Qué pasó? ── La decisión va sola arriba, igual que en
                el abono: cambia lo que significa cada casilla de abajo, así
                que no se muestra nada más hasta que se elige. Cada opción
                aparece solo si hay a quién aplicarla: sin equipos corriendo
                no hay nada que pactar, y sin ninguno por recoger no hay
                entrega que anular. */}
            {lineasDelDialogo.length > 0 && (
              <Grid item xs={12}>
                {rotuloPaso(
                  1,
                  unidadesDelDialogo === 1
                    ? "¿Qué pasó con el equipo?"
                    : "¿Qué pasó con los equipos?",
                )}
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={decision}
                  onChange={(_, valor) => {
                    // Tocar la que ya está elegida no la deja sin elegir.
                    if (valor === null) return;
                    handleCambiarDecision(valor);
                  }}
                >
                  {opciones.map((valor) => {
                    const { Icono, titulo } = DECISIONES[valor];
                    return (
                      <ToggleButton
                        key={valor}
                        value={valor}
                        sx={{
                          gap: 0.75,
                          textTransform: "none",
                          fontWeight: "bold",
                          lineHeight: 1.3,
                          // Con tres no caben de corrido en un celular: el
                          // ícono sube y el texto queda debajo.
                          ...(opciones.length > 2 && {
                            flexDirection: "column",
                            gap: 0.25,
                            px: 0.5,
                          }),
                          "&.Mui-selected, &.Mui-selected:hover": {
                            color: acento,
                            bgcolor: alpha(acento, 0.1),
                          },
                        }}
                      >
                        <Icono fontSize="small" sx={{ color: acento }} />
                        {titulo}
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Grid>
            )}

            {/* ── 2. Lo que pide esa decisión ── Primero lo que vale para
                toda la tanda; debajo, equipo por equipo. */}
            {decision && (
              <Grid item xs={12}>
                {rotuloPaso(2, DECISIONES[decision].pregunta, 0)}

                {modoAnular && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    El cliente no entregó lo que había pactado. La cuenta vuelve
                    a correr desde el día en que se detuvo, como si nunca
                    hubiera parado.
                  </Typography>
                )}

                {/* EL DÍA DE HOY, solo para lo vencido que vuelve: antes de
                    las 3 p.m. no se cobra. Viene marcada según la hora y se
                    puede cambiar —el cliente pudo entregar a las 10 y que lo
                    anoten a las 4—. Si lo único que llega estaba por recoger
                    no se pregunta: su cuenta ya estaba detenida. */}
                {decision === "llego" && !desdeLaFicha && hayParaPactar && (
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          name="cobrarHoy"
                          checked={cobrarHoy}
                          onChange={(e) => setCobrarHoy(e.target.checked)}
                        />
                      }
                      label="Cobrar el día de hoy"
                    />
                    {!cobrarHoy && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", color: "success.main" }}
                      >
                        Entrega antes de las 3 p.m.: hoy no se cobra
                        {ahorroDeHoy > 0 ? ` · −${formatearMoneda(ahorroDeHoy)}` : ""}
                      </Typography>
                    )}
                  </>
                )}

                {/* POR QUÉ DEVUELVE. Va antes de los equipos y una sola vez:
                    es del cliente que los trae, no de cada uno. Solo en la
                    ficha, donde lo que vuelve está en plazo. */}
                {decision === "llego" && desdeLaFicha && (
                  <TextField
                    label="Motivo de la devolución (opcional)"
                    name="motivoDevolucion"
                    value={motivoDevolucion}
                    onChange={(e) => setMotivoDevolucion(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Ej: terminó la obra, ya no los necesita"
                    sx={{ mt: 1.5 }}
                  />
                )}
              </Grid>
            )}
            {lineasDelDialogo.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Esta factura no tiene equipos pendientes por devolver.
                </Typography>
              </Grid>
            )}
            {equiposPendientes.map(({ equipo, grupo, clave }, posicion) => {
              const pendiente = pendienteDe(equipo);
              const deposito = depositoDelGrupo(grupo);
              const cambio = cambios[clave] || ESTADO_INICIAL_CAMBIO;
              const yaPactada = estaPorRecoger(equipo);
              const cantidadDevuelta =
                cambio.anular || cambio.cantidad === "" ? 0 : Number(cambio.cantidad) || 0;
              const restante = pendiente - cantidadDevuelta;
              const diasNumero = Number(cambio.dias);
              const proyeccion = proyeccionDelResto(equipo, clave);
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0 ? proyeccion.hasta : null;

              return (
                <Grid item xs={12} key={clave}>
                  <Typography variant="body2" fontWeight="bold">
                    {pendiente} {equipo.nombre}
                  </Typography>
                  {/* La fecha del último acuerdo y, si ya pasó, los días que
                      lleva vencido. Misma línea y misma regla que en el
                      diálogo de ampliar (ver PlazoEquipo). */}
                  {yaPactada ? (
                    // El que está por recoger ya no tiene plazo que mostrar:
                    // lo que importa es desde cuándo se le dejó de cobrar.
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "custom.estadoEquipo.porRecoger" }}
                    >
                      Entrega pactada el{" "}
                      {formatearFechaLegible(entregaPactadaDe(equipo).fecha)} · cuenta
                      detenida
                    </Typography>
                  ) : (
                    <PlazoEquipo equipo={equipo} />
                  )}

                  {/* El depósito de la entrega en que salió ESTE equipo. El
                      cliente dejó $100.000 por el Benetín y $50.000 por la
                      Rana que pidió después: quien recibe necesita saber con
                      cuánto está respaldado el que tiene delante, sin ir a
                      buscarlo al final del diálogo.

                      Cuando esa entrega trajo varios equipos el depósito es
                      de todos juntos y se muestra entero: repartirlo por
                      equipo sería inventar un número que nadie pactó. El
                      "(del despacho)" que lo aclaraba se quitó el 2026-10-01,
                      a pedido del dueño: solo "Depósito". */}
                  {deposito > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "custom.accent" }}
                    >
                      Depósito: {formatearMoneda(deposito)}
                    </Typography>
                  )}

                  <Box sx={{ mb: 1 }} />

                  {/* La entrega se anula entera, así que ahí no se pregunta
                      cuántos: alcanza con la casilla de abajo. */}
                  {!modoAnular && (
                    <TextField
                      label={
                        modoPactada
                          ? "Cantidad con entrega pactada"
                          : "Cantidad que devuelve hoy"
                      }
                      type="number"
                      inputProps={{ min: 0, max: pendiente }}
                      value={cambio.cantidad}
                      onChange={(e) => handleCambiarCantidad(clave, e.target.value, pendiente)}
                      fullWidth
                      size="small"
                    />
                  )}

                  {cantidadDevuelta > 0 && restante === 0 && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "success.main" }}
                    >
                      {modoPactada
                        ? "Se pacta la entrega de todo: la cuenta de esta línea se detiene."
                        : "Se devuelve todo: esta línea queda cerrada."}
                    </Typography>
                  )}

                  {/* EL CLIENTE NO ENTREGÓ lo pactado. Viene marcada —es lo
                      que se eligió arriba— y se desmarca el equipo que sí va
                      a llegar. */}
                  {modoAnular && (
                    <>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            name={`anular-${clave}`}
                            checked={cambio.anular}
                            onChange={(e) => handleCambiarAnular(clave, e.target.checked)}
                          />
                        }
                        label="Anular la entrega pactada"
                      />
                      {cambio.anular && (
                        <Typography
                          variant="caption"
                          sx={{ display: "block", color: "error.main" }}
                        >
                          La cuenta vuelve a correr desde el{" "}
                          {formatearFechaLegible(entregaPactadaDe(equipo).fecha)}.
                        </Typography>
                      )}
                    </>
                  )}

                  {/* LO QUE SE PASÓ DE LO QUE VUELVE. El cliente que devuelve
                      también negocia sus días vencidos, igual que el que pide
                      más días: misma casilla, misma regla, y el tope es lo que
                      valen esos días para las unidades que vuelven. Solo desde
                      Seguimiento: la ficha devuelve lo que está en plazo. */}
                  {cantidadDevuelta > 0 && !desdeLaFicha && !yaPactada && (
                    <DescuentoVencidos
                      proyeccion={proyeccionDeLoQueVuelve(equipo, clave)}
                      descuento={cambio.descuentoDevueltos}
                      onCambiar={(valor) =>
                        handleCambiarDescuento(clave, "descuentoDevueltos", valor)
                      }
                      etiqueta={etiquetaDescuentoDevueltos(
                        proyeccionDeLoQueVuelve(equipo, clave).diasVencidos,
                      )}
                    />
                  )}

                  {/* CÓMO VOLVIÓ ESTE EQUIPO. Aparece apenas se escribe una
                      cantidad, sin esperar al último equipo de la factura:
                      hoy es el día en que alguien lo tiene delante y puede
                      decirlo. Al pactar la entrega no se pregunta: el equipo
                      todavía no llegó y nadie lo vio. */}
                  {cantidadDevuelta > 0 && !modoPactada && (
                    <Box sx={{ mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={cambio.buenEstado !== false}
                            onChange={(e) =>
                              handleCambiarBuenEstado(clave, e.target.checked)
                            }
                          />
                        }
                        label={`${
                          cantidadDevuelta === 1 ? "Volvió" : "Volvieron"
                        } completo${cantidadDevuelta === 1 ? "" : "s"} y en buen estado`}
                      />

                      {cambio.buenEstado === false && (
                        <Box sx={{ pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                          <TextField
                            label="Qué le pasó"
                            name={`estadoMotivo-${clave}`}
                            value={cambio.motivoEstado}
                            onChange={(e) =>
                              handleCambiarEstado(clave, "motivoEstado", e.target.value)
                            }
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            placeholder="Ej: rayadura en el tambor, falta una manguera"
                          />

                          {/* Solo si SU entrega dejó garantía de dónde
                              retener. Sin depósito el daño igual queda
                              anotado: es lo que se le reclama al cliente. */}
                          {deposito > 0 && (
                            <TextField
                              label="Se retiene del depósito"
                              name={`estadoRetenido-${clave}`}
                              value={formatearMonedaInput(cambio.retenidoEstado)}
                              onChange={(e) =>
                                handleCambiarEstado(
                                  clave,
                                  "retenidoEstado",
                                  limpiarMonedaInput(e.target.value),
                                )
                              }
                              fullWidth
                              size="small"
                              sx={{ mt: 1 }}
                              // El tope sigue siendo el depósito de SU
                              // entrega, pero no se anuncia: solo avisa a
                              // quien se pasa. Guardar en silencio un número
                              // menor que el escrito sería peor que no topar.
                              error={Number(cambio.retenidoEstado) > deposito}
                              helperText={
                                Number(cambio.retenidoEstado) > deposito
                                  ? `Por esta entrega solo dejó ${formatearMoneda(deposito)}`
                                  : "Se puede dejar vacío y decidirlo al liquidar"
                              }
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Qué pasa con lo que el cliente se queda: más días o
                      entrega indefinida. Solo desde Seguimiento. Darle plazo
                      a un equipo es una decisión de cobranza —se pacta con el
                      cliente que ya está vencido— y allá queda anotada; desde
                      la ficha lo único que se hace es registrar lo que
                      volvió, y lo que sigue afuera conserva su fecha. */}
                  {cantidadDevuelta > 0 && restante > 0 && !desdeLaFicha && !yaPactada && (
                    <Box sx={{ mt: 1.5, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        Quedan {restante} sin devolver
                      </Typography>

                      <TextField
                        label="Días a ampliar"
                        type="number"
                        inputProps={{ min: 1 }}
                        value={cambio.dias}
                        onChange={(e) => handleCambiarDias(clave, e.target.value)}
                        disabled={cambio.indefinida}
                        fullWidth
                        size="small"
                      />

                      {diasNumero > 0 && !cambio.indefinida && (
                        <DescuentosAmpliacion
                          proyeccion={proyeccion}
                          cantidad={restante}
                          valorDia={Number(equipo.valorDia) || 0}
                          descuento={cambio.descuento}
                          descuentoVencidos={cambio.descuentoVencidos}
                          onCambiarDescuento={(valor) =>
                            handleCambiarDescuento(clave, "descuento", valor)
                          }
                          onCambiarDescuentoVencidos={(valor) =>
                            handleCambiarDescuento(clave, "descuentoVencidos", valor)
                          }
                        />
                      )}

                      {nuevaFecha && (
                        // Mismo ajuste que en AmpliarVencimientoDialog: ese
                        // amarillo es para la pizarra oscura de totales, no
                        // para el fondo normal del diálogo.
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mt: 0.5, color: "custom.accent" }}
                        >
                          Nueva fecha de vencimiento: {formatearFechaLegible(nuevaFecha)}
                        </Typography>
                      )}

                      <FormControlLabel
                        sx={{ mt: 0.5 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={cambio.indefinida}
                            onChange={(e) => handleCambiarIndefinida(clave, e.target.checked)}
                          />
                        }
                        label="Dejar indefinida (el cliente avisará)"
                      />
                    </Box>
                  )}

                  {posicion < equiposPendientes.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Grid>
              );
            })}

            {/* ── 3. Así queda ── Recién con algo escrito arriba: sin una
                cantidad no hay cuenta que mostrar. */}
            {(filasResumen.length > 0 || resolverDeposito) && (
              <Grid item xs={12}>
                {rotuloPaso(3, "Así queda", filasResumen.length > 0 ? 1 : 0)}
                {filasResumen.length > 0 && (
                  <Paper variant="totales">
                    {filasResumen.map(({ rotulo, valor, clase }, posicion) => (
                      <Box
                        key={rotulo}
                        className={clase ? `fila ${clase}` : "fila"}
                        sx={posicion === filasResumen.length - 1 ? { mb: 0 } : undefined}
                      >
                        <Typography variant="body2" fontWeight={clase ? "bold" : undefined}>
                          {rotulo}
                        </Typography>
                        <Typography variant="body2" fontWeight={clase ? "bold" : undefined}>
                          {valor}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
            )}

            {/* Vuelve el último equipo: se liquida el depósito. Acá ya no se
                pregunta nada —eso se respondió equipo por equipo, arriba y el
                día que cada uno volvió—: este bloque solo muestra la cuenta
                que sale de lo anotado, incluida la de devoluciones de otros
                días.

                Y dice la CONSECUENCIA, no el estado de los equipos: antes
                cerraba con "Volvió todo completo y en buen estado", que
                repetía la casilla de arriba y no decía qué pasaba con la
                plata (pedido del dueño, 2026-10-01). */}
            {resolverDeposito && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: acento }}>
                  Depósito: {formatearMoneda(depositoTotal)} · {queSeLeDevuelve}
                </Typography>

                {/* De dónde sale ese total. Con una sola entrega el desglose
                    repetiría el número de arriba; con dos o más, decir
                    "$150.000" a secas esconde que son dos garantías por dos
                    despachos distintos. */}
                {lotesConDeposito.length > 1 &&
                  lotesConDeposito.map((lote, posicion) => (
                    <Typography
                      key={`deposito-lote-${posicion}`}
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {/* Los equipos y el depósito se leen del GRUPO, que es
                          donde viven desde que la factura guarda un nodo por
                          despacho. Este renglón se escribió el día anterior a
                          ese cambio y quedó buscándolos envueltos —como los
                          entrega equiposDe— y al depósito colgando del lote:
                          con dos garantías o más, que es cuando se dibuja,
                          tumbaba el diálogo entero. */}
                      ·{" "}
                      {(lote.equipos ?? [])
                        .map((equipo) => equipo?.nombre)
                        .join(", ")}
                      : {formatearMoneda(depositoDelGrupo(lote))}
                    </Typography>
                  ))}

                {retenciones.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Se retienen {formatearMoneda(retenido)} por daños, que pasan
                      a la factura como cargo:
                    </Typography>
                    {retenciones.map(({ nombre, motivo, monto }, posicion) => (
                      <Typography
                        key={`${nombre}-${posicion}`}
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        · {nombre} — {motivo} ({formatearMoneda(monto)})
                      </Typography>
                    ))}
                  </Box>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Apagado hasta que se elige qué pasó: sin eso no hay nada que
              guardar. */}
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando || !decision}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

RegistrarDevolucionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onActualizado: PropTypes.func,
  desdeLaFicha: PropTypes.bool,
};
