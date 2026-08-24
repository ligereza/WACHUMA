"use client";

import { useState } from "react";

type ReviewStatus = "pending" | "accepted" | "rejected" | "superseded";

type SourceRecordTarget = {
  kind:
    | "taxon"
    | "biological_entity"
    | "observation"
    | "media"
    | "specimen"
    | "lineage_relationship"
    | "external_identifier";
  publicId?: string;
  id?: string;
  visibility?: string;
  uri?: string;
  title?: string;
  mediaType?: string;
  license?: string;
  namespace?: string;
  identifier?: string;
  canonicalUrl?: string;
};

type SourceRecord = {
  id: string;
  providerKey: string;
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  assertionType: string;
  rawPayload: Record<string, unknown>;
  status: ReviewStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  targets: SourceRecordTarget[];
};

type PublicationDecision = {
  publishable?: boolean;
  blockers?: string[];
};

const publicationBlockerLabels: Record<string, string> = {
  license_review_unresolved: "La revisión de licencia no está verificada.",
  license_expression_missing: "Falta una expresión de licencia de datos.",
  license_expression_unsupported:
    "La expresión de licencia de datos no está soportada.",
  license_evidence_missing: "Falta una URL de evidencia de licencia.",
  publication_decision_missing:
    "El registro se importó antes de conservar una decisión explícita.",
  publication_decision_invalid: "La decisión de publicación está mal formada.",
  publication_decision_blocked: "La decisión de publicación está bloqueada.",
  trait_mapping_pending:
    "Falta mapear el trait a una definición local publicable.",
};

const apiUrl = (
  process.env.NEXT_PUBLIC_WACHUMA_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `API respondió ${response.status}`;
  } catch {
    return `API respondió ${response.status}`;
  }
}

