import React, { useEffect, useState } from "react";
import { listPatients, createPatient } from "../api/ehrApi.js";
import { patientName } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import PatientForm from "./PatientForm.jsx";

/** Patient list with search and "Add patient". props: onOpen(patientId). */
export default function PatientList(props) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(text) {
    setLoading(true);
    setError(null);
    try {
      setPatients(await listPatients(text));
    } catch (loadError) {
      setError(loadError);
    }
    setLoading(false);
  }

  function startLoading() {
    load("");
  }
  useEffect(startLoading, []);

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  function handleSearch(event) {
    event.preventDefault();
    load(search);
  }

  async function handleSave(patient) {
    const saved = await createPatient(patient);
    setAdding(false);
    props.onOpen(saved.patientId);
  }

  function handleOpen(event) {
    props.onOpen(event.currentTarget.dataset.id);
  }

  function showForm() {
    setAdding(true);
  }

  function hideForm() {
    setAdding(false);
  }

  function renderRow(patient) {
    return (
      <tr key={patient.patientId}>
        <td><button type="button" className="link" data-id={patient.patientId} onClick={handleOpen}>{patientName(patient)}</button></td>
        <td>{patient.patientId}</td>
        <td>{patient.mrn}</td>
        <td>{patient.gender}</td>
        <td>{patient.dateOfBirth}</td>
      </tr>
    );
  }

  return (
    <section>
      <div className="page-head">
        <h2>Patients</h2>
        {!adding ? <button type="button" className="primary" onClick={showForm}>+ Add patient</button> : null}
      </div>

      {adding ? <PatientForm patient={null} onSave={handleSave} onCancel={hideForm} /> : null}

      <form className="search" onSubmit={handleSearch}>
        <input value={search} onChange={handleSearchChange} placeholder="Search name, MRN or id" />
        <button type="submit">Search</button>
      </form>

      <ErrorBox error={error} />
      {loading ? <p className="muted">Loading...</p> : null}

      <table className="table">
        <thead>
          <tr><th>Name</th><th>Patient id</th><th>MRN</th><th>Gender</th><th>Date of birth</th></tr>
        </thead>
        <tbody>{patients.map(renderRow)}</tbody>
      </table>
      {!loading && patients.length === 0 ? <p className="muted">No patients yet. Add one to start.</p> : null}
    </section>
  );
}
