"""Add a repeatable presentation scene to the generated Blender project.

Run with Blender 4.5.x after generating the .blend. The Geometry Nodes graph
and baked export are not changed; this only adds a camera, lights and floor.
"""

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


PROJECT = Path(bpy.data.filepath).resolve()
PREVIEW = PROJECT.parents[3] / ".local" / "blender-run" / "wachuma-pachanoi-project-preview.png"


def aim_camera(camera, target):
    view = (Vector(target) - camera.location).normalized()
    world_up = Vector((0.0, 1.0, 0.0))
    right = view.cross(world_up).normalized()
    up = right.cross(view).normalized()
    camera.matrix_world = Matrix(
        (
            (right.x, up.x, -view.x, camera.location.x),
            (right.y, up.y, -view.y, camera.location.y),
            (right.z, up.z, -view.z, camera.location.z),
            (0.0, 0.0, 0.0, 1.0),
        )
    )


def add_area(name, location, energy, size, target):
    existing = bpy.data.objects.get(name)
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.color = (0.025, 0.035, 0.03)

camera = bpy.data.objects.get("WACHUMA_Pachanoi_PresentationCamera")
if camera:
    bpy.data.objects.remove(camera, do_unlink=True)
bpy.ops.object.camera_add(location=(3.4, 1.65, 3.4))
camera = bpy.context.object
camera.name = "WACHUMA_Pachanoi_PresentationCamera"
camera.data.lens = 52
aim_camera(camera, (0.0, 1.3, 0.0))
scene.camera = camera

add_area("WACHUMA_Key", (2.4, 3.8, 2.6), 950, 3.0, (0.0, 1.2, 0.0))
add_area("WACHUMA_Fill", (-2.8, 2.4, 0.8), 420, 3.0, (0.0, 1.0, 0.0))
add_area("WACHUMA_Rim", (0.0, 3.7, -2.8), 700, 2.5, (0.0, 1.8, 0.0))

floor = bpy.data.objects.get("WACHUMA_Pachanoi_PresentationFloor")
if floor:
    bpy.data.objects.remove(floor, do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=6.0, location=(0.0, -0.035, 0.0), rotation=(math.pi / 2, 0.0, 0.0))
floor = bpy.context.object
floor.name = "WACHUMA_Pachanoi_PresentationFloor"
material = bpy.data.materials.new("WACHUMA presentation floor")
material.diffuse_color = (0.035, 0.065, 0.045, 1.0)
material.use_nodes = True
material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.035, 0.065, 0.045, 1.0)
material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
floor.data.materials.append(material)

scene.render.filepath = str(PREVIEW)
PROJECT.parent.mkdir(parents=True, exist_ok=True)
PREVIEW.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT))
bpy.ops.render.render(write_still=True)
print(f"project={PROJECT}")
print(f"preview={PREVIEW}")
