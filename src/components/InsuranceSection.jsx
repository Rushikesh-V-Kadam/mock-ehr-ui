import React, { useState } from "react";
import { addInsurance } from "../api/ehrApi.js";
import { withField, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";

const EMPTY = {
  piInsurancePlanId: "", payerId: "", payerName: "", memberId: "", planId: "", planName: "", groupNumber: "",
  relationshipToSubscriber: "self", effectiveDate: "", terminationDate: ""
};

/**
 * Insurance list + form. The insurance plan id is the key of the payer in the Payer Gateway (PA_PAYER.PI_INSURANCE_PLAN_ID):
 * every gateway request of an order sends the plan id of the order's insurance. 1001 = the local mock payer.
 * props: patientId, insurances, onChanged.
 */
/** The typed insurance plan id as a whole number, or null when it is empty or not a whole number. */
function toPlanId(text) {
  const value = String(text || "").trim();
  if (!/^[0-9]+$/.test(value)) {
    return null;
  }
  return parseInt(value, 10);
}

export default function InsuranceSection(props) {
  const [form, setForm] = useState(Object.assign({}, EMPTY));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function handleChange(event) {
    setForm(withField(form, event));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addInsurance(props.patientId, {
        coverageId: "", patientId: props.patientId, status: "active", memberId: form.memberId.trim(), payerId: form.payerId.trim(),
        payerName: blankToNull(form.payerName), piInsurancePlanId: toPlanId(form.piInsurancePlanId), planId: blankToNull(form.planId), planName: blankToNull(form.planName),
        groupNumber: blankToNull(form.groupNumber), relationshipToSubscriber: form.relationshipToSubscriber,
        effectiveDate: blankToNull(form.effectiveDate), terminationDate: blankToNull(form.terminationDate), coverageOrder: 1, coverageType: "HIP"
      });
      setForm(Object.assign({}, EMPTY));
      props.onChanged();
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  function renderRow(insurance) {
    return (
      <tr key={insurance.coverageId}>
        <td>{insurance.coverageId}</td>
        <td>{insurance.payerName}<div className="muted small">{insurance.payerId}</div></td>
        <td>{insurance.piInsurancePlanId == null ? "-" : insurance.piInsurancePlanId}</td>
        <td>{insurance.memberId}</td>
        <td>{insurance.planName || insurance.planId}</td>
        <td>{insurance.effectiveDate} &ndash; {insurance.terminationDate}</td>
        <td><StatusBadge value={insurance.status} /></td>
      </tr>
    );
  }

  return (
    <div>
      <table className="table">
        <thead><tr><th>Coverage id</th><th>Payer</th><th>Insurance plan id</th><th>Member id</th><th>Plan</th><th>Period</th><th>Status</th></tr></thead>
        <tbody>{props.insurances.map(renderRow)}</tbody>
      </table>
      {props.insurances.length === 0 ? <p className="muted">No insurance on file. Add one before signing orders.</p> : null}

      <form className="card form" onSubmit={handleSubmit}>
        <h3>Add insurance</h3>
        <ErrorBox error={error} />
        <div className="grid">
          <label>Insurance plan id *<input type="number" min="1" step="1" name="piInsurancePlanId" value={form.piInsurancePlanId} onChange={handleChange} required placeholder="1001" /></label>
          <label>Payer id *<input name="payerId" value={form.payerId} onChange={handleChange} required placeholder="PAYER001" /></label>
          <label>Payer name<input name="payerName" value={form.payerName} onChange={handleChange} /></label>
          <label>Member id *<input name="memberId" value={form.memberId} onChange={handleChange} required /></label>
          <label>Plan id<input name="planId" value={form.planId} onChange={handleChange} /></label>
          <label>Plan name<input name="planName" value={form.planName} onChange={handleChange} /></label>
          <label>Group number<input name="groupNumber" value={form.groupNumber} onChange={handleChange} /></label>
          <label>Relationship
            <select name="relationshipToSubscriber" value={form.relationshipToSubscriber} onChange={handleChange}>
              <option value="self">self</option>
              <option value="spouse">spouse</option>
              <option value="child">child</option>
              <option value="other">other</option>
            </select>
          </label>
          <label>Effective date<input type="date" name="effectiveDate" value={form.effectiveDate} onChange={handleChange} /></label>
          <label>Termination date<input type="date" name="terminationDate" value={form.terminationDate} onChange={handleChange} /></label>
        </div>
        <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Add insurance"}</button></div>
      </form>
    </div>
  );
}
