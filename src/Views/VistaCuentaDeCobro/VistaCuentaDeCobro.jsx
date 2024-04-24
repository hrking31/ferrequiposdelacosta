import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { useState } from "react";
import { useSelector } from "react-redux";

export default function VistaCuentaDeCobro() {
  const [verWeb, setVerWeb] = useState(false);
  const [verPdf, setVerPdf] = useState(false);
  const values = useSelector((state) => state.cuentacobro);

  const toggleVerWeb = () => {
    setVerWeb(!verWeb);
    setVerPdf(false);
  };

  const toggleVerPdf = () => {
    setVerPdf(!verPdf);
    setVerWeb(false);
  };

    return (
      <div style={{ miheight: "100vh" }}>
      <button onClick={toggleVerWeb}>
        {verWeb ? "Ver Cuenta Cobro" : "Ver Diseño"}
      </button>

      <button onClick={toggleVerPdf}>
        {verPdf ? "Ver Cuenta Cobro" : "Ver Pdf"}
      </button>

      <PDFDownloadLink
        document={<VistaCcPdf values={values} />}
        fileName={`${values.value.empresa}.pdf`} 
      >
        <button>Descargar PDF</button>
      </PDFDownloadLink>

      {verWeb ? <VistaCcWeb /> : null}
      {verPdf ? (
        <PDFViewer style={{ width: "100%", height: "90vh" }}>
          <VistaCcPdf values={values} />
        </PDFViewer>
      ) : null}
      {!verWeb && !verPdf && <CuentaDeCobro />}
    </div>
      );
    }