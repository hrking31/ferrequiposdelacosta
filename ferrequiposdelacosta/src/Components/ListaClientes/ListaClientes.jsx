import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

const CLIENTES_MOCK = [
  {
    id: 1,
    nombre: "Alejandro Morales",
    telefono: "+57 301 234 5678",
    estado: "activo",
  },
  {
    id: 2,
    nombre: "Catalina Restrepo",
    telefono: "+57 312 987 6543",
    estado: "moroso",
  },
  {
    id: 3,
    nombre: "Julián Ramírez",
    telefono: "+57 300 111 2233",
    estado: "inactivo",
  },
  {
    id: 4,
    nombre: "Sandra Posada",
    telefono: "+57 315 444 5566",
    estado: "activo",
  },
  {
    id: 5,
    nombre: "Ricardo Gómez",
    telefono: "+57 310 555 1234",
    estado: "activo",
  },
  {
    id: 6,
    nombre: "Lucía Fernández",
    telefono: "+57 321 777 8899",
    estado: "moroso",
  },
];

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "activo", label: "Activos", color: "#81C784" },
  { valor: "moroso", label: "Morosos", color: "#E57373" },
  { valor: "inactivo", label: "Inactivos", color: "#9E9E9E" },
];

const ESTADO_INFO = {
  activo: { label: "Activo", chipColor: "success" },
  moroso: { label: "Moroso", chipColor: "error" },
  inactivo: { label: "Inactivo", chipColor: "default" },
};

const obtenerIniciales = (nombreCompleto) =>
  nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

export default function ListaClientes() {
  const theme = useTheme();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const acento =
    theme.palette.mode === "light"
      ? theme.palette.primary.main
      : theme.palette.secondary.light;

  const avatarBgPorEstado = {
    activo: theme.palette.success.main,
    moroso: theme.palette.error.main,
    inactivo:
      theme.palette.mode === "light"
        ? theme.palette.grey[400]
        : theme.palette.grey[700],
  };

  const clientesFiltrados = useMemo(() => {
    return CLIENTES_MOCK.filter((cliente) => {
      const coincideEstado =
        filtroEstado === "todos" || cliente.estado === filtroEstado;
      const coincideBusqueda =
        cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        cliente.telefono.includes(busqueda);
      return coincideEstado && coincideBusqueda;
    });
  }, [busqueda, filtroEstado]);

  return (
    <Box
      sx={{
        width: "100%",
        mx: "auto",
        [theme.breakpoints.up("md")]: { width: "60%" },
      }}
    >
      <Stack spacing={2}>
        <TextField
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar clientes..."
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            sx: { borderRadius: 999 },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {FILTROS.map((filtro) => {
            const seleccionado = filtroEstado === filtro.valor;
            return (
              <Chip
                key={filtro.valor}
                clickable
                onClick={() => setFiltroEstado(filtro.valor)}
                label={filtro.label}
                icon={
                  filtro.color ? (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: filtro.color,
                        ml: "10px",
                      }}
                    />
                  ) : undefined
                }
                variant={seleccionado ? "filled" : "outlined"}
                sx={{
                  flexShrink: 0,
                  fontWeight: 600,
                  ...(seleccionado && {
                    bgcolor: acento,
                    color: theme.palette.getContrastText(acento),
                    "& .MuiChip-icon": { ml: "10px" },
                  }),
                }}
              />
            );
          })}
        </Stack>

        <Typography variant="h6" fontWeight="bold">
          Lista de Clientes
        </Typography>

        <Stack spacing={2}>
          {clientesFiltrados.map((cliente) => {
            const estadoInfo = ESTADO_INFO[cliente.estado];
            const numeroWhatsapp = cliente.telefono.replace(/\D/g, "");

            return (
              <Box
                key={cliente.id}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: 1,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: avatarBgPorEstado[cliente.estado],
                        width: 48,
                        height: 48,
                        fontWeight: "bold",
                      }}
                    >
                      {obtenerIniciales(cliente.nombre)}
                    </Avatar>

                    <Box>
                      <Typography fontWeight="bold">
                        {cliente.nombre}
                      </Typography>

                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PhoneIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {cliente.telefono}
                        </Typography>

                        <IconButton
                          size="small"
                          component="a"
                          href={`https://wa.me/${numeroWhatsapp}`}
                          target="_blank"
                          rel="noopener"
                          sx={{
                            bgcolor: "#25D366",
                            color: "#FFFFFF",
                            width: 22,
                            height: 22,
                            ml: 0.5,
                            "&:hover": { bgcolor: "#128C7E" },
                          }}
                        >
                          <WhatsAppIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Stack>

                  <Chip
                    label={estadoInfo.label}
                    color={estadoInfo.chipColor}
                    size="small"
                    sx={{ fontWeight: "bold", textTransform: "uppercase" }}
                  />
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ textAlign: "right" }}>
                  <Button
                    size="small"
                    endIcon={<ChevronRightIcon />}
                    sx={{ color: acento }}
                  >
                    Ver Detalles
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Stack>

      <Fab
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          bgcolor: acento,
          color: theme.palette.getContrastText(acento),
          "&:hover": { bgcolor: acento, opacity: 0.9 },
        }}
      >
        <PersonAddAlt1Icon />
      </Fab>
    </Box>
  );
}
