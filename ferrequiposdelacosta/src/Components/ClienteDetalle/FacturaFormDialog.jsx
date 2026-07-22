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
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, updateDoc, writeBatch } from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { db } from "../Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import { obtenerFechaInicialEfectiva, calcularVencimiento } from "./facturaUtils";

const ESTADO_INICIAL_ITEM = {
  nombre: "",
  cantidad: "",
  dias: "",
  fechaDespacho: "",
};

const formatearMonedaInput = (valor) =>
  valor ? Number(valor).toLocaleString("es-CO") : "";

const limpiarMonedaInput = (texto) => texto.replace(/\D/g, "");

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

const obtenerNombreCliente = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

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
  subtotal: factura?.subtotal ? String(factura.subtotal) : "",
  transporte: factura?.transporte ?? "",
  valorTransporte: factura?.valorTransporte ? String(factura.valorTransporte) : "",
  deposito: factura?.deposito ? String(factura.deposito) : "",
  aplicaIva: factura?.aplicaIva ?? true,
  tipoPago: factura?.tipoPago ?? "total",
  montoPagado:
    factura && factura.tipoPago !== "total" && factura.montoPagado
      ? String(factura.montoPagado)
      : "",
});

const TIPO_PAGO_INFO = {
  total: { label: "Pago total" },
  parcial: { label: "Parcial" },
};

