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
  Modal,
  TextField,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
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
  const [selectedItemsModal, setSelectedItemsModal] = useState([]);
  const [direccion, setDireccion] = useState(cliente.direccion);
  const [open, setOpen] = useState(false);
  const [openDay, setOpenDay] = useState(false);
  const [openQuantity, setOpenQuantity] = useState(false);
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:601px) and (max-width:915px)"
  );

  const handleOpen = () => {
    setDireccion(cliente.direccion);
    setOpen(true);
  };

  const handleOpenDay = (item) => {
    setSelectedItemsModal(item);
    setOpenDay(true);
  };

  const handleOpenQuantity = (item) => {
    setSelectedItemsModal(item);
    setOpenQuantity(true);
  };

  const handleClose = () => setOpen(false);
  const handleCloseDay = () => setOpenDay(false);
  const handleCloseQuantity = () => setOpenQuantity(false);

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
    setOpenQuantity(false);
  };

  const handleDaysChange = (id, days) => {
    if (days < 1) return;
    dispatch(updateDays({ id, days }));
    setOpenDay(false);
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

  let appBarHeight = 64;

  if (isSmallScreen) {
    appBarHeight = 55;
  } else if (isMediumScreen) {
    appBarHeight = 64;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        pt: isFullScreen ? 1 : 11,
        pb: isFullScreen ? `${appBarHeight}px` : 0,
        pl: { xs: 1, sm: 1.5 },
        pr: !isFullScreen ? "260px" : 1,
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
            <LocationOnIcon />
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
              <Button variant="contained" onClick={handleGuardar} fullWidth>
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
            m: 0,
            mr: 1,
            minWidth: 0,
            minHeight: 0,
          }}
        />
        <Typography variant="body2">
          {items.length} Equipo en Total {cliente.nombre}
        </Typography>
      </Box>

      <Box
        sx={
          {
            // width: "100%",
            // border: "2px solid green",
          }
        }
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
                        m: 0,
                        mr: 1,
                        minWidth: 0,
                        minHeight: 0,
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
                        variant="subtitle1"
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
                          onClick={() => handleOpenDay(item)}
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
                        variant="subtitle1"
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
                          onClick={() => handleOpenQuantity(item)}
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

            {isFullScreen && (
              <Box>
                <Divider sx={{ m: 1 }} />
                <Box
                  sx={{
                    flexGrow: 1,
                    p: 1,
                    // border: "2px solid red",
                  }}
                >
                  <FormLabel variant="body2" sx={{ mt: 2, ml: 1 }}>
                    Tipo de Transporte
                  </FormLabel>
                </Box>

                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 2,
                    p: 1,
                    mb: 4,
                    // border: "2px solid red",
                  }}
                >
                  <RadioGroup
                    value={tipoTransporte}
                    onChange={(e) => setTipoTransporte(e.target.value)}
                    row
                    sx={{ gap: 2 }}
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

                  <Button
                    variant="whatsapp"
                    startIcon={<WhatsAppIcon />}
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Confirmar Pedido
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {!isFullScreen && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "260px",
            height: "86vh",
            position: "fixed",
            top: "80px",
            right: "0px",
            zIndex: 1300,
            p: 2,
            bgcolor: theme.palette.background.paper,
            // border: "2px solid red",
          }}
        >
          <Typography variant="h3">Resumen del Pedido</Typography>
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
              </Box>
            ))}
          </Box>

          <Box>
            <Divider sx={{ m: 1 }} />

            <FormLabel variant="body2" sx={{ mt: 2 }}>
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
            >
              Confirmar Pedido
            </Button>
          </Box>
        </Box>
      )}

      <Modal open={openDay} onClose={handleCloseDay}>
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
            Editar dias
          </Typography>

          <TextField
            value={selectedItemsModal?.days || ""}
            onChange={(e) =>
              setSelectedItemsModal({
                ...selectedItemsModal,
                days: e.target.value,
              })
            }
            label="Dias"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={() =>
              handleDaysChange(
                selectedItemsModal?.id,
                Number(selectedItemsModal?.days)
              )
            }
            fullWidth
          >
            Guardar
          </Button>
        </Box>
      </Modal>

      <Modal open={openQuantity} onClose={handleCloseQuantity}>
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
            Editar cantidad
          </Typography>

          <TextField
            value={selectedItemsModal?.quantity || ""}
            onChange={(e) =>
              setSelectedItemsModal({
                ...selectedItemsModal,
                quantity: e.target.value,
              })
            }
            label="Cantidad"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={() =>
              handleQtyChange(
                selectedItemsModal?.id,
                Number(selectedItemsModal?.quantity)
              )
            }
            fullWidth
          >
            Guardar
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
