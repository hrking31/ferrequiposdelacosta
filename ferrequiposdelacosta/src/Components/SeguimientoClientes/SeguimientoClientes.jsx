import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
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
import {
  usePantallaCompacta,
  usePantallaBaja,
} from "../../Utils/pantalla";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import DashboardIcon from "@mui/icons-material/Dashboard";
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
  // El mismo corte que usan las vistas para su encabezado y su pie. No sirve
  // el "sm" de MUI (600px): un celular ACOSTADO mide 740 y tomaba los valores
  // del computador, así que el aire de acá se agrandaba justo al girar.
  const navigate = useNavigate();
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const esCelular = usePantallaCompacta();
  // EL CELULAR ACOSTADO. De alto quedan unos 390px, y el buscador, los filtros
  // y el renglón del conteo se llevaban casi todo: a las tarjetas les quedaba
  // una franja donde no cabía ni una. Con la pantalla así de baja se desplaza
  // todo junto, encabezado incluido.
  const altoCorto = usePantallaBaja();
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

  const buscador = (
    <BuscadorFiltro
      value={busqueda}
      onChange={setBusqueda}
      placeholder="Buscar cliente..."
    />
  );

  const contador = (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
    >
      {/* En celular, solo "3 de 3": al lado izquierdo ya dice de qué lista
          se trata, así que la palabra sobraba. En computador va sola y sí
          necesita decir de qué son. */}
      {visibles.length} de {clientesConSeguimiento.length}
      {esCelular ? "" : " clientes"}
    </Typography>
  );

  // Los tres filtros de tipo de cliente.
  const chipsTipo = (
    // En celular los tres se reparten el ancho de la pantalla: sueltos a la
    // izquierda dejaban un hueco vacío a la derecha y cada uno medía según el
    // largo de su palabra.
    <Stack
      direction="row"
      spacing={1}
      sx={{
        flexShrink: 0,
        ...(esCelular && { "& > *": { flex: 1, minWidth: 0 } }),
      }}
    >
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
        ...(altoCorto
          ? { overflowY: "auto" }
          : { display: "flex", flexDirection: "column" }),
      }}
    >
      {clientesConSeguimiento.length > 0 &&
        (esCelular ? (
          // EN CELULAR, TRES RENGLONES: el buscador con el botón de menú al
          // lado —que antes era un botón ancho al pie—, los filtros debajo y,
          // al final, qué lista es y cuántos se están viendo. Antes iban los
          // tres apilados sin orden, con el conteo en el medio.
          <Stack spacing={1} sx={{ mb: 1.5, flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
              <Tooltip title="Menú">
                <IconButton
                  onClick={() => navigate("/adminforms")}
                  aria-label="Menú"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            {chipsTipo}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ gap: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Lista de clientes
              </Typography>
              {contador}
            </Stack>
          </Stack>
        ) : (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {buscador}
            {contador}
            {chipsTipo}
          </Stack>
        ))}

      {/* Acostado el celular el scroll lo manda la caja de afuera, no esta:
          dos áreas que se desplazan, una dentro de la otra, se pelean el
          dedo. */}
      <Box
        sx={
          altoCorto ? undefined : { flex: 1, minHeight: 0, overflowY: "auto" }
        }
      >
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
