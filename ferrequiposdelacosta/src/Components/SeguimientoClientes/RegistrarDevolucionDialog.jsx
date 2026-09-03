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
import {
  calcularVencimiento,
  obtenerAmpliaciones,
  calcularCantidadPendiente,
  equipoAlDia,
  equipoVencido,
  calcularEstadoCliente,
  obtenerFechaHoyBogota,
  obtenerGestiones,
  crearRegistroGestion,
  facturaEnSeguimiento,
  calcularDepositoTotal,
  formatearMonedaInput,
  limpiarMonedaInput,
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

// Lo que queda escrito en la línea del equipo que volvió. Se anota SIEMPRE,
// también cuando volvió bien: "volvió sin novedad" es un dato, y su ausencia
// no se distingue de una devolución vieja que nadie calificó.
const estadoDevolucionDe = (cambio, fecha) => {
  const bien = cambio?.buenEstado !== false;
  return {
    buenEstado: bien,
    motivo: bien ? "" : (cambio.motivoEstado || "").trim(),
    retenido: bien ? 0 : Math.max(0, Number(cambio.retenidoEstado) || 0),
    fecha,
  };
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
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
  }, [open]);

  const equipos = factura?.equipos?.filter((equipo) => typeof equipo === "object") || [];
  const equiposPendientes = equipos
    .map((equipo, index) => ({ equipo, index }))
    // Cada pantalla ofrece lo suyo y nada más: la ficha, lo que sigue en
    // plazo; Seguimiento, lo vencido. Un equipo en fecha no se devuelve desde
    // cartera —esa devolución no es cobranza— y así ninguna de las dos
    // pantallas muestra equipos que no le corresponden.
    .filter(({ equipo }) =>
      desdeLaFicha
        ? equipoAlDia(equipo)
        : calcularCantidadPendiente(equipo) > 0 && equipoVencido(equipo),
    );

  // Cuánto devuelve de cada línea con lo que hay escrito ahora mismo. Sirve
  // para saber, mientras el usuario escribe, si esta devolución deja la
  // factura sin nada afuera.
  const cantidadQueDevuelve = (equipo, index) => {
    const pendiente = calcularCantidadPendiente(equipo);
    const cambio = cambios[index];
    if (!cambio) return 0;
    return Math.max(0, Math.min(pendiente, Number(cambio.cantidad) || 0));
  };

  const quedanEquiposAfuera = equiposPendientes.some(
    ({ equipo, index }) =>
      calcularCantidadPendiente(equipo) - cantidadQueDevuelve(equipo, index) > 0,
  );
  const hayDevolucion = equiposPendientes.some(
    ({ equipo, index }) => cantidadQueDevuelve(equipo, index) > 0,
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
  // LIQUIDAR el depósito sigue siendo al final. La garantía es UNA para todo
  // el despacho —no está repartida por equipo— y se devuelve entera, así que
  // lo retenido en cada devolución se va sumando y recién se resuelve cuando
  // no queda nada afuera.
  const depositoTotal = calcularDepositoTotal(factura);
  const resolverDeposito =
    hayDevolucion &&
    !quedanEquiposAfuera &&
    depositoTotal > 0 &&
    !factura?.depositoResuelto;

  // Lo anotado en devoluciones ANTERIORES, que vive en la línea de cada equipo
  // que ya volvió.
  const retencionesPrevias = equipos
    .filter((equipo) => Number(equipo?.estadoDevolucion?.retenido) > 0)
    .map((equipo) => ({
      nombre: equipo.nombre,
      motivo: equipo.estadoDevolucion.motivo || "",
      monto: Number(equipo.estadoDevolucion.retenido) || 0,
    }));

  // Y lo que se está anotando en ESTA tanda.
  const retencionesAhora = equiposPendientes
    .map(({ equipo, index }) => ({
      nombre: equipo.nombre,
      motivo: (cambios[index]?.motivoEstado || "").trim(),
      monto:
        cantidadQueDevuelve(equipo, index) > 0 && cambios[index]?.buenEstado === false
          ? Math.max(0, Number(cambios[index].retenidoEstado) || 0)
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
    const huboCambios = equiposPendientes.some(({ index }) => {
      const cambio = cambios[index];
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
      ({ equipo, index }) =>
        cantidadQueDevuelve(equipo, index) > 0 &&
        cambios[index]?.buenEstado === false &&
        !(cambios[index]?.motivoEstado || "").trim(),
    );
    if (sinMotivo) {
      showSnackbar(`Escribí qué le pasó al ${sinMotivo.equipo.nombre}.`, "warning");
      return;
    }

    setGuardando(true);
    try {
      const hoy = obtenerFechaHoyBogota();
      let huboCierre = false;
      // Cuántas unidades volvieron en esta tanda, para dejarlo escrito en la
      // línea de tiempo ("Devolución parcial: 3 equipos").
      let unidadesDevueltas = 0;

      const equiposActualizados = [];
      equipos.forEach((equipo, index) => {
        const pendiente = calcularCantidadPendiente(equipo);
        const cambio = cambios[index];
        const cantidadDevuelta =
          pendiente > 0 && cambio ? Math.max(0, Math.min(pendiente, Number(cambio.cantidad) || 0)) : 0;

        if (cantidadDevuelta <= 0) {
          equiposActualizados.push(equipo);
          return;
        }

        huboCierre = true;
        unidadesDevueltas += cantidadDevuelta;

        if (cantidadDevuelta >= pendiente) {
          // Devuelve todo lo que quedaba pendiente: la línea se cierra donde está.
          equiposActualizados.push({
            ...equipo,
            cantidadDevuelta: Number(equipo.cantidad) || 0,
            fechaDevolucion: hoy,
            estadoDevolucion: estadoDevolucionDe(cambio, hoy),
            vencimientoIndefinido: false,
          });
          return;
        }

        // Devuelve una parte: la línea se parte en dos. La original queda
        // cerrada con lo que efectivamente volvió; una nueva línea sigue con
        // lo que se queda el cliente (con su propia fecha de vencimiento, si
        // se definió acá mismo).
        const cantidadOriginal = Number(equipo.cantidad) || 0;
        equiposActualizados.push({
          ...equipo,
          cantidad: cantidadDevuelta,
          cantidadDevuelta,
          fechaDevolucion: hoy,
          estadoDevolucion: estadoDevolucionDe(cambio, hoy),
          vencimientoIndefinido: false,
        });

        const restante = {
          ...equipo,
          cantidad: cantidadOriginal - cantidadDevuelta,
          cantidadDevuelta: 0,
        };
        delete restante.fechaDevolucion;
        // El estado califica lo que VOLVIÓ. Lo que sigue afuera todavía no
        // volvió, así que arrastrar esa calificación sería inventarla.
        delete restante.estadoDevolucion;

        // Los cargos del LOTE —lo que se pagó por él, su transporte y su
        // depósito— viven en UNA sola línea, y las cuentas los suman
        // recorriendo todos los equipos agregados (ver sumarPagosDeAgregados
        // en facturaCalculos). Si la mitad que sigue afuera se los lleva
        // copiados, ese pago se cuenta dos veces: la factura muestra pagado de
        // más y termina inventando un saldo a favor que no existe.
        //
        // Se quedan en la línea que volvió, que es la que conserva el lugar
        // del lote. La que sigue afuera arrastra solo lo suyo: cantidad,
        // días, precio y fechas.
        delete restante.pagos;
        delete restante.tipoPago;
        delete restante.transporte;
        delete restante.valorTransporte;
        delete restante.deposito;

        if (cambio.indefinida) {
          restante.vencimientoIndefinido = true;
        } else {
          const extra = Number(cambio.dias) || 0;
          if (extra > 0) {
            const fechaNueva = calcularVencimiento(equipo.fechaVencimiento, extra);
            const descuento = Math.max(0, Number(cambio.descuento) || 0);
            restante.fechaVencimientoOriginal = equipo.fechaVencimientoOriginal || equipo.fechaVencimiento;
            restante.ampliaciones = [
              ...obtenerAmpliaciones(equipo),
              { fechaAnterior: equipo.fechaVencimiento, fechaNueva, dias: extra, descuento },
            ];
            restante.fechaVencimiento = fechaNueva;
          }
        }

        equiposActualizados.push(restante);
      });

      // El estado de la factura ya no se guarda: sale solo de los equipos y
      // del saldo (ver calcularEstadoFactura). Lo que sí se anota es la
      // gestión — si volvió todo o solo una parte—, que es el registro de lo
      // que se hizo.
      const quedanEquipos = equiposActualizados.some(
        (equipo) => calcularCantidadPendiente(equipo) > 0,
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
              crearRegistroGestion(quedanEquipos ? "parcial" : "total", {
                unidades: unidadesDevueltas,
              }),
            ]
          : obtenerGestiones(factura);

      // El estado del cliente resume TODAS sus facturas: hay que releerlas
      // de la base, no alcanza con la que tenemos en memoria.
      const facturasSnap = await getDocs(collection(db, "clientes", cliente.id, "facturas"));
      const todasLasFacturas = facturasSnap.docs.map((docSnap) =>
        docSnap.id === factura.id
          ? { id: docSnap.id, ...docSnap.data(), equipos: equiposActualizados, gestiones }
          : { id: docSnap.id, ...docSnap.data() },
      );

      // Con el último equipo de vuelta se define qué pasa con el depósito.
      // Queda escrito acá, pero la plata todavía no se movió: eso se hace al
      // liquidar con el cliente, desde el botón Abono.
      const datosFactura = { equipos: equiposActualizados, gestiones };
      if (resolverDeposito) {
        datosFactura.depositoResuelto = {
          retenido,
          // El motivo ya no se escribe acá: se arma con lo que se anotó en
          // cada equipo, para que la ficha del cliente pueda decir POR CUÁL
          // se retuvo y no solo cuánto.
          motivo: retenciones
            .map(({ nombre, motivo }) => `${nombre}: ${motivo}`)
            .join(" · "),
          fecha: hoy,
        };
        todasLasFacturas.forEach((item) => {
          if (item.id === factura.id) {
            item.depositoResuelto = datosFactura.depositoResuelto;
          }
        });
      }

      const batch = writeBatch(db);
      batch.update(
        doc(db, "clientes", cliente.id, "facturas", factura.id),
        datosFactura,
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
            {equiposPendientes.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Esta factura no tiene equipos pendientes por devolver.
                </Typography>
              </Grid>
            )}
            {equiposPendientes.map(({ equipo, index }, posicion) => {
              const pendiente = calcularCantidadPendiente(equipo);
              const cambio = cambios[index] || ESTADO_INICIAL_CAMBIO;
              const cantidadDevuelta = cambio.cantidad === "" ? 0 : Number(cambio.cantidad) || 0;
              const restante = pendiente - cantidadDevuelta;
              const diasNumero = Number(cambio.dias);
              const descuentoNumero = Math.max(0, Number(cambio.descuento) || 0);
              const valorDias =
                diasNumero > 0 ? diasNumero * restante * (Number(equipo.valor) || 0) : 0;
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0
                  ? calcularVencimiento(equipo.fechaVencimiento, diasNumero)
                  : null;

              return (
                <Grid item xs={12} key={`${equipo.nombre}-${index}`}>
                  <Typography variant="body2" fontWeight="bold">
                    {pendiente} {equipo.nombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {equipo.vencimientoIndefinido
                      ? "Entrega indefinida actualmente"
                      : `Vence: ${formatearFechaLegible(equipo.fechaVencimiento)}`}
                  </Typography>

                  <TextField
                    label="Cantidad que devuelve hoy"
                    type="number"
                    inputProps={{ min: 0, max: pendiente }}
                    value={cambio.cantidad}
                    onChange={(e) => handleCambiarCantidad(index, e.target.value, pendiente)}
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
                              handleCambiarBuenEstado(index, e.target.checked)
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
                            name={`estadoMotivo-${index}`}
                            value={cambio.motivoEstado}
                            onChange={(e) =>
                              handleCambiarEstado(index, "motivoEstado", e.target.value)
                            }
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            placeholder="Ej: rayadura en el tambor, falta una manguera"
                          />

                          {/* Solo si hay garantía de dónde retener. Sin
                              depósito el daño igual queda anotado: es lo que
                              se le reclama al cliente. */}
                          {depositoTotal > 0 && (
                            <TextField
                              label="Se retiene del depósito"
                              name={`estadoRetenido-${index}`}
                              value={formatearMonedaInput(cambio.retenidoEstado)}
                              onChange={(e) =>
                                handleCambiarEstado(
                                  index,
                                  "retenidoEstado",
                                  limpiarMonedaInput(e.target.value),
                                )
                              }
                              fullWidth
                              size="small"
                              sx={{ mt: 1 }}
                              helperText="Se puede dejar vacío y decidirlo al liquidar"
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
                        onChange={(e) => handleCambiarDias(index, e.target.value)}
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
                          onChange={(e) => handleCambiarDescuento(index, e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mt: 1 }}
                          helperText={
                            valorDias > 0
                              ? `${diasNumero} día${diasNumero === 1 ? "" : "s"} = ${formatearMoneda(
                                  valorDias,
                                )}${
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
                            onChange={(e) => handleCambiarIndefinida(index, e.target.checked)}
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
