import React, { useEffect, useState } from "react";
import { getCoverageDecision, listPriorAuthDecisions } from "../api/ehrApi.js";
import { getForm, createForms, questionnaireAppLink } from "../api/gatewayApi.js";
import ErrorBox from "./ErrorBox.jsx";
import CrdStep from "./CrdStep.jsx";
import DtrStep from "./DtrStep.jsx";
import PasStep from "./PasStep.jsx";
import CdexStep from "./CdexStep.jsx";

/** localStorage key with the DTR form ids of an order. */
function formsKey(orderId) {
  return "mock-ehr-forms:" + orderId;
}

/** Saved DTR form ids of an order. */
function loadFormIds(orderId) {
  try {
    const text = window.localStorage.getItem(formsKey(orderId));
    return text ? JSON.parse(text) : [];
  } catch (error) {
    return [];
  }
}

/** Saves the DTR form ids of an order. */
function saveFormIds(orderId, formIds) {
  try {
    window.localStorage.setItem(formsKey(orderId), JSON.stringify(formIds));
  } catch (error) {
    // ignore: the list is kept for this page only
  }
}

/** The gateway payer for the order's insurance (matched on payer name or display name), else the first payer. */
function defaultPayerName(order, insurances, payers) {
  let insurance = null;
  for (let i = 0; i < insurances.length; i++) {
    if (insurances[i].coverageId === order.coverageId) {
      insurance = insurances[i];
    }
  }
  if (!insurance && insurances.length > 0) {
    insurance = insurances[0];
  }
  if (insurance) {
    const wanted = String(insurance.payerName || "").toLowerCase();
    for (let i = 0; i < payers.length; i++) {
      const name = String(payers[i].payerName).toLowerCase();
      const display = String(payers[i].displayName || "").toLowerCase();
      if (wanted === name || wanted === display) {
        return payers[i].payerName;
      }
    }
    if (insurance.payerName) {
      // not a gateway payer: send it anyway, so the gateway answers "payer not configured"
      return insurance.payerName;
    }
  }
  return payers.length > 0 ? payers[0].payerName : "";
}

/**
 * The prior authorization workflow of one order, through the Payer Gateway:
 *   1 CRD   sign the order -> coverage decision (callDtr / callPas)
 *   2 DTR   get the payer questionnaire -> open it in the questionnaire app -> answers saved by the gateway
 *   3 PAS   submit the prior auth request (completed questionnaires + chosen documents are attached)
 *   4 CDex  when pended: see what the payer asks for, send more documents / forms
 * props: patient, order, data, onChanged.
 */
