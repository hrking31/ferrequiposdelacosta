import { Link } from "react-router-dom";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { useAuth } from "../../Context/AuthContext";
import { useState } from "react";
import { useSelector } from "react-redux";
import Button from "@mui/material/Button";
import { Box, Grid } from "@mui/material";

export default function VistaCotizacion() {
  const [verPdf, setVerPdf] = useState(false);
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
          {verPdf && (
            <PDFViewer style={{ width: "100%", height: "90vh" }}>
              <VistaCotPdf values={values} />
            </PDFViewer>
          )}
        </Grid>
      </Grid>
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{ marginBottom: 4 }}
      >
        <Grid item xs={12} sm={6} md={4}>
          <PDFDownloadLink
            document={<VistaCotPdf values={values} />}
            fileName={`${values.value.empresa}.pdf`}
          >
            {({ loading }) => (
              <Button
                variant="contained"
                fullWidth
                sx={{
                  height: "45px",
                  color: "#ffffff",
                  backgroundColor: "#1E90FF",
                  "&:hover": {
                    backgroundColor: "#4682B4",
                  },
                }}
              >
                {loading ? "Cargando..." : "Descargar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            component={Link}
            to="/admin"
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            MENU
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            onClick={handlerLogout}
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            CERRAR SESION
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
