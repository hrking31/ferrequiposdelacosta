import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    maxWidth: "600px",
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },

  logo: {
    width: "80px",
    marginRight: "10px",
    marginLeft: 10,
    marginTop: "-10",
  },

  companyName: {
    fontSize: "14px",
    color: "blue",
    flex: "1",
    textAlign: "center",
    lineHeight: "0.6",
  },

  subtitle: {
    fontSize: "12px",
    color: "red",
  },

  cotizacion: {
    fontSize: "20px",
    textAlign: "center",
  },

  info: {
    marginBottom: "10px",
    fontSize: "14px",
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #ccc",
    padding: "5px 0",
  },

  itemDescription: {
    flex: 2,
  },

  itemSubtotal: {
    flex: 1,
    textAlign: "right",
  },

  total: {
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "right",
    marginTop: "20px",
  },

  piePagina: {
    fontSize: "12px",
    color: "blue",
    textAlign: "center",
    lineHeight: "0.6",
  },
};

export default function VistaCcWeb() {
  const formValues = useSelector((state) => state.cuentacobro);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <img
          src={LogoFerrequipos} 
          alt="Logo"
          style={styles.logo}
        />
        <div style={styles.companyName}>
          <h1>FERREQUIPOS DE LA COSTA</h1>
          <div style={styles.subtitle}>
            <h1>Alquiler de equipos para la construcción</h1>
            <h1>Nit: 22.736.950 - 1</h1>
          </div>
        </div>
      </div>
      
      <p style={styles.info}>Barranquilla, {formValues.value.fecha}</p>
      <h1 style={styles.cotizacion}>CUENTA DE COBRO</h1>
      <p style={styles.info}> {formValues.value.empresa}</p>
      <p style={styles.info}>Nit: {formValues.value.nit}</p>
      <p style={styles.info}>Obra: {formValues.value.obra}</p>
      <h1 style={styles.cotizacion}>DEBE A</h1>
      <h1 style={styles.cotizacion}>FERREQUIPOS DE LA COSTA</h1>
      <p style={styles.info}>LA SUMA DE: {formValues.value.total}</p>
      <p style={styles.info}>POR CONCEPTO DE: {formValues.value.concepto}</p>

      {items.map((item, index) => (
        <div key={index} style={styles.item}>
          <p style={styles.itemDescription}>{item.description}</p>
          <p style={styles.itemSubtotal}>{item.subtotal}</p>
        </div>
      ))}
      <p style={styles.total}>Total a Cancelar: {total}</p>

      <div style={styles.piePagina}>
        <h2>Kra 38 # 108 – 23 Tel 2511118 - 3116576633</h2>
        <h2>Ferrequipos07@hotmail.com </h2>
        <h2>Ferrequiposdelacosta.co </h2>
        <h2>BARRANQUILLA - COLOMBIA</h2>
      </div>
    </div>
  );
}