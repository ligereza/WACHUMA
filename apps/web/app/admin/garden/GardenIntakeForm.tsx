"use client";

import { FormEvent, useState } from "react";

const apiUrl = (
  process.env.NEXT_PUBLIC_WACHUMA_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

type IntakeResult = {
  specimen: {
    publicId: string;
    visibility: string;
  };
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

export function GardenIntakeForm() {
  const [token, setToken] = useState("");
  const [publicId, setPublicId] = useState("");
  const [biologicalEntityPublicId, setBiologicalEntityPublicId] = useState(
    "biological-entity-echinopsis-pachanoi",
  );
  const [specimenType, setSpecimenType] = useState("plant-live");
  const [status, setStatus] = useState("alive");
  const [visibility, setVisibility] = useState("restricted");
  const [acquiredAt, setAcquiredAt] = useState("");
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
    "garden-intake-web-0.1.0",
  );
  const [rawPayload, setRawPayload] = useState(
    '{\n  "capture": "manual",\n  "locationPolicy": "not-published"\n}',
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
        `${apiUrl}/api/v1/admin/garden/intake/specimens`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            publicId,
            specimenType,
            biologicalEntityPublicId,
            status,
            visibility,
            ...(acquiredAt
              ? { acquiredAt: new Date(acquiredAt).toISOString() }
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
          ? "Ejemplar incorporado como registro pendiente de revisión."
          : "La misma entrada ya existía; se devolvió de forma idempotente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo incorporar el ejemplar",
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
            ID público del ejemplar
            <input
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              placeholder="garden-echinopsis-001"
              pattern="[a-z0-9][a-z0-9._-]{0,159}"
              required
            />
          </label>
          <label>
            Entidad biológica
            <input
              value={biologicalEntityPublicId}
              onChange={(event) =>
                setBiologicalEntityPublicId(event.target.value)
              }
              required
            />
          </label>
          <label>
            Tipo de material
            <select
              value={specimenType}
              onChange={(event) => setSpecimenType(event.target.value)}
            >
              <option value="plant-live">Planta viva</option>
              <option value="cutting">Esqueje</option>
              <option value="seed">Semilla</option>
              <option value="agar-culture">Cultivo de agar</option>
              <option value="liquid-culture">Cultura líquida</option>
              <option value="spawn">Spawn</option>
              <option value="sample">Muestra</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="alive">Vivo</option>
              <option value="stored">Almacenado</option>
              <option value="archived">Archivado</option>
              <option value="lost">Perdido</option>
              <option value="deceased">Fallecido</option>
            </select>
          </label>
          <label>
            Visibilidad inicial
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="restricted">Restringido</option>
              <option value="sensitive">Sensible</option>
              <option value="community-controlled">Control comunitario</option>
            </select>
          </label>
          <label>
            Adquirido el
            <input
              type="datetime-local"
              value={acquiredAt}
              onChange={(event) => setAcquiredAt(event.target.value)}
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
        </div>

        <label>
          Notas de custodia
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
              placeholder="garden:ejemplar-001:v1"
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
            Atribución
            <input
              value={attribution}
              onChange={(event) => setAttribution(event.target.value)}
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
          Payload original (JSON)
          <textarea
            value={rawPayload}
            onChange={(event) => setRawPayload(event.target.value)}
            rows={6}
            required
          />
        </label>

        <p className="empty-note">
          Este formulario no acepta `public` como visibilidad inicial. La
          publicación requiere una revisión separada del source record.
        </p>
        <button
          className="button button-primary"
          type="submit"
          disabled={busy || !token.trim()}
        >
          {busy ? "Incorporando…" : "Incorporar con procedencia"}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
        {result ? (
          <dl className="fact-list">
            <div>
              <dt>Registro</dt>
              <dd>{result.specimen.publicId}</dd>
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
