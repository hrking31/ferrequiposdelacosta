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
  Container,
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
    updatedItem.quantity = Number(updatedItem.quantity) || 0;
    updatedItem.price = Number(updatedItem.price) || 0;
    updatedItem.subtotal = updatedItem.quantity * updatedItem.price;
    updatedItem.subtotal = updatedItem.subtotal.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    updatedItems[index] = updatedItem;
    dispatch(setItemsCc(updatedItems));
  };

  const calculateTotal = () => {
    const totalAmount = items.reduce(
      (total, item) =>
        total + (Number(item.quantity) || 0) * (Number(item.price) || 0),
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

  const removeItem = (index) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    dispatch(setItemsCc(updatedItems));
    calculateTotal();
  };
  

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  return (
    <Container>
      <Typography variant="h4" color="text.primary">
        Formulario Cuenta de Cobro
      </Typography>
      <Box component="form" sx={{ mt: 3 }}>
        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
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
                  sx: {
                    color: "#8B3A3A",
                  },
                }}
                InputProps={{
                  sx: {
                    color: "#8B3A3A",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "primary.main",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.light",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.dark",
                    },
                    "& input:-webkit-autofill": {
                      boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                      WebkitTextFillColor: theme.palette.text.primary,
                    },
                  },
                }}
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "primary.main",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.light",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.dark",
                    },
                    "& input:-webkit-autofill": {
                      boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                      WebkitTextFillColor: theme.palette.text.primary,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="text"
                name="nit"
                label="NIT"
                value={formatNit(formValues.nit)}
                onChange={handlerInputChange}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "primary.main",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.light",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.dark",
                    },
                    "& input:-webkit-autofill": {
                      boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                      WebkitTextFillColor: theme.palette.text.primary,
                    },
                  },
                }}
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "primary.main",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.light",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.dark",
                    },
                    "& input:-webkit-autofill": {
                      boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                      WebkitTextFillColor: theme.palette.text.primary,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="text"
                name="concepto"
                label="Por Concepto De"
                value={formValues.concepto}
                onChange={handlerInputChange}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "primary.main",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.light",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.dark",
                    },
                    "& input:-webkit-autofill": {
                      boxShadow: `0 0 0 1000px ${theme.palette.background.default} inset`,
                      WebkitTextFillColor: theme.palette.text.primary,
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          {items.map((item, index) => (
            <Grid container spacing={2} key={index} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  type="text"
                  label="Descripción"
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  InputLabelProps={{
                    shrink: true,
                    sx: {
                      display: "flex",
                      height: "100%",
                      color: "#8B3A3A",
                    },
                  }}
                  InputProps={{
                    sx: {
                      color: "#8B3A3A",
                    },
                  }}
                  margin="normal"
                  sx={{
                    mt: 1,
                    fontSize: "0.75rem",
                    "& .MuiInputBase-input": {
                      padding: "6px 12px",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "#00008B",
                      },
                      "&:hover fieldset": {
                        borderColor: "#4682B4",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#1E90FF",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                  InputLabelProps={{
                    shrink: true,
                    sx: {
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                      color: "#8B3A3A",
                    },
                  }}
                  InputProps={{
                    sx: {
                      color: "#8B3A3A",
                    },
                  }}
                  margin="normal"
                  sx={{
                    mt: 1,
                    fontSize: "0.75rem",
                    "& .MuiInputBase-input": {
                      padding: "6px 12px",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "#00008B",
                      },
                      "&:hover fieldset": {
                        borderColor: "#4682B4",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#1E90FF",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Precio"
                  value={item.price || ""}
                  onChange={(e) => updateItem(index, "price", e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    sx: {
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                      color: "#8B3A3A",
                    },
                  }}
                  InputProps={{
                    sx: {
                      color: "#8B3A3A",
                    },
                  }}
                  margin="normal"
                  sx={{
                    mt: 1,
                    fontSize: "0.75rem",
                    "& .MuiInputBase-input": {
                      padding: "6px 12px",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "#00008B",
                      },
                      "&:hover fieldset": {
                        borderColor: "#4682B4",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#1E90FF",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="danger"
                  color="error"
                  onClick={() => removeItem(index)}
                  fullWidth
                >
                  Eliminar Ítem
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Typography>Subtotal: {item.subtotal}</Typography>
              </Grid>
            </Grid>
          ))}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <Button
                variant="success"
                color="primary"
                onClick={addNewItem}
                fullWidth
              >
                Agregar Ítem
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="success"
                color="primary"
                onClick={calculateTotal}
                fullWidth
              >
                Calcular Total
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Total: {total}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
