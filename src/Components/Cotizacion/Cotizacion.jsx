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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cotizacion.value);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);

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

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box component="form" sx={{ mt: 3 }}>
        <Typography variant="h4" gutterBottom color="#8B3A3A">
          Formulario Cotización
        </Typography>
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
              type="text"
              name="empresa"
              label="Empresa"
              value={formValues.empresa}
              onChange={handlerInputChange}
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
              type="text"
              name="nit"
              label="NIT"
              value={formatNit(formValues.nit)}
              onChange={handlerInputChange}
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
              type="text"
              name="direccion"
              label="Dirección"
              value={formValues.direccion}
              onChange={handlerInputChange}
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
          {items.map((item, index) => (
            <Grid container spacing={2} key={index} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descripción"
                  value={item.description}
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
                  value={item.quantity !== 0 ? item.quantity : ""}
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
                  value={item.price !== 0 ? item.price : ""}
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
                <Typography>Subtotal: {item.subtotal}</Typography>
              </Grid>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={addNewItem}
              sx={{
                mt: 2,
                height: "45px",
                width: "200px",
                color: "#ffffff",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
              }}
              startIcon={<AddIcon />}
            >
              Agregar Ítem
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              color="primary"
              onClick={calculateTotal}
              sx={{
                height: "45px",
                color: "#ffffff",
                width: "200px",
                backgroundColor: "#1E90FF",
                "&:hover": {
                  backgroundColor: "#4682B4",
                },
              }}
            >
              Calcular Total
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">Total: {total}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
