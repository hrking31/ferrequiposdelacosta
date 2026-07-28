import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  calcularVencimiento,
  obtenerAmpliaciones,
} from "../ClienteDetalle/facturaUtils";

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

const ESTADO_INICIAL_CAMBIO = { dias: "", descuento: "", indefinida: false };

const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
  });

export default function AmpliarVencimientoDialog({ open, onClose, cliente, factura, onActualizado }) {
  const theme = useTheme();
  const acento =
    theme.palette.custom.accent;
  const [cambios, setCambios] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setCambios({});
  }, [open]);

  const equipos = factura?.equipos?.filter((equipo) => typeof equipo === "object") || [];

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
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
    const huboCambios = equipos.some((_, index) => {
      const cambio = cambios[index];
      return cambio && (cambio.indefinida || Number(cambio.dias) > 0);
    });
    if (!huboCambios) {
      showSnackbar("Marcá al menos un equipo para ampliar o dejar indefinido.", "warning");
      return;
    }

    setGuardando(true);
    try {
      const equiposActualizados = equipos.map((equipo, index) => {
        const cambio = cambios[index];
        if (!cambio) return equipo;

        if (cambio.indefinida) {
          return { ...equipo, vencimientoIndefinido: true };
        }

        const extra = Number(cambio.dias) || 0;
        if (extra <= 0) return equipo;

        const fechaNueva = calcularVencimiento(equipo.fechaVencimiento, extra);
        const descuento = Math.max(0, Number(cambio.descuento) || 0);

        return {
          ...equipo,
          vencimientoIndefinido: false,
          // Se conserva por compatibilidad con las facturas viejas y con
          // cualquier vista que todavía lo lea. Solo se escribe la primera vez.
          fechaVencimientoOriginal: equipo.fechaVencimientoOriginal || equipo.fechaVencimiento,
          // El registro completo de la ampliación: desde qué fecha, hasta
          // cuál, cuántos días se sumaron y qué descuento se les hizo. Se
          // acumulan todas, no solo la primera.
          ampliaciones: [
            ...obtenerAmpliaciones(equipo),
            {
              fechaAnterior: equipo.fechaVencimiento,
              fechaNueva,
              dias: extra,
              descuento,
            },
          ],
          fechaVencimiento: fechaNueva,
        };
      });

      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        equipos: equiposActualizados,
      });

      showSnackbar("Vencimiento actualizado correctamente.", "success");
      onActualizado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al actualizar el vencimiento: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>Ampliar vencimiento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {equipos.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Esta factura no tiene equipos para ampliar.
                </Typography>
              </Grid>
            )}
            {equipos.map((equipo, index) => {
              const cambio = cambios[index] || ESTADO_INICIAL_CAMBIO;
              const diasNumero = Number(cambio.dias);
              const descuentoNumero = Math.max(0, Number(cambio.descuento) || 0);
              // Lo que valen los días que se están agregando, para poder ver
              // sobre qué monto se está haciendo el descuento.
              const valorDias =
                diasNumero > 0
                  ? diasNumero *
                    (Number(equipo.cantidad) || 0) *
                    (Number(equipo.valor) || 0)
                  : 0;
              const nuevaFecha =
                !cambio.indefinida && diasNumero > 0
                  ? calcularVencimiento(equipo.fechaVencimiento, diasNumero)
                  : null;
              return (
                <Grid item xs={12} key={`${equipo.nombre}-${index}`}>
                  <Typography variant="body2" fontWeight="bold">
                    {equipo.cantidad} {equipo.nombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {equipo.vencimientoIndefinido
                      ? "Entrega indefinida actualmente"
                      : `Vence: ${formatearFechaLegible(equipo.fechaVencimiento)}`}
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
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, color: "custom.totalText" }}
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

                  {index < equipos.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="danger" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

AmpliarVencimientoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onActualizado: PropTypes.func,
};
