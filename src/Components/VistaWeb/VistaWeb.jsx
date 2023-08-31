import { useSelector } from "react-redux";

export default function VistaWeb() {
  const formValues = useSelector((state) => state.cotizacion);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);

  return (
    <div id="cotizacion-container">
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <img
          src="/src/assets/Ferrequipos.jpeg"
          alt="Logo"
          style={{
            width: "80px",
            marginRight: "50px",
          }}
        />
        <div style={{ textAlign: "center", color: "blue" }}>
          <h1 style={{ fontSize: "24px" }}>FERREQUIPOS DE LA COSTA</h1>
        </div>
      </div>
      <div style={{ textAlign: "center", color: "red" }}>
        <h2>Alquiler de equipos para la construccion</h2>
        <h2>Nit: 22.736.950 - 1 </h2>
      </div>
      <p>Barranquilla, {formValues.value.fecha}</p>
      <p>Señores: {formValues.value.empresa}</p>
      <p>Nit: {formValues.value.nit}</p>
      <p>Obra: {formValues.value.direccion}</p>
      <h2>Cotización</h2>
      {items.map((item, index) => (
        <div key={index}>
          <p>{item.description}</p>
          {/* <p>{item.quantity}</p> */}
          {/* <p>{item.price}</p> */}
          <p>{item.subtotal}</p>
        </div>
      ))}
      <p>Total: {total}</p>
    </div>
  );
}
