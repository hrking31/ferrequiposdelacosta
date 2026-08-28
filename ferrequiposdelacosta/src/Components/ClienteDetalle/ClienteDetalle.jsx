import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
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
import ClienteEncabezado from "./ClienteEncabezado";
import FacturaCard from "./FacturaCard";
import construirCuentaCobroDesdeFacturas from "./cuentaCobroDesdeFacturas";
import { abrirCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import { calcularEstadoCliente, calcularEstadoFactura } from "./facturaUtils";
import RegistrarDevolucionDialog from "../SeguimientoClientes/RegistrarDevolucionDialog";

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Solo para avisar, antes de reemplazarla, si hay una cuenta de cobro a
  // medio hacer en la sesión.
  const itemsCuentaCobro = useSelector((state) => state.cuentacobro.value.items);
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
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
      <ClienteEncabezado
        cliente={cliente}
        facturas={facturas}
        cantidadFacturas={facturasVisibles.length}
        hayFacturasParaReporte={facturasParaReporte.length > 0}
        onVolver={() => navigate("/vistaclientes")}
        onCrearFactura={() => setCrearFacturaOpen(true)}
        onAbonar={() => setAbonoOpen(true)}
        onDescargarReporte={() => setReporteOpen(true)}
        onPasarACuentaCobro={() => setCuentaCobroOpen(true)}
        onEditarCliente={() => setEditarOpen(true)}
      />

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
            // Sin variant sale como texto plano, sin borde: al lado del rojo
            // de eliminar no parece un boton. "outlined" es la accion neutra
            // del tema (ver MuiButton).
            variant="outlined"
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

      {/* Desde la ficha solo se devuelve lo que todavía no venció. Con la
          factura al día eso es todo lo que hay afuera, así que no cambia
          nada; con la factura vencida, deja devolver los equipos que se
          agregaron después y siguen en fecha, sin anotar una cobranza que
          nadie hizo. */}
      <RegistrarDevolucionDialog
        open={Boolean(facturaDevolucion)}
        onClose={() => setFacturaDevolucion(null)}
        cliente={cliente}
        factura={facturaDevolucion}
        onActualizado={() => fetchCliente(true)}
        desdeLaFicha
      />

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
