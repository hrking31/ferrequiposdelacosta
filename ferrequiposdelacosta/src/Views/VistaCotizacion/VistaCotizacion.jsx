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
import { Box, Grid, Button } from "@mui/material";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const values = useSelector((state) => state.cotizacion);
  const { logout } = useAuth();

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
    <Box sx={{ minHeight: "100vh", padding: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Cotizacion />
        </Grid>
        <Grid item xs={12} md={6}>
          <VistaCotWeb />
        </Grid>
      </Grid>
      <Grid
        container
        px={2}
        justifyContent="center"
        sx={{ marginBottom: 4, mt: 2 }}
      >
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
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
        <Grid
          container
          spacing={2}
          justifyContent="center"
          sx={{
            mt: 4,
            mb: {
              xs: 6,
              sm: 6,
              md: 6,
              lg: 0,
            },
          }}
        >
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
      </Grid>
    </Box>
  );
}
