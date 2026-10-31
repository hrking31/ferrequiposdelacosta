import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Badge,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SaveIcon from "@mui/icons-material/Save";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PagosMediosField from "./PagosMediosField";
import { propsRenglonPlegable, renderFlechaPlegable, sxRenglonPlegable } from "./recuadrosCuenta";
import HeaderUsuarioConModal from "../HeaderUsuario/HeaderUsuario";
import {
  borradorDe,
  enlazarCruces,
  equipoNuevoEnBorrador,
  erroresDeLaPlata,
  erroresDelBorrador,
  esAbonoDeCruce,
  facturaCorregida,
  hayCorrecciones,
  mediosParaCorregir,
  nombreDelGrupo,
  otrasCorregidas,
  quitarHecho,
  tieneCrucesPropios,
} from "./correccionFactura";
import { autorLegible, cuandoLegible, describirCambio, esCorreccion } from "./registroFactura";
import {
  ESTADO_FACTURA_INFO,
  GRUPO_INICIAL,
  CONTRA_ENTREGA,
  MEDIO_DEPOSITO,
  MODOS_PAGO,
  abonosDe,
  pagoSinMedios,
  calcularCuentaFactura,
  calcularEstadoFactura,
  calcularTransporteTotal,
  datosFactura,
  descuentosDe,
  entregasDe,
  formatearFechaLegible,
  formatearMonedaInput,
  gruposDe,
  limpiarMonedaInput,
  obtenerFechaHoyBogota,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";
import { mismoContenido } from "../../Utils/mismoContenido";
import { usePantallaCompacta, usePantallaBaja, ALINEAR_CON_EL_BORDE } from "../../Utils/pantalla";

const BORRADOR_VACIO = {
  numeroFactura: "",
  fechaCreacion: "",
  grupos: [],
  abonos: [],
  entregas: [],
  descuentos: [],
};

// Las demás facturas del cliente —abiertas y cerradas—. Se leen solo si hacen
// falta: para un cruce que salió de esta factura, o al cambiarle el número.
const OTRAS_SIN_LEER = { estado: "sinLeer", facturas: [] };

const TIPOS_DE_PAGO = [
  { valor: "total", label: "Pago total" },
  { valor: "parcial", label: "Parcial" },
  { valor: "conAbono", label: "Pago con abono" },
  { valor: "sinPago", label: "Sin pago" },
  { valor: CONTRA_ENTREGA, label: "Contra entrega" },
];

const TRANSPORTES = ["Sin transporte", "Solo ida", "Solo vuelta", "Ida y vuelta"];

// Del nodo `factura`, lo que una persona puede haber cambiado.
const loCorregible = (documento) => {
  const { numeroFactura, fechaCreacion, depositoResuelto } = datosFactura(documento);
  return [numeroFactura, fechaCreacion, depositoResuelto || false];
};

const HISTORIAL_VACIO = { estado: "cargando", cambios: [], usuarios: [] };

// Los renglones de un cambio. Un registro viejo o raro no puede tumbar la
// pantalla con la que se corrige la factura: si no se sabe describir, se dice.
const renglonesDe = (cambio) => {
  try {
    return describirCambio(cambio);
  } catch {
    return ["Cambió la factura, sin detalle que mostrar."];
  }
};

// El historial muestra solo lo que se corrigió, no el trabajo de todos los
// días (ver registroFactura.js). El que no se sabe leer se muestra: puede ser
// justo lo que se busca.
const corrigioAlgo = (cambio) => {
  try {
    return esCorreccion(cambio);
  } catch {
    return true;
  }
};

// Cada hecho que se corrige va en su recuadro, debajo de la línea de tiempo
// del equipo, que lleva a cada uno.
const RECUADRO_HECHO = {
  mt: 1.5,
  p: 1.5,
  borderRadius: "12px",
  border: "1px solid",
  borderColor: "custom.itemBorder",
  bgcolor: "action.hover",
};

// Las tarjetas de cada sección de la mesa de corrección.
const TARJETA = {
  p: { xs: 2, sm: 3 },
  borderRadius: "16px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
};

const FUENTE_TITULOS = '"Montserrat", sans-serif';

// Los anchos de la mesa de corrección, en px. Ocupa el ancho de las demás
// vistas: el centro se estira y, al achicar la pantalla, se angosta hasta
// ANCHO_CENTRO; de ahí para abajo se van las columnas de los lados, primero la
// izquierda y después la derecha (pedido del dueño, 2026-10-30).
const ANCHO_CENTRO = 830;
const ANCHO_PIZARRA = 340;
const ANCHO_INDICE = 220;
const ESPACIO = 24;
// El margen a cada lado, el de las demás vistas en el computador: 24 de la
// página y 16 del contenido.
const MARGEN = 40;
// Lo que ocupa la barra para bajar de la pantalla, que también resta ancho.
const BARRA_DE_DESPLAZAMIENTO = 16;

// En el recuadro de la factura, el hueco bajo el título cuando las fechas van
// al lado: así el centro de cada caja queda a la altura del renglón de la
// descripción.
const HUECO_BAJO_EL_TITULO = "31px";

// Un campo que ya no dice lo que estaba guardado: ámbar, con lo de antes debajo.
const CAMPO_CAMBIADO = {
  "& .MuiOutlinedInput-root": { bgcolor: (t) => alpha(t.palette.warning.main, 0.08) },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "warning.main", borderWidth: 2 },
  "& .MuiFormHelperText-root": { color: "warning.dark", fontWeight: 700, mx: 0.5 },
};

// Cada punto de la línea de tiempo de un equipo: su ícono, su color y qué dice.
const NODO_DE_HECHO = {
  ampliacion: { Icono: AddIcon, tono: "info", texto: (hecho) => `Amplió ${hecho.dias || "?"} días` },
  entregaPactada: { Icono: EventAvailableIcon, tono: "success", texto: () => "Entrega pactada" },
  entregaAnulada: { Icono: EventBusyIcon, tono: "error", texto: () => "No entregó" },
  sello: { Icono: PaidOutlinedIcon, tono: "warning", texto: () => "Cerró la mora" },
  indefinida: { Icono: AllInclusiveIcon, tono: "info", texto: () => "Sin fecha" },
  devolucion: { Icono: WarehouseIcon, tono: "primary", texto: () => "Volvió" },
};

// Lo que se escribe en una casilla de plata. Vacía es cero: borrar el
// descuento y no volver a escribir nada no es un cambio.
const plataDe = (texto) => Number(limpiarMonedaInput(texto)) || 0;

