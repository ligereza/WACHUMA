"""Validate causal invariants of the Geometry Nodes growth project."""

import bpy


scene = bpy.context.scene
host = bpy.data.objects["WACHUMA_Pachanoi_GenerativeGrowth"]


def values(evaluated, name):
    attribute = evaluated.data.attributes.get(name)
    if not attribute:
        return []
    result = set()
    for item in attribute.data:
        if hasattr(item, "value"):
            result.add(round(item.value, 4))
        elif hasattr(item, "integer"):
            result.add(item.integer)
        elif hasattr(item, "boolean"):
            result.add(item.boolean)
    return sorted(result, key=str)


for checkpoint in (1, 71, 72, 85, 180):
    scene.frame_set(1)
    for frame in range(1, checkpoint + 1):
        scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = host.evaluated_get(depsgraph)
    print(
        "CHECK",
        checkpoint,
        "dims",
        tuple(round(v, 4) for v in evaluated.dimensions),
        "shoot_id",
        values(evaluated, "shoot_id"),
        "birth_frame",
        values(evaluated, "birth_frame"),
        "front",
        values(evaluated, "front"),
        "is_child",
        values(evaluated, "is_child"),
    )


scene.frame_set(1)
