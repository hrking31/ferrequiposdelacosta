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
  Grid,
  Modal,
  TextField,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import {
  removeFromCart,
  updateQty,
  updateDays,
} from "../../Store/Slices/cartSlice.js";
import { actualizarDireccion } from "../../Store/Slices/clienteSlice";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Camion } from "../../Components/Camion/Camion.jsx";

export default function VistaCart() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const cliente = useSelector((state) => state.cliente);
  const [tipoTransporte, setTipoTransporte] = useState("soloIda");
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedItemsModal, setSelectedItemsModal] = useState(null);
  const [direccion, setDireccion] = useState(cliente.direccion);
  const [open, setOpen] = useState(false);
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const handleOpen = () => {
    setDireccion(cliente.direccion);
    setOpen(true);
  };

  const handleOpenModal = (item, type) => {
    setSelectedItemsModal(item);
    setActiveModal(type); 
  };

  const handleClose = () => setOpen(false);

  const handleGuardar = () => {
    dispatch(actualizarDireccion(direccion));
    localStorage.setItem(
      "datosCliente",
      JSON.stringify({
        ...cliente,
        direccion: direccion,
      })
    );
    setOpen(false);
  };

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

  const gruposPorDias = items.reduce((acc, item) => {
    const key = item.days;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const transporteLabel = {
    ida: "Solo ida",
    vuelta: "Solo vuelta",
    idaVuelta: "Ida y vuelta",
    no: "Sin transporte",
  };

  const transporte = transporteLabel[tipoTransporte] || "No especificado";

  const message = encodeURIComponent(
    "👋 *Hola! Quiero alquilar los siguientes equipos:*\n\n" +
      `👤 *Nombre:* ${cliente.nombre}\n` +
      `🆔 *NIT/CC:* ${cliente.identificacion}\n` +
      `📍 *Dirección:* ${cliente.direccion}\n` +
      `🚚 *Transporte:* ${transporte}\n\n` +
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          pt: isFullScreen ? { xs: 1, sm: 1.5 } : 9.5,
          pl: { xs: 1, sm: 1.5 },
          pr: !isFullScreen ? "260px" : { xs: 1, sm: 1.5 },
          // border: "2px solid red",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: isFullScreen && "column-reverse",
            justifyContent: "space-between",
            // border: "2px solid red",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              gap: 1,
              // border: "2px solid red",
            }}
          >
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
              justifyContent: "flex-end",
              gap: 1,
              // border: "2px solid red",
            }}
          >
            <IconButton disableRipple onClick={handleOpen}>
              <LocationOnIcon fontSize="small" />
              <Typography variant="body2">{cliente.direccion}</Typography>
            </IconButton>

            <Modal open={open} onClose={handleClose}>
              <Box
                sx={{
                  bgcolor: "background.paper",
                  p: 4,
                  width: { xs: 350, sm: 400 },
                  borderRadius: 2,
                  mx: "auto",
                  mt: "20vh",
                  boxShadow: 24,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Editar dirección
                </Typography>
                <TextField
                  fullWidth
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  label="Dirección"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Button variant="success" onClick={handleGuardar} fullWidth>
                  Guardar
                </Button>
              </Box>
            </Modal>

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
            pb: 2,
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
            sx={{
              p: { xs: 0.5, md: 1.5, sm: 2 },
              mr: 1,
            }}
          />
          <Typography variant="body1">
            {items.length} Equipo en Total {cliente.nombre}
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
                  width: "100%",
                  height: isSmallScreen ? "100px" : "120px",
                  alignItems: "center",
                  mb: 4,
                  // border: "2px solid blue",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                    // border: "2px solid yellow",
                  }}
                >
                  {isFullScreen && (
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      icon={<RadioButtonUncheckedIcon fontSize="small" />}
                      checkedIcon={<CheckCircleIcon fontSize="small" />}
                      sx={{
                        p: { xs: 0.5, sm: 1.5 },
                        mr: 1,
                      }}
                    />
                  )}

                  <img
                    src={item.images[0].url}
                    style={{
                      width: isSmallScreen ? "100px" : "120px",
                      height: isSmallScreen ? "100px" : "120px",
                      objectFit: "cover",
                      // border: "2px solid red",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: isSmallScreen ? "column" : "row",
                    alignItems: "center",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    // border: "2px solid blue",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: isFullScreen ? { xs: "100%", sm: "40%" } : "30%",
                      height: "100%",
                      pl: 2,
                      // border: "2px solid yellow",
                    }}
                  >
                    <Typography
                      variant="body1"
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
                      width: isFullScreen ? { xs: "100%", sm: "60%" } : "50%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: isSmallScreen ? "center" : "space-evenly",
                      gap: isSmallScreen ? 2 : 3,
                      alignItems: "center",
                      p: 2,
                      // border: "2px solid red",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        mb: 1,
                        width: "100%",
                        // border: "2px solid yellow",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          mb: isFullScreen ? 0 : 1,
                        }}
                      >
                        Días
                      </Typography>

                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-evenly",
                          border: "1px solid",
                          borderRadius: 2,
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

                        <Typography
                          variant="body2"
                          onClick={() => handleOpenModal(item, "days")}
                          sx={{
                            minWidth: 28,
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                        >
                          {item.days}
                        </Typography>

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
                        width: "100%",
                        // border: "2px solid green",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          mb: isFullScreen ? 0 : 1,
                        }}
                      >
                        Cantidad
                      </Typography>

                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-evenly",
                          border: "1px solid",
                          borderRadius: 2,
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

                        <Typography
                          variant="body2"
                          onClick={() => handleOpenModal(item, "quantity")}
                          sx={{
                            minWidth: 28,
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                        >
                          {item.quantity}
                        </Typography>

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

                  {!isFullScreen && (
                    <Box
                      sx={{
                        width: "20%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 1,
                        // border:"2px solid red"
                      }}
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
          </>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: isFullScreen ? "flex-start" : "center",
          width: isFullScreen ? "100%" : "260px",
          height: isFullScreen ? "auto" : "86vh",
          position: isFullScreen ? "relative" : "fixed",
          top: isFullScreen ? "auto" : "80px",
          right: isFullScreen ? "auto" : "0px",
          zIndex: isFullScreen ? "auto" : "1300",
          pt: 1,
          pb: isFullScreen ? { xs: 9, sm: 9.5 } : 1,
          pl: 2,
          pr: 2,
          bgcolor: theme.palette.background.paper,
          // border: "2px solid red",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: theme.palette.custom.primary,
          }}
        >
          Resumen del Pedido
        </Typography>
        
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            // border: "2px solid red"
          }}
        >
          {Object.entries(gruposPorDias).map(([days, items]) => (
            <Box
              key={days}
              sx={{
                p: 1,
                // border: "1px solid #ccc",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Equipos para {days} días
              </Typography>

              {items.map((item) => (
                <Typography
                  variant="body2"
                  key={item.id}
                  sx={{
                    pl: 2,
                    fontSize: {
                      md: "0.675rem",

                    },
                  }}
                >
                  {item.quantity} _ {item.name}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            pb: 1,
          }}
        >
          <Divider sx={{ m: 1 }} />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Tipo de Transporte
          </Typography>

          <RadioGroup
            value={tipoTransporte}
            onChange={(e) => setTipoTransporte(e.target.value)}
            row
          >
            <Grid
              container
              spacing={1}
              justifyContent="center"
              maxWidth="600px"
              // border="1px solid #ccc"
            >
              <Grid item xs={6}>
                <FormControlLabel
                  value="ida"
                  control={<Radio />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: {
                          md: "0.675rem",
                        },
                      }}
                    >
                      Solo ida
                    </Typography>
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  value="vuelta"
                  control={<Radio />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: {
                          md: "0.675rem",
                        },
                      }}
                    >
                      Solo vuelta
                    </Typography>
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  value="idaVuelta"
                  control={<Radio />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: {
                          md: "0.675rem",
                        },
                      }}
                    >
                      Ida y vuelta
                    </Typography>
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  value="no"
                  control={<Radio />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: {
                          md: "0.675rem",
                        },
                      }}
                    >
                      Sin transporte
                    </Typography>
                  }
                />
              </Grid>
            </Grid>
          </RadioGroup>
        </Box>

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

      <Modal open={Boolean(activeModal)} onClose={() => setActiveModal(null)}>
        <Box
          sx={{
            bgcolor: "background.paper",
            p: 4,
            width: { xs: 350, sm: 400 },
            borderRadius: 2,
            mx: "auto",
            mt: "20vh",
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            {activeModal === "days" ? "Editar días" : "Editar cantidad"}
          </Typography>

          <TextField
            type="number"
            inputProps={{ min: 1 }}
            value={selectedItemsModal?.[activeModal] ?? ""}
            onChange={(e) =>
              setSelectedItemsModal((prev) => ({
                ...prev,
                [activeModal]: e.target.value,
              }))
            }
            label={activeModal === "days" ? "Días" : "Cantidad"}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={() => {
              const value = Number(selectedItemsModal?.[activeModal]);

              if (isNaN(value) || value < 1) return;

              if (activeModal === "days") {
                handleDaysChange(selectedItemsModal.id, value);
              } else if (activeModal === "quantity") {
                handleQtyChange(selectedItemsModal.id, value);
              }

              setActiveModal(null);
              setSelectedItemsModal(null);
            }}
          >
            Guardar
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
