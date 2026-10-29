import React, { useEffect, useState } from "react";
import {
  getPatient, updatePatient, listInsurances, listOrders, listDocuments, listConditions, listObservations,
  listPractitioners, listOrganizations, listLocations
} from "../api/ehrApi.js";
import { patientName } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import PatientForm from "./PatientForm.jsx";
import InsuranceSection from "./InsuranceSection.jsx";
import OrdersSection from "./OrdersSection.jsx";
import ClinicalSection from "./ClinicalSection.jsx";
import DocumentsSection from "./DocumentsSection.jsx";

/**
 * One patient's chart. Loads everything once; each section reloads after it adds something.
 * props: patientId, onBack.
 */
export default function PatientChart(props) {
  const patientId = props.patientId;
  const [tab, setTab] = useState("orders");
  const [patient, setPatient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({
    insurances: [], orders: [], documents: [], conditions: [], observations: [],
    practitioners: [], organizations: [], locations: []
  });
  const [error, setError] = useState(null);

  async function loadAll() {
    setError(null);
    try {
      const results = await Promise.all([
        getPatient(patientId), listInsurances(patientId), listOrders(patientId), listDocuments(patientId),
        listConditions(patientId), listObservations(patientId), listPractitioners(), listOrganizations(), listLocations()
      ]);
      setPatient(results[0]);
      setData({
        insurances: results[1], orders: results[2], documents: results[3], conditions: results[4], observations: results[5],
        practitioners: results[6], organizations: results[7], locations: results[8]
      });
    } catch (loadError) {
      setError(loadError);
    }
  }

  function startLoading() {
    loadAll();
  }
  useEffect(startLoading, [patientId]);

  async function handleSavePatient(changed) {
    changed.patientId = patientId;
    const saved = await updatePatient(changed);
    setPatient(saved);
    setEditing(false);
  }

  function handleTab(event) {
    setTab(event.currentTarget.dataset.tab);
  }

  function startEdit() {
    setEditing(true);
  }

  function stopEdit() {
    setEditing(false);
  }

  function renderTab(item) {
    return (
      <button key={item.id} type="button" data-tab={item.id} className={tab === item.id ? "tab active" : "tab"} onClick={handleTab}>
        {item.label} {item.count !== undefined ? <span className="count">{item.count}</span> : null}
      </button>
    );
  }

  if (error) {
    return <section><button type="button" onClick={props.onBack}>&larr; Patients</button><ErrorBox error={error} /></section>;
  }
  if (!patient) {
    return <p className="muted">Loading chart...</p>;
  }

  const tabs = [
    { id: "orders", label: "Orders & prior auth", count: data.orders.length },
    { id: "insurance", label: "Insurance", count: data.insurances.length },
    { id: "clinical", label: "Clinical data", count: data.conditions.length + data.observations.length },
    { id: "documents", label: "Documents", count: data.documents.length }
  ];

  let body = null;
  if (tab === "insurance") {
    body = <InsuranceSection patientId={patientId} insurances={data.insurances} onChanged={loadAll} />;
  } else if (tab === "clinical") {
    body = <ClinicalSection patientId={patientId} conditions={data.conditions} observations={data.observations} onChanged={loadAll} />;
  } else if (tab === "documents") {
    body = <DocumentsSection patientId={patientId} documents={data.documents} practitioners={data.practitioners} organizations={data.organizations} onChanged={loadAll} />;
  } else {
    body = <OrdersSection patient={patient} data={data} onChanged={loadAll} />;
  }

  const address = patient.address || {};
  return (
    <section>
      <button type="button" onClick={props.onBack}>&larr; Patients</button>

      {editing ? (
        <PatientForm patient={patient} onSave={handleSavePatient} onCancel={stopEdit} />
      ) : (
        <div className="card patient-banner">
          <div>
            <h2>{patientName(patient)}</h2>
            <div className="muted">
              {patient.patientId} &middot; MRN {patient.mrn} &middot; {patient.gender} &middot; born {patient.dateOfBirth}
              {address.city ? " · " + address.city + ", " + (address.state || "") : ""}
            </div>
          </div>
          <button type="button" onClick={startEdit}>Edit</button>
        </div>
      )}

      <div className="tabs">{tabs.map(renderTab)}</div>
      {body}
    </section>
  );
}
