import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { addToCart } from "../../Store/Slices/cartSlice.js";
import { Camion } from "../../Components/Camion/Camion.jsx";
import DatosClienteModal from "../DatosClienteModal/DatosClienteModal.jsx";

export default function ProductCardDetail({ product }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(1);
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [modalAbierto, setModalAbierto] = useState(false);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleAgregarAlCarrito = () => {
    const datos = localStorage.getItem("datosCliente");
    if (!datos) {
      setModalAbierto(true);
    } else {
      handleAdd();
    }
  };

  const handleAdd = () => {
    const newItem = { ...product, quantity, days };

    const storedCart = JSON.parse(localStorage.getItem("cart")) || {
      items: [],
    };

    const exists = storedCart.items.some((item) => item.id === newItem.id);

    if (!exists) {
      const updatedItems = [...storedCart.items, newItem];
      localStorage.setItem("cart", JSON.stringify({ items: updatedItems }));
      dispatch(addToCart(newItem));
      setSnackbarMessage("Producto agregado al carrito");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
    } else {
      setSnackbarMessage("El producto ya está en el carrito");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  };

  const handleIncrement = (setter, value) => () => setter(value + 1);
  const handleDecrement = (setter, value) => () =>
    setter(value > 1 ? value - 1 : 1);

  const ControlBox = ({ label, value, setValue }) => (
    <Box>
      <Typography variant="sustitle1" sx={{ mb: 1 }}>
        {label}
      </Typography>

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

        <Typography variant="sustitle1" sx={{ width: 32, textAlign: "center" }}>
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

  if (!product) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={4} sx={{ mb: 4 }} justifyContent="center">
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
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
            <ControlBox value={days} setValue={setDays} />
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
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
            <ControlBox value={quantity} setValue={setQuantity} />
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
            open={modalAbierto}
            onClose={() => {
              setModalAbierto(false);
              handleAdd();
            }}
          />
        </>
      </Box>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "&.MuiSnackbar-root": {
            top: "50% !important",
            left: "50% !important",
            transform: "translate(-50%, -50%)",
          },
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
