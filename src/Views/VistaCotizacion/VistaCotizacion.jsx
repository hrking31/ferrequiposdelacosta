import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaWeb from "../../Components/VistaWeb/VistaWeb";
import VistaPdf from "../../Components/VistaPdf/VistaPdf";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { useState } from "react";
import { useSelector } from "react-redux";

export default function VistaCotizacion() {
  const [verWeb, setVerWeb] = useState(false);
  const [verPdf, setVerPdf] = useState(false);
  const values = useSelector((state) => state.cotizacion);

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
        {verWeb ? "Ver Cotizacion" : "Ver Diseño"}
      </button>

      <button onClick={toggleVerPdf}>
        {verPdf ? "Ver Cotizacion" : "Ver Pdf"}
      </button>

      <PDFDownloadLink
        document={<VistaPdf values={values} />}
        fileName={`${values.value.empresa}.pdf`} // Corrección aquí
      >
        <button>Descargar PDF</button>
      </PDFDownloadLink>

      {verWeb ? <VistaWeb /> : null}
      {verPdf ? (
        <PDFViewer style={{ width: "100%", height: "90vh" }}>
          <VistaPdf values={values} />
        </PDFViewer>
      ) : null}
      {!verWeb && !verPdf && <Cotizacion />}
    </div>
  );
}
