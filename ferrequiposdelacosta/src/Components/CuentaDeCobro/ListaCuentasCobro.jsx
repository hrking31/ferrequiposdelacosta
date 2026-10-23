import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PaidIcon from "@mui/icons-material/Paid";
import OutboxIcon from "@mui/icons-material/Outbox";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PaymentsIcon from "@mui/icons-material/Payments";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import ChipFiltro from "../Filtros/ChipFiltro";
import SelectorFiltro from "../Filtros/SelectorFiltro";
import PanelDocumentos from "../PanelLista/PanelDocumentos";
import ResumenLista from "../PanelLista/ResumenLista";
import VistaPreviaDocumento from "../PanelLista/VistaPreviaDocumento";
import { estiloElegida } from "../PanelLista/estiloElegida";
import InsightsIcon from "@mui/icons-material/Insights";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { hoyYEstaSemana, masFrecuentes } from "../../Utils/resumenLista";
import { usePantallaCompacta, usePantallaBaja } from "../../Utils/pantalla";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import useSnackbar from "../../Hooks/useSnackbar";
import { abrirCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import VistaCcPdf from "../VistaPdf/VistaCcPdf";
import {
  eliminarCuentaCobro,
  escucharCuentasCobro,
  leerCuentasCobro,
  marcarCuentaEnProceso,
  marcarCuentaPagada,
} from "./cuentasCobroDb";
import { calcularStatusPrevio } from "../../Utils/estadoDocumento";
import { formatearMoneda, formatearFechaLegible } from "../../Utils/formato";

// Las situaciones en que puede estar una cuenta guardada: "creada" es la que
// ya se emitió —se descargó su PDF—, "pausada" la que quedó a medias y
// "enProceso" la que alguien tiene abierta ahora mismo.
//
// Se muestran con las mismas palabras, icono y color que en el buzón de
// cotizaciones (ver AdminCotizaciones): son los mismos estados y verlos
// nombrados distinto en cada pantalla confundía.
//
// "pagada" es el único que no comparte con la cotización: lo pone el
// administrador cuando entra la plata. Va en primario y no en verde para que
// no se confunda con "Emitida" de un vistazo — son dos momentos distintos.
const ESTADO_INFO = {
  creada: { label: "Emitida", Icono: CheckCircleIcon, color: "success" },
  enProceso: { label: "En Proceso", Icono: AutorenewIcon, color: "info" },
  pausada: { label: "Pausada", Icono: PauseCircleOutlineIcon, color: "default" },
  pagada: { label: "Pagada", Icono: PaidIcon, color: "primary" },
};

// Lo que se cobra en una cuenta guardada. Se recalcula en vez de confiar en el
// campo `saldo` para que una guardada por una versión anterior —que no lo
// tenía— no se muestre en cero.
// El depósito por cobrar va aparte del total y se suma.
const saldoDe = (cuenta) =>
  Math.max(
    0,
    (Number(cuenta.total) || 0) -
      (Number(cuenta.pagado) || 0) -
      (Number(cuenta.abonos) || 0),
  ) + (Number(cuenta.depositoPorCobrar) || 0);

// LOS FILTROS (2026-10-22), con el mismo juego que Seguimiento y el buzón de
// cotizaciones: en computador una columna a la izquierda, en celular dos
// desplegables debajo del buscador. Los estados en el orden en que una cuenta
// los recorre.
const FILTROS_ESTADO = [
  { valor: "todos", label: "Todas" },
  { valor: "pausada", label: "Pausada" },
  { valor: "enProceso", label: "En proceso" },
  { valor: "creada", label: "Emitida" },
  { valor: "pagada", label: "Pagada" },
];

const FILTROS_TIPO = [
  { valor: "todos", label: "Todos" },
  { valor: "persona", label: "Personas", icono: PersonIcon },
  { valor: "empresa", label: "Empresas", icono: BusinessIcon },
];

// Una cuenta sin estado se muestra como pausada (ver ESTADO_INFO): se cuenta
// y se filtra igual.
const estadoDeCuenta = (cuenta) => (ESTADO_INFO[cuenta.status] ? cuenta.status : "pausada");

export default function ListaCuentasCobro() {
  const theme = useTheme();
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const esCelular = usePantallaCompacta();
  // EL CELULAR ACOSTADO. De alto quedan unos 390px, y el buscador, los filtros
  // y el renglón del conteo se llevaban casi todo: a las cuentas les quedaba
  // una franja donde no cabía ni una. Con la pantalla así de baja se desplaza
  // todo junto, filtros incluidos.
  const altoCorto = usePantallaBaja();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const acento = theme.palette.custom.accent;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const usuario = useSelector((state) => state.user);
  // Borrar una cuenta emitida no se deshace, así que queda solo en manos del
  // administrador. Mismo criterio que el buzón de cotizaciones.
  const esAdministrador = usuario.role === "administrador";
  // Quién está conectado ahora, para saber si el que tiene una cuenta abierta
  // sigue trabajándola o solo la dejó colgada.
  const usuariosConectados = useSelector(
    (state) => state.presence.usuariosConectados || {},
  );

  // La primera tanda llega en vivo y se reemplaza entera con cada cambio; las
  // que trae "Cargar más" van aparte, o cada aviso del servidor las borraría.
  const [cuentas, setCuentas] = useState([]);
  const [masCuentas, setMasCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  // El último documento crudo de Firestore: con él se pide la tanda siguiente.
  const [ultimo, setUltimo] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // "todos" | "persona" | "empresa" — mismos filtros que Solicitudes de
  // Cotización, que es la otra pantalla donde se busca entre documentos.
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  // La cuenta cuya vista previa está en el recuadro de la derecha.
  const [elegidaId, setElegidaId] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  // El id de la cuenta cuyo pago se está guardando, para apagar solo ese botón
  // y no los de las demás tarjetas.
  const [marcandoPago, setMarcandoPago] = useState(null);

  // La primera tanda se ESCUCHA, no se lee una vez: así, si otra persona abre
  // una cuenta, acá se ve "En Proceso" sin recargar la pantalla. Sin eso, el
  // aviso de quién la tiene llegaría tarde y dos personas podrían editarla a
  // la vez sin enterarse.
  useEffect(() => {
    const dejarDeEscuchar = escucharCuentasCobro(
      (tanda) => {
        setCuentas(tanda.cuentas);
        setUltimo(tanda.ultimo);
        setHayMas(tanda.hayMas);
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar las cuentas de cobro:", error);
        showSnackbar(
          `No se pudieron cargar las cuentas de cobro: ${error.message}`,
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
      const tanda = await leerCuentasCobro(ultimo);
      setMasCuentas((previas) => [...previas, ...tanda.cuentas]);
      setUltimo(tanda.ultimo);
      setHayMas(tanda.hayMas);
    } catch (error) {
      console.error("Error al cargar más cuentas de cobro:", error);
      showSnackbar(`No se pudieron cargar más: ${error.message}`, "error");
    } finally {
      setCargandoMas(false);
    }
  };

  const todas = useMemo(
    () => [...cuentas, ...masCuentas],
    [cuentas, masCuentas],
  );

  // El filtro corre sobre lo que ya está cargado, no sobre la base (ver
  // BuscadorFiltro). Busca por número, cliente, NIT y concepto.
  const texto = busqueda.trim().toLowerCase();
  const coincideBusqueda = (cuenta) =>
    !texto ||
    [cuenta.cuentaCobroId, cuenta.empresa, cuenta.nit, cuenta.concepto]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(texto));
  const coincideTipo = (cuenta) => filtroTipo === "todos" || cuenta.tipo === filtroTipo;
  const coincideEstado = (cuenta) =>
    filtroEstado === "todos" || estadoDeCuenta(cuenta) === filtroEstado;

  const filtradas = todas.filter(
    (cuenta) => coincideBusqueda(cuenta) && coincideTipo(cuenta) && coincideEstado(cuenta),
  );

  // Cuántas hay de cada estado y de cada tipo, con los OTROS filtros puestos:
  // así el número de cada botón es lo que se vería al tocarlo.
  const conteosPorEstado = { todos: 0 };
  const conteosPorTipo = { todos: 0, persona: 0, empresa: 0 };
  todas.forEach((cuenta) => {
    if (!coincideBusqueda(cuenta)) return;
    if (coincideTipo(cuenta)) {
      const estado = estadoDeCuenta(cuenta);
      conteosPorEstado.todos += 1;
      conteosPorEstado[estado] = (conteosPorEstado[estado] || 0) + 1;
    }
    if (coincideEstado(cuenta)) {
      conteosPorTipo.todos += 1;
      if (cuenta.tipo in conteosPorTipo) conteosPorTipo[cuenta.tipo] += 1;
    }
  });

  // LA COLUMNA DE FILTROS desde 1010px, el mismo corte de Seguimiento. LA DEL
  // MES a la derecha desde 1200: la lista dice poco y no necesita el ancho de
  // las tarjetas de Seguimiento (lo dijo el dueño, 2026-10-22).
  const columnaFiltros = useMediaQuery("(min-width:1010px)") && !esCelular;
  const conPanel = useMediaQuery("(min-width:1200px)") && !esCelular;
  // Los mismos colores del chip de estado de cada cuenta (ESTADO_INFO).
  const colorPorEstado = {
    pausada: theme.palette.grey[500],
    enProceso: theme.palette.info.main,
    creada: theme.palette.success.main,
    pagada: theme.palette.primary.main,
  };

  // Reabrir: la carga tal cual en el formulario. Como trae su `id`, volver a
  // guardarla actualiza esta misma y no crea otra.
  //
  // Antes de entrar la marca "en proceso" con el nombre de quien la abre, para
  // que los demás vean que está ocupada. `statusPrevio` es a dónde vuelve si
  // esta persona sale sin guardar: hay que anotarlo ahora, porque en un segundo
  // su estado será "enProceso" y el anterior ya no se podría saber.
  const abrir = async (cuenta) => {
    const statusPrevio = calcularStatusPrevio(cuenta, "pausada");

    try {
      await marcarCuentaEnProceso(cuenta.id, statusPrevio, usuario);
    } catch (error) {
      console.error("Error al marcar la cuenta en proceso:", error);
      showSnackbar(`No se pudo abrir la cuenta: ${error.message}`, "error");
      return;
    }

    dispatch(
      abrirCuentaCobro({
        ...cuenta,
        status: "enProceso",
        statusPrevio,
        atendidoPor: usuario.name,
        atendidoPorUid: usuario.uid,
      }),
    );
    navigate("/vistacuentadecobro");
  };

  // Marcar / desmarcar el pago. Es un interruptor: si está emitida la pone en
  // pagada, y si está pagada la devuelve a emitida —un clic de más se arregla
  // solo, sin tener que tocar la base—.
  //
  // Como la primera tanda está escuchando, la tarjeta se actualiza sola; las
  // traídas con "Cargar más" hay que corregirlas a mano.
  const alternarPagada = async (cuenta) => {
    const pagada = cuenta.status !== "pagada";
    setMarcandoPago(cuenta.id);
    try {
      await marcarCuentaPagada(cuenta.id, pagada, usuario);
      setMasCuentas((previas) =>
        previas.map((otra) =>
          otra.id === cuenta.id
            ? { ...otra, status: pagada ? "pagada" : "creada" }
            : otra,
        ),
      );
      showSnackbar(
        pagada
          ? `Cuenta ${cuenta.cuentaCobroId || ""} marcada como pagada.`
          : `Cuenta ${cuenta.cuentaCobroId || ""} vuelve a Emitida.`,
        "success",
      );
    } catch (error) {
      console.error("Error al marcar el pago de la cuenta:", error);
      showSnackbar(`No se pudo marcar el pago: ${error.message}`, "error");
    } finally {
      setMarcandoPago(null);
    }
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarCuentaCobro(aEliminar.id);
      // La primera tanda se corrige sola, que está escuchando; las traídas con
      // "Cargar más" hay que sacarlas a mano.
      setMasCuentas((previas) =>
        previas.filter((cuenta) => cuenta.id !== aEliminar.id),
      );
      setAEliminar(null);
      showSnackbar("Cuenta de cobro eliminada.", "success");
    } catch (error) {
      showSnackbar(`Error al eliminar: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  const buscador = (
    <BuscadorFiltro
      value={busqueda}
      onChange={setBusqueda}
      placeholder="Buscar por número, cliente, NIT o concepto"
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
      {filtradas.length} de {todas.length}
      {esCelular ? "" : " cuentas"}
    </Typography>
  );

  const etiquetaFiltro = (rotulo) => (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, pl: 0.5 }}>
      {rotulo}
    </Typography>
  );

  // EN COMPUTADOR, la columna de la izquierda: los estados con su color y los
  // tipos de cliente, cada uno con cuántas hay. Arranca a la altura de la
  // primera cuenta y se desplaza por su cuenta, como en Seguimiento.
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
        id="filtro-estado-cuentas-cobro"
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
        id="filtro-tipo-cuentas-cobro"
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
  // LA COLUMNA DE LA DERECHA (ver PanelDocumentos): un recuadro que muestra
  // la vista previa de la cuenta tocada o, sin ninguna, un resumen de la
  // lista. Todo lo de la lista sale de lo que ya está cargado: ninguna lectura.
  //
  // Cuentas hechas hoy y esta semana: las que se emitieron, por el día en que
  // se CREARON (no hay fecha de emisión; casi siempre es el mismo día), estén
  // pagadas o no. Se llamaba "Emitidas" y confundía con el estado Emitida, que
  // son las que esperan pago: el dueño le cambió el nombre (2026-10-23).
  // Clientes con más cuentas sin pagar: cuántas emitidas sin pagar tiene cada uno,
  // contadas y no sumadas en plata (los montos dependen de que cada quien
  // anote bien lo pagado; ver DetalleCuentasCobro).
  const emitidas = hoyYEstaSemana(
    todas.filter((cuenta) => cuenta.emitida || ["creada", "pagada"].includes(cuenta.status)),
    (cuenta) => cuenta.creadaEn,
  );
  const masDeben = masFrecuentes(
    todas.filter((cuenta) => cuenta.status === "creada"),
    (cuenta) => cuenta.empresa,
  );

  const elegida = conPanel ? todas.find((cuenta) => cuenta.id === elegidaId) : null;
  // Tocar la tarjeta la elige; tocarla otra vez la suelta. Los botones de la
  // tarjeta hacen lo suyo y no la eligen.
  const alternarElegida = (evento, cuenta) => {
    if (evento.target.closest("button, a")) return;
    setElegidaId((previa) => (previa === cuenta.id ? null : cuenta.id));
  };

  const pagadoDe = (cuenta) => (Number(cuenta.pagado) || 0) + (Number(cuenta.abonos) || 0);
  const recuadro = elegida ? (
    <VistaPreviaDocumento
      numero={elegida.cuentaCobroId}
      cliente={elegida.empresa}
      estado={ESTADO_INFO[estadoDeCuenta(elegida)]}
      fecha={elegida.fecha ? formatearFechaLegible(elegida.fecha) : ""}
      items={elegida.items}
      totales={[
        { label: "Total", valor: formatearMoneda(Number(elegida.total) || 0) },
        // Lo ya cobrado, solo si hubo: en la mayoría de las cuentas no hay.
        ...(pagadoDe(elegida) > 0
          ? [{ label: "Ya pagado", valor: formatearMoneda(pagadoDe(elegida)) }]
          : []),
        { label: "Total a cancelar", valor: formatearMoneda(saldoDe(elegida)), destacado: true },
      ]}
    />
  ) : (
    <ResumenLista
      // Son solo dos: repartidas a lo alto, la segunda se iba al fondo.
      justificado={false}
      secciones={[
        {
          titulo: "CUENTAS HECHAS",
          icono: <OutboxIcon />,
          color: theme.palette.success.main,
          forma: "cifras",
          vacio: "",
          filas: [
            { clave: "hoy", izquierda: "Hoy", derecha: emitidas.hoy },
            { clave: "semana", izquierda: "Esta semana", derecha: emitidas.semana },
          ],
        },
        {
          titulo: "CLIENTES CON MÁS CUENTAS SIN PAGAR",
          icono: <MoneyOffIcon />,
          color: theme.palette.warning.main,
          forma: "ranking",
          vacio: "Ninguna cuenta emitida sin pagar.",
          filas: masDeben.map(({ nombre, cantidad }) => ({
            clave: nombre,
            izquierda: nombre,
            derecha: cantidad,
          })),
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
            onCerrar={elegida ? () => setElegidaId(null) : undefined}
            titulo={elegida ? "Vista previa" : "Estadísticas"}
            cantidad={elegida ? undefined : todas.length}
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
    return <LoadingLogo height="40vh" text="Cargando cuentas de cobro..." />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        // Acostado el celular el scroll lo manda esta caja y se desplaza todo
        // junto, filtros incluidos: dos áreas que se desplazan, una dentro de
        // la otra, se pelean el dedo.
        ...(altoCorto
          ? { overflowY: "auto" }
          : { display: "flex", flexDirection: "column" }),
      }}
    >
      {/* Buscador, contador y filtros por tipo: el mismo juego que Solicitudes
          de Cotización. */}
      {esCelular ? (
        // EN CELULAR, TRES RENGLONES: el buscador con el botón de menú al
        // lado —que antes era un botón ancho al pie—, los filtros debajo y,
        // al final, qué lista es y cuántas se están viendo. Antes iban los
        // tres apilados sin orden, con el conteo en el medio.
        <Stack spacing={1} sx={{ pb: 1.5, flexShrink: 0 }}>
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
              Lista de cuentas
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
          sx={{ flexShrink: 0, pb: 2 }}
        >
          {buscador}
          {contador}
        </Stack>
      ) : (
        // Sin lugar para la columna: debajo del buscador, los desplegables del
        // celular.
        <Stack spacing={1.5} sx={{ flexShrink: 0, pb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {buscador}
            {contador}
          </Stack>
          {desplegables}
        </Stack>
      )}

      {conLosFiltros(conElMes(
      <Box
        sx={{
          pr: 0.5,
          ...(altoCorto
            ? undefined
            : { flex: 1, minHeight: 0, overflowY: "auto" }),
        }}
      >
        {filtradas.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {todas.length === 0
              ? "Todavía no hay cuentas de cobro guardadas."
              : "Ninguna cuenta coincide con la búsqueda o los filtros."}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {filtradas.map((cuenta) => {
              const estado = ESTADO_INFO[cuenta.status] || ESTADO_INFO.pausada;
              const saldo = saldoDe(cuenta);

              // Se puede abrir salvo que la tenga otra persona que siga
              // conectada: ahí se esconde el botón para no pisarle el trabajo.
              // Si esa persona se desconectó, la cuenta se puede asumir.
              const laTengoYo =
                cuenta.status === "enProceso" &&
                cuenta.atendidoPorUid === usuario.uid;
              const ocupada =
                cuenta.status === "enProceso" &&
                !laTengoYo &&
                usuariosConectados[cuenta.atendidoPorUid]?.online === true;

              // Solo hay documento que bajar si ya se emitió. Un borrador no
              // tiene PDF: bajarlo daría un papel a medio llenar. Mientras
              // alguien la tiene abierta tampoco, porque puede estar
              // cambiándola justo ahora.
              //
              // Una pagada también se puede bajar: se emitió igual, y que el
              // cliente ya haya pagado no borra el documento.
              const emitida =
                cuenta.status === "creada" || cuenta.status === "pagada";
              const puedeDescargar = emitida;
              const estaPagada = cuenta.status === "pagada";

              // Las piezas de la tarjeta, sueltas: en el celular se arman en
              // otro orden —las acciones arriba, a la derecha— y así la
              // tarjeta no hay que escribirla dos veces.
              const avatar = (
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    width: esCelular ? 40 : 56,
                    height: esCelular ? 40 : 56,
                    flexShrink: 0,
                  }}
                >
                  {cuenta.tipo === "empresa" ? (
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
                  {cuenta.empresa || "Sin cliente"}
                </Typography>
              );

              // El rótulo y el número van sueltos para que, cuando no entren en
              // un renglón, el número baje solo en vez de partirse a la mitad.
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
                  <span>Cuenta ID:</span>
                  <span>{cuenta.cuentaCobroId || "sin número"}</span>
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

              // Quién la tiene abierta, con el punto encendido mientras esa
              // persona siga conectada.
              const atendidaPor = cuenta.status === "enProceso" &&
                cuenta.atendidoPor && (
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
                        flexShrink: 0,
                        backgroundColor: usuariosConectados[
                          cuenta.atendidoPorUid
                        ]?.online
                          ? theme.palette.custom.online
                          : theme.palette.grey[500],
                      }}
                    />
                    <span>
                      Atendida por: <strong>{cuenta.atendidoPor}</strong>
                    </span>
                  </Typography>
                );

              const acciones = (
                <>
                  {!ocupada && (
                    <Tooltip title={laTengoYo ? "Retomar" : "Abrir"}>
                      <IconButton size="small" onClick={() => abrir(cuenta)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedeDescargar && (
                    <Tooltip title="Descargar PDF">
                      <IconButton
                        size="small"
                        onClick={() => VistaCcPdf({ value: cuenta })}
                      >
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Registrar el pago es decir que entró la plata, así que
                      queda solo en manos del administrador — mismo criterio
                      que eliminar. Solo aparece en las emitidas: un borrador
                      todavía no se cobró. */}
                  {esAdministrador && emitida && (
                    <Tooltip
                      title={
                        estaPagada ? "Marcar como no pagada" : "Marcar como pagada"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color={estaPagada ? "default" : "primary"}
                          disabled={marcandoPago === cuenta.id}
                          onClick={() => alternarPagada(cuenta)}
                        >
                          {estaPagada ? (
                            <MoneyOffIcon fontSize="small" />
                          ) : (
                            <PaidIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {esAdministrador && (
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setAEliminar(cuenta)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              );

              const datos = (
                // En el celular los datos van más juntos: son renglones cortos
                // de la misma cosa, no bloques distintos.
                <Stack spacing={esCelular ? 0.75 : 1.5} sx={{ width: "100%" }}>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <CalendarMonthIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                    <Typography variant="body2">
                      <b>Fecha:</b>{" "}
                      {formatearFechaLegible(cuenta.fecha) || "sin fecha"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <PaymentsIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                    <Typography variant="body2">
                      <b>Total a cancelar:</b> {formatearMoneda(saldo)}
                    </Typography>
                  </Stack>
                </Stack>
              );

              return (
                // Misma tarjeta que el buzón de cotizaciones: barra de acento
                // arriba, los datos, una divisoria y las acciones.
                <Card
                  key={cuenta.id}
                  // Con la columna de la derecha, tocarla muestra su vista previa.
                  onClick={conPanel ? (evento) => alternarElegida(evento, cuenta) : undefined}
                  sx={{
                    position: "relative",
                    overflow: "visible",
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: (theme) =>
                      `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
                    ...(conPanel && { cursor: "pointer" }),
                    willChange: "transform, box-shadow",
                    transition:
                      "box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease",
                    "&:hover": {
                      // El borde de verdad, que es redondeado, se tiñe del acento.
                      borderColor: "custom.accent",
                      boxShadow: theme.palette.custom.sombraTarjetaHover,
                    },
                    // La elegida, teñida del acento por dentro (ver estiloElegida).
                    ...(elegida?.id === cuenta.id &&
                      estiloElegida(
                        theme.palette.custom.accent,
                        theme.palette.custom.sombraTarjetaHover,
                      )),
                  }}
                >
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
                      // EN CELULAR, DOS RENGLONES: arriba quién es —icono,
                      // nombre y en qué anda— de lado a lado; abajo el número
                      // con lo que se puede hacer, a la derecha. Antes el
                      // estado se llevaba un renglón para él solo y los botones
                      // otro, al pie.
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

                          <Stack
                            direction="row"
                            spacing={0.25}
                            sx={{ flexShrink: 0, mt: -0.75 }}
                          >
                            {acciones}
                          </Stack>
                        </Stack>

                        {atendidaPor}
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
                          {atendidaPor}
                        </Box>
                      </Stack>
                    )}

                    <Divider sx={{ my: esCelular ? 1.5 : 2 }} />

                    {/* Fecha e importe; en el computador, las acciones al lado. */}
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

                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ flexShrink: 0 }}
                        >
                          {acciones}
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        {/* La lista trae de a tandas: la base crece para siempre y traerla
            entera sería cada vez más lento y más caro. Ojo: el buscador de
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
        <DialogTitle sx={{ color: acento }}>Eliminar cuenta de cobro</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la cuenta {aEliminar?.cuentaCobroId}? Esta
            acción no se puede deshacer.
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
