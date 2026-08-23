export interface PlantDescriptor {
  $schema: "https://wachuma.org/schemas/plant-descriptor.schema.json";
  schemaVersion: "1.0";
  publicId: string;
  organismRef: string;
  architecture: {
    growthForm: string;
    organs: string[];
    axes: string;
    phyllotaxis?: string;
  };
  growthStage: string;
  parameters: Record<string, unknown>;
  variationSeed: number;
  sources?: string[];
  confidence?: number;
  interpretation: {
    label: "procedural-interpretation";
    scientificReconstruction: false;
    notes?: string;
  };
  generator?: {
    algorithm: string;
    version: string;
  };
}

export function createPlantDescriptor(input: {
  publicId: string;
  organismRef: string;
  growthForm: string;
  organs: string[];
  axes: string;
  growthStage: string;
  parameters: Record<string, unknown>;
  variationSeed: number;
  phyllotaxis?: string;
  sources?: string[];
  confidence?: number;
  notes?: string;
  generator?: { algorithm: string; version: string };
}): PlantDescriptor {
  if (!Number.isInteger(input.variationSeed)) {
    throw new RangeError("Plant descriptor variationSeed must be an integer");
  }
  if (
    input.confidence !== undefined &&
    (input.confidence < 0 || input.confidence > 1)
  ) {
    throw new RangeError("Plant descriptor confidence must be between 0 and 1");
  }
  return {
    $schema: "https://wachuma.org/schemas/plant-descriptor.schema.json",
    schemaVersion: "1.0",
    publicId: input.publicId,
    organismRef: input.organismRef,
    architecture: {
      growthForm: input.growthForm,
      organs: [...input.organs],
      axes: input.axes,
      ...(input.phyllotaxis ? { phyllotaxis: input.phyllotaxis } : {}),
    },
    growthStage: input.growthStage,
    parameters: { ...input.parameters },
    variationSeed: input.variationSeed,
    ...(input.sources ? { sources: [...input.sources] } : {}),
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    interpretation: {
      label: "procedural-interpretation",
      scientificReconstruction: false,
      ...(input.notes ? { notes: input.notes } : {}),
    },
    ...(input.generator ? { generator: { ...input.generator } } : {}),
  };
}