function SourceRecordCard({
  record,
  token,
  reviewer,
  onChanged,
}: {
  record: SourceRecord;
  token: string;
  reviewer: string;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [attributionConfirmed, setAttributionConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [taxonomyConfirmed, setTaxonomyConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isTaxon =
    record.providerKey === "gbif" &&
    record.sourceRecordId.startsWith("species:") &&
    record.assertionType === "taxonomic_fact";
  const isFungalTraits = record.providerKey === "fungaltraits";
  const publicationDecision = isFungalTraits
    ? (record.rawPayload.publicationDecision as PublicationDecision | undefined)
    : undefined;
  const publicationBlockers = isFungalTraits
    ? publicationDecision?.blockers?.length
      ? publicationDecision.blockers
      : ["publication_decision_missing"]
    : [];

  const targetLabel: Record<SourceRecordTarget["kind"], string> = {
    taxon: "taxón",
    biological_entity: "entidad biológica",
    observation: "observación",
    media: "medio",
    specimen: "ejemplar",
    lineage_relationship: "relación de linaje",
    external_identifier: "identificador externo",
  };

  async function review(decision: "accepted" | "rejected") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/admin/source-records/${record.id}/review`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reviewer,
            decision,
            note,
            licenseConfirmed,
            attributionConfirmed,
            privacyConfirmed,
          }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo revisar");
    } finally {
      setBusy(false);
    }
  }

  async function promoteTaxon() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/admin/source-records/${record.id}/promote-taxon`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reviewer,
            note,
            taxonomyConfirmed,
            licenseConfirmed,
            attributionConfirmed,
            privacyConfirmed,
          }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo promover el taxón",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="review-card">
      <div className="review-card-heading">
        <div>
          <p className="card-kicker">{record.providerKey}</p>
          <h2>{record.sourceRecordId}</h2>
        </div>
        <span className="review-status">{record.status}</span>
      </div>
      <dl className="review-facts">
        <div>
          <dt>Licencia</dt>
          <dd>{record.license}</dd>
        </div>
        <div>
          <dt>Consultado</dt>
          <dd>{new Date(record.retrievedAt).toLocaleString("es-CL")}</dd>
        </div>
        <div>
          <dt>Atribución</dt>
          <dd>{record.attribution}</dd>
        </div>
      </dl>
      <section className="review-targets" aria-label="Objetos derivados">
        <div>
          <p className="card-kicker">Objetos derivados</p>
          <p className="review-targets-intro">
            Estos son los registros que recibirán el resultado de esta revisión.
          </p>
        </div>
        {record.targets.length ? (
          <ul>
            {record.targets.map((target) => (
              <li key={`${target.kind}:${target.publicId ?? target.id}`}>
                <div>
                  <strong>{targetLabel[target.kind]}</strong>
                  <span>
                    {target.namespace && target.identifier
                      ? `${target.namespace}:${target.identifier}`
                      : (target.publicId ?? target.id)}
                  </span>
                  {target.title ? <span>{target.title}</span> : null}
                  {target.visibility ? (
                    <span className="tag">{target.visibility}</span>
                  ) : null}
                  {target.license ? <span>{target.license}</span> : null}
                </div>
                {target.kind === "media" && target.uri ? (
                  <a href={target.uri} target="_blank" rel="noreferrer">
                    {target.mediaType?.startsWith("image/") ? (
                      <img
                        className="review-media-preview"
                        src={target.uri}
                        alt={
                          target.title ??
                          `Medio ${target.publicId ?? target.id}`
                        }
                        loading="lazy"
                      />
                    ) : null}
                    Abrir medio ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-note">Sin objeto derivado registrado.</p>
        )}
      </section>
      {isFungalTraits ? (
        <section className="review-guard" aria-label="Bloqueo de publicación">
          <div>
            <p className="card-kicker">FungalTraits en staging</p>
            <p>
              La API no permite aceptar estas mediciones desde la bandeja
              genérica. Primero deben resolverse los derechos del dataset y el
              mapeo de taxón/trait.
            </p>
          </div>
          <ul>
            {publicationBlockers.map((blocker) => (
              <li key={blocker}>
                {publicationBlockerLabels[blocker] ?? blocker}
              </li>
            ))}
            <li>{publicationBlockerLabels.trait_mapping_pending}</li>
          </ul>
        </section>
      ) : null}
      <details className="review-payload">
        <summary>Payload estructurado del origen</summary>
        <pre>{JSON.stringify(record.rawPayload, null, 2)}</pre>
      </details>
      {record.sourceUrl ? (
        <a href={record.sourceUrl} target="_blank" rel="noreferrer">
          Abrir registro de origen ↗
        </a>
      ) : null}
      <label className="review-note">
        Nota de revisión
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Qué se verificó, qué queda restringido y por qué…"
          required
        />
      </label>
      <div className="review-checks">
        <label>
          <input
            type="checkbox"
            checked={licenseConfirmed}
            onChange={(event) => setLicenseConfirmed(event.target.checked)}
          />
          Licencia comprobada
        </label>
        <label>
          <input
            type="checkbox"
            checked={attributionConfirmed}
            onChange={(event) => setAttributionConfirmed(event.target.checked)}
          />
          Atribución comprobada
        </label>
        <label>
          <input
            type="checkbox"
            checked={privacyConfirmed}
            onChange={(event) => setPrivacyConfirmed(event.target.checked)}
          />
          Privacidad comprobada
        </label>
        {isTaxon && record.status === "accepted" ? (
          <label>
            <input
              type="checkbox"
              checked={taxonomyConfirmed}
              onChange={(event) => setTaxonomyConfirmed(event.target.checked)}
            />
            Taxonomía comprobada
          </label>
        ) : null}
      </div>
      <div className="review-actions">
        {record.status === "pending" && !isFungalTraits ? (
          <>
            <button
              className="button button-primary"
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => void review("accepted")}
            >
              Aceptar y publicar lo permitido
            </button>
            <button
              className="button"
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => void review("rejected")}
            >
              Rechazar
            </button>
          </>
        ) : null}
        {isTaxon && record.status === "accepted" ? (
          <button
            className="button button-primary"
            type="button"
            disabled={
              busy ||
              !note.trim() ||
              !taxonomyConfirmed ||
              !licenseConfirmed ||
              !attributionConfirmed ||
              !privacyConfirmed
            }
            onClick={() => void promoteTaxon()}
          >
            Promover proyección taxonómica
          </button>
        ) : null}
      </div>
      {message ? <p className="form-message">{message}</p> : null}
    </article>
  );
}

export function ReviewInbox() {
  const [token, setToken] = useState("");
  const [reviewer, setReviewer] = useState("editorial-local");
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [provider, setProvider] = useState("");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [records, setRecords] = useState<SourceRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadRecords(nextStatus = status) {
    if (!token.trim()) {
      setMessage("Ingresa el token editorial local para consultar la bandeja.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        status: nextStatus,
        limit: "100",
      });
      if (provider.trim()) params.set("provider", provider.trim());
      if (sourceRecordId.trim()) {
        params.set("sourceRecordId", sourceRecordId.trim());
      }
      const response = await fetch(
        `${apiUrl}/api/v1/admin/source-records?${params.toString()}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error(await readError(response));
      setRecords((await response.json()) as SourceRecord[]);
      setStatus(nextStatus);
    } catch (error) {
      setRecords([]);
      setMessage(error instanceof Error ? error.message : "No se pudo cargar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-inbox">
      <div className="review-toolbar">
        <label>
          Token editorial local
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          Revisor
          <input
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
          />
        </label>
        <label>
          Proveedor
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="fungaltraits">FungalTraits</option>
            <option value="gbif">GBIF</option>
            <option value="inaturalist">iNaturalist</option>
            <option value="wikidata">Wikidata</option>
          </select>
        </label>
        <label>
          ID exacto de registro
          <input
            value={sourceRecordId}
            onChange={(event) => setSourceRecordId(event.target.value)}
            placeholder="release:measurement:…"
          />
        </label>
        <button
          className="button button-primary"
          type="button"
          disabled={busy || !token.trim()}
          onClick={() => void loadRecords()}
        >
          {busy ? "Cargando…" : "Cargar bandeja"}
        </button>
      </div>
      <div className="review-filters" aria-label="Estado de revisión">
        {(["pending", "accepted", "rejected"] as ReviewStatus[]).map(
          (option) => (
            <button
              className={status === option ? "tag tag-active" : "tag"}
              key={option}
              type="button"
              onClick={() => void loadRecords(option)}
              disabled={busy || !token.trim()}
            >
              {option}
            </button>
          ),
        )}
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      {records.length ? (
        <div className="review-list">
          {records.map((record) => (
            <SourceRecordCard
              key={record.id}
              record={record}
              token={token}
              reviewer={reviewer}
              onChanged={() => void loadRecords(status)}
            />
          ))}
        </div>
      ) : (
        <p className="empty-note">
          La bandeja no se consulta automáticamente. Carga los registros para
          revisar licencia, atribución, privacidad y estado editorial antes de
          exponerlos.
        </p>
      )}
    </div>
  );
}
