import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  sinFechaDeEntrega,
  proyectarAmpliacion,
  formatearFechaLegible,
} from "./facturaUtils";
import PlazoEquipo from "../SeguimientoClientes/PlazoEquipo";
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
  pedirAcuerdo = false,
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
  // "No se pactó nada" es UNA sola respuesta por factura, no una por equipo:
  // no es una decisión sobre un equipo en particular sino la ausencia de
  // acuerdo, y repetirla en cada uno obligaba a marcar tres veces lo mismo
  // para decir que de eso no se habló. Cubre a los que quedaron sin marcar,
  // así que se puede pactar por uno y dejar el resto como está.
  const [sinPactar, setSinPactar] = useState({});
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
    setSinPactar({});
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
  // SOLO DESDE CARTERA se pregunta qué pasa con los equipos.
  //
  // Es la misma regla que ya siguen las devoluciones: en la ficha del cliente
  // se registra lo que pasó con la plata y nada más, y pactar un plazo es
  // cobranza —se acuerda con alguien que ya está vencido— así que se decide
  // donde se cobra. Con la pregunta acá, anotar un abono de una factura al
  // día obligaba a opinar sobre equipos que nadie está reclamando.
  const conEquiposVencidos = !pedirAcuerdo
    ? []
    : reparto
        .filter(({ aplicado }) => aplicado > 0)
        .map(({ factura }) => ({
          factura,
          // Con su despacho y su posición: la decisión es de CADA equipo, y un
          // número suelto no alcanza para señalar una sola línea —los equipos
          // viven repartidos en grupos—.
          equipos: equiposDe(factura)
            .filter(({ equipo }) => sigueAfuera(equipo) && equipoVencido(equipo, hoy))
            .map(({ equipo, grupo, indice }) => ({
              equipo,
              clave: `${factura.id}#${grupo?.grupo}#${indice}`,
              claveEnLaFactura: `${grupo?.grupo}#${indice}`,
            })),
        }))
        .filter(({ equipos }) => equipos.length > 0);

  // El que YA quedó sin fecha viene resuelto: no hay nada que volver a pactar.
  // Y se marca aparte de "indefinida" a propósito —`yaIndefinida` no se
  // aplica— porque volver a escribir el acuerdo le correría a hoy el día en
  // que se pactó, borrando desde cuándo el cliente lo tiene sin fecha.
  const acuerdoDe = (clave, equipo) =>
    acuerdos[clave] ??
    (sinFechaDeEntrega(equipo) ? { tipo: "yaIndefinida", dias: "" } : { tipo: "", dias: "" });

  const acuerdoResuelto = (clave, equipo) => {
    const acuerdo = acuerdoDe(clave, equipo);
    if (acuerdo.tipo === "indefinida") return true;
    if (acuerdo.tipo === "yaIndefinida") return true;
    return acuerdo.tipo === "dias" && Number(acuerdo.dias) > 0;
  };

  // Falta contestar por algún equipo: lo único que no se admite es no decir
  // nada. La plata ya no se pierde por esto —los tramos vencidos quedan
  // escritos igual—, pero un equipo sobre el que nadie decidió se queda en la
  // obra sin que nadie sepa hasta cuándo.
  const faltanAcuerdos = conEquiposVencidos.some(
    ({ factura, equipos }) =>
      !sinPactar[factura.id] &&
      equipos.some(({ clave, equipo }) => !acuerdoResuelto(clave, equipo)),
  );

  // Lo pactado de UNA factura, con la clave que entiende aplicarAcuerdoDeEquipos.
  const acuerdosDeLaFactura = (entrada) =>
    entrada.equipos.reduce((mapa, { clave, claveEnLaFactura, equipo }) => {
      const acuerdo = acuerdoDe(clave, equipo);
      return { ...mapa, [claveEnLaFactura]: acuerdo };
    }, {});

  const elegirAcuerdo = (clave, tipo) =>
    setAcuerdos((previos) => ({
      ...previos,
      [clave]: { ...(previos[clave] ?? { dias: "" }), tipo, ...(tipo === "dias" ? {} : { dias: "" }) },
    }));

  const escribirDias = (clave, dias) =>
    setAcuerdos((previos) => ({
      ...previos,
      [clave]: { tipo: "dias", dias: dias.replace(/\D/g, "") },
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
        const entrada = conEquiposVencidos.find(
          ({ factura: conVencidos }) => conVencidos.id === factura.id,
        );
        const plazo = entrada
          ? aplicarAcuerdoDeEquipos(factura, acuerdosDeLaFactura(entrada), hoy)
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
              const numero = datosFactura(factura).numeroFactura ?? "s/n";

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
                      <Typography variant="body2">
                        {equipos.length === 1 ? "Este equipo sigue" : "Estos equipos siguen"}{" "}
                        en la obra
                        {conEquiposVencidos.length > 1 && ` (factura ${numero})`}. ¿Qué
                        se acordó?
                      </Typography>
                    </Stack>

                    {/* UNO POR UNO, y no una sola pregunta para toda la
                        factura: el cliente puede pedir dos días más para la
                        mezcladora y quedarse el compresor sin fecha, y esas son
                        dos decisiones distintas. Antes había que salir al
                        diálogo de ampliar y volver para separarlas. */}
                    <Stack gap={1.5}>
                      {equipos.map(({ equipo, clave }, posicion) => {
                        const acuerdo = acuerdoDe(clave, equipo);
                        const dias = Number(acuerdo.dias) || 0;
                        const yaIndefinido = sinFechaDeEntrega(equipo);
                        // Hasta cuándo quedaría: es la fecha que el cliente
                        // escucha por teléfono.
                        const proyeccion =
                          acuerdo.tipo === "dias" && dias > 0
                            ? proyectarAmpliacion(equipo, dias, hoy).hasta
                            : null;

                        return (
                          <Box key={clave}>
                            <Typography variant="body2" fontWeight="bold">
                              {equipo.cantidadEquipos} {equipo.nombre}
                            </Typography>
                            {/* La fecha del último acuerdo y, si ya pasó, los
                                días que lleva vencido. La misma línea y la
                                misma regla que en los dos diálogos de
                                Seguimiento (ver PlazoEquipo). */}
                            <PlazoEquipo equipo={equipo} hoy={hoy} />

                            <Stack gap={0.5} sx={{ mt: 0.5 }}>
                              <Stack direction="row" alignItems="center" gap={0.5}>
                                <Radio
                                  size="small"
                                  checked={acuerdo.tipo === "dias"}
                                  onChange={() => elegirAcuerdo(clave, "dias")}
                                  inputProps={{
                                    "aria-label": `Ampliar vencimiento, ${equipo.nombre}`,
                                  }}
                                  sx={{ p: 0.25 }}
                                />
                                <Typography variant="body2">Ampliar vencimiento</Typography>
                                {/* Los días y la fecha aparecen al elegirla:
                                    sin elegir no hay nada que llenar, y el
                                    renglón se lee como los otros dos. */}
                                {acuerdo.tipo === "dias" && (
                                  <>
                                    <TextField
                                      size="small"
                                      autoFocus
                                      value={acuerdo.dias}
                                      onChange={(e) => escribirDias(clave, e.target.value)}
                                      name={`dias-acuerdo-${clave}`}
                                      id={`dias-acuerdo-${clave}`}
                                      inputProps={{
                                        inputMode: "numeric",
                                        "aria-label": `Días de plazo, ${equipo.nombre}`,
                                      }}
                                      sx={{
                                        width: 64,
                                        "& input": { textAlign: "center", py: 0.5 },
                                      }}
                                    />
                                    <Typography variant="body2">días</Typography>
                                    {proyeccion && (
                                      <Typography
                                        variant="body2"
                                        sx={{ color: "text.secondary" }}
                                      >
                                        → {formatearFechaLegible(proyeccion)}
                                      </Typography>
                                    )}
                                  </>
                                )}
                              </Stack>

                              {/* AL QUE YA ESTÁ SIN FECHA le sale marcada y
                                  bloqueada: no hay nada que volver a pactar, y
                                  vacía hacía parecer que el equipo tenía fecha.
                                  Volver a guardarla le correría a hoy el día en
                                  que se pactó. Para sacarlo de ahí se le dan
                                  días, que es lo que la cierra. */}
                              <Stack direction="row" alignItems="center" gap={0.5}>
                                <Radio
                                  size="small"
                                  checked={
                                    acuerdo.tipo === "indefinida" ||
                                    acuerdo.tipo === "yaIndefinida"
                                  }
                                  disabled={yaIndefinido}
                                  onChange={() => elegirAcuerdo(clave, "indefinida")}
                                  inputProps={{
                                    "aria-label": `Entrega indefinida, ${equipo.nombre}`,
                                  }}
                                  sx={{ p: 0.25 }}
                                />
                                <Typography variant="body2">
                                  Entrega indefinida
                                </Typography>
                              </Stack>

                            </Stack>

                            {posicion < equipos.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                          </Box>
                        );
                      })}
                    </Stack>

                    {/* UNA SOLA para toda la factura: cobrar sin pactar nada.
                        La plata entra igual, los equipos se quedan como están
                        y mañana les sigue corriendo la mora. Existe para que
                        eso sea una decisión y no un olvido, y cubre a los que
                        quedaron sin marcar: se puede pactar por uno y dejar el
                        resto como está.

                        Con el modelo de tramos no se pierde nada por esto —el
                        tramo vencido queda escrito igual—, así que lo único
                        que protege es que alguien haya contestado. */}
                    <FormControlLabel
                      sx={{ mt: 1 }}
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(sinPactar[factura.id])}
                          onChange={(e) =>
                            setSinPactar((previos) => ({
                              ...previos,
                              [factura.id]: e.target.checked,
                            }))
                          }
                          inputProps={{
                            "aria-label": `No se acordó nada, factura ${numero}`,
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          No se acordó nada
                        </Typography>
                      }
                    />

                    {/* La devolución no es un radio: no se elige acá, abre su
                        propio diálogo —define depósito y retención, y eso
                        cambia cuánto cobrar—. Y es de la factura, no de un
                        equipo: ahí adentro se marca cuáles volvieron. */}
                    <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => irADevolucion(factura)}
                      >
                        Devolución
                      </Button>
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
  // Preguntar qué pasa con los equipos vencidos. Lo enciende cartera: en la
  // ficha del cliente solo se registran abonos.
  pedirAcuerdo: PropTypes.bool,
};
