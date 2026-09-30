import React, { useState } from "react";
import { getSettings, saveSettings, getDefaultSettings } from "../config.js";
import { resetEhrData } from "../api/ehrApi.js";
import { withField } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";

/** URLs and API keys of the mock EHR API, Payer Gateway and questionnaire app (saved in this browser). */
export default function SettingsPage() {
  const [form, setForm] = useState(getSettings());
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(event) { setForm(withField(form, event)); }

  function handleSave(event) {
    event.preventDefault();
    saveSettings(form);
    setMessage("Saved.");
  }

  function handleDefaults() {
    const defaults = getDefaultSettings();
    setForm(defaults);
    saveSettings(defaults);
    setMessage("Defaults restored.");
  }

  async function handleReset() {
    if (!window.confirm("Delete all EHR data (including what you added) and load the seed data again?")) {
      return;
    }
    setError(null);
    try {
      await resetEhrData();
      setMessage("EHR data reset to the seed data.");
    } catch (resetError) {
      setError(resetError);
    }
  }

  return (
    <section>
      <h2>Settings</h2>
      <form className="card form" onSubmit={handleSave}>
        <div className="grid">
          <label>Mock EHR API URL<input name="ehrUrl" value={form.ehrUrl} onChange={handleChange} /></label>
          <label>Mock EHR API key<input name="ehrApiKey" value={form.ehrApiKey} onChange={handleChange} placeholder="(none)" /></label>
          <label>Payer Gateway URL<input name="gatewayUrl" value={form.gatewayUrl} onChange={handleChange} /></label>
          <label>Payer Gateway API key (X-Api-Key)<input name="gatewayApiKey" value={form.gatewayApiKey} onChange={handleChange} placeholder="(none)" /></label>
          <label>Questionnaire app URL<input name="questionnaireAppUrl" value={form.questionnaireAppUrl} onChange={handleChange} /></label>
        </div>
        <div className="actions">
          <button type="submit" className="primary">Save</button>
          <button type="button" onClick={handleDefaults}>Restore defaults</button>
        </div>
        {message ? <div className="alert alert-info">{message}</div> : null}
      </form>

      <div className="card">
        <h3>Test data</h3>
        <p className="muted">The mock EHR keeps its data in MockEhr.Api/Data/ehr-data.json. Reset deletes it and loads SeedData.cs again.</p>
        <ErrorBox error={error} />
        <button type="button" className="danger" onClick={handleReset}>Reset EHR data</button>
      </div>
    </section>
  );
}
