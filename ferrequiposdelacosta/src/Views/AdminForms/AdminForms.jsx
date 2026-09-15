import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
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
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { useAuth } from "../../Context/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { setKpis } from "../../Store/Slices/kpisSlice";
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
import { contarCotizacionesDelMes } from "../../Components/AdminCotizaciones/cotizacionesDb";
import { leerTotalesPanel } from "./totalesPanelDb";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import BotonAvisos from "../../Components/Avisos/BotonAvisos";
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

export default function AdminForms() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { logout } = useAuth();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isShortViewport = useMediaQuery("(max-height:700px)");
  const isCompact = isFullScreen || isShortViewport;
  const { name, photoURL, role, genero, permisos } = useSelector((state) => state.user);
  // Los números que se vieron la última vez que se pasó por acá. Se muestran
  // mientras la consulta va y vuelve, para que los recuadros no arranquen en
  // "…" cada vez que se entra al menú; en cuanto llegan los frescos, se
  // reemplazan. Nunca reemplazan a la consulta: solo tapan el hueco.
  const kpisGuardados = useSelector((state) => state.kpis);

  const handlerLogout = async () => {
    await logout();
  };

  // Cada recuadro necesita leer una colección distinta, y las reglas de
  // Firestore las tienen cerradas por rol. Un recuadro que el usuario no puede
  // consultar se quedaba en "…" para siempre y encima disparaba una consulta
  // que iba a rebotar. Se filtran igual que los botones de abajo: si no está
  // el permiso, el recuadro no existe y no se pregunta nada.
  const puedeVerCotizaciones = permisos.includes("cotizacion");
  const puedeVerCuentasCobro = permisos.includes("cuentaCombro");
  // El catálogo es la única colección que puede leer cualquiera. Su recuadro
  // aparece solo para quien no tiene ninguno de los otros dos —hoy, el
  // gestorEditor—, para que no se encuentre el menú sin panel. A quien ya
  // tiene los demás no se le agrega uno más, que apretaría la fila.
  const mostrarCatalogo = !puedeVerCotizaciones && !puedeVerCuentasCobro;

  // Equipos Activos y Pagos Pendientes salen de la PIZARRA: un documento con
  // los dos números, que mantiene el servidor. Antes se calculaban acá
  // leyendo todos los clientes y todas sus facturas en CADA visita al menú.
  //
  // Como la pizarra tiene solo números —ni un dato de cliente— la puede leer
  // cualquier empleado con sesión. Por eso estos dos recuadros ya no dependen
  // del permiso de clientes: hasta el gestorEditor los ve.
  const [stats, setStats] = useState(kpisGuardados);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // Cada consulta va en su propio try: si una falla —por ejemplo, si
      // todavía no se desplegaron las reglas de esa colección— los demás
      // recuadros igual muestran su número.
      const frescos = {};

      try {
        const totales = await leerTotalesPanel();
        if (totales) {
          frescos.equiposActivos = totales.equiposActivos;
          frescos.pagosPendientes = totales.pagosPendientes;
        }
      } catch (error) {
        console.error("Error al leer los totales del panel:", error);
      }

      if (puedeVerCuentasCobro) {
        try {
          frescos.cuentasCobro = await contarCuentasCobroDelMes();
        } catch (error) {
          console.error("Error al contar las cuentas de cobro del mes:", error);
        }
      }

      if (puedeVerCotizaciones) {
        // Antes este número se sacaba contando la lista completa de
        // cotizaciones que la app tenía en memoria. Ahora que el buzón carga
        // de a 50, esa cuenta quedaría corta sin que se note: hay que
        // preguntárselo a la base. Cuesta 1 lectura, porque Firestore
        // devuelve solo el número (ver contarCotizacionesDelMes).
        try {
          frescos.cotizaciones = await contarCotizacionesDelMes();
        } catch (error) {
          console.error("Error al contar las cotizaciones del mes:", error);
        }
      }

      if (mostrarCatalogo) {
        try {
          const snap = await getCountFromServer(collection(db, "equipos"));
          frescos.equiposCatalogo = snap.data().count;
        } catch (error) {
          console.error("Error al contar los equipos del catálogo:", error);
        }
      }

      if (cancelado) return;

      setStats((previos) => ({ ...previos, ...frescos }));
      // Quedan guardados para la próxima visita al menú, solo para no
      // mostrar "…" mientras se vuelven a consultar.
      dispatch(setKpis(frescos));
    })();

    return () => {
      cancelado = true;
    };
  }, [dispatch, puedeVerCuentasCobro, puedeVerCotizaciones, mostrarCatalogo]);

  const kpis = [
    puedeVerCotizaciones && {
      etiqueta: "COTIZACIONES",
      icono: <RequestQuoteIcon />,
      color: theme.palette.info.main,
      valor: stats.cotizaciones ?? "…",
      subtitulo: "Este mes",
    },
    puedeVerCuentasCobro && {
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
    mostrarCatalogo && {
      etiqueta: "EQUIPOS",
      icono: <BuildIcon />,
      color: theme.palette.info.main,
      valor: stats.equiposCatalogo ?? "…",
      subtitulo: "En el catálogo",
    },
  ].filter(Boolean);

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
      label: "EDITAR / ELIMINAR EQUIPO",
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
      label: "EDITAR / ELIMINAR USUARIOS",
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
  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const observadorRef = useRef(null);

  // LA MEDIDA SE TOMA APENAS EXISTE EL CONTENEDOR, no en un efecto: React
  // llama a esta función con el nodo en el mismo momento en que lo monta, así
  // que el primer cuadro que se pinta ya sale con los tiles en su tamaño.
  //
  // Con un efecto —aunque sea useLayoutEffect— el primer cuadro salía con los
  // valores de arranque y el segundo ya con la medida: eso era el reacomodo
  // que se veía al cargar la pantalla.
  //
  // Se mide el CONTENIDO, sin el relleno, que es lo mismo que informa el
  // observador (contentRect) y lo que de verdad se reparte entre los tiles.
  const contenedorRef = useCallback((nodo) => {
    observadorRef.current?.disconnect();
    observadorRef.current = null;
    if (!nodo) return;

    const estilo = getComputedStyle(nodo);
    setCaja({
      ancho:
        nodo.clientWidth -
        parseFloat(estilo.paddingLeft) -
        parseFloat(estilo.paddingRight),
      alto:
        nodo.clientHeight -
        parseFloat(estilo.paddingTop) -
        parseFloat(estilo.paddingBottom),
    });

    // Y de ahí en adelante, cada vez que cambie: girar el teléfono, achicar la
    // ventana, abrir el teclado.
    const observador = new ResizeObserver(([entrada]) => {
      setCaja({
        ancho: entrada.contentRect.width,
        alto: entrada.contentRect.height,
      });
    });
    observador.observe(nodo);
    observadorRef.current = observador;
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
  // EL CELULAR ACOSTADO no es un celular angosto. La regla de "dos columnas"
  // vale de pie, donde sobra alto y falta ancho; girado es al revés —ancho de
  // sobra y 400px de alto— y esas dos columnas obligaban a cuatro o cinco
  // filas: tiles de 40px, anchos y aplastados. Ahí se mide igual que en el
  // computador, que es lo que reparte según lo que hay.
  const deSuAlto = caja.alto >= caja.ancho;
  const cabenPorFila =
    isFullScreen && deSuAlto
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
  const altoTile = Math.max(
    // Nunca por debajo de lo que necesita el ícono con su rótulo: con el
    // celular acostado el reparto daba 40px y el texto quedaba comido. Si no
    // entran, que la lista se desplace.
    56,
    Math.min(
      isFullScreen && deSuAlto ? Infinity : 125,
      (caja.alto - (filas - 1) * gapPx) / filas,
    ),
  );

  const contenedorStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    // "safe": centra mientras el contenido entre, y si no entra lo alinea
    // arriba en vez de centrarlo igual.
    //
    // Con "center" a secas, el contenido que sobra se reparte a los dos lados
    // —también hacia ARRIBA— y esa parte queda fuera de alcance: el
    // desplazamiento no llega más atrás del inicio. Con el celular acostado,
    // donde las cuatro filas no entran en 360px, eso escondía la primera fila
    // entera debajo del encabezado.
    alignContent: "safe center",
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
      <Box
        sx={{
          px: 0,
          // EN EL CELULAR, 12px arriba y abajo: el mismo aire que deja el pie
          // con sus botones, así el contenido queda parejo entre los dos. En
          // el computador no hay pie y el encabezado respira un poco más.
          py: isFullScreen ? 1.5 : 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          "@media (min-width:916px)": { px: 2 },
        }}
      >
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
            <BotonAvisos />
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {!isMobile && kpis.length > 0 && (
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
        // EL MISMO PIE QUE LAS OTRAS DOCE VISTAS: 12px por lado. Acá tenía 32
        // arriba, y con el celular acostado esa diferencia contra los 12 del
        // encabezado se notaba el doble. El hueco de la barra de abajo (el
        // `pb` de la pantalla) no se toca: es lo que evita que el botón quede
        // por debajo de ella.
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Grid container justifyContent="center" spacing={1.5}>
            {/* En celular el botón de avisos va acá abajo, junto al de salir:
                arriba no hay lugar y es justamente donde más se usa, porque el
                aviso llega al teléfono. */}
            <Grid item xs={12} sm={5} md={4}>
              <BotonAvisos variante="boton" />
            </Grid>
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
