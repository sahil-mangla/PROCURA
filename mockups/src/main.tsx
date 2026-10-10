import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Launcher from "./directions/Launcher";
import Ledger from "./directions/ledger/Ledger";
import Trace from "./directions/trace/Trace";
import Docket from "./directions/docket/Docket";
import Mix from "./directions/mix/Mix";

const router = createBrowserRouter([
  { path: "/", element: <Launcher /> },
  { path: "/ledger", element: <Ledger /> },
  { path: "/trace", element: <Trace /> },
  { path: "/docket", element: <Docket /> },
  { path: "/mix", element: <Mix /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
