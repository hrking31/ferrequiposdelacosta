import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import PagosMediosField from "./PagosMediosField";
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
import { autorLegible, cuandoLegible, describirCambio } from "./registroFactura";
import {
  ESTADO_FACTURA_INFO,
  MEDIO_DEPOSITO,
  MODOS_PAGO,
  abonosDe,
  calcularCuentaFactura,
  calcularEstadoFactura,
  datosFactura,
  entregasDe,
  formatearFechaLegible,
  formatearMonedaInput,
  gruposDe,
  limpiarMonedaInput,
  obtenerFechaHoyBogota,
} from "./facturaUtils";
import { formatearMoneda } from "../../Utils/formato";

const BORRADOR_VACIO = {
  numeroFactura: "",
  fechaCreacion: "",
  grupos: [],
  abonos: [],
  entregas: [],
};

// Las demás facturas del cliente —abiertas y cerradas—. Se leen solo si hacen
// falta: para un cruce que salió de esta factura, o al cambiarle el número.
const OTRAS_SIN_LEER = { estado: "sinLeer", facturas: [] };

const TIPOS_DE_PAGO = [
  { valor: "total", label: "Pago total" },
  { valor: "parcial", label: "Parcial" },
  { valor: "conAbono", label: "Pago con abono" },
  { valor: "sinPago", label: "Sin pago" },
];

const TRANSPORTES = ["Sin transporte", "Solo ida", "Solo vuelta", "Ida y vuelta"];

const mismoContenido = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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

