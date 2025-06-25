import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  updateQty,
  updateDays,
} from "../../Store/Slices/cartSlice.js";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import Camion from "../../Components/Camion/Camion.jsx";

const VistaCart = () => {
  const theme = useTheme();
  const items = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const handleQtyChange = (id, quantity) => {
    if (quantity < 1) return;
    dispatch(updateQty({ id, quantity }));
  };

  const handleDaysChange = (id, days) => {
    if (days < 1) return;
    dispatch(updateDays({ id, days }));
  };

  const message = encodeURIComponent(
    "Hola, quiero alquilar los siguientes equipos:\n\n" +
      items
        .map((item) => `${item.quantity}  ${item.name} por ${item.days} días`)
        .join("\n")
  );

  const whatsappLink = `https://wa.me/573116576633?text=${message}`;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" gap={1}>
        <Camion
          size={isXs ? 28 : 38}
          color={
            theme.palette.mode === "light"
              ? theme.palette.primary.main
              : theme.palette.secondary.light
          }
        />
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            paddingTop: "8px", 
          }}
        >
          Ferrequipos.
        </Typography>
      </Box>

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
                <Box>
                  <Typography fontWeight="bold">Días</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() => handleDaysChange(item.id, item.days - 1)}
                      disabled={item.days <= 1}
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: "50%",
                        padding: 0,
                      }}
                    >
                      –
                    </Button>
                    <Typography>{item.days}</Typography>
                    <Button
                      variant="outlined"
                      onClick={() => handleDaysChange(item.id, item.days + 1)}
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: "50%",
                        padding: 0,
                      }}
                    >
                      +
                    </Button>
                  </Stack>
                </Box>

                <Box>
                  <Typography fontWeight="bold">Cantidad</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() =>
                        handleQtyChange(item.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: "50%",
                        padding: 0,
                      }}
                    >
                      –
                    </Button>
                    <Typography>{item.quantity}</Typography>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        handleQtyChange(item.id, item.quantity + 1)
                      }
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: "50%",
                        padding: 0,
                      }}
                    >
                      +
                    </Button>
                  </Stack>
                </Box>

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
