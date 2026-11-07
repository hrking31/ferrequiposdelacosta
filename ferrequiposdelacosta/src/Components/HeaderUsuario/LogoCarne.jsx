import PropTypes from "prop-types";
import LogoPersonal from "../../assets/LogoPersonal.svg";

// EL LOGO DE LA APP DEL PERSONAL: el carné de empleado, sin fondo (pedido del
// dueño, 2026-11-07). Va en el encabezado de cada pantalla y en la puerta de
// entrada (VistaAcceso). Es el mismo dibujo del ícono de la app, que lleva el
// carné sobre rojo.
//
// Lo que ve el cliente sigue con el logo de la empresa: los PDF y las vistas
// de la cotización y la cuenta de cobro, y la animación de "Cargando…".
//
// Antes era el logo de la empresa en un círculo blanco (LogoCirculo), y hasta
// ese mismo día un botón que llevaba a la tienda (BotonTienda).
export default function LogoCarne({ alto = 40 }) {
  return (
    <img
      src={LogoPersonal}
      alt="Ferrequipos Personal"
      style={{ display: "block", flexShrink: 0, height: alto, width: "auto" }}
    />
  );
}

LogoCarne.propTypes = {
  alto: PropTypes.number,
};
