import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Divider,
} from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  updateQty,
} from "../../Store/Slices/cartSlice.js";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

const VistaCart = () => {
  const items = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();

  const handleQtyChange = (id, quantity) => {
    if (quantity < 1) return;
    dispatch(updateQty({ id, quantity }));
  };

  const message = encodeURIComponent(
    "Hola, quiero alquilar los siguientes equipos:\n\n" +
      items
        .map((item) => `${item.quantity}  ${item.name} por ${item.days} días`)
        .join("\n")
  );

  const whatsappLink = `https://wa.me/573028446805?text=${message}`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🛒 Carrito Ferrequipos
      </Typography>

      {items.length === 0 ? (
        <Typography variant="body1">Tu carrito está vacío</Typography>
      ) : (
        <>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                mb: 2,
                p: 2,
                border: "1px solid #ccc",
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1">{item.name}</Typography>

              <Stack direction="row" spacing={2} alignItems="center" mt={1}>
                <TextField
                  type="number"
                  label="Cantidad"
                  size="small"
                  value={item.quantity}
                  onChange={(e) =>
                    handleQtyChange(item.id, parseInt(e.target.value))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: 100 }}
                />
                <TextField
                  type="number"
                  label="Días"
                  size="small"
                  value={item.days}
                  onChange={(e) =>
                    dispatch(
                      updateQty({
                        id: item.id,
                        quantity: item.quantity,
                        days: parseInt(e.target.value),
                      })
                    )
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: 100 }}
                />

                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => dispatch(removeFromCart(item.id))}
                >
                  Eliminar
                </Button>
              </Stack>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => dispatch(clearCart())}
            >
              Vaciar carrito
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Confirmar pedido por WhatsApp
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default VistaCart;
