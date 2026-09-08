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
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PlazoEquipo from "./PlazoEquipo";
import {
  proyectarAmpliacion,
  equipoAlDia,
  equipoVencido,
  calcularEstadoCliente,
  obtenerFechaHoyBogota,
  diasDeAlquiler,
  obtenerGestiones,
  crearRegistroGestion,
  facturaEnSeguimiento,
  calcularDepositoTotal,
  formatearMonedaInput,
  limpiarMonedaInput,
  datosFactura,
  gruposDe,
  equiposDe,
  adicionalesDe,
  ampliacionesDe,
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
  indefinida: false,
  buenEstado: true,
  motivoEstado: "",
  retenidoEstado: "",
};

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
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
    setMotivoDevolucion("");
  }, [open]);

  // Cada línea se identifica por su despacho y su posición dentro de él: los
  // equipos viven repartidos en grupos, así que un número suelto no alcanza
  // para señalar una sola.
  const claveDe = (grupo, indice) => `${grupo?.grupo}#${indice}`;

  const todosLosEquipos = equiposDe(factura);
  const equiposPendientes = todosLosEquipos
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
    .filter(({ equipo }) =>
      desdeLaFicha
        ? equipoAlDia(equipo)
        : sigueAfuera(equipo) && equipoVencido(equipo),
    );

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
    if (!cambio) return 0;
    return Math.max(0, Math.min(pendienteDe(equipo), Number(cambio.cantidad) || 0));
  };

  const quedanEquiposAfuera = equiposPendientes.some(
    ({ equipo, clave }) => pendienteDe(equipo) - cantidadQueDevuelve(equipo, clave) > 0,
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
  const retencionesAhora = equiposPendientes
    .map(({ equipo, grupo, clave }) => ({
      nombre: equipo.nombre,
      motivo: (cambios[clave]?.motivoEstado || "").trim(),
      monto:
        cantidadQueDevuelve(equipo, clave) > 0 && cambios[clave]?.buenEstado === false
          ? devolucionDe(cambios[clave], "", depositoDelGrupo(grupo)).valorRetenido
          : 0,
    }))
    .filter(({ monto }) => monto > 0);

  const retenciones = [...retencionesPrevias, ...retencionesAhora];
  // Topado al depósito: nunca se puede retener más de lo que el cliente dejó.
  const retenido = Math.min(
    depositoTotal,
    retenciones.reduce((total, { monto }) => total + monto, 0),
  );
  const aDevolver = depositoTotal - retenido;

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

  const handleCambiarDescuento = (index, valor) => {
    setCambios((prev) => ({
      ...prev,
      [index]: { ...ESTADO_INICIAL_CAMBIO, ...prev[index], descuento: valor },
    }));
  };

  const handleGuardar = async () => {
    const huboCambios = equiposPendientes.some(({ clave }) => {
      const cambio = cambios[clave];
      return cambio && Number(cambio.cantidad) > 0;
    });
    if (!huboCambios) {
      showSnackbar("Ingresá la cantidad que devuelve al menos un equipo.", "warning");
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

    setGuardando(true);
    try {
      const hoy = obtenerFechaHoyBogota();
      let huboCierre = false;
      // Cuántas unidades volvieron en esta tanda, para dejarlo escrito en la
      // línea de tiempo ("Devolución parcial: 3 equipos").
      let unidadesDevueltas = 0;

      // LOS DÍAS SE CONGELAN AL VOLVER.
      //
      // Mientras el equipo está afuera, sus días corren con el calendario:
      // los pactados, y los de más si se pasó de la fecha. El día que vuelve,
      // eso deja de ser una cuenta y pasa a ser un hecho — estuvo afuera
      // tantos días—, y ese número se escribe en la línea.
      //
      // Devolvió antes: quedan los pocos días que lo tuvo, y no se le cobra
      // el resto. Se pasó: quedan los que de verdad corrieron. En los dos
      // casos, después de esto la cuenta del equipo es una sola
      // multiplicación y no hay créditos que restar ni excepciones que
      // recordar.
      const diasUsados = (equipo) =>
        Math.max(1, diasDeAlquiler(equipo.fechaDespacho, hoy));

      const gruposActualizados = gruposDe(factura).map((grupo) => {
        const equiposActualizados = [];

        (grupo.equipos ?? []).forEach((equipo, indice) => {
          const clave = claveDe(grupo, indice);
          const pendiente = pendienteDe(equipo);
          const cambio = cambios[clave];
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

          const devolucion = devolucionDe(
            cambio,
            hoy,
            depositoDelGrupo(grupo),
            desdeLaFicha ? motivoDevolucion : "",
          );

          if (cantidadDevuelta >= pendiente) {
            // Vuelve la línea entera: se cierra donde está.
            equiposActualizados.push({
              ...equipo,
              diasAlquilados: diasUsados(equipo),
              vencimientoIndefinido: false,
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
          // duplicaba el pago y la factura inventaba un saldo a favor.
          equiposActualizados.push({
            ...equipo,
            cantidadEquipos: cantidadDevuelta,
            diasAlquilados: diasUsados(equipo),
            vencimientoIndefinido: false,
            devolucion,
          });

          const restante = {
            ...equipo,
            cantidadEquipos: pendiente - cantidadDevuelta,
          };
          // Lo que sigue afuera todavía no volvió.
          delete restante.devolucion;

          if (cambio.indefinida) {
            restante.vencimientoIndefinido = true;
          } else {
            const extra = Number(cambio.dias) || 0;
            if (extra > 0) {
              // Mismo criterio que en AmpliarVencimientoDialog: si lo que
              // sigue afuera ya estaba vencido, el plazo nuevo arranca hoy y
              // los días que ya corrieron se consolidan (ver
              // proyectarAmpliacion).
              const proyeccion = proyectarAmpliacion(equipo, extra);
              restante.ampliaciones = [
                ...ampliacionesDe(equipo),
                {
                  fechaAnterior: equipo.fechaVencimiento,
                  fechaNueva: proyeccion.fechaNueva,
                  diasAmpliados: proyeccion.dias,
                  diasPedidos: proyeccion.diasPedidos,
                  diasVencidos: proyeccion.diasVencidos,
                  descuentoRealizado: Math.max(0, Number(cambio.descuento) || 0),
                  fecha: hoy,
                },
              ];
              restante.fechaVencimiento = proyeccion.fechaNueva;
            }
          }

          equiposActualizados.push(restante);
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
      const gestiones =
        huboCierre && !desdeLaFicha && facturaEnSeguimiento(factura)
          ? [
              ...obtenerGestiones(factura),
              crearRegistroGestion(
                quedanEquipos ? "devolucionParcial" : "devolucionTotal",
                { unidades: unidadesDevueltas },
              ),
            ]
          : obtenerGestiones(factura);

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

      showSnackbar("Devolución registrada correctamente.", "success");
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
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>Registrar devolución</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* POR QUÉ DEVUELVE. Va arriba de todo y una sola vez: es del
                cliente que trae los equipos, no de cada equipo. Solo en la
                ficha, donde lo que vuelve está en plazo. */}
            {desdeLaFicha && equiposPendientes.length > 0 && (
              <Grid item xs={12}>
                <TextField
                  label="Motivo de la devolución (opcional)"
                  name="motivoDevolucion"
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Ej: terminó la obra, ya no los necesita"
                />
              </Grid>
            )}
            {equiposPendientes.length === 0 && (
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
              const cantidadDevuelta = cambio.cantidad === "" ? 0 : Number(cambio.cantidad) || 0;
              const restante = pendiente - cantidadDevuelta;
              const diasNumero = Number(cambio.dias);
              const descuentoNumero = Math.max(0, Number(cambio.descuento) || 0);
              const proyeccion = proyectarAmpliacion(equipo, diasNumero);
              const valorDias = proyeccion.dias * restante * (Number(equipo.valorDia) || 0);
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0 ? proyeccion.fechaNueva : null;

              return (
                <Grid item xs={12} key={clave}>
                  <Typography variant="body2" fontWeight="bold">
                    {pendiente} {equipo.nombre}
                  </Typography>
                  {/* La fecha del último acuerdo y, si ya pasó, los días que
                      lleva vencido. Misma línea y misma regla que en el
                      diálogo de ampliar (ver PlazoEquipo). */}
                  <PlazoEquipo equipo={equipo} />

                  {/* El depósito de la entrega en que salió ESTE equipo. El
                      cliente dejó $100.000 por el Benetín y $50.000 por la
                      Rana que pidió después: quien recibe necesita saber con
                      cuánto está respaldado el que tiene delante, sin ir a
                      buscarlo al final del diálogo.

                      Cuando esa entrega trajo varios equipos el depósito es
                      de todos juntos, y hay que decirlo: repartirlo por
                      equipo sería inventar un número que nadie pactó. */}
                  {deposito > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: "custom.accent" }}
                    >
                      Depósito: {formatearMoneda(deposito)}
                      {(grupo.equipos ?? []).length > 1 && " (del despacho)"}
                    </Typography>
                  )}

                  <Box sx={{ mb: 1 }} />

                  <TextField
                    label="Cantidad que devuelve hoy"
                    type="number"
                    inputProps={{ min: 0, max: pendiente }}
                    value={cambio.cantidad}
                    onChange={(e) => handleCambiarCantidad(clave, e.target.value, pendiente)}
                    fullWidth
                    size="small"
                  />

                  {cantidadDevuelta > 0 && restante === 0 && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "success.main" }}
                    >
                      Se devuelve todo: esta línea queda cerrada.
                    </Typography>
                  )}

                  {/* CÓMO VOLVIÓ ESTE EQUIPO. Aparece apenas se escribe una
                      cantidad, sin esperar al último equipo de la factura:
                      hoy es el día en que alguien lo tiene delante y puede
                      decirlo. */}
                  {cantidadDevuelta > 0 && (
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
                  {cantidadDevuelta > 0 && restante > 0 && !desdeLaFicha && (
                    <Box sx={{ mt: 1.5, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        Quedan {restante} sin devolver — ¿qué pasa con esos?
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
                        <TextField
                          label="Descuento sobre esos días"
                          type="number"
                          inputProps={{ min: 0 }}
                          value={cambio.descuento}
                          onChange={(e) => handleCambiarDescuento(clave, e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mt: 1 }}
                          helperText={
                            valorDias > 0
                              ? `${proyeccion.dias} día${
                                  proyeccion.dias === 1 ? "" : "s"
                                } = ${formatearMoneda(valorDias)}${
                                  proyeccion.diasVencidos > 0
                                    ? ` (${proyeccion.diasVencidos} vencido${
                                        proyeccion.diasVencidos === 1 ? "" : "s"
                                      } + ${proyeccion.diasPedidos} pactado${
                                        proyeccion.diasPedidos === 1 ? "" : "s"
                                      })`
                                    : ""
                                }${
                                  descuentoNumero > 0
                                    ? ` · queda en ${formatearMoneda(valorDias - descuentoNumero)}`
                                    : ""
                                }`
                              : "Este equipo no tiene precio cargado"
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

            {/* Vuelve el último equipo: se liquida el depósito. Acá ya no se
                pregunta nada —eso se respondió equipo por equipo, arriba y el
                día que cada uno volvió—: este bloque solo muestra la cuenta
                que sale de lo anotado, incluida la de devoluciones de otros
                días. */}
            {resolverDeposito && (
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ color: acento }}>
                  Depósito: {formatearMoneda(depositoTotal)}
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
                      · {lote.equipos.map(({ equipo }) => equipo.nombre).join(", ")}:{" "}
                      {formatearMoneda(lote.deposito)}
                    </Typography>
                  ))}

                {retenciones.length === 0 ? (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Volvió todo completo y en buen estado.
                  </Typography>
                ) : (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Se retienen {formatearMoneda(retenido)}:
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

                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, color: "custom.accent" }}
                >
                  Se le devuelven {formatearMoneda(aDevolver)} al liquidar la
                  factura.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando}>
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
