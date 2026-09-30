import React, { useEffect, useState } from "react";
import { listPractitioners, addPractitioner, listOrganizations, addOrganization } from "../api/ehrApi.js";
import { withField, blankToNull } from "../formHelpers.js";
import ErrorBox from "./ErrorBox.jsx";

const EMPTY_PRACTITIONER = { prefix: "Dr.", firstName: "", lastName: "", npi: "", organizationId: "", specialty: "", phone: "", fax: "" };
const EMPTY_ORGANIZATION = { name: "", npi: "", taxId: "", phone: "" };

/** Practitioners and organizations (both need an NPI for prior authorization). */
export default function ProvidersPage() {
  const [practitioners, setPractitioners] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [practitioner, setPractitioner] = useState(Object.assign({}, EMPTY_PRACTITIONER));
  const [organization, setOrganization] = useState(Object.assign({}, EMPTY_ORGANIZATION));
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      setPractitioners(await listPractitioners());
      setOrganizations(await listOrganizations());
    } catch (loadError) {
      setError(loadError);
    }
  }
  function startLoading() {
    load();
  }
  useEffect(startLoading, []);

  function handlePractitionerChange(event) { setPractitioner(withField(practitioner, event)); }
  function handleOrganizationChange(event) { setOrganization(withField(organization, event)); }

  async function handleAddPractitioner(event) {
    event.preventDefault();
    setError(null);
    try {
      await addPractitioner({
        practitionerId: "", prefix: blankToNull(practitioner.prefix), firstName: blankToNull(practitioner.firstName),
        lastName: practitioner.lastName.trim(), npi: practitioner.npi.trim(), organizationId: blankToNull(practitioner.organizationId),
        specialty: practitioner.specialty ? { code: practitioner.specialty, codeSystem: "NUCC", display: practitioner.specialty } : null,
        phone: blankToNull(practitioner.phone), fax: blankToNull(practitioner.fax),
        active: true
      });
      setPractitioner(Object.assign({}, EMPTY_PRACTITIONER));
      load();
    } catch (saveError) {
      setError(saveError);
    }
  }

  async function handleAddOrganization(event) {
    event.preventDefault();
    setError(null);
    try {
      await addOrganization({
        organizationId: "", name: organization.name.trim(), npi: organization.npi.trim(), taxId: blankToNull(organization.taxId),
        phone: blankToNull(organization.phone), active: true
      });
      setOrganization(Object.assign({}, EMPTY_ORGANIZATION));
      load();
    } catch (saveError) {
      setError(saveError);
    }
  }

  function renderPractitioner(item) {
    return <tr key={item.practitionerId}><td>{item.prefix} {item.firstName} {item.lastName}</td><td>{item.npi}</td><td>{item.specialty ? item.specialty.display : ""}<div className="muted small">{item.phone ? "ph " + item.phone : ""}{item.fax ? " / fax " + item.fax : ""}</div></td><td>{item.organizationId}</td><td className="mono small">{item.practitionerId}</td></tr>;
  }
  function renderOrganization(item) {
    return <tr key={item.organizationId}><td>{item.name}</td><td>{item.npi}</td><td>{item.taxId}</td><td className="mono small">{item.organizationId}</td></tr>;
  }
  function renderOrganizationOption(item) {
    return <option key={item.organizationId} value={item.organizationId}>{item.name}</option>;
  }

  return (
    <section>
      <h2>Providers</h2>
      <ErrorBox error={error} />
      <div className="two-columns">
        <div>
          <h3>Practitioners</h3>
          <table className="table"><thead><tr><th>Name</th><th>NPI</th><th>Specialty / phone / fax</th><th>Organization</th><th>Id</th></tr></thead><tbody>{practitioners.map(renderPractitioner)}</tbody></table>
          <form className="card form" onSubmit={handleAddPractitioner}>
            <h4>Add practitioner</h4>
            <div className="grid">
              <label>Prefix<input name="prefix" value={practitioner.prefix} onChange={handlePractitionerChange} /></label>
              <label>First name<input name="firstName" value={practitioner.firstName} onChange={handlePractitionerChange} /></label>
              <label>Last name *<input name="lastName" value={practitioner.lastName} onChange={handlePractitionerChange} required /></label>
              <label>NPI *<input name="npi" value={practitioner.npi} onChange={handlePractitionerChange} required pattern="[0-9]{10}" title="10 digits" /></label>
              <label>Organization
                <select name="organizationId" value={practitioner.organizationId} onChange={handlePractitionerChange}>
                  <option value="">(none)</option>
                  {organizations.map(renderOrganizationOption)}
                </select>
              </label>
              <label>Specialty<input name="specialty" value={practitioner.specialty} onChange={handlePractitionerChange} placeholder="Nephrology" /></label>
              <label>Phone<input name="phone" value={practitioner.phone} onChange={handlePractitionerChange} /></label>
              <label>Fax<input name="fax" value={practitioner.fax} onChange={handlePractitionerChange} /></label>
            </div>
            <div className="actions"><button type="submit" className="primary">Add practitioner</button></div>
          </form>
        </div>
        <div>
          <h3>Organizations</h3>
          <table className="table"><thead><tr><th>Name</th><th>NPI</th><th>Tax id</th><th>Id</th></tr></thead><tbody>{organizations.map(renderOrganization)}</tbody></table>
          <form className="card form" onSubmit={handleAddOrganization}>
            <h4>Add organization</h4>
            <div className="grid">
              <label>Name *<input name="name" value={organization.name} onChange={handleOrganizationChange} required /></label>
              <label>NPI *<input name="npi" value={organization.npi} onChange={handleOrganizationChange} required pattern="[0-9]{10}" title="10 digits" /></label>
              <label>Tax id<input name="taxId" value={organization.taxId} onChange={handleOrganizationChange} /></label>
              <label>Phone<input name="phone" value={organization.phone} onChange={handleOrganizationChange} /></label>
            </div>
            <div className="actions"><button type="submit" className="primary">Add organization</button></div>
          </form>
        </div>
      </div>
    </section>
  );
}
