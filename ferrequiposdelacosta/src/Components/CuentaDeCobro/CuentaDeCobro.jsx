import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";

export default function CuentaCobro() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cuentacobro.value);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);
  const theme = useTheme();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormCuentaCobro(updatedFormValues));
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
    dispatch(setItemsCc(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  const calculateTotalFrom = (updatedItems) => {
    const totalAmount = updatedItems.reduce(
      (total, item) => total + item.quantity * item.price * item.day,
      0
    );
    const totalAmountFormatted = totalAmount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    dispatch(setTotalCc(totalAmountFormatted));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: "", price: "" };
    dispatch(setItemsCc([...items, newItem]));
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    dispatch(setItemsCc(updatedItems));
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
        <Typography variant="h5" color="text.primary">
          Formulario Cuenta de Cobro
        </Typography>

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
              name="obra"
              label="Obra"
              value={formValues.obra}
              onChange={handlerInputChange}
            />
          </Grid>

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
                  type="number"
                  label="Precio"
                  value={item.price !== 0 ? item.price : ""}
                  onChange={(e) => updateItem(index, "price", e.target.value)}
                />
              </Grid>

              <Grid item xs={6} md={6}>
                <Typography variant="h5">Subtotal: {item.subtotal}</Typography>
              </Grid>

              <Grid item xs={6} md={6}>
                <Button
                  variant="danger"
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
          <Grid item xs={6}>
            <Button variant="success" onClick={addNewItem} fullWidth>
              Agregar Ítem
            </Button>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="h5">Total: {total}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
