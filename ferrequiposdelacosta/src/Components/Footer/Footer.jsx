import {
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { Instagram, Facebook, Email, Business } from "@mui/icons-material";

export default function Footer() {
  const isSmall = useMediaQuery("(max-width:600px)");

  return (
    <Box
      component="footer"
      sx={{
        textAlign: "center",
        mt: 6,
        pt: 4,
        pb: 1,
        backgroundColor: "#fff",
        borderTop: "1px solid #ddd",
        px: 2,
      }}
    >
      <Typography
        variant={isSmall ? "h6" : "h5"}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          fontWeight: 700,
          color: "#333",
        }}
      >
        <Business sx={{ color: "red" }} />
        Ferrequipos de la Costa
      </Typography>

      <Typography
        variant="subtitle2"
        sx={{
          color: "red",
          fontWeight: 500,
          fontSize: isSmall ? 13 : 16,
          mt: 0.5,
        }}
      >
        Alquiler de Equipos para Construcción
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Typography sx={{ color: "#666", fontSize: 13 }}>
          📍 Cra. 38 # 108-23, Barranquilla, Colombia
        </Typography>
        <Typography sx={{ color: "#666", fontSize: 13 }}>
          🕒 Lunes: 7:30 AM - 5:30 PM | Sábado: 7:30 AM - 12:00 PM
        </Typography>
      </Box>

      <Box
        sx={{
          mt: { xs: 0, md: 1 },
          display: "flex",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Tooltip title="Email">
          <IconButton
            href="mailto:ferrequipos07@hotmail.com"
            target="_blank"
            rel="noopener"
            sx={{ color: "#444" }}
          >
            <Email />
          </IconButton>
        </Tooltip>
        <Tooltip title="Instagram">
          <IconButton
            href="https://www.instagram.com/ferrequipos07?utm_source=qr&igsh=aGpqN2s4Y2h5ZmRi"
            target="_blank"
            rel="noopener"
            sx={{ color: "#444" }}
          >
            <Instagram />
          </IconButton>
        </Tooltip>
        <Tooltip title="Facebook">
          <IconButton
            href="https://www.facebook.com/share/19fZ91JWgg/"
            target="_blank"
            rel="noopener"
            sx={{ color: "#444" }}
          >
            <Facebook />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography sx={{ mt: { xs: 1, md: 2 }, color: "#999", fontSize: 10 }}>
        © {new Date().getFullYear()} Ferrequipos de la Costa. Todos los derechos
        reservados.
      </Typography>
    </Box>
  );
}
