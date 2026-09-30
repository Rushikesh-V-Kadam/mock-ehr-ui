import React from "react";
import StatusBadge from "./StatusBadge.jsx";
import JsonView from "./JsonView.jsx";

/** The payer's prior auth decision: overall status, authorization number, one row per line, errors. props: decision. */
export default function DecisionView(props) {
  const decision = props.decision;
  if (!decision) {
    return null;
  }

  function renderLine(line) {
    return (
      <tr key={line.sequence}>
        <td>{line.sequence}</td>
        <td>{line.orderId}</td>
        <td>{line.code}</td>
        <td><StatusBadge value={line.decision} /> <span className="muted small">{line.x12ActionCode}</span></td>
        <td>{line.requestedQuantity}{line.approvedQuantity !== null && line.approvedQuantity !== undefined ? " / " + line.approvedQuantity : ""}</td>
        <td>{line.validFrom} {line.validTo ? "– " + line.validTo : ""}</td>
        <td className="small">{line.reason}</td>
      </tr>
    );
  }

  function renderError(message, index) {
    return <li key={index}>{message}</li>;
  }

  const lines = decision.lines || [];
  const errors = decision.errors || [];
  return (
    <div className="decision">
      <div className="facts">
        <div><span>Request</span><strong>{decision.requestId}</strong></div>
        <div><span>Status</span><StatusBadge value={decision.overallStatus} /></div>
        <div><span>Authorization #</span><strong>{decision.authorizationNumber || "-"}</strong></div>
        <div><span>Valid</span>{decision.validFrom || "-"} {decision.validTo ? "– " + decision.validTo : ""}</div>
        <div><span>Decision due by</span>{decision.decisionDueBy || "-"}</div>
      </div>
      {lines.length > 0 ? (
        <table className="table">
          <thead><tr><th>#</th><th>Order</th><th>Code</th><th>Decision</th><th>Qty req / appr</th><th>Valid</th><th>Reason</th></tr></thead>
          <tbody>{lines.map(renderLine)}</tbody>
        </table>
      ) : null}
      {errors.length > 0 ? <div className="alert alert-error"><strong>Payer errors</strong><ul>{errors.map(renderError)}</ul></div> : null}
      <JsonView value={decision} label="Raw decision" />
    </div>
  );
}
