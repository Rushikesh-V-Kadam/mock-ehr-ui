// =====================================================================================================
// One place for HTTP calls. Every error becomes an ApiError with a readable message and the details the
// APIs return: the gateway sends { error, details, traceId }, a PAS rejection sends a decision with errors[],
// the mock EHR sends { error }.
// =====================================================================================================

/** Error thrown by requestJson. */
export class ApiError extends Error {
  constructor(message, status, details, body) {
    super(message);
    this.status = status;
    this.details = details || [];
    this.body = body;
  }
}

/**
 * Sends a JSON request and returns the parsed JSON answer (null for 204 / empty body).
 * method: GET | POST | PUT; body: object or null; apiKey: sent as X-Api-Key when not empty.
 */
export async function requestJson(url, method, body, apiKey) {
  const headers = { Accept: "application/json" };
  if (body !== null && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  let response;
  try {
    response = await fetch(url, {
      method: method,
      headers: headers,
      body: body === null || body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (networkError) {
    throw new ApiError("Cannot reach " + url + ". Is the service running?", 0, [], null);
  }

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      json = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(json, response.status), response.status, errorDetails(json), json);
  }
  return json;
}

/** Best message from an error body. */
function errorMessage(json, status) {
  if (json && json.error) {
    return json.error;
  }
  if (json && json.errors && json.errors.length > 0) {
    return json.errors.join("; ");
  }
  if (json && json.title) {
    return json.title;
  }
  return "Request failed with HTTP " + status + ".";
}

/** Extra messages from an error body. */
function errorDetails(json) {
  if (json && json.details) {
    return json.details;
  }
  if (json && json.messages) {
    return json.messages;
  }
  return [];
}
