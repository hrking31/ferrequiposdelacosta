import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ButtonBase,
  Checkbox,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  MODOS_PAGO,
  obtenerFechaHoyBogota,
  formatearMonedaInput,
  limpiarMonedaInput,
  ordenarFacturasConSaldo,
  repartirEntreFacturas,
  abonosDe,
  datosFactura,
  calcularExigible,
  sellarFacturaPagada,
  equiposDe,
  sigueAfuera,
  equipoVencido,
  MEDIO_DEPOSITO,
} from "./facturaUtils";
import IconoDeposito from "./IconoDeposito";
import { formatearMoneda } from "../../Utils/formato";

const ESTADO_INICIAL = { fecha: "", medio: "", monto: "" };

// Registra un pago que el cliente consigna después de facturar, y que puede
// alcanzar para varias facturas a la vez.
//
// ── EN TRES PASOS, en el orden en que se piensa un cobro ───────────────
//
// 1. ¿Qué va a pagar? Toda la deuda, o facturas específicas. Hasta elegirlo
//    no aparece nada más: mostrar de entrada el valor, el depósito, la deuda y
//    la lista de facturas era demasiado junto.
// 2. ¿Cómo paga? Primero, si lo elegido tiene depósito libre, la casilla para
//    usarlo; después el medio y el valor de la plata que trae.
// 3. Así queda: la deuda, lo que se paga y lo que queda. El reparto por
//    factura va plegado.
//
// ── QUIÉN DECIDE A QUÉ FACTURA VA ─────────────────────────────────────
//
// Con "toda la deuda" reparte la app, empezando por la MÁS ANTIGUA —la que
// está más cerca de volverse incobrable, y como se imputa un pago cuando el
// deudor no elige—; lo que sobre queda a favor en la última. Con "facturas
// específicas" manda el cliente: se reparte solo entre las que nombró, con el
// mismo criterio. Queda escrito en el abono: `tipo: "sistema"` o `"cliente"`.
//
// ── EL DEPÓSITO LIBRE ─────────────────────────────────────────────────
//
// Con los equipos de vuelta, el depósito que queda es plata del cliente, y
// puede pedir que pague con él. No es un medio de pago: es una casilla, y
// marcada hace que cada factura pague PRIMERO con su propio depósito —hasta lo
// que tiene libre y hasta lo que debe—. Lo que traiga en plata cubre el resto,
// repartido como siempre. Se guardan los dos abonos juntos: el del depósito
// con medio "Depósito", para que la lista de abonos diga cómo se pagó.
export default function AbonoDialog({
  open,
  onClose,
  cliente,
  facturas,
  onAbonado,
  avisarEquiposVencidos = false,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const colorDeposito = theme.palette.custom.depositoText;
  const [form, setForm] = useState(ESTADO_INICIAL);
  // Paso 1: "todo" o "facturas". Null hasta que se elige.
  const [que, setQue] = useState(null);
  // Las facturas que el cliente nombró, cuando eligió "facturas".
  const [elegidas, setElegidas] = useState([]);
  const [usarDeposito, setUsarDeposito] = useState(false);
  const [verReparto, setVerReparto] = useState(false);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (!open) return;
    // La fecha de HOY, no la del despacho: un abono es plata que ya entró.
    setForm({ ...ESTADO_INICIAL, fecha: obtenerFechaHoyBogota() });
    // Cada abono arranca de cero: dejar la elección del anterior mandaría
    // este a una factura que nadie nombró.
    setQue(null);
    setElegidas([]);
    setUsarDeposito(false);
    setVerReparto(false);
    setErrors({});
  }, [open]);

  // Solo entran las facturas que todavía deben algo, de la más antigua a la
  // más nueva, que es el orden en que las va saldando.
  const facturasConSaldo = ordenarFacturasConSaldo(facturas);
  const deudaActual = facturasConSaldo.reduce(
    (total, { cuenta }) => total + cuenta.saldoPendiente,
    0,
  );

  const loEligioElCliente = que === "facturas";
  const destinos = loEligioElCliente
    ? facturasConSaldo.filter(({ factura }) => elegidas.includes(factura.id))
    : facturasConSaldo;
  const pasoUnoListo = que === "todo" || (loEligioElCliente && destinos.length > 0);

  // Hasta cuánto puede pagar cada factura con SU depósito: lo que tiene
  // libre, sin pasarse de lo que debe.
  const topeDeposito = ({ cuenta }) =>
    Math.min(cuenta.deposito.porDevolver, cuenta.saldoPendiente);
  const depositoDisponible = destinos.reduce((total, item) => total + topeDeposito(item), 0);
  const conDeposito = usarDeposito && depositoDisponible > 0;

  const montoNuevo = Number(form.monto) || 0;
  const debeLoElegido = destinos.reduce((total, { cuenta }) => total + cuenta.saldoPendiente, 0);

  // EL REPARTO: primero el depósito de cada una, después la plata, como
  // cualquier abono —de la más antigua a la más nueva, la última se lleva el
  // sobrante—, sobre lo que cada una siga debiendo.
  const filas = destinos.map((item) => ({
    ...item,
    deposito: conDeposito ? topeDeposito(item) : 0,
    plata: 0,
  }));
  const conSaldoTrasDeposito = filas
    .filter((fila) => fila.cuenta.saldoPendiente - fila.deposito > 0)
    .map((fila) => ({
      fila,
      factura: fila.factura,
      cuenta: { ...fila.cuenta, saldoPendiente: fila.cuenta.saldoPendiente - fila.deposito },
    }));
  // Si el depósito ya las saldó todas y el cliente trae plata igual, esa plata
  // queda a favor en la última elegida.
  const destinosDeLaPlata =
    conSaldoTrasDeposito.length > 0
      ? conSaldoTrasDeposito
      : filas.slice(-1).map((fila) => ({ fila, factura: fila.factura, cuenta: fila.cuenta }));
  repartirEntreFacturas(destinosDeLaPlata, montoNuevo).forEach(({ aplicado }, indice) => {
    destinosDeLaPlata[indice].fila.plata = aplicado;
  });

  const pagadoConDeposito = filas.reduce((total, fila) => total + fila.deposito, 0);
  const faltaPorPagar = Math.max(0, debeLoElegido - pagadoConDeposito);
  const quedaDespues = debeLoElegido - pagadoConDeposito - montoNuevo;
  const hayAlgoQueRegistrar = pagadoConDeposito > 0 || montoNuevo > 0;

  // ── EL RECORDATORIO DE LOS EQUIPOS ────────────────────────────────
  //
  // Las facturas que reciben plata de ESTE abono y todavía tienen equipos
  // vencidos en la obra. Es un aviso y nada más: no pregunta, no bloquea. Está
  // para que la plata no tape lo otro —una factura puede quedar pagada con el
  // equipo afuera y sin fecha de retorno, que fue lo que pasó con la 5698—.
  // Se sacó un formulario el 2026-09-15 porque trababa el cobro. SOLO DESDE
  // CARTERA: en la ficha del cliente se registra lo que pasó con la plata.
  const hoy = obtenerFechaHoyBogota();
  const facturasConEquiposVencidos = !avisarEquiposVencidos
    ? []
    : filas
        .filter((fila) => fila.deposito + fila.plata > 0)
        .map(({ factura }) => ({
          numero: datosFactura(factura).numeroFactura ?? "s/n",
          cuantos: equiposDe(factura).filter(
            ({ equipo }) => sigueAfuera(equipo) && equipoVencido(equipo, hoy),
          ).length,
        }))
        .filter(({ cuantos }) => cuantos > 0);
  const equiposVencidos = facturasConEquiposVencidos.reduce(
    (total, { cuantos }) => total + cuantos,
    0,
  );
  const tituloAviso =
    equiposVencidos === 0
      ? ""
      : `${equiposVencidos} equipo${equiposVencidos === 1 ? "" : "s"} vencido${
          equiposVencidos === 1 ? "" : "s"
        } pendiente${equiposVencidos === 1 ? "" : "s"} de gestión${
          facturasConEquiposVencidos.length > 1
            ? ` (facturas ${facturasConEquiposVencidos.map(({ numero }) => numero).join(", ")})`
            : ""
        }`;

  const alternarElegida = (facturaId) =>
    setElegidas((previas) =>
      previas.includes(facturaId)
        ? previas.filter((id) => id !== facturaId)
        : [...previas, facturaId],
    );

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
    if (montoNuevo > 0 && !form.medio) errores.medio = "Elegí el medio de pago.";
    if (!hayAlgoQueRegistrar) errores.monto = "El valor debe ser mayor a 0.";
    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    const aplicaciones = filas.filter((fila) => fila.deposito + fila.plata > 0);
    if (aplicaciones.length === 0) return;

    setGuardando(true);
    try {
      // El día de HOY, no la fecha que se le puso al abono: los días vencidos
      // se cuentan contra el calendario real.
      const hoyAlGuardar = obtenerFechaHoyBogota();
      const tipo = loEligioElCliente ? "cliente" : "sistema";
      const batch = writeBatch(db);
      aplicaciones.forEach(({ factura, deposito, plata }) => {
        const abonos = [
          ...abonosDe(factura),
          // El del depósito primero: es lo que se usó primero.
          ...(deposito > 0
            ? [{ fecha: form.fecha, medio: MEDIO_DEPOSITO, monto: deposito, tipo }]
            : []),
          ...(plata > 0 ? [{ fecha: form.fecha, medio: form.medio, monto: plata, tipo }] : []),
        ];
        // Si con este abono la factura queda sin nada que reclamarle HOY, los
        // días que sus equipos llevan vencidos quedan cobrados: se sellan para
        // que el contador arranque de cero (ver sellarDiasVencidos). Se mira lo
        // EXIGIBLE y no el saldo: los días ya pactados por delante se cobran al
        // devolver.
        const conAbono = { ...factura, abonos };
        const grupos =
          calcularExigible(conAbono, hoyAlGuardar) === 0
            ? sellarFacturaPagada(conAbono, hoyAlGuardar)
            : null;

        batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
          abonos,
          ...(grupos ? { grupos } : {}),
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

  // Una de las dos opciones grandes del paso 1.
  const opcion = (valor, Icono, titulo, texto) => (
    <ButtonBase
      aria-pressed={que === valor}
      onClick={() => {
        setQue(valor);
        setErrors({});
      }}
      sx={{
        flex: 1,
        display: "grid",
        justifyItems: "start",
        gap: 0.25,
        textAlign: "left",
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: que === valor ? acento : "divider",
        bgcolor: que === valor ? alpha(acento, 0.08) : "transparent",
      }}
    >
      <Icono fontSize="small" sx={{ color: acento }} />
      <Typography variant="body2" fontWeight="bold">
        {titulo}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {texto}
      </Typography>
    </ButtonBase>
  );

  const rotuloPaso = (numero, texto) => (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "flex", alignItems: "center", gap: 1, lineHeight: 1.6, mb: 1 }}
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

  const renglon = (clase, rotulo, valor, sx) => (
    <Box className={clase} sx={sx}>
      <Typography variant="body2">{rotulo}</Typography>
      <Typography variant="body2">{valor}</Typography>
    </Box>
  );

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
          {facturasConSaldo.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Debe {formatearMoneda(deudaActual)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {facturasConSaldo.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Este cliente no tiene facturas con saldo pendiente.
            </Typography>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              {/* ── 1. ¿Qué va a pagar? ── */}
              <Box>
                {rotuloPaso(1, "¿Qué va a pagar?")}
                <Stack direction="row" gap={1.25}>
                  {opcion(
                    "todo",
                    AccountBalanceWalletIcon,
                    "Toda la deuda",
                    "Se reparte de la más antigua a la más nueva",
                  )}
                  {opcion("facturas", ChecklistIcon, "Facturas específicas", "El cliente dice a cuáles va")}
                </Stack>

                {loEligioElCliente && (
                  <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                    {facturasConSaldo.map((item) => {
                      const { factura, cuenta } = item;
                      const numero = datosFactura(factura).numeroFactura ?? "s/n";
                      const libre = topeDeposito(item);
                      return (
                        <FormControlLabel
                          key={factura.id}
                          sx={{
                            m: 0,
                            px: 1,
                            py: 0.5,
                            border: "1px solid",
                            borderColor: elegidas.includes(factura.id) ? acento : "divider",
                            borderRadius: 1.5,
                            "& .MuiFormControlLabel-label": { flex: 1 },
                          }}
                          control={
                            <Checkbox
                              size="small"
                              checked={elegidas.includes(factura.id)}
                              onChange={() => alternarElegida(factura.id)}
                              inputProps={{ "aria-label": `Abonar a la factura ${numero}` }}
                            />
                          }
                          label={
                            <Stack direction="row" justifyContent="space-between" gap={1}>
                              <Box>
                                <Typography variant="body2" fontWeight="bold" sx={{ color: acento }}>
                                  Factura {numero}
                                </Typography>
                                {libre > 0 && (
                                  <Typography variant="caption" sx={{ color: colorDeposito }}>
                                    Depósito libre {formatearMoneda(libre)}
                                  </Typography>
                                )}
                                {cuenta.deposito.porCobrar > 0 && (
                                  <Typography variant="caption" sx={{ display: "block", color: colorDeposito }}>
                                    {`Incluye ${formatearMoneda(cuenta.deposito.porCobrar)} de depósito por cobrar`}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="body2">{formatearMoneda(cuenta.saldoPendiente)}</Typography>
                            </Stack>
                          }
                        />
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* ── 2. ¿Cómo paga? ── */}
              {pasoUnoListo && (
                <Box>
                  {rotuloPaso(2, "¿Cómo paga?")}

                  {depositoDisponible > 0 && (
                    <FormControlLabel
                      sx={{
                        m: 0,
                        mb: 1.5,
                        px: 1,
                        width: "100%",
                        border: "1px solid",
                        borderColor: alpha(theme.palette.custom.seccionDeposito, 0.5),
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.custom.seccionDeposito, 0.07),
                        color: colorDeposito,
                      }}
                      control={
                        <Checkbox
                          size="small"
                          checked={usarDeposito}
                          onChange={(e) => {
                            setUsarDeposito(e.target.checked);
                            setErrors({});
                          }}
                          sx={{ color: colorDeposito, "&.Mui-checked": { color: colorDeposito } }}
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" gap={0.75}>
                          <IconoDeposito fontSize="small" />
                          <Typography variant="body2">
                            Usar primero el depósito libre ({formatearMoneda(depositoDisponible)})
                          </Typography>
                        </Stack>
                      }
                    />
                  )}

                  <Grid container spacing={1.5}>
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
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Valor del abono"
                        value={formatearMonedaInput(form.monto)}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, monto: limpiarMonedaInput(e.target.value) }))
                        }
                        error={!!errors.monto}
                        helperText={errors.monto}
                        fullWidth
                      />
                    </Grid>
                  </Grid>

                  {/* Cuánto falta, y el atajo para llenarlo. */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Falta por pagar: <b>{formatearMoneda(faltaPorPagar)}</b>
                    </Typography>
                    {faltaPorPagar > 0 && montoNuevo !== faltaPorPagar && (
                      <Button
                        size="small"
                        onClick={() => setForm((prev) => ({ ...prev, monto: String(faltaPorPagar) }))}
                        sx={{ p: 0, minWidth: 0 }}
                      >
                        Pagar lo que falta
                      </Button>
                    )}
                  </Stack>

                  <TextField
                    label="Fecha del abono"
                    type="date"
                    value={form.fecha}
                    onChange={handleChange("fecha")}
                    error={!!errors.fecha}
                    helperText={errors.fecha}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ mt: 1.5 }}
                  />
                </Box>
              )}

              {/* ── 3. Así queda ── */}
              {pasoUnoListo && (
                <Box>
                  {rotuloPaso(3, "Así queda")}
                  <Paper variant="totales">
                    {renglon(
                      "fila",
                      loEligioElCliente ? "Deben las facturas elegidas" : "Deuda actual",
                      formatearMoneda(debeLoElegido),
                    )}
                    {pagadoConDeposito > 0 &&
                      renglon("fila deposito", "Con el depósito", `−${formatearMoneda(pagadoConDeposito)}`)}
                    {montoNuevo > 0 &&
                      renglon("fila abono", `Con ${form.medio || "…"}`, `−${formatearMoneda(montoNuevo)}`)}
                    <Divider sx={{ my: 0.75 }} />
                    <Box className={quedaDespues > 0 ? "fila alerta" : "fila ok"} sx={{ mb: 0 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {quedaDespues < 0
                          ? "Queda a favor"
                          : quedaDespues > 0
                            ? "Deuda después del abono"
                            : "Queda al día"}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatearMoneda(Math.abs(quedaDespues))}
                      </Typography>
                    </Box>

                    {/* El reparto por factura, plegado: se mira si hace falta. */}
                    {hayAlgoQueRegistrar && (
                      <Button
                        size="small"
                        onClick={() => setVerReparto((antes) => !antes)}
                        startIcon={verReparto ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{ mt: 1, p: 0, color: "inherit", opacity: 0.8 }}
                      >
                        {verReparto ? "Ocultar el reparto" : "Ver cómo se reparte"}
                      </Button>
                    )}
                    {hayAlgoQueRegistrar &&
                      verReparto &&
                      filas.map(({ factura, cuenta, deposito, plata }) => {
                        const queda = cuenta.saldoPendiente - deposito - plata;
                        return (
                          <Box key={factura.id} sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                              Factura {datosFactura(factura).numeroFactura ?? "s/n"} · debe{" "}
                              {formatearMoneda(cuenta.saldoPendiente)}
                            </Typography>
                            {deposito > 0 &&
                              renglon("fila deposito", "+ Se abona depósito", formatearMoneda(deposito))}
                            {plata > 0 && renglon("fila abono", "+ Se abona", formatearMoneda(plata))}
                            {deposito + plata === 0 && (
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                No recibe nada
                              </Typography>
                            )}
                            {deposito + plata > 0 && (
                              <Box className={queda > 0 ? "fila alerta" : "fila ok"} sx={{ mb: 0 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {queda < 0 ? "Saldo a favor" : queda > 0 ? "Queda debiendo" : "Queda saldada"}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {queda === 0 ? "" : formatearMoneda(Math.abs(queda))}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                  </Paper>
                </Box>
              )}

              {/* EL RECORDATORIO DE LOS EQUIPOS, al final: recién con el
                  reparto se sabe a qué facturas va la plata. */}
              {tituloAviso && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderColor: "warning.main",
                    bgcolor: (t) => t.palette.warning.main + "14",
                  }}
                >
                  <Stack direction="row" gap={1} alignItems="flex-start">
                    <WarningAmberIcon fontSize="small" color="warning" />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {tituloAviso}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Confirma con el cliente la renovación o la fecha de devolución. Si ya lo
                        gestionaste, puedes omitir este aviso.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Apagado hasta que haya algo que registrar. El aviso de los equipos
              no traba nada: es un recordatorio, no un permiso. */}
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando || !pasoUnoListo}
          >
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
  // Recordar los equipos que siguen vencidos en la obra. Lo enciende cartera:
  // en la ficha del cliente solo se registran abonos.
  avisarEquiposVencidos: PropTypes.bool,
};
