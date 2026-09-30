// =====================================================================================================
// Mock EHR API (MockEhr.Api, default http://localhost:5090). Data is stored in its Data/ehr-data.json file.
// =====================================================================================================
import { getSettings } from "../config.js";
import { requestJson, ApiError } from "./http.js";

function ehr(path, method, body) {
  const settings = getSettings();
  return requestJson(settings.ehrUrl.replace(/\/$/, "") + path, method, body, settings.ehrApiKey);
}

/** GET that returns null for 404 (e.g. no decision yet). */
async function ehrOrNull(path) {
  try {
    return await ehr(path, "GET", null);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------- patients
export async function listPatients(search) {
  const query = search ? "?search=" + encodeURIComponent(search) : "";
  const list = await ehr("/api/patients" + query, "GET", null);
  return list.items;
}
export function getPatient(patientId) {
  return ehr("/api/patients/" + encodeURIComponent(patientId), "GET", null);
}
export function createPatient(patient) {
  return ehr("/api/patients", "POST", patient);
}
export function updatePatient(patient) {
  return ehr("/api/patients/" + encodeURIComponent(patient.patientId), "PUT", patient);
}

// ---------------------------------------------------------------- insurance
export async function listInsurances(patientId) {
  const list = await ehr("/api/patients/" + encodeURIComponent(patientId) + "/insurances", "GET", null);
  return list.items;
}
export function addInsurance(patientId, insurance) {
  return ehr("/api/patients/" + encodeURIComponent(patientId) + "/insurances", "POST", insurance);
}

// ---------------------------------------------------------------- providers
export async function listPractitioners() {
  const list = await ehr("/api/practitioners", "GET", null);
  return list.items;
}
export function addPractitioner(practitioner) {
  return ehr("/api/practitioners", "POST", practitioner);
}
export async function listOrganizations() {
  const list = await ehr("/api/organizations", "GET", null);
  return list.items;
}
export function addOrganization(organization) {
  return ehr("/api/organizations", "POST", organization);
}
export async function listLocations() {
  const list = await ehr("/api/locations", "GET", null);
  return list.items;
}

// ---------------------------------------------------------------- orders
export async function listOrders(patientId) {
  const list = await ehr("/api/orders?patientId=" + encodeURIComponent(patientId), "GET", null);
  return list.items;
}
export function createOrder(order) {
  return ehr("/api/orders", "POST", order);
}
export function getCoverageDecision(orderId) {
  return ehrOrNull("/api/orders/" + encodeURIComponent(orderId) + "/coverage-decision");
}

// ---------------------------------------------------------------- clinical data
export async function listConditions(patientId) {
  const list = await ehr("/api/patients/" + encodeURIComponent(patientId) + "/conditions", "GET", null);
  return list.items;
}
export function addCondition(patientId, condition) {
  return ehr("/api/patients/" + encodeURIComponent(patientId) + "/conditions", "POST", condition);
}
export async function listObservations(patientId) {
  const list = await ehr("/api/patients/" + encodeURIComponent(patientId) + "/observations", "GET", null);
  return list.items;
}
export function addObservation(patientId, observation) {
  return ehr("/api/patients/" + encodeURIComponent(patientId) + "/observations", "POST", observation);
}

// ---------------------------------------------------------------- documents
export async function listDocuments(patientId) {
  const list = await ehr("/api/patients/" + encodeURIComponent(patientId) + "/documents", "GET", null);
  return list.items;
}
export function addDocument(patientId, document) {
  return ehr("/api/patients/" + encodeURIComponent(patientId) + "/documents", "POST", document);
}

// ---------------------------------------------------------------- written back by the gateway / FHIR API
export async function listQuestionnaireResponses(patientId) {
  const list = await ehr("/api/patients/" + encodeURIComponent(patientId) + "/questionnaire-responses", "GET", null);
  return list.items;
}
export async function listPriorAuthDecisions(orderId) {
  const list = await ehr("/api/prior-auth-requests?orderId=" + encodeURIComponent(orderId), "GET", null);
  return list.items;
}
export function listWriteBacks() {
  return ehr("/api/write-backs", "GET", null);
}
export function resetEhrData() {
  return ehr("/api/admin/reset", "POST", {});
}