export default function OrderWorkflow(props) {
  const order = props.order;
  const data = props.data;
  const [payerName, setPayerName] = useState(defaultPayerName(order, data.insurances, data.payers));
  const [decision, setDecision] = useState(null);
  const [crdResponse, setCrdResponse] = useState(null);
  const [forms, setForms] = useState([]);
  const [paDecision, setPaDecision] = useState(null);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------- load what is already known for the order
  async function loadExisting() {
    setError(null);
    try {
      const stored = await getCoverageDecision(order.orderId);
      if (stored) {
        setDecision(stored);
      }
      const decisions = await listPriorAuthDecisions(order.orderId);
      if (decisions.length > 0) {
        setPaDecision(decisions[decisions.length - 1]);
      }
    } catch (loadError) {
      setError(loadError);
    }
    await refreshForms();
  }

  /** Reloads every DTR form of the order from the gateway (status, questionnaireResponseId). */
  async function refreshForms() {
    const ids = loadFormIds(order.orderId);
    const loaded = [];
    for (let i = 0; i < ids.length; i++) {
      try {
        loaded.push(await getForm(ids[i]));
      } catch (formError) {
        // form no longer known by the gateway (in-memory storage restarted): drop it
      }
    }
    setForms(loaded);
  }

  function startLoading() {
    loadExisting();
  }
  useEffect(startLoading, [order.orderId]);

  // the questionnaire app tells us when a form was saved
  function listenForQuestionnaireApp() {
    function onMessage(event) {
      if (event.data && event.data.type === "dtr-form-saved") {
        refreshForms();
      }
    }
    window.addEventListener("message", onMessage);
    return function stopListening() {
      window.removeEventListener("message", onMessage);
    };
  }
  useEffect(listenForQuestionnaireApp, [order.orderId]);

  // ---------------------------------------------------------------- callbacks for the steps
  function handleCrdDone(response, orderDecision) {
    setCrdResponse(response);
    setDecision(orderDecision);
  }

  function handleFormsCreated(newForms) {
    const ids = loadFormIds(order.orderId);
    for (let i = 0; i < newForms.length; i++) {
      if (ids.indexOf(newForms[i].formId) < 0) {
        ids.push(newForms[i].formId);
      }
    }
    saveFormIds(order.orderId, ids);
    refreshForms();
  }

  /**
   * "Open questionnaire" from the coverage card (the payer's DTR link). There is no payer SMART app yet, so instead of
   * following the payer's link we open our own questionnaire app: use the order's open form, or get the payer's
   * questionnaire from the gateway first (POST /api/v1/dtr/forms).
   * The window is opened right away (during the click) so the browser does not block it as a pop-up.
   */
  async function openQuestionnaire() {
    const popup = window.open("about:blank", "dtr-" + order.orderId, "width=900,height=900");
    setError(null);
    try {
      let target = null;
      for (let i = 0; i < forms.length; i++) {
        if (!target || (target.status === "completed" && forms[i].status !== "completed")) {
          target = forms[i];
        }
      }
      if (!target) {
        const created = await createForms({
          payerName: payerName,
          patientId: props.patient.patientId,
          orderIds: [order.orderId],
          coverageId: order.coverageId || null,
          questionnaireUrls: decision && decision.questionnaireUrls ? decision.questionnaireUrls : [],
          coverageAssertionId: decision ? decision.coverageAssertionId : null
        });
        handleFormsCreated(created);
        target = created.length > 0 ? created[0] : null;
      }
      if (!target) {
        throw new Error("The payer returned no questionnaire for this order.");
      }
      if (popup) {
        popup.location.href = questionnaireAppLink(target.formId);
      } else {
        window.open(questionnaireAppLink(target.formId), "dtr-" + order.orderId);
      }
    } catch (openError) {
      if (popup) {
        popup.close();
      }
      setError(openError);
    }
  }

  function handlePayerChange(event) {
    setPayerName(event.target.value);
  }

  /** True when the payer name is one of the payers the gateway returned (GET /api/v1/payers). */
  function isGatewayPayer(name) {
    for (let i = 0; i < data.payers.length; i++) {
      if (data.payers[i].payerName === name) {
        return true;
      }
    }
    return false;
  }

  function renderPayerOption(payer) {
    return <option key={payer.payerName} value={payer.payerName}>{payer.displayName} ({payer.payerName})</option>;
  }

  return (
    <div className="workflow">
      <div className="workflow-head">
        <div>
          <h3>Prior authorization &middot; {order.orderId}</h3>
          <div className="muted">{order.codeSystem} {order.code} {order.codeDisplay} &middot; qty {order.quantity} &middot; POS {order.placeOfServiceCode}</div>
        </div>
        <label className="inline">Payer
          <select value={payerName} onChange={handlePayerChange}>
            {data.payers.length === 0 ? <option value="">(gateway not reachable)</option> : null}
            {data.payers.map(renderPayerOption)}
            {payerName && !isGatewayPayer(payerName) ? <option value={payerName}>{payerName} (not configured in the gateway)</option> : null}
          </select>
        </label>
      </div>
      <ErrorBox error={error} />

      <CrdStep patient={props.patient} order={order} payerName={payerName} decision={decision} crdResponse={crdResponse} onDone={handleCrdDone}
               onOpenQuestionnaire={openQuestionnaire} />

      <DtrStep patient={props.patient} order={order} payerName={payerName} decision={decision} forms={forms}
               onFormsCreated={handleFormsCreated} onRefresh={refreshForms} />

      <PasStep patient={props.patient} order={order} payerName={payerName} decision={decision} forms={forms} data={data}
               paDecision={paDecision} onDecision={setPaDecision} />

      {paDecision ? (
        <CdexStep patient={props.patient} order={order} payerName={payerName} paDecision={paDecision} forms={forms} data={data}
                  onDecision={setPaDecision} onFormsCreated={handleFormsCreated} />
      ) : null}
    </div>
  );
}
