// =====================================================================================================
// Payer Gateway API (default http://localhost:5200). The EHR runs the whole prior auth workflow through it:
//   STEP 1 CRD   POST /crd/order-sign
//   STEP 2 DTR   POST /dtr/forms  (answers are sent by the questionnaire app)
//   STEP 3 PAS   POST /pas/requests, GET / inquire / cancel
//   STEP 4 CDex  GET  .../information-requests, POST .../attachments
// Every request carries piInsurancePlanId: the insurance plan id of the order's insurance (EHR insurance record).
// =====================================================================================================
import { getSettings } from "../config.js";
import { requestJson } from "./http.js";

function gateway(path, method, body) {
  const settings = getSettings();
  return requestJson(settings.gatewayUrl.replace(/\/$/, "") + path, method, body, settings.gatewayApiKey);
}

// ---------------------------------------------------------------- STEP 1 CRD
export function orderSign(request) {
  return gateway("/crd/order-sign", "POST", request);
}

// ---------------------------------------------------------------- STEP 2 DTR
export function createForms(request) {
  return gateway("/dtr/forms", "POST", request);
}
export function getForm(formId) {
  return gateway("/dtr/forms/" + encodeURIComponent(formId), "GET", null);
}

// ---------------------------------------------------------------- STEP 3 PAS
export function submitPriorAuth(request) {
  return gateway("/pas/requests", "POST", request);
}
export function getPriorAuth(requestId) {
  return gateway("/pas/requests/" + encodeURIComponent(requestId), "GET", null);
}
export function inquirePriorAuth(requestId) {
  return gateway("/pas/requests/" + encodeURIComponent(requestId) + "/inquire", "POST", null);
}
export function cancelPriorAuth(requestId, reason) {
  return gateway("/pas/requests/" + encodeURIComponent(requestId) + "/cancel", "POST", { reason: reason, writeBack: true });
}

// ---------------------------------------------------------------- STEP 4 CDex
export function getInformationRequests(requestId) {
  return gateway("/cdex/requests/" + encodeURIComponent(requestId) + "/information-requests?refresh=true", "GET", null);
}
export function submitAttachments(requestId, request) {
  return gateway("/cdex/requests/" + encodeURIComponent(requestId) + "/attachments", "POST", request);
}

/** URL that opens a DTR form in the separate questionnaire app. */
export function questionnaireAppLink(formId) {
  const settings = getSettings();
  return settings.questionnaireAppUrl.replace(/\/$/, "") + "/?formId=" + encodeURIComponent(formId) +
    "&gateway=" + encodeURIComponent(settings.gatewayUrl) +
    (settings.gatewayApiKey ? "&apiKey=" + encodeURIComponent(settings.gatewayApiKey) : "");
}
