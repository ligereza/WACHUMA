import type { LineageRelationshipType } from "@wachuma/shared";

export interface LineageInput {
  relationshipType: LineageRelationshipType;
  parentId: string;
  childId: string;
  sourceId?: string;
}

export interface LineageTreeNode {
  id: string;
  parents: string[];
  children: string[];
}

export interface LineageTree {
  nodes: LineageTreeNode[];
  roots: string[];
}

export interface PublicLineageRelationship extends LineageInput {
  sourcePublicId?: string;
}

export interface PublicLineageDocument {
  subjectPublicId: string;
  relationships: PublicLineageRelationship[];
  tree: LineageTree;
}

const demoRelationships: PublicLineageRelationship[] = [
  {
    relationshipType: "cutting_of",
    parentId: "specimen-public-demo-01",
    childId: "specimen-public-child-01",
    sourcePublicId: "source-wachuma-demo-editorial",
  },
  {
    relationshipType: "clone_of",
    parentId: "specimen-public-child-01",
    childId: "specimen-public-child-02",
    sourcePublicId: "source-wachuma-demo-editorial",
  },
];

export const demoLineageSubjects = [
  "specimen-public-demo-01",
  "specimen-public-child-01",
  "specimen-public-child-02",
] as const;

export function demoPublicLineage(
  subjectPublicId: string,
): PublicLineageDocument | null {
  if (!(demoLineageSubjects as readonly string[]).includes(subjectPublicId)) {
    return null;
  }
  const relationships = demoRelationships.filter(
    (relationship) =>
      relationship.parentId === subjectPublicId ||
      relationship.childId === subjectPublicId,
  );
  const tree = buildLineageTree(relationships);
  if (relationships.length === 0) {
    tree.nodes.push({ id: subjectPublicId, parents: [], children: [] });
    tree.roots.push(subjectPublicId);
  }
  return { subjectPublicId, relationships, tree };
}

export function validateLineageAcyclic(
  relationships: LineageInput[],
): string[] {
  const children = new Map<string, string[]>();
  for (const relationship of relationships) {
    const list = children.get(relationship.parentId) ?? [];
    list.push(relationship.childId);
    children.set(relationship.parentId, list);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[] = [];

  function visit(nodeId: string, path: string[]) {
    if (visiting.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push([...path.slice(cycleStart), nodeId].join(" -> "));
      return;
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    for (const childId of children.get(nodeId) ?? []) {
      visit(childId, [...path, nodeId]);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const relationship of relationships) {
    visit(relationship.parentId, []);
    visit(relationship.childId, []);
  }
  return cycles;
}

export function buildLineageTree(relationships: LineageInput[]): LineageTree {
  const cycles = validateLineageAcyclic(relationships);
  if (cycles.length > 0) {
    throw new Error(`Lineage cycle detected: ${cycles[0]}`);
  }

  const nodes = new Map<string, LineageTreeNode>();
  const getNode = (id: string) => {
    const existing = nodes.get(id);
    if (existing) return existing;
    const created = { id, parents: [], children: [] };
    nodes.set(id, created);
    return created;
  };

  for (const relationship of relationships) {
    const parent = getNode(relationship.parentId);
    const child = getNode(relationship.childId);
    if (!parent.children.includes(child.id)) parent.children.push(child.id);
    if (!child.parents.includes(parent.id)) child.parents.push(parent.id);
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    roots: [...nodes.values()]
      .filter((node) => node.parents.length === 0)
      .map((node) => node.id)
      .sort(),
  };
}
