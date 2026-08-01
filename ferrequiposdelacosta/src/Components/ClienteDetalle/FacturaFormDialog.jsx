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
  Paper,
  Stack,
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, updateDoc, writeBatch } from "firebase/firestore";
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
  normalizarPagos,
  sumarAbonos,
  separarExcedentePago,
} from "./facturaUtils";
import PagosMediosField from "./PagosMediosField";

const ESTADO_INICIAL_ITEM = {
  nombre: "",
  cantidad: "",
  dias: "",
  valor: "",
  fechaDespacho: "",
};

const obtenerNombreCliente = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

// Toda factura nace "pendienteDespacho": se facturó pero los equipos todavía
// no se le entregaron al cliente. El resto de estados (despachada, devolución
// parcial, finalizada) se setean a mano después, según lo que pase con el
// alquiler.
const ESTADO_INICIAL_FACTURA = "pendienteDespacho";

// Si se pasa `factura`, precarga sus valores (modo edición); si no, arranca
// en blanco (modo creación).
const obtenerEstadoInicial = (factura) => ({
  numeroFactura: factura?.numeroFactura ?? "",
  fecha: factura?.fecha ?? obtenerFechaInicialEfectiva(),
  transporte: factura?.transporte ?? "",
  valorTransporte: factura?.valorTransporte ? String(factura.valorTransporte) : "",
  deposito: factura?.deposito ? String(factura.deposito) : "",
  aplicaIva: factura?.aplicaIva ?? true,
  tipoPago: factura?.tipoPago ?? "total",
  pagos: normalizarPagos(factura?.pagos, factura?.modoPago, factura?.montoPagado),
});

const TIPO_PAGO_INFO = {
  total: { label: "Pago total" },
  parcial: { label: "Parcial" },
  // El cliente entrega más de lo que dice la factura. El monto no se completa
  // solo —se escribe a mano, por encima del total— y lo que sobra se guarda
  // como abono.
  conAbono: { label: "Pago con abono" },
  // Se facturó pero el cliente todavía no pagó nada. Con esta opción no se
  // cargan medios de pago: la factura queda debiendo el total.
  sinPago: { label: "Sin pago" },
};

