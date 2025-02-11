import { Link } from "react-router-dom";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import { useAuth } from "../../Context/AuthContext";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useSelector } from "react-redux";
import Button from '@mui/material/Button';
import { Box, Grid } from '@mui/material';

export default function VistaCuentaDeCobro() {
  const values = useSelector((state) => state.cuentacobro);
  const { logout } = useAuth();

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ minHeight: "100vh", padding: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <CuentaDeCobro />
        </Grid>
        <Grid item xs={12} md={6}>
          <VistaCcWeb />
        </Grid>
      </Grid>
      <Grid container spacing={2} justifyContent="center" sx={{ marginBottom: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <PDFDownloadLink
            document={<VistaCcPdf values={values} />}
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

