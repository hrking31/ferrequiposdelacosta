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
  useTheme,
} from "@mui/material";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cotizacion.value);
  const items = useSelector((state) => state.cotizacion.value.items);
  const { total, totalNumero } = useSelector((state) => state.cotizacion.value);
  const theme = useTheme();

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormCotizacion(updatedFormValues));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = updatedItem.quantity * updatedItem.price * updatedItem.day;
    updatedItem.subtotal = updatedItem.subtotal.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
    });
    updatedItems[index] = updatedItem;
    dispatch(setItems(updatedItems));
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
    dispatch(setTotal(totalAmountFormatted));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0 };
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
        <Typography variant="h4" color="text.primary">
          Formulario Cotización
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2, px: 1 }}>
          <Grid item xs={7} sm={6}>
            <TextField
              fullWidth
              type="date"
              name="fecha"
              label="Fecha"
              size="small"
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
          <Grid item xs={5} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label="NIT"
              size="small"
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
              name="empresa"
              label="Empresa"
              size="small"
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
              name="direccion"
              label="Dirección"
              size="small"
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
                  rows={2}
                  size="small"
                  label="Descripción"
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
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={item.quantity !== 0 ? item.quantity : ""}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                  size="small"
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
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Dias"
                  value={item.day !== 0 ? item.day : ""}
                  onChange={(e) => updateItem(index, "day", e.target.value)}
                  size="small"
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
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Precio"
                  value={item.price !== 0 ? item.price : ""}
                  onChange={(e) => updateItem(index, "price", e.target.value)}
                  size="small"
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
              <Grid item xs={6} md={6}>
                <Typography>Subtotal: {item.subtotal}</Typography>
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
            <Typography variant="h5">Total: {total}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
