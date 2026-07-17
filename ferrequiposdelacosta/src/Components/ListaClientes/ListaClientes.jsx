import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "./ClienteFormDialog";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "activo", label: "Despachados", color: "#81C784" },
  { valor: "moroso", label: "Morosos", color: "#E57373" },
  { valor: "inactivo", label: "Entregados", color: "#9E9E9E" },
  { valor: "revisar", label: "Revisar", color: "#FFB74D" },
];

const FILTROS_TIPO = [
  { valor: "todos", label: "Cualquiera" },
  { valor: "persona", label: "Personas", icono: PersonIcon },
  { valor: "empresa", label: "Empresas", icono: BusinessIcon },
];

const ESTADO_INFO = {
  activo: { label: "Despachado", chipColor: "success" },
  moroso: { label: "Moroso", chipColor: "error" },
  inactivo: { label: "Entregado", chipColor: "default" },
  revisar: { label: "Revisar", chipColor: "warning" },
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

const TAMANO_PAGINA_MOVIL = 20;
const TAMANO_PAGINA_PC = 9;
const ALTO_FILA = 45;

export default function ListaClientes() {
  const theme = useTheme();
  const navigate = useNavigate();
  const esMovil = useMediaQuery("(max-width:915px)");
  const ocultarSidebar = useMediaQuery("(max-width:1150px)");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cantidadVisible, setCantidadVisible] = useState(TAMANO_PAGINA_MOVIL);
  const [crearClienteOpen, setCrearClienteOpen] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "clientes"));
      const lista = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setClientes(lista);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
      showSnackbar("Error al cargar la lista de clientes", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const acento =
    theme.palette.mode === "light"
      ? theme.palette.primary.main
      : theme.palette.secondary.light;

  const avatarBgPorEstado = {
    activo: theme.palette.success.main,
    moroso: theme.palette.error.main,
    revisar: theme.palette.warning.main,
    inactivo:
      theme.palette.mode === "light"
        ? theme.palette.grey[400]
        : theme.palette.grey[700],
  };

  const clientesPorTipoYBusqueda = useMemo(() => {
    const busquedaLower = busqueda.toLowerCase();
    return clientes.filter((cliente) => {
      const coincideTipo = filtroTipo === "todos" || cliente.tipo === filtroTipo;
      const nombreCompleto = obtenerNombreCompleto(cliente);
      const coincideBusqueda =
        nombreCompleto.toLowerCase().includes(busquedaLower) ||
        (cliente.telefono || "").toLowerCase().includes(busquedaLower);
      return coincideTipo && coincideBusqueda;
    });
  }, [clientes, busqueda, filtroTipo]);

  const filtroEstadoActivoLabel =
    filtroEstado === "todos" ? null : FILTROS.find((f) => f.valor === filtroEstado)?.label;

  const conteosPorEstado = useMemo(() => {
    const conteo = { todos: clientesPorTipoYBusqueda.length };
    clientesPorTipoYBusqueda.forEach((cliente) => {
      conteo[cliente.estado] = (conteo[cliente.estado] || 0) + 1;
    });
    return conteo;
  }, [clientesPorTipoYBusqueda]);

  const clientesFiltrados = useMemo(() => {
    if (filtroEstado === "todos") return clientesPorTipoYBusqueda;
    return clientesPorTipoYBusqueda.filter((cliente) => cliente.estado === filtroEstado);
  }, [clientesPorTipoYBusqueda, filtroEstado]);

  useEffect(() => {
    setPagina(1);
    setCantidadVisible(TAMANO_PAGINA_MOVIL);
  }, [busqueda, filtroEstado, filtroTipo]);

  const tamanoPaginaActual = esMovil ? TAMANO_PAGINA_MOVIL : TAMANO_PAGINA_PC;
  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / tamanoPaginaActual));
  const inicioMostrado = clientesFiltrados.length === 0 ? 0 : (pagina - 1) * tamanoPaginaActual + 1;
  const finMostrado = Math.min(pagina * tamanoPaginaActual, clientesFiltrados.length);

  const clientesVisibles = useMemo(() => {
    if (esMovil) return clientesFiltrados.slice(0, cantidadVisible);
    const inicio = (pagina - 1) * TAMANO_PAGINA_PC;
    return clientesFiltrados.slice(inicio, inicio + TAMANO_PAGINA_PC);
  }, [clientesFiltrados, esMovil, cantidadVisible, pagina]);

  const botonAgregar = (
    <Button
      variant="contained"
      startIcon={<PersonAddAlt1Icon />}
      onClick={() => setCrearClienteOpen(true)}
      sx={{
        flexShrink: 0,
        whiteSpace: "nowrap",
        bgcolor: acento,
        color: theme.palette.getContrastText(acento),
        "&:hover": { bgcolor: acento, opacity: 0.9 },
        borderRadius: 999,
      }}
    >
      Nuevo Cliente
    </Button>
  );

  const buscador = (
    <TextField
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      placeholder="Buscar clientes..."
      fullWidth
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: busqueda && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setBusqueda("")} edge="end">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        sx: { borderRadius: 999 },
      }}
    />
  );

  const chipsEstado = (direction) =>
      FILTROS.map((filtro) => {
        const seleccionado = filtroEstado === filtro.valor;
        const conteo = conteosPorEstado[filtro.valor] || 0;
        const colorSeleccionado = filtro.color || acento;
        const contraste = theme.palette.getContrastText(colorSeleccionado);
        return (
          <Chip
            key={filtro.valor}
            clickable
            onClick={() => setFiltroEstado(filtro.valor)}
            label={
              direction === "row" ? (
                filtro.label
              ) : (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                  <Box component="span">{filtro.label}</Box>
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20,
                      height: 20,
                      px: 0.75,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: seleccionado ? "rgba(255,255,255,0.3)" : "action.selected",
                      color: seleccionado ? contraste : "text.secondary",
                    }}
                  >
                    {conteo}
                  </Box>
                </Stack>
              )
            }
            icon={
              filtro.color && !seleccionado ? (
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: filtro.color,
                    ml: "10px",
                  }}
                />
              ) : undefined
            }
            variant={seleccionado ? "filled" : "outlined"}
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              ...(direction === "row"
                ? {}
                : { width: "100%", justifyContent: "flex-start", "& .MuiChip-label": { width: "100%" } }),
              ...(seleccionado && {
                bgcolor: colorSeleccionado,
                color: contraste,
                "& .MuiChip-icon": { ml: "10px" },
              }),
            }}
          />
        );
      });

  const renderFiltrosEstado = (direction) => (
    <Stack
      direction={direction}
      spacing={1}
      sx={
        direction === "row"
          ? {
              overflowX: "auto",
              pb: 0.5,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }
          : {}
      }
    >
      {chipsEstado(direction)}
    </Stack>
  );

  const chipsTipo = (direction) =>
      FILTROS_TIPO.map((filtro) => {
        const seleccionado = filtroTipo === filtro.valor;
        const IconoFiltro = filtro.icono;
        return (
          <Chip
            key={filtro.valor}
            clickable
            onClick={() => setFiltroTipo(filtro.valor)}
            label={filtro.label}
            icon={IconoFiltro ? <IconoFiltro sx={{ fontSize: 16 }} /> : undefined}
            variant={seleccionado ? "filled" : "outlined"}
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              ...(direction === "row" ? {} : { width: "100%", justifyContent: "flex-start" }),
              ...(seleccionado && {
                bgcolor: acento,
                color: theme.palette.getContrastText(acento),
                "& .MuiChip-icon": { color: "inherit" },
              }),
            }}
          />
        );
      });

  const renderFiltrosTipo = (direction) => (
    <Stack
      direction={direction}
      spacing={1}
      sx={
        direction === "row"
          ? { overflowX: "auto", pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }
          : {}
      }
    >
      {chipsTipo(direction)}
    </Stack>
  );

  const etiquetaFiltro = (texto) => (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, pl: 0.5 }}>
      {texto}
    </Typography>
  );

  const renderFiltrosCombinados = (comportamiento) => (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={
        comportamiento === "scroll"
          ? {
              minWidth: 0,
              overflowX: "auto",
              pb: 1,
              WebkitOverflowScrolling: "touch",
              transform: "translateZ(0)",
              scrollbarWidth: "thin",
              scrollbarColor: `${alpha(acento, 0.4)} transparent`,
              "&::-webkit-scrollbar": {
                height: 6,
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(acento, 0.4),
                borderRadius: 999,
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: alpha(acento, 0.7),
              },
              "@media (pointer: coarse)": {
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": { display: "none" },
              },
            }
          : { flexWrap: "wrap", rowGap: 1 }
      }
    >
      {chipsEstado("row")}
      <Divider orientation="vertical" flexItem sx={{ flexShrink: 0, my: 0.5 }} />
      {chipsTipo("row")}
    </Stack>
  );

  const buscadorYFiltros = (
    <>
      {buscador}
      {renderFiltrosCombinados("scroll")}
    </>
  );

  const listaVacia = (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
      No se encontraron clientes.
    </Typography>
  );

  const listaCargando = (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );

  if (esMovil) {
    return (
      <Box sx={{ width: "100%" }}>
        <Stack spacing={2}>
          {buscadorYFiltros}

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight="bold">
              Lista de Clientes
            </Typography>
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {filtroEstadoActivoLabel && `${filtroEstadoActivoLabel} `}
                {clientesFiltrados.length} de {clientes.length}
              </Typography>
            )}
          </Stack>

          {loading
            ? listaCargando
            : clientesFiltrados.length === 0
              ? listaVacia
              : (
                <Stack spacing={1.25}>
                  {clientesVisibles.map((cliente) => {
                    const estadoInfo = ESTADO_INFO[cliente.estado] || ESTADO_INFO.inactivo;
                    const nombreCompleto = obtenerNombreCompleto(cliente);
                    const telefonoValido = tieneTelefonoValido(cliente.telefono);
                    const numeroWhatsapp = telefonoValido
                      ? String(cliente.telefono).replace(/\D/g, "")
                      : "";
                    const necesitaRevisionTipo =
                      cliente.revisar && cliente.estado !== "revisar";

                    return (
                      <Box
                        key={cliente.id}
                        sx={{
                          p: 1.25,
                          borderRadius: 3,
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          boxShadow: 1,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ position: "relative" }}>
                              <Avatar
                                sx={{
                                  bgcolor: avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                {cliente.tipo === "empresa" ? (
                                  <BusinessIcon sx={{ fontSize: 20 }} />
                                ) : (
                                  <PersonIcon sx={{ fontSize: 20 }} />
                                )}
                              </Avatar>
                              {necesitaRevisionTipo && (
                                <Tooltip title={cliente.motivoRevision || "Verificar datos de este cliente"}>
                                  <ErrorOutlineIcon
                                    sx={{
                                      position: "absolute",
                                      bottom: -2,
                                      right: -2,
                                      fontSize: 16,
                                      color: "warning.main",
                                      bgcolor: "background.paper",
                                      borderRadius: "50%",
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>

                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {nombreCompleto}
                              </Typography>

                              {telefonoValido ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {cliente.telefono}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    component="a"
                                    href={`https://wa.me/${numeroWhatsapp}`}
                                    target="_blank"
                                    rel="noopener"
                                    sx={{
                                      bgcolor: "#25D366",
                                      color: "#FFFFFF",
                                      width: 18,
                                      height: 18,
                                      ml: 0.5,
                                      "&:hover": { bgcolor: "#128C7E" },
                                    }}
                                  >
                                    <WhatsAppIcon sx={{ fontSize: 11 }} />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Sin teléfono registrado
                                </Typography>
                              )}

                              {cliente.direccion && (
                                <Typography variant="caption" color="text.secondary" component="div">
                                  {cliente.direccion}
                                </Typography>
                              )}
                            </Box>
                          </Stack>

                          <Chip
                            label={estadoInfo.label}
                            color={estadoInfo.chipColor}
                            size="small"
                            sx={{ fontWeight: "bold", textTransform: "uppercase" }}
                          />
                        </Stack>

                        <Divider sx={{ my: 0.75 }} />

                        <Box sx={{ textAlign: "right" }}>
                          <Button
                            size="small"
                            endIcon={<ChevronRightIcon />}
                            sx={{ color: acento, minHeight: 0, py: 0.25 }}
                            onClick={() => navigate(`/vistaclientes/${cliente.id}`)}
                          >
                            Ver Detalles
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}

          {!loading && cantidadVisible < clientesFiltrados.length && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setCantidadVisible((prev) => prev + TAMANO_PAGINA_MOVIL)}
                sx={{ color: acento, borderColor: acento }}
              >
                Cargar más
              </Button>
            </Box>
          )}
        </Stack>

        <Fab
          onClick={() => setCrearClienteOpen(true)}
          sx={{
            position: "fixed",
            bottom: 120,
            right: 24,
            bgcolor: acento,
            color: theme.palette.getContrastText(acento),
            "&:hover": { bgcolor: acento, opacity: 0.9 },
          }}
        >
          <PersonAddAlt1Icon />
        </Fab>

        <ClienteFormDialog
          open={crearClienteOpen}
          onClose={() => setCrearClienteOpen(false)}
          onGuardado={fetchClientes}
        />

        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", gap: 3, p: 1.5 }}>
      {!ocultarSidebar && (
        <Box
          sx={{
            width: "clamp(180px, 20vw, 260px)",
            minWidth: 180,
            flexShrink: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "auto",
          }}
        >
          <Box sx={{ height: 48, flexShrink: 0 }} />
          {etiquetaFiltro("Estado")}
          {renderFiltrosEstado("column")}
          {etiquetaFiltro("Tipo")}
          {renderFiltrosTipo("column")}
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          minWidth: ocultarSidebar ? 0 : 480,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!ocultarSidebar && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            flexWrap="wrap"
            rowGap={1}
            sx={{ mb: 1.5, flexShrink: 0 }}
          >
            <Typography variant="h6" fontWeight="bold" sx={{ flexShrink: 0 }}>
              Lista de Clientes
            </Typography>
            <Box sx={{ flex: 1, minWidth: 150 }}>{buscador}</Box>
            {!loading && (
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                {clientesFiltrados.length} de {clientes.length} clientes
              </Typography>
            )}
            {botonAgregar}
          </Stack>
        )}

        {ocultarSidebar && (
          <Stack spacing={1.5} sx={{ mb: 1.5, flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" rowGap={1}>
              <Box sx={{ flex: 1, minWidth: 150 }}>{buscador}</Box>
              {botonAgregar}
            </Stack>
            {renderFiltrosCombinados("wrap")}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">
                Lista de Clientes
              </Typography>
              {!loading && (
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                  {clientesFiltrados.length} de {clientes.length} clientes
                </Typography>
              )}
            </Stack>
          </Stack>
        )}

        {loading ? (
          listaCargando
        ) : (
          <TableContainer
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <Table
                stickyHeader
                size="small"
                sx={{
                  "& .MuiTableRow-root": { height: ALTO_FILA },
                  "& tbody .MuiTableCell-root": { borderBottom: "none" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre del Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contacto</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dirección</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align={ocultarSidebar ? "center" : "left"}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientesVisibles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, border: 0 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron clientes.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesVisibles.map((cliente) => {
                    const estadoInfo = ESTADO_INFO[cliente.estado] || ESTADO_INFO.inactivo;
                    const nombreCompleto = obtenerNombreCompleto(cliente);
                    const telefonoValido = tieneTelefonoValido(cliente.telefono);
                    const numeroWhatsapp = telefonoValido
                      ? String(cliente.telefono).replace(/\D/g, "")
                      : "";
                    const necesitaRevisionTipo =
                      cliente.revisar && cliente.estado !== "revisar";

                    return (
                      <TableRow key={cliente.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ position: "relative" }}>
                              <Avatar
                                sx={{
                                  bgcolor:
                                    avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
                                  width: 32,
                                  height: 32,
                                }}
                              >
                                {cliente.tipo === "empresa" ? (
                                  <BusinessIcon sx={{ fontSize: 16 }} />
                                ) : (
                                  <PersonIcon sx={{ fontSize: 16 }} />
                                )}
                              </Avatar>
                              {necesitaRevisionTipo && (
                                <Tooltip
                                  title={cliente.motivoRevision || "Verificar datos de este cliente"}
                                >
                                  <ErrorOutlineIcon
                                    sx={{
                                      position: "absolute",
                                      bottom: -2,
                                      right: -2,
                                      fontSize: 14,
                                      color: "warning.main",
                                      bgcolor: "background.paper",
                                      borderRadius: "50%",
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Box>
                            <Typography variant="body2" fontWeight="bold">
                              {nombreCompleto}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          {telefonoValido ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                              <Typography variant="body2">{cliente.telefono}</Typography>
                              <IconButton
                                size="small"
                                component="a"
                                href={`https://wa.me/${numeroWhatsapp}`}
                                target="_blank"
                                rel="noopener"
                                sx={{
                                  bgcolor: "#25D366",
                                  color: "#FFFFFF",
                                  width: 18,
                                  height: 18,
                                  ml: 0.5,
                                  "&:hover": { bgcolor: "#128C7E" },
                                }}
                              >
                                <WhatsAppIcon sx={{ fontSize: 11 }} />
                              </IconButton>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin teléfono
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cliente.direccion || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={estadoInfo.label}
                            color={estadoInfo.chipColor}
                            size="small"
                            sx={{ fontWeight: "bold", textTransform: "uppercase" }}
                          />
                        </TableCell>

                        <TableCell>
                          <Button
                            size="small"
                            endIcon={<ChevronRightIcon />}
                            sx={{ color: acento }}
                            onClick={() => navigate(`/vistaclientes/${cliente.id}`)}
                          >
                            Ver Detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 1,
                flexShrink: 0,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Mostrando {inicioMostrado}-{finMostrado} de {clientesFiltrados.length} clientes
              </Typography>
              {totalPaginas > 1 && (
                <Pagination
                  count={totalPaginas}
                  page={pagina}
                  onChange={(_e, valor) => setPagina(valor)}
                  color="primary"
                  shape="rounded"
                  size="small"
                />
              )}
            </Box>
          </TableContainer>
        )}
      </Box>

      <ClienteFormDialog
        open={crearClienteOpen}
        onClose={() => setCrearClienteOpen(false)}
        onGuardado={fetchClientes}
      />

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
