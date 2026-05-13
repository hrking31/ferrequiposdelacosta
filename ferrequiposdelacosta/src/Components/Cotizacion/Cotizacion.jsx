import { useSelector, useDispatch } from "react-redux";
import {
  setFormCotizacion,
  setItems,
  setSubtotal,
  setTotal,
} from "../../Store/Slices/cotizacionSlice";
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
  useTheme,
} from "@mui/material";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cotizacion.value);
  const items = useSelector((state) => state.cotizacion.value.items);
  const subtotal = useSelector((state) => state.cotizacion.value.subtotal);
  const { total, totalNumero } = useSelector((state) => state.cotizacion.value);
  const theme = useTheme();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;

    const updatedFormValues = {
      ...formValues,
      [name]: value,
    };

    if (name === "transporte" && value === "Sin transporte") {
      updatedFormValues.valorTransporte = 0;
    }

    dispatch(setFormCotizacion(updatedFormValues));

    if (name === "valorTransporte" || name === "transporte") {
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
    const subtotal = updatedItems.reduce(
      (total, item) => total + item.quantity * item.price * item.day,
      0,
    );
    const subtotalFormatted = subtotal.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    dispatch(setSubtotal(subtotalFormatted));
    const transporte = Number(currentFormValues.valorTransporte) || 0;
    const totalAmount = subtotal + transporte;
    const totalAmountFormatted = totalAmount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });

    dispatch(setTotal(totalAmountFormatted));
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
        <Typography variant="h5">Formulario Cotización</Typography>

        <Grid container spacing={2} sx={{ mt: 2, px: 1 }}>
          <Grid item xs={7} sm={6}>
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
          <Grid item xs={5} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label="NIT"
              value={formatNit(formValues.nit)}
              onChange={handlerInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="empresa"
              label="Empresa"
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
            <FormControl fullWidth>
              <InputLabel>Transporte</InputLabel>

              <Select
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
              label="Valor transporte"
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
            <FormControl fullWidth>
              <InputLabel>IVA</InputLabel>

              <Select
                name="iva"
                value={formValues.iva ? "Sí" : "No"}
                label="IVA"
                onChange={(e) => {
                  handlerInputChange({
                    target: {
                      name: "iva",
                      value: e.target.value === "Sí",
                    },
                  });
                }}
              >
                <MenuItem value="No">Sin IVA</MenuItem>

                <MenuItem value="Sí">Con IVA</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {items.map((item, index) => (
          <Box
            key={item.id || index}
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
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Button variant="success" onClick={addNewItem} fullWidth>
              Agregar Ítem
            </Button>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="h5">Subtotal: {subtotal}</Typography>
            <Typography variant="h5">Total: {total}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
