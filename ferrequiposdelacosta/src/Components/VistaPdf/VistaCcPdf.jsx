import React from "react";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

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
    padding: "40px",
    maxWidth: "600px",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
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
    textAlign: "center",
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
  itemDescription: {
    fontSize: "12px",
    wordBreak: "break-all",
    marginBottom: "10px",
    flex: 2,
    width: "100%",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    borderBottom: "1px dotted #ccc",
  },
  itemSubtotal: {
    fontSize: "12px",
    textAlign: "right",
    flex: 1,
  },
  empresa: {
    fontSize: "12px",
    color: "#444",
    marginTop: "30px",
    textAlign: "center",
  },
  logo: {
    width: "75px",
    marginLeft: 30,
    marginTop: "1px",
  },
  contentContainer: {
    marginBottom: "10px",
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
  centeredText: {
    textAlign: "center",
  },
});

const VistaCcPdf = ({ values }) => {
  return (
    <Document>
      <Page size="letter" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image style={styles.logo} src={LogoFerrequipos} />
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
            <Text style={[styles.text, styles.centeredText]}>
              Barranquilla, {values.value.fecha}
            </Text>
          </View>
          <Text style={styles.cotizacion}>CUENTA DE COBRO</Text>
          <View style={styles.empresa}>
            <Text>{values.value.empresa}</Text>
            <Text>Nit: {values.value.nit}</Text>
            <Text>Obra: {values.value.obra}</Text>
          </View>
          <Text style={styles.cotizacion}>DEBE A</Text>
          <Text style={styles.cotizacion}>FERREQUIPOS DE LA COSTA</Text>
          <Text style={[styles.text, styles.centeredText]}>
            LA SUMA DE: {values.value.total}
          </Text>
          <Text style={[styles.text, styles.centeredText]}>
            POR CONCEPTO DE: {values.value.concepto}
          </Text>

          {values.value.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemDescription}>
                {item.quantity} {item.description}
              </Text>
              <Text style={styles.itemSubtotal}>{item.subtotal}</Text>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <Text>Total a Cancelar: {values.value.total}</Text>
          </View>
        </View>

        <View style={styles.piePagina}>
          <Text>Ferrequiposdelacosta.com</Text>
          <Text>Ferrequipos07@hotmail.com</Text>
          <Text>Kra 38 # 108 – 23 Tel 2511118 - 3116576633 - 3106046465</Text>
          <Text>BARRANQUILLA - COLOMBIA</Text>
        </View>
      </Page>
    </Document>
  );
};

export default VistaCcPdf;
