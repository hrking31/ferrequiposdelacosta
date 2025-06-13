import { Link } from "react-router-dom";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import { useAuth } from "../../Context/AuthContext";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";
import { Box, Grid, Button } from "@mui/material";

export default function VistaCuentaDeCobro() {
  const dispatch = useDispatch();
  const values = useSelector((state) => state.cuentacobro);
  const { logout } = useAuth();

  const clearForm = () => {
    dispatch(
      setFormCuentaCobro({
        empresa: "",
        obra: "",
        concepto: "",
        nit: "",
        fecha: "",
      })
    );
    dispatch(setItemsCc([]));
    dispatch(setTotalCc("0"));
  };

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
      <Grid container justifyContent="center" sx={{ marginBottom: 4, mt: 2 }}>
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item xs={10} sm={4} md={4}>
            <PDFDownloadLink
              document={<VistaCcPdf values={values} />}
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
