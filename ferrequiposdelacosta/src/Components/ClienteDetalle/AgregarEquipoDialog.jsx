import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Autocomplete,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Stack,
  Paper,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import { doc, updateDoc } from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { db } from "../Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import {
  obtenerFechaInicialEfectiva,
  calcularFechaDevolucion,
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearFechaLegible,
  calcularAmpliacionFactura,
  sumarAbonos,
  separarExcedentePago,
} from "./facturaUtils";
import PagosMediosField from "./PagosMediosField";

// Datos que comparten todos los equipos que se agregan juntos: la fecha en que
// el cliente pidió los equipos, el IVA, y un único transporte, depósito y pago
// para todo el lote.
const ESTADO_INICIAL = {
  fechaSolicitud: "",
  transporte: "",
  valorTransporte: "",
  deposito: "",
  aplicaIva: true,
  tipoPago: "total",
  pagos: [],
};

// Lo que se escribe para cada equipo antes de sumarlo a la lista. Cada uno
// lleva su propia fecha de despacho: pueden salir en días distintos aunque se
// hayan pedido todos juntos.
const ESTADO_INICIAL_ITEM = {
  nombre: "",
  cantidad: "",
  dias: "",
  valor: "",
  fechaDespacho: "",
};

const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const subtotalDeItem = (item) =>
  (Number(item?.cantidad) || 0) * (Number(item?.dias) || 0) * (Number(item?.valor) || 0);

