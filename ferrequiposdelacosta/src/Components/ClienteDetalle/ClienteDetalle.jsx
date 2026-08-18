import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Avatar,
  Badge,
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
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import BadgeIcon from "@mui/icons-material/Badge";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ConstructionIcon from "@mui/icons-material/Construction";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import { invalidarCopiaClientes } from "../ListaClientes/clientesCache";
import FacturaFormDialog from "./FacturaFormDialog";
import EntregarSaldoDialog from "./EntregarSaldoDialog";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import AbonoDialog from "./AbonoDialog";
import ReporteFacturasDialog from "./ReporteFacturasDialog";
import SeleccionarFacturasDialog from "./SeleccionarFacturasDialog";
import FacturaCard from "./FacturaCard";
import construirCuentaCobroDesdeFacturas from "./cuentaCobroDesdeFacturas";
import { abrirCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import {
  calcularCuentaCliente,
  calcularEstadoCliente,
  calcularEstadoFactura,
  ESTADO_CLIENTE_INFO,
} from "./facturaUtils";
import RegistrarDevolucionDialog from "../SeguimientoClientes/RegistrarDevolucionDialog";
import { formatearNit } from "../../Utils/formato";
import {
  casillasDeCuenta,
  iconBtnSx,
  renderPizarraTotales,
} from "./recuadrosCuenta";

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa")
    return cliente.razonSocial || cliente.nombreOriginal;
  return (
    [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.nombreOriginal
  );
};

const tieneTelefonoValido = (telefono) =>
  telefono &&
  !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Solo para avisar, antes de reemplazarla, si hay una cuenta de cobro a
  // medio hacer en la sesión.
  const itemsCuentaCobro = useSelector((state) => state.cuentacobro.value.items);
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  // El contacto (teléfono, NIT, dirección) pasa de dos columnas a una, y
  // aparece el botón de volver al listado.
  const isFullScreen = useMediaQuery("(max-width:915px)");
  // Desde acá entran en un solo renglón el nombre, el recuadro de cuenta y los
  // botones. Por debajo, el recuadro baja a su propia fila (ver el armado del
  // encabezado). No se persigue el ancho exacto en que dejan de entrar —depende
  // del largo del nombre del cliente— sino que se corta con margen de sobra.
  const esAncho = useMediaQuery(theme.breakpoints.up("lg"));
  const acento = theme.palette.custom.accent;
  const avatarBgPorEstado = theme.palette.custom.estadoFactura;
  const [cliente, setCliente] = useState(null);
  // `facturas` son SIEMPRE las abiertas. Las cerradas viven aparte y solo
  // llegan si el usuario las pide: así la cuenta del encabezado —que se arma
  // con las abiertas— no cambia por el hecho de haber mirado el historial.
  const [facturas, setFacturas] = useState([]);
  const [facturaEntregando, setFacturaEntregando] = useState(null);
  const [facturasCerradas, setFacturasCerradas] = useState([]);
  // Cuántas cerradas tiene, sin traerlas: lo dice el botón antes de abrirlas.
  const [totalCerradas, setTotalCerradas] = useState(0);
  const [cerradasCargadas, setCerradasCargadas] = useState(false);
  const [cargandoCerradas, setCargandoCerradas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [crearFacturaOpen, setCrearFacturaOpen] = useState(false);
  const [reporteOpen, setReporteOpen] = useState(false);
  const [cuentaCobroOpen, setCuentaCobroOpen] = useState(false);
  const [facturaAgregarEquipo, setFacturaAgregarEquipo] = useState(null);
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [facturaEliminando, setFacturaEliminando] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  // La factura a la que se le está registrando una devolución. Es el mismo
  // diálogo que usa Seguimiento: acá sirve para el cliente que devuelve todo
  // ANTES de vencerse, que nunca pasa por esa pantalla.
  const [facturaDevolucion, setFacturaDevolucion] = useState(null);
  // En celular el encabezado deja a la vista solo el nombre y el resumen de
  // cuenta: el teléfono y la dirección se despliegan con la flecha, así lo que
  // se busca de un vistazo (cuánto es y cuánto falta) no queda debajo de todo.
  // En computador sobra el ancho y van siempre visibles.
  const [contactoAbierto, setContactoAbierto] = useState(false);
  // Cada factura tiene 4 secciones que se muestran/ocultan por separado en
  // móvil (pagoGeneral, equiposFactura, equiposAgregados, pagoTotal) — la
  // clave es "{facturaId}:{seccion}". En PC todas están siempre visibles.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleEliminarFactura = async () => {
    if (!facturaEliminando) return;
    setEliminando(true);
    try {
      await deleteDoc(
        doc(db, "clientes", id, "facturas", facturaEliminando.id),
      );
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

  // Plegar una factura entera. Todas arrancan plegadas —de un cliente con
  // muchas facturas se ve la lista completa de un vistazo— así que lo que se
  // guarda es cuáles se fueron abriendo.
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
  const toggleFacturaColapsada = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const facturaColapsada = (facturaId) => !facturasAbiertas[facturaId];

  // silencioso=true evita el spinner de pantalla completa: se usa para
  // refrescar datos después de una edición puntual (crear factura, registrar
  // un abono) sin desmontar toda la vista y perder el scroll.
  const fetchCliente = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const clienteSnap = await getDoc(doc(db, "clientes", id));
        if (!clienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        const datosCliente = { id: clienteSnap.id, ...clienteSnap.data() };

        // Solo las facturas abiertas. Las cerradas —devolvió todo, no debe
        // nada, no le sobró— son las que se van acumulando con los años y las
        // que casi nunca se miran; se traen aparte, a pedido. Un cliente con
        // 100 facturas viejas y 2 abiertas pasa de 101 lecturas a 4.
        //
        // La cuarta es el CONTEO de las cerradas, que se pide al lado. No las
        // trae: cuenta en el servidor y devuelve un número, así que sale una
        // lectura sean 3 o 300. Sirve para dos cosas: el botón puede decir
        // cuántas son antes de traerlas, y si no hay ninguna ni se muestra —
        // antes había que apretarlo para enterarse, gastando la consulta
        // entera para recibir una lista vacía.
        const facturasRef = collection(db, "clientes", id, "facturas");
        const [facturasSnap, conteoCerradas] = await Promise.all([
          getDocs(query(facturasRef, where("cerrada", "==", false))),
          getCountFromServer(query(facturasRef, where("cerrada", "==", true))),
        ]);
        const listaFacturas = facturasSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

        // El estado del cliente es el único que se guarda, para que la lista
        // de clientes pueda filtrar sin leer las facturas de todos. De
        // mantenerlo al día se encarga el servidor (ver ajustarTotalesPanel y
        // recalcularTotalesPanel en functions/index.js): esta pantalla solía
        // corregirlo al abrirse, y esa era exactamente la falla —el estado
        // solo se ponía al día si alguien pasaba por acá—.
        //
        // Se recalcula igual, pero solo para MOSTRARLO: es gratis, ya tenemos
        // las facturas, y así el chip nunca depende de qué tan fresco esté lo
        // guardado.
        datosCliente.estado = calcularEstadoCliente(listaFacturas);

        setCliente(datosCliente);
        setFacturas(listaFacturas);
        setTotalCerradas(conteoCerradas.data().count);
        // Al recargar el cliente se descartan las cerradas que se hubieran
        // traído: si el usuario las quiere ver de nuevo, las vuelve a pedir.
        // Mantenerlas obligaría a recargarlas también, que es justo el gasto
        // que se está evitando.
        setFacturasCerradas([]);
        setCerradasCargadas(false);
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

  // El historial: las facturas ya finalizadas, a pedido. Se cobran una sola vez
  // por visita.
  const cargarFacturasCerradas = useCallback(async () => {
    try {
      setCargandoCerradas(true);
      const snap = await getDocs(
        query(
          collection(db, "clientes", id, "facturas"),
          where("cerrada", "==", true),
        ),
      );
      setFacturasCerradas(
        snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")),
      );
      setCerradasCargadas(true);
    } catch (error) {
      console.error("Error al obtener las facturas finalizadas:", error);
      showSnackbar("Error al cargar las facturas finalizadas", "error");
    } finally {
      setCargandoCerradas(false);
    }
  }, [id, showSnackbar]);

  // Lo que se dibuja: las abiertas primero y, si se pidieron, el historial
  // debajo. Ordenar todo junto por fecha mezclaría una factura cerrada de la
  // semana pasada entre las que están en curso.
  const facturasVisibles = useMemo(
    () => [...facturas, ...facturasCerradas],
    [facturas, facturasCerradas],
  );

  // Las finalizadas no entran en el reporte: ya no tienen nada pendiente que
  // reportar. Memoizado porque ReporteFacturasDialog usa esta lista como
  // dependencia para saber cuándo premarcar todo de nuevo, y sin esto cambia
  // de referencia en cada render del padre. Va antes del "if (loading)": los
  // Hooks no pueden llamarse condicionalmente.
  const facturasParaReporte = useMemo(
    () => facturas.filter((factura) => calcularEstadoFactura(factura) !== "finalizada"),
    [facturas],
  );

  // Pasar las facturas elegidas a una cuenta de cobro y abrirla para
  // completarle el "por concepto de", que es lo único que no sale de acá. Lo
  // que se cobra es el saldo: ver cuentaCobroDesdeFacturas.js.
  const handleCuentaCobro = (facturasElegidas) => {
    dispatch(
      abrirCuentaCobro(
        construirCuentaCobroDesdeFacturas({
          cliente,
          facturas: facturasElegidas,
        }),
      ),
    );
    navigate("/vistacuentadecobro");
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
  const estadoInfo =
    ESTADO_CLIENTE_INFO[cliente.estado] || ESTADO_CLIENTE_INFO.inactivo;
  const estadoColor =
    avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  // La cuenta del cliente: la suma de sus facturas ABIERTAS, o sea lo que
  // tiene abierto hoy, no lo que compró en toda su vida. A diferencia de una
  // factura suelta, acá el saldo es neto (lo que sobró en una descuenta lo que
  // se debe en otra).
  //
  // Las cerradas quedan fuera y no le hacen falta: por definición devolvieron
  // todo, no deben nada y no les sobró, así que aportan cero a las cuatro
  // casillas. Y por eso mismo el número no cambia si alguien pide ver el
  // historial.
  const cuentaCliente = calcularCuentaCliente(facturas);
  // Solo se pliega en celular; en computador el contacto está siempre a la
  // vista, así que la flecha no tiene nada que hacer.
  const contactoVisible = !esMovil || contactoAbierto;
  // Los botones del encabezado van enmarcados, iguales a los de cada factura:
  // toda la pantalla usa el mismo molde.
  const botonEncabezadoSx = { ...iconBtnSx, color: acento };

  // Las acciones del encabezado, en este orden: volver al listado, crear
  // factura y editar el cliente, y por último plegar el contacto. La carpeta
  // reemplaza al botón "Volver a Clientes" que ocupaba un renglón entero
  // arriba de la tarjeta; "Crear Factura" reemplaza al botón con letra que
  // vivía junto al título "Facturas N" (ese título se fue entero: el conteo
  // ahora es la insignia sobre el avatar del cliente).
  //
  // Hasta 915px son varios y flotan en la esquina de arriba. En computador
  // queda el lápiz solo y va dentro de la fila del nombre, después de la
  // pizarra de valores, así queda centrado con ella.
  const botonesEncabezado = (
    // Más separación en pantalla angosta: ahí se tocan con el dedo, y dos
    // íconos pegados a 8px de distancia se aprietan mal.
    <Stack direction="row" spacing={isFullScreen ? 1.5 : 1} sx={{ flexShrink: 0 }}>
      {isFullScreen && (
        <Tooltip title="Volver a Clientes">
          <IconButton
            size="small"
            onClick={() => navigate("/vistaclientes")}
            sx={botonEncabezadoSx}
          >
            <FolderSharedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Crear factura">
        <IconButton
          size="small"
          onClick={() => setCrearFacturaOpen(true)}
          sx={botonEncabezadoSx}
        >
          <ReceiptLongIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Un solo botón para todo el cliente: el abono se reparte solo entre
          las facturas que tengan saldo (ver AbonoDialog). El span es porque
          un botón deshabilitado no emite eventos de mouse y sin él el globo
          de ayuda no aparece. */}
      <Tooltip
        title={
          cuentaCliente.saldoPendiente > 0
            ? "Registrar abono"
            : "El cliente no tiene saldo pendiente"
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={cuentaCliente.saldoPendiente === 0}
            onClick={() => setAbonoOpen(true)}
            sx={{
              ...botonEncabezadoSx,
              "&.Mui-disabled": { color: "action.disabled" },
            }}
          >
            <AttachMoneyIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* El span es necesario para que el tooltip funcione con el botón
          deshabilitado: un botón así no emite eventos de mouse. */}
      <Tooltip title="Descargar reporte de facturas">
        <span>
          <IconButton
            size="small"
            onClick={() => setReporteOpen(true)}
            disabled={facturasParaReporte.length === 0}
            sx={botonEncabezadoSx}
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Misma lista de facturas que el reporte, pero en vez de un PDF arma la
          cuenta de cobro y lleva a su pantalla. */}
      <Tooltip title="Pasar facturas a cuenta de cobro">
        <span>
          <IconButton
            size="small"
            onClick={() => setCuentaCobroOpen(true)}
            disabled={facturasParaReporte.length === 0}
            sx={botonEncabezadoSx}
          >
            <RequestQuoteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Editar cliente">
        <IconButton
          size="small"
          onClick={() => setEditarOpen(true)}
          sx={botonEncabezadoSx}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

    </Stack>
  );

  // La flecha que oculta y muestra los datos del cliente va aparte de las
  // demás: se queda fija en su esquina mientras las otras se centran. Si
  // entrara en el mismo grupo, el centrado la correría de lugar cada vez que
  // aparece o desaparece un botón.
  const botonPlegarContacto = esMovil && (
    <Tooltip
      title={contactoAbierto ? "Ocultar datos del cliente" : "Ver datos del cliente"}
    >
      <IconButton
        size="small"
        onClick={() => setContactoAbierto((abierto) => !abierto)}
        sx={botonEncabezadoSx}
      >
        {contactoAbierto ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );

  // Quién es el cliente: avatar con el conteo de facturas, nombre y estado.
  // Va separado de la pizarra de cuenta porque los dos se reacomodan distinto
  // según el ancho (ver el armado del encabezado, más abajo).
  const bloqueNombre = (
    <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          minWidth: 0,
          // Sin facturas no hay pizarra que empuje el bloque al borde
          // derecho, así que el hueco lo ocupa el nombre.
          flexGrow: facturasVisibles.length > 0 ? 0 : 1,
          // En celular, el Stack de arriba pasa a columna y este renglón
          // (y la pizarra, su hermano) deberían estirarse solos por el
          // alignItems:"stretch" del padre — pero con flexWrap:"wrap" en
          // un contenedor en columna, ese estirado no se aplica y cada
          // hijo vuelve a su ancho de contenido, más ancho que la
          // tarjeta. Forzarlo así es lo que evita que se salga.
          width: { xs: "100%", sm: "auto" },
          // Le deja la esquina libre a la flecha de plegar, que está anclada
          // ahí arriba: un nombre largo le pasaría por debajo.
          pr: esMovil ? 5 : 0,
        }}
      >
        {/* El conteo de facturas va como insignia sobre el avatar: antes
            era el título "Facturas N" que encabezaba la lista, antes de
            que ese renglón se repartiera entre esta insignia y el botón
            de crear factura, arriba. */}
        <Badge
          badgeContent={facturasVisibles.length}
          color="primary"
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ flexShrink: 0 }}
        >
          <Avatar
            sx={{
              // Más chico en celular: libera ancho para el nombre.
              width: { xs: 44, sm: 56 },
              height: { xs: 44, sm: 56 },
              bgcolor:
                avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            ) : (
              <PersonIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            )}
          </Avatar>
        </Badge>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          {/* Antes acá había que reservarle hueco a los botones flotantes:
              ahora que son parte del mismo flujo, ese hueco ya no hace
              falta. Dejar que el nombre se parta en dos líneas sigue
              siendo aceptable si no entra entero. */}
          <Typography variant="h6">{nombreCompleto}</Typography>
          <Chip
            icon={estadoInfo.Icono ? <estadoInfo.Icono /> : undefined}
            label={estadoInfo.label}
            variant="estado"
            size="small"
            sx={{
              mt: 0.5,
              bgcolor: estadoColor,
              color: theme.palette.getContrastText(estadoColor),
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>
      </Stack>
  );

  // Cuánto debe: el recuadro oscuro con la cuenta del cliente.
  //
  // Sin facturas no hay cuenta que mostrar: una pizarra en cero sugeriría que
  // el cliente debe algo.
  const bloquePizarra =
    facturas.length > 0 &&
    renderPizarraTotales(
      // En celular solo el total y el saldo: las cuatro casillas, con importes
      // de siete cifras, no entran sin montarse entre sí. De 600px para arriba
      // el recuadro tiene una fila entera para él, así que las cuatro caben.
      casillasDeCuenta(cuentaCliente, { resumida: esMovil }),
      // Sin el ancho forzado, en pantalla angosta la pizarra vuelve a su ancho
      // de contenido y se sale de la tarjeta por la derecha.
      { flexGrow: 1, width: { xs: "100%", sm: "auto" } },
    );

  return (
    <Box
      sx={{
        // El encabezado (tarjeta del cliente + "Facturas / Crear Factura")
        // queda fuera de cualquier scroll: solo la lista de facturas, más
        // abajo, tiene el suyo propio.
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          // Los mismos márgenes y esquinas que la tarjeta de una factura: son
          // dos tarjetas de la misma lista, una arriba de la otra.
          p: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          mb: 3,
          position: "relative",
          // Sin esto, una pizarra de cuatro importes largos estira la tarjeta
          // más allá del ancho de la pantalla y aparece scroll horizontal.
          minWidth: 0,
          // Es fija, no parte del área con scroll: que no se achique si el
          // alto de la pantalla es chico.
          flexShrink: 0,
        }}
      >
        {/* En computador el resumen de cuenta va al lado del nombre; en celular
            no entra en la misma línea y pasa debajo, a todo el ancho. Los
            botones son el mismo bloque en los dos casos (botonesEncabezado);
            lo que cambia es dónde se ubican. */}
        {/* La flecha que oculta y muestra los datos del cliente va anclada a
            la esquina de la tarjeta, a la altura del nombre: es el control de
            la tarjeta entera, no una acción más del cliente. Por eso no está
            en la fila de botones de abajo — ahí se leería como si hiciera algo
            con el cliente, y lo que hace es plegar lo que estás mirando. */}
        {botonPlegarContacto && (
          <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}>
            {botonPlegarContacto}
          </Box>
        )}

        {/* ── Cómo se acomoda el encabezado ──────────────────────────────
            La tarjeta tiene tres piezas: QUIÉN es el cliente, CUÁNTO debe y
            QUÉ se puede hacer con él. Lo que cambia con el ancho es cuál cede.

            En pantalla ancha entran las tres en un renglón. Cuando dejan de
            entrar, el que baja es el RECUADRO DE CUENTA —a su propia fila y a
            todo el ancho, que es donde mejor se lee—, y los botones se quedan
            arriba con el nombre. Antes bajaban los botones, y quedaban sueltos
            abajo a la izquierda como si se hubieran caído.

            Recién en celular, donde el nombre y seis botones ya no conviven en
            un renglón, los botones pasan abajo y van centrados. */}
        {esAncho ? (
          <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
            {bloqueNombre}
            {bloquePizarra}
            {botonesEncabezado}
          </Stack>
        ) : (
          <Stack sx={{ rowGap: 2 }}>
            {esMovil ? (
              <>
                {bloqueNombre}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    // Las acciones son otra cosa que los datos de arriba, no la
                    // continuación del nombre.
                    pt: 0.5,
                  }}
                >
                  {botonesEncabezado}
                </Box>
              </>
            ) : (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ gap: 2 }}
              >
                {bloqueNombre}
                {botonesEncabezado}
              </Stack>
            )}
            {bloquePizarra}
          </Stack>
        )}

        {contactoVisible && (
          <>
            {/* El divisor horizontal no llega a los bordes de la tarjeta:
                queda centrado al 95% del ancho. */}
            <Divider sx={{ my: 2, width: "95%", mx: "auto" }} />

            {/* Dos columnas en computador (>915px): a la izquierda el contacto
                (teléfono y NIT/cédula), a la derecha la ubicación (dirección y
                obra). Hasta 915px se apilan en una sola columna. */}
            <Stack
              direction={isFullScreen ? "column" : "row"}
              spacing={isFullScreen ? 1 : 4}
              // Línea divisoria vertical entre las dos columnas, solo en
              // computador. `flexItem` la estira a la altura del contenido y el
              // margen vertical evita que llegue a los bordes.
              divider={
                !isFullScreen ? (
                  <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                ) : undefined
              }
              sx={{ minWidth: 0 }}
            >
              {/* En computador, teléfono arriba y NIT/cédula debajo (columna).
                  En móvil van uno al lado del otro (fila): son cortos y entran
                  bien, así ahorran una línea. */}
              <Stack
                direction={isFullScreen ? "row" : "column"}
                spacing={isFullScreen ? 2 : 1}
                alignItems="center"
                justifyContent="center"
                // En móvil, teléfono y NIT/cédula van en fila con una línea
                // divisoria vertical entre ellos (como las columnas en PC), y
                // cada uno centrado en su mitad. En PC quedan apilados, sin
                // divisor.
                divider={
                  isFullScreen ? (
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                  ) : undefined
                }
                sx={{ flex: 1, minWidth: 0 }}
              >
                {telefonoValido ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ flex: isFullScreen ? 1 : "none" }}
                  >
                    <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen && "Teléfono: "}
                      {cliente.telefono}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin teléfono registrado
                  </Typography>
                )}

                {cliente.nit && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ flex: isFullScreen ? 1 : "none" }}
                  >
                    <BadgeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen &&
                        `${cliente.tipo === "empresa" ? "NIT" : "Cédula"}: `}
                      {formatearNit(cliente.nit)}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Stack
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ flex: 1, minWidth: 0 }}
              >
                {cliente.direccion && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen && "Dirección: "}
                      {cliente.direccion}
                    </Typography>
                  </Stack>
                )}

                {cliente.obra && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <ConstructionIcon
                      sx={{ fontSize: 18, color: "text.secondary" }}
                    />
                    <Typography variant="body2">
                      {!isFullScreen && "Obra: "}
                      {cliente.obra}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </Box>

      {/* De acá para abajo es lo único que se desplaza: la tarjeta del
          cliente queda fija, fuera de este contenedor. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {facturasVisibles.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {cerradasCargadas
            ? "Este cliente no tiene facturas registradas."
            : "Este cliente no tiene facturas abiertas."}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {facturasVisibles.map((factura) => (
            <FacturaCard
              key={factura.id}
              factura={factura}
              cliente={cliente}
              facturaColapsada={facturaColapsada}
              toggleFacturaColapsada={toggleFacturaColapsada}
              seccionAbierta={seccionAbierta}
              toggleSeccion={toggleSeccion}
              onAgregarEquipo={setFacturaAgregarEquipo}
              onRegistrarDevolucion={setFacturaDevolucion}
              onEditar={setFacturaEditando}
              onEliminar={setFacturaEliminando}
              onDevolverSaldo={setFacturaEntregando}
            />
          ))}
        </Stack>
      )}

      {/* El historial. Arriba solo están las facturas abiertas; las cerradas
          —devolvió todo y quedó a mano— se traen solo si alguien las pide,
          porque son las que se acumulan con los años y casi nunca se miran.
          La cuenta del encabezado no cambia al traerlas: ahí se muestra lo que
          el cliente tiene abierto ahora. */}
      {/* El botón dice cuántas son porque el conteo ya vino con el cliente
          (ver fetchCliente). Si no hay ninguna no aparece: no tiene sentido
          ofrecer abrir una lista vacía. */}
      {!cerradasCargadas && totalCerradas > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={cargarFacturasCerradas}
            disabled={cargandoCerradas}
          >
            {cargandoCerradas
              ? "Buscando..."
              : `Ver ${totalCerradas} factura${
                  totalCerradas === 1 ? "" : "s"
                } finalizada${totalCerradas === 1 ? "" : "s"}`}
          </Button>
        </Box>
      )}
      </Box>

      {/* Editar o eliminar al cliente cambia lo que muestra la lista, así que
          se tira su copia guardada. El servidor también lo sella, pero tarda
          un instante y para entonces el usuario ya puede estar de vuelta en la
          lista. */}
      <ClienteFormDialog
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
        onGuardado={() => {
          invalidarCopiaClientes();
          return fetchCliente();
        }}
        onEliminado={() => {
          invalidarCopiaClientes();
          navigate("/vistaclientes");
        }}
        cliente={cliente}
      />

      <FacturaFormDialog
        open={crearFacturaOpen}
        onClose={() => setCrearFacturaOpen(false)}
        cliente={cliente}
        onGuardado={() => fetchCliente(true)}
      />

      <EntregarSaldoDialog
        open={Boolean(facturaEntregando)}
        onClose={() => setFacturaEntregando(null)}
        cliente={cliente}
        factura={facturaEntregando}
        onEntregado={() => fetchCliente(true)}
      />

      <ReporteFacturasDialog
        open={reporteOpen}
        onClose={() => setReporteOpen(false)}
        cliente={cliente}
        facturas={facturasParaReporte}
      />

      <SeleccionarFacturasDialog
        open={cuentaCobroOpen}
        onClose={() => setCuentaCobroOpen(false)}
        facturas={facturasParaReporte}
        titulo="Pasar a cuenta de cobro"
        descripcion="Elegí qué facturas se cobran. Se copian los equipos y el resumen; el total a cancelar es el saldo pendiente."
        aviso={
          itemsCuentaCobro.length > 0
            ? "Hay una cuenta de cobro a medio hacer: se va a reemplazar."
            : undefined
        }
        textoVacio="Este cliente no tiene facturas para cobrar (las finalizadas no entran en la lista)."
        textoConfirmar="Pasar a cuenta de cobro"
        onConfirmar={handleCuentaCobro}
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
        facturas={facturas}
        onAgregado={() => fetchCliente(true)}
      />

      <AbonoDialog
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        cliente={cliente}
        facturas={facturas}
        onAbonado={() => fetchCliente(true)}
      />

      <Dialog
        open={Boolean(facturaEliminando)}
        onClose={() => setFacturaEliminando(null)}
      >
        <DialogTitle sx={{ color: acento }}>Eliminar factura</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la factura{" "}
            {facturaEliminando?.numeroFactura ?? "s/n"}? Esta acción no se puede
            deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button
            onClick={() => setFacturaEliminando(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminarFactura}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <RegistrarDevolucionDialog
        open={Boolean(facturaDevolucion)}
        onClose={() => setFacturaDevolucion(null)}
        cliente={cliente}
        factura={facturaDevolucion}
        onActualizado={() => fetchCliente(true)}
      />

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
