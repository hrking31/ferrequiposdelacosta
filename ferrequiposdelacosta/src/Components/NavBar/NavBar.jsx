import { useDispatch } from "react-redux";
import {
  AppBar,
  Toolbar,
  Typography,
  Grid,
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
          bgcolor:
            theme.palette.mode === "light"
              ? theme.palette.primary.main
              : theme.palette.secondary.main,
          bottom: isSmallScreen ? 0 : "auto",
          top: isSmallScreen ? "auto" : 0,
          boxShadow: theme.shadows[4],
        }}
      >
        <Toolbar>
          <Grid item>
            <Box onClick={handleLogoClick} sx={{ cursor: "pointer" }}>
              <img
                src={Logos}
                alt="logo"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  maxWidth: "clamp(250px, 90%, 600px)",
                  maxHeight: "clamp(40px, 5vw, 60px)",
                  // height: "auto",
                  filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 1))",
                }}
              />
            </Box>
          </Grid>
          {!isSmallScreen ? (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                flexGrow: 1,
                textAlign: "center",
                fontSize: {
                  xs: "1.5rem",
                  sm: "2rem",
                },
              }}
            >
              Ferrequipos De La Costa
            </Typography>
          ) : (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                flexGrow: 1,
                textAlign: "center",
                fontSize: {
                  xs: "1.5rem",
                  sm: "2rem",
                },
              }}
            >
              Ferrequipos
            </Typography>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
