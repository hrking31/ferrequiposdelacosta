import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  PDFViewer,
} from "@react-pdf/renderer";
import mimbreteImage from "./mimbrete.png"; // Ruta a tu imagen de mimbrete

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
  },
  mimbreteImage: {
    width: 200,
    height: 100,
    marginBottom: 20,
  },
});

const FormatoCitacionPDF = () => (
  <PDFViewer>
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <Image src={mimbreteImage} style={styles.mimbreteImage} />
          <Text style={styles.title}>Formato de Citación</Text>
          {/* Otros elementos del formato */}
          <Text>Nombre del autor: Juan Pérez</Text>
          <Text>Título del trabajo: Mi investigación</Text>
          {/* ... otros elementos ... */}
        </View>
      </Page>
    </Document>
  </PDFViewer>
);

export default FormatoCitacionPDF;
