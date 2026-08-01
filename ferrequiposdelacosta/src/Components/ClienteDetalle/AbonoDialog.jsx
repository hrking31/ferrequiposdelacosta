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
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  MODOS_PAGO,
  obtenerFechaInicialEfectiva,
  formatearMonedaInput,
  limpiarMonedaInput,
  sumarAbonos,
  calcularEstadoCuenta,
  calcularAmpliacionFactura,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

const ESTADO_INICIAL = { fecha: "", medio: "", monto: "" };


// Registra un pago posterior a la factura: el cliente abona algo a lo que
// quedó debiendo. Cada abono guarda su fecha y su medio, para saber cuándo y
// por dónde entró la plata.
export default function AbonoDialog({ open, onClose, cliente, factura, onAbonado }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    setForm({ ...ESTADO_INICIAL, fecha: obtenerFechaInicialEfectiva() });
    setErrors({});
  }, [open]);

  // El total que se muestra acá tiene que ser el mismo que se ve en la
  // factura, y ese incluye los días ampliados. El que se guarda, no.
  const ampliacion = calcularAmpliacionFactura(factura);
  const totalMostrado = ampliacion.hay
    ? ampliacion.nuevoTotal
    : Number(factura?.valorTotal) || 0;
  const estadoActual = calcularEstadoCuenta(factura, totalMostrado);
  const montoNuevo = Number(form.monto) || 0;

  // Cómo queda la cuenta si se guarda este abono.
  const pagadoConEsteAbono = estadoActual.pagado + montoNuevo;
  const saldoPendiente = Math.max(0, estadoActual.total - pagadoConEsteAbono);
  const saldoAFavor = Math.max(0, pagadoConEsteAbono - estadoActual.total);

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const validar = () => {
    const errores = {};
    if (!form.fecha) errores.fecha = "Este campo es obligatorio.";
    if (!form.medio) errores.medio = "Elegí el medio de pago.";
    if (montoNuevo <= 0) errores.monto = "El valor debe ser mayor a 0.";
    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    const abonos = [
      ...(factura.abonos || []),
      { fecha: form.fecha, medio: form.medio, monto: montoNuevo },
    ];

    setGuardando(true);
    try {
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        abonos,
        // El saldo guardado sale del total facturado menos todo lo recibido:
        // los pagos del alta más los abonos. Nunca baja de cero — si se pagó
        // de más, eso se muestra aparte como saldo a favor.
        saldoPendiente: Math.max(
          0,
          (Number(factura.valorTotal) || 0) -
            (Number(factura.montoPagado) || 0) -
            sumarAbonos(abonos),
        ),
      });

      showSnackbar("Abono registrado.", "success");
      onAbonado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al registrar el abono: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
            <span>Registrar abono</span>
            {factura && (
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  opacity: 0.35,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Factura {factura.numeroFactura ?? "s/n"}
              </Typography>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha del abono"
                type="date"
                value={form.fecha}
                onChange={handleChange("fecha")}
                error={!!errors.fecha}
                helperText={errors.fecha}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.medio}>
                <InputLabel id="abono-medio-label" htmlFor="abono-medio-input">
                  Medio de pago
                </InputLabel>
                <Select
                  labelId="abono-medio-label"
                  inputProps={{ id: "abono-medio-input" }}
                  label="Medio de pago"
                  value={form.medio}
                  onChange={handleChange("medio")}
                >
                  {MODOS_PAGO.map((medio) => (
                    <MenuItem key={medio} value={medio}>
                      {medio}
                    </MenuItem>
                  ))}
                </Select>
                {errors.medio && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {errors.medio}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Valor del abono"
                value={formatearMonedaInput(form.monto)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, monto: limpiarMonedaInput(e.target.value) }))
                }
                error={!!errors.monto}
                helperText={errors.monto}
                fullWidth
                autoFocus
              />
            </Grid>

            {/* Cómo queda la cuenta con este abono, para no tener que hacer la
                resta de cabeza antes de guardar. */}
            <Grid item xs={12}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  lineHeight: 1.6,
                }}
              >
                <AccountBalanceWalletIcon fontSize="small" />
                Estado de cuenta
              </Typography>
              <Paper variant="totales">
                <Box className="fila total">
                  <Typography variant="body2">Total factura</Typography>
                  <Typography variant="body2">{formatearMoneda(estadoActual.total)}</Typography>
                </Box>

                <Box className="fila pagado">
                  <Typography variant="body2">Pagado hasta ahora</Typography>
                  <Typography variant="body2">{formatearMoneda(estadoActual.pagado)}</Typography>
                </Box>

                {montoNuevo > 0 && (
                  <Box className="fila abono">
                    <Typography variant="body2">+ Este abono</Typography>
                    <Typography variant="body2">{formatearMoneda(montoNuevo)}</Typography>
                  </Box>
                )}

                {/* Verde cuando la factura queda saldada (o con plata a favor),
                    rojo mientras quede algo por cobrar. */}
                {saldoAFavor > 0 ? (
                  <Box className="fila ok" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Saldo a favor
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatearMoneda(saldoAFavor)}
                    </Typography>
                  </Box>
                ) : (
                  <Box className={saldoPendiente > 0 ? "fila alerta" : "fila ok"} sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Saldo pendiente
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatearMoneda(saldoPendiente)}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar abono"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

AbonoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onAbonado: PropTypes.func,
};