export default function FacturaFormDialog({ open, onClose, cliente, factura, onGuardado }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const acento = theme.palette.custom.accent;
  const equiposCatalogo = useSelector((state) => state.equipos.equipos);
  const [form, setForm] = useState(() => obtenerEstadoInicial());
  const [equipos, setEquipos] = useState([]);
  const [nuevoItem, setNuevoItem] = useState(ESTADO_INICIAL_ITEM);
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
    const estadoInicial = obtenerEstadoInicial(factura);
    setForm(estadoInicial);
    setEquipos(
      factura?.equipos?.length > 0 && typeof factura.equipos[0] === "object"
        ? factura.equipos
        : [],
    );
    setNuevoItem({ ...ESTADO_INICIAL_ITEM, fechaDespacho: estadoInicial.fecha });
    setErrors({});
  }, [open, factura]);

  const nombresEquiposCatalogo = equiposCatalogo.map((equipo) => equipo.name);

  // Cuándo tiene que devolver el equipo que se está cargando: sale sola de la
  // fecha de despacho más los días. No se digita.
  const fechaEntregaNuevoItem =
    nuevoItem.fechaDespacho && Number(nuevoItem.dias) > 0
      ? calcularFechaDevolucion(nuevoItem.fechaDespacho, Number(nuevoItem.dias))
      : "";

  // Subtotal = suma de (cantidad × días × precio por día) de cada equipo
  // agregado. Ya no se digita a mano: se recalcula solo cada vez que la
  // lista de equipos cambia.
  const subtotalCalculado = equipos.reduce(
    (total, item) =>
      total + (Number(item.cantidad) || 0) * (Number(item.dias) || 0) * (Number(item.valor) || 0),
    0,
  );

  // El IVA se calcula equipo por equipo: cada uno respeta la marca con la que
  // se cargó, y los que no la traen (los del alta original) siguen la casilla
  // de esta pantalla. Así una factura puede tener equipos con IVA y sin IVA
  // sin que uno le pise el cálculo al otro.
  const ivaCalculado = equipos.reduce((total, item) => {
    const subtotalItem =
      (Number(item.cantidad) || 0) * (Number(item.dias) || 0) * (Number(item.valor) || 0);
    const llevaIva = item?.aplicaIva ?? form.aplicaIva;
    return total + (llevaIva ? subtotalItem * 0.19 : 0);
  }, 0);

  // Los equipos que se sumaron después traen su propio depósito, transporte y
  // pago. Si no se cuentan acá, guardar esta pantalla los borra del total y
  // hace reaparecer un saldo que el cliente ya había pagado.
  const equiposAgregados = equipos.filter((item) => item?.agregadoPosteriormente);
  const sumarDeAgregados = (campo) =>
    equiposAgregados.reduce((total, item) => total + (Number(item[campo]) || 0), 0);
  const depositoAgregados = sumarDeAgregados("deposito");
  const transporteAgregados = sumarDeAgregados("valorTransporte");
  const pagosAgregados = equiposAgregados.reduce(
    (total, item) =>
      total +
      normalizarPagos(item.pagos, item.modoPago, item.montoPagado).reduce(
        (suma, pago) => suma + (Number(pago.monto) || 0),
        0,
      ),
    0,
  );

  const depositoTotal = (Number(form.deposito) || 0) + depositoAgregados;
  const transporteTotal = (Number(form.valorTransporte) || 0) + transporteAgregados;

  // Total = Subtotal + IVA + Valor transporte + Depósito. Se calcula solo,
  // no se digita a mano.
  const valorTotalCalculado = subtotalCalculado + ivaCalculado + transporteTotal + depositoTotal;

  // Solo cuenta como pago el renglón que tenga medio Y monto: son los mismos
  // que se guardan, así lo que muestra el diálogo no puede diferir de lo que
  // termina en la factura.
  const pagosValidos = form.pagos.filter((pago) => pago.medio && Number(pago.monto) > 0);

  // Lo pagado ya no se digita aparte: es la suma de los medios de pago
  // cargados (uno o varios, ej. parte por Bancolombia y parte en efectivo)
  // más lo que ya se pagó por cada equipo agregado después.
  const montoPagadoCalculado =
    form.pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0) + pagosAgregados;

  // Los abonos posteriores no se editan acá, pero sí cuentan para el saldo:
  // sin esto, guardar la factura los borraría de la cuenta y volvería a
  // aparecer una deuda que el cliente ya pagó.
  const totalAbonos = sumarAbonos(factura?.abonos);
  const totalRecibido = montoPagadoCalculado + totalAbonos;

  const saldoPendienteCalculado = Math.max(0, valorTotalCalculado - totalRecibido);
  // Lo que el cliente entregó de más. No queda como pago: al guardar se
  // registra como un abono, con la fecha de creación de la factura.
  const excedenteCalculado = Math.max(0, totalRecibido - valorTotalCalculado);

  // Lo que tienen que cubrir los medios de pago de ESTA pantalla: el total de
  // la factura menos lo que ya se pagó por los equipos agregados después
  // (esos traen su propio pago y no se editan acá).
  const totalACubrir = Math.max(0, valorTotalCalculado - pagosAgregados);

  // Con "Pago total" el monto se completa solo: es todo lo que hay que cobrar.
  // Si el pago se reparte en varios medios, el primero toma lo que falte para
  // llegar al total y los demás quedan como se escribieron.
  useEffect(() => {
    if (form.tipoPago !== "total") return;
    setForm((prev) => {
      if (prev.tipoPago !== "total") return prev;
      const otrosMedios = prev.pagos
        .slice(1)
        .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
      const restante = Math.max(0, Math.round(totalACubrir - otrosMedios));
      const primero = prev.pagos[0] || { medio: "", monto: "" };
      // Sin esta guarda el estado se volvería a escribir en cada render.
      if (Number(primero.monto) === restante) return prev;
      return { ...prev, pagos: [{ ...primero, monto: restante }, ...prev.pagos.slice(1)] };
    });
  }, [form.tipoPago, form.pagos, totalACubrir]);

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
        const faltante = Math.max(0, Math.round(totalACubrir - sumar(anteriores)));
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
          Math.round(totalACubrir - (Number(nuevosPagos[indiceEditado].monto) || 0) - otros),
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

  // Al pasar a "Parcial" los montos se borran para que se escriba lo que
  // realmente se está pagando; al volver a "Total" se llenan solos. "Sin pago"
  // borra los medios: si quedaran, se seguirían sumando al monto pagado
  // aunque el desplegable diga que no se pagó nada.
  const handleCambiarTipoPago = (e) => {
    const tipoPago = e.target.value;
    setForm((prev) => {
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

  const handleChangeValorItem = (e) => {
    setNuevoItem((prev) => ({ ...prev, valor: limpiarMonedaInput(e.target.value) }));
  };

  const handleAgregarEquipo = () => {
    const nombre = nuevoItem.nombre.trim();
    const cantidad = Number(nuevoItem.cantidad);
    const dias = Number(nuevoItem.dias);
    const valor = Number(nuevoItem.valor);

    const erroresItem = {};
    if (!nombre) erroresItem.nombreEquipo = "Elegí o escribí un equipo.";
    if (!cantidad || cantidad <= 0) erroresItem.cantidadEquipo = "Cantidad inválida.";
    if (!dias || dias <= 0) erroresItem.diasEquipo = "Días inválidos.";
    if (!valor || valor <= 0) erroresItem.valorEquipo = "Precio inválido.";
    if (!nuevoItem.fechaDespacho) erroresItem.fechaDespachoEquipo = "Este campo es obligatorio.";

    if (Object.keys(erroresItem).length > 0) {
      setErrors((prev) => ({ ...prev, ...erroresItem, equipos: undefined }));
      return;
    }

    setEquipos((prev) => [
      ...prev,
      { nombre, cantidad, dias, valor, fechaDespacho: nuevoItem.fechaDespacho },
    ]);
    setNuevoItem({ ...ESTADO_INICIAL_ITEM, fechaDespacho: form.fecha });
    setErrors((prev) => ({
      ...prev,
      nombreEquipo: undefined,
      cantidadEquipo: undefined,
      diasEquipo: undefined,
      valorEquipo: undefined,
      fechaDespachoEquipo: undefined,
      equipos: undefined,
    }));
  };

  const handleQuitarEquipo = (indexAQuitar) => {
    setEquipos((prev) => prev.filter((_, index) => index !== indexAQuitar));
  };

  const validar = () => {
    const errores = {};
    if (!form.numeroFactura.trim()) {
      errores.numeroFactura = "Este campo es obligatorio.";
    }
    if (!form.fecha) {
      errores.fecha = "Este campo es obligatorio.";
    }
    if (equipos.length === 0) {
      errores.equipos = "Agregá al menos un equipo.";
    }
    setErrors((prev) => ({ ...prev, ...errores }));
    return Object.keys(errores).length === 0;
  };

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    // Lo que se entregó de más no se guarda como pago: se convierte en un
    // abono con la fecha de creación de la factura, y los pagos quedan
    // recortados justo hasta cubrir el total.
    const { pagos: pagosGuardados, excedente, medio: medioExcedente } =
      separarExcedentePago(form.pagos, valorTotalCalculado);

    const abonos =
      excedente > 0
        ? [
            ...(factura?.abonos || []),
            { fecha: form.fecha, medio: medioExcedente, monto: excedente },
          ]
        : factura?.abonos || [];

    const pagadoEnFactura =
      pagosGuardados.reduce((total, pago) => total + pago.monto, 0) + pagosAgregados;
    const totalAbonosGuardado = sumarAbonos(abonos);

    const datosFactura = {
      numeroFactura: form.numeroFactura.trim(),
      fecha: form.fecha,
      // Cada equipo tiene su propia fecha de despacho (pudo agregarse en un
      // día distinto al de la factura); el vencimiento ya calculado se
      // conserva, y solo se recalcula para los que todavía no lo tienen.
      equipos: equipos.map((item) => ({
        ...item,
        fechaDespacho: item.fechaDespacho || form.fecha,
        fechaVencimiento:
          item.fechaVencimiento ??
          calcularFechaDevolucion(item.fechaDespacho || form.fecha, item.dias),
      })),
      subtotal: subtotalCalculado,
      iva: ivaCalculado,
      aplicaIva: form.aplicaIva,
      valorTotal: valorTotalCalculado,
      transporte: form.transporte || "",
      valorTransporte: Number(form.valorTransporte) || 0,
      deposito: Number(form.deposito) || 0,
      tipoPago: form.tipoPago,
      montoPagado: pagadoEnFactura,
      saldoPendiente: Math.max(
        0,
        valorTotalCalculado - pagadoEnFactura - totalAbonosGuardado,
      ),
      pagos: pagosGuardados,
      abonos,
    };

    setGuardando(true);
    try {
      if (factura) {
        await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), datosFactura);
        showSnackbar("Factura actualizada correctamente.", "success");
        onGuardado?.({ id: factura.id, ...factura, ...datosFactura });
      } else {
        const facturaRef = doc(collection(db, "clientes", cliente.id, "facturas"));
        const nuevaFactura = { ...datosFactura, estado: ESTADO_INICIAL_FACTURA };
        const batch = writeBatch(db);
        batch.set(facturaRef, nuevaFactura);
        // El estado del cliente resume todas sus facturas (ver
        // calcularEstadoCliente), pero acá no hace falta leerlas: una factura
        // recién creada nace "pendienteDespacho", que es justo el estado de
        // mayor prioridad, así que gana siempre. Si algún día cambia el estado
        // inicial, esto tiene que pasar a usar el cálculo de verdad.
        batch.update(doc(db, "clientes", cliente.id), {
          estado: nuevaFactura.estado,
        });
        await batch.commit();

        showSnackbar("Factura creada correctamente.", "success");
        onGuardado?.({ id: facturaRef.id, ...nuevaFactura });
      }
      onClose();
    } catch (error) {
      showSnackbar(`Error al guardar la factura: ${error.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: acento }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2}>
            <Box>
              {factura ? "Editar Factura" : "Crear Factura"}
              {cliente && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  {cliente.tipo === "empresa" ? (
                    <BusinessIcon fontSize="small" color="action" />
                  ) : (
                    <PersonIcon fontSize="small" color="action" />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {obtenerNombreCliente(cliente)}
                  </Typography>
                </Stack>
              )}
            </Box>

            {/* El número va en el encabezado, a la altura del nombre del
                cliente: identifica la factura, no es un dato más del
                formulario. */}
            <TextField
              label="N° de factura"
              size="small"
              value={form.numeroFactura}
              onChange={handleChange("numeroFactura")}
              error={!!errors.numeroFactura}
              helperText={errors.numeroFactura}
              autoFocus
              sx={{ width: 140, flexShrink: 0 }}
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Primero se arma la lista de equipos; el pago va después, al
                final, cuando ya se sabe cuánto hay que cobrar. */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha creación"
                type="date"
                value={form.fecha}
                onChange={handleChange("fecha")}
                error={!!errors.fecha}
                helperText={errors.fecha}
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
                    error={!!errors.nombreEquipo}
                    helperText={errors.nombreEquipo}
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
                onChange={(e) =>
                  setNuevoItem((prev) => ({ ...prev, cantidad: e.target.value }))
                }
                error={!!errors.cantidadEquipo}
                helperText={errors.cantidadEquipo}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Días"
                type="number"
                inputProps={{ min: 1 }}
                value={nuevoItem.dias}
                onChange={(e) => setNuevoItem((prev) => ({ ...prev, dias: e.target.value }))}
                error={!!errors.diasEquipo}
                helperText={errors.diasEquipo}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio por día"
                value={formatearMonedaInput(nuevoItem.valor)}
                onChange={handleChangeValorItem}
                error={!!errors.valorEquipo}
                helperText={errors.valorEquipo}
                fullWidth
              />
            </Grid>
            <Grid item xs={8} sm={4}>
              <TextField
                label="Fecha despacho"
                type="date"
                value={nuevoItem.fechaDespacho}
                onChange={(e) =>
                  setNuevoItem((prev) => ({ ...prev, fechaDespacho: e.target.value }))
                }
                error={!!errors.fechaDespachoEquipo}
                helperText={errors.fechaDespachoEquipo}
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
                onClick={handleAgregarEquipo}
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

            {/* Los equipos ya cargados. Cada uno en su recuadro, con el bote
                para sacarlo si se cargó por error. */}
            {equipos.map((item, index) => {
              const despacho = item.fechaDespacho || form.fecha;
              const vencimiento =
                item.fechaVencimiento || calcularFechaDevolucion(despacho, item.dias);
              const subtotalItem =
                (Number(item.cantidad) || 0) *
                (Number(item.dias) || 0) *
                (Number(item.valor) || 0);
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
                        {item.cantidad} unidad(es) · {item.dias} día(s)
                        {item.valor ? ` · ${formatearMoneda(item.valor)}/día c/u` : ""}
                        {despacho && ` · despacho ${formatearFechaLegible(despacho)}`}
                        {vencimiento && ` · vence ${formatearFechaLegible(vencimiento)}`}
                      </Typography>
                      {subtotalItem > 0 && (
                        <Typography variant="caption" fontWeight="bold">
                          Subtotal: {formatearMoneda(subtotalItem)}
                        </Typography>
                      )}
                    </Box>
                    <IconButton size="small" onClick={() => handleQuitarEquipo(index)}>
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
                <InputLabel id="factura-transporte-label" htmlFor="factura-transporte-input">
                  Transporte
                </InputLabel>
                <Select
                  labelId="factura-transporte-label"
                  inputProps={{ id: "factura-transporte-input" }}
                  label="Transporte"
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
                label="Depósito"
                value={formatearMonedaInput(form.deposito)}
                onChange={handleChangeMoneda("deposito")}
                fullWidth
              />
            </Grid>

            {/* La pizarra con lo que se le va a cobrar al cliente. El aspecto
                lo pone el tema (variant "totales"); acá solo van las filas. */}
            <Grid item xs={12}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.6 }}
              >
                Total equipos
              </Typography>
              <Paper variant="totales">
                <Box className="fila">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{formatearMoneda(subtotalCalculado)}</Typography>
                </Box>

                {form.aplicaIva && (
                  <Box className="fila">
                    <Typography variant="body2">IVA (19%)</Typography>
                    <Typography variant="body2">{formatearMoneda(ivaCalculado)}</Typography>
                  </Box>
                )}

                {depositoTotal > 0 && (
                  <Box className="fila">
                    <Typography variant="body2">Depósito</Typography>
                    <Typography variant="body2">{formatearMoneda(depositoTotal)}</Typography>
                  </Box>
                )}

                {transporteTotal > 0 && (
                  <Box className="fila">
                    <Typography variant="body2">Transporte</Typography>
                    <Typography variant="body2">{formatearMoneda(transporteTotal)}</Typography>
                  </Box>
                )}

                <Box className="fila total">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatearMoneda(valorTotalCalculado)}
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
                <InputLabel id="factura-tipopago-label" htmlFor="factura-tipopago-input">
                  Tipo de pago
                </InputLabel>
                <Select
                  labelId="factura-tipopago-label"
                  inputProps={{ id: "factura-tipopago-input" }}
                  label="Tipo de pago"
                  value={form.tipoPago}
                  onChange={handleCambiarTipoPago}
                >
                  {Object.entries(TIPO_PAGO_INFO).map(([valor, info]) => (
                    <MenuItem key={valor} value={valor}>
                      {info.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {form.tipoPago !== "sinPago" && (
                <Box sx={{ mt: 2 }}>
                  <PagosMediosField
                    pagos={form.pagos}
                    onChange={handleChangePagos}
                    idPrefix="factura-pago"
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
                {TIPO_PAGO_INFO[form.tipoPago]?.label ?? "Pago"}
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

                {/* Lo que ya se pagó por los equipos que se sumaron después de
                    crear la factura. Va aparte para que el total de abajo no
                    parezca que no cuadra con los renglones de arriba. */}
                {pagosAgregados > 0 && (
                  <Box className="fila abono">
                    <Typography variant="body2">Equipos agregados</Typography>
                    <Typography variant="body2">{formatearMoneda(pagosAgregados)}</Typography>
                  </Box>
                )}

                <Box className="fila total pagado">
                  <Typography variant="subtitle1" fontWeight="bold">
                    Pagado
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formatearMoneda(montoPagadoCalculado)}
                  </Typography>
                </Box>

                {/* Cuando se recibió de más, se separa lo que cubre la
                    factura de lo que se va a guardar como abono. */}
                {excedenteCalculado > 0 && (
                  <>
                    <Box className="fila">
                      <Typography variant="body2">Cubre la factura</Typography>
                      <Typography variant="body2">
                        {formatearMoneda(valorTotalCalculado)}
                      </Typography>
                    </Box>
                    <Box className="fila abono">
                      <Typography variant="body2">Pasa a abono</Typography>
                      <Typography variant="body2">
                        {formatearMoneda(excedenteCalculado)}
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Rojo si queda algo por cobrar, verde si la factura queda
                    saldada: se lee de un vistazo antes de guardar. */}
                <Box
                  className={saldoPendienteCalculado > 0 ? "fila alerta" : "fila ok"}
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Saldo pendiente
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatearMoneda(saldoPendienteCalculado)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="notaGrabada">
                Los pedidos realizados antes de las 3:00 p.m. se procesan el mismo día. Los
                realizados después, se procesan al día siguiente.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="contained" color="error" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : factura ? "Guardar Cambios" : "Crear Factura"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </>
  );
}

FacturaFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  factura: PropTypes.object,
  onGuardado: PropTypes.func,
};
