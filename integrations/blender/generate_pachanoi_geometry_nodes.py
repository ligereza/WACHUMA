#!/usr/bin/env python3
"""Generate the editable WACHUMA Pachanoi Geometry Nodes project.

The source of the model is the rib module, not a radial displacement field:

    M_i(s,u) = rotate_y(i * 2*pi/n) M_0(s,u)

where ``u`` is the material coordinate across one rib and ``s`` is the
longitudinal material coordinate. The grid is only a parameter domain; the
Geometry Nodes tree creates the surface, areole lattice, spines and optional
lateral shoot. The SVG is deliberately not read here. It is a visual
reference for the inner rib texture, not a growth timeline or authority for
the plant's biology.

Blender 4.5.x:

    blender --background --python generate_pachanoi_geometry_nodes.py -- \
      --out ../../apps/web/public/models/pachanoi-geometry-nodes-development.glb \
      --blend-out projects/wachuma-pachanoi-geometry-nodes.blend

The GLB is a baked interchange representation. The .blend is the editable
source of truth because glTF does not carry Blender's Geometry Nodes graph.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy


TAU = math.tau
BLENDER_RUNTIME = "Blender 4.5.4 Geometry Nodes"
GENERATOR_VERSION = "0.3.4-cyclic-body-closure"


def is_socket(value):
    return isinstance(value, bpy.types.NodeSocket)


def math_field(nodes, links, operation, first=None, second=None, label=""):
    # Many one-input calls use the compact ``math_field(..., value, label)``
    # form. Treat a textual second argument as the label rather than trying
    # to put it into a numeric socket.
    if isinstance(second, str) and not label:
        label, second = second, None
    node = nodes.new("ShaderNodeMath")
    node.operation = operation
    node.label = label
    if first is not None:
        if is_socket(first):
            links.new(first, node.inputs[0])
        else:
            node.inputs[0].default_value = first
    if second is not None:
        if is_socket(second):
            links.new(second, node.inputs[1])
        else:
            node.inputs[1].default_value = second
    return node.outputs[0]


def clamp_field(nodes, links, value, low=0.0, high=1.0, label="clamp"):
    bounded_high = math_field(nodes, links, "MINIMUM", value, high, label + " high")
    return math_field(nodes, links, "MAXIMUM", bounded_high, low, label + " low")


def smoothstep_field(nodes, links, value, label="smoothstep"):
    t = clamp_field(nodes, links, value, 0.0, 1.0, label + " clamp")
    t2 = math_field(nodes, links, "MULTIPLY", t, t, label + " square")
    two_t = math_field(nodes, links, "MULTIPLY", 2.0, t, label + " two t")
    cubic = math_field(nodes, links, "SUBTRACT", 3.0, two_t, label + " cubic")
    return math_field(nodes, links, "MULTIPLY", t2, cubic, label + " result")


def vector_field(nodes, links, x, y, z, label="vector"):
    node = nodes.new("ShaderNodeCombineXYZ")
    node.label = label
    for name, value in (("X", x), ("Y", y), ("Z", z)):
        if is_socket(value):
            links.new(value, node.inputs[name])
        else:
            node.inputs[name].default_value = value
    return node.outputs["Vector"]


def add_input(group, name, socket_type, default, description, min_value=None, max_value=None):
    item = group.interface.new_socket(
        name=name,
        in_out="INPUT",
        socket_type=socket_type,
        description=description,
    )
    if hasattr(item, "default_value") and default is not None:
        item.default_value = default
    if min_value is not None and hasattr(item, "min_value"):
        item.min_value = min_value
    if max_value is not None and hasattr(item, "max_value"):
        item.max_value = max_value
    return item


def add_output(group):
    return group.interface.new_socket(
        name="Geometry",
        in_out="OUTPUT",
        socket_type="NodeSocketGeometry",
    )


def interface_identifier(group, name):
    for item in group.interface.items_tree:
        if (
            getattr(item, "item_type", None) == "SOCKET"
            and item.in_out == "INPUT"
            and item.name == name
        ):
            return item.identifier
    raise KeyError(name)


def set_modifier_input(modifier, group, name, value):
    modifier[interface_identifier(group, name)] = value


def create_material(name, color, roughness=0.86):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (*color, 1.0)
        principled.inputs["Roughness"].default_value = roughness
    return material


def create_interior_texture_material():
    """Create the SVG-inspired inner-rib material procedurally.

    The SVG supplies the visual palette (light central pulp, intermediate pulp
    and darker outer pulp), but the shader is generated in Blender so it
    remains usable on the instanced rib modules and does not pretend that a 2D
    cross-section is an unwrap of the stem.
    """
    material = bpy.data.materials.new("WACHUMA rib interior texture")
    material.diffuse_color = (0.16, 0.36, 0.18, 1.0)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (520, 0)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (260, 0)
    shader.inputs["Roughness"].default_value = 0.88
    geometry = nodes.new("ShaderNodeNewGeometry")
    geometry.location = (-900, 180)
    separate = nodes.new("ShaderNodeSeparateXYZ")
    separate.location = (-700, 180)
    links.new(geometry.outputs["Position"], separate.inputs["Vector"])
    radial_vector = nodes.new("ShaderNodeCombineXYZ")
    radial_vector.location = (-520, 220)
    links.new(separate.outputs["X"], radial_vector.inputs["X"])
    links.new(separate.outputs["Z"], radial_vector.inputs["Z"])
    radial_length = nodes.new("ShaderNodeVectorMath")
    radial_length.operation = "LENGTH"
    radial_length.location = (-320, 220)
    links.new(radial_vector.outputs["Vector"], radial_length.inputs[0])
    core_attribute = nodes.new("ShaderNodeAttribute")
    core_attribute.attribute_name = "wachuma_pulp_core_radius"
    core_attribute.location = (-520, 20)
    core_default = nodes.new("ShaderNodeValue")
    core_default.outputs[0].default_value = 0.001
    core_default.location = (-520, -80)
    # A named attribute is supplied by Geometry Nodes. The fallback keeps the
    # material readable if the mesh is opened outside the generated graph.
    core_radius = nodes.new("ShaderNodeMath")
    core_radius.operation = "MAXIMUM"
    core_radius.location = (-100, 120)
    links.new(core_attribute.outputs["Fac"], core_radius.inputs[0])
    links.new(core_default.outputs[0], core_radius.inputs[1])
    normalized_radius = nodes.new("ShaderNodeMath")
    normalized_radius.operation = "DIVIDE"
    normalized_radius.location = (80, 220)
    links.new(radial_length.outputs["Value"], normalized_radius.inputs[0])
    links.new(core_radius.outputs[0], normalized_radius.inputs[1])
    normalized_clamp = nodes.new("ShaderNodeClamp")
    normalized_clamp.location = (250, 220)
    links.new(normalized_radius.outputs[0], normalized_clamp.inputs[0])
    normalized_clamp.inputs[1].default_value = 0.0
    normalized_clamp.inputs[2].default_value = 1.0
    pulp_ramp = nodes.new("ShaderNodeValToRGB")
    pulp_ramp.location = (420, 180)
    pulp_ramp.color_ramp.elements[0].position = 0.0
    pulp_ramp.color_ramp.elements[0].color = (0.42, 0.68, 0.28, 1.0)
    pulp_ramp.color_ramp.elements[1].position = 1.0
    pulp_ramp.color_ramp.elements[1].color = (0.035, 0.14, 0.055, 1.0)
    pulp_middle = pulp_ramp.color_ramp.elements.new(0.48)
    pulp_middle.color = (0.12, 0.36, 0.14, 1.0)
    links.new(normalized_clamp.outputs[0], pulp_ramp.inputs["Fac"])
    contrast_attribute = nodes.new("ShaderNodeAttribute")
    contrast_attribute.attribute_name = "wachuma_pulp_contrast"
    contrast_attribute.location = (420, -30)
    contrast_default = nodes.new("ShaderNodeValue")
    contrast_default.outputs[0].default_value = 0.001
    contrast_default.location = (420, -120)
    contrast = nodes.new("ShaderNodeMath")
    contrast.operation = "MAXIMUM"
    contrast.location = (600, 20)
    links.new(contrast_attribute.outputs["Fac"], contrast.inputs[0])
    links.new(contrast_default.outputs[0], contrast.inputs[1])
    mix_pulp = nodes.new("ShaderNodeMixRGB")
    mix_pulp.blend_type = "MIX"
    mix_pulp.location = (620, 180)
    links.new(contrast.outputs[0], mix_pulp.inputs[0])
    mix_pulp.inputs[1].default_value = (0.10, 0.30, 0.16, 1.0)
    links.new(pulp_ramp.outputs["Color"], mix_pulp.inputs[2])
    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-500, 40)
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 7.0
    noise.inputs["Detail"].default_value = 3.0
    noise.inputs["Roughness"].default_value = 0.58
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (-220, 90)
    ramp.color_ramp.elements[0].position = 0.22
    ramp.color_ramp.elements[0].color = (0.018, 0.08, 0.05, 1.0)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (0.18, 0.38, 0.18, 1.0)
    middle = ramp.color_ramp.elements.new(0.52)
    middle.color = (0.06, 0.20, 0.11, 1.0)
    bump = nodes.new("ShaderNodeBump")
    bump.location = (-30, -130)
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.022
    texcoord = nodes.new("ShaderNodeTexCoord")
    texcoord.location = (-720, -280)
    links.new(texcoord.outputs["Generated"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    # The SVG-like radial pulp gradient is the primary color; the low-amplitude
    # procedural noise remains only as a subtle surface variation.
    links.new(mix_pulp.outputs["Color"], shader.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def build_point_fields(nodes, links, u, s, params, label):
    """Create the approved TSX rib equations as Geometry Nodes fields.

    ``u`` is the transverse material coordinate of one rib. The caller
    supplies the angular rib offset through ``params['rib_phase']`` so the
    same point equation is reused for the body, areoles and branch parent.
    """

    n = params["rib_count"]
    height = params["height"]
    development = clamp_field(nodes, links, params["development"], 0.0, 1.0, label + " development")
    hydration = clamp_field(nodes, links, params["hydration"], -1.0, 1.0, label + " hydration")
    delta = math_field(nodes, links, "DIVIDE", TAU, n, label + " rib delta")
    age_gain = math_field(nodes, links, "MULTIPLY", 0.78, development, label + " age gain")
    height_age = math_field(nodes, links, "ADD", 0.22, age_gain, label + " height age")
    shoot_height = math_field(nodes, links, "MULTIPLY", height, height_age, label + " apical height")
    hydration_gain = math_field(nodes, links, "MULTIPLY", 0.115, hydration, label + " hydration gain")
    hydrated_factor = math_field(nodes, links, "ADD", 1.0, hydration_gain, label + " hydrated radius")
    base_radius = math_field(nodes, links, "MULTIPLY", params["radius"], hydrated_factor, label + " base radius")

    cap_extra = math_field(nodes, links, "MULTIPLY", 1.30, params["apical_fraction"], label + " cap fraction")
    cap_factor = math_field(nodes, links, "ADD", 0.82, cap_extra, label + " cap factor")
    cap_height = math_field(nodes, links, "MULTIPLY", base_radius, cap_factor, label + " meristem height")
    cap_ratio = math_field(nodes, links, "DIVIDE", cap_height, shoot_height, label + " cap ratio")
    apex_raw = math_field(nodes, links, "SUBTRACT", 1.0, cap_ratio, label + " apex start")
    apex_start = clamp_field(nodes, links, apex_raw, 0.68, 0.94, label + " apex domain")
    apex_span = math_field(nodes, links, "SUBTRACT", 1.0, apex_start, label + " apex span")
    apex_coordinate = math_field(nodes, links, "SUBTRACT", s, apex_start, label + " apex coordinate")
    t_raw = math_field(nodes, links, "DIVIDE", apex_coordinate, apex_span, label + " apex parameter")
    t = clamp_field(nodes, links, t_raw, 0.0, 1.0, label + " apex clamp")
    apex_angle = math_field(nodes, links, "MULTIPLY", math.pi / 2.0, t, label + " apex angle")
    taper = math_field(nodes, links, "COSINE", apex_angle, label + " radial taper")
    body_breath_power = math_field(nodes, links, "POWER", s, 4.0, label + " body breath power")
    body_breath_amount = math_field(nodes, links, "MULTIPLY", 0.028, body_breath_power, label + " body breath amount")
    body_draft_amount = math_field(nodes, links, "MULTIPLY", 0.028, s, label + " apical body draft amount")
    body_breath_base = math_field(nodes, links, "SUBTRACT", 1.0, body_breath_amount, label + " body breath")
    body_draft = math_field(nodes, links, "SUBTRACT", 1.0, body_draft_amount, label + " apical body draft")
    body_breath = math_field(nodes, links, "MULTIPLY", body_breath_base, body_draft, label + " body envelope")
    valley_envelope = math_field(nodes, links, "MULTIPLY", body_breath, taper, label + " valley envelope")
    valley_radius = math_field(nodes, links, "MULTIPLY", base_radius, valley_envelope, label + " valley radius")
    # Do not erase the rib relief too early. Real Pachanoi ribs remain legible
    # inside the finite apical meristem and only merge at its terminal point.
    # The residual factor is the explicit "rib memory" of the meristem.
    taper_memory = math_field(nodes, links, "POWER", taper, 0.90, label + " apical rib memory power")
    memory_complement = math_field(nodes, links, "SUBTRACT", 1.0, params["apical_rib_memory"], label + " apical memory complement")
    taper_memory_bias = math_field(nodes, links, "ADD", params["apical_rib_memory"], math_field(nodes, links, "MULTIPLY", memory_complement, taper_memory, label + " apical rib memory gain"), label + " apical rib memory")
    rib_envelope = math_field(nodes, links, "MULTIPLY", body_breath, math_field(nodes, links, "MULTIPLY", taper, taper_memory_bias, label + " rib envelope taper"), label + " rib envelope")
    ridge_relief = math_field(nodes, links, "MULTIPLY", params["rib_relief"], rib_envelope, label + " rib relief")

    # This is the finite sum of the compact areole growth kernels from the
    # TSX model. Geometry Nodes has no general loop node, so the fixed eight
    # rows are expanded explicitly. It is not a global noise displacement.
    growth = 0.0
    notch = 0.0
    for row in range(8):
        birth_time = (row + 1) / 8.0
        age_numerator = math_field(nodes, links, "SUBTRACT", development, birth_time, f"{label} birth {row}")
        age_denominator = 1.0 - birth_time
        age_raw = math_field(nodes, links, "DIVIDE", age_numerator, age_denominator, f"{label} age {row}")
        age = clamp_field(nodes, links, age_raw, 0.0, 1.0, f"{label} age clamp {row}")
        advection = math_field(nodes, links, "POWER", age, 1.65, f"{label} advection {row}")
        advection_range = math_field(nodes, links, "MULTIPLY", 0.862, advection, f"{label} advection range {row}")
        node_s = math_field(nodes, links, "SUBTRACT", 0.972, advection_range, f"{label} node position {row}")
        activity_lead = math_field(nodes, links, "ADD", age_numerator, 0.18, f"{label} activity lead {row}")
        activity_scale = math_field(nodes, links, "DIVIDE", activity_lead, 0.28, f"{label} activity scale {row}")
        activity = smoothstep_field(nodes, links, activity_scale, f"{label} activity {row}")

        def compact_kernel(center, width, suffix):
            offset = math_field(nodes, links, "SUBTRACT", s, center, f"{label} kernel offset {suffix}")
            normalized = math_field(nodes, links, "DIVIDE", offset, width, f"{label} kernel coordinate {suffix}")
            square = math_field(nodes, links, "POWER", normalized, 2.0, f"{label} kernel square {suffix}")
            support = math_field(nodes, links, "MAXIMUM", math_field(nodes, links, "SUBTRACT", 1.0, square, f"{label} kernel one-minus {suffix}"), 0.0, f"{label} compact support {suffix}")
            return math_field(nodes, links, "POWER", support, 3.0, f"{label} C2 kernel {suffix}")

        growth_pulse = math_field(nodes, links, "MULTIPLY", activity, compact_kernel(node_s, 0.068, f"growth-{row}"), f"{label} growth pulse {row}")
        growth = math_field(nodes, links, "ADD", growth, growth_pulse, f"{label} growth sum {row}")
        notch_center = math_field(nodes, links, "ADD", node_s, 0.028, f"{label} notch center {row}")
        notch_pulse = math_field(nodes, links, "MULTIPLY", activity, compact_kernel(notch_center, 0.052, f"notch-{row}"), f"{label} notch pulse {row}")
        notch = math_field(nodes, links, "ADD", notch, notch_pulse, f"{label} notch sum {row}")

    node_taper = math_field(nodes, links, "POWER", taper, 2.0, label + " node taper")
    node_age_envelope = math_field(nodes, links, "MULTIPLY", development, node_taper, label + " node age envelope")
    node_envelope = math_field(nodes, links, "MULTIPLY", params["node_scale"], node_age_envelope, label + " node envelope")
    growth_term = math_field(nodes, links, "MULTIPLY", growth, node_envelope, label + " growth term")
    notch_term = math_field(nodes, links, "MULTIPLY", notch, node_envelope, label + " notch term")

    # The cross-section is a periodic crest/valley law, not a tube plus a
    # radial bump. u=-1 and u=1 are the same valley; u=0 is the rounded crest.
    # alpha is retained in the apical meristem so ribs remain recognizable
    # until their common terminal point.
    profile_angle = math_field(nodes, links, "MULTIPLY", math.pi, u, label + " rib profile angle")
    profile_cosine = math_field(nodes, links, "COSINE", profile_angle, label + " crest valley cosine")
    ridge_shape = math_field(nodes, links, "MULTIPLY", 0.5, math_field(nodes, links, "ADD", 1.0, profile_cosine, label + " ridge shape sum"), label + " normalized ridge shape")
    alpha = math_field(nodes, links, "MULTIPLY", params["rib_relief"], taper_memory_bias, label + " rib contrast")
    profile_contrast = math_field(nodes, links, "MULTIPLY", alpha, profile_cosine, label + " rib profile contrast")
    profile_factor = math_field(nodes, links, "ADD", 1.0, profile_contrast, label + " periodic rib profile")
    # Roundness acts on the inner valley walls, not by erasing the ribs. At a
    # crest (cos=1) the correction is zero; at a valley (cos=-1) it lifts the
    # floor progressively. This preserves the modular tracks while replacing
    # the overly angular W profile with a softer ~ profile.
    inner_roundness = clamp_field(nodes, links, params["inner_rib_roundness"], 0.0, 1.0, label + " inner rib roundness")
    valley_gap = math_field(nodes, links, "SUBTRACT", 1.0, profile_cosine, label + " inner valley gap")
    valley_lift = math_field(nodes, links, "MULTIPLY", 0.18, inner_roundness, label + " inner valley lift scale")
    valley_lift = math_field(nodes, links, "MULTIPLY", valley_lift, alpha, label + " inner valley lift contrast")
    valley_lift = math_field(nodes, links, "MULTIPLY", valley_lift, valley_gap, label + " inner valley lift")
    profile_factor = math_field(nodes, links, "ADD", profile_factor, valley_lift, label + " rounded inner profile")
    swelling = math_field(nodes, links, "MULTIPLY", 0.045, growth_term, label + " nodal swelling")
    nodal_notch = math_field(nodes, links, "MULTIPLY", -0.021, notch_term, label + " nodal notch")
    nodal_correction = math_field(nodes, links, "ADD", swelling, nodal_notch, label + " nodal radial correction")
    nodal_radius = math_field(nodes, links, "MULTIPLY", base_radius, math_field(nodes, links, "MULTIPLY", nodal_correction, ridge_shape, label + " nodal radial module"), label + " nodal radial amount")
    periodic_radius = math_field(nodes, links, "MULTIPLY", valley_radius, profile_factor, label + " periodic crest valley radius")
    rho = math_field(nodes, links, "ADD", periodic_radius, nodal_radius, label + " material radius")

    drift_radians = math_field(nodes, links, "MULTIPLY", params["phase_drift_degrees"], math.pi / 180.0, label + " drift radians")
    phase_drift = math_field(nodes, links, "MULTIPLY", drift_radians, s, label + " phase drift")
    phase = math_field(nodes, links, "ADD", params["rib_phase"], phase_drift, label + " longitudinal phase")
    half_u = math_field(nodes, links, "DIVIDE", u, 2.0, label + " half rib coordinate")
    half_angle = math_field(nodes, links, "MULTIPLY", half_u, delta, label + " half rib angle")
    theta = math_field(nodes, links, "ADD", phase, half_angle, label + " material angle")
    cos_theta = math_field(nodes, links, "COSINE", theta, label + " radial x direction")
    sin_theta = math_field(nodes, links, "SINE", theta, label + " radial z direction")
    x = math_field(nodes, links, "MULTIPLY", rho, cos_theta, label + " point x")
    z = math_field(nodes, links, "MULTIPLY", rho, math_field(nodes, links, "MULTIPLY", -1.0, sin_theta, label + " signed z direction"), label + " point z")

    body_y = math_field(nodes, links, "MULTIPLY", shoot_height, s, label + " body y")
    body_top = math_field(nodes, links, "MULTIPLY", shoot_height, apex_start, label + " body top")
    meristem_height = math_field(nodes, links, "MULTIPLY", cap_height, math_field(nodes, links, "SINE", apex_angle, label + " meristem height envelope"), label + " meristem height")
    cap_y = math_field(nodes, links, "ADD", body_top, meristem_height, label + " meristem y")
    meristem_mask_coordinate = math_field(nodes, links, "SUBTRACT", s, apex_start, label + " meristem mask coordinate")
    meristem_mask = math_field(nodes, links, "GREATER_THAN", meristem_mask_coordinate, 0.0, label + " meristem mask")
    meristem_delta = math_field(nodes, links, "SUBTRACT", cap_y, body_y, label + " meristem y delta")
    y_shift = math_field(nodes, links, "MULTIPLY", meristem_delta, meristem_mask, label + " meristem y shift")
    ridge_lift_wave = math_field(nodes, links, "SINE", math_field(nodes, links, "MULTIPLY", math.pi, t, label + " ridge lift angle"), label + " ridge lift wave")
    ridge_lift = math_field(nodes, links, "MULTIPLY", math_field(nodes, links, "MULTIPLY", cap_height, params["apical_lobe_lift"], label + " ridge lift scale"), math_field(nodes, links, "POWER", ridge_lift_wave, 2.0, label + " ridge lift envelope"), label + " ridge lift")
    nodal_y_correction = math_field(nodes, links, "ADD", math_field(nodes, links, "MULTIPLY", 0.008, growth_term, label + " nodal y swelling"), math_field(nodes, links, "MULTIPLY", -0.0025, notch_term, label + " nodal y notch"), label + " nodal y correction")
    nodal_y_module = math_field(nodes, links, "MULTIPLY", ridge_shape, nodal_y_correction, label + " nodal y module")
    nodal_y = math_field(nodes, links, "MULTIPLY", shoot_height, nodal_y_module, label + " nodal y amount")
    module_y = math_field(nodes, links, "ADD", math_field(nodes, links, "MULTIPLY", ridge_lift, ridge_shape, label + " rib lift module"), nodal_y, label + " module y")
    y = math_field(nodes, links, "ADD", math_field(nodes, links, "ADD", body_y, y_shift, label + " continuous meristem y"), module_y, label + " point y")
    radial = vector_field(
        nodes,
        links,
        cos_theta,
        0.0,
        math_field(nodes, links, "MULTIPLY", -1.0, sin_theta, label + " outward signed z"),
        label + " outward normal",
    )
    return {
        "position": vector_field(nodes, links, x, y, z, label + " point"),
        "theta": theta,
        "radial": radial,
        "activity": 1.0,
    }


def make_host_mesh():
    mesh = bpy.data.meshes.new("WACHUMA_GN_parameter_domain")
    mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    mesh.update()
    return mesh


def build_geometry_nodes(body_material, interior_material, areole_material, spine_material):
    group = bpy.data.node_groups.new("WACHUMA_Pachanoi_Modular_GeometryNodes_45", "GeometryNodeTree")
    add_input(group, "Geometry", "NodeSocketGeometry", None, "Unused host domain; all geometry is generated by this tree")
    add_input(group, "Development", "NodeSocketFloat", 0.76, "Apical developmental age; elongation is applied from the meristem", 0.0, 1.0)
    add_input(group, "Hydration", "NodeSocketFloat", 0.0, "Radial expansion proxy for tissue hydration", -1.0, 1.0)
    add_input(group, "Mature Height", "NodeSocketFloat", 2.6, "Mature shoot height", 0.1, 20.0)
    add_input(group, "Radius", "NodeSocketFloat", 0.34, "Mean hydrated valley radius", 0.02, 5.0)
    add_input(group, "Rib Count", "NodeSocketInt", 7, "Persistent modular rib count", 4, 12)
    add_input(group, "Rib Relief", "NodeSocketFloat", 0.28, "Reference transverse material relief", 0.0, 2.0)
    add_input(group, "Inner Rib Roundness", "NodeSocketFloat", 0.35, "Lift the inner valleys so the rib section is soft ~~~~~ rather than W-shaped", 0.0, 1.0)
    # Put a valley, not a ridge, on the presentation meridian. The phase is
    # a view/reference convention; it does not alter the n-fold geometry.
    add_input(group, "Rib Phase", "NodeSocketFloat", -math.pi / 2.0 + math.pi / 7.0, "Angular phase of the rib module")
    add_input(group, "Phase Drift (deg)", "NodeSocketFloat", 0.0, "Longitudinal phase drift", -180.0, 180.0)
    add_input(group, "Apical Fraction", "NodeSocketFloat", 0.32, "Finite meristem domain scale", 0.05, 1.0)
    add_input(group, "Apical Rib Memory", "NodeSocketFloat", 0.30, "Residual rib relief retained until the meristem closes", 0.0, 0.6)
    add_input(group, "Apical Lobe Lift", "NodeSocketFloat", 0.24, "C2 ridge-height separation inside the finite meristem", 0.0, 0.8)
    add_input(group, "Node Scale", "NodeSocketFloat", 1.0, "Local C2 areole growth kernels", 0.0, 3.0)
    add_input(group, "Parastichy Step", "NodeSocketInt", 2, "Integer rib step; use gcd(step,n)=1 for one cycle", 1, 11)
    add_input(group, "Areole Rows", "NodeSocketInt", 8, "Rows used for the repeated areole lattice", 1, 16)
    add_input(group, "Areole Stagger", "NodeSocketFloat", 0.0, "Optional residual longitudinal perturbation; zero preserves the measured regular lattice", 0.0, 0.08)
    add_input(group, "Pulp Core Radius", "NodeSocketFloat", 0.46, "Radius of the light central pulp ring from the SVG palette", 0.18, 0.90)
    add_input(group, "Pulp Contrast", "NodeSocketFloat", 0.78, "Blend between light central pulp and darker outer pulp", 0.0, 1.0)
    add_input(group, "Spine Length", "NodeSocketFloat", 0.140, "Base spine length", 0.0, 0.4)
    add_input(group, "Spine Bend", "NodeSocketFloat", 0.006, "Small local Bézier bend of each spine", -0.1, 0.1)
    add_input(group, "Spine Radius", "NodeSocketFloat", 0.0026, "Radius of the fine spine curve profile", 0.0005, 0.02)
    add_input(group, "Spine Scale", "NodeSocketFloat", 1.0, "Global multiplier for the seven-spine areole fan", 0.0, 2.0)
    add_input(group, "Branch Development", "NodeSocketFloat", 0.0, "Optional lateral shoot emergence from one areole", 0.0, 1.0)
    add_output(group)

    nodes = group.nodes
    links = group.links
    group_input = nodes.new("NodeGroupInput")
    group_input.label = "WACHUMA developmental controls"
    group_input.location = (-1800, 500)
    group_output = nodes.new("NodeGroupOutput")
    group_output.location = (1450, 200)
    params = {
        "height": group_input.outputs["Mature Height"],
        "development": group_input.outputs["Development"],
        "hydration": group_input.outputs["Hydration"],
        "radius": group_input.outputs["Radius"],
        "rib_count": group_input.outputs["Rib Count"],
        "rib_relief": group_input.outputs["Rib Relief"],
        "inner_rib_roundness": group_input.outputs["Inner Rib Roundness"],
        "rib_phase": group_input.outputs["Rib Phase"],
        "phase_drift_degrees": group_input.outputs["Phase Drift (deg)"],
        "apical_fraction": group_input.outputs["Apical Fraction"],
        "apical_rib_memory": group_input.outputs["Apical Rib Memory"],
        "apical_lobe_lift": group_input.outputs["Apical Lobe Lift"],
        "node_scale": group_input.outputs["Node Scale"],
    }

    grid = nodes.new("GeometryNodeMeshGrid")
    grid.label = "RIB MODULE DOMAIN: u x s"
    grid.location = (-1400, 760)
    grid.inputs["Size X"].default_value = 2.0
    grid.inputs["Size Y"].default_value = 1.0
    grid.inputs["Vertices X"].default_value = 25
    grid.inputs["Vertices Y"].default_value = 97
    module_position = nodes.new("GeometryNodeInputPosition")
    module_separate = nodes.new("ShaderNodeSeparateXYZ")
    links.new(module_position.outputs["Position"], module_separate.inputs["Vector"])
    u = module_separate.outputs["X"]
    s = math_field(nodes, links, "ADD", module_separate.outputs["Y"], 0.5, "module longitudinal s")
    module_fields = build_point_fields(nodes, links, u, s, params, "RIB MODULE")
    module_set = nodes.new("GeometryNodeSetPosition")
    module_set.label = "M_i(s,u): one persistent rib"
    module_set.location = (-450, 760)
    links.new(grid.outputs["Mesh"], module_set.inputs["Geometry"])
    links.new(module_fields["position"], module_set.inputs["Position"])
    module_u_abs = math_field(nodes, links, "ABSOLUTE", u, "rib interior coordinate")
    interior_selection = math_field(nodes, links, "LESS_THAN", module_u_abs, 0.68, "SVG-inspired inner rib band")
    module_body_set = nodes.new("GeometryNodeSetMaterial")
    module_body_set.label = "base epidermis material"
    module_body_set.location = (-330, 760)
    module_body_set.inputs["Material"].default_value = body_material
    links.new(module_set.outputs["Geometry"], module_body_set.inputs["Geometry"])
    module_interior_set = nodes.new("GeometryNodeSetMaterial")
    module_interior_set.label = "inner rib texture band"
    module_interior_set.location = (-80, 760)
    module_interior_set.inputs["Material"].default_value = interior_material
    links.new(module_body_set.outputs["Geometry"], module_interior_set.inputs["Geometry"])
    links.new(interior_selection, module_interior_set.inputs["Selection"])
    pulp_core_store = nodes.new("GeometryNodeStoreNamedAttribute")
    pulp_core_store.label = "SVG pulp core radius attribute"
    pulp_core_store.data_type = "FLOAT"
    pulp_core_store.domain = "POINT"
    pulp_core_store.inputs["Name"].default_value = "wachuma_pulp_core_radius"
    links.new(module_interior_set.outputs["Geometry"], pulp_core_store.inputs["Geometry"])
    links.new(group_input.outputs["Pulp Core Radius"], pulp_core_store.inputs["Value"])
    pulp_contrast_store = nodes.new("GeometryNodeStoreNamedAttribute")
    pulp_contrast_store.label = "SVG pulp contrast attribute"
    pulp_contrast_store.data_type = "FLOAT"
    pulp_contrast_store.domain = "POINT"
    pulp_contrast_store.inputs["Name"].default_value = "wachuma_pulp_contrast"
    links.new(pulp_core_store.outputs["Geometry"], pulp_contrast_store.inputs["Geometry"])
    links.new(group_input.outputs["Pulp Contrast"], pulp_contrast_store.inputs["Value"])

    rib_line = nodes.new("GeometryNodeMeshLine")
    rib_line.label = "n modular rib instances"
    rib_line.location = (-950, 350)
    rib_line.mode = "OFFSET"
    rib_line.count_mode = "TOTAL"
    rib_line.inputs["Start Location"].default_value = (0.0, 0.0, 0.0)
    rib_line.inputs["Offset"].default_value = (0.0, 0.0, 0.0)
    links.new(group_input.outputs["Rib Count"], rib_line.inputs["Count"])
    rib_index = nodes.new("GeometryNodeInputIndex")
    rib_delta = math_field(nodes, links, "DIVIDE", TAU, group_input.outputs["Rib Count"], "rib instance delta")
    rib_angle = math_field(nodes, links, "MULTIPLY", rib_index.outputs["Index"], rib_delta, "rib instance angle")
    rib_rotation = vector_field(nodes, links, 0.0, rib_angle, 0.0, "rotate module around shoot axis")
    rib_instances = nodes.new("GeometryNodeInstanceOnPoints")
    rib_instances.label = "InstanceOnPoints: M_i"
    rib_instances.location = (-50, 760)
    links.new(rib_line.outputs["Mesh"], rib_instances.inputs["Points"])
    links.new(pulp_contrast_store.outputs["Geometry"], rib_instances.inputs["Instance"])
    links.new(rib_rotation, rib_instances.inputs["Rotation"])
    rib_realize = nodes.new("GeometryNodeRealizeInstances")
    rib_realize.location = (180, 760)
    links.new(rib_instances.outputs["Instances"], rib_realize.inputs["Geometry"])
    # The module parameter domains meet at the same valley coordinates. Weld
    # those shared boundaries before the organism is joined with areoles and
    # spines; otherwise the exported body is seven coincident open patches
    # even when the render looks continuous.
    body_weld = nodes.new("GeometryNodeMergeByDistance")
    body_weld.label = "body topology: weld cyclic rib boundaries"
    body_weld.location = (360, 760)
    body_weld.inputs["Distance"].default_value = 1e-6
    links.new(rib_realize.outputs["Geometry"], body_weld.inputs["Geometry"])
    # Close the remaining base loop from the same parameter equation as the
    # first longitudinal row. This is a derived boundary face, not an
    # independent topological or visual cap: every boundary vertex is computed
    # by build_point_fields with s=0 and the matching module phase.
    boundary_segments = 24.0
    total_boundary_vertices = math_field(
        nodes,
        links,
        "MULTIPLY",
        group_input.outputs["Rib Count"],
        boundary_segments,
        "body base boundary vertex count",
    )
    boundary_circle = nodes.new("GeometryNodeMeshCircle")
    boundary_circle.fill_type = "NGON"
    boundary_circle.label = "derived body base boundary loop"
    boundary_circle.location = (520, 560)
    links.new(total_boundary_vertices, boundary_circle.inputs["Vertices"])
    boundary_index = nodes.new("GeometryNodeInputIndex")
    boundary_rib = math_field(
        nodes,
        links,
        "FLOOR",
        math_field(
            nodes,
            links,
            "DIVIDE",
            boundary_index.outputs["Index"],
            boundary_segments,
            "base boundary module quotient",
        ),
        "base boundary module id",
    )
    boundary_local_index = math_field(
        nodes,
        links,
        "MODULO",
        boundary_index.outputs["Index"],
        boundary_segments,
        "base boundary local index",
    )
    boundary_u_fraction = math_field(
        nodes,
        links,
        "DIVIDE",
        boundary_local_index,
        boundary_segments,
        "base boundary local fraction",
    )
    boundary_u = math_field(
        nodes,
        links,
        "ADD",
        -1.0,
        math_field(
            nodes,
            links,
            "MULTIPLY",
            2.0,
            boundary_u_fraction,
            "base boundary local u scale",
        ),
        "base boundary local u",
    )
    boundary_phase = math_field(
        nodes,
        links,
        "ADD",
        group_input.outputs["Rib Phase"],
        math_field(
            nodes,
            links,
            "MULTIPLY",
            boundary_rib,
            rib_delta,
            "base boundary module phase offset",
        ),
        "base boundary module phase",
    )
    boundary_fields = build_point_fields(
        nodes,
        links,
        boundary_u,
        0.0,
        {**params, "rib_phase": boundary_phase},
        "BODY BASE BOUNDARY",
    )
    boundary_set_position = nodes.new("GeometryNodeSetPosition")
    boundary_set_position.label = "body base boundary from M_i(s=0,u)"
    boundary_set_position.location = (760, 560)
    links.new(boundary_circle.outputs["Mesh"], boundary_set_position.inputs["Geometry"])
    links.new(boundary_fields["position"], boundary_set_position.inputs["Position"])
    body_boundary_material = nodes.new("GeometryNodeSetMaterial")
    body_boundary_material.label = "derived body base closure material"
    body_boundary_material.location = (940, 560)
    body_boundary_material.inputs["Material"].default_value = body_material
    body_boundary_flip = nodes.new("GeometryNodeFlipFaces")
    body_boundary_flip.label = "orient derived body closure outward"
    body_boundary_flip.location = (920, 420)
    links.new(
        boundary_set_position.outputs["Geometry"],
        body_boundary_flip.inputs["Mesh"],
    )
    links.new(
        body_boundary_flip.outputs["Mesh"],
        body_boundary_material.inputs["Geometry"],
    )
    body_join = nodes.new("GeometryNodeJoinGeometry")
    body_join.label = "body surface + derived closure"
    body_join.location = (1080, 760)
    links.new(body_weld.outputs["Geometry"], body_join.inputs["Geometry"])
    links.new(body_boundary_material.outputs["Geometry"], body_join.inputs["Geometry"])
    body_close_weld = nodes.new("GeometryNodeMergeByDistance")
    body_close_weld.label = "body topology: weld closure boundary"
    body_close_weld.location = (1240, 760)
    body_close_weld.inputs["Distance"].default_value = 1e-6
    links.new(body_join.outputs["Geometry"], body_close_weld.inputs["Geometry"])
    areole_line = nodes.new("GeometryNodeMeshLine")
    areole_line.label = "finite birth lattice: order -> rib -> s"
    areole_line.location = (-1050, -140)
    areole_line.mode = "OFFSET"
    areole_line.count_mode = "TOTAL"
    areole_line.inputs["Start Location"].default_value = (0.0, 0.0, 0.0)
    areole_line.inputs["Offset"].default_value = (0.0, 0.0, 0.0)
    total_areoles = math_field(nodes, links, "MULTIPLY", group_input.outputs["Rib Count"], group_input.outputs["Areole Rows"], "birth lattice size")
    links.new(total_areoles, areole_line.inputs["Count"])
    birth_index = nodes.new("GeometryNodeInputIndex")
    row_div = math_field(nodes, links, "DIVIDE", birth_index.outputs["Index"], group_input.outputs["Rib Count"], "birth row quotient")
    birth_row = math_field(nodes, links, "FLOOR", row_div, label="birth row")
    # One areole per rib per row. The integer step changes the identity/order
    # of the tracks, while the geometry remains visibly aligned along ribs.
    birth_rib_base = math_field(nodes, links, "MODULO", birth_index.outputs["Index"], group_input.outputs["Rib Count"], "birth rib base")
    row_step = math_field(nodes, links, "MULTIPLY", birth_row, group_input.outputs["Parastichy Step"], "row parastichy step")
    birth_rib = math_field(nodes, links, "MODULO", math_field(nodes, links, "ADD", birth_rib_base, row_step, "track order"), group_input.outputs["Rib Count"], "birth rib track")
    # Areoles/spines are born at the apical meristem. The first row therefore
    # has birth time 0, not 1/AreoleRows: a young shoot must already carry its
    # first areoles and spines. Their mature positions are an explicit
    # longitudinal lattice, not a free age-dependent noise field. Each row
    # starts near the meristem and settles toward its lattice site; this keeps
    # the repeated rib spacing regular at maturity while preserving apical
    # birth in the animation.
    row_denominator = math_field(
        nodes,
        links,
        "MAXIMUM",
        math_field(nodes, links, "SUBTRACT", group_input.outputs["Areole Rows"], 1.0, "birth rows minus one"),
        1.0,
        "safe birth row denominator",
    )
    row_fraction = math_field(nodes, links, "DIVIDE", birth_row, row_denominator, "normalized birth row")
    birth_time = math_field(nodes, links, "MULTIPLY", 0.86, row_fraction, "apical areole birth time")
    birth_age_num = math_field(nodes, links, "SUBTRACT", group_input.outputs["Development"], birth_time, "birth age numerator")
    birth_age_den = math_field(nodes, links, "SUBTRACT", 1.0, birth_time, "birth age denominator")
    birth_age = clamp_field(nodes, links, math_field(nodes, links, "DIVIDE", birth_age_num, birth_age_den, "material age"), 0.0, 1.0, "material age clamp")
    mature_s = math_field(
        nodes,
        links,
        "ADD",
        0.16,
        math_field(nodes, links, "MULTIPLY", 0.77, row_fraction, "regular rib lattice interval"),
        "equally spaced mature areole s",
    )
    birth_anchor = 0.94
    settle = smoothstep_field(nodes, links, birth_age, "basipetal lattice settlement")
    settlement_distance = math_field(nodes, links, "SUBTRACT", birth_anchor, mature_s, "settlement distance")
    birth_s_base = math_field(
        nodes,
        links,
        "SUBTRACT",
        birth_anchor,
        math_field(nodes, links, "MULTIPLY", settlement_distance, settle, "settlement progress"),
        "current areole s on regular lattice",
    )
    birth_offset = math_field(nodes, links, "MULTIPLY", birth_rib, rib_delta, "birth rib phase")
    birth_phase = math_field(nodes, links, "ADD", params["rib_phase"], birth_offset, "birth material phase")
    stagger_phase = math_field(nodes, links, "ADD", math_field(nodes, links, "MULTIPLY", birth_row, rib_delta, "row stagger phase"), birth_phase, "track stagger phase")
    stagger_wave = math_field(nodes, links, "SINE", stagger_phase, "track stagger wave")
    birth_s = math_field(nodes, links, "ADD", birth_s_base, math_field(nodes, links, "MULTIPLY", group_input.outputs["Areole Stagger"], stagger_wave, "small track stagger"), "current areole s staggered")
    birth_fields = build_point_fields(nodes, links, 0.0, birth_s, {**params, "rib_phase": birth_phase}, "AREOLE")
    seat_scale = nodes.new("ShaderNodeVectorMath")
    seat_scale.operation = "SCALE"
    seat_scale.label = "areole sits on rib crest"
    links.new(birth_fields["radial"], seat_scale.inputs[0])
    seat_scale.inputs[3].default_value = 0.018
    seat_position = nodes.new("ShaderNodeVectorMath")
    seat_position.operation = "ADD"
    links.new(birth_fields["position"], seat_position.inputs[0])
    links.new(seat_scale.outputs[0], seat_position.inputs[1])
    areole_set = nodes.new("GeometryNodeSetPosition")
    areole_set.label = "areoles remain attached to their rib module"
    areole_set.location = (-250, -140)
    links.new(areole_line.outputs["Mesh"], areole_set.inputs["Geometry"])
    links.new(seat_position.outputs[0], areole_set.inputs["Position"])
    areole_activity = smoothstep_field(nodes, links, math_field(nodes, links, "DIVIDE", math_field(nodes, links, "ADD", birth_age_num, 0.18, "areole activity lead"), 0.28, "areole activity scale"), "areole activity")
    active = math_field(nodes, links, "GREATER_THAN", areole_activity, 0.015, "born areole selection")
    areole_ico = nodes.new("GeometryNodeMeshIcoSphere")
    areole_ico.label = "areole"
    areole_ico.location = (-250, -430)
    areole_ico.inputs["Subdivisions"].default_value = 2
    # The areole must remain a readable basal tuft in the presentation render;
    # it is not a random dot hiding the seven fixed spine origins.
    areole_radius = math_field(nodes, links, "MULTIPLY", params["radius"], 0.055, "areole radius")
    links.new(areole_radius, areole_ico.inputs["Radius"])
    areole_instances = nodes.new("GeometryNodeInstanceOnPoints")
    areole_instances.location = (0, -140)
    links.new(areole_set.outputs["Geometry"], areole_instances.inputs["Points"])
    links.new(active, areole_instances.inputs["Selection"])
    links.new(areole_ico.outputs["Mesh"], areole_instances.inputs["Instance"])
    areole_radial_scale = math_field(nodes, links, "MULTIPLY", 1.35, areole_activity, "areole radial maturity")
    areole_cross_scale = math_field(nodes, links, "MULTIPLY", 0.78, areole_activity, "areole cross maturity")
    areole_scale = vector_field(nodes, links, areole_cross_scale, areole_cross_scale, areole_radial_scale, "flattened areole tuft scale")
    areole_align = nodes.new("FunctionNodeAlignEulerToVector")
    areole_align.label = "areole tuft follows rib normal"
    areole_align.axis = "Z"
    links.new(birth_fields["radial"], areole_align.inputs["Vector"])
    links.new(areole_scale, areole_instances.inputs["Scale"])
    links.new(areole_align.outputs["Rotation"], areole_instances.inputs["Rotation"])
    areole_realize = nodes.new("GeometryNodeRealizeInstances")
    areole_realize.location = (190, -140)
    links.new(areole_instances.outputs["Instances"], areole_realize.inputs["Geometry"])
    areole_material_set = nodes.new("GeometryNodeSetMaterial")
    areole_material_set.location = (390, -140)
    areole_material_set.inputs["Material"].default_value = areole_material
    links.new(areole_realize.outputs["Geometry"], areole_material_set.inputs["Geometry"])

    spine_curve = nodes.new("GeometryNodeCurvePrimitiveBezierSegment")
    spine_curve.location = (-120, -720)
    spine_curve.label = "curved spine Bézier primitive"
    spine_curve.inputs["Resolution"].default_value = 8
    spine_curve.inputs["Start"].default_value = (0.0, 0.0, 0.0)
    # Spine Scale is applied once, at the per-areole instance fan below. Keep
    # the shared curve at its base length so the slider remains linear and the
    # birth point/direction are not silently scaled a second time.
    controlled_spine_length = group_input.outputs["Spine Length"]
    spine_end = vector_field(nodes, links, 0.0, 0.0, controlled_spine_length, "spine curve end")
    spine_curve.inputs["Start Handle"].default_value = (0.0, 0.0, 0.0)
    spine_start_handle = vector_field(
        nodes,
        links,
        0.0,
        0.0,
        math_field(nodes, links, "MULTIPLY", controlled_spine_length, 0.32, "spine start handle"),
        "spine start handle vector",
    )
    spine_end_handle = vector_field(nodes, links, group_input.outputs["Spine Bend"], 0.0, controlled_spine_length, "spine end handle vector")
    links.new(spine_end, spine_curve.inputs["End"])
    links.new(spine_start_handle, spine_curve.inputs["Start Handle"])
    links.new(spine_end_handle, spine_curve.inputs["End Handle"])
    spine_profile = nodes.new("GeometryNodeCurvePrimitiveCircle")
    spine_profile.location = (-120, -900)
    spine_profile.label = "fine spine profile"
    spine_profile.inputs["Resolution"].default_value = 6
    links.new(group_input.outputs["Spine Radius"], spine_profile.inputs["Radius"])
    spine_mesh = nodes.new("GeometryNodeCurveToMesh")
    spine_mesh.location = (120, -720)
    spine_mesh.label = "tapered curved spine mesh"
    spine_parameter = nodes.new("GeometryNodeSplineParameter")
    spine_parameter.location = (-110, -1040)
    spine_parameter.label = "spine length parameter 0..1"
    spine_radius_decay = math_field(
        nodes,
        links,
        "SUBTRACT",
        1.0,
        math_field(nodes, links, "MULTIPLY", 0.92, spine_parameter.outputs["Factor"], "spine tip decay"),
        "spine taper factor",
    )
    spine_radius_field = math_field(nodes, links, "MULTIPLY", group_input.outputs["Spine Radius"], spine_radius_decay, "spine radius field")
    spine_radius_set = nodes.new("GeometryNodeSetCurveRadius")
    spine_radius_set.location = (-10, -720)
    spine_radius_set.label = "spine tapers to a fine tip"
    links.new(spine_curve.outputs["Curve"], spine_radius_set.inputs["Curve"])
    links.new(spine_radius_field, spine_radius_set.inputs["Radius"])
    links.new(spine_radius_set.outputs["Curve"], spine_mesh.inputs["Curve"])
    links.new(spine_profile.outputs["Curve"], spine_mesh.inputs["Profile Curve"])
    spine_mesh.inputs["Fill Caps"].default_value = True

    spine_geometry = []
    # Every visible point in the reference areole is a spine, including the
    # short ones. The bundle is therefore a fixed seven-slot developmental
    # pattern for this profile; lengths and directions vary, but healthy slots
    # are not randomly deleted. The tuple is
    # (index, length, circumferential angle, axial component).
    spine_fan = (
        (-3, 0.42, -1.02, -0.18),
        (-2, 0.62, -0.70, -0.14),
        (-1, 0.86, -0.34, -0.035),
        (0, 1.25, 0.00, -0.28),
        (1, 0.90, 0.34, 0.055),
        (2, 0.65, 0.70, 0.16),
        (3, 0.44, 1.02, 0.22),
    )
    for j, (fan_index, length_factor, fan_angle, base_vertical) in enumerate(spine_fan):
        theta = birth_fields["theta"]
        tangent = vector_field(
            nodes,
            links,
            math_field(nodes, links, "SINE", theta, f"spine fan {fan_index} tangent x"),
            0.0,
            math_field(nodes, links, "COSINE", theta, f"spine fan {fan_index} tangent z"),
            f"spine fan {fan_index} tangent",
        )
        radial_scaled = nodes.new("ShaderNodeVectorMath")
        radial_scaled.operation = "SCALE"
        links.new(birth_fields["radial"], radial_scaled.inputs[0])
        radial_scaled.inputs[3].default_value = math.cos(fan_angle)
        tangent_scaled = nodes.new("ShaderNodeVectorMath")
        tangent_scaled.operation = "SCALE"
        links.new(tangent, tangent_scaled.inputs[0])
        tangent_scaled.inputs[3].default_value = math.sin(fan_angle)
        radial_tangent = nodes.new("ShaderNodeVectorMath")
        radial_tangent.operation = "ADD"
        links.new(radial_scaled.outputs[0], radial_tangent.inputs[0])
        links.new(tangent_scaled.outputs[0], radial_tangent.inputs[1])
        axial_phase = math_field(
            nodes,
            links,
            "ADD",
            math_field(nodes, links, "MULTIPLY", TAU * 0.72, birth_s, f"spine axial phase {fan_index}"),
            theta,
            f"spine axial phase with rib {fan_index}",
        )
        axial_wave = math_field(nodes, links, "SINE", axial_phase, f"spine axial lean wave {fan_index}")
        axial_lean = math_field(
            nodes,
            links,
            "ADD",
            base_vertical,
            math_field(nodes, links, "MULTIPLY", 0.055, axial_wave, f"spine local lean {fan_index}"),
            f"spine vertical component {fan_index}",
        )
        vertical_vector = vector_field(nodes, links, 0.0, axial_lean, 0.0, f"spine fan {fan_index} vertical")
        direction = nodes.new("ShaderNodeVectorMath")
        direction.operation = "ADD"
        links.new(radial_tangent.outputs[0], direction.inputs[0])
        links.new(vertical_vector, direction.inputs[1])
        align = nodes.new("FunctionNodeAlignEulerToVector")
        align.label = f"spine fan {fan_index} normal alignment"
        align.axis = "Z"
        links.new(direction.outputs[0], align.inputs["Vector"])
        instance = nodes.new("GeometryNodeInstanceOnPoints")
        instance.label = f"spine fan {fan_index} per areole"
        instance.location = (400 + 110 * j, -600)
        links.new(areole_set.outputs["Geometry"], instance.inputs["Points"])
        links.new(active, instance.inputs["Selection"])
        links.new(spine_mesh.outputs["Mesh"], instance.inputs["Instance"])
        links.new(align.outputs["Rotation"], instance.inputs["Rotation"])
        age_length = math_field(nodes, links, "ADD", 0.72, math_field(nodes, links, "MULTIPLY", 0.28, birth_age, f"spine age gain {fan_index}"), f"spine age factor {fan_index}")
        fan_scale_base = math_field(nodes, links, "MULTIPLY", areole_activity, length_factor, f"spine fan {fan_index} maturity")
        fan_scale = math_field(nodes, links, "MULTIPLY", fan_scale_base, age_length, f"spine fan {fan_index} age-weighted length")
        fan_scale = math_field(nodes, links, "MULTIPLY", fan_scale, group_input.outputs["Spine Scale"], f"spine fan {fan_index} global scale")
        fan_scale_vector = vector_field(nodes, links, fan_scale, fan_scale, fan_scale, f"spine fan {fan_index} scale")
        links.new(fan_scale_vector, instance.inputs["Scale"])
        spine_geometry.append(instance.outputs["Instances"])
    spine_join = nodes.new("GeometryNodeJoinGeometry")
    spine_join.location = (800, -600)
    for geometry in spine_geometry:
        links.new(geometry, spine_join.inputs["Geometry"])
    spine_realize = nodes.new("GeometryNodeRealizeInstances")
    spine_realize.location = (980, -600)
    links.new(spine_join.outputs["Geometry"], spine_realize.inputs["Geometry"])
    spine_material_set = nodes.new("GeometryNodeSetMaterial")
    spine_material_set.location = (1150, -600)
    spine_material_set.inputs["Material"].default_value = spine_material
    links.new(spine_realize.outputs["Geometry"], spine_material_set.inputs["Geometry"])

    # A branch is a new developmental shoot, not a scaled copy of the parent.
    # It has its own local rib module, developmental clock, areole lattice and
    # spine fan. The parent contributes only the birth site and local frame.
    branch_age = clamp_field(nodes, links, group_input.outputs["Branch Development"], 0.0, 1.0, "branch meristem age")
    branch_growth = smoothstep_field(nodes, links, branch_age, "child meristem volumetric growth")
    branch_height = math_field(nodes, links, "MULTIPLY", params["height"], 0.68, "child shoot mature height")
    branch_radius_max = math_field(nodes, links, "MULTIPLY", params["radius"], 0.42, "child shoot mature radius")
    branch_radius_floor = math_field(nodes, links, "ADD", 0.08, math_field(nodes, links, "MULTIPLY", 0.92, branch_growth, "child radial expansion"), "child radial growth factor")
    branch_radius = math_field(nodes, links, "MULTIPLY", branch_radius_max, branch_radius_floor, "child shoot current radius")
    branch_ratio = math_field(nodes, links, "DIVIDE", branch_radius, params["radius"], "child-to-parent radius ratio")
    branch_params = {
        **params,
        "development": branch_age,
        "height": branch_height,
        "radius": branch_radius,
    }

    branch_line = nodes.new("GeometryNodeMeshLine")
    branch_line.label = "child shoot meristem birth site"
    branch_line.location = (-650, -1050)
    branch_line.mode = "OFFSET"
    branch_line.count_mode = "TOTAL"
    branch_line.inputs["Count"].default_value = 1
    branch_line.inputs["Start Location"].default_value = (0.0, 0.0, 0.0)
    branch_line.inputs["Offset"].default_value = (0.0, 0.0, 0.0)
    # A lateral shoot is initiated from a lower-middle areole, as in the
    # supplied Pachanoi references, then grows predominantly upward/outward.
    branch_parent = build_point_fields(nodes, links, 0.0, 0.34, params, "BRANCH PARENT AREOLE")
    branch_set = nodes.new("GeometryNodeSetPosition")
    branch_set.label = "child meristem at parent areole"
    branch_set.location = (-480, -1050)
    links.new(branch_line.outputs["Mesh"], branch_set.inputs["Geometry"])
    branch_embed = nodes.new("ShaderNodeVectorMath")
    branch_embed.operation = "SCALE"
    branch_embed.label = "child meristem embedded inside parent"
    links.new(branch_parent["radial"], branch_embed.inputs[0])
    branch_embed.inputs[3].default_value = -0.55
    branch_embed_scaled = nodes.new("ShaderNodeVectorMath")
    branch_embed_scaled.operation = "SCALE"
    links.new(branch_embed.outputs[0], branch_embed_scaled.inputs[0])
    links.new(branch_radius, branch_embed_scaled.inputs[3])
    branch_origin = nodes.new("ShaderNodeVectorMath")
    branch_origin.operation = "ADD"
    links.new(branch_parent["position"], branch_origin.inputs[0])
    links.new(branch_embed_scaled.outputs[0], branch_origin.inputs[1])
    links.new(branch_origin.outputs[0], branch_set.inputs["Position"])
    branch_radial = nodes.new("ShaderNodeVectorMath")
    branch_radial.operation = "SCALE"
    branch_radial.label = "parent areole normal"
    links.new(branch_parent["radial"], branch_radial.inputs[0])
    branch_radial.inputs[3].default_value = 0.75
    branch_vertical = vector_field(nodes, links, 0.0, 1.0, 0.0, "child shoot apical tendency")
    branch_direction = nodes.new("ShaderNodeVectorMath")
    branch_direction.operation = "ADD"
    links.new(branch_radial.outputs[0], branch_direction.inputs[0])
    links.new(branch_vertical, branch_direction.inputs[1])
    branch_align = nodes.new("FunctionNodeAlignEulerToVector")
    branch_align.label = "child shoot local axis"
    branch_align.axis = "Y"
    links.new(branch_direction.outputs[0], branch_align.inputs["Vector"])

    branch_grid = nodes.new("GeometryNodeMeshGrid")
    branch_grid.label = "CHILD RIB MODULE DOMAIN: u x s"
    branch_grid.location = (-1180, -1180)
    branch_grid.inputs["Size X"].default_value = 2.0
    branch_grid.inputs["Size Y"].default_value = 1.0
    branch_grid.inputs["Vertices X"].default_value = 25
    branch_grid.inputs["Vertices Y"].default_value = 97
    branch_module_position = nodes.new("GeometryNodeInputPosition")
    branch_module_separate = nodes.new("ShaderNodeSeparateXYZ")
    links.new(branch_module_position.outputs["Position"], branch_module_separate.inputs["Vector"])
    branch_u = branch_module_separate.outputs["X"]
    branch_s = math_field(nodes, links, "ADD", branch_module_separate.outputs["Y"], 0.5, "child module longitudinal s")
    branch_fields = build_point_fields(nodes, links, branch_u, branch_s, branch_params, "CHILD RIB MODULE")
    branch_module_set = nodes.new("GeometryNodeSetPosition")
    branch_module_set.label = "child shoot M_i(s,u)"
    branch_module_set.location = (-900, -1180)
    links.new(branch_grid.outputs["Mesh"], branch_module_set.inputs["Geometry"])
    links.new(branch_fields["position"], branch_module_set.inputs["Position"])
    branch_u_abs = math_field(nodes, links, "ABSOLUTE", branch_u, "child rib interior coordinate")
    branch_interior_selection = math_field(nodes, links, "LESS_THAN", branch_u_abs, 0.68, "child interior band")
    branch_body_set = nodes.new("GeometryNodeSetMaterial")
    branch_body_set.label = "child shoot epidermis"
    branch_body_set.inputs["Material"].default_value = body_material
    links.new(branch_module_set.outputs["Geometry"], branch_body_set.inputs["Geometry"])
    branch_interior_set = nodes.new("GeometryNodeSetMaterial")
    branch_interior_set.label = "child shoot inner texture"
    branch_interior_set.inputs["Material"].default_value = interior_material
    links.new(branch_body_set.outputs["Geometry"], branch_interior_set.inputs["Geometry"])
    links.new(branch_interior_selection, branch_interior_set.inputs["Selection"])

    branch_rib_line = nodes.new("GeometryNodeMeshLine")
    branch_rib_line.label = "child shoot n modular ribs"
    branch_rib_line.location = (-650, -1180)
    branch_rib_line.mode = "OFFSET"
    branch_rib_line.count_mode = "TOTAL"
    branch_rib_line.inputs["Start Location"].default_value = (0.0, 0.0, 0.0)
    branch_rib_line.inputs["Offset"].default_value = (0.0, 0.0, 0.0)
    links.new(group_input.outputs["Rib Count"], branch_rib_line.inputs["Count"])
    branch_rib_index = nodes.new("GeometryNodeInputIndex")
    branch_rib_delta = math_field(nodes, links, "DIVIDE", TAU, group_input.outputs["Rib Count"], "child rib angular step")
    branch_rib_angle = math_field(nodes, links, "MULTIPLY", branch_rib_index.outputs["Index"], branch_rib_delta, "child rib angle")
    branch_rib_rotation = vector_field(nodes, links, 0.0, branch_rib_angle, 0.0, "child rib rotation")
    branch_rib_instances = nodes.new("GeometryNodeInstanceOnPoints")
    branch_rib_instances.label = "child M_i around local axis"
    links.new(branch_rib_line.outputs["Mesh"], branch_rib_instances.inputs["Points"])
    links.new(branch_interior_set.outputs["Geometry"], branch_rib_instances.inputs["Instance"])
    links.new(branch_rib_rotation, branch_rib_instances.inputs["Rotation"])
    branch_rib_realize = nodes.new("GeometryNodeRealizeInstances")
    links.new(branch_rib_instances.outputs["Instances"], branch_rib_realize.inputs["Geometry"])

    branch_areole_line = nodes.new("GeometryNodeMeshLine")
    branch_areole_line.label = "child areole lattice"
    branch_areole_line.mode = "OFFSET"
    branch_areole_line.count_mode = "TOTAL"
    branch_areole_line.inputs["Start Location"].default_value = (0.0, 0.0, 0.0)
    branch_areole_line.inputs["Offset"].default_value = (0.0, 0.0, 0.0)
    branch_total_areoles = math_field(nodes, links, "MULTIPLY", group_input.outputs["Rib Count"], group_input.outputs["Areole Rows"], "child lattice size")
    links.new(branch_total_areoles, branch_areole_line.inputs["Count"])
    branch_birth_index = nodes.new("GeometryNodeInputIndex")
    branch_row_div = math_field(nodes, links, "DIVIDE", branch_birth_index.outputs["Index"], group_input.outputs["Rib Count"], "child birth row quotient")
    branch_birth_row = math_field(nodes, links, "FLOOR", branch_row_div, label="child birth row")
    branch_row_den = math_field(nodes, links, "MAXIMUM", math_field(nodes, links, "SUBTRACT", group_input.outputs["Areole Rows"], 1.0, "child row denominator raw"), 1.0, "child safe row denominator")
    branch_row_fraction = math_field(nodes, links, "DIVIDE", branch_birth_row, branch_row_den, "child normalized row")
    branch_birth_time = math_field(nodes, links, "MULTIPLY", 0.86, branch_row_fraction, "child areole birth time")
    branch_age_num = math_field(nodes, links, "SUBTRACT", branch_age, branch_birth_time, "child birth age numerator")
    branch_age_den = math_field(nodes, links, "SUBTRACT", 1.0, branch_birth_time, "child birth age denominator")
    branch_areole_age = clamp_field(nodes, links, math_field(nodes, links, "DIVIDE", branch_age_num, branch_age_den, "child areole age"), 0.0, 1.0, "child areole age clamp")
    branch_mature_s = math_field(nodes, links, "ADD", 0.16, math_field(nodes, links, "MULTIPLY", 0.77, branch_row_fraction, "child regular lattice interval"), "child mature areole s")
    branch_settle = smoothstep_field(nodes, links, branch_areole_age, "child lattice settlement")
    branch_settlement_distance = math_field(nodes, links, "SUBTRACT", 0.94, branch_mature_s, "child settlement distance")
    branch_areole_s = math_field(nodes, links, "SUBTRACT", 0.94, math_field(nodes, links, "MULTIPLY", branch_settlement_distance, branch_settle, "child settlement progress"), "child current areole s")
    branch_rib_base = math_field(nodes, links, "MODULO", branch_birth_index.outputs["Index"], group_input.outputs["Rib Count"], "child rib track base")
    branch_row_step = math_field(nodes, links, "MULTIPLY", branch_birth_row, group_input.outputs["Parastichy Step"], "child row track step")
    branch_birth_rib = math_field(nodes, links, "MODULO", math_field(nodes, links, "ADD", branch_rib_base, branch_row_step, "child track order"), group_input.outputs["Rib Count"], "child birth rib")
    branch_birth_offset = math_field(nodes, links, "MULTIPLY", branch_birth_rib, branch_rib_delta, "child birth rib phase")
    branch_birth_phase = math_field(nodes, links, "ADD", params["rib_phase"], branch_birth_offset, "child birth phase")
    branch_areole_fields = build_point_fields(nodes, links, 0.0, branch_areole_s, {**branch_params, "rib_phase": branch_birth_phase}, "CHILD AREOLE")
    branch_seat_scale = nodes.new("ShaderNodeVectorMath")
    branch_seat_scale.operation = "SCALE"
    branch_seat_scale.inputs[3].default_value = 0.018
    links.new(branch_areole_fields["radial"], branch_seat_scale.inputs[0])
    branch_seat_position = nodes.new("ShaderNodeVectorMath")
    branch_seat_position.operation = "ADD"
    links.new(branch_areole_fields["position"], branch_seat_position.inputs[0])
    links.new(branch_seat_scale.outputs[0], branch_seat_position.inputs[1])
    branch_areole_set = nodes.new("GeometryNodeSetPosition")
    branch_areole_set.label = "child areoles attached to child ribs"
    links.new(branch_areole_line.outputs["Mesh"], branch_areole_set.inputs["Geometry"])
    links.new(branch_seat_position.outputs[0], branch_areole_set.inputs["Position"])
    branch_areole_activity = smoothstep_field(nodes, links, math_field(nodes, links, "DIVIDE", math_field(nodes, links, "ADD", branch_age_num, 0.18, "child activity lead"), 0.28, "child activity scale"), "child areole activity")
    branch_active = math_field(nodes, links, "GREATER_THAN", branch_areole_activity, 0.015, "child areole born")
    branch_areole_instances = nodes.new("GeometryNodeInstanceOnPoints")
    links.new(branch_areole_set.outputs["Geometry"], branch_areole_instances.inputs["Points"])
    links.new(branch_active, branch_areole_instances.inputs["Selection"])
    links.new(areole_ico.outputs["Mesh"], branch_areole_instances.inputs["Instance"])
    branch_areole_radial = math_field(nodes, links, "MULTIPLY", 1.35, branch_areole_activity, "child areole radial maturity")
    branch_areole_radial = math_field(nodes, links, "MULTIPLY", branch_areole_radial, branch_ratio, "child areole radial scale")
    branch_areole_cross = math_field(nodes, links, "MULTIPLY", 0.78, branch_areole_activity, "child areole cross maturity")
    branch_areole_cross = math_field(nodes, links, "MULTIPLY", branch_areole_cross, branch_ratio, "child areole cross scale")
    branch_areole_scale = vector_field(nodes, links, branch_areole_cross, branch_areole_cross, branch_areole_radial, "child flattened areole tuft")
    branch_areole_align = nodes.new("FunctionNodeAlignEulerToVector")
    branch_areole_align.axis = "Z"
    links.new(branch_areole_fields["radial"], branch_areole_align.inputs["Vector"])
    links.new(branch_areole_scale, branch_areole_instances.inputs["Scale"])
    links.new(branch_areole_align.outputs["Rotation"], branch_areole_instances.inputs["Rotation"])
    branch_areole_realize = nodes.new("GeometryNodeRealizeInstances")
    links.new(branch_areole_instances.outputs["Instances"], branch_areole_realize.inputs["Geometry"])
    branch_areole_material = nodes.new("GeometryNodeSetMaterial")
    branch_areole_material.inputs["Material"].default_value = areole_material
    links.new(branch_areole_realize.outputs["Geometry"], branch_areole_material.inputs["Geometry"])

    branch_spine_geometry = []
    for j, (fan_index, length_factor, fan_angle, base_vertical) in enumerate(spine_fan):
        branch_theta = branch_areole_fields["theta"]
        branch_tangent = vector_field(
            nodes,
            links,
            math_field(nodes, links, "SINE", branch_theta, f"child spine fan {fan_index} tangent x"),
            0.0,
            math_field(nodes, links, "COSINE", branch_theta, f"child spine fan {fan_index} tangent z"),
            f"child spine fan {fan_index} tangent",
        )
        branch_radial_scaled = nodes.new("ShaderNodeVectorMath")
        branch_radial_scaled.operation = "SCALE"
        links.new(branch_areole_fields["radial"], branch_radial_scaled.inputs[0])
        branch_radial_scaled.inputs[3].default_value = math.cos(fan_angle)
        branch_tangent_scaled = nodes.new("ShaderNodeVectorMath")
        branch_tangent_scaled.operation = "SCALE"
        links.new(branch_tangent, branch_tangent_scaled.inputs[0])
        branch_tangent_scaled.inputs[3].default_value = math.sin(fan_angle)
        branch_radial_tangent = nodes.new("ShaderNodeVectorMath")
        branch_radial_tangent.operation = "ADD"
        links.new(branch_radial_scaled.outputs[0], branch_radial_tangent.inputs[0])
        links.new(branch_tangent_scaled.outputs[0], branch_radial_tangent.inputs[1])
        branch_vertical_lean = vector_field(nodes, links, 0.0, base_vertical, 0.0, f"child spine fan {fan_index} vertical")
        branch_direction = nodes.new("ShaderNodeVectorMath")
        branch_direction.operation = "ADD"
        links.new(branch_radial_tangent.outputs[0], branch_direction.inputs[0])
        links.new(branch_vertical_lean, branch_direction.inputs[1])
        branch_spine_align = nodes.new("FunctionNodeAlignEulerToVector")
        branch_spine_align.axis = "Z"
        links.new(branch_direction.outputs[0], branch_spine_align.inputs["Vector"])
        branch_spine_instance = nodes.new("GeometryNodeInstanceOnPoints")
        links.new(branch_areole_set.outputs["Geometry"], branch_spine_instance.inputs["Points"])
        links.new(branch_active, branch_spine_instance.inputs["Selection"])
        links.new(spine_mesh.outputs["Mesh"], branch_spine_instance.inputs["Instance"])
        links.new(branch_spine_align.outputs["Rotation"], branch_spine_instance.inputs["Rotation"])
        branch_spine_age_factor = math_field(nodes, links, "ADD", 0.72, math_field(nodes, links, "MULTIPLY", 0.28, branch_areole_age, f"child spine age {fan_index}"), f"child spine age factor {fan_index}")
        branch_spine_scale = math_field(nodes, links, "MULTIPLY", branch_areole_activity, length_factor, f"child spine length {fan_index}")
        branch_spine_scale = math_field(nodes, links, "MULTIPLY", branch_spine_scale, branch_spine_age_factor, f"child spine age length {fan_index}")
        branch_spine_scale = math_field(nodes, links, "MULTIPLY", branch_spine_scale, branch_ratio, f"child spine radius proportion {fan_index}")
        branch_spine_scale_vector = vector_field(nodes, links, branch_spine_scale, branch_spine_scale, branch_spine_scale, f"child spine scale {fan_index}")
        links.new(branch_spine_scale_vector, branch_spine_instance.inputs["Scale"])
        branch_spine_geometry.append(branch_spine_instance.outputs["Instances"])
    branch_spine_join = nodes.new("GeometryNodeJoinGeometry")
    for branch_geometry in branch_spine_geometry:
        links.new(branch_geometry, branch_spine_join.inputs["Geometry"])
    branch_spine_realize = nodes.new("GeometryNodeRealizeInstances")
    links.new(branch_spine_join.outputs["Geometry"], branch_spine_realize.inputs["Geometry"])
    branch_spine_material = nodes.new("GeometryNodeSetMaterial")
    branch_spine_material.inputs["Material"].default_value = spine_material
    links.new(branch_spine_realize.outputs["Geometry"], branch_spine_material.inputs["Geometry"])

    branch_organism = nodes.new("GeometryNodeJoinGeometry")
    branch_organism.label = "child shoot: independent ribs + areoles + spines"
    links.new(branch_rib_realize.outputs["Geometry"], branch_organism.inputs["Geometry"])
    links.new(branch_areole_material.outputs["Geometry"], branch_organism.inputs["Geometry"])
    links.new(branch_spine_material.outputs["Geometry"], branch_organism.inputs["Geometry"])
    branch_instance = nodes.new("GeometryNodeInstanceOnPoints")
    branch_instance.label = "child shoot born at parent areole"
    links.new(branch_set.outputs["Geometry"], branch_instance.inputs["Points"])
    links.new(branch_organism.outputs["Geometry"], branch_instance.inputs["Instance"])
    links.new(branch_align.outputs["Rotation"], branch_instance.inputs["Rotation"])
    branch_selection = math_field(nodes, links, "GREATER_THAN", group_input.outputs["Branch Development"], 0.01, "child shoot born")
    links.new(branch_selection, branch_instance.inputs["Selection"])
    branch_realize = nodes.new("GeometryNodeRealizeInstances")
    links.new(branch_instance.outputs["Instances"], branch_realize.inputs["Geometry"])

    join = nodes.new("GeometryNodeJoinGeometry")
    join.label = "organism: rib modules + areoles + spines + shoots"
    join.location = (1250, 180)
    for geometry in (
        body_close_weld.outputs["Geometry"],
        areole_material_set.outputs["Geometry"],
        spine_material_set.outputs["Geometry"],
        branch_realize.outputs["Geometry"],
    ):
        links.new(geometry, join.inputs["Geometry"])
    links.new(join.outputs["Geometry"], group_output.inputs["Geometry"])
    return group


def create_asset():
    mesh = make_host_mesh()
    host = bpy.data.objects.new("WACHUMA_Pachanoi_GN_Source", mesh)
    bpy.context.collection.objects.link(host)
    body_material = create_material("WACHUMA cactus body", (0.10, 0.30, 0.18), 0.9)
    interior_material = create_interior_texture_material()
    areole_material = create_material("WACHUMA areoles", (0.24, 0.085, 0.025), 0.95)
    spine_material = create_material("WACHUMA spines", (0.30, 0.14, 0.045), 0.9)
    modifier = host.modifiers.new("WACHUMA Geometry Nodes 4.5 · modular rib system", "NODES")
    group = build_geometry_nodes(body_material, interior_material, areole_material, spine_material)
    modifier.node_group = group
    parameters = {
        "Development": 0.76,
        "Hydration": 0.0,
        "Mature Height": 2.6,
        "Radius": 0.34,
        "Rib Count": 7,
        "Rib Relief": 0.28,
        "Inner Rib Roundness": 0.35,
        "Rib Phase": -math.pi / 2.0 + math.pi / 7.0,
        "Phase Drift (deg)": 0.0,
        "Apical Fraction": 0.40,
        "Apical Rib Memory": 0.30,
        "Apical Lobe Lift": 0.24,
        "Node Scale": 1.0,
        "Parastichy Step": 2,
        "Areole Rows": 8,
        "Areole Stagger": 0.0,
        "Pulp Core Radius": 0.46,
        "Pulp Contrast": 0.78,
        "Spine Length": 0.140,
        "Spine Bend": 0.006,
        "Spine Radius": 0.0026,
        "Spine Scale": 1.0,
        "Branch Development": 0.0,
    }
    for name, value in parameters.items():
        set_modifier_input(modifier, group, name, value)
    # The approved visual baseline is the single continuous parent shoot.  The
    # lateral-shoot experiment remains in the node tree for research, but its
    # control is frozen at zero so this asset contains no arm.
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 180
    scene.render.fps = 24
    def key_socket(name, keyframes):
        identifier = interface_identifier(group, name)
        for frame, value in keyframes:
            scene.frame_set(frame)
            modifier[identifier] = value
            modifier.keyframe_insert(data_path=f'["{identifier}"]', frame=frame)
    key_socket("Development", ((1, 0.22), (48, 0.42), (96, 0.76), (180, 0.92)))
    key_socket("Hydration", ((1, -0.12), (54, 0.10), (108, 0.0), (180, 0.06)))
    key_socket("Branch Development", ((1, 0.0), (180, 0.0)))
    # Open the editable project at the mature parent frame.
    scene.frame_set(180)
    host["generator"] = "Geometry Nodes / Blender 4.5.4"
    host["representation"] = "modular-developmental-interpretation"
    host["svg_role"] = "visual-reference-only; not a growth timeline"
    host["mathematical_primitive"] = "M_i(s,u) rib module"
    host["growth_axis"] = "apical_meristem"
    host["branch_rule"] = "disabled in approved baseline; no lateral shoot"
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = host.evaluated_get(depsgraph)
    baked_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    if baked_mesh is None or not baked_mesh.vertices:
        raise RuntimeError("Geometry Nodes evaluated to an empty mesh")
    baked_mesh.update(calc_edges=True)
    baked = bpy.data.objects.new("WACHUMA_Pachanoi_GN_Baked", baked_mesh)
    bpy.context.collection.objects.link(baked)
    baked["source"] = "evaluated Geometry Nodes graph"
    baked["editable_source"] = "WACHUMA_Pachanoi_GN_Source"
    baked.hide_render = True
    baked.hide_set(True)
    return host, baked, group, parameters


def export_glb(obj, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.hide_render = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    result = bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_gn_mesh=False,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=True,
    )
    obj.hide_set(True)
    obj.hide_render = True
    if result != {"FINISHED"} or not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError(f"GLB export failed: {result}")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--blend-out", required=True, type=Path)
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(argv)


def main():
    args = parse_args()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    host, baked, group, parameters = create_asset()
    export_glb(baked, args.out.resolve())
    args.blend_out.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.view_layer.objects.active = host
    host.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.blend_out.resolve()))
    generator_hash = hashlib.sha256(Path(__file__).resolve().read_bytes()).hexdigest()
    blend_hash = hashlib.sha256(args.blend_out.resolve().read_bytes()).hexdigest()
    manifest_path = args.out.with_suffix(".manifest.json")
    manifest = {
        "$schema": "https://wachuma.org/schemas/procedural-asset-manifest.schema.json",
        "schemaVersion": "1.0",
        "asset": args.out.name,
        "format": "glb",
        "contentHash": hashlib.sha256(args.out.read_bytes()).hexdigest(),
        "origin": "procedural",
        "representationType": "procedural-interpretation",
        "generator": {
            "algorithm": "pachanoi-geometry-nodes-modular-rib-development",
            "algorithmVersion": GENERATOR_VERSION,
            "runtime": BLENDER_RUNTIME,
            "license": "MIT",
            "attribution": "WACHUMA",
        },
        "generatorVersion": GENERATOR_VERSION,
        "generatorHash": generator_hash,
        "blendHash": blend_hash,
        "adapterBoundary": "external-process",
        "seed": 0,
        "license": "MIT",
        "attribution": "WACHUMA Geometry Nodes / Blender 4.5.4",
        "metadata": {
            "nodeGroup": group.name,
            "editableBlend": str(args.blend_out),
            "parameters": parameters,
            "svgRole": "reference-only for inner rib texture; never used as growth time",
            "mathematicalPrimitive": "M_i(s,u), u in [-1,1], s in [0,1]",
            "growthModel": "apical elongation + C2 rib-memory meristem + compact areole kernels",
            "lateralShootModel": "disabled in approved visual baseline; parent shoot only",
            "innerTexture": "SVG-inspired radial pulp gradient: light central core, intermediate pulp and darker outer pulp on |u| < 0.68 rib band",
            "spineModel": "seven fixed tapered Bézier spine slots per areole with unequal lengths; apical birth, age scaling and Spine Scale",
            "animation": {
                "frameStart": 1,
                "frameEnd": 180,
                "fps": 24,
                "keyframedInputs": ["Development", "Hydration"],
                "webSequenceManifest": "apps/web/public/models/pachanoi-sequence/sequence.manifest.json",
            },
            "notClaimed": ["measured species law", "cell division simulation", "universal phyllotaxis"],
        },
        "identity": {
            "schemaVersion": "0.1",
            "fields": ["rib_id", "areole_id", "u", "delta_theta", "local_s", "birth_frame"],
            "encoding": "not encoded in GLB; sequence manifest is the current sidecar",
            "correspondence": "not proven at vertex level",
        },
        "validation": {
            "export": "passed",
            "nonEmpty": bool(baked.data.vertices and baked.data.polygons),
            "gltfValidator": "run by release gate",
            "bodyTopology": "run by .local/audit/implementation-audit-2026-08-28.json",
            "vertexIdentity": "not encoded in GLB",
        },
        "taxonomicClaim": False,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"glb": str(args.out), "blend": str(args.blend_out), "manifest": str(manifest_path), "vertices": len(baked.data.vertices), "polygons": len(baked.data.polygons), "node_group": group.name}, indent=2))


if __name__ == "__main__":
    main()
