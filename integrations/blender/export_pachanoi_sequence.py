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
    records = []
    for frame in frames:
        snapshot = bake_frame(host, frame)
        output = args.out_dir / f"frame-{frame:03d}.glb"
        export_snapshot(snapshot, output)
        records.append({
            "frame": frame,
            "asset": output.name,
            "contentHash": hashlib.sha256(output.read_bytes()).hexdigest(),
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
        "runtime": "Blender 4.5.4 Geometry Nodes",
        "frames": records,
        "interpolation": "discrete evaluated snapshots from one animated Geometry Nodes graph",
        "notClaimed": ["glTF native animation clip", "cell division simulation", "universal species law"],
    }
    manifest_path = args.out_dir / "sequence.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"outDir": str(args.out_dir), "frames": records, "manifest": str(manifest_path)}, indent=2))


if __name__ == "__main__":
    main()
