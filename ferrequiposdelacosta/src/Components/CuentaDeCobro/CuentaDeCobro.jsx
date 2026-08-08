import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  RadioGroup,
  Radio,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector, useDispatch } from "react-redux";
import { setFormCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import {
  formatearMoneda,
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearNit,
  limpiarNit,
} from "../../Utils/formato";

export default function CuentaCobro() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cuentacobro.value);
  const { items, subtotalNumero, ivaNumero, total } = formValues;

  // El subtotal de un ítem es cantidad x precio x días. Se guarda como NÚMERO;
  // el formato de moneda se pone recién al mostrarlo.
  const calcularSubtotal = (item) =>
    (Number(item.quantity) || 0) *
    (Number(item.price) || 0) *
    (Number(item.day) || 0);

  // Recalcula el desglose (subtotal, IVA, depósito, transporte y total) a
  // partir de un value ya actualizado y lo guarda TODO en un solo dispatch.
  // Igual criterio que la cotización: total = subtotal + IVA + depósito +
  // transporte. El IVA y el depósito solo suman si sus casillas están marcadas.
  const recalcularYGuardar = (value) => {
    const nuevoSubtotal = (value.items || []).reduce(
      (acumulado, item) => acumulado + calcularSubtotal(item),
      0,
    );
    const nuevoIva = value.iva ? nuevoSubtotal * 0.19 : 0;
    const transporte = Number(value.valorTransporte) || 0;
    const deposito = value.deposito ? Number(value.valorDeposito) || 0 : 0;
    const nuevoTotal = nuevoSubtotal + nuevoIva + transporte + deposito;

    dispatch(
      setFormCuentaCobro({
        ...value,
        subtotalNumero: nuevoSubtotal,
        ivaNumero: nuevoIva,
        total: nuevoTotal,
      }),
    );
  };

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    // El NIT se guarda pelado (dígitos y guion); los puntos se ponen al mostrar.
    const valorAGuardar = name === "nit" ? limpiarNit(value) : value;
    const actualizado = { ...formValues, [name]: valorAGuardar };

    // Si no hay transporte, su valor no cuenta; si se destilda el depósito,
    // tampoco. Se ponen en cero para que no queden sumando "fantasma".
    if (name === "transporte" && value === "Sin transporte") {
      actualizado.valorTransporte = 0;
    }
    if (name === "deposito" && !value) {
      actualizado.valorDeposito = 0;
    }

    recalcularYGuardar(actualizado);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = items.map((item, i) => {
      if (i !== index) return item;
      const actualizado = { ...item, [field]: value };
      actualizado.subtotal = calcularSubtotal(actualizado);
      return actualizado;
    });
    recalcularYGuardar({ ...formValues, items: updatedItems });
  };

  const addNewItem = () => {
    // Con subtotal en cero desde el arranque: sin esto el ítem recién agregado
    // mostraba "Subtotal:" vacío hasta que se tocaba alguno de sus campos.
    const newItem = {
      description: "",
      quantity: 0,
      price: 0,
      day: 1,
      subtotal: 0,
    };
    recalcularYGuardar({ ...formValues, items: [...items, newItem] });
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    recalcularYGuardar({ ...formValues, items: updatedItems });
  };

  const esEmpresa = formValues.tipo === "empresa";

  return (
    // El aire de los costados es para el resplandor de los recuadros de ítem:
    // son 20px de sombra difusa y sin este margen el contenedor que scrollea
    // la recortaba contra el borde izquierdo.
    <Box mx="auto" display="flex" flexDirection="column" sx={{ px: 2 }}>
      <Box component="form">
        <Grid container spacing={2} sx={{ mt: { xs: 0, md: 1 } }}>
          {/* Persona / Empresa: cambia los rótulos de NIT/Cédula y
              Empresa/Nombre, igual que en la cotización. */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <RadioGroup
                row
                name="tipo"
                value={formValues.tipo}
                onChange={handlerInputChange}
                sx={{ display: "flex", width: "100%" }}
              >
                <FormControlLabel
                  value="persona"
                  control={<Radio />}
                  label="Persona"
                  sx={{ flex: 1, alignItems: "center" }}
                />
                <FormControlLabel
                  value="empresa"
                  control={<Radio />}
                  label="Empresa"
                  sx={{ flex: 1, alignItems: "center" }}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              name="fecha"
              label="Fecha"
              value={formValues.fecha}
              onChange={handlerInputChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { color: theme.palette.text.primary } }}
            />
          </Grid>

          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label={esEmpresa ? "NIT" : "Cédula"}
              value={formatearNit(formValues.nit)}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="empresa"
              label={esEmpresa ? "Empresa" : "Nombre"}
              value={formValues.empresa}
              onChange={handlerInputChange}
            />
          </Grid>

          {/* Obra: propio de la cuenta de cobro (la cotización no lo tiene). */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="obra"
              label="Obra"
              value={formValues.obra}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="direccion"
              label="Dirección"
              value={formValues.direccion}
              onChange={handlerInputChange}
            />
          </Grid>

          {/* Por concepto de: propio de la cuenta de cobro. */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="text"
              name="concepto"
              label="Por concepto de"
              value={formValues.concepto}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="cc-transporte-label" htmlFor="cc-transporte-input">
                Transporte
              </InputLabel>
              <Select
                labelId="cc-transporte-label"
                inputProps={{ id: "cc-transporte-input" }}
                name="transporte"
                value={formValues.transporte || ""}
                label="Transporte"
                onChange={handlerInputChange}
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
              fullWidth
              type="text"
              inputMode="numeric"
              name="valorTransporte"
              label="Valor Transporte"
              disabled={
                !formValues.transporte ||
                formValues.transporte === "Sin transporte"
              }
              value={formatearMonedaInput(formValues.valorTransporte)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "valorTransporte",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" width="100%">
              <Box flex={1}>
                <FormControlLabel
                  label="IVA"
                  control={
                    <Checkbox
                      checked={formValues.iva}
                      onChange={(e) =>
                        handlerInputChange({
                          target: { name: "iva", value: e.target.checked },
                        })
                      }
                    />
                  }
                />
              </Box>
              <Box flex={1}>
                <FormControlLabel
                  label="Depósito"
                  control={
                    <Checkbox
                      checked={formValues.deposito}
                      onChange={(e) =>
                        handlerInputChange({
                          target: { name: "deposito", value: e.target.checked },
                        })
                      }
                    />
                  }
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="valorDeposito"
              label="Valor Depósito"
              disabled={!formValues.deposito}
              value={formatearMonedaInput(formValues.valorDeposito)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "valorDeposito",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>
        </Grid>

        {items.map((item, index) => (
          <Box
            key={index}
            display="flex"
            justifyContent="center"
            sx={{
              mt: 2,
              pb: 1,
              pt: 1,
              px: 1,
              // Resplandor de acento, mismo que en la cotización.
              boxShadow: (theme) =>
                `0 0 20px ${alpha(theme.palette.custom.accent, 0.4)}`,
              borderRadius: 0.5,
            }}
          >
            <Grid container spacing={1} key={index}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  type="text"
                  rows={2}
                  label="Descripción"
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={item.quantity !== 0 ? item.quantity : ""}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Días"
                  value={item.day !== 0 ? item.day : ""}
                  onChange={(e) => updateItem(index, "day", e.target.value)}
                />
              </Grid>

              <Grid item xs={4}>
                {/* Va como texto y no como número: un input numérico no acepta
                    los puntos de miles. Se guarda el número pelado. */}
                <TextField
                  fullWidth
                  type="text"
                  inputMode="numeric"
                  label="Precio"
                  value={formatearMonedaInput(item.price)}
                  onChange={(e) =>
                    updateItem(index, "price", limpiarMonedaInput(e.target.value))
                  }
                />
              </Grid>

              <Grid item xs={6} md={6}>
                <Typography variant="subtitle1" sx={{ color: "custom.accent" }}>
                  Subtotal: {formatearMoneda(item.subtotal)}
                </Typography>
              </Grid>

              <Grid item xs={6} md={6}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => removeItem(index)}
                  fullWidth
                >
                  Eliminar Ítem
                </Button>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="success"
              onClick={addNewItem}
              fullWidth
            >
              Agregar Ítem
            </Button>
          </Grid>

          <Grid item xs={12}>
            {/* La pizarra de totales, igual que en Cotización. El aspecto vive
                en el tema como la variante "totales"; acá solo van las filas. */}
            <Paper variant="totales">
              <Box className="fila">
                <Typography variant="subtitle1">Subtotal</Typography>
                <Typography variant="subtitle1">
                  {formatearMoneda(subtotalNumero)}
                </Typography>
              </Box>

              <Box className="fila">
                <Typography variant="subtitle1">IVA (19%)</Typography>
                <Typography variant="subtitle1">
                  {formatearMoneda(ivaNumero)}
                </Typography>
              </Box>

              <Box className="fila">
                <Typography variant="subtitle1">Depósito</Typography>
                <Typography variant="subtitle1">
                  {formatearMoneda(
                    formValues.deposito ? formValues.valorDeposito : 0,
                  )}
                </Typography>
              </Box>

              <Box className="fila">
                <Typography variant="subtitle1">Transporte</Typography>
                <Typography variant="subtitle1">
                  {formatearMoneda(formValues.valorTransporte)}
                </Typography>
              </Box>

              <Box className="fila total">
                <Typography variant="h5">TOTAL</Typography>
                <Typography variant="h5">{formatearMoneda(total)}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
