import { cloneElement, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Grid,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import LogoutIcon from "@mui/icons-material/Logout";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { contarCuentasCobroDelMes } from "../../Components/CuentaDeCobro/cuentasCobroDb";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import {
  calcularCantidadPendiente,
  calcularCuentaFactura,
  calcularEstadoFactura,
  obtenerFechaHoyBogota,
} from "../../Components/ClienteDetalle/facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

// Tarjeta resumen del panel de KPIs: ícono con tinte del color, número
// grande y subtítulo. Sin botón "Ver detalle" (a pedido, no lo trae).
//
// El borde de color y el resplandor van FIJOS, no en el hover: estas tarjetas
// no se pulsan —solo informan— y reaccionar al mouse las hacía parecer
// botones. Se quedan con el aspecto que antes solo se veía al pasar por
// encima, que además es el que mejor las separa del fondo.
const KpiCard = ({ icono, etiqueta, valor, subtitulo, color, tamanoValor = "h1" }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1,
      minWidth: 0,
      maxWidth: 320,
      aspectRatio: "2",
      p: 2.5,
      borderRadius: 3,
      border: "1px solid",
      borderColor: color,
      boxShadow: `0 0 16px ${alpha(color, 0.35)}`,
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 1.5,
    }}
  >
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        bgcolor: alpha(color, 0.12),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {cloneElement(icono, { sx: { color, fontSize: 36 } })}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ color, fontWeight: 700, letterSpacing: 0.3 }}>
        {etiqueta}
      </Typography>
      <Typography variant={tamanoValor} fontWeight="bold" sx={{ mt: 1.5, mb: 1.5 }}>
        {valor}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitulo}
      </Typography>
    </Box>
  </Paper>
);

KpiCard.propTypes = {
  icono: PropTypes.element.isRequired,
  etiqueta: PropTypes.string.isRequired,
  valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitulo: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  tamanoValor: PropTypes.string,
};

const mismoMesQueHoy = (epochMs) => {
  if (!epochMs) return false;
  const fecha = new Date(epochMs);
  const hoy = new Date();
  return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
};

