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
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const ESTADO_INICIAL_ITEM = {
  nombre: "",
  cantidad: "",
  dias: "",
};

const formatearMonedaInput = (valor) =>
  valor ? Number(valor).toLocaleString("es-CO") : "";

const limpiarMonedaInput = (texto) => texto.replace(/\D/g, "");

// Regla de negocio: antes de las 3pm (hora Colombia) el alquiler arranca el
// mismo día; a partir de las 3pm arranca al día siguiente.
const obtenerFechaInicialEfectiva = () => {
  const ahora = new Date();
  const horaBogota = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: false,
    }).format(ahora),
  );

  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(ahora)
    .split("-")
    .map(Number);

  const fechaBase = new Date(Date.UTC(anio, mes - 1, dia));
  if (horaBogota >= 15) {
    fechaBase.setUTCDate(fechaBase.getUTCDate() + 1);
  }

  const pad = (n) => String(n).padStart(2, "0");
  return `${fechaBase.getUTCFullYear()}-${pad(fechaBase.getUTCMonth() + 1)}-${pad(fechaBase.getUTCDate())}`;
};

// Vencimiento por equipo = fecha de inicio de la factura + sus propios días.
const calcularVencimiento = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + Number(dias));
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
};

const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

const obtenerEstadoInicial = () => ({
  numeroFactura: "",
  fecha: obtenerFechaInicialEfectiva(),
  subtotal: "",
  transporte: "",
  valorTransporte: "",
  deposito: "",
  estado: "despachada",
});

export default function FacturaFormDialog({ open, onClose, cliente, onCreada }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const pantallaChica = useMediaQuery(theme.breakpoints.down("sm"));
  const equiposCatalogo = useSelector((state) => state.equipos.equipos);
  const [form, setForm] = useState(obtenerEstadoInicial);
  const [equipos, setEquipos] = useState([]);
  const [nuevoItem, setNuevoItem] = useState(ESTADO_INICIAL_ITEM);
  const [errors, setErrors] = useState({});
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    if (equiposCatalogo.length === 0) {
      dispatch(fetchEquiposData());
    }
  }, [equiposCatalogo.length, dispatch]);

  useEffect(() => {
    if (!open) return;
    setForm(obtenerEstadoInicial());
    setEquipos([]);
    setNuevoItem(ESTADO_INICIAL_ITEM);
    setErrors({});
  }, [open]);

  const nombresEquiposCatalogo = equiposCatalogo.map((equipo) => equipo.name);

  // Total = Subtotal + Valor transporte + Depósito. Se calcula solo, no se
  // digita a mano.
  const valorTotalCalculado =
    (Number(form.subtotal) || 0) +
    (Number(form.valorTransporte) || 0) +
    (Number(form.deposito) || 0);

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

  const handleAgregarEquipo = () => {
    const nombre = nuevoItem.nombre.trim();
    const cantidad = Number(nuevoItem.cantidad);
    const dias = Number(nuevoItem.dias);

    const erroresItem = {};
    if (!nombre) erroresItem.nombreEquipo = "Elegí o escribí un equipo.";
    if (!cantidad || cantidad <= 0) erroresItem.cantidadEquipo = "Cantidad inválida.";
    if (!dias || dias <= 0) erroresItem.diasEquipo = "Días inválidos.";

    if (Object.keys(erroresItem).length > 0) {
      setErrors((prev) => ({ ...prev, ...erroresItem, equipos: undefined }));
      return;
    }

    setEquipos((prev) => [...prev, { nombre, cantidad, dias }]);
    setNuevoItem(ESTADO_INICIAL_ITEM);
    setErrors((prev) => ({
      ...prev,
      nombreEquipo: undefined,
      cantidadEquipo: undefined,
      diasEquipo: undefined,
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
    onClose();
  };

  const handleCrear = () => {
    if (!validar()) return;

    // TODO: conectar a Firestore (clientes/{cliente.id}/facturas) cuando se
    // confirme el flujo. Por ahora solo arma el objeto y lo muestra.
    const nuevaFactura = {
      numeroFactura: form.numeroFactura.trim(),
      fecha: form.fecha,
      equipos: equipos.map((item) => ({
        ...item,
        fechaVencimiento: calcularVencimiento(form.fecha, item.dias),
      })),
      subtotal: Number(form.subtotal) || 0,
      valorTotal: valorTotalCalculado,
      transporte: form.transporte || "",
      valorTransporte: Number(form.valorTransporte) || 0,
      deposito: Number(form.deposito) || 0,
      estado: form.estado,
      revisar: false,
      motivoRevision: "",
    };

    console.log("Nueva factura (vista previa, sin guardar):", nuevaFactura);
    showSnackbar(
      "Vista previa lista — todavía falta conectar esto a la base de datos.",
      "info",
    );
    onCreada?.(nuevaFactura);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCerrar}
        fullWidth
        maxWidth="sm"
        fullScreen={pantallaChica}
      >
        <DialogTitle>
          Crear Factura{cliente ? ` — ${cliente.nombres || cliente.razonSocial || ""}` : ""}
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
                label="Fecha"
                type="date"
                value={form.fecha}
                onChange={handleChange("fecha")}
                error={!!errors.fecha}
                helperText={
                  errors.fecha ||
                  "Antes de las 3pm arranca hoy, después arranca mañana."
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
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
                      setNuevoItem((prev) => ({ ...prev, cantidad: e.target.value }))
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
                      setNuevoItem((prev) => ({ ...prev, dias: e.target.value }))
                    }
                    error={!!errors.diasEquipo}
                    helperText={errors.diasEquipo}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleAgregarEquipo} fullWidth>
                    Agregar equipo
                  </Button>
                </Grid>
              </Grid>

              {errors.equipos && (
                <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                  {errors.equipos}
                </Typography>
              )}

              {equipos.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {equipos.map((item, index) => {
                    const vencimiento = calcularVencimiento(form.fecha, item.dias);
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
                            <Typography variant="caption" color="text.secondary">
                              {item.cantidad} unidad(es) · {item.dias} día(s)
                              {vencimiento && ` · vence ${formatearFechaLegible(vencimiento)}`}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => handleQuitarEquipo(index)}>
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
              <TextField
                label="Subtotal"
                value={formatearMonedaInput(form.subtotal)}
                onChange={handleChangeMoneda("subtotal")}
                error={!!errors.subtotal}
                helperText={errors.subtotal}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
                  <MenuItem value="Solo ida">Solo ida</MenuItem>
                  <MenuItem value="Solo vuelta">Solo vuelta</MenuItem>
                  <MenuItem value="Ida y vuelta">Ida y vuelta</MenuItem>
                  <MenuItem value="Sin transporte">Sin transporte</MenuItem>
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

            <Grid item xs={12} sm={6}>
              <TextField
                label="Depósito (opcional)"
                value={formatearMonedaInput(form.deposito)}
                onChange={handleChangeMoneda("deposito")}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor total"
                value={formatearMonedaInput(valorTotalCalculado)}
                helperText="Se calcula solo: Subtotal + Transporte + Depósito."
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="factura-estado-label" htmlFor="factura-estado-input">
                  Estado
                </InputLabel>
                <Select
                  labelId="factura-estado-label"
                  inputProps={{ id: "factura-estado-input" }}
                  label="Estado"
                  value={form.estado}
                  onChange={handleChange("estado")}
                >
                  <MenuItem value="despachada">Despachada</MenuItem>
                  <MenuItem value="entregada">Entregada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCerrar}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrear}>
            Crear Factura
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
  onCreada: PropTypes.func,
};
