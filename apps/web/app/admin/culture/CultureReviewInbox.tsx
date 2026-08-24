"use client";

import { useMemo, useState } from "react";
import type { AdminCulturalRelationRecord } from "@wachuma/shared";

type Filter = "all" | AdminCulturalRelationRecord["reviewStatus"];

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

function statusLabel(status: Filter): string {
  return status === "all" ? "todas" : status;
}

function CulturalRelationCard({
  relation,
  token,
  reviewer,
  onChanged,
}: {
  relation: AdminCulturalRelationRecord;
  token: string;
  reviewer: string;
  onChanged: () => void;
}) {
  const [note, setNote] = useState(relation.reviewNote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function mutate(
    path: string,
    method: "PATCH" | "POST",
    body: Record<string, unknown>,
  ) {
    if (!note.trim()) {
      setMessage("La decisión necesita una nota de revisión.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...body,
          ...(method === "PATCH"
            ? { reviewNote: note.trim(), reviewer: reviewer.trim() }
            : { reason: note.trim(), reviewer: reviewer.trim() }),
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la decisión",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="review-card">
      <div className="review-card-heading">
        <div>
          <p className="card-kicker">{relation.relationType}</p>
          <h2>{relation.publicId}</h2>
        </div>
        <span className="review-status">{relation.reviewStatus}</span>
      </div>
      <dl className="review-facts">
        <div>
          <dt>Sujeto</dt>
          <dd>{relation.subjectPublicId}</dd>
        </div>
        <div>
          <dt>Contexto</dt>
          <dd>
            {relation.communityPublicId ??
              relation.culturePublicId ??
              "Sin comunidad o cultura"}
          </dd>
        </div>
        <div>
          <dt>Fuente</dt>
          <dd>{relation.sourcePublicId}</dd>
        </div>
        <div>
          <dt>Evidencia</dt>
          <dd>{relation.evidenceLevel}</dd>
        </div>
        <div>
          <dt>Perspectiva</dt>
          <dd>{relation.authorPerspective}</dd>
        </div>
        <div>
          <dt>Acceso / sensibilidad</dt>
          <dd>
            {relation.accessLevel} · {relation.sensitivity}
          </dd>
        </div>
      </dl>
      {relation.valueText ? (
        <p className="review-culture-value">{relation.valueText}</p>
      ) : null}
      <p className="review-culture-description">{relation.description}</p>
      <p className="empty-note">
        Documentó:{" "}
        {relation.documentedByName ??
          relation.documentedByAgentPublicId ??
          "no indicado"}
        {relation.placePublicId ? ` · lugar: ${relation.placePublicId}` : ""}
        {relation.recordedOn ? ` · registrado: ${relation.recordedOn}` : ""}
        {relation.reviewedBy ? ` · revisó: ${relation.reviewedBy}` : ""}
      </p>
      <label className="review-note">
        Nota de decisión
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Qué fuente, contexto, licencia y alcance se verificaron…"
          required
        />
      </label>
      <div className="review-actions">
        <button
          className="button"
          type="button"
          disabled={busy || !token.trim() || !note.trim()}
          onClick={() =>
            void mutate(
              `/api/v1/admin/culture/relations/${relation.publicId}`,
              "PATCH",
              { reviewStatus: "under-review" },
            )
          }
        >
          Guardar en revisión
        </button>
        <button
          className="button button-primary"
          type="button"
          disabled={busy || !token.trim() || !note.trim()}
          onClick={() =>
            void mutate(
              `/api/v1/admin/culture/relations/${relation.publicId}`,
              "PATCH",
              {
                reviewStatus: "accepted",
                accessLevel: "public",
                sensitivity: "normal",
              },
            )
          }
        >
          Aceptar y publicar contexto
        </button>
        <button
          className="button"
          type="button"
          disabled={busy || !token.trim() || !note.trim()}
          onClick={() =>
            void mutate(
              `/api/v1/admin/culture/relations/${relation.publicId}/takedown`,
              "POST",
              {},
            )
          }
        >
          Restringir / retirar
        </button>
      </div>
      {message ? <p className="form-message">{message}</p> : null}
    </article>
  );
}

export function CultureReviewInbox() {
  const [token, setToken] = useState("");
  const [reviewer, setReviewer] = useState("cultural-editorial-local");
  const [filter, setFilter] = useState<Filter>("under-review");
  const [relations, setRelations] = useState<AdminCulturalRelationRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadRelations() {
    if (!token.trim()) {
      setMessage("Ingresa el token editorial local para consultar la bandeja.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/culture/relations`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      setRelations((await response.json()) as AdminCulturalRelationRecord[]);
    } catch (error) {
      setRelations([]);
      setMessage(
        error instanceof Error ? error.message : "No se pudo cargar la bandeja",
      );
    } finally {
      setBusy(false);
    }
  }

  const visibleRelations = useMemo(
    () =>
      filter === "all"
        ? relations
        : relations.filter((relation) => relation.reviewStatus === filter),
    [filter, relations],
  );

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
        <button
          className="button button-primary"
          type="button"
          disabled={busy || !token.trim()}
          onClick={() => void loadRelations()}
        >
          {busy ? "Cargando…" : "Cargar relaciones"}
        </button>
      </div>
      <div className="review-filters" aria-label="Estado de revisión cultural">
        {(
          ["under-review", "draft", "accepted", "rejected", "all"] as Filter[]
        ).map((option) => (
          <button
            className={filter === option ? "tag tag-active" : "tag"}
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            disabled={busy || !token.trim()}
          >
            {statusLabel(option)}
          </button>
        ))}
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      {visibleRelations.length ? (
        <div className="review-list">
          {visibleRelations.map((relation) => (
            <CulturalRelationCard
              key={relation.publicId}
              relation={relation}
              token={token}
              reviewer={reviewer}
              onChanged={() => void loadRelations()}
            />
          ))}
        </div>
      ) : (
        <p className="empty-note">
          No hay relaciones en el filtro “{statusLabel(filter)}”. La bandeja no
          publica ni modifica nada hasta que el editor carga el contenido y
          confirma una decisión.
        </p>
      )}
    </div>
  );
}
