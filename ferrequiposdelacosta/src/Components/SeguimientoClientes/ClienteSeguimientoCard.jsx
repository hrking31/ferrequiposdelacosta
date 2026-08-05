import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIcon from "@mui/icons-material/Phone";
import UpdateIcon from "@mui/icons-material/Update";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  obtenerHistorialVencimientos,
  etiquetaVencimiento,
  diferenciaEnDias,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  equipoDevueltoCompleto,
  ESTADO_FACTURA_INFO,
  ESTADOS_FACTURA_EN_ORDEN,
} from "../ClienteDetalle/facturaUtils";
import { formatearMonedaOVacio } from "../../Utils/formato";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";


// Una factura entra a Seguimiento cuando vence, pero adentro puede tener
// equipos en distinta situación: unos ya vencidos, otros que vencen hoy y
// otros que todavía no. Se agrupan en ese orden, con lo urgente arriba.
const GRUPOS_VENCIMIENTO = [
  { clave: "hoy", titulo: "Vence hoy" },
  { clave: "vencido", titulo: "Vencido" },
  { clave: "vence", titulo: "Vence" },
  { clave: "indefinido", titulo: "Entrega indefinida" },
];

const clasificarVencimiento = (equipo, hoy) => {
  if (equipo.vencimientoIndefinido || !equipo.fechaVencimiento) return "indefinido";
  if (!hoy) return "vence";
  if (equipo.fechaVencimiento === hoy) return "hoy";
  if (equipo.fechaVencimiento < hoy) return "vencido";
  return "vence";
};

