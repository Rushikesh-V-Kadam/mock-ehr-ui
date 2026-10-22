import React, { useState } from "react";
import { createOrder } from "../api/ehrApi.js";
import { withField, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";
import OrderWorkflow from "./OrderWorkflow.jsx";

/**
 * Quick picks = the codes of the provider's authorization request form. Each one matches a coverage rule of the
 * mock payer (DaVinciPriorAuth Data/SeedData.cs). Quantity = # of treatments, or HCPCS billing units for drugs.
 * See docs/DIALYSIS-DEMO-GUIDE.md.
 */
const PRESETS = [
  { key: "", label: "(choose to fill the form)" },
  // treatment codes
  { key: "g0491", label: "G0491 Dialysis - AKI (PA + AKI questionnaire)", orderType: "service", codeSystem: "HCPCS", code: "G0491",
    codeDisplay: "Dialysis for acute kidney injury (without ESRD)", dx: "N17.9", dxDisplay: "Acute kidney failure, unspecified", quantity: "12" },
  { key: "90935", label: "90935 In-center hemo x39 (PA + questionnaire + lab report)", orderType: "service", codeSystem: "CPT", code: "90935",
    codeDisplay: "In-center hemodialysis, 3 times a week", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "39" },
  { key: "90937", label: "90937 In-center hemo, repeated evaluation (PA + questionnaire)", orderType: "service", codeSystem: "CPT", code: "90937",
    codeDisplay: "In-center hemodialysis, repeated evaluation", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "39" },
  { key: "90945", label: "90945 Home peritoneal (PA + adaptive questionnaire)", orderType: "service", codeSystem: "CPT", code: "90945",
    codeDisplay: "Home peritoneal dialysis", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "1" },
  { key: "90999", label: "90999 NxStage home hemo (PA + adaptive questionnaire)", orderType: "service", codeSystem: "CPT", code: "90999",
    codeDisplay: "Home hemodialysis (NxStage)", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "1" },
  { key: "90989", label: "90989 Home training, completed course (PA only)", orderType: "service", codeSystem: "CPT", code: "90989",
    codeDisplay: "Home dialysis training, completed course", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "1" },
  { key: "90993", label: "90993 Home training, per session (PA only, max 25)", orderType: "service", codeSystem: "CPT", code: "90993",
    codeDisplay: "Home dialysis training, per session", dx: "N18.6", dxDisplay: "End stage renal disease", quantity: "20" },
  // drug codes (quantity in billing units)
  { key: "q5105", label: "Q5105 Retacrit - units of 100 (PA + ESA questionnaire)", orderType: "medication", codeSystem: "HCPCS", code: "Q5105",
    codeDisplay: "Retacrit (epoetin alfa-epbx), 100 units", dx: "D63.1", dxDisplay: "Anemia in chronic kidney disease", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "1560", notes: "4,000 units IV with each dialysis treatment (3 times a week)" },
  { key: "j0882", label: "J0882 Aranesp - mcg (PA + ESA questionnaire)", orderType: "medication", codeSystem: "HCPCS", code: "J0882",
    codeDisplay: "Aranesp (darbepoetin alfa), 1 mcg", dx: "D63.1", dxDisplay: "Anemia in chronic kidney disease", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "520", notes: "40 mcg IV once a week with dialysis" },
  { key: "j0887", label: "J0887 Mircera - mcg (PA + ESA questionnaire)", orderType: "medication", codeSystem: "HCPCS", code: "J0887",
    codeDisplay: "Mircera (methoxy polyethylene glycol-epoetin beta), 1 mcg", dx: "D63.1", dxDisplay: "Anemia in chronic kidney disease", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "300", notes: "100 mcg IV once a month" },
  { key: "j1756", label: "J1756 Venofer - mg (PA + iron questionnaire)", orderType: "medication", codeSystem: "HCPCS", code: "J1756",
    codeDisplay: "Venofer (iron sucrose), 1 mg", dx: "D50.9", dxDisplay: "Iron deficiency anemia, unspecified", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "1000", notes: "100 mg IV with 10 consecutive dialysis treatments" },
  { key: "j0606", label: "J0606 Parsabiv - units of 0.1 mg (PA + hyperparathyroidism questionnaire)", orderType: "medication", codeSystem: "HCPCS", code: "J0606",
    codeDisplay: "Parsabiv (etelcalcetide), 0.1 mg", dx: "N25.81", dxDisplay: "Secondary hyperparathyroidism of renal origin", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "1950", notes: "5 mg IV 3 times a week at the end of dialysis" },
  { key: "j0604", label: "J0604 Sensipar - mg (not covered: pharmacy benefit)", orderType: "medication", codeSystem: "HCPCS", code: "J0604",
    codeDisplay: "Sensipar (cinacalcet, oral), 1 mg", dx: "N25.81", dxDisplay: "Secondary hyperparathyroidism of renal origin", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "2700", notes: "30 mg by mouth once daily" },
  { key: "j2501", label: "J2501 Zemplar - mcg (no PA)", orderType: "medication", codeSystem: "HCPCS", code: "J2501",
    codeDisplay: "Zemplar (paricalcitol), 1 mcg", dx: "N25.81", dxDisplay: "Secondary hyperparathyroidism of renal origin", dx2: "N18.6", dx2Display: "End stage renal disease",
    quantity: "156", notes: "4 mcg IV 3 times a week with dialysis" }
];

const EMPTY = {
  preset: "", orderType: "service", codeSystem: "CPT", code: "", codeDisplay: "", quantity: "1",
  requestedStartDate: "", requestedEndDate: "", orderingPractitionerId: "",
  coverageId: "", dx: "", dxDisplay: "", dx2: "", dx2Display: "", priority: "routine", notes: "",
  referringPractitionerId: "", requestType: "new", patientType: "permanent",
  previousAuthorizationNumber: "", previousStartDate: "", previousEndDate: "", previousTreatments: ""
};

/**
 * Orders of the patient: list, "New order" form, and the prior auth workflow of the selected order.
 * props: patient, data (insurances, orders, practitioners, locations, organizations, documents, payers), onChanged.
 */
export default function OrdersSection(props) {
  const data = props.data;
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(Object.assign({}, EMPTY));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function handleChange(event) {
    setForm(withField(form, event));
  }

  function handlePreset(event) {
    const key = event.target.value;
    const copy = Object.assign({}, form, { preset: key });
    for (let i = 0; i < PRESETS.length; i++) {
      const preset = PRESETS[i];
      if (preset.key === key && key !== "") {
        copy.orderType = preset.orderType;
        copy.codeSystem = preset.codeSystem;
        copy.code = preset.code;
        copy.codeDisplay = preset.codeDisplay;
        copy.dx = preset.dx;
        copy.dxDisplay = preset.dxDisplay;
        copy.quantity = preset.quantity || "1";
        copy.dx2 = preset.dx2 || "";
        copy.dx2Display = preset.dx2Display || "";
        copy.notes = preset.notes || "";
      }
    }
    setForm(copy);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const diagnoses = [];
    if (form.dx.trim()) {
      diagnoses.push({ code: form.dx.trim(), codeSystem: "ICD10CM", display: blankToNull(form.dxDisplay) });
    }
    if (form.dx2.trim()) {
      diagnoses.push({ code: form.dx2.trim(), codeSystem: "ICD10CM", display: blankToNull(form.dx2Display) });
    }
    const firstCoverage = data.insurances.length > 0 ? data.insurances[0].coverageId : null;
    try {
      const saved = await createOrder({
        orderId: "", orderType: form.orderType, patientId: props.patient.patientId, status: "draft",
        code: form.code.trim(), codeSystem: form.codeSystem, codeDisplay: blankToNull(form.codeDisplay),
        quantity: form.quantity ? Number(form.quantity) : null,
        requestedStartDate: blankToNull(form.requestedStartDate), requestedEndDate: blankToNull(form.requestedEndDate),
        // Like the client's EHR, an order carries no location, facility or place of service: the facility is chosen
        // in the PAS step (orderLocationCode of the PAS request).
        orderingPractitionerId: blankToNull(form.orderingPractitionerId),
        coverageId: blankToNull(form.coverageId) || firstCoverage,
        diagnoses: diagnoses, priority: form.priority, notes: blankToNull(form.notes),
        referringPractitionerId: blankToNull(form.referringPractitionerId),
        requestType: form.requestType, patientType: form.patientType,
        previousAuthorizationNumber: form.requestType === "renewal" ? blankToNull(form.previousAuthorizationNumber) : null,
        previousStartDate: form.requestType === "renewal" ? blankToNull(form.previousStartDate) : null,
        previousEndDate: form.requestType === "renewal" ? blankToNull(form.previousEndDate) : null,
        previousTreatments: form.requestType === "renewal" && form.previousTreatments ? Number(form.previousTreatments) : null
      });
      setForm(Object.assign({}, EMPTY));
      setAdding(false);
      setSelectedId(saved.orderId);
      props.onChanged();
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  function handleSelect(event) {
    setSelectedId(event.currentTarget.dataset.id);
  }

  function showForm() {
    setAdding(true);
  }

  function hideForm() {
    setAdding(false);
  }

  function renderPreset(preset) {
    return <option key={preset.key} value={preset.key}>{preset.label}</option>;
  }
  function renderPractitioner(practitioner) {
    return <option key={practitioner.practitionerId} value={practitioner.practitionerId}>{practitioner.prefix} {practitioner.firstName} {practitioner.lastName} (NPI {practitioner.npi})</option>;
  }
  function renderCoverage(insurance) {
    return <option key={insurance.coverageId} value={insurance.coverageId}>{insurance.payerName} - {insurance.memberId}</option>;
  }

  function renderRow(order) {
    const selected = order.orderId === selectedId;
    const diagnosis = order.diagnoses && order.diagnoses.length > 0 ? order.diagnoses[0].code : "";
    return (
      <tr key={order.orderId} className={selected ? "selected" : ""}>
        <td>{order.orderId}
          <div className="muted small">{order.requestType === "renewal" ? "renewal of " + order.previousAuthorizationNumber : "new"}{order.patientType === "transient" ? ", transient" : ""}{order.priority === "urgent" ? ", URGENT" : ""}</div>
        </td>
        <td>{order.codeSystem} {order.code}<div className="muted small">{order.codeDisplay}</div></td>
        <td>{order.orderType}</td>
        <td>{diagnosis}</td>
        <td>{order.quantity}</td>
        <td><StatusBadge value={order.status} /></td>
        <td><button type="button" className={selected ? "primary" : ""} data-id={order.orderId} onClick={handleSelect}>Prior auth &rarr;</button></td>
      </tr>
    );
  }

  let selectedOrder = null;
  for (let i = 0; i < data.orders.length; i++) {
    if (data.orders[i].orderId === selectedId) {
      selectedOrder = data.orders[i];
    }
  }

  return (
    <div>
      <div className="page-head">
        <h3>Orders</h3>
        {!adding ? <button type="button" className="primary" onClick={showForm}>+ New order</button> : null}
      </div>

      {adding ? (
        <form className="card form" onSubmit={handleSubmit}>
          <h3>New order</h3>
          <ErrorBox error={error} />
          <label className="wide">Quick pick (codes of the authorization request form)
            <select name="preset" value={form.preset} onChange={handlePreset}>{PRESETS.map(renderPreset)}</select>
          </label>
          <div className="label">Authorization request (form header)</div>
          <div className="grid">
            <label>Request type
              <select name="requestType" value={form.requestType} onChange={handleChange}>
                <option value="new">New authorization</option>
                <option value="renewal">Renewal</option>
              </select>
            </label>
            <label>Patient type
              <select name="patientType" value={form.patientType} onChange={handleChange}>
                <option value="permanent">Permanent</option>
                <option value="transient">Transient (visiting)</option>
              </select>
            </label>
            {form.requestType === "renewal" ? <label>Previous authorization # *<input name="previousAuthorizationNumber" value={form.previousAuthorizationNumber} onChange={handleChange} required /></label> : null}
            {form.requestType === "renewal" ? <label>Previous DOS from<input type="date" name="previousStartDate" value={form.previousStartDate} onChange={handleChange} /></label> : null}
            {form.requestType === "renewal" ? <label>Previous DOS to<input type="date" name="previousEndDate" value={form.previousEndDate} onChange={handleChange} /></label> : null}
            {form.requestType === "renewal" ? <label>Previous # of treatments<input type="number" min="0" name="previousTreatments" value={form.previousTreatments} onChange={handleChange} /></label> : null}
            <label>Referring physician
              <select name="referringPractitionerId" value={form.referringPractitionerId} onChange={handleChange}>
                <option value="">(none)</option>
                {data.practitioners.map(renderPractitioner)}
              </select>
            </label>
          </div>
          <div className="label">Service (treatment or drug code)</div>
          <div className="grid">
            <label>Order type
              <select name="orderType" value={form.orderType} onChange={handleChange}>
                <option value="service">service</option>
                <option value="device">device</option>
                <option value="medication">medication</option>
              </select>
            </label>
            <label>Code system
              <select name="codeSystem" value={form.codeSystem} onChange={handleChange}>
                <option value="CPT">CPT</option>
                <option value="HCPCS">HCPCS</option>
                <option value="RXNORM">RXNORM</option>
              </select>
            </label>
            <label>Code *<input name="code" value={form.code} onChange={handleChange} required placeholder="90935" /></label>
            <label>Description<input name="codeDisplay" value={form.codeDisplay} onChange={handleChange} /></label>
            <label># of treatments / billing units<input type="number" min="1" name="quantity" value={form.quantity} onChange={handleChange} /></label>
            <label>Priority
              <select name="priority" value={form.priority} onChange={handleChange}>
                <option value="routine">routine</option>
                <option value="urgent">urgent</option>
              </select>
            </label>
            <label>Requested DOS from<input type="date" name="requestedStartDate" value={form.requestedStartDate} onChange={handleChange} /></label>
            <label>Requested DOS to<input type="date" name="requestedEndDate" value={form.requestedEndDate} onChange={handleChange} /></label>
            <label>Attending nephrologist (ordering)
              <select name="orderingPractitionerId" value={form.orderingPractitionerId} onChange={handleChange}>
                <option value="">(none)</option>
                {data.practitioners.map(renderPractitioner)}
              </select>
            </label>
            <label>Insurance
              <select name="coverageId" value={form.coverageId} onChange={handleChange}>
                <option value="">(first on file)</option>
                {data.insurances.map(renderCoverage)}
              </select>
            </label>
            <label>Diagnosis ICD-10 *<input name="dx" value={form.dx} onChange={handleChange} required placeholder="N18.6" /></label>
            <label>Diagnosis description<input name="dxDisplay" value={form.dxDisplay} onChange={handleChange} /></label>
            <label>2nd diagnosis<input name="dx2" value={form.dx2} onChange={handleChange} /></label>
            <label>2nd description<input name="dx2Display" value={form.dx2Display} onChange={handleChange} /></label>
          </div>
          <label className="wide">Notes (dose, frequency, anything for the reviewer)<textarea name="notes" value={form.notes} onChange={handleChange} rows={2} /></label>
          <div className="actions">
            <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save order"}</button>
            <button type="button" onClick={hideForm}>Cancel</button>
          </div>
        </form>
      ) : null}

      <table className="table">
        <thead><tr><th>Order</th><th>Code</th><th>Type</th><th>Dx</th><th>Qty</th><th>Status</th><th></th></tr></thead>
        <tbody>{data.orders.map(renderRow)}</tbody>
      </table>
      {data.orders.length === 0 ? <p className="muted">No orders yet.</p> : null}

      {selectedOrder ? <OrderWorkflow key={selectedOrder.orderId} patient={props.patient} order={selectedOrder} data={data} onChanged={props.onChanged} /> : null}
    </div>
  );
}
