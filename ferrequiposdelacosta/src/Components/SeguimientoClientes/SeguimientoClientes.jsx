import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import {
  obtenerFechaHoyBogota,
  calcularEstadoCliente,
  facturaEnSeguimiento,
} from "../ClienteDetalle/facturaUtils";

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

export default function SeguimientoClientes() {
  const theme = useTheme();
  const acento =
    theme.palette.custom.accent;
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
        const batch = writeBatch(db);
        let huboCambios = false;

        const resultados = await Promise.all(
          clientes.map(async (cliente) => {
            const facturasSnap = await getDocs(
              collection(db, "clientes", cliente.id, "facturas"),
            );
            const todasLasFacturas = facturasSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));

            // El estado de cada factura se calcula, así que no hay nada que
            // corregir en ellas. Lo que sí puede quedar viejo es el del
            // CLIENTE, que se guarda para que la lista de clientes pueda
            // filtrar sin leer las facturas de todos: una factura que venció
            // sola —sin que nadie tocara nada— lo deja desactualizado. Esta
            // pantalla, que ya tiene todas las facturas en la mano, es el
            // lugar natural para ponerlo al día.
            const estadoCliente = calcularEstadoCliente(todasLasFacturas, hoy);
            if (estadoCliente !== cliente.estado) {
              batch.update(doc(db, "clientes", cliente.id), { estado: estadoCliente });
              huboCambios = true;
            }

            const facturas = todasLasFacturas.filter((factura) =>
              facturaEnSeguimiento(factura, hoy),
            );
            return facturas.length > 0 ? { cliente, facturas } : null;
          }),
        );

        if (huboCambios) await batch.commit();

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
          <BuscadorFiltro
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar cliente..."
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {visibles.length} de {clientesConSeguimiento.length} clientes
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              label="Todos"
              clickable
              onClick={() => setFiltroTipo("todos")}
              variant={filtroTipo === "todos" ? "filled" : "outlined"}
              sx={
                filtroTipo === "todos"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<PersonIcon />}
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
                      // Conserva su color: sin esto MUI le superpone un tinte
                      // al pasar el mouse y otro mientras tiene el foco.
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<BusinessIcon />}
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
                      // Conserva su color: sin esto MUI le superpone un tinte
                      // al pasar el mouse y otro mientras tiene el foco.
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
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