// CORREGIR UNA FACTURA YA CARGADA. Solo para el administrador: acá no se anota
// nada nuevo, se arregla lo que alguien digitó mal —la devolución con la fecha
// del día en que se cargó, una cantidad, un precio—.
//
// Es una pantalla completa y no un diálogo chico porque muestra la factura
// ENTERA: sus datos, cada despacho con su plata, cada equipo y lo que le pasó.
//
// Tres cuidados, porque son facturas reales:
//   · Solo se escribe lo que cambió. El equipo que nadie tocó vuelve idéntico
//     (ver correccionFactura.js).
//   · Antes de guardar se ve la cuenta de antes y la de después.
//   · Si alguien más cambió la factura mientras estaba abierta, no se guarda:
//     pisarla borraría lo que esa persona acababa de anotar.
export default function CorregirFacturaDialog({ open, onClose, cliente, factura, onGuardado }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const usuario = useSelector((state) => state.user);
  // EL CENTRO NUNCA BAJA DE ANCHO_CENTRO (pedido del dueño, 2026-10-30): cada
  // columna de los lados aparece solo cuando cabe entera al lado del centro con
  // ese ancho. En el celular, las secciones arriba y la pizarra al final.
  const esCompacta = usePantallaCompacta();
  const acostado = usePantallaBaja();
  const conPizarraAlLado =
    useMediaQuery(`(min-width:${ANCHO_CENTRO + ESPACIO + ANCHO_PIZARRA + 2 * MARGEN + BARRA_DE_DESPLAZAMIENTO}px)`) &&
    !esCompacta;
  const conIndice =
    useMediaQuery(
      `(min-width:${ANCHO_INDICE + ESPACIO + ANCHO_CENTRO + ESPACIO + ANCHO_PIZARRA + 2 * MARGEN + BARRA_DE_DESPLAZAMIENTO}px)`,
    ) && !esCompacta;
  // Vacío hasta que se abre con una factura: sin esto, el primer dibujo
  // compararía la factura contra un borrador en blanco y mostraría errores.
  const [cargado, setCargado] = useState(null);
  const borrador = cargado ?? BORRADOR_VACIO;
  const setBorrador = (cambio) =>
    setCargado((prev) => (typeof cambio === "function" ? cambio(prev ?? BORRADOR_VACIO) : cambio));
  const [guardando, setGuardando] = useState(false);
  // EN EL CELULAR, cada sección se pliega y se despliega tocando su título,
  // como las facturas (pedido del dueño, 2026-10-30): arrancan todas cerradas,
  // con el punto naranja en las que tienen cambios. En el computador van
  // siempre abiertas.
  const [abiertas, setAbiertas] = useState({});
  // Los equipos que se agregan acá necesitan una clave que no choque con las
  // de los que ya estaban.
  const [nuevos, setNuevos] = useState(0);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    setCargado(open && factura ? borradorDe(factura) : null);
    setNuevos(0);
    setAbiertas({});
  }, [open, factura]);

  // EL HISTORIAL: todo lo que le pasó a esta factura, anotado por el servidor
  // (ver anotarCambioDeFactura). Solo el administrador puede leerlo, y es el
  // único que llega a esta pantalla. Los usuarios se traen para poner el
  // nombre de quien hizo cada cambio.
  const [historial, setHistorial] = useState(HISTORIAL_VACIO);
  const facturaId = factura?.id;

  useEffect(() => {
    if (!open || !facturaId) return undefined;
    let vigente = true;
    setHistorial(HISTORIAL_VACIO);

    Promise.all([
      getDocs(query(collection(db, "registroFacturas"), where("facturaId", "==", facturaId))),
      getDocs(collection(db, "users")),
    ])
      .then(([cambiosSnap, usuariosSnap]) => {
        if (!vigente) return;
        const datos = (snap) => snap.docs.map((cada) => ({ id: cada.id, ...cada.data() }));
        setHistorial({
          estado: "listo",
          // Solo las correcciones, del más nuevo al más viejo: lo último que
          // pasó es lo que se viene a mirar.
          cambios: datos(cambiosSnap)
            .filter(corrigioAlgo)
            .sort((a, b) => b.cuando - a.cuando),
          usuarios: datos(usuariosSnap),
        });
      })
      .catch(() => {
        if (vigente) setHistorial({ ...HISTORIAL_VACIO, estado: "error" });
      });

    return () => {
      vigente = false;
    };
  }, [open, facturaId]);

  // LAS DEMÁS FACTURAS DEL CLIENTE, abiertas y cerradas. Se leen una sola vez
  // y solo si hacen falta: al abrir, si de esta factura salió un cruce —para
  // encontrar su otra punta—, o cuando se le cambia el número —para corregirlo
  // donde la nombran—. Cada factura es una lectura, y la mayoría de las
  // correcciones no necesita ninguna.
  const [otras, setOtras] = useState(OTRAS_SIN_LEER);
  const otrasPedidas = useRef(null);
  const numeroCambiado =
    Boolean(cargado) &&
    String(borrador.numeroFactura ?? "").trim() !==
      String(datosFactura(factura).numeroFactura ?? "s/n").trim();
  const hacenFaltaOtras =
    Boolean(open && factura) && (tieneCrucesPropios(factura) || numeroCambiado);
  const clienteId = cliente?.id;

  useEffect(() => {
    otrasPedidas.current = null;
    setOtras(OTRAS_SIN_LEER);
  }, [open, facturaId]);

  useEffect(() => {
    if (!hacenFaltaOtras || !clienteId || otrasPedidas.current === facturaId) return;
    otrasPedidas.current = facturaId;
    const pedida = facturaId;
    setOtras({ estado: "cargando", facturas: [] });

    getDocs(collection(db, "clientes", clienteId, "facturas"))
      .then((snap) => {
        // Si mientras tanto se cerró o se abrió otra factura, no sirve.
        if (otrasPedidas.current !== pedida) return;
        const facturas = snap.docs
          .map((cada) => ({ id: cada.id, ...cada.data() }))
          .filter(({ id }) => id !== pedida);
        setOtras({ estado: "listo", facturas });
        setCargado((prev) => (prev && factura ? enlazarCruces(prev, factura, facturas) : prev));
      })
      .catch(() => {
        if (otrasPedidas.current === pedida) setOtras({ estado: "error", facturas: [] });
      });
  }, [hacenFaltaOtras, clienteId, facturaId, factura]);

  const hoy = obtenerFechaHoyBogota();
  const otrasListas = otras.estado === "listo" ? otras.facturas : null;
  const hayCambios =
    Boolean(factura && cargado) && hayCorrecciones(factura, borrador, otrasListas);
  const erroresDeCasillas = hayCambios ? erroresDelBorrador(borrador, hoy) : [];
  // Con errores no se arma el documento: una fecha vacía no tiene cuenta.
  const documento =
    hayCambios && erroresDeCasillas.length === 0
      ? facturaCorregida(factura, borrador, hoy)
      : null;
  // Lo que se mira con el documento ya armado. La cuenta de "Así queda" se
  // muestra igual, para que se vea por qué no deja guardar.
  const errores = documento
    ? erroresDeLaPlata(factura, borrador, documento, otrasListas, hoy, {
        noSePudieronLeer: otras.estado === "error",
      })
    : erroresDeCasillas;
  const corregida = documento && errores.length === 0 ? documento : null;

  const cuentaAntes = factura ? calcularCuentaFactura(factura, hoy) : null;
  const cuentaDespues = documento ? calcularCuentaFactura(documento, hoy) : null;
  const estadoDe = (documento) =>
    ESTADO_FACTURA_INFO[calcularEstadoFactura(documento, hoy)]?.label ?? "";

  // ── Los cambios al borrador ─────────────────────────────────────────
  const cambiarGrupo = (indiceGrupo, cambio) =>
    setBorrador((prev) => ({
      ...prev,
      grupos: prev.grupos.map((grupo, indice) =>
        indice === indiceGrupo ? { ...grupo, ...cambio(grupo) } : grupo,
      ),
    }));

  const cambiarEquipo = (indiceGrupo, clave, cambio) =>
    cambiarGrupo(indiceGrupo, (grupo) => ({
      equipos: grupo.equipos.map((item) =>
        item.clave === clave ? { ...item, ...cambio(item) } : item,
      ),
    }));

  // Los transportes adicionales del despacho, por su lugar en la lista.
  const cambiarTransporteAdicional = (indiceGrupo, posicion, campos) =>
    cambiarGrupo(indiceGrupo, (grupo) => ({
      transportesAdicionales: grupo.transportesAdicionales.map((adicional, indice) =>
        indice === posicion ? { ...adicional, ...campos } : adicional,
      ),
    }));

  const quitarTransporteAdicional = (indiceGrupo, posicion) =>
    cambiarGrupo(indiceGrupo, (grupo) => ({
      transportesAdicionales: grupo.transportesAdicionales.filter(
        (_, indice) => indice !== posicion,
      ),
    }));

  const quitarEquipo = (indiceGrupo, clave) =>
    cambiarGrupo(indiceGrupo, (grupo) => ({
      equipos: grupo.equipos.filter((item) => item.clave !== clave),
    }));

  const agregarEquipo = (indiceGrupo) => {
    cambiarGrupo(indiceGrupo, (grupo) => ({
      equipos: [
        ...grupo.equipos,
        equipoNuevoEnBorrador(
          `nuevo-${nuevos}`,
          grupo.fechaSolicitud,
          grupo.equipos.some((item) => item.aplicaIva),
        ),
      ],
    }));
    setNuevos((cuantos) => cuantos + 1);
  };

  // `cambio` nulo quita la devolución: el equipo vuelve a figurar afuera.
  const cambiarDevolucion = (indiceGrupo, clave, cambio) =>
    cambiarEquipo(indiceGrupo, clave, (item) => ({
      hechos: item.hechos
        .map((hecho) =>
          hecho.tipo !== "devolucion" ? hecho : cambio ? { ...hecho, ...cambio(hecho) } : null,
        )
        .filter(Boolean),
    }));

  const cambiarEstadoDevolucion = (indiceGrupo, clave, campos) =>
    cambiarDevolucion(indiceGrupo, clave, (hecho) => ({
      devolucion: { ...hecho.devolucion, ...campos },
    }));

  // Los demás hechos se señalan por su lugar en la lista: dos ampliaciones
  // del mismo día no tienen otra cosa que las distinga.
  const cambiarHecho = (indiceGrupo, clave, posicion, campos) =>
    cambiarEquipo(indiceGrupo, clave, (item) => ({
      hechos: item.hechos.map((hecho, indice) =>
        indice === posicion ? { ...hecho, ...campos } : hecho,
      ),
    }));

  const borrarHecho = (indiceGrupo, clave, posicion) =>
    cambiarEquipo(indiceGrupo, clave, (item) => ({
      hechos: quitarHecho(item.hechos, posicion),
    }));

  // Los abonos y lo devuelto, por su lugar en la lista.
  const cambiarEnLista = (lista, posicion, campos) =>
    setBorrador((prev) => ({
      ...prev,
      [lista]: prev[lista].map((item, indice) =>
        indice === posicion ? { ...item, ...campos } : item,
      ),
    }));

  const quitarDeLista = (lista, posicion) =>
    setBorrador((prev) => ({
      ...prev,
      [lista]: prev[lista].filter((_, indice) => indice !== posicion),
    }));

  const cambiarParteDelCruce = (posicion, indiceParte, monto) =>
    setBorrador((prev) => ({
      ...prev,
      entregas: prev.entregas.map((item, indice) =>
        indice === posicion
          ? {
              ...item,
              partes: item.partes.map((parte, cual) =>
                cual === indiceParte ? { ...parte, monto } : parte,
              ),
            }
          : item,
      ),
    }));

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleGuardar = async () => {
    if (!corregida) return;

    // Lo que cambia en las otras facturas: la otra punta de un cruce, o el
    // número nuevo donde la nombran.
    const otrasACambiar = otrasCorregidas(factura, borrador, otrasListas);

    setGuardando(true);
    try {
      const facturaRef = (id) => doc(db, "clientes", cliente.id, "facturas", id);
      const referencia = facturaRef(factura.id);
      const guardada = await runTransaction(db, async (transaccion) => {
        // Primero todas las lecturas: la transacción no deja leer después de
        // escribir.
        const actual = (await transaccion.get(referencia)).data();
        const actuales = await Promise.all(
          otrasACambiar.map(({ id }) => transaccion.get(facturaRef(id))),
        );

        // Si cualquier parte de lo que se abrió ya no es la misma, alguien
        // anotó algo en el medio. La marca de "cerrada" no cuenta: la pone el
        // servidor un momento después de cada cambio, y es una conclusión,
        // no un dato.
        const mismaPlata = (a, b) =>
          mismoContenido(abonosDe(a), abonosDe(b)) &&
          mismoContenido(entregasDe(a), entregasDe(b)) &&
          mismoContenido(descuentosDe(a), descuentosDe(b));
        if (
          !mismoContenido(gruposDe(actual), gruposDe(factura)) ||
          !mismoContenido(loCorregible(actual), loCorregible(factura)) ||
          !mismaPlata(actual, factura) ||
          otrasACambiar.some(({ original }, indice) => !mismaPlata(actuales[indice].data(), original))
        ) {
          return false;
        }

        // Los abonos y las entregas viajan solo si cambiaron, y la bitácora
        // nunca: no se corrige desde acá.
        transaccion.update(referencia, {
          factura: corregida.factura,
          grupos: corregida.grupos,
          ...(mismoContenido(corregida.abonos, abonosDe(factura))
            ? {}
            : { abonos: corregida.abonos }),
          ...(mismoContenido(corregida.entregas, entregasDe(factura))
            ? {}
            : { entregas: corregida.entregas }),
          ...(mismoContenido(descuentosDe(corregida), descuentosDe(factura))
            ? {}
            : { descuentos: descuentosDe(corregida) }),
        });
        otrasACambiar.forEach(({ id, escritura }) =>
          transaccion.update(facturaRef(id), escritura),
        );
        return true;
      });

      if (!guardada) {
        showSnackbar(
          otrasACambiar.length > 0
            ? "Esta factura o alguna de las que toca cambió mientras la corregías, y no se guardó nada. Recargá la página y corregila de nuevo."
            : "Esta factura cambió mientras la corregías y no se guardó nada. Recargá la página y corregila de nuevo.",
          "error",
        );
        return;
      }

      showSnackbar("Factura corregida.", "success");
      onGuardado?.({ ...factura, ...corregida });
      onClose();
    } catch (error) {
      showSnackbar(`Error al corregir la factura: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  // Las casillas que se repiten en cada hecho. `antes`: lo guardado, para
  // marcarla en naranja si cambió (ver `marca`).
  const campoFecha = (label, name, valor, onCambio, antes) => (
    <TextField
      label={label}
      name={name}
      type="date"
      inputProps={{ max: hoy }}
      value={valor ?? ""}
      onChange={(e) => onCambio(e.target.value)}
      fullWidth
      size="small"
      InputLabelProps={{ shrink: true }}
      {...marca(valor, antes, comoFecha)}
    />
  );

  const campoPlata = (label, name, valor, onCambio, antes) => (
    <TextField
      label={label}
      name={name}
      value={formatearMonedaInput(valor || "")}
      onChange={(e) => onCambio(plataDe(e.target.value))}
      fullWidth
      size="small"
      {...marca(valor || "", antes === undefined ? undefined : antes || "", comoPlata)}
    />
  );

  // Una casilla de sí o no que cambió: su texto en naranja y lo de antes debajo.
  const casillaCambiada = (actual, antes) =>
    antes !== undefined && Boolean(actual) !== Boolean(antes);
  const sxCasilla = (actual, antes) =>
    casillaCambiada(actual, antes)
      ? { "& .MuiFormControlLabel-label": { color: "warning.dark", fontWeight: 700 } }
      : undefined;
  const antesDeCasilla = (actual, antes) =>
    casillaCambiada(actual, antes) && (
      <Typography variant="caption" sx={{ display: "block", mt: -0.75, ml: 4, color: "warning.dark", fontWeight: 700 }}>
        Antes: {antes ? "sí" : "no"}
      </Typography>
    );

  const rotuloDeHecho = (texto) => (
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight="bold"
      sx={{ display: "block", mb: 1 }}
    >
      {texto}
    </Typography>
  );

  // LO QUE LE PASÓ AL EQUIPO, fuera de la devolución, para corregir. Las
  // fechas, los días y los descuentos se escriben; los días vencidos no: salen
  // solos de la historia corregida.
  //
  // El cierre de mora que hizo un pago no se mueve de fecha —esa fecha es la
  // del abono— ni se quita: solo su descuento. Y el "sin fecha de entrega" se
  // muestra tal cual.
  const hechoCorregible = (indiceGrupo, item, idEquipo, hecho, posicion) => {
    const nombre = `${idEquipo}-hecho${posicion}`;
    const antes = equipoAntes(borrador.grupos[indiceGrupo], item.clave)?.hechos[posicion];
    const cambiar = (campos) => cambiarHecho(indiceGrupo, item.clave, posicion, campos);
    const fecha = formatearFechaLegible(hecho.fecha);
    const quitar = (texto) => (
      <Button
        size="small"
        color="error"
        onClick={() => borrarHecho(indiceGrupo, item.clave, posicion)}
      >
        {texto}
      </Button>
    );
    const descuentoVencidos = campoPlata(
      "Descuento en los días vencidos",
      `${nombre}-descuentoVencidos`,
      hecho.descuentoVencidos,
      (valor) => cambiar({ descuentoVencidos: valor }),
      antes?.descuentoVencidos,
    );

    switch (hecho.tipo) {
      case "ampliacion":
        return (
          <Box key={nombre} id={nombre} role="group" aria-label="Ampliación" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("Ampliación")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={7} sm={4}>
                {campoFecha(
                  "Fecha de la ampliación",
                  `${nombre}-fecha`,
                  hecho.fecha,
                  (valor) => cambiar({ fecha: valor }),
                  antes?.fecha,
                )}
              </Grid>
              <Grid item xs={5} sm={3}>
                <TextField
                  label="Días pedidos"
                  name={`${nombre}-dias`}
                  type="number"
                  inputProps={{ min: 1 }}
                  value={hecho.dias}
                  onChange={(e) => cambiar({ dias: e.target.value })}
                  fullWidth
                  size="small"
                  {...marca(hecho.dias, antes?.dias)}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                {quitar("Quitar la ampliación")}
              </Grid>
              <Grid item xs={12} sm={6}>
                {campoPlata(
                  "Descuento en los días nuevos",
                  `${nombre}-descuento`,
                  hecho.descuento,
                  (valor) => cambiar({ descuento: valor }),
                  antes?.descuento,
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {descuentoVencidos}
              </Grid>
            </Grid>
          </Box>
        );

      case "entregaPactada":
        return (
          <Box key={nombre} id={nombre} role="group" aria-label="Entrega pactada" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("Entrega pactada")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                {campoFecha(
                  "Fecha del aviso",
                  `${nombre}-fecha`,
                  hecho.fecha,
                  (valor) => cambiar({ fecha: valor }),
                  antes?.fecha,
                )}
              </Grid>
              <Grid item xs={12} sm={4}>
                {descuentoVencidos}
              </Grid>
              <Grid item xs={12} sm={4}>
                {quitar("Quitar la entrega pactada")}
              </Grid>
            </Grid>
          </Box>
        );

      case "entregaAnulada":
        return (
          <Box key={nombre} id={nombre} role="group" aria-label="No entregó" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("No entregó lo pactado")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                {campoFecha(
                  "Fecha en que se anuló",
                  `${nombre}-fecha`,
                  hecho.fecha,
                  (valor) => cambiar({ fecha: valor }),
                  antes?.fecha,
                )}
              </Grid>
              <Grid item xs={12} sm={8}>
                {quitar("Quitar la anulación")}
              </Grid>
            </Grid>
          </Box>
        );

      case "sello":
        return (
          <Box key={nombre} id={nombre} role="group" aria-label="Cierre de mora" sx={RECUADRO_HECHO}>
            {rotuloDeHecho(`Días vencidos cerrados el ${fecha}`)}
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                {descuentoVencidos}
              </Grid>
            </Grid>
          </Box>
        );

      case "indefinida":
        return (
          <Typography
            key={nombre}
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            · Sin fecha de entrega desde el {fecha}
          </Typography>
        );

      default:
        return null;
    }
  };

  // El medio de un abono o de una devolución, con la etiqueta enganchada al
  // input oculto del Select (si no, la etiqueta no lo nombra).
  const campoMedio = (name, valor, onCambio, antes) => (
    <FormControl fullWidth size="small" sx={marca(valor, antes).sx}>
      <InputLabel id={`${name}-label`} htmlFor={`${name}-input`}>
        Medio
      </InputLabel>
      <Select
        labelId={`${name}-label`}
        inputProps={{ id: `${name}-input`, name }}
        label="Medio"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      >
        {mediosParaCorregir(MODOS_PAGO, valor).map((medio) => (
          <MenuItem key={medio} value={medio}>
            {medio}
          </MenuItem>
        ))}
      </Select>
      {marca(valor, antes).helperText && <FormHelperText>{marca(valor, antes).helperText}</FormHelperText>}
    </FormControl>
  );

  const nota = (key, texto) => (
    <Typography key={key} variant="caption" color="text.secondary" sx={{ display: "block" }}>
      · {texto}
    </Typography>
  );

  // UN ABONO. El que llegó por un cruce se corrige desde la factura de donde
  // salió, así que acá solo se cuenta. El que se pagó con el depósito no
  // cambia de medio: pasarlo a "Nequi" sería inventar plata que no entró.
  const filaAbono = (item, posicion) => {
    const nombre = `corregir-abono${posicion}`;
    const antes = inicial?.abonos[posicion];
    const fecha = formatearFechaLegible(item.original.fecha);

    if (esAbonoDeCruce(item.original)) {
      return nota(
        nombre,
        `Cruce del ${fecha} desde la factura ${item.original.desdeFactura ?? "s/n"}: ${formatearMoneda(
          Number(item.original.monto) || 0,
        )}. Se corrige desde esa factura.`,
      );
    }

    const conDeposito = item.original.medio === MEDIO_DEPOSITO;
    return (
      <Box key={nombre} role="group" aria-label="Abono" sx={RECUADRO_HECHO}>
        {rotuloDeHecho(conDeposito ? "Abono con el depósito" : "Abono")}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            {campoFecha(
              "Fecha",
              `${nombre}-fecha`,
              item.fecha,
              (valor) => cambiarEnLista("abonos", posicion, { fecha: valor }),
              antes?.fecha,
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {conDeposito ? (
              <TextField
                label="Medio"
                name={`${nombre}-medio`}
                value={MEDIO_DEPOSITO}
                disabled
                fullWidth
                size="small"
              />
            ) : (
              campoMedio(
                `${nombre}-medio`,
                item.medio,
                (valor) => cambiarEnLista("abonos", posicion, { medio: valor }),
                antes?.medio,
              )
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoPlata(
              "Monto",
              `${nombre}-monto`,
              item.monto,
              (valor) => cambiarEnLista("abonos", posicion, { monto: valor }),
              antes?.monto,
            )}
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button size="small" color="error" onClick={() => quitarDeLista("abonos", posicion)}>
              Quitar el abono
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // UN DESCUENTO AL COBRAR: la fecha y el monto. No tiene medio, porque no
  // entró plata. Se corrige o se quita; uno nuevo se anota al cobrar.
  const filaDescuento = (item, posicion) => {
    const nombre = `corregir-descuento${posicion}`;
    const antes = inicial?.descuentos[posicion];
    return (
      <Box key={nombre} role="group" aria-label="Descuento" sx={RECUADRO_HECHO}>
        {rotuloDeHecho("Descuento al cobrar")}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            {campoFecha(
              "Fecha",
              `${nombre}-fecha`,
              item.fecha,
              (valor) => cambiarEnLista("descuentos", posicion, { fecha: valor }),
              antes?.fecha,
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            {campoPlata(
              "Monto",
              `${nombre}-monto`,
              item.monto,
              (valor) => cambiarEnLista("descuentos", posicion, { monto: valor }),
              antes?.monto,
            )}
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button size="small" color="error" onClick={() => quitarDeLista("descuentos", posicion)}>
              Quitar el descuento
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // LO DEVUELTO AL CLIENTE. El cruce va aparte: no salió plata, fue a otras
  // facturas, y se corrige cuánto llevó a cada una —las dos puntas juntas—.
  const filaEntrega = (item, posicion) => {
    const nombre = `corregir-entrega${posicion}`;
    const antes = inicial?.entregas[posicion];
    const fecha = formatearFechaLegible(item.original.fecha);
    const destinos = (item.original.haciaFacturas ?? []).join(", ");

    if (item.partes === null) {
      // Sin poder leer las otras facturas no hay con qué emparejar las puntas:
      // el cruce queda como está y lo demás se guarda igual.
      return nota(
        nombre,
        otras.estado === "error"
          ? `Cruce del ${fecha} a la factura ${destinos}: ${formatearMoneda(
              Number(item.original.monto) || 0,
            )}. No se pudieron leer las demás facturas del cliente, así que este cruce no se corrige por ahora.`
          : `Cruce del ${fecha}: buscando las facturas a las que fue...`,
      );
    }
    if (item.partes === false) {
      return nota(
        nombre,
        `Cruce del ${fecha} a la factura ${destinos}: ${formatearMoneda(
          Number(item.original.monto) || 0,
        )}. No se encontró su abono en la otra factura, así que no se corrige desde acá.`,
      );
    }

    if (Array.isArray(item.partes)) {
      return (
        <Box key={nombre} role="group" aria-label="Cruce" sx={RECUADRO_HECHO}>
          {rotuloDeHecho("Cruce a otras facturas")}
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={3}>
              {campoFecha(
                "Fecha",
                `${nombre}-fecha`,
                item.fecha,
                (valor) => cambiarEnLista("entregas", posicion, { fecha: valor }),
                antes?.fecha,
              )}
            </Grid>
            {item.partes.map((parte, indiceParte) => (
              <Grid item xs={12} sm={3} key={parte.facturaId}>
                {campoPlata(
                  `A la factura ${parte.numero}`,
                  `${nombre}-parte${indiceParte}`,
                  parte.monto,
                  (valor) => cambiarParteDelCruce(posicion, indiceParte, valor),
                  Array.isArray(antes?.partes) ? antes.partes[indiceParte]?.monto : undefined,
                )}
              </Grid>
            ))}
            <Grid item xs={12} sm={3}>
              <Button
                size="small"
                color="error"
                onClick={() => quitarDeLista("entregas", posicion)}
              >
                Quitar el cruce
              </Button>
            </Grid>
          </Grid>
        </Box>
      );
    }

    return (
      <Box key={nombre} role="group" aria-label="Devolución al cliente" sx={RECUADRO_HECHO}>
        {rotuloDeHecho("Devolución al cliente")}
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            {campoFecha(
              "Fecha",
              `${nombre}-fecha`,
              item.fecha,
              (valor) => cambiarEnLista("entregas", posicion, { fecha: valor }),
              antes?.fecha,
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoMedio(
              `${nombre}-medio`,
              item.medio,
              (valor) => cambiarEnLista("entregas", posicion, { medio: valor }),
              antes?.medio,
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoPlata(
              "Monto",
              `${nombre}-monto`,
              item.monto,
              (valor) => cambiarEnLista("entregas", posicion, { monto: valor }),
              antes?.monto,
            )}
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              size="small"
              color="error"
              onClick={() => quitarDeLista("entregas", posicion)}
            >
              Quitar la devolución al cliente
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ── LA MESA DE CORRECCIÓN (rediseño aprobado por el dueño, 2026-10-30) ──
  //
  // Tres columnas en el computador: a la izquierda un índice con un punto en
  // cada sección que tiene cambios; en el centro la factura; a la derecha la
  // pizarra "Así queda", que cambia mientras se corrige, y debajo lo que se va
  // a cambiar. En el celular, las secciones se eligen arriba y la pizarra baja
  // al final, con el saldo y Guardar fijos abajo.
  const inicial = cargado && factura ? borradorDe(factura, otrasListas ?? undefined) : null;
  const grupoAntes = (grupo) => inicial?.grupos.find((cada) => cada.grupo === grupo.grupo);
  const equipoAntes = (grupo, clave) =>
    grupoAntes(grupo)?.equipos.find((cada) => cada.clave === clave);

  // Lo que se va a cambiar, dicho como lo dice el historial. El saldo no: ya
  // está grande en la pizarra.
  const cambiosALaVista = documento
    ? renglonesDe({ clase: "modificada", antes: factura, despues: documento, cuando: Date.now() })
        .filter((renglon) => !renglon.startsWith("Saldo pendiente"))
    : [];

  // Lo escrito en una casilla de plata vuelve como texto ("300000") y lo
  // guardado puede ser número (300000): se comparan como texto, o volver al
  // valor de antes dejaba la sección marcada como cambiada (2026-10-30).
  const comoTexto = (valor) => {
    if (Array.isArray(valor)) return valor.map(comoTexto);
    if (valor && typeof valor === "object") {
      return Object.fromEntries(Object.entries(valor).map(([clave, dato]) => [clave, comoTexto(dato)]));
    }
    return String(valor ?? "");
  };
  const igualQueAntes = (actual, antes) => mismoContenido(comoTexto(actual), comoTexto(antes));

  const seccionCambiada = {
    factura:
      Boolean(inicial) &&
      (borrador.numeroFactura !== inicial.numeroFactura ||
        borrador.fechaCreacion !== inicial.fechaCreacion),
    grupo: (grupo) => {
      const antes = grupoAntes(grupo);
      return Boolean(inicial) && (!antes || !igualQueAntes(grupo, antes));
    },
    plata:
      Boolean(inicial) &&
      (!igualQueAntes(borrador.abonos, inicial.abonos) ||
        !igualQueAntes(borrador.descuentos, inicial.descuentos)),
  };

  // Un campo que ya no dice lo que estaba guardado: ámbar, y debajo lo de antes.
  const marca = (actual, antes, mostrar = (valor) => valor) => {
    if (antes === undefined || String(actual ?? "") === String(antes ?? "")) return {};
    return { helperText: `Antes: ${mostrar(antes) || "vacío"}`, sx: CAMPO_CAMBIADO };
  };
  const comoPlata = (valor) => formatearMoneda(Number(limpiarMonedaInput(String(valor ?? ""))) || 0);
  const comoFecha = (valor) => (valor ? formatearFechaLegible(valor) : "");
  const comoTipoDePago = (valor) =>
    TIPOS_DE_PAGO.find((tipo) => tipo.valor === valor)?.label ?? valor;

  const irA = (id) =>
    document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });

  // El encabezado de cada sección: su ícono en un cuadro, el título y una
  // línea que dice qué hay adentro.
  // El ícono va SIEMPRE al lado del título (pedido del dueño, 2026-10-30): lo
  // que baja al angostar es lo de `extra`.
  //
  // `plegable`: { id, cambiada } — en el celular el renglón entero abre y
  // cierra la sección, con la flecha a la derecha y el punto naranja si tiene
  // cambios, como el encabezado de una factura.
  const plegada = (id) => esCompacta && !abiertas[id];
  const alternar = (id) => setAbiertas((previas) => ({ ...previas, [id]: !previas[id] }));
  const encabezado = ({ Icono, texto, detalle, tono = acento, relleno = false, extra = null, plegable = null }) => {
    const conFlecha = esCompacta && plegable;
    return (
    <Stack
      direction="row"
      alignItems="center"
      columnGap={1.5}
      rowGap={1}
      flexWrap="wrap"
      {...(conFlecha
        ? propsRenglonPlegable({
            abierto: !plegada(plegable.id),
            alternar: () => alternar(plegable.id),
            etiqueta: `${plegada(plegable.id) ? "Mostrar" : "Ocultar"} ${texto}`,
          })
        : {})}
      sx={conFlecha ? sxRenglonPlegable : undefined}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        sx={conFlecha ? { flex: "1 1 100%", minWidth: 0 } : { mr: "auto", minWidth: 0 }}
      >
      <Box
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: relleno ? tono : alpha(tono, 0.12),
          color: relleno ? theme.palette.getContrastText(tono) : tono,
        }}
      >
        <Icono />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: FUENTE_TITULOS, fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.3 }}>
          {texto}
        </Typography>
        {detalle && (
          <Typography variant="body2" color="text.secondary">
            {detalle}
          </Typography>
        )}
      </Box>
      {conFlecha && (
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ ml: "auto", flexShrink: 0 }}>
          {plegable.cambiada && (
            <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: "warning.main" }} />
          )}
          {renderFlechaPlegable(!plegada(plegable.id), acento)}
        </Stack>
      )}
      </Stack>
      {extra}
    </Stack>
    );
  };

  // EL COLOR DE CADA SECCIÓN (pedido del dueño, 2026-10-30), como en las demás
  // vistas: la franja de arriba y el ícono, y LOS MISMOS colores que la factura
  // en la ficha del cliente, así cada parte se reconoce igual en las dos
  // pantallas: los equipos del despacho inicial en azul, los agregados en
  // violeta, el transporte en el naranja de los cargos y los abonos en el azul
  // de los abonos. El "cambiaste" de los campos es ámbar, no ese naranja.
  const colores = theme.palette.custom;
  const colorDelDespacho = (grupo) =>
    grupo.grupo === GRUPO_INICIAL ? colores.seccionEquipos : colores.seccionEquiposAgregados;
  const colorCargos = colores.seccionAdicionales;
  const colorAbonos = theme.palette.info.main;
  const tarjetaDe = (color) => ({ ...TARJETA, ...theme.recuadro(color) });

  const etiqueta = (texto, tono = acento) => (
    <Box
      component="span"
      sx={{
        fontSize: "0.8rem",
        fontWeight: 700,
        px: 1.5,
        py: 0.5,
        borderRadius: 999,
        bgcolor: alpha(tono, 0.12),
        color: tono,
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </Box>
  );

  // LA LÍNEA DE TIEMPO DEL EQUIPO: lo que le pasó, en orden. Cada punto lleva
  // a sus campos, que están debajo.
  const lineaDeTiempo = (grupo, item, idEquipo) => {
    const antes = equipoAntes(grupo, item.clave);
    const devolucionAntes = antes?.hechos.find(({ tipo }) => tipo === "devolucion");
    const nodo = ({ clave, Icono, tono, texto, fecha, destino, cambiado = false }) => (
      <ButtonBase
        key={clave}
        onClick={() => destino && irA(destino)}
        disabled={!destino}
        sx={{
          flex: "0 0 auto",
          minWidth: 112,
          px: 1,
          py: 0.75,
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          border: "2px solid",
          borderColor: cambiado ? "warning.main" : "transparent",
          bgcolor: cambiado ? alpha(theme.palette.warning.main, 0.08) : "transparent",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: cambiado ? "warning.main" : alpha(tono, 0.14),
            color: cambiado ? theme.palette.getContrastText(theme.palette.warning.main) : tono,
          }}
        >
          <Icono sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="body2" fontWeight={800}>
          {texto}
        </Typography>
        {fecha && (
          <Typography variant="caption" color="text.secondary">
            {fecha}
          </Typography>
        )}
      </ButtonBase>
    );
    const raya = (clave) => (
      <Box
        key={clave}
        aria-hidden="true"
        sx={{ flex: "1 0 24px", height: 2, bgcolor: "divider", mt: "22px" }}
      />
    );

    const puntos = [
      nodo({
        clave: "salio",
        Icono: ArrowForwardIcon,
        tono: acento,
        texto: "Salió",
        fecha: [comoFecha(item.fechaDespacho), item.dias && `${item.dias} días`]
          .filter(Boolean)
          .join(" · "),
      }),
    ];
    item.hechos.forEach((hecho, posicion) => {
      const info = NODO_DE_HECHO[hecho.tipo];
      if (!info) return;
      const esDevolucion = hecho.tipo === "devolucion";
      puntos.push(raya(`raya-${posicion}`));
      puntos.push(
        nodo({
          clave: `hecho-${posicion}`,
          Icono: info.Icono,
          tono: theme.palette[info.tono].main,
          texto: info.texto(hecho),
          fecha: comoFecha(hecho.fecha),
          destino: esDevolucion ? `${idEquipo}-devolucion` : `${idEquipo}-hecho${posicion}`,
          cambiado: esDevolucion && devolucionAntes && devolucionAntes.fecha !== hecho.fecha,
        }),
      );
    });

    return (
      <Box sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          sx={{ display: "block", fontWeight: 800, letterSpacing: "0.1em", color: "text.secondary", mb: 0.5 }}
        >
          LO QUE LE PASÓ
        </Typography>
        <Box sx={{ display: "flex", alignItems: "flex-start", overflowX: "auto", pb: 0.5 }}>{puntos}</Box>
      </Box>
    );
  };

  // Un renglón de la pizarra: el valor de antes tachado y el de después.
  const renglonDePizarra = (rotulo, antes, despues) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, py: 0.75 }}>
      <Typography variant="body2" sx={{ opacity: 0.75 }}>
        {rotulo}
      </Typography>
      <Typography variant="body2" component="div" sx={{ textAlign: "right" }}>
        {antes === despues ? (
          antes
        ) : (
          <>
            <Box component="s" sx={{ opacity: 0.6 }}>
              {antes}
            </Box>
            {" → "}
            <Box component="b" sx={{ color: "custom.totalText" }}>
              {despues}
            </Box>
          </>
        )}
      </Typography>
    </Box>
  );

  const cuentaFinal = cuentaDespues ?? cuentaAntes;
  const estadoAntes = factura ? estadoDe(factura) : "";
  const estadoDespues = documento ? estadoDe(documento) : estadoAntes;
  const diferenciaSaldo = cuentaAntes ? cuentaFinal.saldoPendiente - cuentaAntes.saldoPendiente : 0;

  const pizarra = cuentaAntes && (
    <Paper variant="totales" aria-label="Así queda" sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography
          sx={{ fontFamily: FUENTE_TITULOS, fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.12em", color: (t) => `${t.palette.custom.totalText} !important` }}
        >
          {cuentaDespues ? "ASÍ QUEDA" : "LA CUENTA DE HOY"}
        </Typography>
        {cuentaDespues && (
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            antes → después
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          px: 1.5,
          py: 1,
          borderRadius: "12px",
          bgcolor: (t) => alpha(t.palette.custom.panelText, 0.06),
        }}
      >
        <Typography variant="body2" sx={{ mr: "auto", opacity: 0.75 }}>
          Estado
        </Typography>
        <Chip size="small" label={estadoAntes} sx={{ fontWeight: 800, color: "inherit", bgcolor: (t) => alpha(t.palette.custom.panelText, 0.12) }} />
        {estadoDespues !== estadoAntes && (
          <>
            <Typography component="span" variant="body2">
              {" → "}
            </Typography>
            <Chip
              size="small"
              label={estadoDespues}
              sx={{ fontWeight: 800, color: "custom.totalText", bgcolor: (t) => alpha(t.palette.custom.totalText, 0.16) }}
            />
          </>
        )}
      </Box>

      <Box sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          Saldo pendiente
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 1 }}>
          {diferenciaSaldo !== 0 && (
            <>
              <Box component="s" sx={{ opacity: 0.6, fontSize: "1rem" }}>
                {formatearMoneda(cuentaAntes.saldoPendiente)}
              </Box>
              {" → "}
            </>
          )}
          <Box
            component="span"
            sx={{ fontFamily: FUENTE_TITULOS, fontWeight: 800, fontSize: "2rem", lineHeight: 1.2, color: "custom.totalText" }}
          >
            {formatearMoneda(cuentaFinal.saldoPendiente)}
          </Box>
        </Box>
        {diferenciaSaldo !== 0 && (
          <Box
            component="span"
            sx={{
              display: "inline-block",
              mt: 0.75,
              px: 1.25,
              py: 0.25,
              borderRadius: 999,
              fontSize: "0.8rem",
              fontWeight: 800,
              color: diferenciaSaldo < 0 ? "custom.saldadoText" : "custom.saldoText",
              bgcolor: (t) =>
                alpha(diferenciaSaldo < 0 ? t.palette.custom.saldadoText : t.palette.custom.saldoText, 0.16),
            }}
          >
            {diferenciaSaldo < 0 ? "− " : "+ "}
            {formatearMoneda(Math.abs(diferenciaSaldo))}
          </Box>
        )}
      </Box>

      <Box sx={{ pt: 1, borderTop: (t) => `1px solid ${alpha(t.palette.custom.panelText, 0.15)}` }}>
        {renglonDePizarra(
          "Días vencidos",
          formatearMoneda(cuentaAntes.netoVencido),
          formatearMoneda(cuentaFinal.netoVencido),
        )}
        {renglonDePizarra(
          "Transporte",
          formatearMoneda(calcularTransporteTotal(factura)),
          formatearMoneda(calcularTransporteTotal(documento ?? factura)),
        )}
        {renglonDePizarra("Total", formatearMoneda(cuentaAntes.total), formatearMoneda(cuentaFinal.total))}
        {renglonDePizarra(
          "Por devolverle al cliente",
          formatearMoneda(cuentaAntes.aDevolver),
          formatearMoneda(cuentaFinal.aDevolver),
        )}
      </Box>
    </Paper>
  );

  // Debajo de la pizarra: lo que falta, o lo que se va a cambiar.
  const loQueCambia = (
    <Stack spacing={2}>
      {errores.length > 0 ? (
        <Alert severity="error">
          <Typography variant="body2" fontWeight="bold">
            Falta corregir esto antes de guardar:
          </Typography>
          {errores.map((error) => (
            <Typography key={error} variant="body2">
              · {error}
            </Typography>
          ))}
        </Alert>
      ) : (
        <Box sx={{ ...TARJETA, p: 2 }}>
          <Typography
            sx={{
              fontFamily: FUENTE_TITULOS,
              fontWeight: 800,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              color: cambiosALaVista.length > 0 ? "warning.dark" : "text.secondary",
              mb: cambiosALaVista.length > 0 ? 1.5 : 0,
            }}
          >
            {cambiosALaVista.length === 0
              ? "TODAVÍA NO MODIFICASTE NADA"
              : `MODIFICASTE ${cambiosALaVista.length} ${cambiosALaVista.length === 1 ? "COSA" : "COSAS"}`}
          </Typography>
          <Stack spacing={1}>
            {cambiosALaVista.map((renglon) => {
              const [que, ...detalle] = renglon.split(": ");
              return (
                <Box
                  key={renglon}
                  sx={{ px: 1.5, py: 1, borderRadius: "10px", bgcolor: alpha(theme.palette.warning.main, 0.1) }}
                >
                  <Typography variant="body2" fontWeight={800}>
                    {que}
                  </Typography>
                  {detalle.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {detalle.join(": ")}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
          {corregida && (
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.5, color: "success.main" }}>
              <CheckCircleOutlineIcon fontSize="small" />
              <Typography variant="body2" fontWeight={700}>
                Todo en orden para guardar
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {corregida && (
        <Alert severity="warning">
          Las cuentas de cobro y los reportes que se descargaron antes de este
          cambio ya no valen: hay que emitirlos de nuevo.
        </Alert>
      )}
    </Stack>
  );

  const hayPlata =
    borrador.abonos.length > 0 || borrador.entregas.length > 0 || borrador.descuentos.length > 0;
  // Las secciones, para el índice del computador y las pestañas del celular.
  const secciones = [
    { id: "corregir-seccion-factura", texto: "Factura", cambiada: seccionCambiada.factura },
    ...borrador.grupos.map((grupo) => ({
      id: `corregir-seccion-${grupo.grupo}`,
      texto: nombreDelGrupo(grupo.grupo),
      cambiada: seccionCambiada.grupo(grupo),
    })),
    ...(hayPlata
      ? [{ id: "corregir-seccion-plata", texto: "Abonos y descuentos", cambiada: seccionCambiada.plata }]
      : []),
    { id: "corregir-seccion-historial", texto: "Historial", cambiada: false },
  ];

  // EL ÍNDICE de las secciones: a la izquierda en lo ancho. Cuando no hay lugar
  // para esa columna va en la de la derecha, debajo de lo modificado, con el
  // mismo estilo y sin la leyenda de los puntos, que no cabía de alto (pedido
  // del dueño, 2026-10-30).
  const indice = (enColumnas) => (
    <Box
      component="nav"
      aria-label="Secciones de la factura"
      sx={
        enColumnas
          ? { ...TARJETA, p: 2 }
          : { width: ANCHO_INDICE, flexShrink: 0, position: "sticky", top: 0 }
      }
    >
      <Typography
        variant="caption"
        sx={{ display: "block", fontWeight: 800, letterSpacing: "0.12em", color: "text.secondary", px: 1.5, pb: 1 }}
      >
        EN ESTA FACTURA
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 0.5,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
      {secciones.map((seccion) => (
        <ButtonBase
          key={seccion.id}
          onClick={() => irA(seccion.id)}
          sx={{
            justifyContent: "flex-start",
            gap: 1.25,
            px: 1.5,
            py: enColumnas ? 1 : 1.25,
            borderRadius: "10px",
            textAlign: "left",
            fontWeight: seccion.cambiada ? 800 : 700,
            fontSize: "0.9rem",
            color: seccion.cambiada ? acento : "text.primary",
            bgcolor: seccion.cambiada ? alpha(acento, 0.1) : "transparent",
            "&:hover": { bgcolor: alpha(acento, 0.08) },
          }}
        >
          <Box
            component="span"
            sx={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, bgcolor: seccion.cambiada ? "warning.main" : "divider" }}
          />
          {seccion.texto}
        </ButtonBase>
      ))}
      </Box>
      {!enColumnas && (
      <Stack spacing={1} sx={{ mx: 1.5, mt: 2, pt: 2, borderTop: "1px dashed", borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: "warning.main" }} />
          <Typography variant="caption" color="text.secondary">
            Tiene cambios sin guardar
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: "divider" }} />
          <Typography variant="caption" color="text.secondary">
            Como estaba
          </Typography>
        </Stack>
      </Stack>
      )}
    </Box>
  );

  // GUARDAR Y CERRAR, solo íconos como en las demás vistas (pedido del dueño,
  // 2026-10-30): en el encabezado en el computador; en el celular, abajo, y
  // con el celular acostado, en una columna a la izquierda.
  const botonGuardar = (sx) => (
    <Tooltip title="Guardar cambios">
      <span>
        <IconButton
          aria-label="Guardar cambios"
          color="success"
          onClick={handleGuardar}
          disabled={guardando || !corregida}
          sx={sx}
        >
          <Badge badgeContent={corregida ? cambiosALaVista.length : 0} color="warning">
            <SaveIcon />
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  );
  const botonCerrar = (sx) => (
    <Tooltip title="Cerrar sin guardar">
      <span>
        <IconButton aria-label="Cerrar" color="error" onClick={handleCerrar} disabled={guardando} sx={sx}>
          <CloseIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
  const BOTON_GRANDE = { p: 1.25 };

  const nombreDelCliente =
    cliente?.razonSocial || [cliente?.nombres, cliente?.apellido].filter(Boolean).join(" ");

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCerrar}
        fullScreen
        PaperProps={{ sx: { bgcolor: "background.default", backgroundImage: "none" } }}
      >
        {/* ── EL ENCABEZADO DE LA APP, como en todas las vistas (pedido del
            dueño, 2026-10-30). Sin ir al menú y con el logo quieto: salir a
            mitad de una corrección perdería lo que se lleva. Guardar y cerrar
            van como sus botones; en el celular el encabezado no los muestra:
            van abajo o, acostado, a la izquierda. */}
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 3 },
            pt: esCompacta ? 1.5 : 2,
            pb: 0.5,
            "@media (min-width:916px)": { px: `${MARGEN}px` },
          }}
        >
          <HeaderUsuarioConModal
            name={usuario.name}
            photoURL={usuario.photoURL}
            role={usuario.role}
            genero={usuario.genero}
            conLogo
            logoQuieto
            sinIrAlMenu
            compacto={esCompacta}
            vista={`Corregir factura ${datosFactura(factura).numeroFactura ?? ""}`}
            descripcion={nombreDelCliente}
            icono={<EditIcon />}
            acciones={
              <>
                {botonGuardar()}
                {botonCerrar()}
              </>
            }
          />

        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {acostado && (
          <Stack
            justifyContent="space-evenly"
            sx={{ flexShrink: 0, pl: { xs: 2, sm: 3 }, ml: ALINEAR_CON_EL_BORDE }}
          >
            {botonCerrar(BOTON_GRANDE)}
            {botonGuardar(BOTON_GRANDE)}
          </Stack>
        )}
        <DialogContent
          sx={{
            flex: 1,
            minWidth: 0,
            py: 3,
            // Acostado, con los botones a la izquierda, el contenido les queda
            // pegado (4px más el relleno del botón), como en las demás vistas.
            ...(acostado
              ? { pl: 0.5, pr: { xs: 2, sm: 3 } }
              : { px: { xs: 2, sm: 3 }, "@media (min-width:916px)": { px: `${MARGEN}px` } }),
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: `${ESPACIO}px`,
            }}
          >
            {/* ── El índice ── */}
            {conIndice && indice(false)}

            {/* ── La factura ── */}
            {/* Se estira con la pantalla y no baja de ANCHO_CENTRO, salvo que la
                pantalla misma sea más angosta (el celular). */}
            <Stack spacing={2.5} sx={{ flex: "1 1 0", minWidth: `min(${ANCHO_CENTRO}px, 100%)` }}>
              {/* LA FACTURA (pedido del dueño, 2026-10-30): con lugar, las fechas
                  a la derecha del título, a la altura del renglón "El número y
                  la fecha en que se creó"; angosto, debajo. Mide su propio
                  ancho (no el de la pantalla), y el renglón de "Antes: …" queda
                  reservado desde el principio: corregir algo no mueve nada. */}
              <Box
                component="section"
                id="corregir-seccion-factura"
                aria-label="Factura"
                sx={{ ...tarjetaDe(acento), containerType: "inline-size" }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: "minmax(0, 1fr)",
                    alignItems: "end",
                    // En el celular, siempre debajo: el título se pliega con su
                    // flecha arriba a la derecha, y al lado la flecha quedaba
                    // pegada al texto (pedido del dueño, 2026-10-30).
                    ...(!esCompacta && {
                      "@container (min-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr) 400px" },
                    }),
                  }}
                >
                  {/* Al lado, alineados por abajo: el hueco bajo el título
                      deja el centro de las cajas a la altura del centro del
                      renglón de la descripción (las cajas llevan debajo el
                      renglón reservado de "Antes: …"). */}
                  <Box sx={esCompacta ? undefined : { "@container (min-width: 720px)": { pb: HUECO_BAJO_EL_TITULO } }}>
                    {encabezado({
                      Icono: ReceiptLongIcon,
                      texto: "Factura",
                      detalle: "El número y la fecha en que se creó",
                      plegable: { id: "corregir-seccion-factura", cambiada: seccionCambiada.factura },
                    })}
                  </Box>
                  {!plegada("corregir-seccion-factura") && (
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: "minmax(0, 1fr)",
                      "@container (min-width: 360px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
                    }}
                  >
                    <TextField
                      label="N° de factura"
                      name="numeroFactura"
                      value={borrador.numeroFactura}
                      onChange={(e) =>
                        setBorrador((prev) => ({ ...prev, numeroFactura: e.target.value }))
                      }
                      size="small"
                      fullWidth
                      sx={marca(borrador.numeroFactura, inicial?.numeroFactura).sx}
                      helperText={marca(borrador.numeroFactura, inicial?.numeroFactura).helperText ?? " "}
                    />
                    <TextField
                      label="Fecha creación"
                      name="fechaCreacion"
                      type="date"
                      value={borrador.fechaCreacion}
                      onChange={(e) =>
                        setBorrador((prev) => ({ ...prev, fechaCreacion: e.target.value }))
                      }
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      sx={marca(borrador.fechaCreacion, inicial?.fechaCreacion, comoFecha).sx}
                      helperText={marca(borrador.fechaCreacion, inicial?.fechaCreacion, comoFecha).helperText ?? " "}
                    />
                  </Box>
                  )}
                </Box>
              </Box>

              {/* ── Cada despacho, con su plata y sus equipos ── */}
              {borrador.grupos.map((grupo, indiceGrupo) => {
                const idGrupo = `corregir-${grupo.grupo}`;
                const antesGrupo = grupoAntes(grupo);
                const sinTransporte = !grupo.transporte || grupo.transporte === "Sin transporte";
                const transporteDelDespacho =
                  (sinTransporte ? 0 : plataDe(grupo.valorTransporte)) +
                  grupo.transportesAdicionales.reduce((suma, { valor }) => suma + plataDe(valor), 0);
                const pagado = grupo.pagos.reduce((suma, { monto }) => suma + plataDe(monto), 0);
                const marcaTransporte = marca(grupo.transporte, antesGrupo?.transporte);
                const marcaTipoPago = marca(grupo.tipoPago, antesGrupo?.tipoPago, comoTipoDePago);
                return (
                  <Box
                    key={grupo.grupo}
                    component="section"
                    id={`corregir-seccion-${grupo.grupo}`}
                    aria-label={nombreDelGrupo(grupo.grupo)}
                    sx={{ ...tarjetaDe(colorDelDespacho(grupo)), p: 0, overflow: "hidden" }}
                  >
                    <Box
                      sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        // Cerrado no hay nada debajo que separar: la línea se
                        // juntaba con el borde de la tarjeta.
                        ...(!plegada(`corregir-seccion-${grupo.grupo}`) && {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }),
                      }}
                    >
                      {encabezado({
                        Icono: LocalShippingIcon,
                        texto: nombreDelGrupo(grupo.grupo),
                        detalle: `${grupo.equipos.length} ${grupo.equipos.length === 1 ? "equipo" : "equipos"}`,
                        relleno: true,
                        tono: colorDelDespacho(grupo),
                        plegable: { id: `corregir-seccion-${grupo.grupo}`, cambiada: seccionCambiada.grupo(grupo) },
                        extra: (
                          <Stack direction="row" gap={1} flexWrap="wrap">
                            {plataDe(grupo.valorDeposito) > 0 &&
                              etiqueta(`Depósito ${formatearMoneda(plataDe(grupo.valorDeposito))}`, colores.seccionDeposito)}
                            {etiqueta(
                              `${comoTipoDePago(grupo.tipoPago)}${pagado > 0 ? ` · ${formatearMoneda(pagado)}` : ""}`,
                              colores.seccionPago,
                            )}
                          </Stack>
                        ),
                      })}
                    </Box>

                    {!plegada(`corregir-seccion-${grupo.grupo}`) && (
                    <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 3 } }}>
                      {/* En una caja: el Stack le quita al Grid su margen
                          negativo y la fila se salía por la derecha. */}
                      <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Fecha del despacho"
                            name={`${idGrupo}-fecha`}
                            type="date"
                            value={grupo.fechaSolicitud}
                            onChange={(e) =>
                              cambiarGrupo(indiceGrupo, () => ({ fechaSolicitud: e.target.value }))
                            }
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            {...marca(grupo.fechaSolicitud, antesGrupo?.fechaSolicitud, comoFecha)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="Depósito"
                            name={`${idGrupo}-deposito`}
                            value={formatearMonedaInput(grupo.valorDeposito)}
                            onChange={(e) =>
                              cambiarGrupo(indiceGrupo, () => ({
                                valorDeposito: limpiarMonedaInput(e.target.value),
                              }))
                            }
                            fullWidth
                            size="small"
                            {...marca(grupo.valorDeposito, antesGrupo?.valorDeposito, comoPlata)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth size="small" sx={marcaTipoPago.sx}>
                            <InputLabel
                              id={`${idGrupo}-tipopago-label`}
                              htmlFor={`${idGrupo}-tipopago-input`}
                            >
                              Tipo de pago
                            </InputLabel>
                            <Select
                              labelId={`${idGrupo}-tipopago-label`}
                              inputProps={{
                                id: `${idGrupo}-tipopago-input`,
                                name: `${idGrupo}-tipoPago`,
                              }}
                              label="Tipo de pago"
                              value={grupo.tipoPago}
                              onChange={(e) =>
                                cambiarGrupo(indiceGrupo, () => ({ tipoPago: e.target.value }))
                              }
                            >
                              {TIPOS_DE_PAGO.map(({ valor, label }) => (
                                <MenuItem key={valor} value={valor}>
                                  {label}
                                </MenuItem>
                              ))}
                            </Select>
                            {marcaTipoPago.helperText && (
                              <FormHelperText>{marcaTipoPago.helperText}</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Acá el monto se escribe a mano, sin repartos
                            automáticos: se está corrigiendo lo que se pagó, no
                            cobrando una factura nueva. */}
                        {!pagoSinMedios(grupo.tipoPago) && (
                          <Grid item xs={12}>
                            <PagosMediosField
                              pagos={grupo.pagos}
                              onChange={(pagos) => cambiarGrupo(indiceGrupo, () => ({ pagos }))}
                              idPrefix={`${idGrupo}-pago`}
                              marcarCambio={(indice, campo) => {
                                // Un medio que no estaba se marca contra "vacío".
                                const antes = antesGrupo ? (antesGrupo.pagos[indice] ?? { medio: "", monto: "" }) : undefined;
                                return campo === "monto"
                                  ? marca(grupo.pagos[indice]?.monto ?? "", antes?.monto ?? (antes && ""), comoPlata)
                                  : marca(grupo.pagos[indice]?.medio ?? "", antes?.medio ?? (antes && ""));
                              }}
                            />
                          </Grid>
                        )}
                      </Grid>
                      </Box>

                      {/* EL TRANSPORTE, como un tiquete: el del despacho y,
                          debajo, cada transporte adicional que se anotó al
                          devolver una parte. */}
                      <Box
                        sx={{
                          borderRadius: "14px",
                          border: "1px solid",
                          borderColor: alpha(colorCargos, 0.3),
                          bgcolor: alpha(colorCargos, 0.05),
                          p: 2,
                        }}
                      >
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5, color: colorCargos }}>
                          <LocalShippingIcon fontSize="small" />
                          <Typography sx={{ fontFamily: FUENTE_TITULOS, fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.08em" }}>
                            TRANSPORTE
                          </Typography>
                          <Typography sx={{ ml: "auto", fontFamily: FUENTE_TITULOS, fontWeight: 800, color: "text.primary" }}>
                            Total {formatearMoneda(transporteDelDespacho)}
                          </Typography>
                        </Stack>
                        <Grid container spacing={1.5} alignItems="flex-start">
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small" sx={{ bgcolor: "background.paper", ...marcaTransporte.sx }}>
                              <InputLabel
                                id={`${idGrupo}-transporte-label`}
                                htmlFor={`${idGrupo}-transporte-input`}
                              >
                                Transporte
                              </InputLabel>
                              <Select
                                labelId={`${idGrupo}-transporte-label`}
                                inputProps={{
                                  id: `${idGrupo}-transporte-input`,
                                  name: `${idGrupo}-transporte`,
                                }}
                                label="Transporte"
                                value={grupo.transporte}
                                onChange={(e) =>
                                  cambiarGrupo(indiceGrupo, () => ({ transporte: e.target.value }))
                                }
                              >
                                {TRANSPORTES.map((opcion) => (
                                  <MenuItem key={opcion} value={opcion}>
                                    {opcion}
                                  </MenuItem>
                                ))}
                              </Select>
                              {marcaTransporte.helperText && (
                                <FormHelperText>{marcaTransporte.helperText}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Valor transporte"
                              name={`${idGrupo}-valorTransporte`}
                              value={formatearMonedaInput(grupo.valorTransporte)}
                              onChange={(e) =>
                                cambiarGrupo(indiceGrupo, () => ({
                                  valorTransporte: limpiarMonedaInput(e.target.value),
                                }))
                              }
                              disabled={sinTransporte}
                              fullWidth
                              size="small"
                              {...marca(grupo.valorTransporte, antesGrupo?.valorTransporte, comoPlata)}
                            />
                          </Grid>
                          {grupo.transportesAdicionales.map((adicional, posicion) => {
                            const antesAdicional = antesGrupo?.transportesAdicionales[posicion];
                            return (
                              <Grid item xs={12} key={`${idGrupo}-adicional-${posicion}`}>
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="flex-start"
                                  sx={{ pt: 1.5, borderTop: "1px dashed", borderColor: alpha(colorCargos, 0.35) }}
                                >
                                  <TextField
                                    label="Transporte adicional · fecha"
                                    name={`${idGrupo}-adicional-${posicion}-fecha`}
                                    type="date"
                                    value={adicional.fecha}
                                    onChange={(e) =>
                                      cambiarTransporteAdicional(indiceGrupo, posicion, {
                                        fecha: e.target.value,
                                      })
                                    }
                                    fullWidth
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    {...marca(adicional.fecha, antesAdicional?.fecha, comoFecha)}
                                  />
                                  <TextField
                                    label="Valor"
                                    name={`${idGrupo}-adicional-${posicion}-valor`}
                                    value={formatearMonedaInput(adicional.valor)}
                                    onChange={(e) =>
                                      cambiarTransporteAdicional(indiceGrupo, posicion, {
                                        valor: limpiarMonedaInput(e.target.value),
                                      })
                                    }
                                    fullWidth
                                    size="small"
                                    {...marca(adicional.valor, antesAdicional?.valor, comoPlata)}
                                  />
                                  <Tooltip title="Quitar este transporte adicional">
                                    <IconButton
                                      aria-label="Quitar este transporte adicional"
                                      color="error"
                                      onClick={() => quitarTransporteAdicional(indiceGrupo, posicion)}
                                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper" }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>

                      {grupo.equipos.map((item) => {
                        const idEquipo = `${idGrupo}-${item.clave}`;
                        const antes = equipoAntes(grupo, item.clave);
                        const devolucion = item.hechos.find(({ tipo }) => tipo === "devolucion");
                        const devolucionAntes = antes?.hechos.find(({ tipo }) => tipo === "devolucion");
                        const volvioMal = devolucion?.devolucion?.buenEstado === false;
                        const volvioMalAntes = devolucionAntes
                          ? devolucionAntes.devolucion?.buenEstado === false
                          : undefined;
                        return (
                          <Box
                            key={item.clave}
                            role="group"
                            aria-label={`Equipo ${item.nombre || "nuevo"}`}
                            // Como el equipo en la factura (EquipoRow): el
                            // color de su despacho, y por dentro gris si ya
                            // volvió.
                            sx={{
                              p: 2,
                              ...theme.recuadro(
                                colorDelDespacho(grupo),
                                devolucion ? colores.seccionDevuelto : colorDelDespacho(grupo),
                              ),
                            }}
                          >
                            <Grid container spacing={1.5} alignItems="flex-start">
                              <Grid item xs={10} sm={11} md={3.5}>
                                <TextField
                                  label="Equipo"
                                  name={`${idEquipo}-nombre`}
                                  value={item.nombre}
                                  onChange={(e) =>
                                    cambiarEquipo(indiceGrupo, item.clave, () => ({
                                      nombre: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  size="small"
                                  inputProps={{ style: { fontWeight: 800 } }}
                                  {...marca(item.nombre, antes?.nombre)}
                                />
                              </Grid>
                              <Grid item xs={2} sm={1} md={1} sx={{ order: { md: 9 }, textAlign: "right" }}>
                                <Tooltip title="Quitar este equipo de la factura">
                                  <IconButton
                                    color="error"
                                    aria-label="Quitar equipo"
                                    onClick={() => quitarEquipo(indiceGrupo, item.clave)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Grid>
                              <Grid item xs={4} md={1.5}>
                                <TextField
                                  label="Cantidad"
                                  name={`${idEquipo}-cantidad`}
                                  type="number"
                                  inputProps={{ min: 1 }}
                                  value={item.cantidad}
                                  onChange={(e) =>
                                    cambiarEquipo(indiceGrupo, item.clave, () => ({
                                      cantidad: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  size="small"
                                  {...marca(item.cantidad, antes?.cantidad)}
                                />
                              </Grid>
                              <Grid item xs={4} md={1.5}>
                                <TextField
                                  label="Días"
                                  name={`${idEquipo}-dias`}
                                  type="number"
                                  inputProps={{ min: 1 }}
                                  value={item.dias}
                                  onChange={(e) =>
                                    cambiarEquipo(indiceGrupo, item.clave, () => ({
                                      dias: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  size="small"
                                  {...marca(item.dias, antes?.dias)}
                                />
                              </Grid>
                              <Grid item xs={4} md={2}>
                                <TextField
                                  label="Precio por día"
                                  name={`${idEquipo}-valor`}
                                  value={formatearMonedaInput(item.valor)}
                                  onChange={(e) =>
                                    cambiarEquipo(indiceGrupo, item.clave, () => ({
                                      valor: limpiarMonedaInput(e.target.value),
                                    }))
                                  }
                                  fullWidth
                                  size="small"
                                  {...marca(item.valor, antes?.valor, comoPlata)}
                                />
                              </Grid>
                              <Grid item xs={7} md={2.5}>
                                <TextField
                                  label="Fecha despacho"
                                  name={`${idEquipo}-fechaDespacho`}
                                  type="date"
                                  value={item.fechaDespacho}
                                  onChange={(e) =>
                                    cambiarEquipo(indiceGrupo, item.clave, () => ({
                                      fechaDespacho: e.target.value,
                                    }))
                                  }
                                  fullWidth
                                  size="small"
                                  InputLabelProps={{ shrink: true }}
                                  {...marca(item.fechaDespacho, antes?.fechaDespacho, comoFecha)}
                                />
                              </Grid>
                              <Grid item xs={5} md={12} sx={{ order: { md: 10 } }}>
                                <FormControlLabel
                                  sx={sxCasilla(item.aplicaIva, antes?.aplicaIva)}
                                  label="IVA (19%)"
                                  control={
                                    <Checkbox
                                      size="small"
                                      name={`${idEquipo}-iva`}
                                      checked={item.aplicaIva}
                                      onChange={(e) =>
                                        cambiarEquipo(indiceGrupo, item.clave, () => ({
                                          aplicaIva: e.target.checked,
                                        }))
                                      }
                                    />
                                  }
                                />
                                {antesDeCasilla(item.aplicaIva, antes?.aplicaIva)}
                              </Grid>
                            </Grid>

                            {lineaDeTiempo(grupo, item, idEquipo)}

                            {/* Lo que le pasó, en orden, y al final la
                                devolución, que es lo último que le pasa. */}
                            {item.hechos.map((hecho, posicion) =>
                              hecho.tipo === "devolucion"
                                ? null
                                : hechoCorregible(indiceGrupo, item, idEquipo, hecho, posicion),
                            )}

                            {devolucion && (
                              <Box
                                role="group"
                                aria-label="Devolución"
                                id={`${idEquipo}-devolucion`}
                                sx={{
                                  ...RECUADRO_HECHO,
                                  ...(devolucionAntes &&
                                    !igualQueAntes(devolucion, devolucionAntes) && {
                                      borderColor: "warning.main",
                                      bgcolor: alpha(theme.palette.warning.main, 0.06),
                                    }),
                                }}
                              >
                                {rotuloDeHecho("Devolución")}
                                <Grid container spacing={1.5} alignItems="center">
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      label="Fecha de devolución"
                                      name={`${idEquipo}-fechaDevolucion`}
                                      type="date"
                                      inputProps={{ max: hoy }}
                                      value={devolucion.fecha}
                                      onChange={(e) =>
                                        cambiarDevolucion(indiceGrupo, item.clave, () => ({
                                          fecha: e.target.value,
                                        }))
                                      }
                                      fullWidth
                                      size="small"
                                      InputLabelProps={{ shrink: true }}
                                      {...marca(devolucion.fecha, devolucionAntes?.fecha, comoFecha)}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    {campoPlata(
                                      "Descuento en los días vencidos",
                                      `${idEquipo}-descuentoVencidosDevolucion`,
                                      devolucion.descuentoVencidos,
                                      (valor) =>
                                        cambiarDevolucion(indiceGrupo, item.clave, () => ({
                                          descuentoVencidos: valor,
                                        })),
                                      devolucionAntes?.descuentoVencidos,
                                    )}
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <FormControlLabel
                                      sx={sxCasilla(
                                        devolucion.cobraElDia !== false,
                                        devolucionAntes && devolucionAntes.cobraElDia !== false,
                                      )}
                                      label="Cobrar el día de la devolución"
                                      control={
                                        <Checkbox
                                          size="small"
                                          name={`${idEquipo}-cobraElDia`}
                                          checked={devolucion.cobraElDia !== false}
                                          onChange={(e) =>
                                            cambiarDevolucion(indiceGrupo, item.clave, () => ({
                                              cobraElDia: e.target.checked,
                                            }))
                                          }
                                        />
                                      }
                                    />
                                    {antesDeCasilla(
                                      devolucion.cobraElDia !== false,
                                      devolucionAntes && devolucionAntes.cobraElDia !== false,
                                    )}
                                  </Grid>
                                  <Grid item xs={12} sm={volvioMal ? 4 : 8}>
                                    <FormControlLabel
                                      sx={sxCasilla(!volvioMal, volvioMalAntes === undefined ? undefined : !volvioMalAntes)}
                                      label="Volvió en buen estado"
                                      control={
                                        <Checkbox
                                          size="small"
                                          name={`${idEquipo}-buenEstado`}
                                          checked={!volvioMal}
                                          onChange={(e) =>
                                            cambiarEstadoDevolucion(
                                              indiceGrupo,
                                              item.clave,
                                              e.target.checked
                                                ? { buenEstado: true, motivo: "", valorRetenido: 0 }
                                                : { buenEstado: false },
                                            )
                                          }
                                        />
                                      }
                                    />
                                    {antesDeCasilla(!volvioMal, volvioMalAntes === undefined ? undefined : !volvioMalAntes)}
                                  </Grid>
                                  {volvioMal && (
                                    <>
                                      <Grid item xs={12} sm={5}>
                                        <TextField
                                          label="Qué le pasó"
                                          name={`${idEquipo}-motivo`}
                                          value={devolucion.devolucion?.motivo ?? ""}
                                          onChange={(e) =>
                                            cambiarEstadoDevolucion(indiceGrupo, item.clave, {
                                              motivo: e.target.value,
                                            })
                                          }
                                          fullWidth
                                          size="small"
                                          {...marca(
                                            devolucion.devolucion?.motivo ?? "",
                                            devolucionAntes && (devolucionAntes.devolucion?.motivo ?? ""),
                                          )}
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={3}>
                                        <TextField
                                          label="Se retiene del depósito"
                                          name={`${idEquipo}-retenido`}
                                          value={formatearMonedaInput(
                                            devolucion.devolucion?.valorRetenido || "",
                                          )}
                                          onChange={(e) =>
                                            cambiarEstadoDevolucion(indiceGrupo, item.clave, {
                                              valorRetenido:
                                                Number(limpiarMonedaInput(e.target.value)) || 0,
                                            })
                                          }
                                          fullWidth
                                          size="small"
                                          {...marca(
                                            devolucion.devolucion?.valorRetenido || 0,
                                            devolucionAntes && (devolucionAntes.devolucion?.valorRetenido || 0),
                                            comoPlata,
                                          )}
                                        />
                                      </Grid>
                                    </>
                                  )}
                                  <Grid item xs={12} sm={4}>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        cambiarDevolucion(indiceGrupo, item.clave, null)
                                      }
                                    >
                                      Quitar la devolución
                                    </Button>
                                  </Grid>
                                </Grid>
                              </Box>
                            )}
                          </Box>
                        );
                      })}

                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => agregarEquipo(indiceGrupo)}
                        sx={{
                          height: 48,
                          borderRadius: "12px",
                          border: "2px dashed",
                          borderColor: "divider",
                          color: acento,
                          fontWeight: 700,
                        }}
                      >
                        Agregar un equipo a este despacho
                      </Button>
                    </Stack>
                    )}
                  </Box>
                );
              })}


              {/* ── La plata de después ── Lo que el cliente abonó y lo que
                  se le devolvió o se cruzó a otras facturas. */}
              {hayPlata && (
                <Box
                  component="section"
                  id="corregir-seccion-plata"
                  aria-label="Abonos y devoluciones"
                  sx={tarjetaDe(colorAbonos)}
                >
                  {encabezado({
                    Icono: PaymentsIcon,
                    texto: "Abonos y descuentos",
                    detalle: "La plata que entró o salió después del despacho",
                    tono: colorAbonos,
                    plegable: { id: "corregir-seccion-plata", cambiada: seccionCambiada.plata },
                  })}
                  {!plegada("corregir-seccion-plata") && (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {borrador.abonos.map(filaAbono)}
                    {borrador.descuentos.map(filaDescuento)}
                    {borrador.entregas.map(filaEntrega)}
                  </Stack>
                  )}
                </Box>
              )}

              {/* Sin lugar para la columna derecha, todo lo suyo baja acá, antes
                  del historial: la pizarra, lo modificado y el índice. En el
                  celular el índice no: ahí cada sección se pliega sola. */}
              {!conPizarraAlLado && (
                <Stack spacing={2}>
                  {pizarra}
                  {loQueCambia}
                  {!esCompacta && indice(true)}
                </Stack>
              )}

              {/* ── El historial ── Al final: es para consultar, no para
                  llenar. Trae solo las correcciones —lo que cambió o quitó
                  algo ya escrito—, también las hechas por fuera de esta
                  pantalla. Un abono, una devolución o la mora de la
                  madrugada no salen. */}
              <Box
                component="section"
                id="corregir-seccion-historial"
                aria-label="Historial de correcciones"
                sx={tarjetaDe(colores.seccionDevuelto)}
              >
                {encabezado({
                  Icono: HistoryIcon,
                  texto: "Historial de correcciones",
                  detalle: "Solo lo que se corrigió; los abonos y devoluciones de todos los días no salen",
                  tono: colores.seccionDevuelto,
                  plegable: { id: "corregir-seccion-historial", cambiada: false },
                })}
                {!plegada("corregir-seccion-historial") && (
                <Box sx={{ mt: 2 }}>
                  {historial.estado === "cargando" && (
                    <Typography variant="body2" color="text.secondary">
                      Buscando el historial...
                    </Typography>
                  )}
                  {historial.estado === "error" && (
                    <Typography variant="body2" color="text.secondary">
                      No se pudo leer el historial de esta factura.
                    </Typography>
                  )}
                  {historial.estado === "listo" && historial.cambios.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Esta factura no tiene correcciones.
                    </Typography>
                  )}
                  {historial.cambios.map((cambio, posicion) => (
                    <Stack key={cambio.id} direction="row" gap={1.75}>
                      <Stack alignItems="center" sx={{ pt: 0.5 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            flexShrink: 0,
                            bgcolor: posicion === 0 ? acento : "divider",
                          }}
                        />
                        {posicion < historial.cambios.length - 1 && (
                          <Box sx={{ flex: 1, width: 2, bgcolor: "divider" }} />
                        )}
                      </Stack>
                      <Box sx={{ pb: 2, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {cuandoLegible(cambio.cuando)} ·{" "}
                          {autorLegible(cambio, historial.usuarios)}
                        </Typography>
                        {renglonesDe(cambio).map((renglon) => (
                          <Typography key={renglon} variant="body2" color="text.secondary">
                            · {renglon}
                          </Typography>
                        ))}
                      </Box>
                    </Stack>
                  ))}
                </Box>
                )}
              </Box>
            </Stack>

            {/* ── La pizarra, al lado y siempre a la vista ── */}
            {conPizarraAlLado && (
              <Stack
                spacing={2}
                component="aside"
                sx={{
                  flex: `0 0 ${ANCHO_PIZARRA}px`,
                  position: "sticky",
                  top: 0,
                  // Con el índice adentro puede pasar del alto de la pantalla.
                  // 142 = el encabezado (94) y el aire de arriba y abajo (24 + 24).
                  maxHeight: "calc(100dvh - 142px)",
                  overflowY: "auto",
                }}
              >
                {pizarra}
                {loQueCambia}
                {!conIndice && indice(true)}
              </Stack>
            )}
          </Box>
        </DialogContent>
        </Box>

        {/* En el celular y las pantallas pequeñas, de pie: cerrar y guardar
            abajo, en el pie, como en las demás vistas. */}
        {esCompacta && !acostado && (
          <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: 0.625 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {botonCerrar(BOTON_GRANDE)}
              {botonGuardar(BOTON_GRANDE)}
            </Stack>
          </Box>
        )}
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

CorregirFacturaDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onGuardado: PropTypes.func,
};
