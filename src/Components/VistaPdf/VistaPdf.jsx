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
    padding: "1cm",
  },
  header: {
    textAlign: "center",
    color: "blue",
  },
  subHeader: {
    textAlign: "center",
    color: "red",
  },
  title: {
    fontSize: 24,
    marginBottom: "0.2cm",
  },
  text: {
    fontSize: 12,
    marginBottom: "0.2cm",
    marginLeft: 30,
  },
  logo: {
    width: 80,
    marginRight: 10,
  },

  titleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
});

const VistaPdf = ({ values }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Image src="/src/assets/Ferrequipos.jpeg" style={styles.logo} />
            <Text style={styles.title}>FERREQUIPOS DE LA COSTA</Text>
          </View>
        </View>

        <View style={styles.subHeader}>
          <Text>Alquiler de equipos para la construcción</Text>
          <Text>Nit: 22.736.950 - 1</Text>
        </View>

        <Text style={styles.text}>Barranquilla, {values.value.fecha}</Text>
        <Text style={styles.text}>Señores: {values.value.empresa}</Text>
        <Text style={styles.text}>Nit: {values.value.nit}</Text>
        <Text style={styles.text}>Obra: {values.value.direccion}</Text>

        <Text style={styles.title}>Cotización</Text>
        {values.value.items.map((item, index) => (
          <View key={index}>
            <Text>{item.description}</Text>
            <Text>{item.subtotal}</Text>
          </View>
        ))}
        <Text style={styles.text}>Total: {values.value.total}</Text>
      </Page>
    </Document>
  );
};

export default VistaPdf;
