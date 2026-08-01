import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";
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
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);
  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    // El NIT se guarda pelado —dígitos y el guion— y los puntos se ponen al
    // mostrarlo. Antes se guardaba el texto con puntos, o sea el formato
    // metido dentro del dato.
    const valorAGuardar = name === "nit" ? limpiarNit(value) : value;
    const updatedFormValues = { ...formValues, [name]: valorAGuardar };
    dispatch(setFormCuentaCobro(updatedFormValues));
  };

  // El subtotal de un ítem: cantidad x precio x días. Se guarda como NÚMERO.
  // Antes se guardaba el texto ya formateado ("$ 1.234.567"), y eso obligaba a
  // volver a interpretarlo para cualquier cuenta posterior. El formato se pone
  // recién al mostrarlo.
  const calcularSubtotal = (item) =>
    (Number(item.quantity) || 0) *
    (Number(item.price) || 0) *
    (Number(item.day) || 0);

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = calcularSubtotal(updatedItem);
    updatedItems[index] = updatedItem;
    dispatch(setItemsCc(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  const calculateTotalFrom = (updatedItems) => {
    const totalAmount = updatedItems.reduce(
      (total, item) => total + calcularSubtotal(item),
      0,
    );
    dispatch(setTotalCc(totalAmount));
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
    dispatch(setItemsCc([...items, newItem]));
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    dispatch(setItemsCc(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  return (
    // El aire de los costados es para el resplandor de los recuadros de ítem:
    // son 20px de sombra difusa y sin este margen el contenedor que scrollea
    // la recortaba contra el borde izquierdo.
    <Box mx="auto" display="flex" flexDirection="column" sx={{ px: 2 }}>
      <Box component="form">

        <Grid container spacing={2} sx={{ mt: { xs: 0, md: 1 } }}>
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
                  color: theme.palette.text.primary,
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
              value={formatearNit(formValues.nit)}
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
            key={index}
            display="flex"
            justifyContent="center"
            sx={{
              mt: 2,
              pb: 1,
              pt: 1,
              px: 1,
              // Resplandor de acento. Antes usaba un azul (#669BBC) que ya no
              // existe en la paleta; ahora se deriva del acento del tema.
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
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
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
                    los puntos de miles, y sin ellos un precio de seis cifras
                    se lee mal. Se guarda el número pelado. */}
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
                {/* Era un h5, del mismo tamaño que el título de la hoja, al
                    lado del botón de eliminar. Va con el acento del modo —azul
                    del logo de día, amarillo de noche— que es el mismo color
                    del resplandor del recuadro que lo rodea. */}
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
            <Button variant="contained" color="success" onClick={addNewItem} fullWidth>
              Agregar Ítem
            </Button>
          </Grid>

          <Grid item xs={12}>
            {/* La pizarra de totales, igual que en Cotización. El aspecto vive
                en el tema como la variante "totales"; acá solo va la fila.
                Una cuenta de cobro no desglosa IVA ni depósito, así que lleva
                un solo renglón: el total. */}
            <Paper variant="totales">
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
