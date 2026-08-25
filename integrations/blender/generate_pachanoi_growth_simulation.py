"""Build a stateful Pachanoi growth project for Blender 4.5.

This is deliberately a new generator, not a parameter animation layered over
the previous mesh.  The Geometry Nodes tree keeps one point per shoot inside a
Simulation Zone.  A shoot point carries its birth, parent, age, meristem front,
radius and axis.  A child point is appended once from a parent areole; the
visible rib/areole/spine organism is instanced from that state.

The project is a mathematical growth instrument, not a claim that these
rules are a complete botanical model.  The important invariant is causal:
before the birth frame there is no child state and therefore no child module.
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
PROJECT_DIR = ROOT / "integrations" / "blender" / "projects"
LOCAL_DIR = ROOT / ".local" / "blender-run"
PROJECT_PATH = PROJECT_DIR / "wachuma-pachanoi-growth-simulation.blend"
RENDER_DIR = LOCAL_DIR / "pachanoi-growth-simulation"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.node_groups, bpy.data.cameras, bpy.data.lights):
        # Do not remove built-in data blocks.  The generator is normally run in
        # a fresh Blender process, so this is mainly useful for re-running it
        # interactively.
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def interface_socket(group, name, in_out, socket_type, default=None, minimum=None, maximum=None, description=""):
    socket = group.interface.new_socket(name=name, in_out=in_out, socket_type=socket_type)
    if default is not None:
        socket.default_value = default
    if minimum is not None:
        socket.min_value = minimum
    if maximum is not None:
        socket.max_value = maximum
    socket.description = description
    return socket


def value_node(nodes, value, label):
    node = nodes.new("ShaderNodeValue")
    node.label = label
    node.name = label
    node.outputs[0].default_value = value
    return node.outputs[0]


def int_node(nodes, value, label):
    node = nodes.new("FunctionNodeInputInt")
    node.label = label
    node.name = label
    node.integer = int(value)
    return node.outputs[0]


def math_node(nodes, links, operation, a, b=None, label=""):
    # Keep unary calls concise: math_node(..., "SINE", field, "label").
    # A string cannot be a numeric second socket value, so interpret it as
    # the label when no explicit label was supplied.
    if isinstance(b, str) and not label:
        label, b = b, None
    node = nodes.new("ShaderNodeMath")
    node.operation = operation
    node.label = label or operation
    node.name = label or operation
    if hasattr(a, "bl_idname"):
        links.new(a, node.inputs[0])
    else:
        node.inputs[0].default_value = a
    if b is not None:
        if hasattr(b, "bl_idname"):
            links.new(b, node.inputs[1])
        else:
            node.inputs[1].default_value = b
    return node.outputs[0]


def bool_node(nodes, links, operation, a, b=None, label=""):
    node = nodes.new("FunctionNodeBooleanMath")
    node.operation = operation
    node.label = label or operation
    node.name = label or operation
    if hasattr(a, "bl_idname"):
        links.new(a, node.inputs[0])
    else:
        node.inputs[0].default_value = bool(a)
    if b is not None:
        if hasattr(b, "bl_idname"):
            links.new(b, node.inputs[1])
        else:
            node.inputs[1].default_value = bool(b)
    return node.outputs[0]


def vector_node(nodes, links, x, y, z, label=""):
    node = nodes.new("ShaderNodeCombineXYZ")
    node.label = label
    node.name = label or "vector"
    for socket, source in zip((node.inputs[0], node.inputs[1], node.inputs[2]), (x, y, z)):
        if hasattr(source, "bl_idname"):
            links.new(source, socket)
        else:
            socket.default_value = source
    return node.outputs[0]


def vector_math(nodes, links, operation, a, b=None, label=""):
    node = nodes.new("ShaderNodeVectorMath")
    node.operation = operation
    node.label = label or operation
    node.name = label or operation
    if hasattr(a, "bl_idname"):
        links.new(a, node.inputs[0])
    else:
        node.inputs[0].default_value = a
    b_socket = node.inputs[3] if operation == "SCALE" else node.inputs[1]
    if b is not None:
        if hasattr(b, "bl_idname"):
            links.new(b, b_socket)
        else:
            b_socket.default_value = b
    return node.outputs[0]


def smoothstep(nodes, links, x, label):
    clamped = math_node(nodes, links, "MAXIMUM", 0.0, x, label + " clamp low")
    clamped = math_node(nodes, links, "MINIMUM", 1.0, clamped, label + " clamp high")
    x2 = math_node(nodes, links, "MULTIPLY", clamped, clamped, label + " x2")
    two_x = math_node(nodes, links, "MULTIPLY", 2.0, clamped, label + " two x")
    three_minus = math_node(nodes, links, "SUBTRACT", 3.0, two_x, label + " 3-2x")
    return math_node(nodes, links, "MULTIPLY", x2, three_minus, label + " result")


def named_attribute(nodes, name, data_type, label):
    node = nodes.new("GeometryNodeInputNamedAttribute")
    node.data_type = data_type
    node.label = label
    node.name = label
    node.inputs["Name"].default_value = name
    return node.outputs["Attribute"]


def store_attribute(nodes, links, geometry, name, data_type, value=None, selection=None, label=""):
    node = nodes.new("GeometryNodeStoreNamedAttribute")
    node.data_type = data_type
    node.domain = "POINT"
    node.label = label or f"store {name}"
    node.name = label or f"store {name}"
    node.inputs["Name"].default_value = name
    if selection is not None:
        links.new(selection, node.inputs["Selection"])
    if hasattr(value, "bl_idname"):
        links.new(value, node.inputs["Value"])
    elif value is not None:
        node.inputs["Value"].default_value = value
    links.new(geometry, node.inputs["Geometry"])
    return node.outputs["Geometry"]


def set_material(nodes, links, geometry, material, selection=None, label=""):
    node = nodes.new("GeometryNodeSetMaterial")
    node.label = label or material.name
    node.inputs["Material"].default_value = material
    if selection is not None:
        links.new(selection, node.inputs["Selection"])
    links.new(geometry, node.inputs["Geometry"])
    return node.outputs["Geometry"]


def make_material(name, color, roughness=0.72, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def build_local_shoot_module(group, body_material, areole_material, spine_material):
    """Create one normalized shoot module.

    The module is continuous in its own axial coordinate s.  It is not a
    finished parent organism copied for a branch: every shoot state instances
    this same local rib/areole/spine construction with its own scale and axis.
    """

    nodes = group.nodes
    links = group.links
    n_ribs = 7
    n_rows = 9
    relief = 0.18
    rib_phase = math.pi / n_ribs

    grid = nodes.new("GeometryNodeMeshGrid")
    grid.label = "LOCAL RIB MODULE: theta x s"
    grid.inputs["Size X"].default_value = 2.0
    grid.inputs["Size Y"].default_value = 1.0
    grid.inputs["Vertices X"].default_value = 33
    grid.inputs["Vertices Y"].default_value = 97

    pos = nodes.new("GeometryNodeInputPosition")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(pos.outputs["Position"], sep.inputs["Vector"])
    u = sep.outputs["X"]
    s = math_node(nodes, links, "ADD", sep.outputs["Y"], 0.5, "local rib axial coordinate s")
    theta = math_node(nodes, links, "MULTIPLY", u, math.pi / n_ribs, "local rib angle")
    theta_n = math_node(nodes, links, "MULTIPLY", theta, n_ribs, "local rib harmonic")
    rib_wave = math_node(nodes, links, "COSINE", theta_n, label="continuous rib profile")
    rho = math_node(nodes, links, "ADD", 1.0, math_node(nodes, links, "MULTIPLY", relief, rib_wave, "rib relief"), "rib radius")
    cap_start = math_node(nodes, links, "SUBTRACT", s, 0.70, "apical domain")
    cap_norm = math_node(nodes, links, "DIVIDE", cap_start, 0.30, "apical normalized coordinate")
    cap = smoothstep(nodes, links, cap_norm, "finite apical meristem")
    cap_sq = math_node(nodes, links, "MULTIPLY", cap, cap, "apical closure")
    radial_factor = math_node(nodes, links, "SUBTRACT", 1.0, math_node(nodes, links, "MULTIPLY", 0.72, cap_sq, "apical radial contraction"), "apical radial field")
    radial = math_node(nodes, links, "MULTIPLY", rho, radial_factor, "module radial coordinate")
    x = math_node(nodes, links, "MULTIPLY", radial, math_node(nodes, links, "SINE", theta, "rib sine"), "module x")
    z = math_node(nodes, links, "MULTIPLY", radial, math_node(nodes, links, "COSINE", theta, "rib cosine"), "module z")
    y = math_node(nodes, links, "ADD", s, math_node(nodes, links, "MULTIPLY", 0.16, cap_sq, "apical lift"), "module y")
    module_position = vector_node(nodes, links, x, y, z, "continuous rib module position")
    module_set = nodes.new("GeometryNodeSetPosition")
    module_set.label = "M(u,s): one continuous rib module"
    links.new(grid.outputs["Mesh"], module_set.inputs["Geometry"])
    links.new(module_position, module_set.inputs["Position"])
    rib_mesh = set_material(nodes, links, module_set.outputs["Geometry"], body_material, label="rib epidermis")

    rib_points = nodes.new("GeometryNodePoints")
    rib_points.inputs["Count"].default_value = n_ribs
    rib_angle = math_node(nodes, links, "MULTIPLY", nodes.new("GeometryNodeInputIndex").outputs["Index"], 2.0 * math.pi / n_ribs, "rib module angle")
    rib_rotation = vector_node(nodes, links, 0.0, rib_angle, 0.0, "rib module rotation")
    rib_instances = nodes.new("GeometryNodeInstanceOnPoints")
    rib_instances.label = "Instance on Points: rib modules"
    links.new(rib_points.outputs["Points"], rib_instances.inputs["Points"])
    links.new(rib_mesh, rib_instances.inputs["Instance"])
    links.new(rib_rotation, rib_instances.inputs["Rotation"])

    # Areole lattice: the order is a discrete state-independent coordinate of
    # a module.  Shoot-specific age determines when the whole module is visible;
    # the local lattice itself is not randomly scattered.
    areole_points = nodes.new("GeometryNodePoints")
    total_areoles = n_ribs * n_rows
    areole_points.inputs["Count"].default_value = total_areoles
    areole_index = nodes.new("GeometryNodeInputIndex")
    rib_index = math_node(nodes, links, "MODULO", areole_index.outputs["Index"], n_ribs, "areole rib index")
    row_index = math_node(nodes, links, "FLOOR", math_node(nodes, links, "DIVIDE", areole_index.outputs["Index"], n_ribs, "areole row quotient"), "areole row")
    row_fraction = math_node(nodes, links, "DIVIDE", row_index, n_rows - 1, "areole normalized row")
    areole_s = math_node(nodes, links, "ADD", 0.12, math_node(nodes, links, "MULTIPLY", 0.74, row_fraction, "areole axial span"), "areole s")
    areole_theta = math_node(
        nodes,
        links,
        "ADD",
        math_node(nodes, links, "MULTIPLY", rib_index, 2.0 * math.pi / n_ribs, "areole angular track"),
        math_node(nodes, links, "MULTIPLY", row_index, 0.055, "small longitudinal areole wave"),
        "areole theta",
    )
    areole_radius = 1.0 + relief
    areole_x = math_node(nodes, links, "MULTIPLY", areole_radius, math_node(nodes, links, "SINE", areole_theta, "areole sine"), "areole x")
    areole_z = math_node(nodes, links, "MULTIPLY", areole_radius, math_node(nodes, links, "COSINE", areole_theta, "areole cosine"), "areole z")
    areole_position = vector_node(nodes, links, areole_x, areole_s, areole_z, "areole position on rib crest")
    areole_set = nodes.new("GeometryNodeSetPosition")
    links.new(areole_points.outputs["Points"], areole_set.inputs["Geometry"])
    links.new(areole_position, areole_set.inputs["Position"])

    areole_ico = nodes.new("GeometryNodeMeshIcoSphere")
    areole_ico.inputs["Radius"].default_value = 0.055
    areole_ico.inputs["Subdivisions"].default_value = 2
    areole_instances = nodes.new("GeometryNodeInstanceOnPoints")
    links.new(areole_set.outputs["Geometry"], areole_instances.inputs["Points"])
    links.new(areole_ico.outputs["Mesh"], areole_instances.inputs["Instance"])
    areole_geometry = set_material(nodes, links, areole_instances.outputs["Instances"], areole_material, label="areole material")

    # A deterministic five-spine fan per areole.  The fan is attached to the
    # same areole point as the module, and follows its radial frame.
    spine_geometry = []
    for index, (tangent_mix, lift, scale) in enumerate(((0.24, 0.06, 1.0), (-0.20, 0.045, 0.76), (0.08, 0.10, 0.58))):
        cone = nodes.new("GeometryNodeMeshCone")
        cone.inputs["Vertices"].default_value = 8
        cone.inputs["Radius Bottom"].default_value = 0.018
        cone.inputs["Radius Top"].default_value = 0.001
        cone.inputs["Depth"].default_value = 0.22 * scale
        transform = nodes.new("GeometryNodeTransform")
        transform.inputs["Translation"].default_value = (0.0, 0.0, 0.11 * scale)
        links.new(cone.outputs["Mesh"], transform.inputs["Geometry"])
        radial = vector_node(
            nodes,
            links,
            math_node(nodes, links, "SINE", areole_theta, f"spine {index} radial x"),
            0.0,
            math_node(nodes, links, "COSINE", areole_theta, f"spine {index} radial z"),
            f"spine {index} radial",
        )
        tangent = vector_node(
            nodes,
            links,
            math_node(nodes, links, "COSINE", areole_theta, f"spine {index} tangent x"),
            0.0,
            math_node(nodes, links, "MULTIPLY", -1.0, math_node(nodes, links, "SINE", areole_theta, f"spine {index} tangent z"), f"spine {index} tangent z"),
            f"spine {index} tangent",
        )
        direction = vector_math(nodes, links, "SCALE", radial, 0.94, f"spine {index} radial component")
        direction = vector_math(nodes, links, "ADD", direction, vector_math(nodes, links, "SCALE", tangent, tangent_mix, f"spine {index} tangent component"), f"spine {index} fan vector")
        direction = vector_math(nodes, links, "ADD", direction, vector_node(nodes, links, 0.0, lift, 0.0, f"spine {index} lift"), f"spine {index} direction")
        align = nodes.new("FunctionNodeAlignEulerToVector")
        align.axis = "Z"
        links.new(direction, align.inputs["Vector"])
        instance = nodes.new("GeometryNodeInstanceOnPoints")
        links.new(areole_set.outputs["Geometry"], instance.inputs["Points"])
        links.new(transform.outputs["Geometry"], instance.inputs["Instance"])
        links.new(align.outputs["Rotation"], instance.inputs["Rotation"])
        spine_geometry.append(set_material(nodes, links, instance.outputs["Instances"], spine_material, label=f"spine fan {index}"))

    join = nodes.new("GeometryNodeJoinGeometry")
    links.new(rib_instances.outputs["Instances"], join.inputs["Geometry"])
    links.new(areole_geometry, join.inputs["Geometry"])
    for geometry in spine_geometry:
        links.new(geometry, join.inputs["Geometry"])
    return join.outputs["Geometry"]


def build_group(materials):
    body_material, areole_material, spine_material = materials
    group = bpy.data.node_groups.new("WACHUMA_Pachanoi_GenerativeGrowth_45", "GeometryNodeTree")
    interface_socket(group, "Geometry", "INPUT", "NodeSocketGeometry", description="Unused host geometry")
    interface_socket(group, "Geometry", "OUTPUT", "NodeSocketGeometry", description="Rendered organism from persistent shoot state")

    nodes = group.nodes
    links = group.links
    group_input = nodes.new("NodeGroupInput")
    group_input.label = "host"
    group_output = nodes.new("NodeGroupOutput")
    group_output.location = (1700, 0)

    local_module = build_local_shoot_module(group, body_material, areole_material, spine_material)

    # Initial state: exactly one apical shoot.  All later shoot points are
    # appended inside the Simulation Zone, never pre-created as hidden geometry.
    initial = nodes.new("GeometryNodePoints")
    initial.label = "INITIAL STATE: one apical meristem"
    initial.inputs["Count"].default_value = 1
    initial.inputs["Position"].default_value = (0.0, 0.0, 0.0)
    initial.inputs["Radius"].default_value = 0.04
    state = initial.outputs["Points"]
    state = store_attribute(nodes, links, state, "shoot_id", "INT", 0, label="state shoot id")
    state = store_attribute(nodes, links, state, "parent_id", "INT", -1, label="state parent id")
    state = store_attribute(nodes, links, state, "birth_frame", "INT", 1, label="state birth frame")
    state = store_attribute(nodes, links, state, "age", "FLOAT", 0.0, label="state age")
    state = store_attribute(nodes, links, state, "front", "FLOAT", 0.12, label="state meristem front")
    # Do not call this attribute ``radius``: that name is a built-in point
    # attribute in Blender and is not a safe persistent state field here.
    state = store_attribute(nodes, links, state, "shoot_radius", "FLOAT", 0.34, label="state hydrated radius")
    state = store_attribute(nodes, links, state, "height", "FLOAT", 2.85, label="state mature height")
    state = store_attribute(nodes, links, state, "growth_rate", "FLOAT", 0.34, label="state growth rate")
    state = store_attribute(nodes, links, state, "child_exists", "BOOLEAN", False, label="state child latch")
    state = store_attribute(nodes, links, state, "is_child", "BOOLEAN", False, label="state child flag")
    state = store_attribute(nodes, links, state, "axis", "FLOAT_VECTOR", (0.0, 1.0, 0.0), label="state shoot axis")

    sim_in = nodes.new("GeometryNodeSimulationInput")
    sim_in.label = "STATE INPUT: previous frame"
    sim_in.location = (-1050, -200)
    sim_out = nodes.new("GeometryNodeSimulationOutput")
    sim_out.label = "STATE OUTPUT: next frame"
    sim_out.location = (720, -200)
    sim_in.pair_with_output(sim_out)
    # The paired Simulation Zone already exposes a Geometry state item.  Use
    # that canonical state rather than introducing a second parallel geometry
    # socket; it is the state that Blender evaluates and caches per frame.
    links.new(state, sim_in.inputs["Geometry"])

    previous = sim_in.outputs["Geometry"]
    scene_time = nodes.new("GeometryNodeInputSceneTime")
    frame = scene_time.outputs["Frame"]
    child_exists = named_attribute(nodes, "child_exists", "BOOLEAN", "read child latch")
    is_child = named_attribute(nodes, "is_child", "BOOLEAN", "read child flag")
    shoot_id = named_attribute(nodes, "shoot_id", "INT", "read shoot id")
    parent_id = named_attribute(nodes, "parent_id", "INT", "read parent id")
    age = named_attribute(nodes, "age", "FLOAT", "read age")
    front = named_attribute(nodes, "front", "FLOAT", "read meristem front")
    radius = named_attribute(nodes, "shoot_radius", "FLOAT", "read shoot radius")
    height = named_attribute(nodes, "height", "FLOAT", "read mature height")
    growth_rate = named_attribute(nodes, "growth_rate", "FLOAT", "read growth rate")
    axis = named_attribute(nodes, "axis", "FLOAT_VECTOR", "read shoot axis")

    delta_growth = math_node(nodes, links, "MULTIPLY", sim_in.outputs["Delta Time"], growth_rate, "advance meristem front")
    front_next = math_node(nodes, links, "MINIMUM", 1.0, math_node(nodes, links, "ADD", front, delta_growth, "front integration"), "front clamp")
    age_next = math_node(nodes, links, "ADD", age, sim_in.outputs["Delta Time"], "age integration")

    # Event rule: one lateral shoot is initiated from the parent areole on
    # frame 72.  The latch makes the event idempotent across subsequent frames.
    not_child = bool_node(nodes, links, "NOT", is_child, label="parent candidate")
    not_latched = bool_node(nodes, links, "NOT", child_exists, label="unlatched parent")
    # Shader Math has no GREATER_EQUAL enum; 71.5 gives the inclusive frame-72
    # event for the integer-valued Scene Time frame output.
    after_event = math_node(nodes, links, "GREATER_THAN", frame, 71.5, "branch event threshold")
    born_now = bool_node(nodes, links, "AND", not_child, not_latched, label="eligible parent")
    born_now = bool_node(nodes, links, "AND", born_now, after_event, label="new child event")
    child_latch_next = bool_node(nodes, links, "OR", child_exists, born_now, label="latch child birth")

    updated = store_attribute(nodes, links, previous, "age", "FLOAT", age_next, label="advance age")
    updated = store_attribute(nodes, links, updated, "front", "FLOAT", front_next, label="advance meristem front")
    updated = store_attribute(nodes, links, updated, "child_exists", "BOOLEAN", child_latch_next, label="persist child latch")

    source = nodes.new("GeometryNodeSeparateGeometry")
    source.label = "parent areole selected exactly once"
    links.new(previous, source.inputs["Geometry"])
    links.new(born_now, source.inputs["Selection"])

    child_position = nodes.new("GeometryNodeSetPosition")
    child_position.label = "new meristem emerges inside parent rib field"
    links.new(source.outputs["Selection"], child_position.inputs["Geometry"])
    # The birth site is a real parent-areole coordinate, not an arbitrary
    # translation from the root of the shoot.  The parent state point is the
    # shoot origin; this offset selects a lower-middle areole in its local
    # frame before the child receives its own axis.
    birth_x = math_node(nodes, links, "MULTIPLY", radius, 0.60, "parent areole radial offset")
    birth_y = math_node(nodes, links, "MULTIPLY", height, 0.35, "parent areole axial offset")
    birth_offset = vector_node(nodes, links, birth_x, birth_y, 0.0, "parent areole birth coordinate")
    links.new(birth_offset, child_position.inputs["Offset"])
    child = child_position.outputs["Geometry"]
    child = store_attribute(nodes, links, child, "shoot_id", "INT", 1, label="new child id")
    child = store_attribute(nodes, links, child, "parent_id", "INT", shoot_id, label="new child parent id")
    child = store_attribute(nodes, links, child, "birth_frame", "INT", frame, label="new child birth frame")
    child = store_attribute(nodes, links, child, "age", "FLOAT", 0.0, label="new child age")
    child = store_attribute(nodes, links, child, "front", "FLOAT", 0.035, label="new child meristem front")
    child = store_attribute(nodes, links, child, "shoot_radius", "FLOAT", 0.19, label="new child radius")
    child = store_attribute(nodes, links, child, "height", "FLOAT", 1.65, label="new child mature height")
    child = store_attribute(nodes, links, child, "growth_rate", "FLOAT", 0.28, label="new child growth rate")
    child = store_attribute(nodes, links, child, "child_exists", "BOOLEAN", False, label="new child latch")
    child = store_attribute(nodes, links, child, "is_child", "BOOLEAN", True, label="new child flag")
    child = store_attribute(nodes, links, child, "axis", "FLOAT_VECTOR", (0.42, 0.91, 0.0), label="new child axis")

    join_state = nodes.new("GeometryNodeJoinGeometry")
    join_state.label = "append child to persistent shoot state"
    links.new(updated, join_state.inputs["Geometry"])
    links.new(child, join_state.inputs["Geometry"])
    links.new(join_state.outputs["Geometry"], sim_out.inputs["Geometry"])

    # Render from the output state.  The only geometry duplicated per shoot is
    # an instance reference to the local organism module.
    align = nodes.new("FunctionNodeAlignEulerToVector")
    align.label = "state axis -> module orientation"
    align.axis = "Y"
    links.new(axis, align.inputs["Vector"])
    shoot_instances = nodes.new("GeometryNodeInstanceOnPoints")
    shoot_instances.label = "one modular organism per persistent shoot"
    links.new(sim_out.outputs["Geometry"], shoot_instances.inputs["Points"])
    links.new(local_module, shoot_instances.inputs["Instance"])
    links.new(align.outputs["Rotation"], shoot_instances.inputs["Rotation"])
    size_y = math_node(nodes, links, "MULTIPLY", height, front, "visible shoot length from meristem front")
    scale = vector_node(nodes, links, radius, size_y, radius, "state-controlled module scale")
    scale_instances = nodes.new("GeometryNodeScaleInstances")
    scale_instances.label = "growth is state scale of an instantiated module"
    links.new(shoot_instances.outputs["Instances"], scale_instances.inputs["Instances"])
    links.new(scale, scale_instances.inputs["Scale"])

    # Keep instances through the generative part of the tree.  Realize only at
    # the final presentation/export boundary so the modifier itself remains a
    # state-driven modular system while Blender's object output exposes a
    # concrete mesh for render/export validation.
    final_realize = nodes.new("GeometryNodeRealizeInstances")
    final_realize.label = "FINAL BOUNDARY ONLY: realize for render/export"
    links.new(scale_instances.outputs["Instances"], final_realize.inputs["Geometry"])
    links.new(final_realize.outputs["Geometry"], group_output.inputs["Geometry"])

    # Layout for inspection in Blender.
    for node in nodes:
        if node.location == (0.0, 0.0):
            node.location = (0.0, 0.0)
    sim_in.width = 220
    sim_out.width = 220
    group_input.location = (-1300, 600)
    group_output.location = (1050, 250)
    return group


def make_host(group):
    mesh = bpy.data.meshes.new("WACHUMA_GrowthSimulation_HostMesh")
    mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    mesh.update()
    host = bpy.data.objects.new("WACHUMA_Pachanoi_GenerativeGrowth", mesh)
    bpy.context.collection.objects.link(host)
    modifier = host.modifiers.new("Pachanoi stateful Geometry Nodes 4.5", "NODES")
    modifier.node_group = group
    host["generator"] = "Geometry Nodes 4.5 Simulation Zone"
    host["growth_model"] = "persistent shoot state -> modular rib/areole/spine instances"
    host["state_attributes"] = "shoot_id,parent_id,birth_frame,age,front,shoot_radius,height,growth_rate,child_exists,is_child,axis"
    host["branch_event"] = "frame >= 72; one idempotent child born from parent state"
    return host


def make_floor_and_camera():
    floor_mesh = bpy.data.meshes.new("WACHUMA_GrowthFloorMesh")
    floor_mesh.from_pydata([(-4, 0, -4), (4, 0, -4), (4, 0, 4), (-4, 0, 4)], [], [(0, 1, 2, 3)])
    floor_mesh.update()
    floor = bpy.data.objects.new("Growth floor", floor_mesh)
    bpy.context.collection.objects.link(floor)
    floor.data.materials.append(make_material("Floor", (0.025, 0.035, 0.030), 0.9))

    camera_data = bpy.data.cameras.new("Growth camera")
    camera = bpy.data.objects.new("Growth camera", camera_data)
    bpy.context.collection.objects.link(camera)
    # The developmental axis is world Y.  Keep the camera at mid-height
    # rather than above the specimen; otherwise a vertical shoot projects as
    # a diagonal slab and hides the apical/branch relation.
    camera.location = (5.2, 1.45, 5.2)
    camera_data.lens = 64
    target = (0.0, 1.55, 0.0)
    direction = bpy.mathutils.Vector(target) - camera.location if hasattr(bpy, "mathutils") else None
    # Avoid depending on bpy.mathutils being re-exported on all builds.
    from mathutils import Vector

    direction = Vector(target) - camera.location
    # Blender's camera convention uses local Y as the screen-up axis while
    # the scene remains Z-up internally.  With the organism's developmental
    # axis chosen as world Y, the stable side-view quaternion is made with Z
    # as the secondary track axis; using Y here rolls the camera 90 degrees.
    camera.rotation_euler = direction.to_track_quat("-Z", "Z").to_euler()
    bpy.context.scene.camera = camera

    light_data = bpy.data.lights.new("Key", "AREA")
    light_data.energy = 900
    light_data.shape = "DISK"
    light_data.size = 4.0
    key = bpy.data.objects.new("Key", light_data)
    bpy.context.collection.objects.link(key)
    key.location = (3.0, 5.0, 4.0)
    key.rotation_euler = (math.radians(25), 0.0, math.radians(35))

    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 350
    fill_data.size = 3.0
    fill = bpy.data.objects.new("Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (-3.0, 2.0, 1.5)
    fill.rotation_euler = (math.radians(70), 0.0, math.radians(-55))


def configure_scene():
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 180
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.012, 0.018, 0.016)
    scene.render.fps = 24


def render_checkpoints():
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    checkpoints = {1, 60, 71, 72, 85, 120, 180}
    # Simulation Zones are causal state machines.  Always advance from the
    # initialization frame in order; jumping directly to frame 180 would make
    # Blender initialize the state at 180 and would invalidate this test.
    scene.frame_set(1)
    bpy.context.view_layer.update()
    for frame in range(1, scene.frame_end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        if frame in checkpoints:
            scene.render.filepath = str(RENDER_DIR / f"frame-{frame:03d}.png")
            bpy.ops.render.render(write_still=True)


def main():
    PROJECT_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    body = make_material("Pachanoi epidermis", (0.16, 0.37, 0.20), 0.78)
    areole = make_material("Areole", (0.70, 0.62, 0.40), 0.9)
    spine = make_material("Spines", (0.82, 0.68, 0.36), 0.55)
    group = build_group((body, areole, spine))
    host = make_host(group)
    make_floor_and_camera()
    configure_scene()
    scene = bpy.context.scene
    scene.frame_set(1)
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT_PATH))
    render_checkpoints()
    # Open the editable project at the causal beginning, not at a frame that
    # would cause a fresh Simulation Zone to initialize after the birth event.
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(PROJECT_PATH))
    print(f"GENERATED {PROJECT_PATH}")
    print(f"RENDERS {RENDER_DIR}")


if __name__ == "__main__":
    main()