export default function AgregarEquipoDialog({ open, onClose, cliente, factura, onAgregado }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const acento = theme.palette.custom.accent;
  const equiposCatalogo = useSelector((state) => state.equipos.equipos);
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [nuevoItem, setNuevoItem] = useState(ESTADO_INICIAL_ITEM);
  const [equiposNuevos, setEquiposNuevos] = useState([]);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (equiposCatalogo.length === 0) {
      dispatch(fetchEquiposData());
    }
  }, [equiposCatalogo.length, dispatch]);

  useEffect(() => {
    if (!open) return;
    const fechaSolicitud = obtenerFechaInicialEfectiva();
    setForm({
      ...ESTADO_INICIAL,
      fechaSolicitud,
      // Si la factura ya tenía IVA, se sigue aplicando por defecto al agregar.
      aplicaIva: factura?.aplicaIva ?? true,
    });
    // El despacho arranca en la misma fecha de la solicitud; se cambia solo si
    // ese equipo sale otro día.
    setNuevoItem({ ...ESTADO_INICIAL_ITEM, fechaDespacho: fechaSolicitud });
    setEquiposNuevos([]);
    setErrors({});
  }, [open, factura]);

  const nombresEquiposCatalogo = equiposCatalogo.map((equipo) => equipo.name);

  // Cuándo tiene que devolver el equipo que se está cargando: sale sola de la
  // fecha de despacho más los días. No se digita.
  const fechaEntregaNuevoItem =
    nuevoItem.fechaDespacho && Number(nuevoItem.dias) > 0
      ? calcularFechaDevolucion(nuevoItem.fechaDespacho, Number(nuevoItem.dias))
      : "";

  // Subtotal de cada equipo = cantidad × días × precio por día (igual que en
  // Crear Factura); el del lote es la suma de todos los que estén en la lista.
  const subtotalNuevoEquipo = equiposNuevos.reduce(
    (total, item) => total + subtotalDeItem(item),
    0,
  );
  const ivaNuevoEquipo = form.aplicaIva ? subtotalNuevoEquipo * 0.19 : 0;
  const valorTransporteNuevo = Number(form.valorTransporte) || 0;
  const depositoNuevo = Number(form.deposito) || 0;
  // Lo que cuesta agregar estos equipos (antes de sumarlos a la factura).
  const totalEsteEquipo = subtotalNuevoEquipo + ivaNuevoEquipo + valorTransporteNuevo + depositoNuevo;

  const nuevoSubtotal = (Number(factura?.subtotal) || 0) + subtotalNuevoEquipo;
  // El IVA se ACUMULA: al que la factura ya tenía se le suma solo el de este
  // equipo. Antes se recalculaba sobre el subtotal completo con la casilla de
  // acá, así que destildarla le borraba el IVA a los equipos que sí lo
  // llevaban (y marcarla se lo cobraba a los que no).
  const ivaFacturaActual = Number(factura?.iva) || 0;
  const nuevoIva = ivaFacturaActual + ivaNuevoEquipo;
  // La factura queda marcada "con IVA" si ya lo llevaba o si este equipo lo
  // lleva: agregar un equipo sin IVA no convierte a toda la factura en exenta.
  const facturaLlevaIva = factura?.aplicaIva ?? ivaFacturaActual > 0;
  const nuevoAplicaIva = facturaLlevaIva || form.aplicaIva;

  // Depósito/transporte del lote original (factura.deposito/valorTransporte
  // ya no crecen acá: quedan fijos como el pago original) + lo que ya traían
  // los equipos agregados antes + lo que se suma ahora con este equipo.
  const equiposAgregadosExistentes = (factura?.equipos || []).filter(
    (equipo) => equipo?.agregadoPosteriormente,
  );
  const depositoTotalExistente =
    (Number(factura?.deposito) || 0) +
    equiposAgregadosExistentes.reduce((total, equipo) => total + (Number(equipo.deposito) || 0), 0);
  const transporteTotalExistente =
    (Number(factura?.valorTransporte) || 0) +
    equiposAgregadosExistentes.reduce(
      (total, equipo) => total + (Number(equipo.valorTransporte) || 0),
      0,
    );

  const nuevoDepositoTotal = depositoTotalExistente + depositoNuevo;
  const nuevoTransporteTotal = transporteTotalExistente + valorTransporteNuevo;
  const nuevoValorTotal = nuevoSubtotal + nuevoIva + nuevoTransporteTotal + nuevoDepositoTotal;

  // Solo cuenta como pago el renglón que tenga medio Y monto: son los mismos
  // que se guardan, así lo que muestra el diálogo no puede diferir de lo que
  // termina en la factura.
  const pagosValidos = form.pagos.filter((pago) => pago.medio && Number(pago.monto) > 0);
  // Lo pagado por estos equipos es la suma de sus medios de pago (uno o
  // varios). Se acumula sobre lo que la factura ya tenía pagado — no lo
  // reemplaza, para no perder pagos previos registrados.
  const pagoEsteEquipo = pagosValidos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
  const nuevoMontoPagado = (Number(factura?.montoPagado) || 0) + pagoEsteEquipo;
  // Los abonos ya registrados también cuentan para el saldo: sin esto, agregar
  // un equipo los borraría de la cuenta y reaparecería una deuda ya pagada.
  // (El saldo definitivo se calcula al guardar, porque ahí puede sumarse un
  // abono nuevo con lo que se haya pagado de más.)
  const totalAbonos = sumarAbonos(factura?.abonos);

  // ── Lo que se MUESTRA vs. lo que se GUARDA ─────────────────────────────
  //
  // Los valores de arriba son los que se escriben en la factura, y NO llevan
  // los días ampliados: esos días todavía no están facturados, así que si se
  // guardaran acá quedarían cobrados y el cálculo de ampliaciones los volvería
  // a sumar encima.
  //
  // Pero para mostrar hay que partir del total que hoy se ve en la factura,
  // que sí los incluye; si no, este diálogo diría un total y la pantalla de
  // atrás otro distinto.
  const ampliacionFactura = calcularAmpliacionFactura(factura);
  const totalActualMostrado = ampliacionFactura.hay
    ? ampliacionFactura.nuevoTotal
    : Number(factura?.valorTotal) || 0;
  const totalConEstosEquipos = totalActualMostrado + totalEsteEquipo;
  const saldoMostrado = Math.max(
    0,
    totalConEstosEquipos - nuevoMontoPagado - totalAbonos,
  );

  // Con "Total de estos equipos" el monto se completa solo: es todo lo que
  // hay que cobrar (subtotal + IVA + transporte + depósito). Si el pago se
  // reparte en varios medios, el primero toma lo que falte para llegar al
  // total y los demás quedan como se escribieron.
  useEffect(() => {
    if (form.tipoPago !== "total") return;
    setForm((prev) => {
      if (prev.tipoPago !== "total") return prev;
      const otrosMedios = prev.pagos
        .slice(1)
        .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
      const restante = Math.max(0, Math.round(totalEsteEquipo - otrosMedios));
      const primero = prev.pagos[0] || { medio: "", monto: "" };
      // Sin esta guarda el estado se volvería a escribir en cada render.
      if (Number(primero.monto) === restante) return prev;
      return { ...prev, pagos: [{ ...primero, monto: restante }, ...prev.pagos.slice(1)] };
    });
  }, [form.tipoPago, form.pagos, totalEsteEquipo]);

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const handleChangeMoneda = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: limpiarMonedaInput(e.target.value) }));
  };

  const handleChangeTransporte = (e) => {
    const valor = e.target.value;
    setForm((prev) => ({
      ...prev,
      transporte: valor,
      valorTransporte: valor === "Sin transporte" ? "" : prev.valorTransporte,
    }));
  };

  // Al pasar a "Parcial" los montos se borran para que el usuario escriba lo
  // que realmente se está pagando. Al volver a "Total" se vuelven a llenar
  // solos (lo hace el efecto de más abajo).
  const handleCambiarTipoPago = (e) => {
    const tipoPago = e.target.value;
    setForm((prev) => {
      // "Sin pago" borra los medios cargados: si quedaran, se seguirían
      // sumando aunque el desplegable diga que no se pagó nada.
      if (tipoPago === "sinPago") return { ...prev, tipoPago, pagos: [] };
      // "Parcial" y "Pago con abono" arrancan con el monto en blanco: en los
      // dos casos el valor lo escribe el usuario, no sale del total.
      const seEscribeAMano = tipoPago === "parcial" || tipoPago === "conAbono";
      return {
        ...prev,
        tipoPago,
        pagos: seEscribeAMano
          ? prev.pagos.map((pago) => ({ ...pago, monto: "" }))
          : prev.pagos,
      };
    });
  };

  const handleChangePagos = (nuevosPagos) => {
    setForm((prev) => {
      // Con "Pago con abono" los montos se escriben libres: no se reparten
      // para cuadrar con el total, justamente porque van por encima de él.
      if (prev.tipoPago === "conAbono") return { ...prev, pagos: nuevosPagos };

      const anteriores = prev.pagos.length > 0 ? prev.pagos : [{ medio: "", monto: "" }];
      const sumar = (pagos) =>
        pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);

      // Se borró un medio de pago y quedó uno solo: se le pasa todo lo que
      // había repartido, para no perder plata por el camino.
      if (nuevosPagos.length === 1 && anteriores.length > 1) {
        return {
          ...prev,
          pagos: [{ ...nuevosPagos[0], monto: Math.round(sumar(anteriores)) }],
        };
      }

      // Se sumó otro medio de pago: arranca con lo que falte para el total.
      if (nuevosPagos.length > anteriores.length) {
        const faltante = Math.max(0, Math.round(totalEsteEquipo - sumar(anteriores)));
        return {
          ...prev,
          pagos: nuevosPagos.map((pago, i) =>
            i === nuevosPagos.length - 1 ? { ...pago, monto: faltante } : pago,
          ),
        };
      }

      // Se cambió un monto y hay más de un medio: otro absorbe la diferencia
      // para que entre todos siempre sumen el total. Se recalcula en cada
      // tecla, si no el reparto quedaría fijado con el primer dígito escrito.
      const indiceEditado = nuevosPagos.findIndex(
        (pago, i) => String(pago.monto ?? "") !== String(anteriores[i]?.monto ?? ""),
      );
      if (indiceEditado >= 0 && nuevosPagos.length > 1) {
        const indiceAbsorbe = indiceEditado === nuevosPagos.length - 1 ? 0 : nuevosPagos.length - 1;
        const otros = nuevosPagos.reduce(
          (total, pago, i) =>
            i === indiceEditado || i === indiceAbsorbe ? total : total + (Number(pago.monto) || 0),
          0,
        );
        const restante = Math.max(
          0,
          Math.round(totalEsteEquipo - (Number(nuevosPagos[indiceEditado].monto) || 0) - otros),
        );
        return {
          ...prev,
          pagos: nuevosPagos.map((pago, i) =>
            i === indiceAbsorbe ? { ...pago, monto: restante } : pago,
          ),
        };
      }

      return { ...prev, pagos: nuevosPagos };
    });
  };

  const handleChangeItem = (campo) => (e) => {
    setNuevoItem((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  // Suma el equipo escrito arriba a la lista del lote y deja los campos
  // limpios para cargar el siguiente.
  const handleAgregarItem = () => {
    const nombre = nuevoItem.nombre.trim();
    const errores = {};
    if (!nombre) errores.nombre = "Elegí o escribí un equipo.";
    if (!Number(nuevoItem.cantidad)) errores.cantidad = "Cantidad inválida.";
    if (!Number(nuevoItem.dias)) errores.dias = "Días inválidos.";
    if (!Number(nuevoItem.valor)) errores.valor = "El valor debe ser mayor a 0.";
    if (!nuevoItem.fechaDespacho) errores.fechaDespacho = "Este campo es obligatorio.";

    setErrors(errores);
    if (Object.keys(errores).length > 0) return;

    setEquiposNuevos((prev) => [
      ...prev,
      {
        nombre,
        cantidad: Number(nuevoItem.cantidad),
        dias: Number(nuevoItem.dias),
        valor: Number(nuevoItem.valor),
        fechaDespacho: nuevoItem.fechaDespacho,
      },
    ]);
    // El siguiente equipo arranca con la misma fecha de despacho: lo normal es
    // que salgan juntos, y si no se cambia a mano.
    setNuevoItem({ ...ESTADO_INICIAL_ITEM, fechaDespacho: nuevoItem.fechaDespacho });
  };

  const handleQuitarItem = (index) => {
    setEquiposNuevos((prev) => prev.filter((_item, i) => i !== index));
  };

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const validar = () => {
    const errores = {};
    if (equiposNuevos.length === 0) {
      errores.equipos = "Agregá al menos un equipo a la lista.";
    }
    if (!form.fechaSolicitud) errores.fechaSolicitud = "Este campo es obligatorio.";

    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleAgregar = async () => {
    if (!validar()) return;

    // El transporte, el depósito y el pago son del lote completo, así que se
    // guardan una sola vez, en el primer equipo. Los demás quedan sin esos
    // campos para no contar el mismo monto varias veces al sumar la factura.
    // Marca a los equipos que se guardan juntos, para poder mostrarlos
    // después como un solo grupo con su pago y sus adicionales.
    const loteId = `lote-${Date.now()}`;

    // Lo que se entregó de más no se guarda como pago del lote: se convierte
    // en un abono de la factura, con la fecha de solicitud de estos equipos.
    const { pagos: pagosGuardados, excedente, medio: medioExcedente } =
      separarExcedentePago(form.pagos, totalEsteEquipo);

    const abonos =
      excedente > 0
        ? [
            ...(factura?.abonos || []),
            { fecha: form.fechaSolicitud, medio: medioExcedente, monto: excedente },
          ]
        : factura?.abonos || [];

    const pagadoEnLote = pagosGuardados.reduce((total, pago) => total + pago.monto, 0);
    const montoPagadoFinal = (Number(factura?.montoPagado) || 0) + pagadoEnLote;
    const saldoFinal = Math.max(
      0,
      nuevoValorTotal - montoPagadoFinal - sumarAbonos(abonos),
    );

    const nuevosEquipos = equiposNuevos.map((item, index) => {
      const equipo = {
        nombre: item.nombre,
        cantidad: item.cantidad,
        dias: item.dias,
        valor: item.valor,
        fechaDespacho: item.fechaDespacho,
        fechaVencimiento: calcularFechaDevolucion(item.fechaDespacho, item.dias),
        // Cuándo se pidió el equipo. Es del lote entero y se muestra en la
        // factura al lado del nombre ("agregado el ..."), para distinguirlo de
        // la fecha en que salió despachado.
        fechaAgregado: form.fechaSolicitud,
        // Marca que este equipo se sumó después de crear la factura (no en el
        // alta original), para poder diferenciarlo en el historial.
        agregadoPosteriormente: true,
        loteId,
        // Cada equipo guarda si lleva IVA o no. Así una factura puede tener
        // equipos con IVA y sin IVA sin que uno le pise el cálculo al otro.
        aplicaIva: form.aplicaIva,
      };

      if (index === 0) {
        equipo.tipoPago = form.tipoPago;
        equipo.pagos = pagosGuardados;
        if (form.transporte && form.transporte !== "Sin transporte") {
          equipo.transporte = form.transporte;
          equipo.valorTransporte = valorTransporteNuevo;
        }
        if (depositoNuevo > 0) {
          equipo.deposito = depositoNuevo;
        }
      }

      return equipo;
    });

    setGuardando(true);
    try {
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        equipos: [...(factura.equipos || []), ...nuevosEquipos],
        subtotal: nuevoSubtotal,
        iva: nuevoIva,
        aplicaIva: nuevoAplicaIva,
        valorTotal: nuevoValorTotal,
        saldoPendiente: saldoFinal,
        montoPagado: montoPagadoFinal,
        abonos,
        // El estado de pago de la factura sale de si queda saldo pendiente o no,
        // ya no de lo que se elija acá (eso es solo el pago de este equipo puntual).
        tipoPago: saldoFinal > 0 ? "parcial" : "total",
      });

      showSnackbar(
        nuevosEquipos.length === 1
          ? "Equipo agregado a la factura."
          : `${nuevosEquipos.length} equipos agregados a la factura.`,
        "success",
      );
      onAgregado?.();
      onClose();
    } catch (error) {
      showSnackbar(`Error al agregar el equipo: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: acento }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
            <span>Agregar equipo</span>
            {factura && (
              // Marca de agua: se lee si se busca, pero no compite con el
              // título ni con los campos. La transparencia funciona igual en
              // modo claro y oscuro porque hereda el color del texto.
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  opacity: 0.35,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Factura {factura.numeroFactura ?? "s/n"}
              </Typography>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* La fecha en que se pidió y el equipo, en el mismo renglón. */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de solicitud"
                type="date"
                value={form.fechaSolicitud}
                onChange={handleChange("fechaSolicitud")}
                error={!!errors.fechaSolicitud}
                helperText={errors.fechaSolicitud}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                fullWidth
                options={nombresEquiposCatalogo}
                inputValue={nuevoItem.nombre}
                onInputChange={(_e, valor) =>
                  setNuevoItem((prev) => ({ ...prev, nombre: valor }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Equipo (del catálogo o nuevo)"
                    error={!!errors.nombre}
                    helperText={errors.nombre}
                    autoFocus
                  />
                )}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Cantidad"
                type="number"
                inputProps={{ min: 1 }}
                value={nuevoItem.cantidad}
                onChange={handleChangeItem("cantidad")}
                error={!!errors.cantidad}
                helperText={errors.cantidad}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Días"
                type="number"
                inputProps={{ min: 1 }}
                value={nuevoItem.dias}
                onChange={handleChangeItem("dias")}
                error={!!errors.dias}
                helperText={errors.dias}
                fullWidth
              />
            </Grid>

            {/* El precio y la fecha en que sale ESTE equipo. La de despacho es
                la que manda para calcular el vencimiento. */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio por día"
                value={formatearMonedaInput(nuevoItem.valor)}
                onChange={(e) =>
                  setNuevoItem((prev) => ({ ...prev, valor: limpiarMonedaInput(e.target.value) }))
                }
                error={!!errors.valor}
                helperText={errors.valor}
                fullWidth
              />
            </Grid>

            <Grid item xs={8} sm={4}>
              <TextField
                label="Fecha despacho"
                type="date"
                value={nuevoItem.fechaDespacho}
                onChange={handleChangeItem("fechaDespacho")}
                error={!!errors.fechaDespacho}
                helperText={errors.fechaDespacho}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* La entrega no se digita: sale de la fecha de despacho más los
                días. Va como marca de agua —se lee si se busca, pero no
                parece un campo más para llenar. */}
            <Grid
              item
              xs={4}
              sm={2}
              sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}
            >
              {fechaEntregaNuevoItem && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    opacity: 0.35,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    userSelect: "none",
                    lineHeight: 1.3,
                    textAlign: "right",
                  }}
                >
                  Entrega {formatearFechaLegible(fechaEntregaNuevoItem)}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="accent"
                fullWidth
                onClick={handleAgregarItem}
              >
                Agregar equipo
              </Button>
            </Grid>

            {errors.equipos && (
              <Grid item xs={12}>
                <Typography variant="caption" color="error">
                  {errors.equipos}
                </Typography>
              </Grid>
            )}

            {/* Los equipos ya cargados en este lote. Cada uno en su recuadro,
                con el bote para sacarlo si se cargó por error. */}
            {equiposNuevos.map((item, index) => {
              const vencimiento = calcularFechaDevolucion(item.fechaDespacho, item.dias);
              return (
                <Grid item xs={12} key={`${item.nombre}-${index}`}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "custom.itemBorder",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {item.nombre}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {item.cantidad} unidad(es) · {item.dias} día(s) ·{" "}
                        {formatearMoneda(item.valor)}/día c/u · despacho{" "}
                        {formatearFechaLegible(item.fechaDespacho)}
                        {vencimiento && ` · vence ${formatearFechaLegible(vencimiento)}`}
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">
                        Subtotal: {formatearMoneda(subtotalDeItem(item))}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleQuitarItem(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              );
            })}

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                label="IVA (19%)"
                control={
                  <Checkbox
                    checked={form.aplicaIva}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, aplicaIva: e.target.checked }))
                    }
                  />
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel
                  id="agregar-equipo-transporte-label"
                  htmlFor="agregar-equipo-transporte-input"
                >
                  Transporte adicional
                </InputLabel>
                <Select
                  labelId="agregar-equipo-transporte-label"
                  inputProps={{ id: "agregar-equipo-transporte-input" }}
                  label="Transporte adicional"
                  value={form.transporte}
                  onChange={handleChangeTransporte}
                >
                  <MenuItem value="Sin transporte">Sin transporte</MenuItem>
                  <MenuItem value="Solo ida">Solo ida</MenuItem>
                  <MenuItem value="Solo vuelta">Solo vuelta</MenuItem>
                  <MenuItem value="Ida y vuelta">Ida y vuelta</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor transporte"
                value={formatearMonedaInput(form.valorTransporte)}
                onChange={handleChangeMoneda("valorTransporte")}
                disabled={!form.transporte || form.transporte === "Sin transporte"}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Depósito adicional"
                value={formatearMonedaInput(form.deposito)}
                onChange={handleChangeMoneda("deposito")}
                fullWidth
              />
            </Grid>

            {/* La pizarra con lo que se está agregando, para saber cuánto se
                le va a cobrar al cliente antes de registrar el pago. El
                aspecto lo pone el tema (variant "totales"); acá solo van las
                filas. */}
            <Grid item xs={12}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.6 }}
              >
                Total equipos agregados
              </Typography>
              <Paper variant="totales">
                <Box className="fila">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">
                    {formatearMoneda(subtotalNuevoEquipo)}
                  </Typography>
                </Box>

                {form.aplicaIva && (
                  <Box className="fila">
                    <Typography variant="body2">IVA (19%)</Typography>
                    <Typography variant="body2">{formatearMoneda(ivaNuevoEquipo)}</Typography>
                  </Box>
                )}

                {depositoNuevo > 0 && (
                  <Box className="fila">
                    <Typography variant="body2">Depósito</Typography>
                    <Typography variant="body2">{formatearMoneda(depositoNuevo)}</Typography>
                  </Box>
                )}

                {valorTransporteNuevo > 0 && (
                  <Box className="fila">
                    <Typography variant="body2">Transporte</Typography>
                    <Typography variant="body2">
                      {formatearMoneda(valorTransporteNuevo)}
                    </Typography>
                  </Box>
                )}

                <Box className="fila total">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatearMoneda(totalEsteEquipo)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Izquierda: cómo se paga. Derecha: el resultado de esa carga,
                para que se vea de inmediato qué se está registrando. */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="agregar-equipo-tipopago-label" htmlFor="agregar-equipo-tipopago-input">
                  Pago de estos equipos
                </InputLabel>
                <Select
                  labelId="agregar-equipo-tipopago-label"
                  inputProps={{ id: "agregar-equipo-tipopago-input" }}
                  label="Pago de estos equipos"
                  value={form.tipoPago}
                  onChange={handleCambiarTipoPago}
                >
                  <MenuItem value="total">Total de estos equipos</MenuItem>
                  <MenuItem value="parcial">Parcial de estos equipos</MenuItem>
                  <MenuItem value="conAbono">Pago con abono</MenuItem>
                  <MenuItem value="sinPago">Sin pago</MenuItem>
                </Select>
              </FormControl>

              {form.tipoPago !== "sinPago" && (
                <Box sx={{ mt: 2 }}>
                  <PagosMediosField
                    pagos={form.pagos}
                    onChange={handleChangePagos}
                    idPrefix="agregar-equipo-pago"
                    apilado
                  />
                </Box>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  lineHeight: 1.6,
                }}
              >
                <PaymentsIcon fontSize="small" />
                {form.tipoPago === "total"
                  ? "Pago total"
                  : form.tipoPago === "parcial"
                    ? "Pago parcial"
                    : form.tipoPago === "conAbono"
                      ? "Pago con abono"
                      : "Sin pago"}
              </Typography>
              <Paper variant="totales">
                {pagosValidos.length === 0 ? (
                  <Box className="fila">
                    <Typography variant="body2">Sin pago cargado</Typography>
                    <Typography variant="body2">{formatearMoneda(0)}</Typography>
                  </Box>
                ) : (
                  pagosValidos.map((pago, index) => (
                    <Box className="fila" key={`${pago.medio}-${index}`}>
                      <Typography variant="body2">{pago.medio}</Typography>
                      <Typography variant="body2">{formatearMoneda(pago.monto)}</Typography>
                    </Box>
                  ))
                )}

                <Box className="fila total pagado">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Pagado
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatearMoneda(pagoEsteEquipo)}
                  </Typography>
                </Box>

                {/* Cuando se recibió de más, se separa lo que cubre estos
                    equipos de lo que se va a guardar como abono. */}
                {pagoEsteEquipo > totalEsteEquipo && (
                  <>
                    <Box className="fila">
                      <Typography variant="body2">Cubre estos equipos</Typography>
                      <Typography variant="body2">{formatearMoneda(totalEsteEquipo)}</Typography>
                    </Box>
                    <Box className="fila abono">
                      <Typography variant="body2">Pasa a abono</Typography>
                      <Typography variant="body2">
                        {formatearMoneda(pagoEsteEquipo - totalEsteEquipo)}
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Lo que falta para cubrir estos equipos: verde si ya está
                    todo pagado, rojo si queda algo debiendo. */}
                <Box
                  className={totalEsteEquipo - pagoEsteEquipo > 0 ? "fila alerta" : "fila ok"}
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Queda debiendo
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatearMoneda(Math.max(0, totalEsteEquipo - pagoEsteEquipo))}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Cómo queda la factura una vez guardados estos equipos. Se
                muestra como una suma —lo que ya tenía + lo que se agrega=
                para que no se confunda un valor viejo con uno nuevo. */}
            <Grid item xs={12}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.6 }}
              >
                Total factura
              </Typography>
              <Paper variant="totales">
                <Box className="fila">
                  <Typography variant="body2">Total actual</Typography>
                  <Typography variant="body2">
                    {formatearMoneda(totalActualMostrado)}
                  </Typography>
                </Box>

                <Box className="fila abono">
                  <Typography variant="body2">+ Equipos agregados</Typography>
                  <Typography variant="body2">{formatearMoneda(totalEsteEquipo)}</Typography>
                </Box>

                <Box className="fila total">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Nuevo total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatearMoneda(totalConEstosEquipos)}
                  </Typography>
                </Box>

                {/* Rojo si queda algo por cobrar, verde si la factura queda
                    saldada: se lee de un vistazo antes de guardar. */}
                <Box className={saldoMostrado > 0 ? "fila alerta" : "fila ok"} sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Saldo pendiente
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatearMoneda(saldoMostrado)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleAgregar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar en la factura"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

AgregarEquipoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onAgregado: PropTypes.func,
};
