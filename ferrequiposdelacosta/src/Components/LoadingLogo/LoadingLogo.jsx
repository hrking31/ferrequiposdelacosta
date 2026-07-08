import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import "./loadingLogo.css";

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
      <Box
        className={`logo-container-industrial ${isDarkMode ? "dark-glow" : "light-glow"}`}
      >
        <CircularProgress
          size={160}
          thickness={2.5}
          sx={{
            color: isDarkMode ? "secondary.light" : "secondary.main",
            position: "absolute",
            animationDuration: "2.8s",
          }}
        />

        <img
          src={LogoFerrequipos}
          alt="Ferrequipos Logo"
          className="industrial-logo"
        />
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
