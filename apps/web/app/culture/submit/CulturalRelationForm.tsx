"use client";

import { FormEvent, useState } from "react";

const initialForm = {
  publicId: "cultural-relation-local-draft",
  relationType: "vernacular_name",
  subjectPublicId: "biological-entity-echinopsis-pachanoi",
  valueText: "",
  description: "",
  communityPublicId: "community-demo-pending-review",
  culturePublicId: "",
  placePublicId: "",
  historicalPeriodPublicId: "period-wachuma-demo",
  documentedByAgentPublicId: "agent-wachuma-editorial-demo",
  sourcePublicId: "source-wachuma-demo-editorial",
  evidenceLevel: "unverified",
  assertionType: "community_knowledge",
  authorPerspective: "",
  sensitivity: "normal",
  accessLevel: "restricted",
  license: "",
  reviewStatus: "draft",
  recordedOn: "",
};

export function CulturalRelationForm() {
  const [form, setForm] = useState(initialForm);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_WACHUMA_API_URL ?? "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/v1/admin/culture/relations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          valueText: form.valueText || undefined,
          culturePublicId: form.culturePublicId || undefined,
          communityPublicId: form.communityPublicId || undefined,
          placePublicId: form.placePublicId || undefined,
          historicalPeriodPublicId: form.historicalPeriodPublicId || undefined,
          documentedByAgentPublicId:
            form.documentedByAgentPublicId || undefined,
          recordedOn: form.recordedOn || undefined,
        }),
      });
      const body = (await response.json()) as {
        message?: string;
        publicId?: string;
      };
      setMessage(
        response.ok
          ? `Borrador registrado: ${body.publicId ?? form.publicId}`
          : `No se registró: ${body.message ?? "error de API"}`,
      );
    } catch {
      setMessage(
        "No se pudo conectar con el API. Revisa WACHUMA_API_URL y el token local.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>
        Token editorial local
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          autoComplete="off"
        />
      </label>
      <div className="form-grid">
        <label>
          Identificador
          <input
            value={form.publicId}
            onChange={(event) => update("publicId", event.target.value)}
            required
          />
        </label>
        <label>
          Tipo de relación
          <select
            value={form.relationType}
            onChange={(event) => update("relationType", event.target.value)}
          >
            <option value="vernacular_name">Nombre vernáculo</option>
            <option value="food">Alimento</option>
            <option value="medicine">Medicina</option>
            <option value="ritual">Ritual</option>
            <option value="symbolism">Simbolismo</option>
            <option value="material">Material</option>
            <option value="cultivation">Cultivo</option>
            <option value="trade">Intercambio</option>
            <option value="mythology">Mitología</option>
            <option value="art">Arte</option>
            <option value="archaeology">Arqueología</option>
            <option value="ecological_management">Gestión ecológica</option>
            <option value="historical_account">Relato histórico</option>
          </select>
        </label>
        <label>
          Lugar o territorio (opcional)
          <input
            value={form.placePublicId}
            onChange={(event) => update("placePublicId", event.target.value)}
          />
        </label>
        <label>
          Cultura biológica (opcional)
          <input
            value={form.culturePublicId}
            onChange={(event) => update("culturePublicId", event.target.value)}
            placeholder="culture-demo-public-agar"
          />
        </label>
      </div>
      <label>
        Texto o nombre documentado
        <input
          value={form.valueText}
          onChange={(event) => update("valueText", event.target.value)}
        />
      </label>
      <label>
        Descripción y contexto
        <textarea
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          required
          rows={5}
        />
      </label>
      <div className="form-grid">
        <label>
          Comunidad relacionada
          <input
            value={form.communityPublicId}
            onChange={(event) =>
              update("communityPublicId", event.target.value)
            }
          />
        </label>
        <label>
          Fuente
          <input
            value={form.sourcePublicId}
            onChange={(event) => update("sourcePublicId", event.target.value)}
            required
          />
        </label>
        <label>
          Periodo histórico (opcional)
          <input
            value={form.historicalPeriodPublicId}
            onChange={(event) =>
              update("historicalPeriodPublicId", event.target.value)
            }
          />
        </label>
        <label>
          Identificador de quien documenta (opcional)
          <input
            value={form.documentedByAgentPublicId}
            onChange={(event) =>
              update("documentedByAgentPublicId", event.target.value)
            }
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Nivel de evidencia
          <select
            value={form.evidenceLevel}
            onChange={(event) => update("evidenceLevel", event.target.value)}
          >
            <option value="unverified">Sin verificar</option>
            <option value="reported">Reportado</option>
            <option value="documented">Documentado</option>
            <option value="peer-reviewed">Revisado por pares</option>
          </select>
        </label>
        <label>
          Tipo de afirmación
          <select
            value={form.assertionType}
            onChange={(event) => update("assertionType", event.target.value)}
          >
            <option value="community_knowledge">
              Conocimiento comunitario
            </option>
            <option value="historical_source">Fuente histórica</option>
            <option value="archaeological_evidence">
              Evidencia arqueológica
            </option>
            <option value="academic_publication">Publicación académica</option>
            <option value="editorial_interpretation">
              Interpretación editorial
            </option>
          </select>
        </label>
      </div>
      <label>
        Perspectiva de quien documenta
        <textarea
          value={form.authorPerspective}
          onChange={(event) => update("authorPerspective", event.target.value)}
          required
          rows={3}
        />
      </label>
      <div className="form-grid">
        <label>
          Sensibilidad
          <select
            value={form.sensitivity}
            onChange={(event) => update("sensitivity", event.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="sensitive">Sensible</option>
            <option value="sacred">Sagrada</option>
          </select>
        </label>
        <label>
          Acceso
          <select
            value={form.accessLevel}
            onChange={(event) => update("accessLevel", event.target.value)}
          >
            <option value="restricted">Restringido</option>
            <option value="community-controlled">Control comunitario</option>
            <option value="sensitive">Sensible</option>
            <option value="public">Público</option>
          </select>
        </label>
      </div>
      <label>
        Licencia o restricción de uso
        <input
          value={form.license}
          onChange={(event) => update("license", event.target.value)}
          required
        />
      </label>
      <label>
        Fecha de registro (opcional)
        <input
          type="date"
          value={form.recordedOn}
          onChange={(event) => update("recordedOn", event.target.value)}
        />
      </label>
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? "Registrando…" : "Registrar borrador"}
      </button>
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
