import { useSelector, useDispatch } from "react-redux";
import {
  setFormCotizacion,
  setItems,
  setTotal,
} from "../../Store/Slices/cotizacionSlice";
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Container,
  useTheme,
} from "@mui/material";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cotizacion.value);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);
  const theme = useTheme();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormCotizacion(updatedFormValues));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = updatedItem.quantity * updatedItem.price;
    updatedItem.subtotal = updatedItem.subtotal.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    updatedItems[index] = updatedItem;
    dispatch(setItems(updatedItems));
  };

  const calculateTotal = () => {
    const totalAmount = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    const totalAmountFormatted = totalAmount.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    dispatch(setTotal(totalAmountFormatted));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0 };
    dispatch(setItems([...items, newItem]));
  };

  const removeItem = (indexToRemove) => {
    const itemToRemove = items[indexToRemove];

    const subtotalNumber = Number(
      itemToRemove.subtotal
        .replace(/[^\d,-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    dispatch(setItems(updatedItems));

    const currentTotalNumber = Number(
      total
        .toString()
        .replace(/[^\d,-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    const newTotalNumber = currentTotalNumber - subtotalNumber;

    const newTotalFormatted = newTotalNumber.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });

    dispatch(setTotal(newTotalFormatted));
  };

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  return (
    <Container sx={{ mt: 2 }}>
      <Box component="form" sx={{ mt: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
          color="theme.palette.text.primary"
        >
          Formulario Cotización
        </Typography>
        <Grid container spacing={2} sx={{ mt: 4 }}>
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
                name="direccion"
                label="Dirección"
                value={formValues.direccion}
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
                  label={`Descripción ${index + 1}`}
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
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
                  type="number"
                  label={`Cantidad ${index + 1}`}
                  value={item.quantity !== 0 ? item.quantity : ""}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
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
                  type="number"
                  label={`Precio ${index + 1}`}
                  value={item.price !== 0 ? item.price : ""}
                  onChange={(e) => updateItem(index, "price", e.target.value)}
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
                <Typography>Subtotal: {item.subtotal}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="danger"
                  color="error"
                  onClick={() => removeItem(index)}
                  fullWidth
                >
                  Eliminar Ítem {index + 1}
                </Button>
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
            <Typography variant="h6">Total: {total}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
