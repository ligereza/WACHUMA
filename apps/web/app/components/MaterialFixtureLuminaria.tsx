"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { MaterialFixture, MaterialFixtureLayer } from "@wachuma/shared";

const layers: Array<[MaterialFixtureLayer, string]> = [
  ["morphology", "Morfología"],
  ["cultivation", "Cultivo"],
  ["ecology", "Ecología"],
  ["chemistry", "Química"],
];

export function MaterialFixtureLuminaria({
  fixture,
}: {
  fixture: MaterialFixture;
}) {
  const [lightIntensity, setLightIntensity] = useState(1);
  const [presentationRoughness, setPresentationRoughness] = useState(
    fixture.material.roughness ?? 0.7,
  );
  const [activeLayer, setActiveLayer] =
    useState<MaterialFixtureLayer>("morphology");
  const activeBindings = fixture.bindings.filter(
    (binding) => binding.layer === activeLayer,
  );
  const materialStyle = useMemo(
    () =>
      ({
        "--fixture-color": fixture.material.baseColor ?? "#86a77b",
        "--fixture-roughness": String(presentationRoughness),
        "--fixture-transmission": String(fixture.material.transmission ?? 0),
        "--fixture-emission": fixture.material.emissiveColor ?? "#d5e9c2",
        "--fixture-emissive-strength": String(
          (fixture.material.emissiveStrength ?? 0.1) * lightIntensity,
        ),
      }) as CSSProperties,
    [fixture, lightIntensity, presentationRoughness],
  );

  return (
    <div className="material-luminaria">
      <div
        className="material-fixture-orb"
        style={materialStyle}
        role="img"
        aria-label="Interpretación visual de material; no reconstrucción científica"
      />
      <div className="material-luminaria-controls">
        <p className="card-kicker">Controles de lectura visual</p>
        <label>
          Luz de escena · {lightIntensity.toFixed(1)}
          <input
            type="range"
            min="0.3"
            max="2"
            step="0.1"
            value={lightIntensity}
            onChange={(event) => setLightIntensity(Number(event.target.value))}
          />
        </label>
        <label>
          Rugosidad de presentación · {presentationRoughness.toFixed(2)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={presentationRoughness}
            onChange={(event) =>
              setPresentationRoughness(Number(event.target.value))
            }
          />
        </label>
        <div
          className="material-layer-tabs"
          role="tablist"
          aria-label="Capa de lectura"
        >
          {layers.map(([layer, label]) => (
            <button
              key={layer}
              className={activeLayer === layer ? "is-active" : undefined}
              type="button"
              role="tab"
              aria-selected={activeLayer === layer}
              onClick={() => setActiveLayer(layer)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="material-luminaria-layer">
          {activeBindings.length ? (
            activeBindings.map((binding) => (
              <p key={binding.id}>
                <strong>{binding.target}</strong> · {binding.notes}
              </p>
            ))
          ) : activeLayer === "chemistry" ? (
            <p>
              Sin claims químicos publicables. La luz no se usa para inferir
              composición.
            </p>
          ) : (
            <p>Sin vínculo publicable en esta capa.</p>
          )}
        </div>
        <small>
          Los controles modifican sólo la presentación de esta interpretación
          procedural.
        </small>
      </div>
    </div>
  );
}
