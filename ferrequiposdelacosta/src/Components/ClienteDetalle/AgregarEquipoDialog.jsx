import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  Typography,
  Divider,
  useTheme,
} from "@mui/material";
import { doc, updateDoc } from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { db } from "../Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import { obtenerFechaInicialEfectiva, calcularVencimiento } from "./facturaUtils";

const ESTADO_INICIAL = {
  nombre: "",
  cantidad: "",
  dias: "",
  valor: "",
  fechaEntrega: "",
  transporte: "",
  valorTransporte: "",
  deposito: "",
  aplicaIva: true,
};

const formatearMonedaInput = (valor) => (valor ? Number(valor).toLocaleString("es-CO") : "");

const limpiarMonedaInput = (texto) => texto.replace(/\D/g, "");

export default function AgregarEquipoDialog({ open, onClose, cliente, factura, onAgregado }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const acento = theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.secondary.light;
  const equiposCatalogo = useSelector((state) => state.equipos.equipos);
  const [form, setForm] = useState(ESTADO_INICIAL);
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
    setForm({
      ...ESTADO_INICIAL,
      fechaEntrega: obtenerFechaInicialEfectiva(),
      // Si la factura ya tenía IVA, se sigue aplicando por defecto al agregar.
      aplicaIva: factura?.aplicaIva ?? true,
    });
    setErrors({});
  }, [open, factura]);

  const nombresEquiposCatalogo = equiposCatalogo.map((equipo) => equipo.name);

  const valorNuevoEquipo = Number(form.valor) || 0;
  const ivaNuevoEquipo = form.aplicaIva ? valorNuevoEquipo * 0.19 : 0;
  const valorTransporteNuevo = Number(form.valorTransporte) || 0;
  const depositoNuevo = Number(form.deposito) || 0;
  // Lo que cuesta agregar este equipo puntual (antes de sumarlo a la factura).
  const totalEsteEquipo = valorNuevoEquipo + ivaNuevoEquipo + valorTransporteNuevo + depositoNuevo;

  const nuevoSubtotal = (Number(factura?.subtotal) || 0) + valorNuevoEquipo;
  const nuevoValorTransporte = (Number(factura?.valorTransporte) || 0) + valorTransporteNuevo;
  const nuevoDeposito = (Number(factura?.deposito) || 0) + depositoNuevo;
  const nuevoIva = form.aplicaIva ? nuevoSubtotal * 0.19 : 0;
  const nuevoValorTotal = nuevoSubtotal + nuevoIva + nuevoValorTransporte + nuevoDeposito;
  const nuevoSaldoPendiente = Math.max(0, nuevoValorTotal - (Number(factura?.montoPagado) || 0));

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

  const handleCerrar = () => {
    if (guardando) return;
    onClose();
  };

  const validar = () => {
    const errores = {};
    const nombre = form.nombre.trim();
    const cantidad = Number(form.cantidad);
    const dias = Number(form.dias);

    if (!nombre) errores.nombre = "Elegí o escribí un equipo.";
    if (!cantidad || cantidad <= 0) errores.cantidad = "Cantidad inválida.";
    if (!dias || dias <= 0) errores.dias = "Días inválidos.";
    if (!form.fechaEntrega) errores.fechaEntrega = "Este campo es obligatorio.";
    if (!form.valor || Number(form.valor) <= 0) errores.valor = "El valor debe ser mayor a 0.";

    setErrors(errores);
    return Object.keys(errores).length === 0;
  };

  const handleAgregar = async () => {
    if (!validar()) return;

    const nuevoEquipo = {
      nombre: form.nombre.trim(),
      cantidad: Number(form.cantidad),
      dias: Number(form.dias),
      fechaDespacho: form.fechaEntrega,
      fechaVencimiento: calcularVencimiento(form.fechaEntrega, form.dias),
    };

    setGuardando(true);
    try {
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        equipos: [...(factura.equipos || []), nuevoEquipo],
        subtotal: nuevoSubtotal,
        iva: nuevoIva,
        aplicaIva: form.aplicaIva,
        valorTotal: nuevoValorTotal,
        valorTransporte: nuevoValorTransporte,
        transporte:
          form.transporte && form.transporte !== "Sin transporte"
            ? form.transporte
            : factura.transporte || "",
        deposito: nuevoDeposito,
        saldoPendiente: nuevoSaldoPendiente,
        tipoPago: nuevoSaldoPendiente > 0 ? "parcial" : factura.tipoPago || "total",
      });

      showSnackbar("Equipo agregado a la factura.", "success");
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
      <Dialog open={open} onClose={handleCerrar} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: acento }}>
          Agregar equipo
          {factura && (
            <Typography variant="body2" color="text.secondary">
              Factura {factura.numeroFactura ?? "s/n"}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                fullWidth
                options={nombresEquiposCatalogo}
                inputValue={form.nombre}
                onInputChange={(_e, valor) => setForm((prev) => ({ ...prev, nombre: valor }))}
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
                value={form.cantidad}
                onChange={handleChange("cantidad")}
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
                value={form.dias}
                onChange={handleChange("dias")}
                error={!!errors.dias}
                helperText={errors.dias}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Fecha de entrega"
                type="date"
                value={form.fechaEntrega}
                onChange={handleChange("fechaEntrega")}
                error={!!errors.fechaEntrega}
                helperText={errors.fechaEntrega}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Valor a sumar al subtotal"
                value={formatearMonedaInput(form.valor)}
                onChange={handleChangeMoneda("valor")}
                error={!!errors.valor}
                helperText={errors.valor}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
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
                <Typography variant="body2">
                  {nuevoIva.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </Typography>
              </Box>
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
                label="Depósito adicional (opcional)"
                value={formatearMonedaInput(form.deposito)}
                onChange={handleChangeMoneda("deposito")}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total de este equipo
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {totalEsteEquipo.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Nuevo total de la factura
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "secondary.dark" }}>
                  {nuevoValorTotal.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </Typography>
              </Box>
              {nuevoSaldoPendiente > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "warning.main" }}>
                    Saldo pendiente
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: "warning.main" }}>
                    {nuevoSaldoPendiente.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button variant="danger" onClick={handleCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleAgregar} disabled={guardando}>
            {guardando ? "Agregando..." : "Agregar"}
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
