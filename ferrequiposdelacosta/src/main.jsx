import "../index.css";
import App from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { AuthProvider } from "./Context/AuthContext";
import { CustomThemeProvider } from "./Theme/ThemeProvider.jsx";
import store from "./Store/Store";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <CustomThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </CustomThemeProvider>
  </Provider>
);
