import { useCallback, useState } from "react";

const initialState = { open: false, message: "", severity: "info" };

export default function useSnackbar(defaultSeverity = "info") {
  const [snackbar, setSnackbar] = useState(initialState);

  const showSnackbar = useCallback(
    (message, severity = defaultSeverity) => {
      setSnackbar({ open: true, message, severity });
    },
    [defaultSeverity],
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return { snackbar, showSnackbar, closeSnackbar };
}
