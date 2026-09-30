import React, { useState } from "react";
import PatientList from "./components/PatientList.jsx";
import PatientChart from "./components/PatientChart.jsx";
import ProvidersPage from "./components/ProvidersPage.jsx";
import WriteBacks from "./components/WriteBacks.jsx";
import SettingsPage from "./components/SettingsPage.jsx";

/**
 * Mock EHR. Pages:
 *   Patients   - list, search, add a patient, open a chart
 *   Chart      - demographics, insurance, orders (+ prior auth workflow), clinical data, documents
 *   Providers  - practitioners and organizations (NPI needed for PAS)
 *   Write-backs - what the Payer Gateway wrote into the EHR
 *   Settings   - URLs of the mock EHR API, Payer Gateway and questionnaire app
 */
export default function App() {
  const [page, setPage] = useState("patients");
  const [patientId, setPatientId] = useState(null);

  function openPatient(id) {
    setPatientId(id);
    setPage("chart");
  }

  function handleNav(event) {
    setPage(event.currentTarget.dataset.page);
  }

  function renderNavButton(item) {
    const active = page === item.page || (item.page === "patients" && page === "chart");
    return (
      <button key={item.page} type="button" data-page={item.page} className={active ? "nav-link active" : "nav-link"} onClick={handleNav}>
        {item.label}
      </button>
    );
  }

  const navItems = [
    { page: "patients", label: "Patients" },
    { page: "providers", label: "Providers" },
    { page: "writebacks", label: "Write-backs" },
    { page: "settings", label: "Settings" }
  ];

  let content;
  if (page === "chart" && patientId) {
    content = <PatientChart patientId={patientId} onBack={function back() { setPage("patients"); }} />;
  } else if (page === "providers") {
    content = <ProvidersPage />;
  } else if (page === "writebacks") {
    content = <WriteBacks />;
  } else if (page === "settings") {
    content = <SettingsPage />;
  } else {
    content = <PatientList onOpen={openPatient} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Mock EHR <span className="brand-sub">prior authorization test system</span></div>
        <nav className="nav">{navItems.map(renderNavButton)}</nav>
      </header>
      <main className="page">{content}</main>
    </div>
  );
}
