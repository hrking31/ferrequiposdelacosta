import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import { setCotizacionActual } from "../../Store/Slices/cotizacionSlice.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import useSnackbar from "../../Hooks/useSnackbar";
import VistaCotPdf from "../VistaPdf/VistaCotPdf";
import {
  calcularStatusPrevio,
  etiquetaEstado,
} from "../../Utils/estadoDocumento";
import { usePantallaCompacta, usePantallaBaja } from "../../Utils/pantalla";
import {
  eliminarCotizacion,
  escucharCotizaciones,
  leerCotizaciones,
  marcarCotizacionEnProceso,
} from "./cotizacionesDb";

// Cómo se pinta cada uno de los cuatro momentos por los que pasa una
// solicitud. El nombre sale de Utils/cotizacionEstado, que es donde viven los
// estados; acá solo se elige el icono y el color del chip.
const ESTILO_ESTADO = {
  creada: { Icono: CheckCircleIcon, color: "success" },
  pendiente: { Icono: PendingActionsIcon, color: "warning" },
  enProceso: { Icono: AutorenewIcon, color: "info" },
  pausada: { Icono: PauseCircleOutlineIcon, color: "default" },
};

const estadoDe = (status) => ({
  label: etiquetaEstado(status),
  ...(ESTILO_ESTADO[status] || {
    Icono: PendingActionsIcon,
    color: "default",
  }),
});

