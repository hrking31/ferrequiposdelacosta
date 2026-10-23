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
  useMediaQuery,
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
import ChipFiltro from "../Filtros/ChipFiltro";
import SelectorFiltro from "../Filtros/SelectorFiltro";
import PanelDocumentos from "../PanelLista/PanelDocumentos";
import ResumenLista from "../PanelLista/ResumenLista";
import VistaPreviaDocumento from "../PanelLista/VistaPreviaDocumento";
import InsightsIcon from "@mui/icons-material/Insights";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  diasDesde,
  masAntiguas,
  masPedidos,
  porPersona,
  textoEspera,
} from "../../Utils/resumenLista";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";
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

// LOS FILTROS (2026-10-22), con el mismo juego que Seguimiento: en computador
// una columna a la izquierda, en celular dos desplegables debajo del buscador.
// Los estados en el orden en que una solicitud los recorre.
const FILTROS_ESTADO = [
  { valor: "todos", label: "Todas" },
  { valor: "pendiente", label: "Pendiente" },
  { valor: "pausada", label: "Pausada" },
  { valor: "enProceso", label: "En proceso" },
  { valor: "creada", label: "Emitida" },
];

const FILTROS_TIPO = [
  { valor: "todos", label: "Todos" },
  { valor: "persona", label: "Personas", icono: PersonIcon },
  { valor: "empresa", label: "Empresas", icono: BusinessIcon },
];

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
  const [filtroEstado, setFiltroEstado] = useState("todos");
  // La solicitud cuya vista previa está en el recuadro de la derecha.
  const [elegidaId, setElegidaId] = useState(null);
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
  const coincideBusqueda = (quotation) => {
    if (!busquedaLower) return true;
    const nombre = (quotation.empresa || "").toLowerCase();
    const telefono = (quotation.telefono || "").toLowerCase();
    return nombre.includes(busquedaLower) || telefono.includes(busquedaLower);
  };
  const coincideTipo = (quotation) => filtroTipo === "todos" || quotation.tipo === filtroTipo;
  const coincideEstado = (quotation) =>
    filtroEstado === "todos" || quotation.status === filtroEstado;

  const cotizacionesFiltradas = todas.filter(
    (quotation) =>
      coincideBusqueda(quotation) && coincideTipo(quotation) && coincideEstado(quotation),
  );

  // Cuántas hay de cada estado y de cada tipo, con los OTROS filtros puestos:
  // así el número de cada botón es lo que se vería al tocarlo.
  const conteosPorEstado = { todos: 0 };
  const conteosPorTipo = { todos: 0, persona: 0, empresa: 0 };
  todas.forEach((quotation) => {
    if (!coincideBusqueda(quotation)) return;
    if (coincideTipo(quotation)) {
      conteosPorEstado.todos += 1;
      conteosPorEstado[quotation.status] = (conteosPorEstado[quotation.status] || 0) + 1;
    }
    if (coincideEstado(quotation)) {
      conteosPorTipo.todos += 1;
      if (quotation.tipo in conteosPorTipo) conteosPorTipo[quotation.tipo] += 1;
    }
  });

  // LA COLUMNA DE FILTROS desde 1010px, el mismo corte de Seguimiento. LA DEL
  // MES a la derecha desde 1200: la lista dice poco y no necesita el ancho de
  // las tarjetas de Seguimiento (lo dijo el dueño, 2026-10-22).
  const columnaFiltros = useMediaQuery("(min-width:1010px)") && !esCelular;
  const conPanel = useMediaQuery("(min-width:1200px)") && !esCelular;
  // Los mismos colores del chip de estado de cada solicitud (ESTILO_ESTADO).
  const colorPorEstado = {
    pendiente: theme.palette.warning.main,
    pausada: theme.palette.grey[500],
    enProceso: theme.palette.info.main,
    creada: theme.palette.success.main,
  };

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

  const etiquetaFiltro = (texto) => (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, pl: 0.5 }}>
      {texto}
    </Typography>
  );

  // EN COMPUTADOR, la columna de la izquierda: los estados con su color y los
  // tipos de cliente, cada uno con cuántas hay. Arranca a la altura de la
  // primera solicitud y se desplaza por su cuenta, como en Seguimiento.
  const columna = (
    <Box
      sx={{
        width: "clamp(160px, 14vw, 220px)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflowY: "auto",
      }}
    >
      {etiquetaFiltro("Estado")}
      <Stack spacing={1}>
        {FILTROS_ESTADO.map((filtro) => (
          <ChipFiltro
            key={filtro.valor}
            label={filtro.label}
            conteo={conteosPorEstado[filtro.valor] || 0}
            seleccionado={filtroEstado === filtro.valor}
            color={acento}
            punto={colorPorEstado[filtro.valor]}
            onClick={() => setFiltroEstado(filtro.valor)}
          />
        ))}
      </Stack>
      <Box sx={{ mt: 1 }}>{etiquetaFiltro("Tipo")}</Box>
      <Stack spacing={1}>
        {FILTROS_TIPO.map(({ valor, label, icono: Icono }) => (
          <ChipFiltro
            key={valor}
            label={label}
            conteo={conteosPorTipo[valor]}
            seleccionado={filtroTipo === valor}
            color={acento}
            icono={Icono ? <Icono /> : undefined}
            onClick={() => setFiltroTipo(valor)}
          />
        ))}
      </Stack>
    </Box>
  );

  // EN CELULAR Y EN EL COMPUTADOR ANGOSTO, dos desplegables en un renglón,
  // como los de Seguimiento.
  const desplegables = (
    <Stack direction="row" spacing={1}>
      <SelectorFiltro
        id="filtro-estado-cotizaciones"
        label="Estado"
        value={filtroEstado}
        onChange={setFiltroEstado}
        opciones={FILTROS_ESTADO.map((filtro) => ({
          valor: filtro.valor,
          label: filtro.label,
          cantidad: conteosPorEstado[filtro.valor] || 0,
        }))}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <SelectorFiltro
        id="filtro-tipo-cotizaciones"
        label="Tipo"
        value={filtroTipo}
        onChange={setFiltroTipo}
        opciones={FILTROS_TIPO.map((filtro) => ({
          valor: filtro.valor,
          label: filtro.label,
          cantidad: conteosPorTipo[filtro.valor],
        }))}
        sx={{ flex: 1, minWidth: 0 }}
      />
    </Stack>
  );

  // Las dos columnas alrededor de la lista. Cada una se desplaza por su cuenta.
  const columnaVertical = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  };
  // LA COLUMNA DE LA DERECHA (ver PanelDocumentos): la tarjeta del mes, una de
  // lo que espera respuesta, y un recuadro que muestra la vista previa de la
  // solicitud tocada o, sin ninguna, un resumen de la lista. Todo lo de la
  // lista sale de lo que ya está cargado: ninguna lectura.
  const sinResponder = todas.filter(
    (quotation) => quotation.status === "pendiente" || quotation.status === "pausada",
  );
  const fechaDe = (quotation) => quotation.createdAt;
  const laMasVieja = masAntiguas(sinResponder, fechaDe, 1)[0];
  const tarjetaSinResponder = {
    etiqueta: "SIN RESPONDER",
    icono: <PendingActionsIcon />,
    color: theme.palette.warning.main,
    valor: sinResponder.length,
    subtitulo: laMasVieja
      ? `La más vieja: ${textoEspera(diasDesde(laMasVieja.createdAt))}`
      : "Ninguna esperando",
  };

  const elegida = conPanel ? todas.find((quotation) => quotation.id === elegidaId) : null;
  // Tocar la tarjeta la elige; tocarla otra vez la suelta. Los botones de la
  // tarjeta hacen lo suyo y no la eligen.
  const alternarElegida = (evento, quotation) => {
    if (evento.target.closest("button, a")) return;
    setElegidaId((previa) => (previa === quotation.id ? null : quotation.id));
  };

  const recuadro = elegida ? (
    <VistaPreviaDocumento
      numero={elegida.cotizacionId}
      cliente={elegida.empresa}
      estado={estadoDe(elegida.status)}
      fecha={elegida.fecha ? formatearFechaLegible(elegida.fecha) : ""}
      items={elegida.items}
      totales={[
        {
          label: "Total",
          valor:
            typeof elegida.totalNumero === "number"
              ? formatearMoneda(elegida.totalNumero)
              : elegida.total || formatearMoneda(0),
          destacado: true,
        },
      ]}
      onSoltar={() => setElegidaId(null)}
    />
  ) : (
    <ResumenLista
      secciones={[
        {
          titulo: "LLEVAN MÁS ESPERANDO",
          vacio: "Ninguna esperando respuesta.",
          filas: masAntiguas(sinResponder, fechaDe).map((quotation) => ({
            clave: quotation.id,
            izquierda: quotation.empresa || "Cliente sin nombre",
            derecha: textoEspera(diasDesde(quotation.createdAt)),
          })),
        },
        {
          titulo: "MÁS PEDIDOS",
          vacio: "Todavía no hay equipos pedidos.",
          filas: masPedidos(todas).map(({ nombre, cantidad }) => ({
            clave: nombre,
            izquierda: nombre,
            derecha: cantidad,
          })),
        },
        {
          titulo: "QUIÉN ATENDIÓ (EMITIDAS)",
          vacio: "Ninguna emitida todavía.",
          filas: porPersona(
            todas.filter((quotation) => quotation.status === "creada"),
            (quotation) => quotation.atendidoPor,
          ).map(({ nombre, cantidad }) => ({ clave: nombre, izquierda: nombre, derecha: cantidad })),
        },
      ]}
    />
  );

  const conElMes = (lista) =>
    conPanel ? (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 3 }}>
        <Box sx={columnaVertical}>{lista}</Box>
        <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>
          <PanelDocumentos
            de="cotizaciones"
            segunda={tarjetaSinResponder}
            titulo={elegida ? "Vista previa" : "De la lista"}
            icono={elegida ? <VisibilityIcon fontSize="small" /> : <InsightsIcon fontSize="small" />}
          >
            {recuadro}
          </PanelDocumentos>
        </Box>
      </Box>
    ) : (
      lista
    );
  // A la izquierda, los filtros.
  const conLosFiltros = (contenido) =>
    columnaFiltros && todas.length > 0 ? (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 3 }}>
        {columna}
        <Box sx={columnaVertical}>{contenido}</Box>
      </Box>
    ) : (
      contenido
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

            {desplegables}

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
        ) : columnaFiltros ? (
          // Los filtros están en la columna de la izquierda: acá quedan el
          // buscador y el conteo.
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {buscador}
            {contador}
          </Stack>
        ) : (
          // Sin lugar para la columna: debajo del buscador, los desplegables
          // del celular.
          <Stack spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {buscador}
              {contador}
            </Stack>
            {desplegables}
          </Stack>
        ))}

      {conLosFiltros(conElMes(
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
          const nombre = (
            <Typography
              variant="h5"
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                color: (theme) => theme.palette.text.primary,
                textOverflow: "ellipsis",
              }}
            >
              {quotation.empresa || "Cliente sin nombre"}
            </Typography>
          );

          // El rótulo y el número van sueltos para que, cuando no entren en un
          // renglón, el número baje solo en vez de partirse a la mitad.
          const numeroId = (
            <Typography
              variant="caption"
              sx={{
                minWidth: 0,
                color: "text.secondary",
                display: "flex",
                flexWrap: "wrap",
                columnGap: 0.5,
              }}
            >
              <span>Solicitud ID:</span>
              <span>{quotation.cotizacionId}</span>
            </Typography>
          );

          const identidad = (
            <Box sx={{ minWidth: 0, width: "100%" }}>
              {nombre}
              {numeroId}
            </Box>
          );

          const chipEstado = (
            <Chip
              size="small"
              icon={<estado.Icono />}
              label={estado.label}
              color={estado.color}
              variant="outlined"
              sx={{ flexShrink: 0 }}
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
            // En el celular los tres datos van más juntos: son renglones
            // cortos de la misma cosa, no tres bloques distintos.
            <Stack spacing={esCelular ? 0.75 : 1.5} sx={{ width: "100%" }}>
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
              // Con la columna de la derecha, tocarla muestra su vista previa.
              onClick={conPanel ? (evento) => alternarElegida(evento, quotation) : undefined}
              sx={{
                position: "relative",
                overflow: "visible",
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: (theme) =>
                  `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
                outline: "1px solid transparent",
                ...(conPanel && { cursor: "pointer" }),
                // La elegida queda marcada con el acento, como en Seguimiento.
                ...(elegida?.id === quotation.id && {
                  outline: "2px solid",
                  outlineColor: "custom.accent",
                }),
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
                  // EN CELULAR, DOS RENGLONES: arriba quién es —icono, nombre y
                  // en qué anda— de lado a lado; abajo el número con lo que se
                  // puede hacer, a la derecha. Antes el estado se llevaba un
                  // renglón para él solo y los botones otro, al pie.
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      {avatar}
                      {nombre}
                      {chipEstado}
                    </Stack>

                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      gap={1}
                    >
                      {numeroId}

                      {hayAcciones && (
                        <Stack
                          direction="row"
                          spacing={0.25}
                          sx={{ flexShrink: 0, mt: -0.75 }}
                        >
                          {acciones}
                        </Stack>
                      )}
                    </Stack>

                    {atendidoPor}
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
      </Box>,
      ))}

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
