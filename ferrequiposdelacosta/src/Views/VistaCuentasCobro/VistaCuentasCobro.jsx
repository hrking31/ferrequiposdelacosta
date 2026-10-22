import { Box } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useSelector } from "react-redux";
import ListaCuentasCobro from "../../Components/CuentaDeCobro/ListaCuentasCobro";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import { usePantallaCompacta, usePantallaBaja } from "../../Utils/pantalla";

export default function VistaCuentasCobro() {
  const { name, photoURL, role, genero } = useSelector((state) => state.user);
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const isFullScreen = usePantallaCompacta();
  // El celular acostado: de alto quedan unos 390px y cada franja de aire pesa.
  const altoCorto = usePantallaBaja();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // Sin barra de navegación (ver NavBar): ni arriba ni abajo hay que
        // dejarle hueco. En el celular, 12px hasta el borde, los mismos que
        // deja el encabezado arriba; acostado, 4, que cada franja de aire pesa.
        pb: altoCorto ? 0.5 : isFullScreen ? 1.5 : 2,
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
        {/* El logo de la tienda va dentro del encabezado (conLogo), con ir
            a la tienda, al menú y cerrar sesión. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            vista={"Cuentas de Cobro"}
            descripcion={"Busca y reabre las cuentas de cobro emitidas"}
            icono={<ReceiptLongIcon />}
            compacto={isFullScreen}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", mx: isFullScreen ? 0 : 2 }}>
        <ListaCuentasCobro />
      </Box>

      {/* Sin pie: en celular el botón de menú se mudó arriba, al lado del
          buscador, y ese renglón entero es ahora lista. */}
    </Box>
  );
}
