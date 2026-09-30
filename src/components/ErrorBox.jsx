import React from "react";

/** Shows an ApiError (message + details) or nothing. */
export default function ErrorBox(props) {
  const error = props.error;
  if (!error) {
    return null;
  }
  const details = error.details || [];

  function renderDetail(detail, index) {
    return <li key={index}>{String(detail)}</li>;
  }

  return (
    <div className="alert alert-error" role="alert">
      <strong>{error.message || String(error)}</strong>
      {details.length > 0 ? <ul>{details.map(renderDetail)}</ul> : null}
    </div>
  );
}
