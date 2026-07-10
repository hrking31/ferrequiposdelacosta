import { createContext, useContext } from "react";

export const authContext = createContext();

export const useAuth = () => {
  const context = useContext(authContext);
  return context;
};
