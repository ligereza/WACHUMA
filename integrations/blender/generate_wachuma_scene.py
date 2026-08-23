#!/usr/bin/env python3
"""External Blender adapter for a small, provenance-aware Geometry Nodes asset.

Run from Blender, not from the WACHUMA web/API packages:

    blender --background --python generate_wachuma_scene.py -- --request recipe.json

The script intentionally creates a simple procedural interpretation. It does
not claim to reconstruct a taxon or a real specimen.
"""

import argparse
import hashlib
import json
import sys
import traceback
from pathlib import Path

import bpy


def parse_request() -> dict:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", required=True, type=Path)
    args = parser.parse_args(argv)
    request = json.loads(args.request.read_text(encoding="utf-8"))
    if request.get("schemaVersion") != "1.0":
        raise ValueError("Unsupported procedural adapter request schema")
    if request.get("output", {}).get("format") != "glb":
        raise ValueError("The Blender adapter currently emits GLB only")
    return request


def interface_socket(node_group, name, in_out):
    # Blender 4.x uses node_group.interface; keeping this in one helper makes
    # the version boundary visible if a future worker supports Blender 3.x.
    return node_group.interface.new_socket(
        name=name, in_out=in_out, socket_type="NodeSocketGeometry"
    )


def create_geometry_nodes_object(parameters: dict):
    height = float(parameters.get("height", 2.2))
    radius = float(parameters.get("radius", 0.38))
    vertices = max(12, int(parameters.get("vertices", 32)))

    mesh = bpy.data.meshes.new("WACHUMA_GeometryNodesHostMesh")
    host = bpy.data.objects.new("WACHUMA procedural cactus", mesh)
    bpy.context.collection.objects.link(host)

    modifier = host.modifiers.new(name="WACHUMA Geometry Nodes", type="NODES")
    node_group = bpy.data.node_groups.new(
        "WACHUMA_Cactus_GeometryNodes", "GeometryNodeTree"
    )
    modifier.node_group = node_group
    interface_socket(node_group, "Geometry", "INPUT")
    interface_socket(node_group, "Geometry", "OUTPUT")

    nodes = node_group.nodes
    links = node_group.links
    input_node = nodes.new("NodeGroupInput")
    output_node = nodes.new("NodeGroupOutput")
    cylinder = nodes.new("GeometryNodeMeshCylinder")
    cylinder.inputs["Vertices"].default_value = vertices
    cylinder.inputs["Radius"].default_value = radius
    cylinder.inputs["Depth"].default_value = height

    links.new(cylinder.outputs["Mesh"], output_node.inputs["Geometry"])
    input_node.location.x = -260
    cylinder.location.x = 0
    output_node.location.x = 260
    bpy.context.view_layer.update()

    # Bake the evaluated node output into a temporary export mesh. Blender's
    # GLB exporter does not consistently evaluate an empty host mesh with a
    # Geometry Nodes modifier in background mode, so the boundary is explicit:
    # nodes generate the geometry, the exported object carries that result.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = host.evaluated_get(depsgraph)
    baked_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    if baked_mesh is None or len(baked_mesh.vertices) == 0:
        raise RuntimeError("Geometry Nodes evaluated to an empty mesh")

    export_object = bpy.data.objects.new("WACHUMA procedural cactus export", baked_mesh)
    bpy.context.collection.objects.link(export_object)
    host.hide_set(True)
    host.hide_render = True
    return export_object


def export_asset(output_path: Path, export_object):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.select_all(action="DESELECT")
    export_object.select_set(True)
    bpy.context.view_layer.objects.active = export_object
    result = bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
    )
    if result != {"FINISHED"} or not output_path.is_file() or output_path.stat().st_size == 0:
        raise RuntimeError(f"Blender GLB export did not finish successfully: {result}")


def write_manifest(request: dict, asset_path: Path, manifest_path: Path):
    recipe = request["recipe"]
    generator = request["generator"]
    content_hash = hashlib.sha256(asset_path.read_bytes()).hexdigest()
    manifest = {
        "$schema": "https://wachuma.org/schemas/procedural-asset-manifest.schema.json",
        "schemaVersion": "1.0",
        "asset": asset_path.name,
        "format": "glb",
        "contentHash": content_hash,
        "origin": "procedural",
        "generator": generator,
        "adapterBoundary": "external-process",
        "seed": recipe["seed"],
        "license": "WACHUMA-PROJECT",
        "attribution": "WACHUMA external Blender / Geometry Nodes adapter",
        "representationType": "procedural-interpretation",
        "taxonomicClaim": bool(recipe["constraints"].get("taxonomicClaim", False)),
    }
    if generator.get("repositoryUrl"):
        manifest["sourceUrl"] = generator["repositoryUrl"]
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"asset": str(asset_path), "contentHash": content_hash}))


def main():
    request = parse_request()
    output = request["output"]
    asset_path = Path(output["assetPath"]).resolve()
    manifest_path = Path(output["manifestPath"]).resolve()

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    export_object = create_geometry_nodes_object(request["recipe"]["parameters"])
    export_asset(asset_path, export_object)
    write_manifest(request, asset_path, manifest_path)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Blender may otherwise report a Python operator failure with exit code
        # 0. The external worker contract must make failures observable.
        traceback.print_exc()
        sys.exit(1)
