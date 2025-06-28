import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  Checkbox,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import {
  removeFromCart,
  updateQty,
  updateDays,
} from "../../Store/Slices/cartSlice.js";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Camion } from "../../Components/Camion/Camion.jsx";

const VistaCart = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedItems, setSelectedItems] = useState([]);
  const items = useSelector((state) => state.cart.items);
  const cliente = useSelector((state) => state.cliente);
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMediumScreen = useMediaQuery("(max-width:915px)");

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("cart", JSON.stringify({ items }));
    }
  }, [items]);

  const handleQtyChange = (id, quantity) => {
    if (quantity < 1) return;
    dispatch(updateQty({ id, quantity }));
  };

  const handleDaysChange = (id, days) => {
    if (days < 1) return;
    dispatch(updateDays({ id, days }));
  };

  const handleToggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    selectedItems.forEach((id) => {
      dispatch(removeFromCart(id));
    });
    setSelectedItems([]);
  };

  const message = encodeURIComponent(
    "👋 *Hola! Quiero alquilar los siguientes equipos:*\n\n" +
      `👤 *Nombre:* ${cliente.nombre}\n` +
      `🆔 *NIT/CC:* ${cliente.identificacion}\n` +
      `📍 *Dirección:* ${cliente.direccion}\n\n` +
      items
        .map(
          (item, index) =>
            `*${index + 1}.* 🛠 *${item.name}*\n` +
            `📦 Cantidad: ${item.quantity}\n` +
            `📅 Días: ${item.days}\n` +
            (item.images && item.images[0]?.url
              ? `🖼 Imagen: ${item.images[0].url}\n`
              : "") +
            `\n`
        )
        .join("") +
      "Gracias! 🙏"
  );

  const whatsappLink = `https://wa.me/573116576633?text=${message}`;

  return (
    <Box sx={{ p: 1.5, width: "100%", border: "2px solid red" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "2px solid red",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Camion
            cantidad={items.length}
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

        <Box
          display="flex"
          alignItems="center"
          justifyContent="flex-end"
          gap={1}
        >
          <LocationOnIcon />
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              paddingTop: "8px",
            }}
          >
            {cliente.direccion}
          </Typography>

          <IconButton
            color="error"
            onClick={handleDeleteSelected}
            disabled={selectedItems.length === 0}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          border: "2px solid red",
        }}
      >
        <Checkbox
          checked={selectedItems.length === items.length && items.length > 0}
          indeterminate={
            selectedItems.length > 0 && selectedItems.length < items.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedItems(items.map((item) => item.id));
            } else {
              setSelectedItems([]);
            }
          }}
        />
        <Typography variant="body2">
          {items.length} equipo en total {cliente.nombre}
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
                display: "flex",
                width: "80%",
                height: "120px",
                display: "flex",
                alignItems: "center",
                mb: 1,
                border: "2px solid red",
              }}
            >
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onChange={() => handleToggleSelect(item.id)}
              />

              <img
                src={item.images[0].url}
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  border: "2px solid red",
                }}
              />

              <Box
                display="flex"
                flexDirection={isMediumScreen ? "column" : "row"}
                alignItems="center"
                width="100%"
                height="100%"
                border="2px solid blue"
              >
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  width="40%"
                  height="100%"
                  border="2px solid red"
                  sx={{ p: 1 }}
                >
                  <Typography variant="subtitle1">{item.name}</Typography>
                </Box>

                <Box
                  width="40%"
                  height="100%"
                  display="flex"
                  flexDirection="row"
                  gap={2}
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid red"
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
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
                        gap: 2,
                      }}
                    >
                      <Button
                        onClick={() => handleDaysChange(item.id, item.days - 1)}
                        disabled={item.days <= 1}
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
                        <Remove
                          sx={{
                            color:
                              theme.palette.mode === "light"
                                ? theme.palette.primary.main
                                : theme.palette.secondary.light,
                          }}
                        />
                      </Button>

                      <Typography>{item.days}</Typography>

                      <Button
                        onClick={() => handleDaysChange(item.id, item.days + 1)}
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
                    </Box>
                  </Box>

                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
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
                        gap: 2,
                      }}
                    >
                      <Button
                        onClick={() =>
                          handleQtyChange(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
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
                        <Remove
                          sx={{
                            color:
                              theme.palette.mode === "light"
                                ? theme.palette.primary.main
                                : theme.palette.secondary.light,
                          }}
                        />
                      </Button>

                      <Typography>{item.quantity}</Typography>

                      <Button
                        onClick={() =>
                          handleQtyChange(item.id, item.quantity + 1)
                        }
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
                    </Box>
                  </Box>
                </Box>
                <Box
                  width="20%"
                  height="100%"
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid red"
                >
                  <Button
                    variant="danger"
                    onClick={() => dispatch(removeFromCart(item.id))}
                  >
                    Eliminar
                  </Button>
                </Box>
              </Box>
            </Box>
          ))}

          <Box display="flex" gap={2}>
            {/* Columna izquierda: lista de productos */}
            <Box flex={1}>
              {/* Aquí tu contenido del carrito que hace scroll */}
            </Box>

            {/* Columna derecha: resumen fijo */}
            <Box
              sx={{
                width: "300px",
                position: "sticky",
                top: "20px", // distancia desde la parte superior cuando se fija
                alignSelf: "flex-start", // importante si usas flexbox
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 2,
                bgcolor: "white",
                boxShadow: 2,
              }}
            >
              {/* Contenido del resumen */}
              <Typography variant="h6">Resumen del Pedido</Typography>
              <Typography>Total: $123.000</Typography>
              <Button
                variant="contained"
                color="success"
                fullWidth
                sx={{ mt: 2 }}
                href={`https://wa.me/573000000000?text=Hola%2C%20quiero%20finalizar%20mi%20pedido`}
                target="_blank"
              >
                Enviar por WhatsApp
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Button
              variant="whatsapp"
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
