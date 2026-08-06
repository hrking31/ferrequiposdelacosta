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
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  MODOS_PAGO,
  obtenerFechaHoyBogota,
  formatearMonedaInput,
  limpiarMonedaInput,
  calcularSaldoConAbonos,
  ordenarFacturasConSaldo,
  repartirEntreFacturas,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

const ESTADO_INICIAL = { fecha: "", medio: "", monto: "" };

// Registra un pago que el cliente consigna después de facturar, y que puede
// alcanzar para varias facturas a la vez: el usuario ingresa un solo valor
// (una sola fecha, un solo medio) y acá se reparte solo entre las facturas
// que todavía tienen saldo. Se le da primero a la de MÁS saldo hasta
// saldarla, y si sobra se sigue con la siguiente en ese orden; si el abono
// alcanza para saldar todas, lo que sobre queda como saldo a favor en la
// última que se tocó (la de menor saldo).
export default function AbonoDialog({ open, onClose, cliente, facturas, onAbonado }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    // La fecha de HOY, no la del despacho: un abono es plata que ya entró.
    // Antes usaba la regla de las 3 p.m. —la que corre el alquiler al día
    // siguiente— y un pago recibido a las 4 de la tarde quedaba fechado
    // mañana.
    setForm({ ...ESTADO_INICIAL, fecha: obtenerFechaHoyBogota() });
    setErrors({});
  }, [open]);

  // Solo entran las facturas que todavía deben algo: son las únicas que
  // pueden recibir parte de este abono. El total ya trae los días ampliados
  // sumados, igual que en la tarjeta de cada factura, para que la cifra que
  // se ve acá sea la misma que se ve afuera. Empatadas en saldo, gana la más
  // antigua.
  const facturasConSaldo = ordenarFacturasConSaldo(facturas);

  const montoNuevo = Number(form.monto) || 0;

  // La simulación del reparto: a cada factura, en el orden de más a menos
  // saldo, se le asigna lo que le falta hasta saldarla. La última que llega a
  // recibir algo se lleva TODO lo que quede del abono, así que si sobra
  // después de saldar a todas, ese sobrante queda ahí como saldo a favor en
  // vez de perderse.
  const reparto = repartirEntreFacturas(facturasConSaldo, montoNuevo);

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

    const aplicaciones = reparto.filter((item) => item.aplicado > 0);
    if (aplicaciones.length === 0) return;

    setGuardando(true);
    try {
      const batch = writeBatch(db);
      aplicaciones.forEach(({ factura, aplicado }) => {
        const abonos = [
          ...(factura.abonos || []),
          { fecha: form.fecha, medio: form.medio, monto: aplicado },
        ];
        batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
          abonos,
          saldoPendiente: calcularSaldoConAbonos(factura, abonos),
        });
      });
      await batch.commit();

      showSnackbar(
        aplicaciones.length > 1
          ? `Abono registrado en ${aplicaciones.length} facturas.`
          : "Abono registrado.",
        "success",
      );
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
            {facturasConSaldo.length > 0 && (
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
                {facturasConSaldo.length} factura{facturasConSaldo.length === 1 ? "" : "s"} con
                saldo
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

            {/* El reparto automático: cada factura con saldo, en el orden en
                que se le va aplicando la plata, y cómo queda si se guarda
                este abono. */}
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
                Facturas con saldo
              </Typography>

              {facturasConSaldo.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Este cliente no tiene facturas con saldo pendiente.
                </Typography>
              ) : (
                <Paper variant="totales">
                  {reparto.map(({ factura, cuenta, aplicado }) => {
                    const quedaSaldo = Math.max(0, cuenta.saldoPendiente - aplicado);
                    const quedaAFavor = Math.max(0, aplicado - cuenta.saldoPendiente);

                    return (
                      <Box key={factura.id}>
                        <Box className="fila total">
                          <Typography variant="body2">
                            Factura {factura.numeroFactura ?? "s/n"}
                          </Typography>
                          <Typography variant="body2">
                            {formatearMoneda(cuenta.total)}
                          </Typography>
                        </Box>

                        <Box className="fila">
                          <Typography variant="body2">Saldo actual</Typography>
                          <Typography variant="body2">
                            {formatearMoneda(cuenta.saldoPendiente)}
                          </Typography>
                        </Box>

                        {aplicado > 0 && (
                          <>
                            <Box className="fila abono">
                              <Typography variant="body2">+ Se abona</Typography>
                              <Typography variant="body2">
                                {formatearMoneda(aplicado)}
                              </Typography>
                            </Box>

                            <Box className={quedaSaldo > 0 ? "fila alerta" : "fila ok"}>
                              <Typography variant="body2" fontWeight="bold">
                                {quedaAFavor > 0
                                  ? "Saldo a favor"
                                  : quedaSaldo > 0
                                    ? "Queda debiendo"
                                    : "Queda saldada"}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {quedaAFavor > 0
                                  ? formatearMoneda(quedaAFavor)
                                  : quedaSaldo > 0
                                    ? formatearMoneda(quedaSaldo)
                                    : ""}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Box>
                    );
                  })}
                </Paper>
              )}
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
  facturas: PropTypes.array,
  onAbonado: PropTypes.func,
};
