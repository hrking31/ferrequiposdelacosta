import {
  Box,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { WhatsApp, LocalPhone } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

export const WhatsAppButton=() =>{
  return (
    <IconButton
      color="success"
      href="https://wa.me/+573116576633"
      sx={{
        position: "fixed",
        zIndex: 1300,
        bottom: 75,
        right: 12,
        background: "linear-gradient(135deg, #25D366, #128C7E)",
        color: "white",
        width: 60,
        height: 60,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 6px 8px rgba(0, 0, 0, 0.15)",
        },
        boxShadow: 3,
      }}
    >
      <WhatsApp fontSize="large" />
    </IconButton>
  );
}

export default function ButtonContacto() {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");

  const ActionButton = styled(Button)(({ theme }) => ({
    padding: theme.spacing(1.5, 3),
    borderRadius: theme.shape.borderRadius * 2,
    fontWeight: 600,
    margin: theme.spacing(1),
    textTransform: "none",
    boxShadow: theme.shadows[2],
    "&:hover": {
      boxShadow: theme.shadows[4],
    },
  }));

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
          <ActionButton
            variant="contained"
            startIcon={<LocalPhone />}
            href="tel:+573116576633"
            sx={{
              minWidth: 250,
              backgroundColor: "#34B7F1",
              "&:hover": { backgroundColor: "#269BD1" },
            }}
          >
            Llama ahora
          </ActionButton>
          <ActionButton
            variant="contained"
            startIcon={<WhatsApp />}
            href="https://wa.me/+573116576633"
            target="_blank"
            sx={{
              backgroundColor: "#25D366",
              "&:hover": { backgroundColor: "#128C7E" },
              minWidth: 250,
            }}
          >
            Cotiza con nosotros
          </ActionButton>
        </Box>
    </Box>
  );
}
