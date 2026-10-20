import PropTypes from "prop-types";
import { ButtonBase, Tooltip } from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import Logos from "../../assets/LogoFerrequipos.png";

// EL LOGO QUE LLEVA A LA TIENDA (2026-10-20), para las vistas internas que ya
// no tienen la barra de arriba. Es el mismo gesto que el logo de la barra —el
// equipo ya sabe que tocarlo lleva a la tienda— y además le devuelve la marca
// a la pantalla.
//
// `vistahome=si` es lo que deja ver la tienda con la sesión abierta: sin eso,
// el inicio manda al usuario de vuelta al menú.
export default function BotonTienda({ alto = 40 }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const irALaTienda = () => {
    dispatch(clearSearchEquipo());
    navigate("/home?vistahome=si");
  };

  return (
    <Tooltip title="Ir a la tienda">
      <ButtonBase
        onClick={irALaTienda}
        aria-label="Ir a la tienda"
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
  );
}

BotonTienda.propTypes = {
  alto: PropTypes.number,
};
