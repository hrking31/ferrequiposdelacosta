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
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import {
  obtenerFechaHoyBogota,
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

        // Solo los clientes que hay que cobrar, no los 200. El estado del
        // cliente es "la más urgente de sus facturas", y vencida y cobro son
        // justamente las dos más urgentes: pedir estos dos estados trae
        // EXACTAMENTE los clientes con alguna factura en seguimiento, ni uno
        // más ni uno menos. No es una aproximación.
        //
        // Esto se apoya en que el estado guardado sea confiable, y lo es desde
        // que lo mantiene el servidor (ver functions/index.js). Cuando lo
        // corregían las pantallas al abrirse no se podía hacer: un cliente
        // vencido anoche seguía marcado activo y habría quedado fuera de la
        // lista de cobros, que es el peor error posible acá.
        const clientesSnap = await getDocs(
          query(
            collection(db, "clientes"),
            where("estado", "in", ["vencida", "cobro"]),
          ),
        );
        const clientes = clientesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const hoy = obtenerFechaHoyBogota();

        // Esta pantalla no guarda nada: solo mira. El estado de cada factura
        // se calcula acá mismo, y del estado del CLIENTE —lo único que se
        // guarda— se encarga el servidor (ver ajustarTotalesPanel y
        // recalcularTotalesPanel en functions/index.js). Esta pantalla lo
        // corregía al abrirse, y esa era justamente la falla: si nadie entraba
        // acá, la lista de clientes mostraba estados viejos.
        const resultados = await Promise.all(
          clientes.map(async (cliente) => {
            // Y de cada uno, solo las facturas abiertas: una cerrada devolvió
            // todo y no debe nada, así que nunca puede estar en seguimiento.
            // Traerlas era pagar por facturas que el filtro de abajo iba a
            // descartar igual.
            const facturasSnap = await getDocs(
              query(
                collection(db, "clientes", cliente.id, "facturas"),
                where("factura.cerrada", "==", false),
              ),
            );
            const facturasAbiertas = facturasSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));

            const facturas = facturasAbiertas.filter((factura) =>
              facturaEnSeguimiento(factura, hoy),
            );
            // `facturas` son las que están en cartera, que es lo que la
            // tarjeta muestra. `facturasAbiertas` van igual porque el abono se
            // reparte entre TODAS las que tienen saldo, estén en cartera o no:
            // con las de cartera nada más, un cliente que entrega de más
            // dejaría sin tocar una factura vigente que también debe.
            return facturas.length > 0
              ? { cliente, facturas, facturasAbiertas }
              : null;
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
            {visibles.map(({ cliente, facturas, facturasAbiertas }) => (
              <ClienteSeguimientoCard
                key={cliente.id}
                cliente={cliente}
                facturas={facturas}
                facturasConSaldo={facturasAbiertas}
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
