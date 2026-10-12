import { Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
// PROTOTYPE — throwaway route for the /admin exploration (issue #12). Drop with the folder.
import { AdminPrototype } from "./pages/admin-prototype";
import { BookingPage } from "./pages/BookingPage";
import { LandingPage } from "./pages/LandingPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/prototype/admin" element={<AdminPrototype />} />
      </Route>
    </Routes>
  );
}
