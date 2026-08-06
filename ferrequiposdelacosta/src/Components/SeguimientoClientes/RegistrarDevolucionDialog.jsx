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
} from "../ClienteDetalle/facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

const ESTADO_INICIAL_CAMBIO = { cantidad: "", dias: "", descuento: "", indefinida: false };

// Registra qué se devolvió de cada línea de equipo (total o parcial) y, si
// queda un remanente, integra en el mismo formulario la nueva fecha de
// vencimiento (o "indefinida") para lo que sigue con el cliente — mismo
// cálculo que usa AmpliarVencimientoDialog.
export default function RegistrarDevolucionDialog({ open, onClose, cliente, factura, onActualizado }) {
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
    .filter(({ equipo }) => calcularCantidadPendiente(equipo) > 0);

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
      const gestiones = huboCierre
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

      const batch = writeBatch(db);
      batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        equipos: equiposActualizados,
        gestiones,
      });
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
