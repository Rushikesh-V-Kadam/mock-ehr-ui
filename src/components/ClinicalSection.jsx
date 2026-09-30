import React, { useState } from "react";
import { addCondition, addObservation } from "../api/ehrApi.js";
import { withField, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";

const EMPTY_CONDITION = { code: "", display: "", onsetDate: "" };
const EMPTY_OBSERVATION = { category: "laboratory", code: "", display: "", valueNumber: "", unit: "", valueText: "", effectiveDateTime: "" };

/**
 * Problem list (conditions) and results (observations). The payer's questionnaire logic and the Provider FHIR API
 * read these (e.g. eGFR, BMI, SpO2, diagnoses).
 * props: patientId, conditions, observations, onChanged.
 */
export default function ClinicalSection(props) {
  const [condition, setCondition] = useState(Object.assign({}, EMPTY_CONDITION));
  const [observation, setObservation] = useState(Object.assign({}, EMPTY_OBSERVATION));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function handleConditionChange(event) { setCondition(withField(condition, event)); }
  function handleObservationChange(event) { setObservation(withField(observation, event)); }

  async function handleAddCondition(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addCondition(props.patientId, {
        conditionId: "", patientId: props.patientId, code: condition.code.trim(), codeSystem: "ICD10CM",
        display: blankToNull(condition.display), clinicalStatus: "active", onsetDate: blankToNull(condition.onsetDate)
      });
      setCondition(Object.assign({}, EMPTY_CONDITION));
      props.onChanged();
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  async function handleAddObservation(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addObservation(props.patientId, {
        observationId: "", patientId: props.patientId, category: observation.category, code: observation.code.trim(), codeSystem: "LOINC",
        display: blankToNull(observation.display), valueNumber: observation.valueNumber === "" ? null : Number(observation.valueNumber),
        unit: blankToNull(observation.unit), valueText: blankToNull(observation.valueText), status: "final",
        effectiveDateTime: observation.effectiveDateTime ? new Date(observation.effectiveDateTime).toISOString() : null
      });
      setObservation(Object.assign({}, EMPTY_OBSERVATION));
      props.onChanged();
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  function renderCondition(item) {
    return (
      <tr key={item.conditionId}>
        <td>{item.code}</td><td>{item.display}</td><td><StatusBadge value={item.clinicalStatus} /></td><td>{item.onsetDate}</td>
      </tr>
    );
  }

  function renderObservation(item) {
    const value = item.valueNumber !== null && item.valueNumber !== undefined ? item.valueNumber + " " + (item.unit || "") : item.valueText;
    return (
      <tr key={item.observationId}>
        <td>{item.code}</td><td>{item.display}</td><td>{value}</td><td>{item.category}</td><td>{item.effectiveDateTime}</td>
      </tr>
    );
  }

  return (
    <div className="two-columns">
      <div>
        <h3>Conditions</h3>
        <table className="table">
          <thead><tr><th>ICD-10</th><th>Description</th><th>Status</th><th>Onset</th></tr></thead>
          <tbody>{props.conditions.map(renderCondition)}</tbody>
        </table>
        <form className="card form" onSubmit={handleAddCondition}>
          <h4>Add condition</h4>
          <div className="grid">
            <label>ICD-10 code *<input name="code" value={condition.code} onChange={handleConditionChange} required placeholder="G47.33" /></label>
            <label>Description<input name="display" value={condition.display} onChange={handleConditionChange} /></label>
            <label>Onset date<input type="date" name="onsetDate" value={condition.onsetDate} onChange={handleConditionChange} /></label>
          </div>
          <div className="actions"><button type="submit" className="primary" disabled={busy}>Add condition</button></div>
        </form>
      </div>

      <div>
        <h3>Observations</h3>
        <table className="table">
          <thead><tr><th>LOINC</th><th>Description</th><th>Value</th><th>Category</th><th>When</th></tr></thead>
          <tbody>{props.observations.map(renderObservation)}</tbody>
        </table>
        <form className="card form" onSubmit={handleAddObservation}>
          <h4>Add observation</h4>
          <ErrorBox error={error} />
          <div className="grid">
            <label>Category
              <select name="category" value={observation.category} onChange={handleObservationChange}>
                <option value="laboratory">laboratory</option>
                <option value="vital-signs">vital-signs</option>
              </select>
            </label>
            <label>LOINC code *<input name="code" value={observation.code} onChange={handleObservationChange} required placeholder="33914-3" /></label>
            <label>Description<input name="display" value={observation.display} onChange={handleObservationChange} placeholder="eGFR" /></label>
            <label>Number<input type="number" step="any" name="valueNumber" value={observation.valueNumber} onChange={handleObservationChange} /></label>
            <label>Unit<input name="unit" value={observation.unit} onChange={handleObservationChange} placeholder="mL/min/1.73m2" /></label>
            <label>Text value<input name="valueText" value={observation.valueText} onChange={handleObservationChange} /></label>
            <label>When<input type="datetime-local" name="effectiveDateTime" value={observation.effectiveDateTime} onChange={handleObservationChange} /></label>
          </div>
          <div className="actions"><button type="submit" className="primary" disabled={busy}>Add observation</button></div>
        </form>
      </div>
    </div>
  );
}
