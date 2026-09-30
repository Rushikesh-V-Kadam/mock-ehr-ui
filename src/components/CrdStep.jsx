import React, { useState } from "react";
import { orderSign } from "../api/gatewayApi.js";
import { shortId } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";
import JsonView from "./JsonView.jsx";

/**
 * STEP 1 - CRD. "Sign order" sends POST /api/v1/crd/order-sign and shows the payer's answer for this order:
 * covered, pa-needed, doc-needed, questionnaires, and what to do next (callDtr / callPas).
 * props: patient, order, payerName, decision, crdResponse, onDone(response, decision), onOpenQuestionnaire().
 */
export default function CrdStep(props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const decision = props.decision;

  async function handleSign() {
    setBusy(true);
    setError(null);
    try {
      const response = await orderSign({
        eventId: "evt-" + props.order.orderId + "-" + shortId(),
        payerName: props.payerName,
        patientId: props.patient.patientId,
        orderIds: [props.order.orderId],
        coverageId: props.order.coverageId || null,
        encounterId: props.order.encounterId || null,
        userPractitionerId: props.order.orderingPractitionerId || null,
        writeBack: true
      });
      let orderDecision = null;
      for (let i = 0; i < response.decisions.length; i++) {
        if (response.decisions[i].orderId === props.order.orderId) {
          orderDecision = response.decisions[i];
        }
      }
      props.onDone(response, orderDecision);
    } catch (signError) {
      setError(signError);
    }
    setBusy(false);
  }

  function handleOpenQuestionnaire() {
    props.onOpenQuestionnaire();
  }

  function renderMessage(message, index) {
    return (
      <li key={index} className={"message message-" + message.severity}>
        <strong>{message.summary}</strong>
        {message.detail && message.detail !== message.summary ? <div className="small">{message.detail}</div> : null}
        {message.link && message.link.type === "smart" ? (
          <div className="small">
            <button type="button" className="primary" onClick={handleOpenQuestionnaire}>Open questionnaire &#8599;</button>
            <span className="muted"> opens the payer questionnaire in the questionnaire app (payer SMART apps come later)</span>
          </div>
        ) : null}
        {message.link && message.link.type !== "smart" ? (
          <div className="small"><a href={message.link.url} target="_blank" rel="noreferrer">{message.link.label || message.link.url}</a></div>
        ) : null}
      </li>
    );
  }

  function renderUrl(url) {
    return <li key={url} className="mono small">{url}</li>;
  }

  const messages = [];
  if (decision && decision.messages) {
    for (let i = 0; i < decision.messages.length; i++) {
      messages.push(decision.messages[i]);
    }
  }
  if (props.crdResponse && props.crdResponse.messages) {
    for (let i = 0; i < props.crdResponse.messages.length; i++) {
      messages.push(props.crdResponse.messages[i]);
    }
  }

  let nextStep = null;
  if (decision) {
    if (decision.callDtr && decision.callPas) {
      nextStep = "Fill in the payer questionnaire (step 2), then submit the prior authorization (step 3).";
    } else if (decision.callDtr) {
      nextStep = "Fill in the payer questionnaire (step 2).";
    } else if (decision.callPas) {
      nextStep = "Submit the prior authorization (step 3).";
    } else if (decision.covered === "not-covered") {
      nextStep = "Not covered by the payer: tell the patient.";
    } else if (decision.covered === "unknown") {
      nextStep = "The payer could not be asked. Use the payer's normal process.";
    } else {
      nextStep = "No prior authorization or documentation needed.";
    }
  }

  return (
    <div className="step card">
      <div className="step-head">
        <span className="step-number">1</span>
        <h4>Coverage check (CRD order-sign)</h4>
        <button type="button" className="primary" onClick={handleSign} disabled={busy || !props.payerName}>
          {busy ? "Asking payer..." : decision ? "Sign again" : "Sign order"}
        </button>
      </div>
      <ErrorBox error={error} />

      {decision ? (
        <div>
          <div className="facts">
            <div><span>Covered</span><StatusBadge value={decision.covered} /></div>
            <div><span>Prior auth</span><StatusBadge value={decision.priorAuthNeeded} /></div>
            <div><span>Documentation</span><StatusBadge value={decision.documentationNeeded} /></div>
            <div><span>Questionnaire</span><StatusBadge value={decision.callDtr ? "needed" : "no"} /></div>
            <div><span>Submit PA</span><StatusBadge value={decision.callPas ? "needed" : "no"} /></div>
          </div>
          {nextStep ? <p className="next-step">Next: {nextStep}</p> : null}
          {decision.questionnaireUrls && decision.questionnaireUrls.length > 0 ? (
            <div><div className="label">Payer questionnaires</div><ul>{decision.questionnaireUrls.map(renderUrl)}</ul></div>
          ) : null}
          {decision.coverageAssertionId ? <div className="small muted">Coverage assertion id: {decision.coverageAssertionId}</div> : null}
          {messages.length > 0 ? <ul className="messages">{messages.map(renderMessage)}</ul> : null}
          {props.crdResponse ? (
            <div className="small muted">Payer call: {props.crdResponse.payerCall.outcome} in {props.crdResponse.payerCall.durationMs} ms
              {props.crdResponse.payerCall.error ? " - " + props.crdResponse.payerCall.error : ""}</div>
          ) : null}
          <JsonView value={props.crdResponse || decision} label="Raw CRD answer" />
        </div>
      ) : (
        <p className="muted">Not signed yet. Signing asks {props.payerName || "the payer"} whether this order needs prior authorization.</p>
      )}
    </div>
  );
}
