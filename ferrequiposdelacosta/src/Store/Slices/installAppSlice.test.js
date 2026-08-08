import installAppReducer, {
  showInstallApp,
  hideInstallApp,
} from "./installAppSlice";

describe("installAppSlice", () => {
  it("showInstallApp muestra el aviso de instalación", () => {
    const estado = installAppReducer({ showInstallApp: false }, showInstallApp());
    expect(estado.showInstallApp).toBe(true);
  });

  it("hideInstallApp lo oculta", () => {
    const estado = installAppReducer({ showInstallApp: true }, hideInstallApp());
    expect(estado.showInstallApp).toBe(false);
  });
});
