import "../index.css";
import App from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { AuthProvider } from "./Context/AuthContext";
import { CustomThemeProvider } from "./Theme/ThemeProvider.jsx";
import store from "./Store/Store";
import { registerSW } from "virtual:pwa-register";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => registration.update().catch(() => {});

    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});
  
ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <CustomThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CustomThemeProvider>
    </BrowserRouter>
  </Provider>,
);
