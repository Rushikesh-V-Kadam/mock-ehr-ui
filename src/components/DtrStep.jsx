import React, { useState } from "react";
import { createForms, questionnaireAppLink } from "../api/gatewayApi.js";
import ErrorBox from "./ErrorBox.jsx";
import StatusBadge from "./StatusBadge.jsx";

/**
 * STEP 2 - DTR. "Get questionnaire" asks the gateway for the payer's questionnaire (POST /dtr/forms).
 * "Open questionnaire" opens the form in the separate questionnaire app (new window). When the app saves the
 * answers, it tells this window and the status here is refreshed. Completed forms are attached to PAS automatically.
 * props: patient, order, piInsurancePlanId, decision, forms, onFormsCreated(forms), onRefresh().
 */
export default function DtrStep(props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const decision = props.decision;
  const needed = decision ? decision.callDtr : false;

  async function handleGetQuestionnaire() {
    setBusy(true);
    setError(null);
    try {
      const forms = await createForms({
        piInsurancePlanId: props.piInsurancePlanId,
        patientId: props.patient.patientId,
        orderIds: [props.order.orderId],
        coverageId: props.order.coverageId || null,
        questionnaireUrls: decision && decision.questionnaireUrls ? decision.questionnaireUrls : [],
        coverageAssertionId: decision ? decision.coverageAssertionId : null
      });
      props.onFormsCreated(forms);
    } catch (formError) {
      setError(formError);
    }
    setBusy(false);
  }

  function handleOpen(event) {
    const formId = event.currentTarget.dataset.id;
    window.open(questionnaireAppLink(formId), "dtr-" + formId, "width=900,height=900");
  }

  function handleRefresh() {
    props.onRefresh();
  }

  function countRequired(form) {
    let required = 0;
    for (let i = 0; i < form.questions.length; i++) {
      if (form.questions[i].required) {
        required++;
      }
    }
    return required;
  }

  function renderForm(form) {
    return (
      <tr key={form.formId}>
        <td>{form.title || form.questionnaireUrl}<div className="muted small mono">{form.questionnaireUrl}</div></td>
        <td>{form.questions.length} ({countRequired(form)} required)</td>
        <td><StatusBadge value={form.status} /></td>
        <td className="mono small">{form.questionnaireResponseId || "-"}</td>
        <td><button type="button" className="primary" data-id={form.formId} onClick={handleOpen}>Open questionnaire &#8599;</button></td>
      </tr>
    );
  }

  let completed = 0;
  for (let i = 0; i < props.forms.length; i++) {
    if (props.forms[i].status === "completed") {
      completed++;
    }
  }

  return (
    <div className={"step card" + (needed || props.forms.length > 0 ? "" : " step-dim")}>
      <div className="step-head">
        <span className="step-number">2</span>
        <h4>Payer questionnaire (DTR)</h4>
        <button type="button" onClick={handleGetQuestionnaire} disabled={busy || props.piInsurancePlanId == null}>
          {busy ? "Getting..." : props.forms.length > 0 ? "Get again" : "Get questionnaire"}
        </button>
        {props.forms.length > 0 ? <button type="button" onClick={handleRefresh}>Refresh status</button> : null}
      </div>
      <ErrorBox error={error} />
      {!needed && props.forms.length === 0 ? <p className="muted">Needed when the coverage check says a questionnaire is required.</p> : null}

      {props.forms.length > 0 ? (
        <div>
          <table className="table">
            <thead><tr><th>Questionnaire</th><th>Questions</th><th>Status</th><th>Saved response</th><th></th></tr></thead>
            <tbody>{props.forms.map(renderForm)}</tbody>
          </table>
          <p className="small muted">{completed} of {props.forms.length} completed. Completed questionnaires are attached to the prior auth request automatically.</p>
        </div>
      ) : null}
    </div>
  );
}
