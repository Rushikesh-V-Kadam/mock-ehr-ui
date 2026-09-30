import React from "react";

/** Collapsible raw JSON (for testing: shows exactly what an API returned). */
export default function JsonView(props) {
  if (props.value === undefined || props.value === null) {
    return null;
  }
  return (
    <details className="json-view">
      <summary>{props.label || "Raw JSON"}</summary>
      <pre>{JSON.stringify(props.value, null, 2)}</pre>
    </details>
  );
}
