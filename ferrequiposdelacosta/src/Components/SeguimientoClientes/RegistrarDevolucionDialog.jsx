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

const ESTADO_INICIAL_CAMBIO = { cantidad: "", dias: "", descuento: "", indefinida: false };

// El depósito se resuelve acá porque es el único momento en que alguien tiene
// los equipos delante y puede decir en qué estado volvieron. Arranca en "todo
// bien", que es lo que pasa casi siempre.
const ESTADO_INICIAL_DEPOSITO = { buenEstado: true, retenido: "", motivo: "" };

// Registra qué se devolvió de cada línea de equipo (total o parcial) y, si
// queda un remanente, integra en el mismo formulario la nueva fecha de
// vencimiento (o "indefinida") para lo que sigue con el cliente — mismo
// cálculo que usa AmpliarVencimientoDialog.
export default function RegistrarDevolucionDialog({ open, onClose, cliente, factura, onActualizado }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [cambios, setCambios] = useState({});
  const [deposito, setDeposito] = useState(ESTADO_INICIAL_DEPOSITO);
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
    setDeposito(ESTADO_INICIAL_DEPOSITO);
  }, [open]);

  const equipos = factura?.equipos?.filter((equipo) => typeof equipo === "object") || [];
  const equiposPendientes = equipos
    .map((equipo, index) => ({ equipo, index }))
    .filter(({ equipo }) => calcularCantidadPendiente(equipo) > 0);

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

  // El depósito solo se resuelve cuando vuelve el último equipo: es uno solo
  // para toda la factura y se devuelve entero, no por partes.
  const depositoTotal = calcularDepositoTotal(factura);
  const resolverDeposito =
    hayDevolucion &&
    !quedanEquiposAfuera &&
    depositoTotal > 0 &&
    !factura?.depositoResuelto;

  const retenido = deposito.buenEstado
    ? 0
    : Math.min(depositoTotal, Math.max(0, Number(deposito.retenido) || 0));
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

    // Retener plata del cliente sin decir por qué no es una opción: es lo
    // único que después justifica el descuento frente a él.
    if (resolverDeposito && !deposito.buenEstado) {
      if (retenido <= 0) {
        showSnackbar("Indicá cuánto del depósito se retiene.", "warning");
        return;
      }
      if (!deposito.motivo.trim()) {
        showSnackbar("Escribí por qué se retiene parte del depósito.", "warning");
        return;
      }
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
          vencimientoIndefinido: false,
        });

        const restante = {
          ...equipo,
          cantidad: cantidadOriginal - cantidadDevuelta,
          cantidadDevuelta: 0,
        };
        delete restante.fechaDevolucion;

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
      // puede estar al día: el cliente devuelve antes de que se venza. Eso se
      // anota igual —para que quede en la línea de tiempo— pero marcado, y el
      // chip de Seguimiento lo ignora (ver calcularGestionFactura). Se mira el
      // estado de ANTES de esta devolución, que es cuando se hizo.
      const esGestionDeCobranza = facturaEnSeguimiento(factura);
      const gestiones = huboCierre
        ? [
            ...obtenerGestiones(factura),
            crearRegistroGestion(quedanEquipos ? "parcial" : "total", {
              unidades: unidadesDevueltas,
              ...(esGestionDeCobranza ? {} : { enSeguimiento: false }),
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
          motivo: deposito.buenEstado ? "" : deposito.motivo.trim(),
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

                  {cantidadDevuelta > 0 && restante > 0 && (
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

            {/* Vuelve el último equipo: hay que decidir el depósito. Aparece
                solo en ese momento porque es cuando alguien tiene los equipos
                delante y puede decir en qué estado volvieron. */}
            {resolverDeposito && (
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ color: acento }}>
                  Depósito: {formatearMoneda(depositoTotal)}
                </Typography>

                <FormControlLabel
                  sx={{ mt: 0.5 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={deposito.buenEstado}
                      onChange={(e) =>
                        setDeposito({
                          ...ESTADO_INICIAL_DEPOSITO,
                          buenEstado: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Volvió todo completo y en buen estado"
                />

                {!deposito.buenEstado && (
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      label="Se retiene"
                      name="depositoRetenido"
                      value={formatearMonedaInput(deposito.retenido)}
                      onChange={(e) =>
                        setDeposito((prev) => ({
                          ...prev,
                          retenido: limpiarMonedaInput(e.target.value),
                        }))
                      }
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Motivo"
                      name="depositoMotivo"
                      value={deposito.motivo}
                      onChange={(e) =>
                        setDeposito((prev) => ({ ...prev, motivo: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      sx={{ mt: 1.5 }}
                      placeholder="Ej: rayadura en el tambor, falta una manguera"
                    />
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
};