export default function FacturaFormDialog({ open, onClose, cliente, factura, onGuardado }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const acento = theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.secondary.light;
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

  const ivaCalculado = form.aplicaIva ? (Number(form.subtotal) || 0) * 0.19 : 0;

  // Total = Subtotal + IVA + Valor transporte + Depósito. Se calcula solo,
  // no se digita a mano.
  const valorTotalCalculado =
    (Number(form.subtotal) || 0) +
    ivaCalculado +
    (Number(form.valorTransporte) || 0) +
    (Number(form.deposito) || 0);

  // Si el pago es total, lo pagado es el total calculado (no se digita a
  // mano); si es parcial, lo pagado es lo que se escriba en el campo.
  const montoPagadoCalculado =
    form.tipoPago === "total" ? valorTotalCalculado : Number(form.montoPagado) || 0;
  const saldoPendienteCalculado = Math.max(0, valorTotalCalculado - montoPagadoCalculado);

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

  const handleChangeTipoPago = (e) => {
    const valor = e.target.value;
    setForm((prev) => ({
      ...prev,
      tipoPago: valor,
      montoPagado: valor === "total" ? "" : prev.montoPagado,
    }));
  };

  const handleAgregarEquipo = () => {
    const nombre = nuevoItem.nombre.trim();
    const cantidad = Number(nuevoItem.cantidad);
    const dias = Number(nuevoItem.dias);

    const erroresItem = {};
    if (!nombre) erroresItem.nombreEquipo = "Elegí o escribí un equipo.";
    if (!cantidad || cantidad <= 0) erroresItem.cantidadEquipo = "Cantidad inválida.";
    if (!dias || dias <= 0) erroresItem.diasEquipo = "Días inválidos.";
    if (!nuevoItem.fechaDespacho) erroresItem.fechaDespachoEquipo = "Este campo es obligatorio.";

    if (Object.keys(erroresItem).length > 0) {
      setErrors((prev) => ({ ...prev, ...erroresItem, equipos: undefined }));
      return;
    }

    setEquipos((prev) => [
      ...prev,
      { nombre, cantidad, dias, fechaDespacho: nuevoItem.fechaDespacho },
    ]);
    setNuevoItem({ ...ESTADO_INICIAL_ITEM, fechaDespacho: form.fecha });
    setErrors((prev) => ({
      ...prev,
      nombreEquipo: undefined,
      cantidadEquipo: undefined,
      diasEquipo: undefined,
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
    if (!form.subtotal || Number(form.subtotal) <= 0) {
      errores.subtotal = "El subtotal debe ser mayor a 0.";
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
          calcularVencimiento(item.fechaDespacho || form.fecha, item.dias),
      })),
      subtotal: Number(form.subtotal) || 0,
      iva: ivaCalculado,
      aplicaIva: form.aplicaIva,
      valorTotal: valorTotalCalculado,
      transporte: form.transporte || "",
      valorTransporte: Number(form.valorTransporte) || 0,
      deposito: Number(form.deposito) || 0,
      tipoPago: form.tipoPago,
      montoPagado: montoPagadoCalculado,
      saldoPendiente: saldoPendienteCalculado,
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
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número de factura"
                value={form.numeroFactura}
                onChange={handleChange("numeroFactura")}
                error={!!errors.numeroFactura}
                helperText={errors.numeroFactura}
                fullWidth
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha despacho"
                type="date"
                value={form.fecha}
                onChange={handleChange("fecha")}
                error={!!errors.fecha}
                helperText={errors.fecha}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  color: (theme) =>
                    theme.palette.mode === "light"
                      ? "rgba(0,0,0,0.35)"
                      : "rgba(255,255,255,0.25)",
                  textShadow: (theme) =>
                    theme.palette.mode === "light"
                      ? "0px 1px 0px rgba(255,255,255,0.7)"
                      : "0px 1px 0px rgba(255,255,255,0.12)",
                }}
              >
                Los pedidos realizados antes de las 3:00 p.m. se procesan el mismo día. Los
                realizados después, se procesan al día siguiente.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Agregar equipo
              </Typography>
              <Grid container spacing={1.5}>
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
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={nuevoItem.cantidad}
                    onChange={(e) =>
                      setNuevoItem((prev) => ({
                        ...prev,
                        cantidad: e.target.value,
                      }))
                    }
                    error={!!errors.cantidadEquipo}
                    helperText={errors.cantidadEquipo}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Días"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={nuevoItem.dias}
                    onChange={(e) =>
                      setNuevoItem((prev) => ({
                        ...prev,
                        dias: e.target.value,
                      }))
                    }
                    error={!!errors.diasEquipo}
                    helperText={errors.diasEquipo}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fecha despacho de este equipo"
                    type="date"
                    value={nuevoItem.fechaDespacho}
                    onChange={(e) =>
                      setNuevoItem((prev) => ({
                        ...prev,
                        fechaDespacho: e.target.value,
                      }))
                    }
                    error={!!errors.fechaDespachoEquipo}
                    helperText={errors.fechaDespachoEquipo}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleAgregarEquipo}
                    fullWidth
                  >
                    Agregar equipo
                  </Button>
                </Grid>
              </Grid>

              {errors.equipos && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 1 }}
                >
                  {errors.equipos}
                </Typography>
              )}

              {equipos.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {equipos.map((item, index) => {
                    const despacho = item.fechaDespacho || form.fecha;
                    const vencimiento =
                      item.fechaVencimiento || calcularVencimiento(despacho, item.dias);
                    return (
                      <Grid item xs={12} sm={6} key={`${item.nombre}-${index}`}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            height: "100%",
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {item.nombre}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.cantidad} unidad(es) · {item.dias} día(s)
                              {despacho && ` · despacho ${formatearFechaLegible(despacho)}`}
                              {vencimiento &&
                                ` · vence ${formatearFechaLegible(vencimiento)}`}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleQuitarEquipo(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <TextField
                  label="Subtotal"
                  value={formatearMonedaInput(form.subtotal)}
                  onChange={handleChangeMoneda("subtotal")}
                  error={!!errors.subtotal}
                  helperText={errors.subtotal}
                  fullWidth
                />

                <Box display="flex" alignItems="center" justifyContent="space-between">
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
                  <Typography variant="subtitle1">
                    {ivaCalculado.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel
                    id="factura-transporte-label"
                    htmlFor="factura-transporte-input"
                  >
                    Transporte
                  </InputLabel>
                  <Select
                    labelId="factura-transporte-label"
                    inputProps={{ id: "factura-transporte-input" }}
                    label="Transporte"
                    value={form.transporte}
                    onChange={handleChangeTransporte}
                  >
                    <MenuItem value="Solo ida">Solo ida</MenuItem>
                    <MenuItem value="Solo vuelta">Solo vuelta</MenuItem>
                    <MenuItem value="Ida y vuelta">Ida y vuelta</MenuItem>
                    <MenuItem value="Sin transporte">Sin transporte</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Valor transporte"
                  value={formatearMonedaInput(form.valorTransporte)}
                  onChange={handleChangeMoneda("valorTransporte")}
                  disabled={
                    !form.transporte || form.transporte === "Sin transporte"
                  }
                  fullWidth
                />

                <TextField
                  label="Depósito (opcional)"
                  value={formatearMonedaInput(form.deposito)}
                  onChange={handleChangeMoneda("deposito")}
                  fullWidth
                />
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} sx={{ display: "flex" }}>
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                  bgcolor: theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: "secondary.dark" }}>
                    TOTAL
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: "secondary.dark" }}>
                    {valorTotalCalculado.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: saldoPendienteCalculado > 0 ? "warning.main" : "text.secondary" }}
                  >
                    Saldo pendiente
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: saldoPendienteCalculado > 0 ? "warning.main" : "text.secondary" }}
                  >
                    {saldoPendienteCalculado.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

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
                  onChange={handleChangeTipoPago}
                >
                  {Object.entries(TIPO_PAGO_INFO).map(([valor, info]) => (
                    <MenuItem key={valor} value={valor}>
                      {info.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Monto pagado"
                value={
                  form.tipoPago === "total"
                    ? formatearMonedaInput(montoPagadoCalculado)
                    : formatearMonedaInput(form.montoPagado)
                }
                onChange={handleChangeMoneda("montoPagado")}
                disabled={form.tipoPago === "total"}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="danger" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleGuardar} disabled={guardando}>
            {guardando
              ? "Guardando..."
              : factura
                ? "Guardar Cambios"
                : "Crear Factura"}
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
