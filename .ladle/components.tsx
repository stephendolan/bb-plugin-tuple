import { useEffect } from "react";
import type { GlobalProvider } from "@ladle/react";
import { ThemeState } from "@ladle/react";
import "../dist/app.css";
import "./ladle.css";

export const Provider: GlobalProvider = ({ globalState, children }) => {
  const isDark = globalState.theme === ThemeState.Dark;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return <div className="tuple-ladle-root">{children}</div>;
};
