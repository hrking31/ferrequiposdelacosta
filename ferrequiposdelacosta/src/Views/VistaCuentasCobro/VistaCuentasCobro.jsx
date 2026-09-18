import { Box, Stack, IconButton, Tooltip } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import ListaCuentasCobro from "../../Components/CuentaDeCobro/ListaCuentasCobro";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import {
  usePantallaCompacta,
  usePantallaBaja,
  useNavbarAbajo,
} from "../../Utils/pantalla";

export default function VistaCuentasCobro() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { name, photoURL, role, genero } = useSelector((state) => state.user);
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const isFullScreen = usePantallaCompacta();
  // El celular acostado: de alto quedan unos 390px y cada franja de aire pesa.
  const altoCorto = usePantallaBaja();
  // La franja de la barra de navegación, que se mueve solo por ancho.
  const navbarAbajo = useNavbarAbajo();

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // El aire va del lado en que esté la barra de navegación, no del
        // lado que diga la forma de la pantalla.
        pt: navbarAbajo ? 0 : { md: 8, lg: 9 },
        // Con la barra arriba, abajo no hay nada que esquivar: los 16px de
        // computador quedaban de aire muerto, y acostado el teléfono ese alto
        // se nota.
        pb: navbarAbajo ? { xs: 7, sm: 8 } : altoCorto ? 0.5 : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          px: 0,
          // EN EL CELULAR, 12px arriba y abajo: el mismo aire que deja el pie
          // con sus botones, así el contenido queda parejo entre los dos. En
          // el computador no hay pie y el encabezado respira un poco más.
          py: isFullScreen ? (altoCorto ? 0.5 : 1.5) : 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          "@media (min-width:916px)": { px: 2 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Cuentas de Cobro"}
            descripcion={"Busca y reabre las cuentas de cobro emitidas"}
            icono={<ReceiptLongIcon />}
            compacto={isFullScreen}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Menú">
              <IconButton onClick={() => navigate("/adminforms")} color="primary">
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", mx: isFullScreen ? 0 : 2 }}>
        <ListaCuentasCobro />
      </Box>

      {/* Sin pie: en celular el botón de menú se mudó arriba, al lado del
          buscador, y ese renglón entero es ahora lista. */}
    </Box>
  );
}
