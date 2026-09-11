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
import Radio from "@mui/material/Radio";
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
  aplicarAcuerdoDeEquipos,
  obtenerGestiones,
  equiposDe,
  sigueAfuera,
  equipoVencido,
  proyectarAmpliacion,
  formatearFechaLegible,
} from "./facturaUtils";
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
export default function AbonoDialog({
  open,
  onClose,
  cliente,
  facturas,
  onAbonado,
  onRegistrarDevolucion,
}) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const [form, setForm] = useState(ESTADO_INICIAL);
  // Las facturas que el cliente eligió. Vacío = la app reparte.
  const [elegidas, setElegidas] = useState([]);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  // Qué se acordó por los equipos vencidos de cada factura que recibe plata.
  // Una entrada por factura: { tipo: "dias" | "indefinida", dias }.
  const [acuerdos, setAcuerdos] = useState({});
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
    // El acuerdo es de ESTA conversación con el cliente. Arrastrar el del
    // abono anterior le pondría plazo a un equipo que nadie nombró.
    setAcuerdos({});
  }, [open]);

  // Solo entran las facturas que todavía deben algo: son las únicas que
  // pueden recibir parte de este abono. El total ya trae los días ampliados
  // sumados, igual que en la tarjeta de cada factura, para que la cifra que
  // se ve acá sea la misma que se ve afuera. Van de la más antigua a la más
  // nueva, que es el orden en que las va saldando.
  const facturasConSaldo = ordenarFacturasConSaldo(facturas);

  const montoNuevo = Number(form.monto) || 0;

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

  // La simulación del reparto: a cada factura destino, en el orden de más a
  // menos saldo, se le asigna lo que le falta hasta saldarla. La última que
  // llega a recibir algo se lleva TODO lo que quede del abono, así que si
  // sobra después de saldarlas, ese sobrante queda ahí como saldo a favor en
  // vez de perderse.
  const reparto = repartirEntreFacturas(destinos, montoNuevo);

  // Para dibujar: la lista de abajo muestra TODAS las facturas con saldo —hay
  // que poder elegir entre ellas— pero solo las destino reciben algo.
  const aplicadoEn = new Map(
    reparto.map(({ factura, aplicado }) => [factura.id, aplicado]),
  );

  // ── EL ACUERDO POR EL EQUIPO ──────────────────────────────────────
  //
  // Las facturas que van a recibir plata y todavía tienen equipos vencidos
  // afuera. Son las únicas que preguntan: cobrar sin definir qué pasa con el
  // equipo es como una factura termina pagada con el equipo en la obra y sin
  // fecha de retorno.
  //
  // Solo las que reciben algo de ESTE abono: si el cliente paga una factura,
  // no hay por qué preguntarle por los equipos de otra.
  const hoy = obtenerFechaHoyBogota();
  const conEquiposVencidos = reparto
    .filter(({ aplicado }) => aplicado > 0)
    .map(({ factura }) => ({
      factura,
      equipos: equiposDe(factura)
        .filter(({ equipo }) => sigueAfuera(equipo) && equipoVencido(equipo, hoy))
        .map(({ equipo }) => equipo),
    }))
    .filter(({ equipos }) => equipos.length > 0);

  const acuerdoDe = (facturaId) => acuerdos[facturaId] ?? { tipo: "", dias: "" };

  const acuerdoResuelto = (facturaId) => {
    const acuerdo = acuerdoDe(facturaId);
    if (acuerdo.tipo === "indefinida") return true;
    return acuerdo.tipo === "dias" && Number(acuerdo.dias) > 0;
  };

  const faltanAcuerdos = conEquiposVencidos.some(
    ({ factura }) => !acuerdoResuelto(factura.id),
  );

  const elegirAcuerdo = (facturaId, tipo) =>
    setAcuerdos((previos) => ({
      ...previos,
      [facturaId]: { ...acuerdoDe(facturaId), tipo, ...(tipo === "indefinida" ? { dias: "" } : {}) },
    }));

  const escribirDias = (facturaId, dias) =>
    setAcuerdos((previos) => ({
      ...previos,
      [facturaId]: { tipo: "dias", dias: dias.replace(/\D/g, "") },
    }));

  // La devolución no se resuelve acá: define el estado del equipo y el
  // depósito, y eso cambia cuánto hay que cobrar. Se cierra este diálogo, se
  // abre el de devolución y al terminar se vuelve a abrir el abono en blanco,
  // con la deuda ya recalculada —el depósito que vuelve se canjea contra lo
  // que el cliente debía—.
  const irADevolucion = (factura) => {
    onRegistrarDevolucion?.(factura);
    onClose();
  };

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
        // LO QUE SE ACORDÓ POR EL EQUIPO, primero: darle días o dejarlo
        // indefinido cambia lo que se le puede reclamar, así que tiene que
        // estar aplicado antes de decidir si hay algo que sellar.
        const acuerdo = acuerdoDe(factura.id);
        const plazo = acuerdoResuelto(factura.id)
          ? aplicarAcuerdoDeEquipos(
              factura,
              {
                dias: acuerdo.tipo === "dias" ? acuerdo.dias : 0,
                indefinida: acuerdo.tipo === "indefinida",
              },
              hoy,
            )
          : null;

        // Si con este abono la factura queda sin nada que reclamarle HOY, los
        // días que sus equipos llevan vencidos quedan cobrados: se sellan para
        // que el contador arranque de cero desde acá y no se le vuelvan a
        // pedir mañana sumados a los nuevos (ver sellarDiasVencidos).
        //
        // Se mira lo EXIGIBLE y no el saldo porque un equipo que sigue afuera
        // tiene días por delante ya pactados: esos se cobran cuando devuelva,
        // y esperarlos dejaría el sellado para nunca.
        //
        // En la práctica esto solo actúa cuando el equipo quedó con ENTREGA
        // INDEFINIDA: darle días consolida los vencidos y devolverlo los
        // congela, así que en esos dos casos no queda nada abierto que sellar.
        const conAbono = {
          ...factura,
          abonos,
          ...(plazo ? { grupos: plazo.grupos } : {}),
        };
        const sellados =
          calcularExigible(conAbono, hoy) === 0
            ? sellarFacturaPagada(conAbono, hoy)
            : null;

        const grupos = sellados ?? plazo?.grupos ?? null;
        // El acuerdo queda en la bitácora como lo que es, una renovación: sin
        // eso, la factura se quedaría mostrando el "sin respuesta" de la
        // última llamada aunque el cliente haya contestado, pagado y pactado.
        const gestiones = plazo
          ? [...obtenerGestiones(factura), plazo.gestion]
          : null;

        // Los abonos y, si hubo, los equipos y la gestión: el saldo no se
        // guarda, se calcula al mostrarlo (ver FacturaFormDialog). Guardarlo
        // acá era justo donde más daño hacía: el recálculo daba cero en cuanto
        // el alta estaba paga, y el abono que se acababa de registrar se
        // perdía sin dejar rastro.
        batch.update(doc(db, "clientes", cliente.id, "facturas", factura.id), {
          abonos,
          ...(grupos ? { grupos } : {}),
          ...(gestiones ? { gestiones } : {}),
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

            {/* EL ACUERDO POR EL EQUIPO. Va al final y no arriba a propósito:
                es el último paso antes de guardar, y para entonces ya se sabe
                a qué facturas va la plata —que es lo que decide por cuáles
                hay que preguntar—. */}
            {conEquiposVencidos.map(({ factura, equipos }) => {
              const acuerdo = acuerdoDe(factura.id);
              const numero = datosFactura(factura).numeroFactura ?? "s/n";
              const nombres = equipos.map((equipo) => equipo.nombre).join(", ");
              const dias = Number(acuerdo.dias) || 0;
              // Hasta cuándo quedaría el que más atrasado está: es la fecha
              // que el cliente escucha por teléfono.
              const proyeccion =
                acuerdo.tipo === "dias" && dias > 0
                  ? proyectarAmpliacion(equipos[0], dias, hoy).fechaNueva
                  : null;

              return (
                <Grid item xs={12} key={`acuerdo-${factura.id}`}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: "warning.main",
                      bgcolor: (t) => t.palette.warning.main + "14",
                    }}
                  >
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                      <WarningAmberIcon fontSize="small" color="warning" />
                      {/* El nombre en su renglón y el aviso abajo, dicho como
                          se lo diría un compañero: el equipo está donde el
                          cliente y la fecha ya pasó. */}
                      <Typography variant="body2">
                        <strong>{nombres}</strong>
                        {conEquiposVencidos.length > 1 && ` (factura ${numero})`}
                        <Box component="span" sx={{ display: "block" }}>
                          {equipos.length === 1 ? "Sigue" : "Siguen"} con el
                          cliente y el plazo ya terminó.
                        </Box>
                      </Typography>
                    </Stack>

                    <Stack gap={0.5}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Radio
                          size="small"
                          checked={acuerdo.tipo === "dias"}
                          onChange={() => elegirAcuerdo(factura.id, "dias")}
                          inputProps={{
                            "aria-label": `Le dieron más días, factura ${numero}`,
                          }}
                          sx={{ p: 0.25 }}
                        />
                        <Typography variant="body2">Le dieron más días →</Typography>
                        <TextField
                          size="small"
                          value={acuerdo.dias}
                          onChange={(e) => escribirDias(factura.id, e.target.value)}
                          onFocus={() => elegirAcuerdo(factura.id, "dias")}
                          name={`dias-acuerdo-${factura.id}`}
                          id={`dias-acuerdo-${factura.id}`}
                          inputProps={{
                            inputMode: "numeric",
                            "aria-label": `Días de plazo, factura ${numero}`,
                          }}
                          sx={{ width: 64, "& input": { textAlign: "center", py: 0.5 } }}
                        />
                        <Typography variant="body2">
                          días
                          {/* La fecha en que quedaría, que es la que el
                              cliente escucha por teléfono. Entre paréntesis y
                              no con otra flecha: la del renglón ya separa lo
                              que se elige de lo que se escribe. */}
                          {proyeccion && (
                            <Box
                              component="span"
                              sx={{ color: "text.secondary", ml: 0.5 }}
                            >
                              (vence el {formatearFechaLegible(proyeccion)})
                            </Box>
                          )}
                        </Typography>
                      </Stack>

                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Radio
                          size="small"
                          checked={acuerdo.tipo === "indefinida"}
                          onChange={() => elegirAcuerdo(factura.id, "indefinida")}
                          inputProps={{
                            "aria-label": `Quedó sin fecha de entrega, factura ${numero}`,
                          }}
                          sx={{ p: 0.25 }}
                        />
                        <Typography variant="body2">
                          Quedó sin fecha de entrega → El cliente avisará
                        </Typography>
                      </Stack>

                      {/* La devolución va aparte de las dos opciones: no es
                          algo que se elija acá, es otro diálogo que se abre y
                          define depósito y retención. */}
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.5, color: "text.secondary" }}
                      >
                        Devolución:
                      </Typography>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ pl: 0.5 }}>
                          ¿Ya lo devolvieron? →
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => irADevolucion(factura)}
                        >
                          Registrar devolución
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Sin el acuerdo no se guarda: es la única forma de que nadie
              cobre y siga de largo dejando el equipo sin definir. */}
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando || faltanAcuerdos}
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
  // Se llama con la factura cuando el cliente devolvió el equipo: este
  // diálogo se cierra y quien lo abrió muestra la devolución.
  onRegistrarDevolucion: PropTypes.func,
};
