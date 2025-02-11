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
  IconButton,
  Container,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function CuentaCobro() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cuentacobro.value);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);

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

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  return (
    <Container>
      <Box component="form" sx={{ mt: 3 }}>
        <Typography variant="h4" gutterBottom color="#8B3A3A">
          Formulario Cuenta de Cobro
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
              name="obra"
              label="Obra"
              value={formValues.obra}
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
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="text"
              name="concepto"
              label="Por Concepto De"
              value={formValues.concepto}
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
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={calculateTotal}
              sx={{
                mt: 2,
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
            <Typography variant="h6" gutterBottom>
              Total: {total}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
