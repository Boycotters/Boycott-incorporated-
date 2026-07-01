import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNative } from "./lib/native";

initNative().catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
