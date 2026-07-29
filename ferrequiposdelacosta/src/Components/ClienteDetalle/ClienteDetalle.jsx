import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
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
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import { collection, deleteDoc, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import FacturaFormDialog from "./FacturaFormDialog";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import {
  normalizarPagos,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
} from "./facturaUtils";

// El estado del cliente es el mismo vocabulario que el de sus facturas
// (el cliente toma el estado de la factura que se le crea/edita), más
// "inactivo" para cuando todavía no tiene ninguna factura.
const ESTADO_CLIENTE_INFO = {
  inactivo: { label: "Inactivo" },
  pendienteDespacho: { label: "Pendiente despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
};

// Ciclo de vida de una factura creada desde la app:
// pendienteDespacho (se facturó, equipos aún no entregados)
//   -> despachada (todos los equipos entregados al cliente)
//   -> devolucionParcial (devolvió algunos equipos, se quedó con otros)
//   -> finalizada (devolvió todo, no queda nada pendiente)
// El color de cada estado sale de avatarBgPorEstado (color propio, no del
// prop `color` de MUI) para no repetir colores ya usados en otros botones.
const ESTADO_FACTURA_INFO = {
  pendienteDespacho: { label: "Pendiente despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
};

const TIPO_PAGO_LABELS = {
  total: "Pago total",
  parcial: "Parcial",
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

const formatearMoneda = (valor) =>
  typeof valor === "number"
    ? valor.toLocaleString("es-CO", { style: "currency", currency: "COP" })
    : null;

// Los equipos que se agregaron juntos forman un lote: comparten un solo
// pago y unos solos adicionales, que quedan guardados en el primero de
// ellos. Los lotes nuevos traen "loteId"; en los guardados antes de que
// existiera ese campo se deduce, porque solo el primero del grupo lleva los
// datos de pago y los que le siguen sin datos son del mismo lote.
const agruparLotesAgregados = (equipos) => {
  const lotes = [];

  equipos.forEach((equipo) => {
    const ultimo = lotes[lotes.length - 1];
    const traeDatosDeLote =
      (Array.isArray(equipo.pagos) && equipo.pagos.length > 0) ||
      Boolean(equipo.tipoPago) ||
      Number(equipo.deposito) > 0 ||
      Boolean(equipo.transporte);

    const sigueElMismo =
      ultimo &&
      (equipo.loteId
        ? equipo.loteId === ultimo.loteId
        : !ultimo.loteId && !traeDatosDeLote);

    if (sigueElMismo) {
      ultimo.equipos.push(equipo);
      return;
    }

    lotes.push({
      loteId: equipo.loteId || null,
      // El primero del lote es el que carga el pago, el depósito y el
      // transporte de todo el grupo.
      cabecera: equipo,
      equipos: [equipo],
    });
  });

  return lotes;
};

const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const acento =
    theme.palette.custom.accent;
  const avatarBgPorEstado = {
    inactivo:
      theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700],
    pendienteDespacho: theme.palette.custom.pendienteDespacho,
    despachada: theme.palette.success.main,
    devolucionParcial: theme.palette.info.main,
    finalizada: theme.palette.secondary.main,
  };
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [crearFacturaOpen, setCrearFacturaOpen] = useState(false);
  const [facturaAgregarEquipo, setFacturaAgregarEquipo] = useState(null);
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [facturaEliminando, setFacturaEliminando] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [menuEstadoAnchor, setMenuEstadoAnchor] = useState(null);
  const [facturaMenuId, setFacturaMenuId] = useState(null);
  // Cada factura tiene 4 secciones que se muestran/ocultan por separado en
  // móvil (pagoGeneral, equiposFactura, equiposAgregados, pagoTotal) — la
  // clave es "{facturaId}:{seccion}". En PC todas están siempre visibles.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleEliminarFactura = async () => {
    if (!facturaEliminando) return;
    setEliminando(true);
    try {
      await deleteDoc(doc(db, "clientes", id, "facturas", facturaEliminando.id));
      setFacturaEliminando(null);
      await fetchCliente(true);
      showSnackbar("Factura eliminada.", "success");
    } catch (error) {
      showSnackbar(`Error al eliminar la factura: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeccion = (facturaId, seccion) => {
    const clave = `${facturaId}:${seccion}`;
    setSeccionesAbiertas((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };
  const seccionAbierta = (facturaId, seccion) =>
    Boolean(seccionesAbiertas[`${facturaId}:${seccion}`]);

  const handleAbrirMenuEstado = (event, facturaId) => {
    setMenuEstadoAnchor(event.currentTarget);
    setFacturaMenuId(facturaId);
  };

  const handleCerrarMenuEstado = () => {
    setMenuEstadoAnchor(null);
    setFacturaMenuId(null);
  };

  const handleCambiarEstadoFactura = async (nuevoEstado) => {
    const facturaId = facturaMenuId;
    handleCerrarMenuEstado();
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "clientes", id, "facturas", facturaId), {
        estado: nuevoEstado,
      });
      batch.update(doc(db, "clientes", id), {
        estado: nuevoEstado,
      });
      await batch.commit();
      await fetchCliente(true);
      showSnackbar("Estado de la factura actualizado.", "success");
    } catch (error) {
      showSnackbar(`Error al actualizar el estado: ${error.message}`, "error");
    }
  };

  // silencioso=true evita el spinner de pantalla completa: se usa para
  // refrescar datos después de una edición puntual (crear factura, cambiar
  // estado) sin desmontar toda la vista y perder el scroll.
  const fetchCliente = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const clienteSnap = await getDoc(doc(db, "clientes", id));
        if (!clienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        setCliente({ id: clienteSnap.id, ...clienteSnap.data() });

        const facturasSnap = await getDocs(collection(db, "clientes", id, "facturas"));
        const listaFacturas = facturasSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
        setFacturas(listaFacturas);
      } catch (error) {
        console.error("Error al obtener el cliente:", error);
        showSnackbar("Error al cargar el cliente", "error");
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [id, showSnackbar],
  );

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  // Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
  // arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
  // un equipo original o uno agregado después.
  const renderEquipoRow = (equipo, key) => {
    const despacho = formatearFecha(equipo.fechaDespacho);
    const porDia = (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);
    const subtotalEquipo = porDia * (Number(equipo.dias) || 0);

    // Si al equipo se le amplió el plazo, cuánto pasa a valer con esos días
    // extra ya descontados. Se muestra debajo del valor original.
    const ampliacionEquipo = calcularAmpliacionEquipo(equipo);
    const valorConAmpliacion =
      ampliacionEquipo.neto > 0 && subtotalEquipo > 0
        ? subtotalEquipo + ampliacionEquipo.neto
        : 0;

    return (
      <Box
        key={key}
        sx={{
          p: 1,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant="meta"
            label={equipo.cantidad}
            size="small"
            sx={{
              fontWeight: "bold",
              flexShrink: 0,
              // Antes era amarillo fijo, que en modo claro quedaba casi
              // invisible sobre el chip. Es letra chica, así que va el acento
              // en su versión oscura.
              color: theme.palette.custom.accentSmall,
            }}
          />
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
            {equipo.nombre}
          </Typography>
          {subtotalEquipo > 0 && (
            <Stack sx={{ flexShrink: 0, textAlign: "right" }}>
              <Typography variant="body2" fontWeight="bold">
                {formatearMoneda(subtotalEquipo)}
              </Typography>
              {valorConAmpliacion > 0 && (
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ color: "custom.accentSmall", lineHeight: 1.2 }}
                >
                  {formatearMoneda(valorConAmpliacion)}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
        {(() => {
          const chipsDiasValor = [
            <Chip
              key="dias"
              variant="meta"
              size="small"
              label={`${equipo.dias} día${Number(equipo.dias) === 1 ? "" : "s"}`}
            />,
          ];
          if (Number(equipo.valor) > 0) {
            chipsDiasValor.push(
              <Chip
                key="valor"
                variant="meta"
                size="small"
                label={`${formatearMoneda(Number(equipo.valor))}/día`}
              />,
            );
          }

          const chipsFechas = [];
          if (despacho) {
            chipsFechas.push(
              <Chip
                key="despacho"
                variant="meta"
                size="small"
                label={`Despacho ${despacho}`}
              />,
            );
          }
          if (equipo.vencimientoIndefinido) {
            chipsFechas.push(
              <Chip
                key="indefinida"
                variant="meta"
                size="small"
                label="Entrega indefinida — cliente debe avisar"
              />,
            );
          } else {
            if (equipo.fechaVencimientoOriginal) {
              chipsFechas.push(
                <Chip
                  key="vencido"
                  size="small"
                  variant="metaEstado"
                  sx={{ bgcolor: "error.main", color: "error.contrastText", border: "none" }}
                  label={`Vencido ${formatearFecha(equipo.fechaVencimientoOriginal)}`}
                />,
              );
            }
          }

          // Los días que se le sumaron al plazo, con su valor ya descontado, y
          // el descuento aparte. Va fuera del if de arriba porque los equipos
          // con entrega indefinida también acumulan días (los que llevan sin
          // devolverse), y antes ese chip no se les mostraba nunca.
          const ampliacion = calcularAmpliacionEquipo(equipo);
          if (ampliacion.dias > 0) {
            chipsFechas.push(
              <Chip
                key="agregados"
                variant="meta"
                size="small"
                sx={{ color: "custom.accentSmall" }}
                label={`+${ampliacion.dias} día${ampliacion.dias === 1 ? "" : "s"}${
                  ampliacion.bruto > 0 ? ` · ${formatearMoneda(ampliacion.neto)}` : ""
                }`}
              />,
            );
          }
          if (ampliacion.descuento > 0) {
            chipsFechas.push(
              <Chip
                key="descuento"
                variant="metaEstado"
                size="small"
                sx={{ fontWeight: 600, color: "success.main" }}
                label={`Descuento ${formatearMoneda(ampliacion.descuento)}`}
              />,
            );
          }

          // El vencimiento vigente va último: primero se lee de dónde viene
          // (venció tal día, se le sumaron tantos días, con tal descuento) y
          // recién al final hasta cuándo quedó.
          if (!equipo.vencimientoIndefinido && equipo.fechaVencimiento) {
            chipsFechas.push(
              <Chip
                key="devuelve"
                variant="meta"
                size="small"
                label={`Devuelve ${formatearFecha(equipo.fechaVencimiento)}`}
              />,
            );
          }

          // En móvil, días/precio en una columna y fechas en otra (prolijo).
          // En PC, todos los chips sueltos en una sola fila, como estaba.
          return esMovil ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1, rowGap: 0.5, mt: 0.75 }}>
              <Stack spacing={0.5}>{chipsDiasValor}</Stack>
              <Stack spacing={0.5}>{chipsFechas}</Stack>
            </Box>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
              {chipsDiasValor}
              {chipsFechas}
            </Stack>
          );
        })()}
      </Box>
    );
  };

  // Los dos recuadros punteados de una factura —el de pago y el de
  // adicionales— comparten forma y tipografía: se definen una sola vez acá
  // para que no se separen con el tiempo.
  const cuadroPunteadoSx = {
    p: 1,
    borderRadius: 1,
    border: "1px dashed",
    borderColor: "divider",
  };

  const filaDatosProps = {
    direction: { xs: "column", sm: "row" },
    flexWrap: "wrap",
    columnGap: 2,
    rowGap: { xs: 0.6, sm: 0.4 },
    alignItems: { xs: "flex-start", sm: "center" },
  };

  const etiquetaDato = (texto) => (
    <Typography
      component="span"
      sx={{
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "text.secondary",
        mr: 0.5,
      }}
    >
      {texto}
    </Typography>
  );

  // El valor va en negrita y con el color normal del texto (no el gris
  // apagado que hereda por default un <Typography variant="caption">).
  const valorDato = (texto) => (
    <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
      {texto}
    </Typography>
  );

  // Lo que se cobra aparte del alquiler: depósito y transporte. Antes iban
  // dentro del cuadro de pago, mezclados con el medio y el monto; ahora van
  // en su propio recuadro, debajo de los equipos.
  const renderAdicionales = ({ deposito, transporteTipo, transporteMonto, iva, key }) => {
    const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
    const hayIva = Number(iva) > 0;
    if (deposito <= 0 && !hayTransporte && !hayIva) return null;

    const total = (hayIva ? Number(iva) : 0) + deposito + (hayTransporte ? transporteMonto : 0);

    return (
      <Box key={key} sx={cuadroPunteadoSx}>
        <Stack {...filaDatosProps}>
          {hayIva && (
            <Box>
              {etiquetaDato("IVA (19%)")} {valorDato(formatearMoneda(Number(iva)))}
            </Box>
          )}
          {deposito > 0 && (
            <Box>
              {etiquetaDato("Depósito")} {valorDato(formatearMoneda(deposito))}
            </Box>
          )}
          {/* El tipo de transporte y su valor van juntos: son un solo dato,
              no dos ("Ida y vuelta · $60.000"). */}
          {hayTransporte && (
            <Box>
              {etiquetaDato("Transporte")}{" "}
              {valorDato(
                transporteMonto > 0
                  ? `${transporteTipo} · ${formatearMoneda(transporteMonto)}`
                  : transporteTipo,
              )}
            </Box>
          )}
          {/* La suma de todo lo que se cobra aparte del alquiler. */}
          <Box>
            {etiquetaDato("Total")} {valorDato(formatearMoneda(total))}
          </Box>
        </Stack>
      </Box>
    );
  };

  // Cuadro de pago de un lote de equipos (el original de la factura, o cada
  // equipo agregado después): tipo de pago, medio(s) de pago, depósito y
  // transporte de ESE lote puntual — no de toda la factura.
  const renderInfoPago = ({ pagos, tipoPago, key }) => {
    const tipoPagoLabel = TIPO_PAGO_LABELS[tipoPago] || null;
    if (pagos.length === 0 && !tipoPagoLabel) return null;

    return (
      <Box key={key} sx={cuadroPunteadoSx}>
        <Stack {...filaDatosProps}>
          {tipoPagoLabel && (
            <Box>
              {etiquetaDato("Pago")} {valorDato(tipoPagoLabel)}
            </Box>
          )}
          {pagos.length > 0 && (
            <Box>
              {etiquetaDato("Medio")}{" "}
              {valorDato(pagos.map((pago) => pago.medio).filter(Boolean).join(" + "))}
            </Box>
          )}
          {pagos.length > 0 && (
            <Box>
              {etiquetaDato("Valor")}{" "}
              {valorDato(
                pagos.map((pago) => formatearMoneda(Number(pago.monto))).filter(Boolean).join(" + "),
              )}
            </Box>
          )}
          {/* Cuando el pago se repartió en más de un medio, el renglón de
              arriba queda como una suma sin resolver ("$100.000 + $27.000"):
              acá va el resultado, para no tener que hacerla de cabeza. */}
          {pagos.length > 1 && (
            <Box>
              {etiquetaDato("Total")}{" "}
              {valorDato(
                formatearMoneda(
                  pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0),
                ),
              )}
            </Box>
          )}
        </Stack>
      </Box>
    );
  };

  if (loading) {
    return <LoadingLogo height="40vh" text="Cargando cliente..." />;
  }

  if (notFound) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" gutterBottom>
          Cliente no encontrado
        </Typography>
        <Button variant="contained" onClick={() => navigate("/vistaclientes")}>
          Volver a Clientes
        </Button>
      </Box>
    );
  }

  const nombreCompleto = obtenerNombreCompleto(cliente);
  const estadoInfo = ESTADO_CLIENTE_INFO[cliente.estado] || ESTADO_CLIENTE_INFO.inactivo;
  const estadoColor = avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
  const telefonoValido = tieneTelefonoValido(cliente.telefono);

  return (
    <Box sx={{ width: "100%" }}>
      {isFullScreen && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/vistaclientes")}
          sx={{ mb: 2, color: acento }}
        >
          Volver a Clientes
        </Button>
      )}

      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          mb: 3,
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => setEditarOpen(true)}
          sx={{ position: "absolute", top: 8, right: 8, color: acento }}
        >
          <EditIcon />
        </IconButton>

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: 28 }} />
            ) : (
              <PersonIcon sx={{ fontSize: 28 }} />
            )}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {nombreCompleto}
            </Typography>
            <Chip
              label={estadoInfo.label}
              variant="estado"
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: estadoColor,
                color: theme.palette.getContrastText(estadoColor),
              }}
            />
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          {telefonoValido ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{cliente.telefono}</Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sin teléfono registrado
            </Typography>
          )}

          {cliente.direccion && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{cliente.direccion}</Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">
          Facturas {facturas.length}
        </Typography>

        <Button
          startIcon={<ReceiptLongIcon />}
          onClick={() => setCrearFacturaOpen(true)}
          sx={{ color: acento, flexShrink: 0 }}
        >
          Crear Factura
        </Button>
      </Stack>

      {facturas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Este cliente no tiene facturas registradas.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {facturas.map((factura) => {
            const facturaEstadoInfo =
              ESTADO_FACTURA_INFO[factura.estado] ||
              (factura.estado ? { label: factura.estado } : { label: "Sin estado" });
            const facturaEstadoColor =
              avatarBgPorEstado[factura.estado] ||
              (theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700]);
            // Formato viejo (migrado del Excel): transporte es un número.
            // Formato nuevo (creado en la app): transporte es el tipo
            // (ej. "Solo ida") y el monto vive aparte en valorTransporte.
            const equiposSonObjetos =
              factura.equipos?.length > 0 && typeof factura.equipos[0] === "object";
            const transporteMonto = formatearMoneda(
              typeof factura.transporte === "number"
                ? factura.transporte
                : factura.valorTransporte,
            );
            const transporteTipo =
              typeof factura.transporte === "string" ? factura.transporte : null;
            // Mismo cálculo compartido que usa Seguimiento de Clientes.
            const ampliacionFactura = calcularAmpliacionFactura(factura);
            // Subtotal e IVA se muestran ya con los días ampliados sumados
            // (menos el descuento): es lo que hoy se le cobraría al cliente,
            // no lo que decía la factura el día que se emitió. Si la factura
            // no traía el dato, se deja vacío como antes en vez de un cero.
            const subtotal = formatearMoneda(
              typeof factura.subtotal === "number"
                ? ampliacionFactura.nuevoSubtotal
                : factura.subtotal,
            );
            const iva = formatearMoneda(
              typeof factura.iva === "number" ? ampliacionFactura.nuevoIva : factura.iva,
            );
            const deposito = formatearMoneda(factura.deposito);
            // El total y el saldo se muestran con los días ampliados ya
            // sumados, igual que el subtotal y el IVA de más arriba. Si no,
            // los renglones de la izquierda no cuadrarían con este total: el
            // guardado en la factura es de antes de la ampliación.
            const valorTotal = formatearMoneda(
              ampliacionFactura.hay
                ? ampliacionFactura.nuevoTotal
                : Number(factura.valorTotal) || 0,
            );
            const saldoPendienteNumero = ampliacionFactura.hay
              ? ampliacionFactura.nuevoSaldo
              : Number(factura.saldoPendiente) || 0;
            const saldoPendiente = formatearMoneda(saldoPendienteNumero);
            const hayColorAlerta = saldoPendienteNumero > 0;
            const fecha = formatearFecha(factura.fecha);
            // Solo importa en móvil (en PC siempre se muestra todo).
            const mostrar = (seccion) => !esMovil || seccionAbierta(factura.id, seccion);
            const renderToggle = (seccion) =>
              esMovil && (
                <IconButton
                  size="small"
                  onClick={() => toggleSeccion(factura.id, seccion)}
                  sx={{ color: acento }}
                >
                  {seccionAbierta(factura.id, seccion) ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              );
            const fechaVencimiento = equiposSonObjetos
              ? null
              : formatearFecha(factura.fechaVencimiento) || factura.fechaVencimientoRaw;

            // Equipos originales (creados con la factura) vs. agregados
            // después con el botón "Agregar equipo" — cada lote muestra su
            // propio pago.
            const equiposOriginales = equiposSonObjetos
              ? factura.equipos.filter((equipo) => !equipo.agregadoPosteriormente)
              : [];
            const equiposAgregados = equiposSonObjetos
              ? factura.equipos.filter((equipo) => equipo.agregadoPosteriormente)
              : [];
            const pagosOriginales = normalizarPagos(
              factura.pagos,
              factura.modoPago,
              factura.montoPagado,
            );

            // Depósito/transporte de TODA la factura = lo del lote original
            // (fijo, no crece) + lo que haya traído cada equipo agregado.
            const depositoAgregadosTotal = equiposAgregados.reduce(
              (total, equipo) => total + (Number(equipo.deposito) || 0),
              0,
            );
            const transporteAgregadosTotal = equiposAgregados.reduce(
              (total, equipo) => total + (Number(equipo.valorTransporte) || 0),
              0,
            );
            const depositoTotalFactura = (Number(factura.deposito) || 0) + depositoAgregadosTotal;
            const transporteTotalFactura =
              (Number(factura.valorTransporte) || 0) + transporteAgregadosTotal;

            // Lo cobrado hasta ahora: el pago inicial más el de cada equipo
            // que se agregó después.
            const totalPagadoFactura =
              pagosOriginales.reduce((total, pago) => total + (Number(pago.monto) || 0), 0) +
              equiposAgregados.reduce(
                (total, equipo) =>
                  total +
                  normalizarPagos(equipo.pagos, equipo.modoPago, null).reduce(
                    (suma, pago) => suma + (Number(pago.monto) || 0),
                    0,
                  ),
                0,
              );

            // Adicionales del lote original: los de la factura, sin sumar
            // los de los equipos agregados (cada lote muestra los suyos).
            // El IVA de un grupo de equipos: cada uno respeta su propia
            // marca y suma también los días que se le ampliaron. Así el
            // recuadro de la factura muestra solo el IVA de sus equipos y
            // cada lote agregado el suyo, sin contarlo dos veces.
            const ivaDeEquipos = (lista) =>
              lista.reduce((total, equipo) => {
                const llevaIva = equipo.aplicaIva ?? Boolean(factura.aplicaIva);
                if (!llevaIva) return total;
                const base =
                  (Number(equipo.cantidad) || 0) *
                    (Number(equipo.dias) || 0) *
                    (Number(equipo.valor) || 0) +
                  calcularAmpliacionEquipo(equipo).neto;
                return total + base * 0.19;
              }, 0);

            const adicionalesFactura = equiposSonObjetos
              ? renderAdicionales({
                  key: "adicionales-factura",
                  iva: ivaDeEquipos(equiposOriginales),
                  deposito: Number(factura.deposito) || 0,
                  transporteTipo,
                  transporteMonto: Number(factura.valorTransporte) || 0,
                })
              : null;

            const lotesAgregados = agruparLotesAgregados(equiposAgregados);

            // Se separan en dos grupos (izquierda: subtotal/iva, derecha:
            // depósito/transporte) para poder acomodarlos en 2 columnas
            // prolijas en móvil, en vez de dejarlos ajustar solos.
            const lineasTotalesIzq = [];
            const lineasTotalesDer = [];
            if (subtotal) {
              lineasTotalesIzq.push(
                <Typography key="subtotal" variant="body2">
                  Subtotal {subtotal}
                </Typography>,
              );
            }
            if (iva) {
              lineasTotalesIzq.push(
                <Typography key="iva" variant="body2">
                  IVA (19%) {iva}
                </Typography>,
              );
            }
            if (equiposSonObjetos) {
              if (depositoTotalFactura > 0) {
                lineasTotalesDer.push(
                  <Typography key="deposito" variant="body2">
                    Depósito {formatearMoneda(depositoTotalFactura)}
                  </Typography>,
                );
              }
              if (transporteTotalFactura > 0) {
                lineasTotalesDer.push(
                  <Typography key="transporte" variant="body2">
                    Transporte {formatearMoneda(transporteTotalFactura)}
                  </Typography>,
                );
              }
            } else {
              if (deposito) {
                lineasTotalesDer.push(
                  <Typography key="deposito" variant="body2">
                    Depósito {deposito}
                  </Typography>,
                );
              }
              if (transporteTipo || transporteMonto) {
                lineasTotalesDer.push(
                  <Typography key="transporte" variant="body2">
                    {transporteTipo === "Sin transporte"
                      ? "Sin transporte"
                      : ["Transporte", transporteTipo, transporteMonto].filter(Boolean).join(" ")}
                  </Typography>,
                );
              }
            }
            const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

            const chipEstado = (
              <Chip
                label={facturaEstadoInfo.label}
                variant="estado"
                size="small"
                onClick={(e) => handleAbrirMenuEstado(e, factura.id)}
                sx={{
                  cursor: "pointer",
                  bgcolor: facturaEstadoColor,
                  color: theme.palette.getContrastText(facturaEstadoColor),
                }}
              />
            );

            const iconBtnSx = {
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 0.5,
            };

            const iconosFactura = (
              <Stack direction="row" spacing={esMovil ? 1.5 : 0.75} alignItems="center">
                {equiposSonObjetos && (
                  <Tooltip title="Agregar equipo">
                    <IconButton
                      size="small"
                      onClick={() => setFacturaAgregarEquipo(factura)}
                      sx={{ ...iconBtnSx, color: acento }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Editar factura">
                  <IconButton
                    size="small"
                    onClick={() => setFacturaEditando(factura)}
                    sx={iconBtnSx}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar factura">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setFacturaEliminando(factura)}
                    sx={iconBtnSx}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );

            return (
              <Box
                key={factura.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" rowGap={1}>
                  <Box>
                    <Typography fontWeight="bold">
                      Factura {factura.numeroFactura ?? "s/n"}
                    </Typography>
                    {/* Antes ocupaba una columna dentro del cuadro de pago. */}
                    {fecha && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        Creada el {fecha}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {!esMovil && iconosFactura}
                    {chipEstado}
                  </Stack>
                </Stack>

                {esMovil && (
                  <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                    {iconosFactura}
                  </Stack>
                )}

                {fechaVencimiento && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Vencimiento: {fechaVencimiento}
                  </Typography>
                )}

                {equiposSonObjetos ? (
                  <>
                    {equiposOriginales.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            Información de pago
                          </Typography>
                          {renderToggle("pagoGeneral")}
                        </Stack>
                        {mostrar("pagoGeneral") &&
                          renderInfoPago({
                            key: "pago-original",
                            pagos: pagosOriginales,
                            tipoPago: factura.tipoPago,
                          })}

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mt: 1 }}
                        >
                          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            Equipos {equiposOriginales.length}
                          </Typography>
                          {renderToggle("equiposFactura")}
                        </Stack>
                        {mostrar("equiposFactura") && (
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                              gap: 1,
                              mt: 1,
                            }}
                          >
                            {equiposOriginales.map((equipo, index) =>
                              renderEquipoRow(equipo, `original-${index}`),
                            )}
                          </Box>
                        )}

                        {mostrar("equiposFactura") && adicionalesFactura && (
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              variant="overline"
                              color="text.secondary"
                              sx={{ display: "block", lineHeight: 1.6 }}
                            >
                              Cargos adicionales
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>{adicionalesFactura}</Box>
                          </Box>
                        )}
                      </Box>
                    )}

                    {equiposAgregados.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ lineHeight: 1.6 }}
                          >
                            Equipos agregados {equiposAgregados.length}
                          </Typography>
                          {renderToggle("equiposAgregados")}
                        </Stack>
                        {/* Cada lote —lo que se agregó de una sola vez— va
                            con sus equipos, después su pago y después sus
                            adicionales. */}
                        {mostrar("equiposAgregados") &&
                          lotesAgregados.map((lote, indiceLote) => {
                            const adicionalesLote = renderAdicionales({
                              key: `lote-adicionales-${indiceLote}`,
                              iva: ivaDeEquipos(lote.equipos),
                              deposito: Number(lote.cabecera.deposito) || 0,
                              transporteTipo: lote.cabecera.transporte || null,
                              transporteMonto: Number(lote.cabecera.valorTransporte) || 0,
                            });

                            return (
                            <Box key={`lote-${indiceLote}`} sx={{ mt: 1 }}>
                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                  gap: 1,
                                }}
                              >
                                {lote.equipos.map((equipo, index) =>
                                  renderEquipoRow(equipo, `agregado-${indiceLote}-${index}`),
                                )}
                              </Box>

                              <Box sx={{ mt: 1 }}>
                                <Typography
                                  variant="overline"
                                  color="text.secondary"
                                  sx={{ display: "block", lineHeight: 1.6 }}
                                >
                                  Información de pago
                                </Typography>
                                {renderInfoPago({
                                  key: `lote-pago-${indiceLote}`,
                                  pagos: normalizarPagos(
                                    lote.cabecera.pagos,
                                    lote.cabecera.modoPago,
                                    null,
                                  ),
                                  tipoPago: lote.cabecera.tipoPago,
                                })}
                              </Box>

                              {adicionalesLote && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                  variant="overline"
                                  color="text.secondary"
                                  sx={{ display: "block", lineHeight: 1.6 }}
                                >
                                    Cargos adicionales
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>{adicionalesLote}</Box>
                                </Box>
                              )}
                            </Box>
                            );
                          })}
                      </Box>
                    )}

                  </>
                ) : (
                  factura.equipos?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {factura.equipos.join(", ")}
                      </Typography>
                    </Box>
                  )
                )}

                {(lineasTotales.length > 0 || valorTotal) && (
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Total factura
                      </Typography>
                      {renderToggle("pagoTotal")}
                    </Stack>
                    {mostrar("pagoTotal") && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          flexWrap: { sm: "wrap" },
                          justifyContent: "space-between",
                          // Arriba, no al fondo: así el subtotal y el IVA
                          // quedan justo debajo del rótulo "Total factura" en
                          // vez de caer al pie del recuadro de estado de
                          // cuenta, que es más alto y dejaba un hueco.
                          alignItems: { xs: "stretch", sm: "flex-start" },
                          gap: 2,
                        }}
                      >
                        {esMovil ? (
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              columnGap: 2,
                              rowGap: 0.5,
                            }}
                          >
                            <Stack spacing={0.5}>{lineasTotalesIzq}</Stack>
                            <Stack spacing={0.5}>{lineasTotalesDer}</Stack>
                          </Box>
                        ) : (
                          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
                            {lineasTotales}
                          </Stack>
                        )}

                        {/* La misma pizarra de totales que usa Seguimiento:
                            el aspecto y los colores salen del tema, así los
                            dos lugares se ven igual.

                            El rótulo y la pizarra van dentro de un mismo
                            bloque: sueltos eran dos elementos del contenedor
                            flex y cada ancho de pantalla los acomodaba en un
                            lugar distinto. */}
                        <Box
                          sx={{
                            width: { xs: "100%", sm: "auto" },
                            // Pegado a la derecha aunque baje de línea: cuando
                            // la factura tiene depósito y transporte, esa fila
                            // se llena y el recuadro pasa al renglón de abajo,
                            // donde quedaba solo y se iba a la izquierda.
                            ml: { sm: "auto" },
                          }}
                        >
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ display: "block", lineHeight: 1.6 }}
                          >
                            Estado de cuenta
                          </Typography>
                          <Paper
                            variant="totales"
                            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 240 } }}
                          >
                          {valorTotal && (
                            <Box className="fila total">
                              <Typography variant="subtitle1" fontWeight="bold">
                                Total factura
                              </Typography>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {valorTotal}
                              </Typography>
                            </Box>
                          )}
                          {/* Lo ya cobrado. Solo aparece cuando queda saldo:
                              con la factura saldada sería el mismo número del
                              total, repetido dos veces. */}
                          {hayColorAlerta && (
                            <Box className="fila">
                              <Typography variant="body2">Pagado</Typography>
                              <Typography variant="body2">
                                {formatearMoneda(totalPagadoFactura)}
                              </Typography>
                            </Box>
                          )}

                          <Box
                            className={hayColorAlerta ? "fila alerta" : "fila ok"}
                            sx={{ mt: 1, mb: 0 }}
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
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      <ClienteFormDialog
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
        onGuardado={fetchCliente}
        onEliminado={() => navigate("/vistaclientes")}
        cliente={cliente}
      />

      <FacturaFormDialog
        open={crearFacturaOpen}
        onClose={() => setCrearFacturaOpen(false)}
        cliente={cliente}
        onGuardado={() => fetchCliente(true)}
      />

      <FacturaFormDialog
        open={Boolean(facturaEditando)}
        onClose={() => setFacturaEditando(null)}
        cliente={cliente}
        factura={facturaEditando}
        onGuardado={() => fetchCliente(true)}
      />

      <AgregarEquipoDialog
        open={Boolean(facturaAgregarEquipo)}
        onClose={() => setFacturaAgregarEquipo(null)}
        cliente={cliente}
        factura={facturaAgregarEquipo}
        onAgregado={() => fetchCliente(true)}
      />

      <Dialog open={Boolean(facturaEliminando)} onClose={() => setFacturaEliminando(null)}>
        <DialogTitle sx={{ color: acento }}>Eliminar factura</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la factura{" "}
            {facturaEliminando?.numeroFactura ?? "s/n"}? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button onClick={() => setFacturaEliminando(null)} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminarFactura} disabled={eliminando}>
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuEstadoAnchor}
        open={Boolean(menuEstadoAnchor)}
        onClose={handleCerrarMenuEstado}
      >
        <MenuItem onClick={() => handleCambiarEstadoFactura("pendienteDespacho")}>
          Pendiente despacho
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("despachada")}>
          Despachada
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("devolucionParcial")}>
          Devolución parcial
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("finalizada")}>
          Finalizada
        </MenuItem>
      </Menu>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
