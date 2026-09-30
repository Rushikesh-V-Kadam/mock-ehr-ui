import React, { useState } from "react";
import { withField, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";

const EMPTY = {
  patientId: "", mrn: "", firstName: "", lastName: "", gender: "male", dateOfBirth: "",
  phone: "", email: "", line1: "", city: "", state: "", postalCode: ""
};

/** Patient -> flat form values. */
function toForm(patient) {
  if (!patient) {
    return Object.assign({}, EMPTY);
  }
  const address = patient.address || {};
  return {
    patientId: patient.patientId || "", mrn: patient.mrn || "", firstName: patient.firstName || "", lastName: patient.lastName || "",
    gender: patient.gender || "unknown", dateOfBirth: patient.dateOfBirth || "", phone: patient.phone || "", email: patient.email || "",
    line1: address.line1 || "", city: address.city || "", state: address.state || "", postalCode: address.postalCode || ""
  };
}

/** Flat form values -> patient (EHR contract). */
function toPatient(form) {
  return {
    patientId: form.patientId, mrn: blankToNull(form.mrn), firstName: form.firstName.trim(), lastName: form.lastName.trim(),
    gender: form.gender, dateOfBirth: form.dateOfBirth, phone: blankToNull(form.phone), email: blankToNull(form.email),
    address: { line1: blankToNull(form.line1), city: blankToNull(form.city), state: blankToNull(form.state), postalCode: blankToNull(form.postalCode), country: "US" },
    active: true
  };
}

/**
 * Add / edit patient form. props: patient (null = new), onSave(patient) returns a Promise, onCancel.
 */
export default function PatientForm(props) {
  const [form, setForm] = useState(toForm(props.patient));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isNew = !props.patient;

  function handleChange(event) {
    setForm(withField(form, event));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await props.onSave(toPatient(form));
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>{isNew ? "Add patient" : "Edit patient"}</h3>
      <ErrorBox error={error} />
      <div className="grid">
        {isNew ? (
          <label>Patient id <small>(empty = automatic)</small><input name="patientId" value={form.patientId} onChange={handleChange} placeholder="pat-1001" /></label>
        ) : null}
        <label>MRN<input name="mrn" value={form.mrn} onChange={handleChange} placeholder="automatic" /></label>
        <label>First name *<input name="firstName" value={form.firstName} onChange={handleChange} required /></label>
        <label>Last name *<input name="lastName" value={form.lastName} onChange={handleChange} required /></label>
        <label>Gender *
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
            <option value="unknown">unknown</option>
          </select>
        </label>
        <label>Date of birth *<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required /></label>
        <label>Phone<input name="phone" value={form.phone} onChange={handleChange} /></label>
        <label>Email<input type="email" name="email" value={form.email} onChange={handleChange} /></label>
        <label>Address<input name="line1" value={form.line1} onChange={handleChange} /></label>
        <label>City<input name="city" value={form.city} onChange={handleChange} /></label>
        <label>State<input name="state" value={form.state} onChange={handleChange} maxLength={2} /></label>
        <label>ZIP<input name="postalCode" value={form.postalCode} onChange={handleChange} /></label>
      </div>
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save patient"}</button>
        {props.onCancel ? <button type="button" onClick={props.onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}