// Devuelve los equipos repartidos por grupo y ordenados por fecha dentro de
// cada uno. Los grupos que quedan vacíos no aparecen.
const agruparPorVencimiento = (equipos = [], hoy) => {
  const porGrupo = {};
  equipos.forEach((equipo, index) => {
    const clave = clasificarVencimiento(equipo, hoy);
    if (!porGrupo[clave]) porGrupo[clave] = [];
    porGrupo[clave].push({ equipo, index });
  });

  Object.values(porGrupo).forEach((lista) =>
    lista.sort((a, b) =>
      String(a.equipo.fechaVencimiento || "").localeCompare(
        String(b.equipo.fechaVencimiento || ""),
      ),
    ),
  );

  return GRUPOS_VENCIMIENTO.map((grupo) => ({
    ...grupo,
    items: porGrupo[grupo.clave] || [],
  })).filter((grupo) => grupo.items.length > 0);
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

// Ojo: esta es la variante que devuelve NADA si el valor no es un número, no la
// que muestra "$ 0". Ver Utils/formato.js.
const formatearMoneda = formatearMonedaOVacio;

const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

// "N° 101", "N° 101 y N° 105", "N° 101, N° 105 y N° 110" — para el mensaje de
// WhatsApp cuando el cliente tiene más de una factura en seguimiento.
const formatearListaFacturas = (numeros) => {
  const conPrefijo = numeros.map((numero) => `N° ${numero}`);
  if (conPrefijo.length <= 1) return conPrefijo.join("");
  return `${conPrefijo.slice(0, -1).join(", ")} y ${conPrefijo[conPrefijo.length - 1]}`;
};

export default function ClienteSeguimientoCard({
  cliente,
  facturas,
  hoy,
  onCambiarEstado,
  onEquiposActualizados,
}) {
  const theme = useTheme();
  const acento =
    theme.palette.custom.accent;
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabFactura, setTabFactura] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  // Plegar la factura, igual que en Detalle Cliente: arrancan TODAS plegadas
  // y lo que se guarda es cuáles se fueron abriendo, así la lista de clientes
  // se ve completa de un vistazo.
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
  const facturaPlegada = (facturaId) => !facturasAbiertas[facturaId];
  const togglePlegarFactura = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const [ampliarOpen, setAmpliarOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);

  const avatarBgPorEstado = theme.palette.custom.estadoFactura;

  // Tarjeta de un equipo: cantidad y nombre arriba, y abajo los datos como
  // chips. El historial de vencimientos aparece numerado (1er, 2do…) y el
  // vigente va aparte, marcado según en qué situación está.
  const renderEquipo = (equipo, key, situacion) => {
    const historial = obtenerHistorialVencimientos(equipo);

    // Lo que cuesta un día de este equipo: el precio diario por la cantidad
    // alquilada. Sirve para valorizar tanto los días vencidos como los que se
    // le agregaron al ampliar.
    const valorPorDia =
      (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);

    // Días que lleva vencido: desde que venció hasta hoy.
    const diasVencidos =
      situacion === "vencido" ? diferenciaEnDias(equipo.fechaVencimiento, hoy) : 0;

    // Días agregados y lo que valen ya con el descuento aplicado. Si el equipo
    // quedó con entrega indefinida, acá ya vienen sumados los días que lleva
    // sin devolver.
    const ampliacionEquipo = calcularAmpliacionEquipo(equipo, hoy);

    const conValor = (dias) =>
      valorPorDia > 0 ? ` · ${formatearMoneda(dias * valorPorDia)}` : "";

    return (
      <Box
        key={key}
        sx={{ p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant="meta"
            label={equipo.cantidad}
            size="small"
            sx={{ fontWeight: "bold", flexShrink: 0, color: "custom.accent" }}
          />
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
            {equipo.nombre}
          </Typography>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
          <Chip
            variant="meta"
            size="small"
            label={`${equipo.dias} día${Number(equipo.dias) === 1 ? "" : "s"}`}
          />

          {equipo.fechaDespacho && (
            <Chip
              variant="meta"
              size="small"
              label={`Despacho ${formatearFecha(equipo.fechaDespacho)}`}
            />
          )}

          {/* Cada ampliación dejó una fecha atrás: se listan numeradas para
              poder seguir la historia del alquiler. Van siempre en contorno,
              para que se distingan de la fecha vigente. */}
          {historial.map((fecha, i) => (
            <Chip
              key={`vto-${i}`}
              variant="meta"
              size="small"
              sx={{ bgcolor: "transparent", border: "1px solid", borderColor: "divider" }}
              label={`${etiquetaVencimiento(i)} ${formatearFecha(fecha)}`}
            />
          ))}

          {/* Días que se le sumaron al plazo, con lo que cuestan ya
              descontado, y el descuento aparte para que no quede escondido. */}
          {ampliacionEquipo.dias > 0 && (
            <Chip
              variant="meta"
              size="small"
              sx={{ color: "custom.accent" }}
              label={`+${ampliacionEquipo.dias} día${
                ampliacionEquipo.dias === 1 ? "" : "s"
              }${
                ampliacionEquipo.bruto > 0
                  ? ` · ${formatearMoneda(ampliacionEquipo.neto)}`
                  : ""
              }`}
            />
          )}

          {ampliacionEquipo.descuento > 0 && (
            <Chip
              variant="metaEstado"
              size="small"
              sx={{ fontWeight: 600, color: "success.main" }}
              label={`Descuento ${formatearMoneda(ampliacionEquipo.descuento)}`}
            />
          )}

          {situacion === "indefinido" ? (
            <Chip
              variant="meta"
              size="small"
              label="Entrega indefinida — el cliente debe avisar"
            />
          ) : (
            equipo.fechaVencimiento && (
              <Chip
                size="small"
                variant={situacion === "vencido" ? "metaEstado" : "meta"}
                sx={
                  situacion === "vencido"
                    ? { bgcolor: "error.main", color: "error.contrastText", border: "none" }
                    : { fontWeight: "bold" }
                }
                label={`${
                  situacion === "vencido"
                    ? "Venció"
                    : situacion === "hoy"
                      ? "Vence hoy"
                      : "Vence"
                } ${formatearFecha(equipo.fechaVencimiento)}`}
              />
            )
          )}

          {/* Lo que se acumuló desde que venció: cuántos días lleva y cuánto
              representa a precio de este equipo. */}
          {diasVencidos > 0 && (
            <Chip
              size="small"
              variant="metaEstado"
              sx={{ color: "error.main" }}
              label={`${diasVencidos} día${diasVencidos === 1 ? "" : "s"} vencido${
                diasVencidos === 1 ? "" : "s"
              }${conValor(diasVencidos)}`}
            />
          )}
        </Stack>
      </Box>
    );
  };

  // Línea de equipo ya devuelta del todo: se muestra aparte y atenuada, para
  // no mezclarla con lo que todavía hay que seguir.
  const renderEquipoDevuelto = (equipo, key) => (
    <Box
      key={key}
      sx={{ p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider", opacity: 0.65 }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <Chip
          variant="meta"
          label={equipo.cantidad}
          size="small"
          sx={{ fontWeight: "bold", flexShrink: 0 }}
        />
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
          {equipo.nombre}
        </Typography>
        <Chip
          size="small"
          variant="meta"
          sx={{ color: "success.main" }}
          label={`Devuelto ${formatearFecha(equipo.fechaDevolucion) || ""}`}
        />
      </Stack>
    </Box>
  );

  const gradosGrisPestana = theme.palette.custom.pestanaInactiva;

  const indiceActivo = Math.min(tabFactura, facturas.length - 1);
  const factura = facturas[indiceActivo];
  const facturaEstadoInfo =
    ESTADO_FACTURA_INFO[factura.estado] || { label: factura.estado || "Sin estado" };
  const facturaEstadoColor =
    avatarBgPorEstado[factura.estado] || theme.palette.custom.estadoNeutro;

  // El cálculo de las ampliaciones vive en facturaUtils, compartido con
  // ClienteDetalle y con el diálogo que las guarda: así las tres pantallas
  // no pueden dar números distintos.
  const ampliacion = calcularAmpliacionFactura(factura, hoy);

  // Subtotal e IVA se muestran ya con los días ampliados sumados (menos el
  // descuento): son lo que hoy se le cobraría al cliente, no lo que decía la
  // factura el día que se emitió. Si la factura no traía el dato, se deja
  // vacío como antes en vez de mostrar un cero.
  const subtotal = formatearMoneda(
    typeof factura.subtotal === "number" ? ampliacion.nuevoSubtotal : factura.subtotal,
  );
  const iva = formatearMoneda(
    typeof factura.iva === "number" ? ampliacion.nuevoIva : factura.iva,
  );
  const deposito = formatearMoneda(factura.deposito);
  const valorTotal = formatearMoneda(
    ampliacion.hay ? ampliacion.nuevoTotal : Number(factura.valorTotal) || 0,
  );
  const transporteMonto = formatearMoneda(factura.valorTransporte);
  const transporteTipo = typeof factura.transporte === "string" ? factura.transporte : null;
  const textoTransporte =
    transporteTipo === "Sin transporte"
      ? "Sin transporte"
      : ["Transporte", transporteTipo, transporteMonto].filter(Boolean).join(" ");
  const fecha = formatearFecha(factura.fecha);

  // Con los días ampliados incluidos, igual que el subtotal y el IVA.
  const saldoPendienteNumero = ampliacion.hay
    ? ampliacion.nuevoSaldo
    : Number(factura.saldoPendiente) || 0;
  const saldoPendiente = formatearMoneda(saldoPendienteNumero);

  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

  // Mensaje de recordatorio de vencimiento, precargado en el link de
  // WhatsApp. Junta TODAS las facturas del cliente que están en seguimiento
  // (no solo la pestaña activa): si tiene dos venciendo el mismo día, un solo
  // mensaje las menciona a ambas en vez de mandar uno por cada una.
  const numerosFactura = facturas.map((f) => f.numeroFactura ?? "s/n");
  const mensajeWhatsapp = [
    `👋 Hola, ${obtenerNombreCompleto(cliente)}.`,
    "",
    `Te recordamos que hoy, ${formatearFecha(hoy)}, finaliza el período de alquiler de los equipos registrados en ${
      numerosFactura.length === 1 ? "tu factura" : "tus facturas"
    } ${formatearListaFacturas(numerosFactura)}.`,
    "",
    "Si deseas extender el alquiler o coordinar la devolución, por favor comunícate con nosotros.",
    "",
    "Gracias por confiar en Ferrequipos de la Costa.",
  ].join("\n");
  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`;

  // La pizarra de totales: el aspecto lo pone el tema, acá solo van las filas.
  // Los renglones "nuevo" solo aparecen si la factura tiene ampliaciones.
  const cuadroTotales = valorTotal && (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.6 }}
      >
        Estado de cuenta
      </Typography>
      <Paper variant="totales" sx={{ minWidth: { sm: 260 } }}>
      <Box className="fila total">
        <Typography variant="subtitle1" fontWeight="bold">
          Total factura
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {valorTotal}
        </Typography>
      </Box>

      {/* Lo ya cobrado. Solo aparece cuando queda saldo: con la factura
          saldada sería el mismo número del total, repetido. */}
      {saldoPendienteNumero > 0 && (
        <Box className="fila">
          <Typography variant="body2">Pagado</Typography>
          <Typography variant="body2">
            {formatearMoneda(Number(factura.montoPagado) || 0)}
          </Typography>
        </Box>
      )}

      {/* Siempre visible: rojo si queda algo por cobrar, verde si la factura
          ya está saldada. Así se lee de un vistazo en qué situación está. */}
      <Box
        className={saldoPendienteNumero > 0 ? "fila alerta" : "fila ok"}
        sx={{ mt: 1 }}
      >
        <Typography variant="body2" fontWeight="bold">
          Saldo pendiente
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {saldoPendiente}
        </Typography>
      </Box>

      </Paper>
    </Box>
  );

  const handleCambiar = (nuevoEstado) => {
    setMenuAnchor(null);
    onCambiarEstado(cliente.id, factura.id, nuevoEstado);
  };

  // Capas detrás de la carpeta activa: sugieren que hay más facturas "debajo".
  const capasDePila = Math.min(facturas.length - 1, 2);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: 1,
        p: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 0.5, pb: 1 }}>
        <Avatar sx={{ bgcolor: facturaEstadoColor, width: 36, height: 36 }}>
          {cliente.tipo === "empresa" ? (
            <BusinessIcon sx={{ fontSize: 18 }} />
          ) : (
            <PersonIcon sx={{ fontSize: 18 }} />
          )}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {obtenerNombreCompleto(cliente)}
          </Typography>
          {telefonoValido ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {cliente.telefono}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 0.5 }}>
                <IconButton
                  size="small"
                  component="a"
                  href={linkWhatsapp}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    bgcolor: theme.palette.custom.whatsapp.main,
                    color: theme.palette.common.white,
                    width: 18,
                    height: 18,
                    "&:hover": { bgcolor: theme.palette.custom.whatsapp.dark },
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 11 }} />
                </IconButton>
                {esMovil && (
                  <IconButton
                    size="small"
                    component="a"
                    href={`tel:${cliente.telefono}`}
                    sx={{
                      bgcolor: theme.palette.custom.call.main,
                      color: theme.palette.common.white,
                      width: 18,
                      height: 18,
                      "&:hover": { bgcolor: theme.palette.custom.call.dark },
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          ) : (
            cliente.telefono && (
              <Typography variant="caption" color="text.secondary">
                {cliente.telefono}
              </Typography>
            )
          )}
        </Box>
      </Stack>

      <Box sx={{ position: "relative" }}>
        {Array.from({ length: capasDePila }).map((_, i) => (
          <Box
            key={`pila-${i}`}
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              top: (i + 1) * 7,
              borderRadius: 3,
              bgcolor: theme.palette.custom.tabStripBackground,
              border: "1px solid",
              borderColor: "divider",
              transform: `scale(${1 - (i + 1) * 0.03})`,
              zIndex: -(i + 1),
            }}
          />
        ))}

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack
            direction="row"
            sx={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {facturas.map((f, idx) => {
                const activo = idx === indiceActivo;
                return (
                  <Box
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setTabFactura(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setTabFactura(idx);
                    }}
                    sx={{
                      cursor: "pointer",
                      userSelect: "none",
                      flexShrink: 0,
                      px: 2,
                      py: 0.75,
                      mr: idx === facturas.length - 1 ? 0 : -1.5,
                      whiteSpace: "nowrap",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      border: "1px solid",
                      borderColor: activo ? "custom.accent" : "divider",
                      bgcolor: activo ? "custom.accent" : gradosGrisPestana,
                      // La pestaña activa va rellena con el acento, así que su
                      // texto usa el token pensado para ir encima.
                      color: activo ? "custom.onAccent" : "text.secondary",
                      position: "relative",
                      zIndex: activo ? facturas.length + 1 : facturas.length - idx,
                      mb: 0,
                      boxShadow:
                        !activo && idx < facturas.length - 1
                          ? theme.palette.custom.sombraPestana
                          : "none",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    Fact. {f.numeroFactura ?? "s/n"}
                  </Box>
                );
              })}
          </Stack>

          <Box
            sx={{
              position: "relative",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "custom.accent",
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              boxShadow: 4,
              p: 2,
              pt: { xs: 2, sm: 2.5 },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              {fecha && (
                <Typography variant="body2" color="text.secondary">
                  Fecha despacho: {fecha}
                </Typography>
              )}

              {/* Acciones de la factura arriba a la derecha, junto al chip de
                  estado — mismo patrón que las facturas de ClienteDetalle. */}
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Tooltip title="Ampliar vencimiento">
                  <IconButton
                    size="small"
                    onClick={() => setAmpliarOpen(true)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    <UpdateIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Registrar devolución">
                  <IconButton
                    size="small"
                    onClick={() => setDevolucionOpen(true)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    <AssignmentReturnedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Chip
                  label={facturaEstadoInfo.label}
                  size="small"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  variant="estadoCompacto"
                  sx={{
                    cursor: "pointer",
                    bgcolor: facturaEstadoColor,
                    color: theme.palette.getContrastText(facturaEstadoColor),
                  }}
                />

                {/* Pliega la factura y deja a la vista solo este encabezado,
                    igual que en Detalle Cliente. */}
                <Tooltip
                  title={
                    facturaPlegada(factura.id)
                      ? "Mostrar factura"
                      : "Ocultar factura"
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => togglePlegarFactura(factura.id)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    {facturaPlegada(factura.id) ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ExpandLessIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {!facturaPlegada(factura.id) && factura.equipos?.length > 0 && (
              <Stack spacing={1} sx={{ mb: 1 }}>
                {agruparPorVencimiento(
                  factura.equipos.filter((equipo) => !equipoDevueltoCompleto(equipo)),
                  hoy,
                ).map((grupo) => (
                  <Box key={grupo.clave}>
                    {/* El encabezado dice en qué situación está el grupo, así
                        cada renglón solo necesita mostrar la fecha. */}
                    <Typography
                      variant="overline"
                      sx={{
                        display: "block",
                        lineHeight: 1.6,
                        color:
                          grupo.clave === "vencido"
                            ? "error.main"
                            : grupo.clave === "hoy"
                              ? "custom.accent"
                              : "text.secondary",
                      }}
                    >
                      {grupo.titulo}
                    </Typography>

                    <Stack spacing={0.5}>
                      {grupo.items.map(({ equipo, index }) =>
                        renderEquipo(equipo, `${equipo.nombre}-${index}`, grupo.clave),
                      )}
                    </Stack>
                  </Box>
                ))}

                {factura.equipos.some((equipo) => equipoDevueltoCompleto(equipo)) && (
                  <Box>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ display: "block", lineHeight: 1.6 }}
                    >
                      Devuelto
                    </Typography>
                    <Stack spacing={0.5}>
                      {factura.equipos
                        .map((equipo, index) => ({ equipo, index }))
                        .filter(({ equipo }) => equipoDevueltoCompleto(equipo))
                        .map(({ equipo, index }) =>
                          renderEquipoDevuelto(equipo, `devuelto-${equipo.nombre}-${index}`),
                        )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            {facturaPlegada(factura.id) ? null : esMovil ? (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Total factura
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setDetalleAbierto((prev) => !prev)}
                  >
                    {detalleAbierto ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
                {detalleAbierto && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {subtotal && <Typography variant="body2">Subtotal {subtotal}</Typography>}
                    {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                    {deposito && <Typography variant="body2">Depósito {deposito}</Typography>}
                    {(transporteTipo || transporteMonto) && (
                      <Typography variant="body2">{textoTransporte}</Typography>
                    )}
                    {cuadroTotales}
                  </Stack>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Total factura
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
                    {subtotal && <Typography variant="body2">Subtotal {subtotal}</Typography>}
                    {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                    {deposito && <Typography variant="body2">Depósito {deposito}</Typography>}
                    {(transporteTipo || transporteMonto) && (
                      <Typography variant="body2">{textoTransporte}</Typography>
                    )}
                  </Stack>

                  {cuadroTotales}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {ESTADOS_FACTURA_EN_ORDEN.map((estado) => (
          <MenuItem key={estado} onClick={() => handleCambiar(estado)}>
            {ESTADO_FACTURA_INFO[estado].label}
          </MenuItem>
        ))}
      </Menu>

      <AmpliarVencimientoDialog
        open={ampliarOpen}
        onClose={() => setAmpliarOpen(false)}
        cliente={cliente}
        factura={factura}
        onActualizado={onEquiposActualizados}
      />

      <RegistrarDevolucionDialog
        open={devolucionOpen}
        onClose={() => setDevolucionOpen(false)}
        cliente={cliente}
        factura={factura}
        onActualizado={onEquiposActualizados}
      />
    </Box>
  );
}

ClienteSeguimientoCard.propTypes = {
  cliente: PropTypes.object.isRequired,
  facturas: PropTypes.array.isRequired,
  hoy: PropTypes.string,
  onCambiarEstado: PropTypes.func.isRequired,
  onEquiposActualizados: PropTypes.func,
};
