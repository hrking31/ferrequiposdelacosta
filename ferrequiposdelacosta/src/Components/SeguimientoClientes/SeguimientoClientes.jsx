import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import LoadingLogo from "../LoadingLogo/LoadingLogo";

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

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
  const theme = useTheme();
  const acento =
    theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.secondary.light;
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [clientesConSeguimiento, setClientesConSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
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

  const busquedaLower = busqueda.trim().toLowerCase();

  const visibles = useMemo(
    () =>
      clientesConSeguimiento.filter(({ cliente }) => {
        const esEmpresa = cliente.tipo === "empresa";
        if (filtroTipo === "persona" && esEmpresa) return false;
        if (filtroTipo === "empresa" && !esEmpresa) return false;
        if (!busquedaLower) return true;
        const nombre = obtenerNombreCompleto(cliente).toLowerCase();
        const telefono = (cliente.telefono || "").toLowerCase();
        return nombre.includes(busquedaLower) || telefono.includes(busquedaLower);
      }),
    [clientesConSeguimiento, filtroTipo, busquedaLower],
  );

  if (loading) {
    return <LoadingLogo height="40vh" text="Cargando seguimiento de clientes..." />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {clientesConSeguimiento.length > 0 && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 3, flexShrink: 0 }}
        >
          <TextField
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: busqueda && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setBusqueda("")} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 999 },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              label="Todos"
              clickable
              onClick={() => setFiltroTipo("todos")}
              variant={filtroTipo === "todos" ? "filled" : "outlined"}
              sx={
                filtroTipo === "todos"
                  ? { bgcolor: acento, color: theme.palette.getContrastText(acento) }
                  : undefined
              }
            />
            <Chip
              icon={<PersonIcon sx={{ fontSize: 16 }} />}
              label="Personas"
              clickable
              onClick={() => setFiltroTipo("persona")}
              variant={filtroTipo === "persona" ? "filled" : "outlined"}
              sx={
                filtroTipo === "persona"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "& .MuiChip-icon": { color: "inherit" },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<BusinessIcon sx={{ fontSize: 16 }} />}
              label="Empresas"
              clickable
              onClick={() => setFiltroTipo("empresa")}
              variant={filtroTipo === "empresa" ? "filled" : "outlined"}
              sx={
                filtroTipo === "empresa"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "& .MuiChip-icon": { color: "inherit" },
                    }
                  : undefined
              }
            />
          </Stack>
        </Stack>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {clientesConSeguimiento.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            No hay clientes en seguimiento por el momento.
          </Typography>
        ) : visibles.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {busquedaLower
              ? "No se encontraron clientes con esa búsqueda."
              : "No hay clientes en seguimiento con este filtro."}
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
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
