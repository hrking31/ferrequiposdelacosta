import {
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
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
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Camion } from "../../Components/Camion/Camion.jsx";

const VistaCart = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedItems, setSelectedItems] = useState([]);
  const [tipoTransporte, setTipoTransporte] = useState("soloIda");
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
      `📍 *Dirección:* ${cliente.direccion}\n` +
      `🚚 *Transporte:* ${
        tipoTransporte === "idaVuelta" ? "Ida y vuelta" : "Solo ida"
      }\n\n` +
      items
        .map(
          (item, index) =>
            `*${index + 1}.* 🛠 *${item.name}*\n` +
            `📦 Cantidad: ${item.quantity}\n` +
            `📅 Días: ${item.days}\n`
        )
        .join("") +
      "Gracias! 🙏"
  );

  const whatsappLink = `https://wa.me/573116576633?text=${message}`;

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        p: 1,
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: isMediumScreen ? "100%" : "80%",
          justifyContent: "space-between",
          // border: "2px solid red",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <LocationOnIcon />
          <Typography
            variant="body2"
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
          width: isMediumScreen ? "100%" : "80%",
          p: 1,
          // border: "2px solid red",
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
          {items.length} Equipo en Total {cliente.nombre}
        </Typography>
      </Box>

      <Box
        sx={{
          width: isMediumScreen ? "100%" : "80%",
          // border: "2px solid green",
        }}
      >
        {items.length === 0 ? (
          <Typography variant="body1">Tu carrito está vacío</Typography>
        ) : (
          <>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  width: "100%",
                  height: isMediumScreen ? "100px" : "120px",
                  alignItems: "center",
                  mb: 1,
                  // border: "2px solid green",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                    // border="2px solid red"
                  }}
                >
                  {isMediumScreen && (
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      icon={<RadioButtonUncheckedIcon fontSize="small" />}
                      checkedIcon={<CheckCircleIcon fontSize="small" />}
                      sx={{
                        p: { xs: 0.5, sm: 1.5 },
                        m: 0,
                        minWidth: 0,
                        minHeight: 0,
                      }}
                    />
                  )}

                  <img
                    src={item.images[0].url}
                    style={{
                      width: isMediumScreen ? "100px" : "120px",
                      height: isMediumScreen ? "100px" : "120px",
                      objectFit: "cover",
                      // border: "2px solid red",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: isMediumScreen ? "column" : "row",
                    alignItems: "center",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    pl: { xs: 0, sm: 5 },
                    // border: "2px solid blue"
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: isMediumScreen ? "100%" : "40%",
                      height: "100%",
                      // border: "2px solid blue",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        width: "100%",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: isMediumScreen ? "100%" : "40%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "row",
                      gap: 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    // border="2px solid red"
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: isMediumScreen ? 0 : 1,
                        }}
                      >
                        Días
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid",
                          borderRadius: 2,
                          px: isMediumScreen ? "0" : "1.5",
                          minHeight: 10,
                          gap: 2,
                        }}
                      >
                        <Button
                          onClick={() =>
                            handleDaysChange(item.id, item.days - 1)
                          }
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
                          onClick={() =>
                            handleDaysChange(item.id, item.days + 1)
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

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: isMediumScreen ? 0 : 1,
                        }}
                      >
                        Cantidad
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid",
                          borderRadius: 2,
                          px: isMediumScreen ? "0" : "1.5",
                          minHeight: 10,
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
                  {!isMediumScreen && (
                    <Box
                      sx={{
                        width: "20%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      // border="2px solid red"
                    >
                      <Button
                        variant="danger"
                        onClick={() => dispatch(removeFromCart(item.id))}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
            {/* 
            <Divider sx={{ my: 2 }} />

            <Box spacing={2}>
              <Button
                variant="whatsapp"
                startIcon={<WhatsAppIcon />}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                Confirmar pedido por WhatsApp
              </Button>
            </Box> */}
          </>
        )}
      </Box>

      {!isMediumScreen && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "260px",
            height: "80vh",
            position: "fixed",
            top: "80px",
            right: "12px",
            zIndex: 1300,
            border: "1px solid #ccc",
            borderRadius: 2,
            p: 2,
            bgcolor: "white",
            boxShadow: 2,
            border: "2px solid red",
          }}
        >
          <Typography variant="h5">Resumen del Pedido</Typography>
          <Box
            sx={{
              flex: 1,
              mt: 1,
              overflowY: "auto",
              // border: "2px solid red"
            }}
          >
            {items.map((item, index) => (
              <Box key={index} mb={3}>
                <Typography variant="body2">
                  {item.quantity} {item.name} por {item.days} dias
                </Typography>
                {/* <Divider sx={{ my: 1 }} /> */}
              </Box>
            ))}
          </Box>

          <Box>
            <Divider sx={{ m: 1 }} />
            <FormLabel component="body2" sx={{ mt: 2 }}>
              Tipo de Transporte
            </FormLabel>

            <RadioGroup
              value={tipoTransporte}
              onChange={(e) => setTipoTransporte(e.target.value)}
              row
            >
              <FormControlLabel
                value="soloIda"
                control={<Radio />}
                label="Solo ida"
              />
              <FormControlLabel
                value="idaVuelta"
                control={<Radio />}
                label="Ida y vuelta"
              />
            </RadioGroup>
          </Box>

          <Box
            sx={{
              pt: 1,
              //  border: "2px solid red"
            }}
          >
            <Button
              variant="whatsapp"
              startIcon={<WhatsAppIcon />}
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
            >
              Confirmar Pedido
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VistaCart;
