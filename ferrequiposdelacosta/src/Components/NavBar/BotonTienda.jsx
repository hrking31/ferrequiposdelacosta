import { useState } from "react";
import PropTypes from "prop-types";
import { ButtonBase, ListItemIcon, Menu, MenuItem, Tooltip } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import Logos from "../../assets/LogoFerrequipos.png";

// EL LOGO QUE LLEVA A LA TIENDA (2026-10-20), para las vistas internas que ya
// no tienen la barra de arriba. Es el mismo gesto que el logo de la barra —el
// equipo ya sabe que tocarlo lleva a la tienda— y además le devuelve la marca
// a la pantalla.
//
// CON `onCerrarSesion` (2026-10-21) no va directo: abre un menú con las dos
// salidas, ir a la tienda y cerrar sesión. Es como va en el encabezado del
// menú en el celular, donde el logo ocupa el lugar del botón de salir.
//
// CON `onIrAlMenu` (2026-10-22, solo en computador) suma "Ir al menú" entre
// las dos: el botón suelto del menú se fue del encabezado y vive acá.
//
// `vistahome=si` es lo que deja ver la tienda con la sesión abierta: sin eso,
// el inicio manda al usuario de vuelta al menú.
export default function BotonTienda({ alto = 40, onCerrarSesion, onIrAlMenu }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [ancla, setAncla] = useState(null);
  const conMenu = Boolean(onCerrarSesion);

  const irALaTienda = () => {
    dispatch(clearSearchEquipo());
    navigate("/home?vistahome=si");
  };

  const elegir = (accion) => () => {
    setAncla(null);
    accion();
  };

  return (
    <>
      <Tooltip title={conMenu ? "Tienda y sesión" : "Ir a la tienda"}>
        <ButtonBase
          onClick={conMenu ? (e) => setAncla(e.currentTarget) : irALaTienda}
          aria-label={conMenu ? "Tienda y sesión" : "Ir a la tienda"}
          aria-haspopup={conMenu ? "menu" : undefined}
          sx={{
            flexShrink: 0,
            p: 0.75,
            borderRadius: (theme) => theme.shape.pill,
            // Blanco siempre, como en la barra: el logo es rojo y azul y sobre
            // otro fondo se pierde.
            bgcolor: "common.white",
            boxShadow: (theme) => theme.shadows[2],
          }}
        >
          <img src={Logos} alt="Ferrequipos" style={{ display: "block", height: alto, width: "auto" }} />
        </ButtonBase>
      </Tooltip>

      {conMenu && (
        <Menu
          anchorEl={ancla}
          open={Boolean(ancla)}
          onClose={() => setAncla(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={elegir(irALaTienda)}>
            <ListItemIcon>
              <StorefrontIcon fontSize="small" />
            </ListItemIcon>
            Ir a la tienda
          </MenuItem>
          {onIrAlMenu && (
            <MenuItem onClick={elegir(onIrAlMenu)}>
              <ListItemIcon>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              Ir al menú
            </MenuItem>
          )}
          <MenuItem onClick={elegir(onCerrarSesion)} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Cerrar sesión
          </MenuItem>
        </Menu>
      )}
    </>
  );
}

BotonTienda.propTypes = {
  alto: PropTypes.number,
  onCerrarSesion: PropTypes.func,
  onIrAlMenu: PropTypes.func,
};
