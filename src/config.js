// =====================================================================================================
// Where the other systems run. Saved in the browser (localStorage) from the Settings page.
//   ehrUrl               Mock EHR API (this app's data)            http://localhost:5090
//   gatewayUrl           Payer Gateway API (the workflow)          http://localhost:5200
//   questionnaireAppUrl  DTR questionnaire app (separate app)      http://localhost:5174
// =====================================================================================================

const STORAGE_KEY = "mock-ehr-settings";

const DEFAULTS = {
  ehrUrl: "http://localhost:5090",
  ehrApiKey: "",
  gatewayUrl: "http://localhost:5200",
  gatewayApiKey: "",
  questionnaireAppUrl: "http://localhost:5174"
};

/** Current settings (saved values, else the defaults). */
export function getSettings() {
  let saved = {};
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (text) {
      saved = JSON.parse(text);
    }
  } catch (error) {
    saved = {};
  }
  return Object.assign({}, DEFAULTS, saved);
}

/** Saves the settings. */
export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // storage not available: the settings stay for this page only
  }
}

/** The default settings (for the Reset button). */
export function getDefaultSettings() {
  return Object.assign({}, DEFAULTS);
}
