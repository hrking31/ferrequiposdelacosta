import { Box, Typography, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import svgDelLogo from "../../assets/LogoFerrequipos.svg?raw";
import "./loadingLogo.css";

// EL LOGO QUE SE ARMA SOLO (pedido del dueño, 2026-11-06): la "C" azul se
// dibuja y se rellena, y la "f" roja cae, rebota y encaja. Las dos piezas se
// leen del MISMO SVG que usa toda la app —no hay una copia de los trazos acá—:
// si el logo cambia, esto cambia con él. El movimiento vive en loadingLogo.css.
const vistaDelLogo = svgDelLogo.match(/viewBox="([^"]+)"/)[1];
const [trazoC, trazoF] = [
  ...svgDelLogo.matchAll(/<path fill="([^"]+)"[^>]*?\sd="([^"]+)"/g),
].map(([, color, d]) => ({ color, d }));

const LoadingLogo = ({ height = "90vh", text = "Cargando..." }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height={height}
      width="100%"
      sx={{
        backgroundColor: "transparent",
        userSelect: "none",
      }}
    >
      <Box className="logo-container-industrial">
        <svg className="logo-armandose" viewBox={vistaDelLogo} role="img" aria-label="Ferrequipos Logo">
          {/* pathLength="1": el contorno mide 1 sin importar su largo real,
              así el dibujo se anima de 1 a 0 (ver .logo-c). */}
          <path className="logo-c" pathLength="1" fill={trazoC.color} fillRule="evenodd" d={trazoC.d} />
          <path className="logo-f" fill={trazoF.color} fillRule="evenodd" d={trazoF.d} />
        </svg>
      </Box>

      <Typography
        variant="h5"
        className={isDarkMode ? "shimmer-text-dark" : "shimmer-text-light"}
        sx={{
          fontWeight: 700,
          letterSpacing: "2px",
          textTransform: "uppercase",
          mb: 1.5,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
};

LoadingLogo.propTypes = {
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  text: PropTypes.string,
};

export default LoadingLogo;
