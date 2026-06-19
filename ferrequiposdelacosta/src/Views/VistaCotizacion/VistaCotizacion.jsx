import {
  Box,
  Grid,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ref, update, push } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";
import { useAuth } from "../../Context/AuthContext";
import { resetCotizacion } from "../../Store/Slices/cotizacionSlice";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cotizacion.value);
  const { name, photoURL, role, genero, permisos } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);
  const cambiarEstadoFirebase = async (
    nuevoEstado,
    guardarCotizacion = false,
  ) => {
    try {
      if (values?.id) {
        const dataToUpdate = guardarCotizacion
          ? { ...values, status: nuevoEstado }
          : { status: nuevoEstado };

        await update(ref(database, `cotizaciones/${values.id}`), dataToUpdate);

        return;
      }

      if (guardarCotizacion) {
        const quotationRef = push(ref(database, "cotizaciones"));

        const newQuotation = {
          ...values,
          id: quotationRef.key,
          status: nuevoEstado,
          cotizacionId: `COT-${Date.now()}`,
          createdAt: Date.now(),
        };

        await update(quotationRef, newQuotation);
      }
    } catch (error) {
      console.error(`Error al cambiar estado a ${nuevoEstado}:`, error);
    }
  };

  const handleClick = async () => {
    setLoading(true);
    await cambiarEstadoFirebase("creada", true);
    VistaCotPdf(values);
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const clearForm = async () => {
    setLoading(true);
    await cambiarEstadoFirebase("pendiente");
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const handleMenu = async () => {
    setLoading(true);
    await cambiarEstadoFirebase("pausada", true);
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const handleLogout = async () => {
    setLoading(true);
    await cambiarEstadoFirebase("pendiente");
    dispatch(resetCotizacion());
    await logout();
    setLoading(false);
  };

  const telefono = `57${values.telefono}`;
  const message = encodeURIComponent(`
    Hola 👋

    Hemos preparado su cotización 📄

    Número: ${values.cotizacionId}

    En el PDF encontrará el detalle de equipos, tiempos y valores correspondientes.

    Quedamos atentos a cualquier ajuste o confirmación.

    FERREQUIPOS DE LA COSTA

    Gracias 🙏
`);

  const whatsappLink = `https://wa.me/${telefono}?text=${message}`;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 2,
        px: { xs: 2, sm: 3 },
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal
          name={name}
          photoURL={photoURL}
          role={role}
          genero={genero}
          vista={"Crea una Cotización"}
          cotId={values.cotizacionId}
        />
      </Box>

      <Box
        sx={{
          mb: 2,
          //  border: "2px solid red"
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Cotizacion />
          </Grid>
          <Grid item xs={12} md={6}>
            <VistaCotWeb />
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          mb: 2,
          // border: "2px solid red"
        }}
      >
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={10} sm={4} md={4}>
            <Button
              variant="success"
              fullWidth
              sx={{ flex: 1, whiteSpace: "nowrap" }}
              onClick={handleClick}
              component="a"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {loading ? "Cargando..." : "Descargar PDF"}
            </Button>
          </Grid>

          <Grid item xs={10} sm={4} md={4}>
            <Button variant="danger" onClick={clearForm} fullWidth>
              Cancelar o Pendiente
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          p: 1.5,
          flexShrink: 0,
          // border: "2px solid red",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          // border="2px solid red"
        >
          <Button variant="contained" fullWidth onClick={handleMenu}>
            Pausar y Salir
          </Button>

          <Button onClick={handleLogout} variant="danger" fullWidth>
            CERRAR SESION
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
