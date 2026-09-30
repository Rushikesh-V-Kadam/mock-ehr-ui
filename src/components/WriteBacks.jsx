import React, { useEffect, useState } from "react";
import { listWriteBacks } from "../api/ehrApi.js";
import ErrorBox from "./ErrorBox.jsx";

/** Everything the Payer Gateway / Provider FHIR API wrote into the EHR, newest first. */
export default function WriteBacks() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      setItems(await listWriteBacks());
    } catch (loadError) {
      setError(loadError);
    }
  }
  function startLoading() {
    load();
  }
  useEffect(startLoading, []);

  function renderItem(item, index) {
    return (
      <details key={index} className="card writeback">
        <summary><span className="mono small">{item.at}</span> <strong>{item.kind}</strong> {item.id}</summary>
        <pre>{JSON.stringify(item.body, null, 2)}</pre>
      </details>
    );
  }

  return (
    <section>
      <div className="page-head">
        <h2>Write-backs from the gateway</h2>
        <button type="button" onClick={load}>Refresh</button>
      </div>
      <ErrorBox error={error} />
      {items.length === 0 ? <p className="muted">Nothing written back yet.</p> : items.map(renderItem)}
    </section>
  );
}
