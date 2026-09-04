import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  MODOS_PAGO,
  obtenerFechaHoyBogota,
  formatearMonedaInput,
  limpiarMonedaInput,
  calcularCuentaFactura,
  calcularDepositoDevuelto,
  entregasDe,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

// Registra plata que SALE hacia el cliente. Es el reverso del abono, y hasta
// ahora no existía: una factura con saldo a favor se quedaba así para siempre.
//
// Pasa por dos motivos, y los dos terminan igual —la empresa le debe plata al
// cliente—:
//   - se le devuelve el depósito y ya había pagado todo
//   - pagó de más en algún momento
//
// Mientras no se entregue, la factura no puede terminar (ver
// calcularEstadoFactura): una factura "finalizada" no puede estar tapando una
// deuda con el cliente.
export default function EntregarSaldoDialog({
  open,
  onClose,
  cliente,
  factura,
  onEntregado,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [form, setForm] = useState({ fecha: "", medio: "", monto: "" });
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const cuenta = calcularCuentaFactura(factura);
  const aFavor = cuenta.saldoAFavor;
  const depositoDevuelto = calcularDepositoDevuelto(factura);

  useEffect(() => {
    if (!open) return;
    // La fecha de hoy y el monto completo puestos de entrada: en el caso
    // normal se entrega todo junto y alcanza con elegir el medio.
    setForm({
      fecha: obtenerFechaHoyBogota(),
      medio: "",
      monto: String(aFavor),
    });
    setErrors({});
    // aFavor sale de la factura que llega por props; recalcularlo en cada
    // render volvería a pisar lo que el usuario escribió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monto = Number(form.monto) || 0;

  const validar = () => {
    const errores = {};
    if (!form.fecha) errores.fecha = "Este campo es obligatorio.";
    if (!form.medio) errores.medio = "Elegí por dónde se entregó.";
    if (monto <= 0) errores.monto = "El valor debe ser mayor a 0.";
    if (monto > aFavor) {
      errores.monto = `No podés entregar más de ${formatearMoneda(aFavor)}.`;
    }
    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    try {
      const entregas = [
        ...entregasDe(factura),
        {
          fecha: form.fecha,
          medio: form.medio,
          monto,
          nota: depositoDevuelto > 0 ? "Devolución de depósito" : "",
        },
      ];

      await updateDoc(
        doc(db, "clientes", cliente.id, "facturas", factura.id),
        { entregas },
      );

      showSnackbar("Entrega registrada correctamente.", "success");
      onEntregado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al registrar la entrega: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={guardando ? undefined : onClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: acento }}>Devolver al cliente</DialogTitle>
        <DialogContent>
          <Paper variant="totales" sx={{ mt: 1, mb: 2 }}>
            {depositoDevuelto > 0 && (
              <Box className="fila">
                <Typography variant="body2">Depósito devuelto</Typography>
                <Typography variant="body2">
                  {formatearMoneda(depositoDevuelto)}
                </Typography>
              </Box>
            )}
            <Box className="fila total">
              <Typography variant="subtitle1" fontWeight="bold">
                A favor del cliente
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {formatearMoneda(aFavor)}
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Fecha"
                name="fechaEntrega"
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fecha: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.fecha)}
                helperText={errors.fecha}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={Boolean(errors.medio)}>
                <InputLabel id="medio-entrega-label" htmlFor="medioEntrega">
                  Se entregó por
                </InputLabel>
                <Select
                  labelId="medio-entrega-label"
                  label="Se entregó por"
                  value={form.medio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, medio: e.target.value }))
                  }
                  inputProps={{ id: "medioEntrega", name: "medioEntrega" }}
                >
                  {MODOS_PAGO.map((modo) => (
                    <MenuItem key={modo} value={modo}>
                      {modo}
                    </MenuItem>
                  ))}
                </Select>
                {errors.medio && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.medio}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Valor entregado"
                name="montoEntrega"
                value={formatearMonedaInput(form.monto)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monto: limpiarMonedaInput(e.target.value),
                  }))
                }
                fullWidth
                error={Boolean(errors.monto)}
                helperText={
                  errors.monto ||
                  "Si entregás menos, el resto queda a favor del cliente."
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button
            variant="contained"
            color="error"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Registrar entrega"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

EntregarSaldoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onEntregado: PropTypes.func,
};
