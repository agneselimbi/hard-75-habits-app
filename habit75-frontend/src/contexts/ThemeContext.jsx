import { createContext, useContext, useState, useEffect } from "react";
import { themes } from "../theme/theme.js";

const ThemeContext = createContext();
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("light");

  // Apply theme to CSS custom properties
  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;

    // Apply colors
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === "string") {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // Apply fonts
    if (theme.fonts) {
      root.style.setProperty("--font-heading", theme.fonts.heading);
      root.style.setProperty("--font-body", theme.fonts.body);
    }

    // Apply shadows
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
      });
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setCurrentTheme,
        toggleTheme,
        theme: themes[currentTheme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
