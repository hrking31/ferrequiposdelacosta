import { useDispatch, useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import Logos from "../../assets/LogoFerrequipos.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import CamionContador from "../../Components/Camion/Camion.jsx";
import { applyUpdateNow } from "../../pwaUpdate.js";

export default function MenuAppBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:915px)");
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isKioskMode = location.pathname.startsWith("/kiosk");
  const isEnHome = ["/", "/home"].includes(location.pathname.toLowerCase());
  const updateAvailable = useSelector(
    (state) => state.pwaUpdate.updateAvailable,
  );

  const handleLogoClick = () => {
    dispatch(clearSearchEquipo());
    if (isKioskMode) {
      navigate("/kioskhome");
    } else if (!user) {
      navigate("/home");
    } else if (isEnHome) {
      navigate("/adminforms");
    } else {
      navigate("/home?vistahome=si");
    }
  };

  const handlecartClick = () => {
    if (isKioskMode) {
      navigate("/kioskcart");
    } else {
      navigate("/vistacart");
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          top: isSmallScreen ? "auto" : 0,
          bottom: isSmallScreen ? 0 : "auto",
          boxShadow: theme.shadows[4],
          zIndex: theme.zIndex.drawer + 1,
          // border: "2px solid red",
        }}
      >
        <Toolbar
          sx={{
            minHeight: {
              xs: "56px !important",
              sm: "64px !important",
              lg: "72px !important",
            },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <Box
            onClick={handleLogoClick}
            sx={{
              cursor: "pointer",
              p: 0.5,
              borderRadius: 50,
              backgroundColor:
                theme.palette.mode === "light"
                  ? theme.palette.primary.light
                  : theme.palette.secondary.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={Logos}
              alt="logo"
              style={{
                display: "block",
                height: "clamp(32px, 3vw, 48px)",
                width: "auto",
              }}
            />
          </Box>

          <Typography
            variant="h1"
            component="div"
            sx={{
              flexGrow: 1,
              textAlign: "center",
            }}
          >
            {isSmallScreen ? "Ferrequipos" : "Ferrequipos De La Costa"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {updateAvailable && !isKioskMode && (
              <Tooltip title="Nueva versión disponible">
                <IconButton
                  onClick={applyUpdateNow}
                  sx={{
                    color:
                      theme.palette.mode === "light"
                        ? theme.palette.primary.light
                        : theme.palette.secondary.light,
                    animation: "pulseUpdateIcon 1.4s ease-in-out infinite",
                    "@keyframes pulseUpdateIcon": {
                      "0%, 100%": { transform: "scale(1)", opacity: 1 },
                      "50%": { transform: "scale(1.2)", opacity: 0.7 },
                    },
                  }}
                >
                  <SystemUpdateAltIcon fontSize={isXs ? "small" : "medium"} />
                </IconButton>
              </Tooltip>
            )}

            <IconButton
              onClick={handlecartClick}
              disableRipple
              sx={{
                cursor: "pointer",
                p: 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color:
                  theme.palette.mode === "light"
                    ? theme.palette.primary.light
                    : theme.palette.secondary.light,
                "&:hover": {
                  backgroundColor: "transparent",
                },
                "&:focus": {
                  outline: "none",
                },
              }}
            >
              <CamionContador size={isXs ? 28 : 38} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
