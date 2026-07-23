import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App";
import Studio from "./Studio";

const isStudio = window.location.pathname.replace(/\/+$/, "") === "/studio";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isStudio ? <Studio /> : <App />}
    <Analytics />
  </StrictMode>,
);
