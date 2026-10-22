import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import BotonesCliente from "./BotonesCliente";

// Los botones de la ficha del cliente. El abono necesita facturas con saldo;
// los documentos —PDF y cuenta de cobro— se piden también de una finalizada
// (pedido del dueño, 2026-10-22).
const abrir = (props) =>
  renderConProviders(
    <BotonesCliente
      onVolver={() => {}}
      onCrearFactura={() => {}}
      onRegistrarAbono={() => {}}
      onDescargarReporte={() => {}}
      onPasarACuentaCobro={() => {}}
      onEditarCliente={() => {}}
      {...props}
    />,
  );

// El botón está dentro de un span (para el tooltip): se lo busca por su ícono.
const boton = (testId) => screen.getByTestId(testId).closest("button");

describe("BotonesCliente", () => {
  it("con solo facturas finalizadas, el PDF y la cuenta de cobro se pueden pedir, el abono no", () => {
    abrir({ hayFacturasParaReporte: false, hayFacturasParaDocumentos: true });

    expect(boton("PictureAsPdfIcon")).toBeEnabled();
    expect(boton("RequestQuoteIcon")).toBeEnabled();
    expect(boton("AttachMoneyIcon")).toBeDisabled();
  });

  it("sin ninguna factura, los tres quedan apagados", () => {
    abrir({ hayFacturasParaReporte: false, hayFacturasParaDocumentos: false });

    expect(boton("PictureAsPdfIcon")).toBeDisabled();
    expect(boton("RequestQuoteIcon")).toBeDisabled();
    expect(boton("AttachMoneyIcon")).toBeDisabled();
  });
});
