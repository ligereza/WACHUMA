#!/usr/bin/env python3
"""Export evaluated frames from the animated Pachanoi Geometry Nodes source.

The .blend remains the procedural source of truth. Each GLB is only an
interchange snapshot of that same evaluated node graph; it is never a second
growth model. This is used because Blender 4.5's glTF exporter does not
serialize the animated Geometry Nodes modifier as a glTF animation clip.

Run with Blender 4.5.x:

    blender --background projects/wachuma-pachanoi-geometry-nodes.blend \
      --python export_pachanoi_sequence.py -- \
      --out-dir ../../apps/web/public/models/pachanoi-sequence \
      --frames 1,24,48,72,96,118,130,145,160,180
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import bpy


GENERATOR_VERSION = "0.3.4-cyclic-body-closure"
IDENTITY_SCHEMA_VERSION = "0.1"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_value(value):
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    if hasattr(value, "__iter__"):
        return [json_value(item) for item in value]
    return str(value)


def collect_parameters(host):
    modifier = next(
        modifier for modifier in host.modifiers if modifier.type == "NODES"
    )
    parameters = {}
    for item in modifier.node_group.interface.items_tree:
        if item.item_type != "SOCKET" or item.in_out != "INPUT":
            continue
        if item.name == "Geometry":
            continue
        try:
            value = modifier[item.identifier]
        except (KeyError, TypeError):
            value = item.default_value
        parameters[item.name] = json_value(value)
    return parameters


def identity_sidecar(parameters):
    rib_count = int(parameters.get("Rib Count", 0))
    areole_rows = int(parameters.get("Areole Rows", 0))
    parastichy_step = int(parameters.get("Parastichy Step", 0))
    frame_start = 1
    frame_end = 180
    areoles = []
    denominator = max(areole_rows - 1, 1)
    for row in range(areole_rows):
        row_fraction = row / denominator
        birth_frame = round(
            frame_start + 0.86 * row_fraction * (frame_end - frame_start)
        )
        local_s = 0.16 + 0.77 * row_fraction
        for rib_id in range(rib_count):
            track_rib_id = (rib_id + row * parastichy_step) % max(rib_count, 1)
            areoles.append(
                {
                    "areole_id": f"areole-r{track_rib_id:02d}-row{row:02d}",
                    "rib_id": track_rib_id,
                    "row": row,
                    "u": local_s,
                    "local_s": local_s,
                    "delta_theta": 2 * 3.141592653589793 / max(rib_count, 1),
                    "birth_frame": birth_frame,
                }
            )
    return {
        "schemaVersion": IDENTITY_SCHEMA_VERSION,
        "rib_ids": list(range(rib_count)),
        "areoles": areoles,
        "fields": [
            "rib_id",
            "areole_id",
            "u",
            "delta_theta",
            "local_s",
            "birth_frame",
        ],
        "source": "procedural lattice declared by Geometry Nodes generator",
        "glbEncoding": "absent; manifest sidecar only",
        "correspondence": "not proven at vertex level because glTF export keeps POSITION/NORMAL only",
    }


def export_snapshot(obj, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.hide_render = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    result = bpy.ops.export_scene.gltf(
        filepath=str(output.resolve()),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_gn_mesh=False,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=True,
    )
    if result != {"FINISHED"} or not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError(f"GLB export failed for frame {output.name}: {result}")
    obj.hide_set(True)
    obj.hide_render = True


def bake_frame(host, frame: int):
    scene = bpy.context.scene
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = host.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    if mesh is None or not mesh.vertices:
        raise RuntimeError(f"Geometry Nodes produced an empty mesh at frame {frame}")
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(f"WACHUMA_Pachanoi_Frame_{frame:03d}", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--frames", required=True, help="Comma-separated Blender frame numbers")
    argv = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(argv)


def main():
    args = parse_args()
    frames = [int(value.strip()) for value in args.frames.split(",") if value.strip()]
    if not frames:
        raise ValueError("At least one frame is required")
    host = bpy.data.objects.get("WACHUMA_Pachanoi_GN_Source")
    if host is None:
        raise RuntimeError("Expected WACHUMA_Pachanoi_GN_Source in the Blender source file")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    generator_path = Path(__file__).resolve().with_name(
        "generate_pachanoi_geometry_nodes.py"
    )
    blend_path = Path(bpy.data.filepath).resolve()
    generator_hash = sha256_file(generator_path)
    blend_hash = sha256_file(blend_path)
    records = []
    for frame in frames:
        snapshot = bake_frame(host, frame)
        output = args.out_dir / f"frame-{frame:03d}.glb"
        export_snapshot(snapshot, output)
        parameters = collect_parameters(host)
        records.append({
            "frame": frame,
            "asset": output.name,
            "contentHash": sha256_file(output),
            "generatorVersion": GENERATOR_VERSION,
            "generatorHash": generator_hash,
            "blendHash": blend_hash,
            "seed": 0,
            "parameters": parameters,
            "identity": identity_sidecar(parameters),
            "validation": {
                "export": "passed",
                "nonEmpty": bool(snapshot.data.vertices and snapshot.data.polygons),
                "gltfValidator": "not-run-by-exporter",
                "bodyTopology": "not-instrumented-by-exporter",
                "vertexIdentity": "not-encoded-in-glb",
            },
        })
        snapshot_mesh = snapshot.data
        bpy.data.objects.remove(snapshot, do_unlink=True)
        bpy.data.meshes.remove(snapshot_mesh, do_unlink=True)

    manifest = {
        "$schema": "https://wachuma.org/schemas/procedural-asset-sequence.schema.json",
        "schemaVersion": "1.0",
        "origin": "procedural",
        "source": "integrations/blender/projects/wachuma-pachanoi-geometry-nodes.blend",
        "generator": "integrations/blender/generate_pachanoi_geometry_nodes.py",
        "generatorVersion": GENERATOR_VERSION,
        "generatorHash": generator_hash,
        "blendHash": blend_hash,
        "runtime": "Blender 4.5.4 Geometry Nodes",
        "seed": 0,
        "frames": records,
        "identity": {
            "schemaVersion": IDENTITY_SCHEMA_VERSION,
            "domain": "procedural rib/areole lattice",
            "encoding": "versioned manifest sidecar",
            "glbEncoding": "absent",
            "limitation": "The sidecar declares generator coordinates; it does not prove a vertex-to-identity correspondence in exported GLB primitives.",
        },
        "interpolation": "discrete evaluated snapshots from one animated Geometry Nodes graph",
        "notClaimed": ["glTF native animation clip", "cell division simulation", "universal species law"],
    }
    manifest_path = args.out_dir / "sequence.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outDir": str(args.out_dir), "frames": records, "manifest": str(manifest_path)}, indent=2))


if __name__ == "__main__":
    main()
