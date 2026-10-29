import React, { useState } from "react";
import { submitPriorAuth, getPriorAuth, inquirePriorAuth, cancelPriorAuth } from "../api/gatewayApi.js";
import { shortId, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import DecisionView from "./DecisionView.jsx";

/**
 * Default facility (location) for the PAS request: the first location. Like the client's EHR, orders carry no location;
 * the gateway takes the facility (and place of service) only from orderLocationCode in the request body.
 */
function defaultLocation(locations) {
  return locations.length > 0 ? locations[0].locationId : "";
}

/**
 * STEP 3 - PAS. Submits the prior authorization (POST /pas/requests) with the chosen clinical documents;
 * completed questionnaires of the order are attached by the gateway. Then: refresh, ask the payer ($inquire), cancel.
 * props: patient, order, piInsurancePlanId, decision, forms, data, paDecision, onDecision(decision).
 */
export default function PasStep(props) {
  const order = props.order;
  const data = props.data;
  const [requestId, setRequestId] = useState("PA-" + order.orderId.toUpperCase() + "-" + shortId().toUpperCase());
  const [orderLocationCode, setOrderLocationCode] = useState(defaultLocation(data.locations));
  const [priority, setPriority] = useState(order.priority === "urgent" ? "urgent" : "routine");
  const [documentIds, setDocumentIds] = useState([]);
  const [notes, setNotes] = useState("");
  // header of the authorization request form (pre-filled from the order)
  const [requestType, setRequestType] = useState(order.requestType || "new");
  const [patientType, setPatientType] = useState(order.patientType || "permanent");
  const [previousAuthorization, setPreviousAuthorization] = useState(order.previousAuthorizationNumber || "");
  const [previousStart, setPreviousStart] = useState(order.previousStartDate || "");
  const [previousEnd, setPreviousEnd] = useState(order.previousEndDate || "");
  const [previousTreatments, setPreviousTreatments] = useState(order.previousTreatments == null ? "" : String(order.previousTreatments));
  const [referringId, setReferringId] = useState(order.referringPractitionerId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const paDecision = props.paDecision;
  const needed = props.decision ? props.decision.callPas : false;

  function handleRequestId(event) { setRequestId(event.target.value); }
  function handleLocation(event) { setOrderLocationCode(event.target.value); }
  function handlePriority(event) { setPriority(event.target.value); }
  function handleNotes(event) { setNotes(event.target.value); }
  function handleRequestType(event) { setRequestType(event.target.value); }
  function handlePatientType(event) { setPatientType(event.target.value); }
  function handlePreviousAuthorization(event) { setPreviousAuthorization(event.target.value); }
  function handlePreviousStart(event) { setPreviousStart(event.target.value); }
  function handlePreviousEnd(event) { setPreviousEnd(event.target.value); }
  function handlePreviousTreatments(event) { setPreviousTreatments(event.target.value); }
  function handleReferring(event) { setReferringId(event.target.value); }

  function handleDocument(event) {
    const id = event.target.value;
    const copy = [];
    for (let i = 0; i < documentIds.length; i++) {
      if (documentIds[i] !== id) {
        copy.push(documentIds[i]);
      }
    }
    if (event.target.checked) {
      copy.push(id);
    }
    setDocumentIds(copy);
  }

  /** Runs a gateway call; a PAS rejection (422) comes back with the decision in the error body. */
  async function run(work) {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (result) {
        props.onDecision(result);
      }
    } catch (callError) {
      setError(callError);
      if (callError.body && callError.body.requestId && callError.body.overallStatus) {
        props.onDecision(callError.body);
      }
    }
    setBusy(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    run(function submit() {
      return submitPriorAuth({
        requestId: requestId.trim(),
        piInsurancePlanId: props.piInsurancePlanId,
        patientId: props.patient.patientId,
        coverageId: order.coverageId || null,
        // required by the gateway: the facility (Claim.provider, NPI) and the place of service come only from this code
        orderLocationCode: orderLocationCode,
        requestingPractitionerId: order.orderingPractitionerId || null,
        orderIds: [order.orderId],
        priority: priority,
        questionnaireResponseIds: [],
        documentIds: documentIds,
        notes: blankToNull(notes),
        requestType: requestType,
        previousAuthorizationNumber: requestType === "renewal" ? blankToNull(previousAuthorization) : null,
        previousServiceStart: requestType === "renewal" ? blankToNull(previousStart) : null,
        previousServiceEnd: requestType === "renewal" ? blankToNull(previousEnd) : null,
        previousTreatments: requestType === "renewal" && previousTreatments !== "" ? Number(previousTreatments) : null,
        patientType: patientType,
        referringPractitionerId: blankToNull(referringId),
        writeBack: true
      });
    });
  }

  function handleRefresh() {
    run(function refresh() { return getPriorAuth(paDecision.requestId); });
  }

  function handleInquire() {
    run(function inquire() { return inquirePriorAuth(paDecision.requestId); });
  }

  function handleCancel() {
    if (!window.confirm("Cancel prior authorization " + paDecision.requestId + " at the payer?")) {
      return;
    }
    run(function cancel() { return cancelPriorAuth(paDecision.requestId, "Cancelled from the mock EHR."); });
  }

  function renderLocation(location) {
    return <option key={location.locationId} value={location.locationId}>{location.name} ({location.locationId}, NPI {location.npi || "none"}, POS {location.placeOfServiceCode || "none"})</option>;
  }

  function renderPractitioner(practitioner) {
    return <option key={practitioner.practitionerId} value={practitioner.practitionerId}>{practitioner.prefix} {practitioner.firstName} {practitioner.lastName} (NPI {practitioner.npi})</option>;
  }

  function renderDocument(document) {
    const checked = documentIds.indexOf(document.documentId) >= 0;
    return (
      <label key={document.documentId} className="check">
        <input type="checkbox" value={document.documentId} checked={checked} onChange={handleDocument} />
        {document.title || document.typeDisplay} <span className="muted small">(LOINC {document.typeCode}, {document.documentId})</span>
      </label>
    );
  }

  let completedForms = 0;
  let openForms = 0;
  for (let i = 0; i < props.forms.length; i++) {
    if (props.forms[i].status === "completed") {
      completedForms++;
    } else {
      openForms++;
    }
  }

  const submitted = paDecision && paDecision.overallStatus !== "error";
  return (
    <div className={"step card" + (needed || paDecision ? "" : " step-dim")}>
      <div className="step-head">
        <span className="step-number">3</span>
        <h4>Prior authorization request (PAS)</h4>
        {paDecision ? (
          <span className="step-buttons">
            <button type="button" onClick={handleRefresh} disabled={busy}>Refresh</button>
            <button type="button" onClick={handleInquire} disabled={busy}>Ask payer now</button>
            <button type="button" onClick={handleCancel} disabled={busy || paDecision.overallStatus === "cancelled"}>Cancel request</button>
          </span>
        ) : null}
      </div>
      <ErrorBox error={error} />
      {!needed && !paDecision ? <p className="muted">Needed when the coverage check says prior authorization is required.</p> : null}

      {!submitted ? (
        <form className="form" onSubmit={handleSubmit}>
          {openForms > 0 ? <div className="alert alert-warn">{openForms} questionnaire(s) not completed yet. Only completed ones are attached.</div> : null}
          {completedForms > 0 ? <div className="alert alert-info">{completedForms} completed questionnaire(s) will be attached automatically.</div> : null}
          <div className="grid">
            <label>Request id<input value={requestId} onChange={handleRequestId} required /></label>
            <label>Facility (orderLocationCode)
              <select value={orderLocationCode} onChange={handleLocation} required>
                {data.locations.length === 0 ? <option value="">(no locations)</option> : null}
                {data.locations.map(renderLocation)}
              </select>
            </label>
            <label>Priority
              <select value={priority} onChange={handlePriority}>
                <option value="routine">routine (7 days)</option>
                <option value="urgent">urgent (72 hours)</option>
              </select>
            </label>
            <label>Request type
              <select value={requestType} onChange={handleRequestType}>
                <option value="new">New authorization</option>
                <option value="renewal">Renewal</option>
              </select>
            </label>
            <label>Patient type
              <select value={patientType} onChange={handlePatientType}>
                <option value="permanent">Permanent</option>
                <option value="transient">Transient (visiting)</option>
              </select>
            </label>
            <label>Referring physician
              <select value={referringId} onChange={handleReferring}>
                <option value="">(none)</option>
                {data.practitioners.map(renderPractitioner)}
              </select>
            </label>
            {requestType === "renewal" ? <label>Previous authorization # *<input value={previousAuthorization} onChange={handlePreviousAuthorization} required /></label> : null}
            {requestType === "renewal" ? <label>Previous DOS from<input type="date" value={previousStart} onChange={handlePreviousStart} /></label> : null}
            {requestType === "renewal" ? <label>Previous DOS to<input type="date" value={previousEnd} onChange={handlePreviousEnd} /></label> : null}
            {requestType === "renewal" ? <label>Previous # of treatments<input type="number" min="0" value={previousTreatments} onChange={handlePreviousTreatments} /></label> : null}
          </div>
          <p className="muted small">Requested DOS {order.requestedStartDate || "?"} to {order.requestedEndDate || "?"}, {order.quantity} treatments / units (from the order).</p>
          <div className="label">Clinical documents to send with the request</div>
          {data.documents.length > 0 ? <div className="checks">{data.documents.map(renderDocument)}</div> : <p className="muted small">No documents on file (add them on the Documents tab).</p>}
          <label className="wide">Note for the reviewer<textarea value={notes} onChange={handleNotes} rows={2} maxLength={264} /></label>
          <div className="actions">
            <button type="submit" className="primary" disabled={busy || props.piInsurancePlanId == null || !orderLocationCode}>{busy ? "Sending..." : "Submit prior authorization"}</button>
          </div>
        </form>
      ) : null}

      <DecisionView decision={paDecision} />
    </div>
  );
}
