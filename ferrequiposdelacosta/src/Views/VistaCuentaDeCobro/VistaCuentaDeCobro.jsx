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
import { Box, Grid, Button, useTheme, useMediaQuery } from "@mui/material";

export default function VistaCuentaDeCobro() {
  const dispatch = useDispatch();
  const values = useSelector((state) => state.cuentacobro);
  const { logout } = useAuth();
  const theme = useTheme();
   const isFullScreen = useMediaQuery("(max-width:915px)");

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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pt: isFullScreen ? { xs: 1, sm: 1.5 } : 10,
        pb: isFullScreen ? { xs: 8, sm: 9 } : 1,
        pl: { xs: 1, sm: 1.5 },
        pr: { xs: 1, sm: 1.5 },
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <CuentaDeCobro />
          </Grid>
          <Grid item xs={12} md={6}>
            <VistaCcWeb />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <Grid container spacing={2} justifyContent="center">
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
      </Box>

      <Box sx={{ mb: 2 }}>
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
