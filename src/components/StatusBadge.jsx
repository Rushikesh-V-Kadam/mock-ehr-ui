import React from "react";

const TONES = {
  approved: "good", covered: "good", completed: "good", "not-required": "good", "no-auth": "good", satisfied: "good", sent: "good", ok: "good",
  pended: "warn", "in-progress": "warn", conditional: "warn", "auth-needed": "warn", requested: "warn", clinical: "warn", admin: "warn", both: "warn", new: "warn",
  denied: "bad", "not-covered": "bad", error: "bad", rejected: "bad", timeout: "bad", cancelled: "muted", needed: "warn", no: "muted", unknown: "muted", skipped: "muted"
};

/** A coloured label for a status value (approved, pended, denied ...). */
export default function StatusBadge(props) {
  const value = props.value;
  if (value === undefined || value === null || value === "") {
    return <span className="badge badge-muted">-</span>;
  }
  const tone = TONES[String(value)] || "neutral";
  return <span className={"badge badge-" + tone}>{String(value)}</span>;
}
