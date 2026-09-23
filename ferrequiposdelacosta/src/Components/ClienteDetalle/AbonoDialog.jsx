import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
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
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
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
// alcanzar para varias facturas a la vez: el usuario ingresa un solo valor
// —una sola fecha, un solo medio— y acá se decide a cuáles va.
//
// ── QUIÉN DECIDE A QUÉ FACTURA VA ─────────────────────────────────────
//
// Por defecto lo decide la app: reparte entre TODAS las que tengan saldo,
// empezando por la MÁS ANTIGUA, y si sobra sigue con la siguiente. Si el abono
// alcanza para saldarlas todas, lo que sobre queda como saldo a favor en la
// última que se tocó.
//
// La más antigua primero, y no la que más debe, porque es la que está más
// cerca de volverse incobrable y la que dispara la cobranza —y porque es como
// se imputa un pago cuando el deudor no elige—.
//
// Pero el cliente puede pedir otra cosa —"esto es para la 1234"—, y entonces
// manda él: se marcan las facturas que dijo y el abono se reparte solo entre
// esas, con el mismo criterio de la más antigua primero.
//
// La diferencia queda escrita en el abono: `tipo: "sistema"` cuando repartió la
// app, `tipo: "cliente"` cuando lo pidió él. No cambia ninguna cuenta —para el
// saldo los dos son un abono igual— pero deja explicar después por qué esa
// plata terminó ahí, que es justo lo que no se podía cuando el reparto era la
// única forma.
//
// ── PAGAR CON EL DEPÓSITO ──────────────────────────────────────────────
//
// Cuando los equipos ya volvieron, el depósito que queda libre es plata del
// cliente, y puede pedir que se use para pagar en vez de que se lo devuelvan.
// Eso se registra acá, con el medio "Depósito". No es plata nueva: cada
// factura solo puede usar SU depósito —hasta lo que tiene libre y hasta lo
// que debe—, así que ese abono no se reparte entre facturas ni deja sobrante.
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
  const [form, setForm] = useState(ESTADO_INICIAL);
  // Las facturas que el cliente eligió. Vacío = la app reparte.
  const [elegidas, setElegidas] = useState([]);
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
    // Cada abono arranca sin nada elegido, o sea en automático: es lo que pasa
    // casi siempre, y dejar marcada la elección del abono anterior mandaría
    // este a una factura que nadie nombró.
    setElegidas([]);
    setErrors({});
  }, [open]);

  // Solo entran las facturas que todavía deben algo: son las únicas que
  // pueden recibir parte de este abono. El total ya trae los días ampliados
  // sumados, igual que en la tarjeta de cada factura, para que la cifra que
  // se ve acá sea la misma que se ve afuera. Van de la más antigua a la más
  // nueva, que es el orden en que las va saldando.
  const facturasConSaldo = ordenarFacturasConSaldo(facturas);

  const montoNuevo = Number(form.monto) || 0;

  // Las facturas que pueden pagarse con su depósito, y hasta cuánto cada una:
  // lo que tiene libre, sin pasarse de lo que debe.
  const conDepositoLibre = facturasConSaldo
    .map((item) => ({
      ...item,
      tope: Math.min(item.cuenta.deposito.porDevolver, item.cuenta.saldoPendiente),
    }))
    .filter(({ tope }) => tope > 0);
  const conDeposito = form.medio === MEDIO_DEPOSITO;
  const depositoDisponible = conDepositoLibre
    .filter(({ factura }) => elegidas.length === 0 || elegidas.includes(factura.id))
    .reduce((total, { tope }) => total + tope, 0);

  // Lo que el cliente debe HOY, sumando sus facturas con saldo. Sale de las
  // mismas cuentas que la lista de abajo: si se calculara aparte, el total y
  // el detalle podrían discrepar.
  const deudaActual = facturasConSaldo.reduce(
    (total, { cuenta }) => total + cuenta.saldoPendiente,
    0,
  );

  // Adónde va este abono: a las que el cliente eligió, o a todas si no eligió
  // ninguna. El orden lo puso `ordenarFacturasConSaldo` y se respeta: la más
  // antigua primero, también dentro de las elegidas.
  const loEligioElCliente = elegidas.length > 0;
  const destinos = loEligioElCliente
    ? facturasConSaldo.filter(({ factura }) => elegidas.includes(factura.id))
    : facturasConSaldo;

  // La simulación del reparto: a cada factura destino, de la más antigua a la
  // más nueva, se le asigna lo que le falta hasta saldarla. La última que
  // llega a recibir algo se lleva TODO lo que quede del abono, así que si
  // sobra después de saldarlas, ese sobrante queda ahí como saldo a favor en
  // vez de perderse.
  //
  // Con el depósito no hay reparto: cada factura usa el suyo, hasta su tope.
  const reparto = conDeposito
    ? (() => {
        let restante = montoNuevo;
        return conDepositoLibre
          .filter(({ factura }) => destinos.some((d) => d.factura.id === factura.id))
          .map(({ factura, cuenta, tope }) => {
            const aplicado = Math.min(restante, tope);
            restante -= aplicado;
            return { factura, cuenta, aplicado };
          });
      })()
    : repartirEntreFacturas(destinos, montoNuevo);

  // Para dibujar: la lista de abajo muestra TODAS las facturas con saldo —hay
  // que poder elegir entre ellas— pero solo las destino reciben algo.
  const aplicadoEn = new Map(
    reparto.map(({ factura, aplicado }) => [factura.id, aplicado]),
  );

  // ── EL RECORDATORIO DE LOS EQUIPOS ────────────────────────────────
  //
  // Las facturas que reciben plata de ESTE abono y todavía tienen equipos
  // vencidos en la obra. Es un aviso y nada más: no pregunta, no bloquea. Está
  // para que la plata no tape lo otro —una factura puede quedar pagada con el
  // equipo afuera y sin fecha de retorno, que fue lo que pasó con la 5698— y
  // el plazo se pacta con el botón de renovación, que es donde vive.
  //
  // Acá vivía un formulario: por cada equipo, días o entrega indefinida, con
  // el botón de guardar apagado hasta contestar. Se sacó el 2026-09-15 porque
  // trababa el cobro; el modelo de tramos ya deja escritos los días vencidos
  // aunque nadie pacte nada, así que lo único que se perdía era el
  // recordatorio. (El formulario completo está en el commit que anota el
  // README, por si alguna vez se quiere volver.)
  //
  // SOLO DESDE CARTERA: en la ficha del cliente se registra lo que pasó con la
  // plata y nada más.
  const hoy = obtenerFechaHoyBogota();
  const facturasConEquiposVencidos = !avisarEquiposVencidos
    ? []
    : reparto
        .filter(({ aplicado }) => aplicado > 0)
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

  // El título del aviso: cuántos equipos quedaron sin definir. El número de
  // factura solo aparece cuando hay más de una recibiendo plata —con una sola
  // es la que se está mirando y nombrarla sobra—.
  const tituloAviso =
    equiposVencidos === 0
      ? ""
      : `${equiposVencidos} equipo${equiposVencidos === 1 ? "" : "s"} vencido${
          equiposVencidos === 1 ? "" : "s"
        } pendiente${equiposVencidos === 1 ? "" : "s"} de gestión${
          facturasConEquiposVencidos.length > 1
            ? ` (facturas ${facturasConEquiposVencidos
                .map(({ numero }) => numero)
                .join(", ")})`
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

  // Elegir el depósito trae el monto ya puesto —todo lo disponible—, que es
  // lo que se hace casi siempre.
  const handleMedio = (e) => {
    const medio = e.target.value;
    setForm((prev) => ({
      ...prev,
      medio,
      ...(medio === MEDIO_DEPOSITO ? { monto: String(depositoDisponible) } : {}),
    }));
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
    if (conDeposito && montoNuevo > depositoDisponible) {
      errores.monto = `Del depósito hay disponibles ${formatearMoneda(depositoDisponible)}.`;
    }
    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    const aplicaciones = reparto.filter((item) => item.aplicado > 0);
    if (aplicaciones.length === 0) return;

    setGuardando(true);
    try {
      // El día de HOY, no la fecha que el usuario le puso al abono: los días
      // vencidos se cuentan contra el calendario real, y un abono cargado con
      // fecha de ayer no cierra los días que corrieron desde entonces.
      const hoy = obtenerFechaHoyBogota();
      const batch = writeBatch(db);
      aplicaciones.forEach(({ factura, aplicado }) => {
        const abonos = [
          ...abonosDe(factura),
          {
            fecha: form.fecha,
            medio: form.medio,
            monto: aplicado,
            // De dónde salió la decisión de que fuera a ESTA factura: el
            // cliente lo pidió, o lo repartió la app entre las que tenían
            // saldo.
            tipo: loEligioElCliente ? "cliente" : "sistema",
          },
        ];
        // Si con este abono la factura queda sin nada que reclamarle HOY, los
        // días que sus equipos llevan vencidos quedan cobrados: se sellan para
        // que el contador arranque de cero desde acá y no se le vuelvan a
        // pedir mañana sumados a los nuevos (ver sellarDiasVencidos).
        //
        // Se mira lo EXIGIBLE y no el saldo porque un equipo que sigue afuera
        // tiene días por delante ya pactados: esos se cobran cuando devuelva,
        // y esperarlos dejaría el sellado para nunca.
        //
        // El equipo no cambia de plazo por esto: sigue con la fecha que tenía
        // y, si ya estaba pasado, mañana le abre un tramo nuevo. Lo único que
        // se cierra es lo que el cliente acaba de pagar.
        const conAbono = { ...factura, abonos };
        const grupos =
          calcularExigible(conAbono, hoy) === 0
            ? sellarFacturaPagada(conAbono, hoy)
            : null;

        // Los abonos y, si hubo, los equipos con su tramo cerrado: el saldo no
        // se guarda, se calcula al mostrarlo (ver FacturaFormDialog). Guardarlo
        // acá era justo donde más daño hacía: el recálculo daba cero en cuanto
        // el alta estaba paga, y el abono que se acababa de registrar se
        // perdía sin dejar rastro.
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
                  onChange={handleMedio}
                >
                  {MODOS_PAGO.map((medio) => (
                    <MenuItem key={medio} value={medio}>
                      {medio}
                    </MenuItem>
                  ))}
                  {/* Solo si alguna factura tiene depósito libre y algo que
                      pagar con él. */}
                  {conDepositoLibre.length > 0 && (
                    <MenuItem value={MEDIO_DEPOSITO}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        gap={0.75}
                        sx={{ color: "custom.seccionDeposito" }}
                      >
                        <IconoDeposito fontSize="small" />
                        {MEDIO_DEPOSITO}
                      </Stack>
                    </MenuItem>
                  )}
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
                helperText={
                  errors.monto ||
                  (conDeposito
                    ? `Disponible del depósito: ${formatearMoneda(depositoDisponible)}`
                    : undefined)
                }
                fullWidth
                autoFocus
              />
            </Grid>

            {/* LA DEUDA DEL CLIENTE, que es como se piensa un abono: no se
                paga una factura, se baja lo que se debe. El reparto entre
                facturas viene abajo y lo hace la app; acá arriba va la cuenta
                que el cliente tiene en la cabeza cuando entrega la plata. */}
            {facturasConSaldo.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="totales">
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Deuda actual</Typography>
                    <Typography variant="body2">
                      {formatearMoneda(deudaActual)}
                    </Typography>
                  </Stack>
                  {montoNuevo > 0 && (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Abono</Typography>
                        <Typography variant="body2">
                          −{formatearMoneda(montoNuevo)}
                        </Typography>
                      </Stack>
                      <Divider sx={{ my: 0.75 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {/* No dice "Queda debiendo" a secas: cada factura
                              de la lista de abajo usa ese mismo rótulo para
                              LO SUYO, y dos veces la misma frase con dos
                              significados se lee como si tuvieran que
                              coincidir. */}
                          {deudaActual > montoNuevo
                            ? "Deuda después del abono"
                            : "Saldo a favor"}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {formatearMoneda(Math.abs(deudaActual - montoNuevo))}
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Paper>
              </Grid>
            )}

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

              {/* Quién está decidiendo ahora mismo. Sin esto, una lista con
                  casillas sin marcar se lee como "no va a ninguna". */}
              {facturasConSaldo.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
                >
                  {loEligioElCliente ? (
                    `Va solo a ${
                      elegidas.length === 1
                        ? "la factura marcada"
                        : `las ${elegidas.length} facturas marcadas`
                    }`
                  ) : (
                    <>
                      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                      Se reparte solo, de la más antigua a la más nueva. Marcá
                      una factura si el cliente pidió que fuera a esa.
                    </>
                  )}
                </Typography>
              )}

              {facturasConSaldo.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Este cliente no tiene facturas con saldo pendiente.
                </Typography>
              ) : (
                <Paper variant="totales">
                  {facturasConSaldo.map(({ factura, cuenta }) => {
                    const aplicado = aplicadoEn.get(factura.id) ?? 0;
                    const quedaSaldo = Math.max(0, cuenta.saldoPendiente - aplicado);
                    const quedaAFavor = Math.max(0, aplicado - cuenta.saldoPendiente);
                    const elegida = elegidas.includes(factura.id);

                    // El depósito, en una línea y solo cuando cambia cómo se
                    // lee el saldo: con equipos afuera, parte del saldo es
                    // garantía por cobrar; ya devueltos, hay depósito libre
                    // que puede pagarlo.
                    const { porCobrar, porDevolver } = cuenta.deposito;

                    return (
                      <Box key={factura.id}>
                        <Box className="fila total">
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            {/* La casilla va pegada al número de la factura,
                                que es lo que el cliente nombra por teléfono. */}
                            <Checkbox
                              size="small"
                              checked={elegida}
                              onChange={() => alternarElegida(factura.id)}
                              inputProps={{
                                "aria-label": `Abonar a la factura ${
                                  datosFactura(factura).numeroFactura ?? "s/n"
                                }`,
                              }}
                              sx={{ p: 0.25, color: "inherit" }}
                            />
                            <Typography variant="body2">
                              Factura {datosFactura(factura).numeroFactura ?? "s/n"}
                            </Typography>
                          </Stack>
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

                        {/* Cuelga del saldo —sangrado y en letra chica—
                            porque lo explica, no se le suma. */}
                        {(porCobrar > 0 || porDevolver > 0) && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              pl: 1.5,
                              mt: -0.5,
                              mb: 1,
                              color: "custom.depositoText",
                            }}
                          >
                            {porCobrar > 0
                              ? `Incluye ${formatearMoneda(porCobrar)} de depósito por cobrar`
                              : `Tiene ${formatearMoneda(porDevolver)} de depósito libre para pagar`}
                          </Typography>
                        )}

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

            {/* EL RECORDATORIO DE LOS EQUIPOS. Va al final y no arriba a
                propósito: recién cuando hay un valor escrito se sabe a qué
                facturas va la plata, que es lo que decide por cuáles avisar. */}
            {tituloAviso && (
              <Grid item xs={12}>
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
                      {/* La salida está a la vista: el aviso se puede omitir.
                          Sin esa línea, un recuadro amarillo que no se puede
                          quitar se lee como un error que hay que resolver. */}
                      <Typography variant="body2" color="text.secondary">
                        Confirma con el cliente la renovación o la fecha de
                        devolución. Si ya lo gestionaste, puedes omitir este
                        aviso.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Nada traba el cobro: el aviso de los equipos es un recordatorio,
              no un permiso. */}
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando}
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
