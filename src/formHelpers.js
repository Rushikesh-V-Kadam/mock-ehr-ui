// Small helpers for forms (no library).

/** Copy of the form object with the changed input's value (input name = field name). Checkboxes give true / false. */
export function withField(form, event) {
  const target = event.target;
  const copy = Object.assign({}, form);
  copy[target.name] = target.type === "checkbox" ? target.checked : target.value;
  return copy;
}

/** Empty strings become null (so the APIs get "no value" instead of ""). */
export function blankToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

/** Reads a browser File as Base64 (without the "data:...;base64," prefix). */
export function readFileAsBase64(file) {
  return new Promise(function executor(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function onLoad() {
      const text = String(reader.result);
      const comma = text.indexOf(",");
      resolve(comma >= 0 ? text.substring(comma + 1) : text);
    };
    reader.onerror = function onError() {
      reject(new Error("The file could not be read."));
    };
    reader.readAsDataURL(file);
  });
}

/** A short unique id part, e.g. "k3f9a1". */
export function shortId() {
  return Math.random().toString(36).substring(2, 8);
}

/** "Alex Rivera" */
export function patientName(patient) {
  if (!patient) {
    return "";
  }
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ");
}
