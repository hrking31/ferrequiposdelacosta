import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import KpiCard from "../../Components/KpiCard/KpiCard";
import FranjaKpis from "../../Components/KpiCard/FranjaKpis";
import DetalleEquiposActivos from "../../Components/KpiCard/DetalleEquiposActivos";
import DetallePagosPendientes from "../../Components/KpiCard/DetallePagosPendientes";
import DetalleCotizaciones from "../../Components/KpiCard/DetalleCotizaciones";
import DetalleCuentasCobro from "../../Components/KpiCard/DetalleCuentasCobro";
import DetalleCatalogo from "../../Components/KpiCard/DetalleCatalogo";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../Components/Firebase/Firebase";
import { useDispatch, useSelector } from "react-redux";
import { setKpis } from "../../Store/Slices/kpisSlice";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { leerTotalesPanel } from "./totalesPanelDb";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import BotonAvisos from "../../Components/Avisos/BotonAvisos";
import { formatearMoneda, nombreMesBogota } from "../../Utils/formato";

export default function AdminForms() {
  const theme = useTheme();
  const dispatch = useDispatch();
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

  // Cada recuadro necesita leer una colección distinta, y las reglas de
  // Firestore las tienen cerradas por rol. Un recuadro que el usuario no puede
  // consultar se quedaba en "…" para siempre y encima disparaba una consulta
  // que iba a rebotar. Se filtran igual que los botones de abajo: si no está
  // el permiso, el recuadro no existe y no se pregunta nada.
  const puedeVerCotizaciones = permisos.includes("cotizacion");
  const puedeVerCuentasCobro = permisos.includes("cuentaCombro");
  // Equipos activos y Pagos pendientes son la cartera de la empresa: desde el
  // 2026-10-22, solo para quien hace el seguimiento de clientes. Quien solo
  // edita el catálogo no tiene por qué ver equipos alquilados ni plata.
  const puedeVerCartera = permisos.includes("gestionCartera");
  // Todos esos números salen de la pizarra, que las reglas dejan leer solo a
  // esos roles. Sin ninguno de los tres permisos no se la pide: sería una
  // lectura rechazada.
  const leePizarra = puedeVerCartera || puedeVerCotizaciones || puedeVerCuentasCobro;
  // El catálogo es la única colección que puede leer cualquiera. Su recuadro
  // aparece solo para quien no tiene ninguno de los otros dos —hoy, el
  // gestorEditor—, para que no se encuentre el menú sin panel. A quien ya
  // tiene los demás no se le agrega uno más, que apretaría la fila.
  const mostrarCatalogo = !puedeVerCotizaciones && !puedeVerCuentasCobro;

  // Equipos Activos, Pagos Pendientes y —desde el 2026-10-22— Cotizaciones y
  // Cuentas de Cobro salen de la PIZARRA: un documento con los números y su
  // detalle, que mantiene el servidor. Antes los dos primeros se calculaban acá
  // leyendo todos los clientes y todas sus facturas en CADA visita al menú, y
  // los otros dos costaban una consulta cada uno: ahora es 1 lectura en total.
  const [stats, setStats] = useState(kpisGuardados);
  // El detalle del diálogo: cuál ("cotizaciones", "cuentas", "equipos",
  // "pagos" o "catalogo") y si está abierto. Al cerrar se conserva cuál era,
  // para que el título no cambie mientras el diálogo se desvanece.
  const [detalle, setDetalle] = useState({ abierto: false, cual: "equipos" });
  const abrirDetalle = (cual) => () => setDetalle({ abierto: true, cual });
  const cerrarDetalle = () => setDetalle((previo) => ({ ...previo, abierto: false }));

  // El catálogo en memoria, el mismo de la tienda y de editar o eliminar
  // equipos. Para ver los nombres se usa ese; si todavía no se bajó en esta
  // sesión, se pide al abrir el detalle y queda para esas pantallas.
  const { equipos: catalogo, loading: cargandoCatalogo } = useSelector((state) => state.equipos);
  const abrirCatalogo = () => {
    if (catalogo.length === 0 && !cargandoCatalogo) dispatch(fetchEquiposData());
    setDetalle({ abierto: true, cual: "catalogo" });
  };

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // Cada consulta va en su propio try: si una falla —por ejemplo, si
      // todavía no se desplegaron las reglas de esa colección— los demás
      // recuadros igual muestran su número.
      const frescos = {};

      if (leePizarra) {
        try {
          const totales = await leerTotalesPanel();
          if (totales) {
            frescos.equiposActivos = totales.equiposActivos;
            frescos.equiposPorTipo = totales.equiposPorTipo;
            frescos.pagosPendientes = totales.pagosPendientes;
            frescos.pagosPorEstado = totales.pagosPorEstado;
            frescos.cotizacionesMes = totales.cotizacionesMes;
            frescos.cotizaciones = totales.cotizacionesMes?.total;
            frescos.cuentasCobroMes = totales.cuentasCobroMes;
            frescos.cuentasCobro = totales.cuentasCobroMes?.total;
          }
        } catch (error) {
          console.error("Error al leer los totales del panel:", error);
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
  }, [dispatch, leePizarra, mostrarCatalogo]);

  const kpis = [
    puedeVerCotizaciones && {
      etiqueta: "COTIZACIONES",
      icono: <RequestQuoteIcon />,
      color: theme.palette.info.main,
      valor: stats.cotizaciones ?? "…",
      subtitulo: "Este mes",
      // Abre cuántas hay en cada estado. Viene en la misma pizarra: no cuesta
      // ninguna lectura más.
      onClick: abrirDetalle("cotizaciones"),
    },
    puedeVerCuentasCobro && {
      etiqueta: "CUENTAS DE COBRO",
      icono: <ReceiptLongIcon />,
      color: theme.palette.success.main,
      valor: stats.cuentasCobro ?? "…",
      subtitulo: "Este mes",
      // Abre cuántas hay en cada estado (sin plata: ver DetalleCuentasCobro).
      onClick: abrirDetalle("cuentas"),
    },
    puedeVerCartera && {
      etiqueta: "EQUIPOS ACTIVOS",
      icono: <LocalShippingIcon />,
      color: theme.palette.warning.main,
      valor: stats.equiposActivos ?? "…",
      subtitulo: "En alquiler",
      // Abre cuántos hay afuera de cada equipo. Viene en la misma pizarra:
      // no cuesta ninguna lectura más.
      onClick: abrirDetalle("equipos"),
    },
    puedeVerCartera && {
      etiqueta: "PAGOS PENDIENTES",
      icono: <ErrorOutlineIcon />,
      color: theme.palette.error.main,
      valor: stats.pagosPendientes === null ? "…" : formatearMoneda(stats.pagosPendientes),
      subtitulo: "Por cobrar",
      tamanoValor: "h4",
      // Abre cuánto se debe en facturas vencidas, en cobro y activas. También
      // viene en la pizarra.
      onClick: abrirDetalle("pagos"),
    },
    mostrarCatalogo && {
      etiqueta: "EQUIPOS",
      icono: <BuildIcon />,
      color: theme.palette.info.main,
      valor: stats.equiposCatalogo ?? "…",
      subtitulo: "En el catálogo",
      // Abre el nombre de cada equipo de la tienda.
      onClick: abrirCatalogo,
    },
  ].filter(Boolean);

  const TITULOS_DETALLE = {
    cotizaciones: `Cotizaciones ${nombreMesBogota()}`,
    cuentas: `Cuentas de cobro ${nombreMesBogota()}`,
    equipos: "Equipos activos",
    pagos: "Pagos pendientes",
    catalogo: "Equipos del catálogo",
  };

  // EN PANTALLA ANGOSTA las tarjetas grandes no entran: van los mismos
  // números, solo con su ícono, en una franja. Va donde estaba la barra: abajo
  // en el celular y arriba de ahí en adelante.
  //
  // EL LOGO DE LA TIENDA va dentro del encabezado (ver `conLogo` en
  // HeaderUsuario): en el celular en el lugar del botón de salir, y en
  // computador al extremo derecho desde el 2026-10-22, con los avisos al lado.
  // Al tocarlo ofrece ir a la tienda o cerrar sesión.
  const franja = <FranjaKpis kpis={kpis} />;

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
  // ARRANCA CON UNA ESTIMACIÓN, no en cero. Entre el primer dibujo y el que
  // ya trae la medida real pasan unos 60ms —de sobra para que el navegador
  // pinte—, y con ancho 0 ese primer cuadro repartía los tiles en una sola
  // columna: eso es lo que se veía acomodarse al cargar.
  //
  // La cuenta es la de la pantalla: el ancho de la ventana menos los rellenos
  // que ya se conocen (los del contenedor y los del área de tiles), y el alto
  // menos lo que ocupan el encabezado y los recuadros de arriba. No tiene que
  // ser exacta: basta con que el reparto salga bien de entrada, y el
  // observador la corrige en el mismo cuadro.
  const [caja, setCaja] = useState(() => {
    if (typeof window === "undefined") return { ancho: 0, alto: 0 };
    return {
      ancho: Math.max(0, window.innerWidth - 80),
      alto: Math.max(0, window.innerHeight - 300),
    };
  });
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
    //
    // CON LA FRANJA DE NÚMEROS (pantalla angosta), los botones van pegados a
    // ella en vez de centrados: centrados, lo que sobraba de alto quedaba como
    // un hueco entre los botones y los números. Arriba de los botones cuando
    // la franja va arriba, abajo cuando va abajo; "safe" por lo mismo de
    // antes, si no entran arrancan arriba.
    alignContent: isMobile ? (isFullScreen ? "safe flex-end" : "flex-start") : "safe center",
    gap: `${gapPx}px`,
  };

  const buttonStyle = {
    width: anchoTile,
    height: altoTile,
    minWidth: 0,
    flexShrink: 0,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // Sin la barra (ver NavBar), ni arriba ni abajo hay que dejarle hueco.
        pb: isFullScreen ? 1.5 : 2,
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
            conLogo
            // Ya se está en el menú: la lista del logo no ofrece ir a él.
            sinIrAlMenu
            acciones={<BotonAvisos />}
          />
        </Box>
      </Box>

      {!isMobile && (
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          alignItems="center"
          // El margen de abajo iguala al del pie de la pantalla (pb del Box
          // que envuelve todo): así los botones, que van centrados en lo que
          // queda, dejan el mismo aire contra los recuadros que contra el
          // borde inferior.
          sx={{ flexShrink: 0, mt: 1, mb: 2, mx: 2 }}
        >
          {kpis.map((kpi) => (
            <KpiCard key={kpi.etiqueta} {...kpi} />
          ))}
        </Stack>
      )}

      {isMobile && !isFullScreen && (
        <Box sx={{ flexShrink: 0, mb: 1, mx: 2 }}>
          {franja}
        </Box>
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
        // encabezado se notaba el doble.
        //
        // Solo el aire de arriba: el de abajo lo pone la franja. Y si no hay
        // botón —con los avisos ya activados, BotonAvisos no dibuja nada— el
        // pie no ocupa nada: quedaba un hueco de 24px entre los botones y la
        // franja. El aviso de "quedó activado" no se ve afectado: va flotando.
        <Box
          sx={{
            px: 1.5,
            pt: 1.5,
            flexShrink: 0,
            "&:not(:has(.MuiButton-root))": { pt: 0 },
          }}
        >
          {/* En celular el botón de avisos va acá abajo: arriba no hay lugar y
              es justamente donde más se usa, porque el aviso llega al
              teléfono. Sin grilla: aun sin botón, sus casillas dejaban su
              relleno. */}
          <Box sx={{ width: { xs: "100%", sm: "42%" }, mx: "auto" }}>
            <BotonAvisos variante="boton" />
          </Box>
        </Box>
      )}

      {isFullScreen && <Box sx={{ flexShrink: 0, mt: 1.5 }}>{franja}</Box>}

      <Dialog
        open={detalle.abierto}
        onClose={cerrarDetalle}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: theme.palette.custom.accent }}>
          {TITULOS_DETALLE[detalle.cual]}
        </DialogTitle>
        <DialogContent>
          {detalle.cual === "cotizaciones" && (
            <DetalleCotizaciones cotizacionesMes={stats.cotizacionesMes} />
          )}
          {detalle.cual === "cuentas" && (
            <DetalleCuentasCobro cuentasCobroMes={stats.cuentasCobroMes} />
          )}
          {detalle.cual === "equipos" && (
            <DetalleEquiposActivos equiposPorTipo={stats.equiposPorTipo} />
          )}
          {detalle.cual === "pagos" && (
            <DetallePagosPendientes pagosPorEstado={stats.pagosPorEstado} />
          )}
          {detalle.cual === "catalogo" && (
            <DetalleCatalogo
              equipos={catalogo.length === 0 && cargandoCatalogo ? null : catalogo}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={cerrarDetalle}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