// Cada hecho que se corrige va en su recuadro, con la raya a la izquierda que
// lo cuelga del equipo.
const RECUADRO_HECHO = {
  mt: 1.5,
  pl: 1.5,
  borderLeft: "2px solid",
  borderColor: "custom.itemBorder",
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
  // Vacío hasta que se abre con una factura: sin esto, el primer dibujo
  // compararía la factura contra un borrador en blanco y mostraría errores.
  const [cargado, setCargado] = useState(null);
  const borrador = cargado ?? BORRADOR_VACIO;
  const setBorrador = (cambio) =>
    setCargado((prev) => (typeof cambio === "function" ? cambio(prev ?? BORRADOR_VACIO) : cambio));
  const [guardando, setGuardando] = useState(false);
  // Los equipos que se agregan acá necesitan una clave que no choque con las
  // de los que ya estaban.
  const [nuevos, setNuevos] = useState(0);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    setCargado(open && factura ? borradorDe(factura) : null);
    setNuevos(0);
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
          // Del más nuevo al más viejo: lo último que pasó es lo que se
          // viene a mirar.
          cambios: datos(cambiosSnap).sort((a, b) => b.cuando - a.cuando),
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
          mismoContenido(entregasDe(a), entregasDe(b));
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

  const titulo = (texto) => (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "block", lineHeight: 1.6, mb: 1 }}
    >
      {texto}
    </Typography>
  );

  // Un renglón de "Así queda": el valor de antes y, si cambia, el de después.
  const renglonDeCuenta = (rotulo, antes, despues, clase = "fila") => (
    <Box className={clase}>
      <Typography variant="body2">{rotulo}</Typography>
      <Typography variant="body2" fontWeight={antes === despues ? undefined : "bold"}>
        {antes === despues ? antes : `${antes} → ${despues}`}
      </Typography>
    </Box>
  );

  // Las casillas que se repiten en cada hecho.
  const campoFecha = (label, name, valor, onCambio) => (
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
    />
  );

  const campoPlata = (label, name, valor, onCambio) => (
    <TextField
      label={label}
      name={name}
      value={formatearMonedaInput(valor || "")}
      onChange={(e) => onCambio(plataDe(e.target.value))}
      fullWidth
      size="small"
    />
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
    );

    switch (hecho.tipo) {
      case "ampliacion":
        return (
          <Box key={nombre} role="group" aria-label="Ampliación" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("Ampliación")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={7} sm={4}>
                {campoFecha("Fecha de la ampliación", `${nombre}-fecha`, hecho.fecha, (valor) =>
                  cambiar({ fecha: valor }),
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
          <Box key={nombre} role="group" aria-label="Entrega pactada" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("Entrega pactada")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                {campoFecha("Fecha del aviso", `${nombre}-fecha`, hecho.fecha, (valor) =>
                  cambiar({ fecha: valor }),
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
          <Box key={nombre} role="group" aria-label="No entregó" sx={RECUADRO_HECHO}>
            {rotuloDeHecho("No entregó lo pactado")}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={4}>
                {campoFecha("Fecha en que se anuló", `${nombre}-fecha`, hecho.fecha, (valor) =>
                  cambiar({ fecha: valor }),
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
          <Box key={nombre} role="group" aria-label="Cierre de mora" sx={RECUADRO_HECHO}>
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
  const campoMedio = (name, valor, onCambio) => (
    <FormControl fullWidth size="small">
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
            {campoFecha("Fecha", `${nombre}-fecha`, item.fecha, (valor) =>
              cambiarEnLista("abonos", posicion, { fecha: valor }),
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
              campoMedio(`${nombre}-medio`, item.medio, (valor) =>
                cambiarEnLista("abonos", posicion, { medio: valor }),
              )
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoPlata("Monto", `${nombre}-monto`, item.monto, (valor) =>
              cambiarEnLista("abonos", posicion, { monto: valor }),
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

  // LO DEVUELTO AL CLIENTE. El cruce va aparte: no salió plata, fue a otras
  // facturas, y se corrige cuánto llevó a cada una —las dos puntas juntas—.
  const filaEntrega = (item, posicion) => {
    const nombre = `corregir-entrega${posicion}`;
    const fecha = formatearFechaLegible(item.original.fecha);
    const destinos = (item.original.haciaFacturas ?? []).join(", ");

    if (item.partes === null) {
      return nota(nombre, `Cruce del ${fecha}: buscando las facturas a las que fue...`);
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
              {campoFecha("Fecha", `${nombre}-fecha`, item.fecha, (valor) =>
                cambiarEnLista("entregas", posicion, { fecha: valor }),
              )}
            </Grid>
            {item.partes.map((parte, indiceParte) => (
              <Grid item xs={12} sm={3} key={parte.facturaId}>
                {campoPlata(
                  `A la factura ${parte.numero}`,
                  `${nombre}-parte${indiceParte}`,
                  parte.monto,
                  (valor) => cambiarParteDelCruce(posicion, indiceParte, valor),
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
            {campoFecha("Fecha", `${nombre}-fecha`, item.fecha, (valor) =>
              cambiarEnLista("entregas", posicion, { fecha: valor }),
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoMedio(`${nombre}-medio`, item.medio, (valor) =>
              cambiarEnLista("entregas", posicion, { medio: valor }),
            )}
          </Grid>
          <Grid item xs={6} sm={3}>
            {campoPlata("Monto", `${nombre}-monto`, item.monto, (valor) =>
              cambiarEnLista("entregas", posicion, { monto: valor }),
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

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullScreen>
        <DialogTitle sx={{ color: acento }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Box>
              Corregir factura {datosFactura(factura).numeroFactura ?? ""}
              <Typography variant="body2" color="text.secondary">
                Solo se guarda lo que cambies. Los días vencidos se recalculan solos.
              </Typography>
            </Box>
            <Tooltip title="Cerrar sin guardar">
              <span>
                <IconButton aria-label="Cerrar" onClick={handleCerrar} disabled={guardando}>
                  <CloseIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Container maxWidth="md" disableGutters>
            <Stack spacing={3} sx={{ mt: 0.5 }}>
              {/* ── La factura ── */}
              <Box>
                {titulo("Factura")}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="N° de factura"
                      name="numeroFactura"
                      value={borrador.numeroFactura}
                      onChange={(e) =>
                        setBorrador((prev) => ({ ...prev, numeroFactura: e.target.value }))
                      }
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Fecha creación"
                      name="fechaCreacion"
                      type="date"
                      value={borrador.fechaCreacion}
                      onChange={(e) =>
                        setBorrador((prev) => ({ ...prev, fechaCreacion: e.target.value }))
                      }
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* ── Cada despacho, con su plata y sus equipos ── */}
              {borrador.grupos.map((grupo, indiceGrupo) => {
                const idGrupo = `corregir-${grupo.grupo}`;
                const sinTransporte =
                  !grupo.transporte || grupo.transporte === "Sin transporte";
                return (
                  <Paper
                    key={grupo.grupo}
                    variant="outlined"
                    component="section"
                    aria-label={nombreDelGrupo(grupo.grupo)}
                    sx={{ p: 2, borderColor: "custom.itemBorder" }}
                  >
                    {titulo(nombreDelGrupo(grupo.grupo))}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
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
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
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
                        </FormControl>
                      </Grid>
                      {/* Acá el monto se escribe a mano, sin repartos
                          automáticos: se está corrigiendo lo que se pagó, no
                          cobrando una factura nueva. */}
                      {grupo.tipoPago !== "sinPago" && (
                        <Grid item xs={12} sm={6}>
                          <PagosMediosField
                            pagos={grupo.pagos}
                            onChange={(pagos) => cambiarGrupo(indiceGrupo, () => ({ pagos }))}
                            idPrefix={`${idGrupo}-pago`}
                            apilado
                          />
                        </Grid>
                      )}
                    </Grid>

                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      {grupo.equipos.map((item) => {
                        const idEquipo = `${idGrupo}-${item.clave}`;
                        const devolucion = item.hechos.find(({ tipo }) => tipo === "devolucion");
                        const volvioMal = devolucion?.devolucion?.buenEstado === false;
                        return (
                          <Box
                            key={item.clave}
                            role="group"
                            aria-label={`Equipo ${item.nombre || "nuevo"}`}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "custom.itemBorder",
                            }}
                          >
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item xs={10} sm={5}>
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
                                />
                              </Grid>
                              <Grid
                                item
                                xs={2}
                                sm={1}
                                sx={{ order: { sm: 7 }, textAlign: "right" }}
                              >
                                <Tooltip title="Quitar este equipo de la factura">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label="Quitar equipo"
                                    onClick={() => quitarEquipo(indiceGrupo, item.clave)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Grid>
                              <Grid item xs={4} sm={2}>
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
                                />
                              </Grid>
                              <Grid item xs={4} sm={2}>
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
                                />
                              </Grid>
                              <Grid item xs={4} sm={2}>
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
                                />
                              </Grid>
                              <Grid item xs={7} sm={4} sx={{ order: { sm: 8 } }}>
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
                                />
                              </Grid>
                              <Grid item xs={5} sm={3} sx={{ order: { sm: 9 } }}>
                                <FormControlLabel
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
                              </Grid>
                            </Grid>

                            {/* Lo que le pasó, en orden, y al final la
                                devolución, que es lo último que le pasa. */}
                            {item.hechos.map((hecho, posicion) =>
                              hecho.tipo === "devolucion"
                                ? null
                                : hechoCorregible(indiceGrupo, item, idEquipo, hecho, posicion),
                            )}

                            {devolucion && (
                              <Box role="group" aria-label="Devolución" sx={RECUADRO_HECHO}>
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
                                    )}
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <FormControlLabel
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
                                  </Grid>
                                  <Grid item xs={12} sm={volvioMal ? 4 : 8}>
                                    <FormControlLabel
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
                                        />
                                      </Grid>
                                    </>
                                  )}
                                  <Grid item xs={12} sm={4}>
                                    <Button
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

                      <Box>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => agregarEquipo(indiceGrupo)}
                        >
                          Agregar un equipo a este despacho
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}

              {/* ── La plata de después ── Lo que el cliente abonó y lo que
                  se le devolvió o se cruzó a otras facturas. */}
              {(borrador.abonos.length > 0 || borrador.entregas.length > 0) && (
                <Paper
                  variant="outlined"
                  component="section"
                  aria-label="Abonos y devoluciones"
                  sx={{ p: 2, borderColor: "custom.itemBorder" }}
                >
                  {titulo("Abonos y devoluciones")}
                  <Stack spacing={1}>
                    {borrador.abonos.map(filaAbono)}
                    {borrador.entregas.map(filaEntrega)}
                  </Stack>
                </Paper>
              )}

              {/* ── Así queda ── La cuenta de antes y la de después, antes
                  de escribir nada. */}
              {cuentaAntes && (
                <Box>
                  {titulo(cuentaDespues ? "Así queda" : "La cuenta de hoy")}
                  <Paper variant="totales" aria-label="Así queda">
                    {renglonDeCuenta(
                      "Estado",
                      estadoDe(factura),
                      documento ? estadoDe(documento) : estadoDe(factura),
                    )}
                    {renglonDeCuenta(
                      "Días vencidos",
                      formatearMoneda(cuentaAntes.netoVencido),
                      formatearMoneda((cuentaDespues ?? cuentaAntes).netoVencido),
                    )}
                    {renglonDeCuenta(
                      "Total",
                      formatearMoneda(cuentaAntes.total),
                      formatearMoneda((cuentaDespues ?? cuentaAntes).total),
                    )}
                    {renglonDeCuenta(
                      "Saldo pendiente",
                      formatearMoneda(cuentaAntes.saldoPendiente),
                      formatearMoneda((cuentaDespues ?? cuentaAntes).saldoPendiente),
                    )}
                    {renglonDeCuenta(
                      "Por devolverle al cliente",
                      formatearMoneda(cuentaAntes.aDevolver),
                      formatearMoneda((cuentaDespues ?? cuentaAntes).aDevolver),
                    )}
                  </Paper>
                </Box>
              )}

              {errores.length > 0 && (
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
              )}

              {corregida && (
                <Alert severity="warning">
                  Las cuentas de cobro y los reportes que se descargaron antes de este
                  cambio ya no valen: hay que emitirlos de nuevo.
                </Alert>
              )}

              {/* ── El historial ── Al final: es para consultar, no para
                  llenar. Trae TODO lo que le pasó a la factura, no solo lo
                  corregido desde acá: un abono, una devolución, la mora que
                  abrió la madrugada. */}
              <Box component="section" aria-label="Historial de cambios">
                {titulo("Historial de cambios")}
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
                    Todavía no hay cambios anotados para esta factura.
                  </Typography>
                )}
                <Stack spacing={1.5}>
                  {historial.cambios.map((cambio) => (
                    <Box key={cambio.id}>
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
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Container>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* Apagado hasta que haya algo corregido y sin errores. */}
          <Button
            variant="contained"
            color="success"
            onClick={handleGuardar}
            disabled={guardando || !corregida}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
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
