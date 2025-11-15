import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useThemeStore } from "@/store/themeStore";

// Initialize theme on app load
const initializeTheme = () => {
  const store = useThemeStore.getState();
  
  // Apply saved theme
  document.documentElement.className = store.theme;
  
  // Apply saved font settings
  const fontMap: Record<string, string> = {
    'inter': 'Inter, sans-serif',
    'poppins': 'Poppins, sans-serif',
    'roboto': 'Roboto, sans-serif',
    'open-sans': 'Open Sans, sans-serif',
    'lato': 'Lato, sans-serif',
    'montserrat': 'Montserrat, sans-serif',
    'nunito': 'Nunito, sans-serif',
    'work-sans': 'Work Sans, sans-serif',
  };
  
  const fontSizeMap = {
    'small': '14px',
    'medium': '16px',
    'large': '18px',
    'extra-large': '20px',
  };
  
  document.documentElement.style.setProperty('--font-family', fontMap[store.fontFamily]);
  document.documentElement.style.setProperty('--base-font-size', fontSizeMap[store.fontSize]);
};

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
