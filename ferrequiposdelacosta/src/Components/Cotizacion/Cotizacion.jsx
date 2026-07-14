import {
  Box,
  Button,
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
import {
  setFormCotizacion,
  setItems,
  setSubtotal,
  setTotal,
  setSubtotalNumero,
  setIvaNumero,
  setTotalNumero,
} from "../../Store/Slices/cotizacionSlice";
import { useSelector, useDispatch } from "react-redux";
import { departamentosYMunicipios } from "../RolesPermisos/departamentosYMunicipios";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const formValues = useSelector((state) => state.cotizacion.value);
  const { items, subtotal, ivaNumero, total } = formValues;

  const handlerInputChange = (event) => {
    const { name, value } = event.target;

    const updatedFormValues = {
      ...formValues,
      [name]: name === "nit" ? formatNit(value) : value,
    };

    if (name === "transporte" && value === "Sin transporte") {
      updatedFormValues.valorTransporte = 0;
    }

    if (!value && name === "deposito") {
      updatedFormValues.valorDeposito = 0;
    }

    dispatch(setFormCotizacion(updatedFormValues));

    if (
      name === "valorTransporte" ||
      name === "transporte" ||
      name === "iva" ||
      name === "deposito" ||
      name === "valorDeposito"
    ) {
      calculateTotalFrom(items, updatedFormValues);
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal =
      updatedItem.quantity * updatedItem.price * updatedItem.day;
    updatedItem.subtotal = updatedItem.subtotal.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    updatedItems[index] = updatedItem;
    dispatch(setItems(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  const calculateTotalFrom = (updatedItems, currentFormValues = formValues) => {
    const subtotalNumero = updatedItems.reduce(
      (total, item) => total + item.quantity * item.price * item.day,
      0,
    );
    const subtotalFormatted = subtotalNumero.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    dispatch(setSubtotalNumero(subtotalNumero));
    dispatch(setSubtotal(subtotalFormatted));
    const transporte = Number(currentFormValues.valorTransporte) || 0;
    const deposito = currentFormValues.deposito
      ? Number(currentFormValues.valorDeposito) || 0
      : 0;
    const ivaNumero = currentFormValues.iva ? subtotalNumero * 0.19 : 0;
    dispatch(setIvaNumero(ivaNumero));
    const totalNumero = subtotalNumero + transporte + deposito + ivaNumero;
    const totalFormatted = totalNumero.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });

    dispatch(setTotalNumero(totalNumero));
    dispatch(setTotal(totalFormatted));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0, day: 1 };
    dispatch(setItems([...items, newItem]));
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    dispatch(setItems(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  return (
    <Box mx="auto" display="flex" flexDirection="column">
      <Box component="form">
         <Grid container spacing={2} sx={{ mt: { xs: 0.5, md: 1 }, px: 0.5}}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <Box display="flex" width="100%">
                <RadioGroup
                  row
                  name="tipo"
                  value={formValues.tipo}
                  onChange={(e) => {
                    handlerInputChange({
                      target: {
                        name: "tipo",
                        value: e.target.value,
                      },
                    });
                  }}
                  sx={{
                    display: "flex",
                    width: "100%",
                  }}
                >
                  <FormControlLabel
                    value="persona"
                    control={<Radio />}
                    label="Persona"
                    sx={{
                      flex: 1,
                      alignItems: "center",
                    }}
                  />

                  <FormControlLabel
                    value="empresa"
                    control={<Radio />}
                    label="Empresa"
                    sx={{
                      flex: 1,
                      alignItems: "center",
                    }}
                  />
                </RadioGroup>
              </Box>
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
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                sx: {
                  color: theme.palette.mode === "light" ? "#1A1A1A" : "#A0AEC0",
                },
              }}
            />
          </Grid>

          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label={formValues.tipo === "empresa" ? "NIT" : "Cédula"}
              value={formValues.nit}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={6} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="telefono"
              label="Teléfono"
              value={formValues.telefono}
              onChange={handlerInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="empresa"
              label={formValues.tipo === "empresa" ? "Empresa" : "Nombre"}
              value={formValues.empresa}
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

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="barrio"
              label="Barrio"
              value={formValues.barrio}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="otrosDatos"
              label="Otros datos (Ej: bodega, edificio, obra)"
              value={formValues.otrosDatos}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              id="departamento-select"
              name="departamento"
              label="Departamento"
              value={formValues.departamento}
              onChange={handlerInputChange}
              fullWidth
              inputProps={{ id: "departamento-input" }}
              InputLabelProps={{ htmlFor: "departamento-input" }}
            >
              {Object.keys(departamentosYMunicipios).map((dep) => (
                <MenuItem key={dep} value={dep}>
                  {dep}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              id="municipio-select"
              name="municipio"
              label="Municipio"
              value={formValues.municipio}
              onChange={handlerInputChange}
              fullWidth
              disabled={!formValues.departamento}
              inputProps={{ id: "municipio-input" }}
              InputLabelProps={{ htmlFor: "municipio-input" }}
            >
              {formValues.departamento &&
              departamentosYMunicipios[formValues.departamento]?.length > 0 ? (
                departamentosYMunicipios[formValues.departamento].map((mun) => (
                  <MenuItem key={mun} value={mun}>
                    {mun}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Seleccione un departamento</MenuItem>
              )}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="transporte-label" htmlFor="transporte-input">
                Transporte
              </InputLabel>

              <Select
                labelId="transporte-label"
                inputProps={{ id: "transporte-input" }}
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
              name="valorTransporte"
              label="Valor Transporte"
              disabled={formValues.transporte === "Sin transporte"}
              value={
                formValues.valorTransporte
                  ? Number(formValues.valorTransporte).toLocaleString("es-CO")
                  : ""
              }
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, "");

                handlerInputChange({
                  target: {
                    name: "valorTransporte",
                    value: rawValue,
                  },
                });
              }}
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
                      onChange={(e) => {
                        handlerInputChange({
                          target: {
                            name: "iva",
                            value: e.target.checked,
                          },
                        });
                      }}
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
                      onChange={(e) => {
                        handlerInputChange({
                          target: {
                            name: "deposito",
                            value: e.target.checked,
                          },
                        });
                      }}
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
              name="valorDeposito"
              label="Valor Depósito"
              disabled={!formValues.deposito}
              value={
                formValues.valorDeposito
                  ? Number(formValues.valorDeposito).toLocaleString("es-CO")
                  : ""
              }
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, "");

                handlerInputChange({
                  target: {
                    name: "valorDeposito",
                    value: rawValue,
                  },
                });
              }}
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
              boxShadow: "0 0 20px rgba(102, 155, 188, 0.4)",
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
                  value={item.description}
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
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Dias"
                  value={item.day !== 0 ? item.day : ""}
                  onChange={(e) => updateItem(index, "day", e.target.value)}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="text"
                  label="Precio"
                  value={
                    item.price !== 0
                      ? Number(item.price).toLocaleString("es-CO")
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, "");

                    updateItem(index, "price", rawValue);
                  }}
                />
              </Grid>

              <Grid item xs={6} md={6}>
                <Typography variant="h5">Subtotal: {item.subtotal}</Typography>
              </Grid>

              <Grid item xs={6} md={6}>
                <Button
                  variant="danger"
                  onClick={() => removeItem(index)}
                  fullWidth
                  sx={{ flex: 1, whiteSpace: "nowrap" }}
                >
                  Eliminar Ítem {index + 1}
                </Button>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Button
              variant="success"
              onClick={addNewItem}
              fullWidth
              sx={{
                py: 1.5,
              }}
            >
              Agregar Ítem
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                backgroundColor:
                  theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
              }}
            >
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">Subtotal</Typography>

                <Typography variant="subtitle1">{subtotal}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">IVA (19%)</Typography>

                <Typography variant="subtitle1">
                  {(ivaNumero || 0).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">Depósito</Typography>

                <Typography variant="subtitle1">
                  {Number(formValues.valorDeposito || 0).toLocaleString(
                    "es-CO",
                    {
                      style: "currency",
                      currency: "COP",
                    },
                  )}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">Transporte</Typography>

                <Typography variant="subtitle1">
                  {Number(formValues.valorTransporte || 0).toLocaleString(
                    "es-CO",
                    {
                      style: "currency",
                      currency: "COP",
                    },
                  )}
                </Typography>
              </Box>

              <Box
                display="flex"
                justifyContent="space-between"
                mt={2}
                pt={2}
                sx={{
                  borderTop: "1px dashed #999",
                }}
              >
                <Typography variant="h5" fontWeight="bold">
                  TOTAL
                </Typography>

                <Typography variant="h5" fontWeight="bold">
                  {total}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
