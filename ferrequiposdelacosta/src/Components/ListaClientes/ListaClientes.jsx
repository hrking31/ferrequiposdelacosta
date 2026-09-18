import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Fab,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "./ClienteFormDialog";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import { ESTADO_CLIENTE_INFO } from "../ClienteDetalle/facturaUtils";
import { obtenerClientes, invalidarCopiaClientes } from "./clientesCache";

// Los rótulos van en plural porque nombran un GRUPO de clientes, no el estado
// de uno solo: por eso son aparte de ESTADO_CLIENTE_INFO. El orden es el de
// urgencia, el mismo con el que se resume el estado de un cliente (ver
// calcularEstadoCliente): primero lo que hay que atender hoy.
const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "vencida", label: "Vencidas" },
  { valor: "cobro", label: "En cobro" },
  { valor: "pendiente", label: "Pendientes" },
  { valor: "activa", label: "Activas" },
  { valor: "finalizada", label: "Finalizadas" },
  { valor: "inactivo", label: "Inactivos" },
];

const FILTROS_TIPO = [
  { valor: "todos", label: "Cualquiera" },
  { valor: "persona", label: "Personas", icono: PersonIcon },
  { valor: "empresa", label: "Empresas", icono: BusinessIcon },
];

// Los nombres y los íconos de los estados vienen de facturaUtils. El color de
// cada uno sale de avatarBgPorEstado —color propio, no el prop `color` de
// MUI— para no repetir colores ya usados en otros botones.
const ESTADO_INFO = ESTADO_CLIENTE_INFO;

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

  // Pasa por la copia guardada en el equipo: si nadie tocó un cliente desde la
  // última vez, esto cuesta 1 lectura en vez de una por cada cliente. Ver
  // clientesCache.js.
  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const { clientes: lista } = await obtenerClientes(async () => {
        const querySnapshot = await getDocs(collection(db, "clientes"));
        return querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      });
      setClientes(lista);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
      showSnackbar("Error al cargar la lista de clientes", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Cuando el cambio lo acaba de hacer esta pantalla, la copia se tira sin
  // preguntar: el servidor tarda un instante en actualizar el sello, y en ese
  // instante la copia todavía diría que no cambió nada.
  const refrescarTrasCambio = useCallback(() => {
    invalidarCopiaClientes();
    return fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const acento =
    theme.palette.custom.accent;

  const avatarBgPorEstado = theme.palette.custom.estadoFactura;

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
        borderRadius: (theme) => theme.shape.pill,
      }}
    >
      Nuevo Cliente
    </Button>
  );

  const buscador = (
    <BuscadorFiltro
      value={busqueda}
      onChange={setBusqueda}
      placeholder="Buscar clientes..."
    />
  );

  // EN CELULAR, EL MENÚ VIAJA CON EL BUSCADOR. Estaba en un botón ancho al
  // pie, que se llevaba un renglón entero de pantalla para una acción que se
  // usa una vez cada tanto; acá arriba ocupa el hueco que le sobra al
  // buscador y libera ese renglón para la lista.
  const buscadorConMenu = esMovil ? (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
      <Tooltip title="Menú">
        {/* `color="primary"` y no el acento escrito a mano: es el mismo
            botón de menú que tienen todas las vistas arriba a la derecha, y
            su color sale del tema. */}
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
  ) : (
    buscador
  );

  const chipsEstado = (direction) =>
      FILTROS.map((filtro) => {
        const seleccionado = filtroEstado === filtro.valor;
        const conteo = conteosPorEstado[filtro.valor] || 0;
        const colorFiltro = avatarBgPorEstado[filtro.valor];
        const colorSeleccionado = colorFiltro || acento;
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
                      borderRadius: (theme) => theme.shape.pill,
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: seleccionado
                        ? "custom.contadorSobreChip"
                        : "action.selected",
                      color: seleccionado ? contraste : "text.secondary",
                    }}
                  >
                    {conteo}
                  </Box>
                </Stack>
              )
            }
            icon={
              colorFiltro && !seleccionado ? (
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: colorFiltro,
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
                // Conserva su color: sin esto MUI le superpone un tinte
                // al pasar el mouse y otro mientras tiene el foco.
                "&:hover": { bgcolor: colorSeleccionado },
                "&.Mui-focusVisible": { bgcolor: colorSeleccionado },
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
                // El filtro aplicado conserva su color. Sin esto MUI le
                // superpone un tinte al pasar el mouse y otro mientras tiene
                // el foco, que recién se suelta al hacer clic en otro lado.
                "&:hover": { bgcolor: acento },
                "&.Mui-focusVisible": { bgcolor: acento },
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

  // Los filtros de computador: las dos preguntas en una fila que envuelve.
  // Acá vivía además una variante con scroll horizontal para el celular, que
  // se borró al cambiar esos chips por dos desplegables.
  const renderFiltrosCombinados = () => (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexWrap: "wrap", rowGap: 1 }}
    >
      {chipsEstado("row")}
      <Divider orientation="vertical" flexItem sx={{ flexShrink: 0, my: 0.5 }} />
      {chipsTipo("row")}
    </Stack>
  );

  // EN CELULAR, DOS DESPLEGABLES EN VEZ DE DIEZ PÍLDORAS. La fila de chips
  // medía 971px contra los 328 de la pantalla: seis de los diez filtros
  // quedaban afuera, y nada avisaba que la fila se deslizaba. Además ahí
  // convivían dos preguntas distintas —el estado y el tipo— sin nada que las
  // separara. Así cada una tiene su rótulo, se ve cuál está puesta y no hay
  // nada escondido.
  //
  // El id en inputProps y el htmlFor del rótulo son obligatorios en todo
  // select de la app: sin ellos el rótulo apunta a un elemento que no es el
  // campo y el lector de pantalla no lo asocia.
  const desplegablesFiltro = (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <TextField
        select
        size="small"
        label="Estado"
        value={filtroEstado}
        onChange={(evento) => setFiltroEstado(evento.target.value)}
        inputProps={{ id: "filtro-estado-clientes" }}
        InputLabelProps={{ htmlFor: "filtro-estado-clientes" }}
        sx={{ flex: 1, minWidth: 0 }}
      >
        {FILTROS.map((filtro) => (
          <MenuItem key={filtro.valor} value={filtro.valor}>
            {filtro.label} {conteosPorEstado[filtro.valor] || 0}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Tipo"
        value={filtroTipo}
        onChange={(evento) => setFiltroTipo(evento.target.value)}
        inputProps={{ id: "filtro-tipo-clientes" }}
        InputLabelProps={{ htmlFor: "filtro-tipo-clientes" }}
        sx={{ flex: 1, minWidth: 0 }}
      >
        {FILTROS_TIPO.map((filtro) => (
          <MenuItem key={filtro.valor} value={filtro.valor}>
            {filtro.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  const buscadorYFiltros = (
    <>
      {buscadorConMenu}
      {desplegablesFiltro}
    </>
  );

  const listaVacia = (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
      No se encontraron clientes.
    </Typography>
  );

  const listaCargando = <LoadingLogo height="40vh" text="Cargando clientes..." />;

  if (esMovil) {
    return (
      <Box sx={{ width: "100%" }}>
        <Stack spacing={2}>
          {buscadorYFiltros}

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
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
                    const estadoColor = avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
                    const nombreCompleto = obtenerNombreCompleto(cliente);
                    const telefonoValido = tieneTelefonoValido(cliente.telefono);

                    return (
                      <Box
                        key={cliente.id}
                        // La tarjeta ENTERA abre la ficha: el botón "Ver
                        // Detalles" era un objetivo de 90px en una tarjeta de
                        // 330, y el dedo cae en cualquier parte de ella.
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalles de ${nombreCompleto}`}
                        onClick={() => navigate(`/vistaclientes/${cliente.id}`)}
                        onKeyDown={(evento) => {
                          if (evento.key === "Enter" || evento.key === " ") {
                            evento.preventDefault();
                            navigate(`/vistaclientes/${cliente.id}`);
                          }
                        }}
                        sx={{
                          p: 1.25,
                          borderRadius: 3,
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          boxShadow: 1,
                          cursor: "pointer",
                          userSelect: "none",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
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
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Sin teléfono registrado
                                </Typography>
                              )}
                            </Box>
                          </Stack>

                          <Chip
                            icon={estadoInfo.Icono ? <estadoInfo.Icono /> : undefined}
                            label={estadoInfo.label}
                            variant="estado"
                            size="small"
                            sx={{
                              bgcolor: estadoColor,
                              color: theme.palette.getContrastText(estadoColor),
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
                          />
                        </Stack>

                        {/* La dirección y la flecha comparten renglón: el
                            botón "Ver Detalles" con su línea divisoria se
                            llevaba dos renglones enteros para decir algo que
                            la flecha sola ya dice, y ahora la tarjeta entera
                            es la que abre. La flecha se queda en su esquina
                            de siempre, a la derecha. */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mt: 0.75, gap: 1 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ pl: "52px", minWidth: 0 }}
                          >
                            {cliente.direccion || ""}
                          </Typography>
                          <ChevronRightIcon
                            aria-hidden
                            fontSize="small"
                            sx={{ color: acento, flexShrink: 0 }}
                          />
                        </Stack>
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
            // Los 120 de antes dejaban libre el pie con el botón MENU, que se
            // mudó arriba junto al buscador. Ahora solo tiene que librar la
            // barra inferior de la app.
            bottom: 80,
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
          onGuardado={refrescarTrasCambio}
        />

        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", gap: 3, py: 1.5 }}>
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
          // Aire arriba para que quepa el hover: el botón "Nuevo Cliente" se
          // levanta 3px al pasar el mouse y, como este contenedor recorta lo
          // que se sale, se le cortaba el borde de arriba.
          pt: "6px",
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
            <Typography variant="h6" sx={{ flexShrink: 0 }}>
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
            {renderFiltrosCombinados()}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
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
                    const estadoColor = avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
                    const nombreCompleto = obtenerNombreCompleto(cliente);
                    const telefonoValido = tieneTelefonoValido(cliente.telefono);

                    return (
                      <TableRow key={cliente.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
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
                            icon={estadoInfo.Icono ? <estadoInfo.Icono /> : undefined}
                            label={estadoInfo.label}
                            variant="estado"
                            size="small"
                            sx={{
                              bgcolor: estadoColor,
                              color: theme.palette.getContrastText(estadoColor),
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
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
