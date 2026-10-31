import { cloneElement, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import KpiCard from "../../Components/KpiCard/KpiCard";
import FranjaKpis from "../../Components/KpiCard/FranjaKpis";
import KpisDestacados from "../../Components/KpiCard/KpisDestacados";
import KpisResumen from "../../Components/KpiCard/KpisResumen";
import DetalleEquiposActivos from "../../Components/KpiCard/DetalleEquiposActivos";
import DetallePagosPendientes from "../../Components/KpiCard/DetallePagosPendientes";
import DetalleCatalogo from "../../Components/KpiCard/DetalleCatalogo";
import { useDispatch, useSelector } from "react-redux";
import { setKpis } from "../../Store/Slices/kpisSlice";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import BuildIcon from "@mui/icons-material/Build";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloseIcon from "@mui/icons-material/Close";
import BOTONES_MENU, { AREAS_MENU } from "../../Components/RolesPermisos/botonesMenu";
import { leerTotalesPanel } from "./totalesPanelDb";
import { contarCotizacionesDelMes, contarCuentasCobroDelMes } from "./documentosDelMesDb";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import BotonAvisos from "../../Components/Avisos/BotonAvisos";
import { formatearMoneda } from "../../Utils/formato";

// En la pantalla de pie, los KPI de la fila de arriba, en este orden: los de
// la cartera. Los demás van en la fila de abajo.
const KPIS_ARRIBA_DE_PIE = ["PAGOS PENDIENTES", "EQUIPOS ACTIVOS"];

export default function AdminForms() {
  const theme = useTheme();
  const dispatch = useDispatch();
  // EL CELULAR ACOSTADO se reconoce por el alto (un teléfono acostado no
  // pasa de unos 430px; un computador nunca baja tanto), no por el ancho: uno
  // grande pasa de 915 y se lo trataba como computador (pedido del dueño,
  // 2026-10-29). Va como celular, con la franja de números de pie a la
  // izquierda y las áreas en 2 × 2.
  const acostado = useMediaQuery("(max-height:500px) and (orientation: landscape)");
  const isFullScreen = useMediaQuery("(max-width:915px)") || acostado;
  // EL CELULAR ACOSTADO MUY BAJITO (unos 360px de alto): ahí los botones con
  // el ícono arriba no entraban y salía barra. Botones acostados, uno debajo
  // del otro, y todo un poco más justo (pedido del dueño, 2026-10-30; en los
  // más altos, como estaba).
  const bajito = useMediaQuery("(max-height:380px) and (orientation: landscape)");
  // LOS KPI SEGÚN EL ANCHO (pedido del dueño, 2026-10-29), de ancho a
  // angosto: las cinco tarjetas en fila (desde 1600px: más angosto, sus
  // nombres ya no caben en un renglón); la plata destacada y los demás de a
  // dos (1150 a 1599, ver KpisDestacados); una columna de resumen a la
  // derecha del menú, que va de a dos áreas (916 a 1149, ver KpisResumen); y
  // en el celular, la franja de abajo. Cortes elegidos mirando la pantalla.
  // La columna, solo con la pantalla más ancha que alta: en una tableta de pie
  // (un iPad Pro, 1024 × 1366) sobraba muchísimo alto arriba y abajo, y ahí
  // van arriba, como en la pantalla grande (pedido del dueño, 2026-10-29).
  const kpisEnFila = useMediaQuery("(min-width:1600px)");
  const kpisEnColumna =
    useMediaQuery("(max-width:1149px) and (orientation: landscape)") && !isFullScreen;
  // Desde 1150px los KPI van arriba de los botones, juntos (ver abajo).
  const bloqueCentrado = !isFullScreen && !kpisEnColumna;
  // LA PANTALLA DE PIE (más alta que ancha, desde 916px, sin la fila de cinco
  // tarjetas: una tableta, o una ventana de computador de pie). Pedido del
  // dueño, 2026-10-29 (en un iPad Pro sobraba muchísimo alto; estirar los
  // botones y el mosaico tipo Pinterest no le gustaron): arriba los KPI en
  // dos filas —pagos y equipos activos mitad y mitad, y debajo los otros tres
  // (2026-10-30)—; abajo las áreas en 2 × 2, con sus botones lado a lado. El
  // alto que sobra se reparte en partes iguales.
  const dePie = useMediaQuery("(orientation: portrait)") && !isFullScreen && !kpisEnFila;
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
  // El recuadro del catálogo, para quien trabaja con los equipos: crear o
  // editar. Hoy: gestorEditor, gestorIntegral y administrador; no
  // gestorFacturacion (pedido del dueño, 2026-10-23).
  const mostrarCatalogo =
    permisos.includes("crearEquipos") || permisos.includes("eliminarEditarEquipos");

  // Equipos Activos y Pagos Pendientes salen de la PIZARRA: un documento con
  // los números y su detalle, que mantiene el servidor. Antes se calculaban acá
  // leyendo todos los clientes y todas sus facturas en CADA visita al menú:
  // ahora es 1 lectura. Cotizaciones y Cuentas de Cobro se cuentan aparte, 1
  // lectura cada una (ver documentosDelMesDb).
  const [stats, setStats] = useState(kpisGuardados);
  // El detalle del diálogo: cuál ("equipos", "pagos" o "catalogo") y si está
  // abierto. Al cerrar se conserva cuál era, para que el título no cambie
  // mientras el diálogo se desvanece.
  const [detalle, setDetalle] = useState({ abierto: false, cual: "equipos" });
  const abrirDetalle = (cual) => () => setDetalle({ abierto: true, cual });
  const cerrarDetalle = () => setDetalle((previo) => ({ ...previo, abierto: false }));

  // El catálogo en memoria, el mismo de la tienda y de editar o eliminar
  // equipos. De ahí salen el número del recuadro y los nombres de su detalle
  // (2026-10-26, decisión del dueño): la app ya lo bajó al abrirse, así que
  // entrar al menú no cuesta ninguna lectura. Antes se contaba en la base en
  // cada visita (1 lectura). Si la memoria está vacía —se recargó la página
  // estando acá— se pide una vez y queda para las demás pantallas.
  //
  // A sabiendas: un equipo que cree otra persona desde otro aparato no se ve
  // hasta recargar, igual que en la tienda.
  const { equipos: catalogo, loading: cargandoCatalogo } = useSelector((state) => state.equipos);
  const abrirCatalogo = () => setDetalle({ abierto: true, cual: "catalogo" });

  useEffect(() => {
    if (mostrarCatalogo && catalogo.length === 0 && !cargandoCatalogo) {
      dispatch(fetchEquiposData());
    }
    // Solo al entrar: si el catálogo vuelve vacío o falla, no se insiste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, mostrarCatalogo]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // Cada consulta va en su propio try: si una falla —por ejemplo, si
      // todavía no se desplegaron las reglas de esa colección— los demás
      // recuadros igual muestran su número.
      const frescos = {};

      // La pizarra la dejan leer las reglas solo a quien ve la cartera: sin
      // ese permiso no se la pide, sería una lectura rechazada.
      if (puedeVerCartera) {
        try {
          const totales = await leerTotalesPanel();
          if (totales) {
            frescos.equiposActivos = totales.equiposActivos;
            frescos.equiposPorTipo = totales.equiposPorTipo;
            frescos.pagosPendientes = totales.pagosPendientes;
            frescos.pagosPorEstado = totales.pagosPorEstado;
          }
        } catch (error) {
          console.error("Error al leer los totales del panel:", error);
        }
      }

      if (puedeVerCotizaciones) {
        try {
          frescos.cotizaciones = await contarCotizacionesDelMes();
        } catch (error) {
          console.error("Error al contar las cotizaciones del mes:", error);
        }
      }

      if (puedeVerCuentasCobro) {
        try {
          frescos.cuentasCobro = await contarCuentasCobroDelMes();
        } catch (error) {
          console.error("Error al contar las cuentas de cobro del mes:", error);
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
  }, [dispatch, puedeVerCartera, puedeVerCotizaciones, puedeVerCuentasCobro]);

  const kpis = [
    puedeVerCotizaciones && {
      etiqueta: "COTIZACIONES",
      icono: <RequestQuoteIcon />,
      color: theme.palette.info.main,
      valor: stats.cotizaciones ?? "…",
      subtitulo: "Este mes",
      // Sin detalle por estado (decisión del dueño, 2026-10-23): en el celular
      // abre la misma tarjeta del computador, con el número y "Este mes".
      onClick: abrirDetalle("cotizaciones"),
    },
    puedeVerCuentasCobro && {
      etiqueta: "CUENTAS DE COBRO",
      icono: <ReceiptLongIcon />,
      color: theme.palette.success.main,
      valor: stats.cuentasCobro ?? "…",
      subtitulo: "Este mes",
      onClick: abrirDetalle("cuentas"),
    },
    // El catálogo, justo después de cuentas de cobro (pedido del dueño,
    // 2026-10-23).
    mostrarCatalogo && {
      etiqueta: "EQUIPOS",
      icono: <BuildIcon />,
      color: theme.palette.info.main,
      // "…" mientras la memoria está vacía: el catálogo nunca lo está de
      // verdad, así que vacío quiere decir que se está bajando.
      valor: catalogo.length > 0 ? catalogo.length : "…",
      subtitulo: "En el catálogo",
      // Abre la lista de equipos de la tienda, con su miniatura.
      onClick: abrirCatalogo,
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
  ].filter(Boolean);

  const TITULOS_DETALLE = {
    equipos: "Equipos activos",
    pagos: "Pagos pendientes",
    catalogo: "Equipos del catálogo",
  };
  // Las que no tienen detalle: la ventana muestra su propia tarjeta, sin
  // título aparte (ya lo trae la tarjeta).
  const TARJETA_EN_VENTANA = {
    cotizaciones: "COTIZACIONES",
    cuentas: "CUENTAS DE COBRO",
  };
  const tarjetaEnVentana = kpis.find(
    (kpi) => kpi.etiqueta === TARJETA_EN_VENTANA[detalle.cual],
  );

  // EN EL CELULAR las tarjetas grandes no entran: van los mismos números,
  // solo con su ícono, en una franja abajo. Desde 916px, las tarjetas (pedido
  // del dueño, 2026-10-29; antes la franja seguía hasta 1024).
  //
  // EL LOGO DE LA TIENDA va dentro del encabezado (ver `conLogo` en
  // HeaderUsuario): en el celular en el lugar del botón de salir, y en
  // computador al extremo derecho desde el 2026-10-22, con los avisos al lado.
  // Al tocarlo ofrece ir a la tienda o cerrar sesión.
  const franja = <FranjaKpis kpis={kpis} />;

  // Los botones salen de la lista compartida (ver botonesMenu): la pantalla de
  // Usuarios muestra los mismos para cada rol.
  const botonesVisibles = BOTONES_MENU.filter((boton) =>
    permisos.includes(boton.permiso)
  );

  // LOS BOTONES POR ÁREAS (pedido del dueño, 2026-10-29): VENTAS, COBROS,
  // CLIENTES y CATÁLOGO Y PERSONAL, cada una en su recuadro con sus botones.
  // Solo las áreas en las que el rol tiene algo.
  //
  // SIN MEDIR LA PANTALLA (también pedido suyo): antes se medía el contenedor
  // para repartir los botones en filas parejas. Ahora el acomodo sale solo de
  // cuántas áreas hay y del CSS: en el computador, una columna por área; en el
  // celular, una debajo de la otra (de a dos si está acostado), con sus
  // botones lado a lado. El alto de los botones va con el de la pantalla
  // (dvh) y con tope, así nunca quedan aplastados ni gigantes.
  const areas = AREAS_MENU.map((area) => ({
    ...area,
    tono: area.color === "accent" ? theme.palette.custom.accent : theme.palette[area.color].main,
    botones: botonesVisibles.filter((boton) => boton.area === area.id),
  })).filter((area) => area.botones.length > 0);

  // De pie, los KPI en dos filas (ver `dePie`).
  // En el orden de la lista: la plata primero.
  const kpisArriba = KPIS_ARRIBA_DE_PIE.map((etiqueta) => kpis.find((kpi) => kpi.etiqueta === etiqueta)).filter(Boolean);
  const kpisAbajo = kpis.filter((kpi) => !KPIS_ARRIBA_DE_PIE.includes(kpi.etiqueta));

  // UN ÁREA DEL MENÚ en su recuadro: su título y sus botones. La usan el menú
  // y la pantalla de pie.
  const tarjetaArea = (area) => (
    <Box
      key={area.id}
      component="section"
      aria-label={area.titulo}
      sx={{
        minWidth: 0,
        // En el celular acostado, más justo: el alto no sobra.
        p: bajito ? 0.75 : acostado ? 1 : isFullScreen ? 1.25 : 2,
        display: "flex",
        flexDirection: "column",
        // El recuadro de toda la app (theme.recuadro).
        ...theme.recuadro(area.tono),
      }}
    >
      {/* El título del área: su ícono en un círculo y el nombre. */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: bajito ? 0.25 : acostado ? 0.5 : isFullScreen ? 1 : 1.5 }}>
        <Box
          sx={{
            width: bajito ? 20 : isFullScreen ? 24 : 30,
            height: bajito ? 20 : isFullScreen ? 24 : 30,
            ...theme.iconoDeRecuadro(area.tono, bajito ? 20 : isFullScreen ? 24 : 30),
          }}
        >
          {cloneElement(area.icono, { sx: { fontSize: isFullScreen ? 15 : 18, color: area.tono } })}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.8, color: area.tono }}>
          {area.titulo}
        </Typography>
      </Stack>
      {/* Sus botones: uno debajo del otro en el computador, lado a lado
          en el celular y en la pantalla de pie. */}
      <Box
        sx={{
          display: "grid",
          gap: isFullScreen ? 1 : 1.5,
          // En el celular acostado bajito, uno debajo del otro: lado a lado,
          // con el ícono al costado, los nombres largos no cabían.
          gridTemplateColumns:
            (isFullScreen || dePie) && !bajito ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
          ...(bajito && { gap: 0.75 }),
          // En el celular, al alto del área.
          ...(isFullScreen && { flex: 1 }),
        }}
      >
        {area.botones.map((boton) => (
          <Button
            // La ruta y no el permiso: crear y buscar cuentas de cobro
            // comparten el permiso "cuentaCombro" y la clave estaría
            // repetida.
            key={boton.to}
            component={Link}
            to={boton.to}
            variant="adminSquare"
            sx={{
              width: "100%",
              minWidth: 0,
              // En el celular, el alto de su área (con un mínimo).
              ...(isFullScreen && { minHeight: acostado ? 52 : 64 }),
              height: isFullScreen
                ? "auto"
                : kpisEnColumna
                  ? "clamp(84px, 13dvh, 140px)"
                  : dePie
                    ? "clamp(108px, 13dvh, 170px)"
                    : "clamp(84px, 19dvh, 176px)",
              // El ícono con el color de su área; con la columna de
              // resumen, más chico y más pegado al nombre, para que los de
              // dos renglones quepan.
              "& .MuiSvgIcon-root": { color: area.tono, ...(kpisEnColumna && { fontSize: 30 }) },
              ...(kpisEnColumna && { gap: 1 }),
              // EN EL CELULAR ACOSTADO BAJITO, el botón también acostado: el
              // ícono a la izquierda y el nombre al lado, en un renglón
              // (pedido del dueño, 2026-10-30: con 360px de alto, el ícono
              // arriba y los nombres largos en tres renglones sacaban barra).
              ...(bajito && {
                minHeight: 34,
                flexDirection: "row",
                justifyContent: "flex-start",
                textAlign: "left",
                gap: 1,
                px: 1.25,
                py: 0.25,
                fontSize: "0.72rem",
                lineHeight: 1.25,
                "& .MuiSvgIcon-root": { color: area.tono, fontSize: 22, flexShrink: 0 },
              }),
              "&:hover": { borderColor: area.tono },
            }}
          >
            {boton.icon}
            {boton.label}
          </Button>
        ))}
      </Box>
    </Box>
  );

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
            // También con el celular acostado, aunque pase de 915px.
            compacto={isFullScreen}
            acciones={<BotonAvisos />}
          />
        </Box>
      </Box>

      {/* EN EL COMPUTADOR, desde 1150px, el alto que sobra se reparte en
          partes iguales: entre el encabezado y los KPI, entre los KPI y los
          botones, y debajo de los botones (pedido del dueño, 2026-10-29: los
          KPI quedaban pegados al encabezado y lejos de los botones; centrar
          el bloque dejaba el hueco arriba). Si no cabe, arranca arriba y se
          desplaza. Con la columna de resumen o en el celular, la envoltura no
          cuenta. */}
      {dePie ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            mx: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            gap: 3,
            // Aire para el resplandor y el levantarse de los botones.
            py: "6px",
          }}
        >
          {/* Los KPI en dos filas (pedido del dueño, 2026-10-30): arriba los
              de la cartera, mitad y mitad y en grande; abajo los demás, en
              partes iguales. Si un rol no tiene los de una fila, esa no va. */}
          {kpis.length > 0 && (
            <Stack spacing={2} sx={{ flexShrink: 0 }}>
              {[kpisArriba, kpisAbajo]
                .filter((fila) => fila.length > 0)
                .map((fila) => (
                  <Box
                    key={fila[0].etiqueta}
                    sx={{ display: "grid", gap: 2, gridTemplateColumns: `repeat(${fila.length}, minmax(0, 1fr))` }}
                  >
                    {fila.map((kpi) => (
                      <KpiCard
                        key={kpi.etiqueta}
                        {...kpi}
                        mediano
                        // Las de arriba: círculo grande, nombre más grande y
                        // más aire.
                        ancha={fila === kpisArriba}
                        onClick={undefined}
                      />
                    ))}
                  </Box>
                ))}
            </Stack>
          )}
          {/* Las áreas en 2 × 2. */}
          <Box
            sx={{
              flexShrink: 0,
              display: "grid",
              gap: 3,
              gridTemplateColumns: `repeat(${Math.min(areas.length, 2)}, minmax(0, 1fr))`,
            }}
          >
            {areas.map(tarjetaArea)}
          </Box>
        </Box>
      ) : (
        <Box
          sx={
            bloqueCentrado
              ? {
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-evenly",
                  gap: 3,
                }
              : { display: "contents" }
          }
        >
          {kpisEnFila && (
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              // Todas del alto de la más alta: la de pagos, con la cifra más
              // larga, quedaba más alta que las demás (lo notó el dueño).
              alignItems="stretch"
              sx={{ flexShrink: 0, mx: 2 }}
            >
              {/* EN EL COMPUTADOR las tarjetas solo muestran: el detalle en una
                  ventana queda para el celular, donde la franja no tiene espacio
                  para más (pedido del dueño, 2026-10-23). */}
              {kpis.map((kpi) => (
                <KpiCard key={kpi.etiqueta} {...kpi} onClick={undefined} />
              ))}
            </Stack>
          )}

          {!isFullScreen && !kpisEnFila && !kpisEnColumna && (
            <Box sx={{ flexShrink: 0, mx: 2 }}>
              <KpisDestacados kpis={kpis} />
            </Box>
          )}

          {/* Con la columna de resumen, el menú y ella lado a lado en una misma
              fila, que toma el alto de los botones: así la columna mide lo mismo
              que ellos (pedido del dueño, 2026-10-29). La fila va centrada a lo
              alto, como iban los botones. Si no, la envoltura no cuenta
              (display: contents). */}
          <Box
            sx={
              kpisEnColumna
                ? {
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 280px",
                    alignContent: "safe center",
                    gap: 3,
                    mx: 2,
                    mt: 1,
                  }
                : acostado
                  ? // El celular acostado: la franja de pie y el menú al lado.
                    { flex: 1, minHeight: 0, display: "flex", gap: 1.5 }
                  : { display: "contents" }
            }
          >
            {acostado && <FranjaKpis kpis={kpis} vertical />}
            <Box
              sx={{
                // Dentro del bloque centrado, lo que ocupa; si no, el alto que
                // quede, con su propio desplazamiento.
                ...(bloqueCentrado
                  ? { flexShrink: 0 }
                  : { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }),
                minWidth: 0,
                mx: isFullScreen || kpisEnColumna ? 0 : 2,
                // Aire arriba y abajo para que quepa el hover: los botones se
                // levantan unos px y este contenedor recorta lo que se sale.
                py: "6px",
                display: "grid",
                gap: bajito ? 0.75 : isFullScreen ? 1.25 : 3,
                // "safe": centradas mientras entren; si no, desde arriba (con
                // "center" a secas, lo de arriba quedaba fuera de alcance). EN EL
                // CELULAR las áreas se reparten todo el alto y sus botones crecen
                // (pedido del dueño, 2026-10-29: quedaba un hueco arriba); si no
                // caben, se desplazan.
                alignContent: isFullScreen ? "stretch" : "safe center",
                ...(isFullScreen && { gridAutoRows: "1fr" }),
                justifyContent: "center",
                gridTemplateColumns: isFullScreen
                  ? "minmax(0, 1fr)"
                  : kpisEnColumna
                    ? `repeat(${Math.min(areas.length, 2)}, minmax(0, 1fr))`
                    : `repeat(${areas.length}, minmax(0, 320px))`,
                // El celular acostado: ancho de sobra y poco alto, de a dos áreas.
                ...(isFullScreen && {
                  "@media (orientation: landscape)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
                }),
              }}
            >
              {areas.map(tarjetaArea)}
            </Box>
            {kpisEnColumna && <KpisResumen kpis={kpis} />}
          </Box>
        </Box>
      )}

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

      {isFullScreen && !acostado && <Box sx={{ flexShrink: 0, mt: 1.5 }}>{franja}</Box>}

      {/* EL CATÁLOGO, más ancho y de alto fijo (pedido del dueño,
          2026-10-28): con el buscador, la ventana no se achica al filtrar.
          En el celular, casi de borde a borde. */}
      <Dialog
        open={detalle.abierto}
        onClose={cerrarDetalle}
        fullWidth
        maxWidth={detalle.cual === "catalogo" ? "sm" : "xs"}
        sx={
          detalle.cual === "catalogo"
            ? {
                "& .MuiDialog-paper": {
                  height: "80dvh",
                  ...(isFullScreen && { m: 1, width: "calc(100% - 16px)" }),
                },
              }
            : undefined
        }
      >
        {/* LA X ARRIBA, al lado del título, y sin botón "Cerrar" al pie (pedido
            del dueño, 2026-10-23), como en la historia del equipo. La tarjeta
            sola no lleva ni eso: se cierra tocando afuera. */}
        {TITULOS_DETALLE[detalle.cual] && (
          <DialogTitle
            sx={{
              color: theme.palette.custom.accent,
              display: "flex",
              alignItems: "center",
              gap: 1,
              pr: 1,
            }}
          >
            <Box component="span" sx={{ flex: 1 }}>
              {TITULOS_DETALLE[detalle.cual]}
            </Box>
            <Tooltip title="Cerrar">
              {/* El rojo del tema para cancelar y salir, el mismo de "Cerrar
                  sesión" en el encabezado. */}
              <IconButton size="small" color="error" aria-label="Cerrar" onClick={cerrarDetalle}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </DialogTitle>
        )}
        <DialogContent>
          {tarjetaEnVentana && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <KpiCard {...tarjetaEnVentana} onClick={undefined} />
            </Box>
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
      </Dialog>
    </Box>
  );
}
