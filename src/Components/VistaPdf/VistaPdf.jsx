import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: "40px ",
    // paddingLeft: 40,
    // paddingRight: 60,
    maxWidth: "600px",
    // margin: "2 auto",
  },

  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  titleContainer: {
    flex: 1,
    // marginLeft: 0,
    marginRight: 100,
  },

  title: {
    fontSize: 18,
    color: "blue",
    textAlign: "center",
  },
  subHeader: {
    textAlign: "center",
    color: "red",
    marginTop: "10px",
    marginBottom: "12px",
    fontSize: "12px",
  },

  fecha: {
    fontSize: "12px",
    color: "#444",
    marginTop: "30px",
  },

  cotizacion: {
    fontSize: "20px",
    textAlign: "center",
    color: "#444",
    marginTop: "30px",
    fontWeight: "bold",
  },

  text: {
    fontSize: "12px",
    marginBottom: "5px",
    color: "#444",
  },

  // itemDescription: {
  //   flex: 2,
  //   position: "relative",
  //   top: "-30px",
  //   fontSize: "12px",
  //   // maxWidth: "400px",
  //   // wordWrap: "break-word",
  // },

  itemDescription: {
    flex: 2,
    fontSize: "12px",
    wordBreak: "break-all", // Forzar corte de palabras largas
    borderBottom: "1px solid #ccc", // Mover el borde inferior dentro de itemDescription
    paddingBottom: "10px", // Espacio entre las líneas de descripción
    marginBottom: "10px", // Espacio entre los elementos item
  },

  empresa: {
    fontSize: "12px",
    color: "#444",
    marginTop: "30px",
  },

  logo: {
    width: 120,
    marginLeft: 10,
    marginTop: "10px",
  },

  contentContainer: {
    marginBottom: "10px",
    marginLeft: "30px",
  },

  piePagina: {
    fontSize: "12px",
    color: "blue",
    textAlign: "center",
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
  },

  totalContainer: {
    fontSize: "18px",
    color: "#444",
    textAlign: "right",
    fontWeight: "bold",
  },

  // item: {
  //   marginTop: "30px",
  //   // marginBottom: "20px",
  //   display: "flex",
  //   justifyContent: "space-between",
  //   borderBottom: "1px solid #ccc",
  //   color: "#444",
  //   padding: "5px 0",
  // },

  item: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "column", // Cambiar a dirección de columna para permitir el crecimiento vertical
    color: "#444",
    padding: "5px 0",
  },

  itemSubtotal: {
    flex: 1,
    textAlign: "right",
    position: "relative",
    top: "-20px",
    fontSize: "12px",
  },
});

const VistaPdf = ({ values }) => {
  const logoFerrequipos = "src/assets/LogoFerrequipos.png";
  return (
    <Document>
      <Page size="letter" style={styles.page}>
        {/* <View style={styles.header}>
          <Image src="/public/Ferrequipos.jpeg" style={styles.logo} />
          <View style={styles.title}>
            <Text>FERREQUIPOS DE LA COSTA</Text>
            <View style={styles.subHeader}>
              <Text>Alquiler de equipos para la construcción</Text>
              <Text>Nit: 22.736.950 - 1</Text>
            </View>
          </View>
        </View> */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image style={styles.logo} src={logoFerrequipos} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>FERREQUIPOS DE LA COSTA</Text>
            <View style={styles.subHeader}>
              <Text>Alquiler de equipos para la construcción</Text>
              <Text>Nit: 22.736.950 - 1</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.fecha}>
            <Text style={styles.text}> Barranquilla, {values.value.fecha}</Text>
          </View>
          <View style={styles.empresa}>
            <Text> Señores: {values.value.empresa}</Text>
            <Text> Nit: {values.value.nit}</Text>
            <Text> Obra: {values.value.direccion}</Text>
          </View>

          <Text style={styles.cotizacion}>Cotización</Text>
          {values.value.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemDescription}>
                {item.quantity} {item.description}
              </Text>
              <Text style={styles.itemSubtotal}>{item.subtotal}</Text>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <Text style={styles.total}>Total: {values.value.total}</Text>
          </View>
        </View>

        <View style={styles.piePagina}>
          <Text>Ferrequiposdelacosta.co</Text>
          <Text>Ferrequipos07@hotmail.com</Text>
          <Text>Kra 38 # 108 – 23 Tel 2511118 - 3116576633 - 3106046465</Text>
          <Text>BARRANQUILLA - COLOMBIA</Text>
        </View>
      </Page>
    </Document>
  );
};

export default VistaPdf;
