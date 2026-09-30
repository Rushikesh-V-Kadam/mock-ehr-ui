import React, { useState } from "react";
import { addDocument } from "../api/ehrApi.js";
import { withField, blankToNull, readFileAsBase64 } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";

const DOCUMENT_TYPES = [
  { code: "11506-3", display: "Progress note" },
  { code: "18748-4", display: "Diagnostic imaging study" },
  { code: "11502-2", display: "Laboratory report" },
  { code: "18842-5", display: "Discharge summary" },
  { code: "34117-2", display: "History and physical note" },
  { code: "11488-4", display: "Consult note" }
];

const EMPTY = { typeCode: "11506-3", title: "", authorPractitionerId: "", organizationId: "", contentText: "" };

/**
 * Clinical documents: list and add (typed text or an uploaded file). These are the documents PAS and CDex can send.
 * props: patientId, documents, practitioners, organizations, onChanged.
 */
export default function DocumentsSection(props) {
  const [form, setForm] = useState(Object.assign({}, EMPTY));
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function handleChange(event) { setForm(withField(form, event)); }

  function handleFile(event) {
    setFile(event.target.files && event.target.files.length > 0 ? event.target.files[0] : null);
  }

  function typeDisplay(code) {
    for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
      if (DOCUMENT_TYPES[i].code === code) {
        return DOCUMENT_TYPES[i].display;
      }
    }
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let contentBase64 = null;
      let contentType = "text/plain";
      if (file) {
        contentBase64 = await readFileAsBase64(file);
        contentType = file.type || "application/octet-stream";
      } else if (!form.contentText.trim()) {
        throw new Error("Type the note or choose a file.");
      }
      await addDocument(props.patientId, {
        documentId: "", typeCode: form.typeCode, typeDisplay: typeDisplay(form.typeCode),
        title: blankToNull(form.title) || (file ? file.name : typeDisplay(form.typeCode)),
        authorPractitionerId: blankToNull(form.authorPractitionerId), organizationId: blankToNull(form.organizationId),
        contentType: contentType, contentText: file ? null : form.contentText, contentBase64: contentBase64
      });
      setForm(Object.assign({}, EMPTY));
      setFile(null);
      event.target.reset();
      props.onChanged();
    } catch (saveError) {
      setError(saveError);
    }
    setBusy(false);
  }

  function renderType(type) {
    return <option key={type.code} value={type.code}>{type.display} ({type.code})</option>;
  }
  function renderPractitioner(practitioner) {
    return <option key={practitioner.practitionerId} value={practitioner.practitionerId}>{practitioner.firstName} {practitioner.lastName}</option>;
  }
  function renderOrganization(organization) {
    return <option key={organization.organizationId} value={organization.organizationId}>{organization.name}</option>;
  }
  function renderRow(document) {
    return (
      <tr key={document.documentId}>
        <td>{document.title}</td>
        <td>{document.typeDisplay} <span className="muted small">{document.typeCode}</span></td>
        <td>{document.contentType}</td>
        <td>{document.sizeBytes} B</td>
        <td>{document.createdDateTime}</td>
        <td className="mono small">{document.documentId}</td>
      </tr>
    );
  }

  return (
    <div>
      <table className="table">
        <thead><tr><th>Title</th><th>Type (LOINC)</th><th>Content</th><th>Size</th><th>Created</th><th>Id</th></tr></thead>
        <tbody>{props.documents.map(renderRow)}</tbody>
      </table>
      {props.documents.length === 0 ? <p className="muted">No documents yet.</p> : null}

      <form className="card form" onSubmit={handleSubmit}>
        <h3>Add document</h3>
        <ErrorBox error={error} />
        <div className="grid">
          <label>Type<select name="typeCode" value={form.typeCode} onChange={handleChange}>{DOCUMENT_TYPES.map(renderType)}</select></label>
          <label>Title<input name="title" value={form.title} onChange={handleChange} /></label>
          <label>Author
            <select name="authorPractitionerId" value={form.authorPractitionerId} onChange={handleChange}>
              <option value="">(none)</option>
              {props.practitioners.map(renderPractitioner)}
            </select>
          </label>
          <label>Organization
            <select name="organizationId" value={form.organizationId} onChange={handleChange}>
              <option value="">(none)</option>
              {props.organizations.map(renderOrganization)}
            </select>
          </label>
        </div>
        <label className="wide">Note text<textarea name="contentText" value={form.contentText} onChange={handleChange} rows={4} placeholder="Type the note, or upload a file below" /></label>
        <label className="wide">Or upload a file (PDF, image, text)<input type="file" onChange={handleFile} /></label>
        <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Add document"}</button></div>
      </form>
    </div>
  );
}
