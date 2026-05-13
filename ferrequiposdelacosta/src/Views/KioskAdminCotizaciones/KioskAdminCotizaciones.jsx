import {
  Box,
  Card,
  CardContent,
  Typography,
  Snackbar,
  Alert,
  Chip,
  Stack,
  Button,
} from "@mui/material";
import {
  setFormCotizacion,
  setItems,
  setTotal,
} from "../../Store/Slices/cotizacionSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { database } from "../../Components/Firebase/Firebase.js";
import { ref, onValue } from "firebase/database";

export default function KioskAdminCotizaciones() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [lastQuotation, setLastQuotation] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    const quotationsRef = ref(database, "cotizaciones");

    const unsubscribe = onValue(quotationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        const quotationsArray = Object.entries(data)
          .map(([id, value]) => ({
            id,
            ...value,
          }))
          .reverse();

        // detectar nueva cotización
        if (initialized.current) {
          const newest = quotationsArray[0];
          if (newest && newest.id !== lastQuotation?.id) {
            setLastQuotation(newest);
            setOpenSnackbar(true);
            // sonido
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
          }
        }

        initialized.current = true;

        setCotizaciones(quotationsArray);
      }
    });

    return () => unsubscribe();
  }, [lastQuotation]);

  const handleOpenQuotation = (quotation) => {
    const itemsFormatted = quotation.equipos.map((equipo) => ({
      description: equipo.name,
      quantity: equipo.quantity,
      day: equipo.days,
      price: 0,
      subtotal: 0,
    }));

    dispatch(
      setFormCotizacion({
        fecha: new Date().toISOString().split("T")[0],
        nit: quotation.cliente?.identificacion || "",
        empresa: quotation.cliente?.nombre || "",
        direccion: quotation.cliente?.direccion?.detalle || "",
        transporte: quotation.transporte || "Sin transporte",
        valorTransporte: quotation.valorTransporte || 0,
      }),
    );

    dispatch(setItems(itemsFormatted));
    dispatch(setTotal("$0"));
    navigate("/vistacotizacion");
  };

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h4">Solicitudes de Cotizaciones</Typography>

      {cotizaciones.map((quotation) => (
        <Card key={quotation.id}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">
                {quotation.cliente?.nombre || "Cliente sin nombre"}
              </Typography>

              <Chip label={quotation.status} color="warning" />
            </Stack>

            <Typography>Transporte: {quotation.transporte}</Typography>

            <Typography sx={{ mt: 2 }}>Equipos:</Typography>

            {quotation.equipos?.map((equipo, index) => (
              <Box
                key={index}
                sx={{
                  pl: 2,
                  py: 0.5,
                }}
              >
                <Typography>{equipo.name}</Typography>

                <Typography variant="body2">
                  Cantidad: {equipo.quantity}
                </Typography>

                <Typography variant="body2">Días: {equipo.days}</Typography>
              </Box>
            ))}
          </CardContent>
          <Button
            variant="contained"
            onClick={() => handleOpenQuotation(quotation)}
          >
            Abrir Cotización
          </Button>
        </Card>
      ))}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert severity="success" variant="filled">
          Nueva solicitud de cotización recibida
        </Alert>
      </Snackbar>
    </Box>
  );
}
