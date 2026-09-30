import React, { useEffect, useState } from "react";
import { getInformationRequests, submitAttachments, createForms } from "../api/gatewayApi.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";
import JsonView from "./JsonView.jsx";

/**
 * STEP 4 - CDex. When the payer pends the request it can ask for more (information requests). This step shows them,
 * gets any requested questionnaire (then fill it in step 2), and sends more documents / completed forms
 * ($submit-attachment). With "final" the gateway asks the payer for the new decision right away.
 * props: patient, order, payerName, paDecision, forms, data, onDecision(decision), onFormsCreated(forms).
 */
export default function CdexStep(props) {
  const paDecision = props.paDecision;
  const [requests, setRequests] = useState(paDecision.informationRequests || []);
  const [trackingId, setTrackingId] = useState("");
  const [documentIds, setDocumentIds] = useState([]);
  const [formResponseIds, setFormResponseIds] = useState([]);
  const [final, setFinal] = useState(true);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // a newer decision (inquire, refresh) can carry new information requests
  function syncRequests() {
    setRequests(paDecision.informationRequests || []);
  }
  useEffect(syncRequests, [paDecision]);

  async function handleCheck() {
    setBusy(true);
    setError(null);
    try {
      setRequests(await getInformationRequests(paDecision.requestId));
    } catch (checkError) {
      setError(checkError);
    }
    setBusy(false);
  }

  async function handleGetQuestionnaires(event) {
    const urls = event.currentTarget.dataset.urls.split(" ");
    setBusy(true);
    setError(null);
    try {
      const forms = await createForms({
        payerName: props.payerName,
        patientId: props.patient.patientId,
        orderIds: [props.order.orderId],
        coverageId: props.order.coverageId || null,
        questionnaireUrls: urls,
        coverageAssertionId: event.currentTarget.dataset.tracking
      });
      props.onFormsCreated(forms);
    } catch (formError) {
      setError(formError);
    }
    setBusy(false);
  }

  function toggle(list, value, checked) {
    const copy = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] !== value) {
        copy.push(list[i]);
      }
    }
    if (checked) {
      copy.push(value);
    }
    return copy;
  }

  function handleDocument(event) { setDocumentIds(toggle(documentIds, event.target.value, event.target.checked)); }
  function handleForm(event) { setFormResponseIds(toggle(formResponseIds, event.target.value, event.target.checked)); }
  function handleTracking(event) { setTrackingId(event.target.value); }
  function handleFinal(event) { setFinal(event.target.checked); }

  async function handleSend(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sent = await submitAttachments(paDecision.requestId, {
        trackingId: trackingId || null,
        documentIds: documentIds,
        questionnaireResponseIds: formResponseIds,
        lineNumbers: [],
        final: final
      });
      setResult(sent);
      setDocumentIds([]);
      setFormResponseIds([]);
      if (sent.decision) {
        props.onDecision(sent.decision);
      }
    } catch (sendError) {
      setError(sendError);
    }
    setBusy(false);
  }

  function renderNeededDocument(document, index) {
    return <li key={index}>LOINC {document.loincCode} {document.display ? "- " + document.display : ""}{document.lineNumber ? " (line " + document.lineNumber + ")" : ""}</li>;
  }

  function renderRequest(request) {
    return (
      <div key={request.trackingId} className="info-request">
        <div><strong>{request.trackingId}</strong> <StatusBadge value={request.status} /> <span className="muted small">due {request.dueDate || "-"}</span></div>
        {request.documentsNeeded.length > 0 ? <div><div className="label">Documents needed</div><ul>{request.documentsNeeded.map(renderNeededDocument)}</ul></div> : null}
        {request.questionnairesNeeded.length > 0 ? (
          <div>
            <div className="label">Questionnaires needed</div>
            <ul>{request.questionnairesNeeded.map(renderUrl)}</ul>
            <button type="button" data-urls={request.questionnairesNeeded.join(" ")} data-tracking={request.trackingId} onClick={handleGetQuestionnaires} disabled={busy}>
              Get these questionnaires (then open them in step 2)
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderUrl(url) {
    return <li key={url} className="mono small">{url}</li>;
  }

  function renderTrackingOption(request) {
    return <option key={request.trackingId} value={request.trackingId}>{request.trackingId}</option>;
  }

  function renderDocument(document) {
    return (
      <label key={document.documentId} className="check">
        <input type="checkbox" value={document.documentId} checked={documentIds.indexOf(document.documentId) >= 0} onChange={handleDocument} />
        {document.title || document.typeDisplay} <span className="muted small">(LOINC {document.typeCode})</span>
      </label>
    );
  }

  function renderForm(form) {
    if (form.status !== "completed" || !form.questionnaireResponseId) {
      return null;
    }
    return (
      <label key={form.formId} className="check">
        <input type="checkbox" value={form.questionnaireResponseId} checked={formResponseIds.indexOf(form.questionnaireResponseId) >= 0} onChange={handleForm} />
        {form.title || form.questionnaireUrl} <span className="muted small">({form.questionnaireResponseId})</span>
      </label>
    );
  }

  const pended = paDecision.overallStatus === "pended";
  return (
    <div className={"step card" + (pended ? "" : " step-dim")}>
      <div className="step-head">
        <span className="step-number">4</span>
        <h4>Additional documents (CDex)</h4>
        <button type="button" onClick={handleCheck} disabled={busy}>Check payer requests</button>
      </div>
      <ErrorBox error={error} />
      {!pended ? <p className="muted">Used when the request is pended and the payer asks for more information.</p> : null}

      {requests.length > 0 ? requests.map(renderRequest) : <p className="muted small">No information requests from the payer yet.</p>}

      <form className="form" onSubmit={handleSend}>
        <div className="grid">
          <label>Answering request
            <select value={trackingId} onChange={handleTracking}>
              <option value="">(latest open, or unsolicited)</option>
              {requests.map(renderTrackingOption)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={final} onChange={handleFinal} /> Final (payer reviews now)</label>
        </div>
        <div className="label">Documents</div>
        <div className="checks">{props.data.documents.map(renderDocument)}</div>
        <div className="label">Completed questionnaires</div>
        <div className="checks">{props.forms.map(renderForm)}</div>
        <div className="actions">
          <button type="submit" className="primary" disabled={busy || (documentIds.length === 0 && formResponseIds.length === 0)}>
            {busy ? "Sending..." : "Send attachments"}
          </button>
        </div>
      </form>

      {result ? (
        <div className="alert alert-info">
          Sent {result.attachmentCount} attachment(s) for tracking id {result.trackingId}: <StatusBadge value={result.status} />
          {result.decision ? " New decision: " + result.decision.overallStatus : ""}
        </div>
      ) : null}
      <JsonView value={result} label="Raw attachment result" />
    </div>
  );
}
