import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import PropTypes from "prop-types";
import { useDispatch, useSelector  } from "react-redux";
import { addToCart } from "../../Store/Slices/cartSlice.js";
import { Camion } from "../Camion/Camion.jsx";
import DatosClienteModal from "../DatosClienteModal/DatosClienteModal.jsx";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function KioskProductCardDetail({ product }) {
  const dispatch = useDispatch();
  const cliente = useSelector((state) => state.cliente);
  const items = useSelector((state) => state.cart.items);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(1);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(
    () => product?.variantes?.[0] ?? null,
  );
  const [modalAbierto, setModalAbierto] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [valorTemp, setValorTemp] = useState(1);

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const handleOpenModal = (type) => {
    setActiveModal(type);
    if (type === "days") {
      setValorTemp(days);
    } else if (type === "quantity") {
      setValorTemp(quantity);
    }
  };

  const handleCloseModal = () => setActiveModal(null);

  const handleSaveModal = () => {
    if (valorTemp < 1 || isNaN(valorTemp)) {
      setValorTemp(1);
      return;
    }

    if (activeModal === "days") {
      setDays(valorTemp);
    } else if (activeModal === "quantity") {
      setQuantity(valorTemp);
    }

    handleCloseModal();
  };

  const handleAgregarAlCarrito = () => {
    const datosClienteVacios =
      ["nombre", "identificacion", "tipo"].every(
        (campo) => (cliente[campo] ?? "").trim() === ""
      ) &&
      (cliente.direccion && typeof cliente.direccion === "object"
        ? Object.values(cliente.direccion).every(
            (v) => (v ?? "").trim?.() === ""
          )
        : true);

    if (datosClienteVacios) {
      setModalAbierto(true);
    } else {
      handleAdd();
    }
  };

  const handleAdd = () => {
    const lineId = varianteSeleccionada
      ? `${product.id}-${varianteSeleccionada}`
      : product.id;
    const newItem = { ...product, quantity, days, varianteSeleccionada, lineId };
    const exists = items.some((item) => item.lineId === lineId);

    if (!exists) {
      dispatch(addToCart(newItem));
      showSnackbar("Producto agregado al carrito", "success");
    } else {
      showSnackbar("El producto ya está en el carrito", "warning");
    }
  };

  const handleIncrement = (setValue, value) => () => setValue(value + 1);
  const handleDecrement = (setValue, value) => () =>
    setValue(value > 1 ? value - 1 : 1);

  const ControlBox = ({ type, value, setValue }) => (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          onClick={handleDecrement(setValue, value)}
          disableRipple
          sx={{
            minWidth: { xs: 28 },
            height: { xs: 28 },
            borderRadius: "50%",
            padding: 0,
            minHeight: 0,
            backgroundColor: "transparent",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <Remove
            sx={{
              color:
                theme.palette.mode === "light"
                  ? theme.palette.primary.main
                  : theme.palette.secondary.light,
            }}
          />
        </Button>

        <Typography
          variant="body2"
          onClick={() => handleOpenModal(type)}
          sx={{ width: 32, textAlign: "center" }}
        >
          {value}
        </Typography>

        <Button
          onClick={handleIncrement(setValue, value)}
          disableRipple
          sx={{
            minWidth: { xs: 28 },
            height: { xs: 28 },
            padding: 0,
            backgroundColor: "transparent",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <Add
            sx={{
              color:
                theme.palette.mode === "light"
                  ? theme.palette.primary.main
                  : theme.palette.secondary.light,
            }}
          />
        </Button>
      </Stack>
    </Box>
  );

  ControlBox.propTypes = {
    type: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    setValue: PropTypes.func.isRequired,
  };

  if (!product) return null;

  return (
    <Box sx={{ p: 2 }}>
      {product.variantes && product.variantes.length > 0 && (
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {product.varianteNombre || "Variante"}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
          >
            {product.variantes.map((variante) => (
              <Chip
                key={variante}
                label={variante}
                clickable
                onClick={() => setVarianteSeleccionada(variante)}
                variant={
                  varianteSeleccionada === variante ? "filled" : "outlined"
                }
                sx={{
                  ...(varianteSeleccionada === variante && {
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.main
                        : theme.palette.secondary.light,
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.contrastText
                        : theme.palette.warning.contrastText,
                  }),
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {product.textoExtra && product.textoExtra.trim() !== "" && (
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {product.textoExtra}
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={4} sx={{ mb: 4 }} justifyContent="center">
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Días
          </Typography>

          <Box
            sx={{
              border: "1px solid",
              borderRadius: 2,
              px: 1.5,
              minHeight: 10,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ControlBox
              value={days}
              setValue={setDays}
              type="days"
              handleOpenModal={handleOpenModal}
            />
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Cantidad
          </Typography>

          <Box
            sx={{
              border: "1px solid",
              borderRadius: 2,
              px: 1.5,
              minHeight: 10,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ControlBox
              value={quantity}
              setValue={setQuantity}
              type="quantity"
              handleOpenModal={handleOpenModal}
            />
          </Box>
        </Box>
      </Stack>

      <Box sx={{ textAlign: "center", pb: 2 }}>
        <>
          <Button variant="success" onClick={handleAgregarAlCarrito}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="button">Agregar al</Typography>
              <Camion
                size={isXs ? 28 : 38}
                color={
                  theme.palette.mode === "light"
                    ? theme.palette.primary.main
                    : theme.palette.secondary.light
                }
              />
            </Box>
          </Button>

          <DatosClienteModal
            modoAdmin
            open={modalAbierto}
            onClose={() => setModalAbierto(false)}
            onSuccess={() => {
              setModalAbierto(false);
              handleAdd();
            }}
          />
        </>
      </Box>

      <Dialog open={Boolean(activeModal)} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle>
          Editar {activeModal === "days" ? "dias" : "cantidad"}
        </DialogTitle>
        <DialogContent>
          <TextField
            type="number"
            inputProps={{ min: 1 }}
            value={valorTemp || ""}
            onChange={(e) => setValorTemp(Number(e.target.value))}
            label={activeModal === "days" ? "Dias" : "Cantidad"}
            variant="outlined"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="success" onClick={handleSaveModal} fullWidth>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}

KioskProductCardDetail.propTypes = {
  product: PropTypes.object,
};
