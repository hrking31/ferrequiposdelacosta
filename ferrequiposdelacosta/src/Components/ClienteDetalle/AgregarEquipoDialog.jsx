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
} from "./facturaUtils";
import PagosMediosField from "./PagosMediosField";

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
  tipoPago: "total",
  pagos: [],
};

export default function AgregarEquipoDialog({ open, onClose, cliente, factura, onAgregado }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const acento = theme.palette.custom.accent;
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

  const cantidadNueva = Number(form.cantidad) || 0;
  const diasNuevo = Number(form.dias) || 0;
  const precioPorDiaNuevo = Number(form.valor) || 0;
  // Subtotal de este equipo = cantidad × días × precio por día (igual que en Crear Factura).
  const subtotalNuevoEquipo = cantidadNueva * diasNuevo * precioPorDiaNuevo;
  const ivaNuevoEquipo = form.aplicaIva ? subtotalNuevoEquipo * 0.19 : 0;
  const valorTransporteNuevo = Number(form.valorTransporte) || 0;
  const depositoNuevo = Number(form.deposito) || 0;
  const fechaVencimientoNueva = calcularFechaDevolucion(form.fechaEntrega, form.dias);
  const hayDatosEquipo =
    Boolean(form.nombre.trim()) &&
    cantidadNueva > 0 &&
    diasNuevo > 0 &&
    precioPorDiaNuevo > 0 &&
    Boolean(form.fechaEntrega);
  // Lo que cuesta agregar este equipo puntual (antes de sumarlo a la factura).
  const totalEsteEquipo = subtotalNuevoEquipo + ivaNuevoEquipo + valorTransporteNuevo + depositoNuevo;

  const nuevoSubtotal = (Number(factura?.subtotal) || 0) + subtotalNuevoEquipo;
  const nuevoIva = form.aplicaIva ? nuevoSubtotal * 0.19 : 0;

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

  // Lo pagado por este equipo puntual es la suma de sus medios de pago (uno
  // o varios). Se acumula sobre lo que la factura ya tenía pagado — no lo
  // reemplaza, para no perder pagos previos registrados.
  const pagoEsteEquipo = form.pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
  const nuevoMontoPagado = (Number(factura?.montoPagado) || 0) + pagoEsteEquipo;
  const nuevoSaldoPendiente = Math.max(0, nuevoValorTotal - nuevoMontoPagado);

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
    setForm((prev) => ({ ...prev, pagos: nuevosPagos }));
  };

  // Limpia solo los datos del equipo cargado para que el usuario pueda
  // volver a escribirlo (el dialog solo admite un equipo por vez).
  const handleQuitarEquipoCargado = () => {
    setForm((prev) => ({ ...prev, nombre: "", cantidad: "", dias: "", valor: "" }));
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
      cantidad: cantidadNueva,
      dias: diasNuevo,
      valor: precioPorDiaNuevo,
      fechaDespacho: form.fechaEntrega,
      fechaVencimiento: calcularFechaDevolucion(form.fechaEntrega, form.dias),
      // Marca que este equipo se sumó después de crear la factura (no en el
      // alta original), para poder diferenciarlo en el historial.
      agregadoPosteriormente: true,
      tipoPago: form.tipoPago,
      pagos: form.pagos
        .filter((pago) => pago.medio && Number(pago.monto) > 0)
        .map((pago) => ({ medio: pago.medio, monto: Number(pago.monto) })),
    };
    if (form.transporte && form.transporte !== "Sin transporte") {
      nuevoEquipo.transporte = form.transporte;
      nuevoEquipo.valorTransporte = valorTransporteNuevo;
    }
    if (depositoNuevo > 0) {
      nuevoEquipo.deposito = depositoNuevo;
    }

    setGuardando(true);
    try {
      await updateDoc(doc(db, "clientes", cliente.id, "facturas", factura.id), {
        equipos: [...(factura.equipos || []), nuevoEquipo],
        subtotal: nuevoSubtotal,
        iva: nuevoIva,
        aplicaIva: form.aplicaIva,
        valorTotal: nuevoValorTotal,
        saldoPendiente: nuevoSaldoPendiente,
        montoPagado: nuevoMontoPagado,
        // El estado de pago de la factura sale de si queda saldo pendiente o no,
        // ya no de lo que se elija acá (eso es solo el pago de este equipo puntual).
        tipoPago: nuevoSaldoPendiente > 0 ? "parcial" : "total",
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
                label="Precio por día"
                value={formatearMonedaInput(form.valor)}
                onChange={handleChangeMoneda("valor")}
                error={!!errors.valor}
                helperText={errors.valor || "Precio de 1 unidad, por 1 día."}
                fullWidth
              />
            </Grid>

            {hayDatosEquipo && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {form.nombre.trim()}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {cantidadNueva} unidad(es) · {diasNuevo} día(s) ·{" "}
                      {precioPorDiaNuevo.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                      })}
                      /día c/u · despacho {formatearFechaLegible(form.fechaEntrega)}
                      {fechaVencimientoNueva &&
                        ` · vence ${formatearFechaLegible(fechaVencimientoNueva)}`}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      Subtotal:{" "}
                      {subtotalNuevoEquipo.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                      })}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={handleQuitarEquipoCargado}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            )}

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
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    IVA de este equipo
                  </Typography>
                  <Typography variant="body2">
                    {ivaNuevoEquipo.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    IVA total de la factura
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {nuevoIva.toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </Typography>
                </Box>
              </Stack>
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

            {/* Pago de este equipo puntual: va después de sus datos, como en el diseño 3. */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="agregar-equipo-tipopago-label" htmlFor="agregar-equipo-tipopago-input">
                  Pago de este equipo
                </InputLabel>
                <Select
                  labelId="agregar-equipo-tipopago-label"
                  inputProps={{ id: "agregar-equipo-tipopago-input" }}
                  label="Pago de este equipo"
                  value={form.tipoPago}
                  onChange={handleChange("tipoPago")}
                >
                  <MenuItem value="total">Total de este equipo</MenuItem>
                  <MenuItem value="parcial">Parcial de este equipo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Pagado por este equipo:{" "}
                <strong>
                  {pagoEsteEquipo.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </strong>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <PagosMediosField
                pagos={form.pagos}
                onChange={handleChangePagos}
                idPrefix="agregar-equipo-pago"
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
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "custom.accentSmall" }}>
                  {nuevoValorTotal.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </Typography>
              </Box>
              {nuevoSaldoPendiente > 0 && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "warning.main" }}>
                    Saldo pendiente de la factura
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