export default function AdminForms() {
  const theme = useTheme();
  const { logout } = useAuth();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isShortViewport = useMediaQuery("(max-height:700px)");
  const isCompact = isFullScreen || isShortViewport;
  const { name, photoURL, role, genero, permisos } = useSelector((state) => state.user);
  const cotizaciones = useSelector((state) => state.cotizacion.listaCotizaciones);

  const handlerLogout = async () => {
    await logout();
  };

  // Equipos Activos y Pagos Pendientes se sacan agregando TODAS las facturas
  // de TODOS los clientes — mismo patrón de doble fetch que ya usa
  // SeguimientoClientes. Corre aparte, sin bloquear los botones de abajo.
  const [stats, setStats] = useState({
    equiposActivos: null,
    pagosPendientes: null,
    cuentasCobro: null,
  });

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const hoy = obtenerFechaHoyBogota();
        const clientesSnap = await getDocs(collection(db, "clientes"));
        const clientes = clientesSnap.docs.map((docSnap) => ({ id: docSnap.id }));

        const facturas = (
          await Promise.all(
            clientes.map((cliente) =>
              getDocs(collection(db, "clientes", cliente.id, "facturas")).then((snap) =>
                snap.docs.map((docSnap) => docSnap.data()),
              ),
            ),
          )
        ).flat();

        // Los equipos que están en la calle: cuentan las facturas "activa"
        // (alquiler vigente) y "vencida" (siguen afuera pasados de fecha). Las
        // "pendiente" todavía no salieron, y en "cobro" y "finalizada" ya
        // volvió todo. calcularCantidadPendiente además descuenta lo que sí se
        // devolvió, así que no hay riesgo de contar de más.
        const ESTADOS_EQUIPOS_ACTIVOS = ["activa", "vencida"];
        const equiposActivos = facturas
          .filter((factura) =>
            ESTADOS_EQUIPOS_ACTIVOS.includes(calcularEstadoFactura(factura, hoy)),
          )
          .flatMap((factura) => factura.equipos || [])
          .filter((equipo) => typeof equipo === "object")
          .reduce((total, equipo) => total + calcularCantidadPendiente(equipo), 0);

        const pagosPendientes = facturas.reduce(
          (total, factura) => total + calcularCuentaFactura(factura, hoy).saldoPendiente,
          0,
        );

        // Las cuentas de cobro emitidas este mes salen de su propia colección
        // (ver cuentasCobroDb). Va aparte del resto para que un fallo suyo
        // —por ejemplo, si todavía no se desplegaron sus reglas— no deje sin
        // número a los otros tres recuadros.
        let cuentasCobro = null;
        try {
          cuentasCobro = await contarCuentasCobroDelMes();
        } catch (error) {
          console.error("Error al contar las cuentas de cobro del mes:", error);
        }

        if (!cancelado) setStats({ equiposActivos, pagosPendientes, cuentasCobro });
      } catch (error) {
        console.error("Error al calcular los KPIs del panel:", error);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const cotizacionesEsteMes = (cotizaciones || []).filter((c) =>
    mismoMesQueHoy(c.createdAt),
  ).length;

  const kpis = [
    {
      etiqueta: "COTIZACIONES",
      icono: <RequestQuoteIcon />,
      color: theme.palette.info.main,
      valor: cotizacionesEsteMes,
      subtitulo: "Este mes",
    },
    {
      etiqueta: "CUENTAS DE COBRO",
      icono: <ReceiptLongIcon />,
      color: theme.palette.success.main,
      valor: stats.cuentasCobro ?? "…",
      subtitulo: "Este mes",
    },
    {
      etiqueta: "EQUIPOS ACTIVOS",
      icono: <LocalShippingIcon />,
      color: theme.palette.warning.main,
      valor: stats.equiposActivos ?? "…",
      subtitulo: "En alquiler",
    },
    {
      etiqueta: "PAGOS PENDIENTES",
      icono: <ErrorOutlineIcon />,
      color: theme.palette.error.main,
      valor: stats.pagosPendientes === null ? "…" : formatearMoneda(stats.pagosPendientes),
      subtitulo: "Por cobrar",
      tamanoValor: "h4",
    },
  ];

  const botonesConfig = [
    {
      permiso: "cotizacion",
      to: "/vistacotizacion",
      icon: <BuildIcon />,
      label: "COTIZACIÓN",
    },
    {
      permiso: "cuentaCombro",
      to: "/vistacuentadecobro",
      icon: <ReceiptIcon />,
      label: "CUENTA DE COBRO",
    },
    {
      permiso: "crearEquipos",
      to: "/vistacreaequipo",
      icon: <AddCircleOutlineIcon />,
      label: "CREAR EQUIPO",
    },
    {
      permiso: "eliminarEditarEquipos",
      to: "/vistaseleccionarequipo",
      icon: <EditIcon />,
      label: "EDITAR o ELIMINAR EQUIPO",
    },
    {
      permiso: "crearUsuarios",
      to: "/VistaCrearUsuarios",
      icon: <PersonAddAlt1Icon />,
      label: "CREAR USUARIOS",
    },
    {
      permiso: "eliminarUsuarios",
      to: "/VistaEliminarUsuario",
      icon: <PersonRemoveIcon />,
      label: "EDITAR o ELIMINAR USUARIOS",
    },
    {
      permiso: "clientes",
      to: "/vistaclientes",
      icon: <FolderSharedIcon />,
      label: "CLIENTES",
    },
    {
      permiso: "gestionCartera",
      to: "/vistaseguimientoclientes",
      icon: <SupportAgentIcon />,
      label: "SEGUIMIENTO de CLIENTES",
    },
    {
      permiso: "solicitudesCotizaciones",
      to: "/vistacotizacionesAdmin",
      icon: <ReceiptLongIcon />,
      label: "SOLICITUDES COTIZACIONES",
    },
    {
      permiso: "cuentaCombro",
      to: "/vistacuentascobro",
      icon: <ManageSearchIcon />,
      label: "BUSCAR CUENTAS DE COBRO",
    },
  ];

  const botonesVisibles = botonesConfig.filter((boton) =>
    permisos.includes(boton.permiso)
  );

  const gapPx = isCompact ? 12 : 32;

  // La forma del botón (ícono arriba, texto abajo) vive en el tema, como
  // variant="adminSquare". Acá solo va cómo se acomodan entre ellos.
  //
  // Se mide el ancho real del contenedor en vez de suponerlo. Antes las
  // columnas se fijaban a mano ("en computador, tres") mientras el ancho
  // máximo de cada tile hacía que en pantalla ancha entraran seis; el alto,
  // repartido entre las filas que ese cálculo suponía, salía para cuatro
  // cuando en realidad había dos: tiles de la mitad de alto —con el rótulo
  // cortado— y un hueco enorme debajo.
  const contenedorRef = useRef(null);
  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });

  useEffect(() => {
    const elemento = contenedorRef.current;
    if (!elemento) return undefined;

    const observador = new ResizeObserver(([entrada]) => {
      setCaja({
        ancho: entrada.contentRect.width,
        alto: entrada.contentRect.height,
      });
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  // LAS FILAS QUEDAN PAREJAS. No se meten todos los tiles que entren en la
  // primera fila para que a la última le sobren los que sean: se busca cuántas
  // filas hacen falta y después se reparten los botones entre ellas. Con diez
  // botones y sitio para seis, son dos filas de cinco y no una de seis y otra
  // de cuatro. El reparto cambia solo con los permisos de cada rol, que es lo
  // que decide cuántos tiles hay.
  //
  // En pantalla angosta son dos columnas y punto: la medida daría tres en un
  // celular grande y dos en uno chico, y los tiles no tienen por qué cambiar
  // de acomodo entre un teléfono y otro. En computador sí se mide, porque ahí
  // el ancho va de una ventana a media pantalla a un monitor de 27 pulgadas.
  const cabenPorFila = isFullScreen
    ? 2
    : Math.max(1, Math.floor((caja.ancho + gapPx) / (200 + gapPx)));
  const filas = Math.max(1, Math.ceil(botonesVisibles.length / cabenPorFila));
  const columnas = Math.ceil(botonesVisibles.length / filas);

  // Va como fila que se dobla y no como grilla, por la última fila: cuando
  // queda incompleta —achicando la ventana, diez botones pasan a 4+4+2— una
  // grilla la pega a la izquierda, y así se centra sola. A cambio hay que
  // darle la medida a cada tile, que es para lo que se mide el contenedor.
  //
  // El tope de ancho es para los roles con pocos permisos: con dos tiles
  // sueltos, sin él, cada uno se llevaría media pantalla. Con muchos, en
  // cambio, se encogen y llenan el ancho en vez de dejar los costados vacíos.
  const anchoTile = Math.min(
    300,
    (caja.ancho - (columnas - 1) * gapPx) / columnas,
  );
  // En pantalla angosta el alto es el que toque: los diez tiles tienen que
  // entrar de una, sin scroll, y para eso el tema los achica (ver la variante
  // "adminSquare" y su media query). En computador va topado, para que queden
  // apaisados y no lleguen pegados al borde de abajo; lo que sobra se reparte
  // arriba y abajo, en vez de acumularse todo abajo como un hueco.
  const altoTile = Math.min(
    isFullScreen ? Infinity : 125,
    (caja.alto - (filas - 1) * gapPx) / filas,
  );

  const contenedorStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    gap: `${gapPx}px`,
  };

  // Hasta tener la medida —el primer pintado— se usan valores de arranque,
  // para no mostrar tiles de tamaño raro por un instante.
  const buttonStyle = caja.ancho
    ? { width: anchoTile, height: altoTile, minWidth: 0, flexShrink: 0 }
    : { width: 240, height: 125, minWidth: 0, flexShrink: 0 };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ px: 0, py: 2, flexShrink: 0, display: "flex", alignItems: "center", gap: 1, "@media (min-width:916px)": { px: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Gestión de Operaciones"}
            descripcion={"Elige con qué quieres trabajar"}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {!isMobile && (
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          // El margen de abajo iguala al del pie de la pantalla (pb del Box
          // que envuelve todo): así los botones, que van centrados en lo que
          // queda, dejan el mismo aire contra los recuadros que contra el
          // borde inferior.
          sx={{ flexShrink: 0, mt: 3, mb: 2, mx: 2 }}
        >
          {kpis.map((kpi) => (
            <KpiCard key={kpi.etiqueta} {...kpi} />
          ))}
        </Stack>
      )}

      <Box
        ref={contenedorRef}
        sx={{
          flex: 1,
          minHeight: 0,
          ...contenedorStyle,
          overflowY: "auto",
          overflowX: "hidden",
          mx: isFullScreen ? 0 : 2,
          // Aire arriba para que quepa el hover. Los botones se levantan 3px
          // al pasar el mouse, y como este contenedor recorta lo que se sale
          // —tiene overflow para poder hacer scroll—, a los de la primera fila
          // se les cortaba el borde de arriba justo debajo del encabezado.
          pt: "6px",
        }}
      >
        {botonesVisibles.map((boton) => (
          <Button
            // La ruta y no el permiso: crear y buscar cuentas de cobro
            // comparten el permiso "cuentaCombro" y la clave estaría repetida.
            key={boton.to}
            component={Link}
            to={boton.to}
            variant="adminSquare"
            sx={buttonStyle}
          >
            {boton.icon}
            {boton.label}
          </Button>
        ))}
      </Box>

      {isFullScreen && (
        <Box sx={{ pt: 4, pb: 1.5 }}>
          <Grid container justifyContent="center">
            <Grid item xs={12} sm={5} md={4}>
              <Button
                onClick={handlerLogout}
                variant="contained"
                color="error"
                fullWidth
                startIcon={<LogoutIcon />}
              >
                CERRAR SESIÓN
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
