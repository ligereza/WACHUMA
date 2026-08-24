"use client";

import { FormEvent, useState } from "react";

const apiUrl = (
  process.env.NEXT_PUBLIC_WACHUMA_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

type IntakeResult = {
  id: string;
  sourceRecordKey: string;
  sourceRecordStatus: string;
  created: boolean;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `API respondió ${response.status}`;
  } catch {
    return `API respondió ${response.status}`;
  }
}

function initialDateTime(): string {
  return new Date().toISOString().slice(0, 16);
}

export function LineageIntakeForm() {
  const [token, setToken] = useState("");
  const [relationshipType, setRelationshipType] = useState("cutting_of");
  const [parentKind, setParentKind] = useState("specimen");
  const [parentPublicId, setParentPublicId] = useState("");
  const [childKind, setChildKind] = useState("specimen");
  const [childPublicId, setChildPublicId] = useState("");
  const [generationLabel, setGenerationLabel] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [sourceUrl, setSourceUrl] = useState(
    "https://github.com/ligereza/WACHUMA",
  );
  const [retrievedAt, setRetrievedAt] = useState(initialDateTime);
  const [license, setLicense] = useState("WACHUMA-GARDEN-PRIVATE");
  const [attribution, setAttribution] = useState(
    "Custodia del jardín WACHUMA; registro no público.",
  );
  const [sourcePublicId, setSourcePublicId] = useState(
    "source-wachuma-garden-ledger",
  );
  const [importerVersion, setImporterVersion] = useState(
    "lineage-intake-web-0.1.0",
  );
  const [rawPayload, setRawPayload] = useState(
    '{\n  "capture": "manual",\n  "relationshipContext": "garden-ledger"\n}',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setResult(null);

    let parsedPayload: Record<string, unknown>;
    try {
      const candidate: unknown = JSON.parse(rawPayload);
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        throw new Error("El payload debe ser un objeto JSON.");
      }
      parsedPayload = candidate as Record<string, unknown>;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Payload JSON inválido",
      );
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/admin/lineage/relationships`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            relationshipType,
            parent: { kind: parentKind, publicId: parentPublicId },
            child: { kind: childKind, publicId: childPublicId },
            ...(generationLabel ? { generationLabel } : {}),
            ...(occurredAt
              ? { occurredAt: new Date(occurredAt).toISOString() }
              : {}),
            ...(notes ? { notes } : {}),
            provenance: {
              sourceRecordId,
              ...(sourceUrl ? { sourceUrl } : {}),
              retrievedAt: new Date(retrievedAt).toISOString(),
              license,
              attribution,
              rawPayload: parsedPayload,
              importerVersion,
              assertionType: "contemporary_observation",
              sourcePublicId,
            },
          }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as IntakeResult;
      setResult(body);
      setMessage(
        body.created
          ? "Relación incorporada como registro pendiente de revisión."
          : "La misma relación ya existía; se devolvió de forma idempotente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo incorporar la relación",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card editor-card">
      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Token editorial
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label>
            Tipo de relación
            <select
              value={relationshipType}
              onChange={(event) => setRelationshipType(event.target.value)}
            >
              <option value="parent_of">Parent of</option>
              <option value="cutting_of">Cutting of</option>
              <option value="clone_of">Clone of</option>
              <option value="seed_from">Seed from</option>
              <option value="culture_from">Culture from</option>
              <option value="isolate_from">Isolate from</option>
              <option value="cross_of">Cross of</option>
            </select>
          </label>
          <label>
            Generación o etiqueta
            <input
              value={generationLabel}
              onChange={(event) => setGenerationLabel(event.target.value)}
              placeholder="F1 · clon A · lote 2026"
            />
          </label>
          <label>
            Ocurrió el
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          <fieldset>
            <legend>Origen / parent</legend>
            <label>
              Tipo
              <select
                value={parentKind}
                onChange={(event) => setParentKind(event.target.value)}
              >
                <option value="specimen">Ejemplar</option>
                <option value="biological_entity">Entidad biológica</option>
              </select>
            </label>
            <label>
              ID público
              <input
                value={parentPublicId}
                onChange={(event) => setParentPublicId(event.target.value)}
                placeholder="specimen-garden-madre-001"
                required
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Destino / child</legend>
            <label>
              Tipo
              <select
                value={childKind}
                onChange={(event) => setChildKind(event.target.value)}
              >
                <option value="specimen">Ejemplar</option>
                <option value="biological_entity">Entidad biológica</option>
              </select>
            </label>
            <label>
              ID público
              <input
                value={childPublicId}
                onChange={(event) => setChildPublicId(event.target.value)}
                placeholder="specimen-garden-hijo-001"
                required
              />
            </label>
          </fieldset>
        </div>

        <label>
          Notas
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </label>

        <p className="card-kicker">Procedencia obligatoria</p>
        <div className="form-grid">
          <label>
            Source record ID
            <input
              value={sourceRecordId}
              onChange={(event) => setSourceRecordId(event.target.value)}
              placeholder="lineage:ejemplar-001:v1"
              required
            />
          </label>
          <label>
            Source public ID
            <input
              value={sourcePublicId}
              onChange={(event) => setSourcePublicId(event.target.value)}
              required
            />
          </label>
          <label>
            Recuperado el
            <input
              type="datetime-local"
              value={retrievedAt}
              onChange={(event) => setRetrievedAt(event.target.value)}
              required
            />
          </label>
          <label>
            URL de origen
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>
          <label>
            Licencia o restricción
            <input
              value={license}
              onChange={(event) => setLicense(event.target.value)}
              required
            />
          </label>
          <label>
            Versión del importador
            <input
              value={importerVersion}
              onChange={(event) => setImporterVersion(event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Atribución
          <input
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
            required
          />
        </label>
        <label>
          Payload original (JSON)
          <textarea
            value={rawPayload}
            onChange={(event) => setRawPayload(event.target.value)}
            rows={6}
            required
          />
        </label>

        <p className="empty-note">
          La relación queda fuera del árbol público hasta aceptar su source
          record con licencia, atribución y privacidad confirmadas.
        </p>
        <button
          className="button button-primary"
          type="submit"
          disabled={busy || !token.trim()}
        >
          {busy ? "Incorporando…" : "Incorporar relación"}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
        {result ? (
          <dl className="fact-list">
            <div>
              <dt>Relación</dt>
              <dd>{result.id}</dd>
            </div>
            <div>
              <dt>Estado de procedencia</dt>
              <dd>{result.sourceRecordStatus}</dd>
            </div>
            <div>
              <dt>Clave idempotente</dt>
              <dd>{result.sourceRecordKey}</dd>
            </div>
          </dl>
        ) : null}
      </form>
    </section>
  );
}
