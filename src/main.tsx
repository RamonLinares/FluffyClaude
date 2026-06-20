import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Note: no <StrictMode>. React StrictMode double-mounts components in dev, which
// makes react-three-fiber create/dispose the WebGL context twice and can cause
// flicker. The app is side-effect-careful, so we render once.
createRoot(document.getElementById("root")!).render(<App />);
