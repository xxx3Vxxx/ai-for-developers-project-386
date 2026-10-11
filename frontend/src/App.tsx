import { Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { BookingPage } from "./pages/BookingPage";
import { EventsPage } from "./pages/EventsPage";
import { LandingPage } from "./pages/LandingPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Route>
    </Routes>
  );
}
