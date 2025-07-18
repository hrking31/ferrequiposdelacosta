import { Link } from "react-router-dom";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useAuth } from "../../Context/AuthContext";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCotizacion,
  setItems,
  setTotal,
} from "../../Store/Slices/cotizacionSlice";
import { Box, Grid, Button, useTheme, useMediaQuery } from "@mui/material";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const values = useSelector((state) => state.cotizacion);
  const { logout } = useAuth();
  const theme = useTheme();
 const isFullScreen = useMediaQuery("(max-width:915px)");

  const clearForm = () => {
    dispatch(
      setFormCotizacion({
        empresa: "",
        direccion: "",
        nit: "",
        fecha: "",
      })
    );
    dispatch(setItems([]));
    dispatch(setTotal("0"));
  };

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
      <Box sx={{ mb: 2,
        //  border: "2px solid red"
          }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Cotizacion />
          </Grid>
          <Grid item xs={12} md={6}>
            <VistaCotWeb />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2, 
        // border: "2px solid red"
        }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={10} sm={4} md={4}>
            <PDFDownloadLink
              document={<VistaCotPdf values={values} />}
              fileName={`${values.value.empresa}.pdf`}
            >
              {({ loading }) => (
                <Button
                  variant="success"
                  fullWidth
                  sx={{ flex: 1, whiteSpace: "nowrap" }}
                >
                  {loading ? "Cargando..." : "Descargar PDF"}
                </Button>
              )}
            </PDFDownloadLink>
          </Grid>
          
          <Grid item xs={10} sm={4} md={4}>
            <Button variant="danger" onClick={clearForm} fullWidth>
              Cancelar
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 2,
        //  border: "2px solid red" 
         }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={5} md={5}>
            <Button
              component={Link}
              to="/adminforms"
              variant="contained"
              fullWidth
            >
              MENU
            </Button>
          </Grid>
          <Grid item xs={12} sm={5} md={5}>
            <Button
              onClick={handlerLogout}
              variant="danger"
              fullWidth
              sx={{ flex: 1, whiteSpace: "nowrap" }}
            >
              CERRAR SESION
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
