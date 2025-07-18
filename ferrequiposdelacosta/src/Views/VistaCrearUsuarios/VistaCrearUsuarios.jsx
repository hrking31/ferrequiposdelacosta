import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Register from "../../Components/Register/Register";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";

export default function VistaCrearUsuarios() {
  const { name, genero } = useSelector((state) => state.user);
  const { logout } = useAuth();
  const theme = useTheme();
   const isFullScreen = useMediaQuery("(max-width:915px)");

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

 
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pt: isFullScreen ? { xs: 1, sm: 1.5 } : 10,
        pb: isFullScreen ? { xs: 8, sm: 9 } : 1.5,
        pl: { xs: 1, sm: 1.5 },
        pr: { xs: 1, sm: 1.5 },
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >

      <Box sx={{ flexGrow: 1, p: 1, 
        // border: "2px solid red"
         }}>
        <Typography variant="h5" >
          {saludo} {name}.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, p: 1, 
        // border: "2px solid red" 
        }}>
        <Register />
      </Box>

      <Box sx={{ p: 2,
        //  border: "2px solid red" 
         }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              component={Link}
              to="/adminforms"
              variant="contained"
              fullWidth
            >
              MENU
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Button onClick={handlerLogout} variant="danger" fullWidth>
              CERRAR SESIÓN
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
