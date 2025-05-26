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
import { Box, Grid , Button} from "@mui/material";

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
        spacing={2}
        justifyContent="center"
        sx={{ marginBottom: 4, mt: 2 }}
      >
        <Grid item xs={10} sm={2.8} md={2}>
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
        <Grid item xs={12} sm={3} md={3}>
          <Button variant="danger" onClick={clearForm} fullWidth>
            Cancelar
          </Button>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
          <Button
            component={Link}
            to="/adminforms"
            variant="contained"
            fullWidth
          >
            MENU
          </Button>
        </Grid>
        <Grid item xs={12} sm={3} md={3}>
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
  );
}
