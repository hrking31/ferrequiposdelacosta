import { useDispatch } from "react-redux";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import Logos from "../../assets/LogoFerrequipos.png";
import { useNavigate } from "react-router-dom";

export default function MenuAppBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:915px)");

  const handleLogoClick = () => {
    dispatch(clearSearchEquipo());
    navigate("/home");
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position={isSmallScreen ? "fixed" : "static"}
        sx={{
          top: isSmallScreen ? "auto" : 0,
          bottom: isSmallScreen ? 0 : "auto",
          boxShadow: theme.shadows[4],
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
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
                  ? // ? theme.palette.secondary.light
                    // : theme.palette.primary.light,
                    theme.palette.primary.light
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
                maxWidth: "clamp(150px, 25vw, 300px)",
                maxHeight: "clamp(40px, 5vw, 80px)",
              }}
            />
          </Box>

          <Typography
            variant="h1"
            sx={{
              flexGrow: 1,
              textAlign: "center",
            }}
          >
            {isSmallScreen ? "Ferrequipos" : "Ferrequipos De La Costa"}
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
