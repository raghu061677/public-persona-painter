import { Routes, Route } from "react-router-dom";
import LeadsList from "./LeadsList";
import LeadDetail from "./LeadDetail";

export function LeadsRouter() {
  return (
    <Routes>
      <Route index element={<LeadsList />} />
      <Route path=":id" element={<LeadDetail />} />
    </Routes>
  );
}
