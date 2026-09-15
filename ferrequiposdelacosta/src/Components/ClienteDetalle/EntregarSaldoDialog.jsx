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
  Divider,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
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
  abonosDe,
  datosFactura,
  ordenarFacturasConSaldo,
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
//
// ── Y SI EL CLIENTE DEBE EN OTRA FACTURA ──────────────────────────────
//
// Entonces entregarle la plata es sacarla de la caja para volver a pedírsela.
// Las facturas llevan cuentas separadas —lo tiene que ser, cada una es un
// contrato— y por eso la app no las cruzaba sola: te dejaba devolverle
// $286.000 a alguien que debía $500.000 en la factura de al lado, sin decir
// nada.
//
// Ahora lo dice y ofrece cruzarlo. El cruce escribe las DOS puntas en una sola
// operación: una salida acá —que es real, esta factura entrega la plata— y un
// abono `tipo: "cruce"` en la que debe, con el número de esta anotado. Ninguna
// de las dos inventa plata, y en cada una queda escrito de dónde salió.
export default function EntregarSaldoDialog({
  open,
  onClose,
  cliente,
  factura,
  facturas,
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

  // Las OTRAS facturas del cliente que todavía deben, de la más antigua a la
  // más nueva —el mismo orden con que se reparte un abono, porque esto es un
  // abono—. La propia queda afuera: ya está pagada, por eso sobra plata.
  const otrasConSaldo = ordenarFacturasConSaldo(
    (facturas ?? []).filter((otra) => otra?.id !== factura?.id),
  );
  const puedeCruzar = otrasConSaldo.length > 0;

  // A dónde va la plata: "cruce" contra lo que el cliente debe, o "entrega" a
  // su bolsillo. Arranca en cruce cuando hay deuda —es lo que evita sacar de
  // caja para volver a pedir— y en entrega cuando no hay nada que cruzar.
  const [destino, setDestino] = useState("entrega");
  const cruzando = destino === "cruce" && puedeCruzar;

  // Cuánto le toca a cada factura que debe: EXACTAMENTE lo que le falta para
  // saldarse, ni un peso más.
  //
  // No se usa `repartirEntreFacturas` —la del abono— a propósito: esa le da a
  // la última todo lo que sobre, para que un pago de más quede a favor donde
  // el cliente lo mandó. Acá el sobrante ya está a favor ACÁ, y mandarlo a la
  // otra factura sería mudarlo de lugar sin motivo, dejando dos facturas a
  // medio resolver en vez de una.
  const reparto = otrasConSaldo
    .reduce(
      ({ restante, filas }, { factura: otra, cuenta: cuentaOtra }) => {
        const aplicado = Math.min(restante, cuentaOtra.saldoPendiente);
        return {
          restante: restante - aplicado,
          filas: [...filas, { factura: otra, cuenta: cuentaOtra, aplicado }],
        };
      },
      { restante: aFavor, filas: [] },
    )
    .filas.filter(({ aplicado }) => aplicado > 0);
  const totalCruzado = reparto.reduce((suma, { aplicado }) => suma + aplicado, 0);
  const sobranteDelCruce = Math.max(0, aFavor - totalCruzado);

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
    // Con deuda en otra factura, el cruce viene elegido: es lo que hay que
    // hacer en el caso normal, y entregar la plata pasa a ser la excepción
    // que alguien tiene que pedir a propósito.
    setDestino(puedeCruzar ? "cruce" : "entrega");
    // aFavor sale de la factura que llega por props; recalcularlo en cada
    // render volvería a pisar lo que el usuario escribió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const monto = Number(form.monto) || 0;

  const validar = () => {
    // El cruce no se valida: no hay nada que escribir. La fecha es hoy, el
    // monto lo decide la deuda y no hubo medio de pago porque no se movió
    // plata.
    if (cruzando) return true;

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
      if (cruzando) {
        await guardarCruce();
      } else {
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
      }

      onEntregado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al registrar la entrega: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  // EL CRUCE, en una sola operación: si se escribiera la salida y fallara el
  // abono, el cliente perdería la plata en las dos puntas.
  //
  // De ESTE lado sale una entrega igual que cualquier otra —la factura entregó
  // la plata, aunque no haya pasado por caja— con la nota que dice a dónde
  // fue. Del otro entra un abono `tipo: "cruce"` con el número de esta
  // factura, que es lo que después explica por qué esa factura bajó sin que el
  // cliente pagara nada.
  const guardarCruce = async () => {
    const hoy = obtenerFechaHoyBogota();
    const numeroPropio = datosFactura(factura).numeroFactura ?? "s/n";
    const batch = writeBatch(db);

    const destinos = reparto.map(({ factura: otra }) =>
      datosFactura(otra).numeroFactura ?? "s/n",
    );

    batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
      entregas: [
        ...entregasDe(factura),
        {
          fecha: hoy,
          // No hubo medio de pago: la plata nunca salió de la empresa, cambió
          // de factura. Escribir "Efectivo" acá sería inventar un movimiento
          // de caja que nadie hizo.
          medio: "Cruce",
          monto: totalCruzado,
          nota: `Cruzado a la factura ${destinos.join(", ")}`,
        },
      ],
    });

    reparto.forEach(({ factura: otra, aplicado }) => {
      batch.update(doc(db, "clientes", cliente.id, "facturas", otra.id), {
        abonos: [
          ...abonosDe(otra),
          {
            fecha: hoy,
            medio: "Cruce",
            monto: aplicado,
            tipo: "cruce",
            desdeFactura: numeroPropio,
          },
        ],
      });
    });

    await batch.commit();

    showSnackbar(
      destinos.length > 1
        ? `Cruzado entre ${destinos.length} facturas.`
        : `Cruzado a la factura ${destinos[0]}.`,
      "success",
    );
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

          {/* LA PREGUNTA, y solo cuando hay algo que preguntar: si el cliente
              no debe en ninguna otra factura, este diálogo sigue siendo el de
              siempre —fecha, medio y se entrega—. */}
          {puedeCruzar && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {otrasConSaldo.length === 1
                  ? `Este cliente debe ${formatearMoneda(
                      otrasConSaldo[0].cuenta.saldoPendiente,
                    )} en la factura ${
                      datosFactura(otrasConSaldo[0].factura).numeroFactura ?? "s/n"
                    }.`
                  : `Este cliente debe en ${otrasConSaldo.length} facturas más.`}
              </Typography>

              <RadioGroup
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                name="destinoDelSaldo"
              >
                <FormControlLabel
                  value="cruce"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2">
                      Cruzarlo con lo que debe — no sale plata
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="entrega"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2">
                      Entregárselo al cliente
                    </Typography>
                  }
                />
              </RadioGroup>

              {/* CÓMO QUEDA CADA FACTURA, antes de guardar: el cruce toca dos
                  documentos a la vez y hay que poder verlo sin abrirlos. */}
              {cruzando && (
                <Paper variant="totales" sx={{ mt: 1 }}>
                  {reparto.map(({ factura: otra, aplicado, cuenta: cuentaOtra }) => {
                    const numero = datosFactura(otra).numeroFactura ?? "s/n";
                    const queda = Math.max(0, cuentaOtra.saldoPendiente - aplicado);

                    return (
                      <Box key={otra.id}>
                        <Box className="fila abono">
                          <Typography variant="body2">
                            A la factura {numero}
                          </Typography>
                          <Typography variant="body2">
                            {formatearMoneda(aplicado)}
                          </Typography>
                        </Box>
                        <Box className={queda > 0 ? "fila alerta" : "fila ok"}>
                          <Typography variant="body2">
                            {queda > 0 ? "Le queda debiendo" : "Queda saldada"}
                          </Typography>
                          <Typography variant="body2">
                            {queda > 0 ? formatearMoneda(queda) : ""}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}

                  {/* Lo que no alcanzó a cruzarse sigue siendo del cliente:
                      esta factura queda con ese saldo a favor y el botón
                      vuelve a aparecer para entregárselo. */}
                  {sobranteDelCruce > 0 && (
                    <>
                      <Divider sx={{ my: 0.75 }} />
                      <Box className="fila">
                        <Typography variant="body2">
                          Le sigue quedando a favor
                        </Typography>
                        <Typography variant="body2">
                          {formatearMoneda(sobranteDelCruce)}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Paper>
              )}
            </Box>
          )}

          {/* Fecha, medio y monto son de la entrega. En el cruce no hay nada
              que llenar: la fecha es hoy, el monto lo decide la deuda y no
              hubo medio porque la plata no se movió. */}
          <Grid container spacing={2} sx={{ display: cruzando ? "none" : undefined }}>
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
            {guardando
              ? "Guardando..."
              : cruzando
                ? "Cruzar"
                : "Registrar entrega"}
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
  // Todas las facturas del cliente, para saber si debe en alguna otra. Sin
  // esto el diálogo no ofrece cruzar: entrega la plata como siempre.
  facturas: PropTypes.array,
  onEntregado: PropTypes.func,
};
