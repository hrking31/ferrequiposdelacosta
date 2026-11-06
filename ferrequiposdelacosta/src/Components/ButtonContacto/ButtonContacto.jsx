import { Box, Button, IconButton, useMediaQuery } from "@mui/material";
import { keyframes } from "@mui/system";
import WhatsApp from "@mui/icons-material/WhatsApp";
import LocalPhone from "@mui/icons-material/LocalPhone";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { abrirWhatsapp, TELEFONO_EMPRESA } from "../../Utils/whatsapp";

  const ActionButton = styled(Button)(({ theme }) => ({
    padding: theme.spacing(1.5, 1.5),
    borderRadius: theme.shape.borderRadius * 2,
    fontWeight: 600,
    margin: theme.spacing(1),
    textTransform: "none",
    boxShadow: theme.shadows[2],
    whiteSpace: "nowrap",
    "&:hover": {
      boxShadow: theme.shadows[4],
    },
    // En pantallas medianas la columna de la tienda es angosta (916 → unos
    // 213 px útiles) y "Cotiza con nosotros" pide 203 con el relleno de
    // siempre: con un poco menos a los lados cabe sin pegarse al borde
    // (2026-11-06).
    [theme.breakpoints.only("md")]: {
      padding: theme.spacing(1.5, 1),
      margin: theme.spacing(1, 0.5),
    },
  }));

export const WhatsAppButton = () => {
  return (
    <IconButton
      color="success"
      aria-label="Escribir por WhatsApp"
      onClick={() => abrirWhatsapp(TELEFONO_EMPRESA)}
      sx={(theme) => ({
        position: "fixed",
        zIndex: 1300,
        bottom: 75,
        right: 12,
        width: 60,
        height: 60,
        ...theme.botonWhatsappFlotante,
      })}
    >
      <WhatsApp fontSize="large" />
    </IconButton>
  );
};

export default function ButtonContacto({ width }) {
  const isMobile = useMediaQuery("(max-width:915px)");
  const bounce = isMobile
    ? keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translatex(0);
  }
  40% {
    transform: translatex(-6px);
  }
  60% {
    transform: translatex(-3px);
  }`
    : keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
  60% {
    transform: translateY(-3px);
  }`;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Box>
        {isMobile && (
          <ActionButton
            variant="contained"
            startIcon={<LocalPhone />}
            href="tel:+573116576633"
            sx={{
              width,
              backgroundColor: (theme) => theme.palette.custom.call.main,
              "&:hover": {
                backgroundColor: (theme) => theme.palette.custom.call.dark,
              },
            }}
          >
            Llama ahora
          </ActionButton>
        )}
        <ActionButton
          variant="contained"
          startIcon={<WhatsApp />}
          onClick={() => abrirWhatsapp(TELEFONO_EMPRESA)}
          sx={{
            backgroundColor: (theme) => theme.palette.custom.whatsapp.main,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.custom.whatsapp.dark,
            },
            width,
            animation: `${bounce} 2s infinite`,
          }}
        >
          Cotiza con nosotros
        </ActionButton>
      </Box>
    </Box>
  );
}

ButtonContacto.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
};