export default function KioskAdminCotizaciones() {
  const theme = useTheme();
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const esCelular = usePantallaCompacta();
  // EL CELULAR ACOSTADO. De alto quedan unos 390px, y el buscador, los filtros
  // y el renglón del conteo se llevaban casi todo: a las solicitudes les
  // quedaba una franja donde no cabía ni una. Con la pantalla así de baja se
  // desplaza todo junto, filtros incluidos.
  const altoCorto = usePantallaBaja();
  // Acento del modo: naranja en claro, amarillo en oscuro.
  const acento = theme.palette.custom.accent;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { name, uid, role } = useSelector((state) => state.user);
  // Borrar una solicitud no se deshace, así que queda solo en manos del
  // administrador — en cualquier estado, incluso las ya emitidas.
  const esAdministrador = role === "administrador";
  const usuariosConectados = useSelector(
    (state) => state.presence.usuariosConectados || {},
  );
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  // La primera tanda llega en vivo y se reemplaza entera con cada cambio; las
  // que trae "Cargar más" van aparte, o cada aviso del servidor las borraría.
  //
  // Antes esta lista venía de Redux, donde App.jsx dejaba TODAS las
  // cotizaciones que existían. Ahora la pantalla pide lo suyo: de a 50, como el
  // buscador de cuentas de cobro.
  const [cotizaciones, setCotizaciones] = useState([]);
  const [masCotizaciones, setMasCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  // El último documento crudo de Firestore: con él se pide la tanda siguiente.
  const [ultimo, setUltimo] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // La primera tanda se ESCUCHA, no se lee una vez: así entra sola la solicitud
  // que acaba de llegar de la tienda, y se ve "En Proceso" cuando otra persona
  // abre una, sin recargar la pantalla.
  useEffect(() => {
    const dejarDeEscuchar = escucharCotizaciones(
      (tanda) => {
        setCotizaciones(tanda.cotizaciones);
        setUltimo(tanda.ultimo);
        setHayMas(tanda.hayMas);
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar las solicitudes:", error);
        showSnackbar(
          `No se pudieron cargar las solicitudes: ${error.message}`,
          "error",
        );
        setCargando(false);
      },
    );

    return dejarDeEscuchar;
    // Solo al montar: las tandas siguientes las pide el botón de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarMas = async () => {
    setCargandoMas(true);
    try {
      const tanda = await leerCotizaciones(ultimo);
      setMasCotizaciones((previas) => [...previas, ...tanda.cotizaciones]);
      setUltimo(tanda.ultimo);
      setHayMas(tanda.hayMas);
    } catch (error) {
      console.error("Error al cargar más solicitudes:", error);
      showSnackbar(`No se pudieron cargar más: ${error.message}`, "error");
    } finally {
      setCargandoMas(false);
    }
  };

  const todas = useMemo(
    () => [...cotizaciones, ...masCotizaciones],
    [cotizaciones, masCotizaciones],
  );

  const busquedaLower = busqueda.trim().toLowerCase();

  // El filtro corre sobre lo que ya está cargado, no sobre la base: lo que
  // todavía no se trajo con "Cargar más" no se encuentra buscando.
  const cotizacionesFiltradas = useMemo(
    () =>
      todas.filter((quotation) => {
        if (filtroTipo !== "todos" && quotation.tipo !== filtroTipo) return false;
        if (!busquedaLower) return true;
        const nombre = (quotation.empresa || "").toLowerCase();
        const telefono = (quotation.telefono || "").toLowerCase();
        return nombre.includes(busquedaLower) || telefono.includes(busquedaLower);
      }),
    [todas, filtroTipo, busquedaLower],
  );

  const handleOpenQuotation = async (quotation) => {
    try {
      // De dónde viene: si se sale sin dejar cambios, vuelve a este estado.
      // Hay que anotarlo ahora, porque en un segundo su estado será
      // "enProceso" y el anterior ya no se podría saber.
      const statusPrevio = calcularStatusPrevio(quotation);

      await marcarCotizacionEnProceso(quotation.id, statusPrevio, { name, uid });

      dispatch(
        setCotizacionActual({
          ...quotation,
          status: "enProceso",
          statusPrevio,
          atendidoPor: name,
          atendidoPorUid: uid,
        }),
      );

      navigate("/vistacotizacion");
    } catch (error) {
      console.error("Error al abrir la cotización:", error);
      showSnackbar(`No se pudo abrir la solicitud: ${error.message}`, "error");
    }
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarCotizacion(aEliminar.id);
      // La primera tanda se corrige sola, que está escuchando; las traídas con
      // "Cargar más" hay que sacarlas a mano.
      setMasCotizaciones((previas) =>
        previas.filter((cotizacion) => cotizacion.id !== aEliminar.id),
      );
      setAEliminar(null);
      showSnackbar("Solicitud eliminada.", "success");
    } catch (error) {
      console.error("Error eliminando solicitud:", error);
      showSnackbar(`Error al eliminar: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  const buscador = (
    <BuscadorFiltro
      value={busqueda}
      onChange={setBusqueda}
      placeholder="Buscar cliente..."
    />
  );

  const contador = (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
    >
      {/* En celular, solo "50 de 50": al lado izquierdo ya dice de qué lista
          se trata, así que la palabra sobraba. En computador va sola y sí
          necesita decir de qué son. */}
      {cotizacionesFiltradas.length} de {todas.length}
      {esCelular ? "" : " solicitudes"}
    </Typography>
  );

  // Los tres filtros de tipo de cliente.
  const chipsTipo = (
    // En celular los tres se reparten el ancho de la pantalla: sueltos a la
    // izquierda dejaban un hueco vacío a la derecha y cada uno medía según el
    // largo de su palabra.
    <Stack
      direction="row"
      spacing={1}
      sx={{
        flexShrink: 0,
        ...(esCelular && { "& > *": { flex: 1, minWidth: 0 } }),
      }}
    >
      <Chip
        label="Todos"
        clickable
        onClick={() => setFiltroTipo("todos")}
        variant={filtroTipo === "todos" ? "filled" : "outlined"}
        sx={
          filtroTipo === "todos"
            ? {
                bgcolor: acento,
                color: theme.palette.getContrastText(acento),
                "&:hover": { bgcolor: acento },
                "&.Mui-focusVisible": { bgcolor: acento },
              }
            : undefined
        }
      />
      <Chip
        icon={<PersonIcon />}
        label="Personas"
        clickable
        onClick={() => setFiltroTipo("persona")}
        variant={filtroTipo === "persona" ? "filled" : "outlined"}
        sx={
          filtroTipo === "persona"
            ? {
                bgcolor: acento,
                color: theme.palette.getContrastText(acento),
                "& .MuiChip-icon": { color: "inherit" },
                // Conserva su color: sin esto MUI le superpone un tinte
                // al pasar el mouse y otro mientras tiene el foco.
                "&:hover": { bgcolor: acento },
                "&.Mui-focusVisible": { bgcolor: acento },
              }
            : undefined
        }
      />
      <Chip
        icon={<BusinessIcon />}
        label="Empresas"
        clickable
        onClick={() => setFiltroTipo("empresa")}
        variant={filtroTipo === "empresa" ? "filled" : "outlined"}
        sx={
          filtroTipo === "empresa"
            ? {
                bgcolor: acento,
                color: theme.palette.getContrastText(acento),
                "& .MuiChip-icon": { color: "inherit" },
                // Conserva su color: sin esto MUI le superpone un tinte
                // al pasar el mouse y otro mientras tiene el foco.
                "&:hover": { bgcolor: acento },
                "&.Mui-focusVisible": { bgcolor: acento },
              }
            : undefined
        }
      />
    </Stack>
  );

  if (cargando) {
    return <LoadingLogo height="40vh" text="Cargando solicitudes..." />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        backgroundColor: (theme) => theme.palette.background.default,
        transition: "background-color 0.3s ease",
        // Acostado el celular el scroll lo manda esta caja y se desplaza todo
        // junto, filtros incluidos: dos áreas que se desplazan, una dentro de
        // la otra, se pelean el dedo.
        ...(altoCorto
          ? { overflowY: "auto" }
          : { display: "flex", flexDirection: "column" }),
      }}
    >
      {/* Sin solicitudes no hay nada que buscar ni que filtrar, pero el botón
          de menú tiene que quedar: desde que se fue el pie, es el camino de
          vuelta en el celular. */}
      {todas.length === 0 && esCelular && (
        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ mb: 1.5, flexShrink: 0 }}
        >
          <Tooltip title="Menú">
            <IconButton
              onClick={() => navigate("/adminforms")}
              aria-label="Menú"
              color="primary"
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      {todas.length > 0 &&
        (esCelular ? (
          // EN CELULAR, TRES RENGLONES: el buscador con el botón de menú al
          // lado —que antes era un botón ancho al pie—, los filtros debajo y,
          // al final, qué lista es y cuántas se están viendo. Antes iban los
          // tres apilados sin orden, con el conteo en el medio.
          <Stack spacing={1} sx={{ mb: 1.5, flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
              <Tooltip title="Menú">
                <IconButton
                  onClick={() => navigate("/adminforms")}
                  aria-label="Menú"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            {chipsTipo}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ gap: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Lista de solicitudes
              </Typography>
              {contador}
            </Stack>
          </Stack>
        ) : (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {buscador}
            {contador}
            {chipsTipo}
          </Stack>
        ))}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          ...(altoCorto
            ? undefined
            : { flex: 1, minHeight: 0, overflowY: "auto" }),
        }}
      >
      {todas.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}
        >
          No hay solicitudes de cotización pendientes...
        </Typography>
      ) : cotizacionesFiltradas.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}
        >
          No se encontraron cotizaciones con esos filtros.
        </Typography>
      ) : (
        cotizacionesFiltradas.map((quotation) => {
          const estado = estadoDe(quotation.status);

          // Abrir la solicitud es siempre la misma acción; lo que cambia es
          // cómo se llama según en qué punto quedó.
          let tituloAbrir = null;

          if (quotation.status === "creada") {
            tituloAbrir = "Editar";
          } else if (quotation.status === "pausada") {
            tituloAbrir = "Continuar cotización";
          } else if (quotation.status === "pendiente") {
            tituloAbrir = "Crear cotización";
          } else if (quotation.status === "enProceso") {
            const laTengoYo = quotation.atendidoPor === name;
            const asesorEstaConectado =
              usuariosConectados[quotation.atendidoPorUid]?.online === true;

            if (laTengoYo) {
              tituloAbrir = "Retomar cotización";
            } else if (!asesorEstaConectado) {
              // La tiene otra persona pero está desconectada: se puede
              // asumir. Si está conectada no se ofrece, para no pisarle el
              // trabajo.
              tituloAbrir = "Asumir gestión";
            }
          }

          // Solo las emitidas tienen un documento que descargar.
          const puedeDescargar =
            quotation.status === "creada" &&
            Array.isArray(quotation.items) &&
            quotation.items.length > 0;

          const hayAcciones =
            Boolean(tituloAbrir) || puedeDescargar || esAdministrador;

          // Las piezas de la tarjeta, sueltas: en el celular se arman en otro
          // orden —las acciones arriba, a la derecha— y así la tarjeta no hay
          // que escribirla dos veces.
          const avatar = (
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: esCelular ? 40 : 56,
                height: esCelular ? 40 : 56,
                flexShrink: 0,
              }}
            >
              {quotation.tipo === "empresa" ? (
                <BusinessIcon
                  sx={{
                    fontSize: esCelular ? 24 : 32,
                    color: "primary.contrastText",
                  }}
                />
              ) : (
                <PersonIcon
                  sx={{
                    fontSize: esCelular ? 24 : 32,
                    color: "primary.contrastText",
                  }}
                />
              )}
            </Avatar>
          );

          // Sin rótulo "Nombre"/"Empresa": el icono del avatar ya dice de cuál
          // de los dos se trata.
          const identidad = (
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Typography
                variant="h5"
                noWrap
                sx={{
                  color: (theme) => theme.palette.text.primary,
                  textOverflow: "ellipsis",
                }}
              >
                {quotation.empresa || "Cliente sin nombre"}
              </Typography>

              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Solicitud ID: {quotation.cotizacionId}
              </Typography>
            </Box>
          );

          const chipEstado = (
            <Chip
              size="small"
              icon={<estado.Icono />}
              label={estado.label}
              color={estado.color}
              variant="outlined"
            />
          );

          // Quién la tiene abierta, con el punto latiendo mientras esa persona
          // siga conectada.
          const atendidoPor = quotation.status === "enProceso" &&
            quotation.atendidoPor && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.primary",
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: usuariosConectados[
                      quotation.atendidoPorUid
                    ]?.online
                      ? theme.palette.custom.online
                      : theme.palette.grey[500],
                    display: "inline-block",
                    position: "relative",
                    flexShrink: 0,
                    ...(usuariosConectados[quotation.atendidoPorUid]?.online && {
                      "&::after": {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        animation: "pulseDot 1.5s infinite ease-in-out",
                        border: `1px solid ${theme.palette.custom.online}`,
                        content: '""',
                      },
                    }),
                    "@keyframes pulseDot": {
                      "0%": { transform: "scale(0.8)", opacity: 1 },
                      "100%": { transform: "scale(2.5)", opacity: 0 },
                    },
                  }}
                />
                <span>
                  Atendido por: <strong>{quotation.atendidoPor}</strong>
                </span>
              </Typography>
            );

          const acciones = (
            <>
              {tituloAbrir && (
                <Tooltip title={tituloAbrir}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenQuotation(quotation)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {puedeDescargar && (
                <Tooltip title="Descargar PDF">
                  <IconButton
                    size="small"
                    onClick={() => VistaCotPdf(quotation)}
                  >
                    <PictureAsPdfIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {esAdministrador && (
                <Tooltip title="Eliminar">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setAEliminar(quotation)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );

          const datos = (
            <Stack spacing={1.5} sx={{ width: "100%" }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <BadgeIcon fontSize="small" sx={{ color: "text.secondary" }} />
                <Typography variant="body2">
                  <b>Identificación:</b> {quotation.nit}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" gap={1.5}>
                <PhoneIcon fontSize="small" sx={{ color: "text.secondary" }} />
                <Typography variant="body2">
                  <b>Teléfono:</b> {quotation.telefono}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" gap={1.5}>
                <LocationOnIcon
                  fontSize="small"
                  sx={{ color: "text.secondary" }}
                />
                <Typography variant="body2">
                  <b>Dirección:</b> {quotation.direccion}
                </Typography>
              </Stack>
            </Stack>
          );

          return (
            <Card
              key={quotation.id}
              sx={{
                position: "relative",
                overflow: "visible",
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: (theme) =>
                  `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
                outline: "1px solid transparent",
                willChange: "transform, box-shadow",
                transition:
                  "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease",
                "&:hover": {
                  transform: "translateY(0)",
                  outlineColor: "custom.accent",
                  boxShadow: (theme) => theme.palette.custom.sombraTarjetaHover,
                },

                "&:not(:hover)": {
                  transform: "translateY(0)",
                },
              }}
            >
              {/* Barra superior */}
              <Box
                sx={{
                  height: 6,
                  backgroundColor: "custom.accent",
                  borderRadius: (theme) =>
                    `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
                }}
              />

              <CardContent
                sx={{
                  p: esCelular ? 2 : 3,
                  "&:last-child": { pb: esCelular ? 2 : 3 },
                }}
              >
                {esCelular ? (
                  // EN CELULAR LOS BOTONES VAN ARRIBA, A LA DERECHA: al pie se
                  // llevaban un renglón entero para tres iconos, y el estado
                  // otro más. Acá el estado queda bajo el número y la tarjeta
                  // se acorta como dos renglones.
                  <Stack direction="row" alignItems="flex-start" gap={1.5}>
                    {avatar}

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      {identidad}

                      <Stack
                        direction="row"
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{ gap: 0.5, mt: 0.5 }}
                      >
                        {chipEstado}
                        {atendidoPor}
                      </Stack>
                    </Box>

                    {hayAcciones && (
                      <Stack
                        direction="row"
                        spacing={0.25}
                        sx={{ flexShrink: 0 }}
                      >
                        {acciones}
                      </Stack>
                    )}
                  </Stack>
                ) : (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                    gap={2}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={2}
                      sx={{ width: "100%", overflow: "hidden" }}
                    >
                      {avatar}
                      {identidad}
                    </Stack>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      {chipEstado}
                      {atendidoPor}
                    </Box>
                  </Stack>
                )}

                <Divider sx={{ my: esCelular ? 1.5 : 2 }} />

                {/* Datos de contacto; en el computador, las acciones al lado. */}
                {esCelular ? (
                  datos
                ) : (
                  <Stack
                    direction="row"
                    spacing={4}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    {datos}

                    {hayAcciones && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexShrink: 0 }}
                      >
                        {acciones}
                      </Stack>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* La lista trae de a tandas: la colección crece para siempre y traerla
          entera sería cada vez más lenta y más cara. Ojo: el buscador de
          arriba solo ve lo que ya se cargó. */}
      {hayMas && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <Button variant="outlined" onClick={cargarMas} disabled={cargandoMas}>
            {cargandoMas ? "Cargando..." : "Cargar más"}
          </Button>
        </Box>
      )}
      </Box>

      <Dialog open={Boolean(aEliminar)} onClose={() => setAEliminar(null)}>
        <DialogTitle sx={{ color: acento }}>Eliminar solicitud</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la solicitud{" "}
            {aEliminar?.cotizacionId} de{" "}
            {aEliminar?.empresa || "cliente sin nombre"}? Esta acción no se
            puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setAEliminar(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminar}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
