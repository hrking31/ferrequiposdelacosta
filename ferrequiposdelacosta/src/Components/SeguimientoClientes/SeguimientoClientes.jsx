import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";

const obtenerFechaHoyBogota = () => {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-");
  return `${anio}-${mes}-${dia}`;
};

// Una factura entra a seguimiento cuando no está Finalizada y al menos un
// equipo ya llegó (o pasó) su fecha de vencimiento — o ya se le amplió el
// vencimiento o quedó indefinido: una vez que un equipo necesitó
// seguimiento, se queda en la lista hasta que la factura se finalice, no
// desaparece solo porque se le corrió la fecha.
const facturaEnSeguimiento = (factura, hoyIso) => {
  if (factura.estado === "finalizada") return false;
  if (!Array.isArray(factura.equipos)) return false;
  return factura.equipos.some(
    (equipo) =>
      typeof equipo === "object" &&
      ((equipo.fechaVencimiento && equipo.fechaVencimiento <= hoyIso) ||
        equipo.vencimientoIndefinido ||
        equipo.fechaVencimientoOriginal),
  );
};

export default function SeguimientoClientes() {
  const [tab, setTab] = useState(0);
  const [clientesConSeguimiento, setClientesConSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const fetchSeguimiento = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const clientesSnap = await getDocs(collection(db, "clientes"));
        const clientes = clientesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const hoy = obtenerFechaHoyBogota();

        const resultados = await Promise.all(
          clientes.map(async (cliente) => {
            const facturasSnap = await getDocs(
              collection(db, "clientes", cliente.id, "facturas"),
            );
            const facturas = facturasSnap.docs
              .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
              .filter((factura) => facturaEnSeguimiento(factura, hoy));
            return facturas.length > 0 ? { cliente, facturas } : null;
          }),
        );

        setClientesConSeguimiento(resultados.filter(Boolean));
      } catch (error) {
        console.error("Error al cargar seguimiento de clientes:", error);
        showSnackbar("Error al cargar el seguimiento de clientes", "error");
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [showSnackbar],
  );

  useEffect(() => {
    fetchSeguimiento();
  }, [fetchSeguimiento]);

  const handleCambiarEstadoFactura = async (clienteId, facturaId, nuevoEstado) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "clientes", clienteId, "facturas", facturaId), {
        estado: nuevoEstado,
      });
      batch.update(doc(db, "clientes", clienteId), { estado: nuevoEstado });
      await batch.commit();
      await fetchSeguimiento(true);
      showSnackbar("Estado de la factura actualizado.", "success");
    } catch (error) {
      showSnackbar(`Error al actualizar el estado: ${error.message}`, "error");
    }
  };

  const personas = useMemo(
    () => clientesConSeguimiento.filter((item) => item.cliente.tipo !== "empresa"),
    [clientesConSeguimiento],
  );
  const empresas = useMemo(
    () => clientesConSeguimiento.filter((item) => item.cliente.tipo === "empresa"),
    [clientesConSeguimiento],
  );

  const visibles = tab === 0 ? personas : empresas;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={tab}
        onChange={(_e, valor) => setTab(valor)}
        variant="fullWidth"
        TabIndicatorProps={{ sx: { bgcolor: "secondary.light" } }}
        sx={{
          mb: 3,
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiTab-root": { color: "text.secondary", fontWeight: 600 },
          "& .MuiTab-root.Mui-selected": { color: "secondary.light" },
        }}
      >
        <Tab label={`Personas ${personas.length}`} />
        <Tab label={`Empresas ${empresas.length}`} />
      </Tabs>

      {visibles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
          No hay {tab === 0 ? "personas" : "empresas"} en seguimiento por el momento.
        </Typography>
      ) : (
        <Stack spacing={2.5}>
          {visibles.map(({ cliente, facturas }) => (
            <ClienteSeguimientoCard
              key={cliente.id}
              cliente={cliente}
              facturas={facturas}
              hoy={obtenerFechaHoyBogota()}
              onCambiarEstado={handleCambiarEstadoFactura}
              onEquiposActualizados={() => fetchSeguimiento(true)}
            />
          ))}
        </Stack>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
