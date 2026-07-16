import {
  Box,
  Grid,
  Stack,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ref, update, push } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";
import { useAuth } from "../../Context/useAuth";
import {
  resetCotizacion,
  setFormCotizacion,
} from "../../Store/Slices/cotizacionSlice";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cotizacion.value);
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!values.id && !values.cotizacionId) {
      dispatch(setFormCotizacion({ cotizacionId: `COT-${Date.now()}` }));
    }
  }, [values.id, values.cotizacionId, dispatch]);

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

        return { ...values, ...dataToUpdate };
      }

      if (guardarCotizacion) {
        const quotationRef = push(ref(database, "cotizaciones"));

        const newQuotation = {
          ...values,
          id: quotationRef.key,
          status: nuevoEstado,
          cotizacionId: values.cotizacionId || `COT-${Date.now()}`,
          createdAt: Date.now(),
        };

        await update(quotationRef, newQuotation);

        return newQuotation;
      }

      return values;
    } catch (error) {
      console.error(`Error al cambiar estado a ${nuevoEstado}:`, error);
      return values;
    }
  };

  const sinEquipos = !values.items.some(
    (item) =>
      item.description?.trim() && Number(item.quantity) > 0 && Number(item.price) > 0,
  );

  const handleClick = async () => {
    if (sinEquipos) return;

    setLoading(true);
    const cotizacionGuardada = await cambiarEstadoFirebase("creada", true);
    VistaCotPdf(cotizacionGuardada);
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

  const telefonoDigits = String(values.telefono || "").replace(/\D/g, "");
  const telefono = telefonoDigits.startsWith("57") ? telefonoDigits : `57${telefonoDigits}`;
  const sinTelefono = telefonoDigits.length === 0;
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
              href={sinEquipos || sinTelefono ? undefined : whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              disabled={sinEquipos}
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
