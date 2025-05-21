import { Link } from "react-router-dom";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import Button from "@mui/material/Button";
import { Box, Grid } from "@mui/material";

export default function VistaCotizacion() {
  const values = useSelector((state) => state.cotizacion);
  const { logout } = useAuth();

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
        <Grid item xs={12} sm={6} md={4}>
          <PDFDownloadLink
            document={<VistaCotPdf values={values} />}
            fileName={`${values.value.empresa}.pdf`}
          >
            {({ loading }) => (
              <Button variant="success" fullWidth>
                {loading ? "Cargando..." : "Descargar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </Grid>
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
            CERRAR SESION
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
