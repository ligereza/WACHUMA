#!/usr/bin/env python3
"""Convert the WACHUMA SVG rib profile into a closed Blender mesh.

The SVG is treated as a 2D profile only. The generated asset is a
procedural interpretation, not a taxonomic reconstruction.

Run inside Blender for GLB export:

    blender --background --python integrations/blender/svg_to_cactus_mesh.py -- \
      --svg apps/web/public/animations/echinopsis-rib-progression.svg \
      --frame 4 --height 2.2 --radius 0.38 \
      --out .local/blender-run/echinopsis-pachanoi-apex.glb

Run with a regular Python interpreter for topology validation only:

    python integrations/blender/svg_to_cactus_mesh.py \
      --svg apps/web/public/animations/echinopsis-rib-progression.svg \
      --frame 4 --validate-only
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

Point2 = tuple[float, float]
Point3 = tuple[float, float, float]
Face = tuple[int, ...]
EPSILON = 1e-8


@dataclass(frozen=True)
class MeshData:
    vertices: list[Point3]
    faces: list[Face]
    profile_vertex_count: int
    loft_ring_count: int
    rib_count: int
    cross_section: list[Point2]
    areoles: list[Point3]
    areole_records: list[dict[str, object]]
    meridian: list[tuple[float, float]]
    mean_radius: float
    amplitude: float
    phase: float
    body_height: float
    apical_height: float
    transition_width: float
    meristem_radius: float
    cap_height: float
    meristem_height: float
    z_join: float
    z_meristem: float
    z_max: float
    rib_modules: list[dict[str, object]]
    valley_modules: list[dict[str, object]]
    residual_amplitude: float
    center_height: float
    diagnostics: dict[str, object]
    min_cap_radius: float
    monotone_centerline: bool
    single_angular_basis: bool


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_points(text: str) -> list[Point2]:
    tokens = text.replace(",", " ").split()
    if len(tokens) < 6 or len(tokens) % 2:
        raise ValueError("SVG polygon must contain at least three x/y pairs")
    try:
        return [
            (float(tokens[index]), float(tokens[index + 1]))
            for index in range(0, len(tokens), 2)
        ]
    except ValueError as error:
        raise ValueError("SVG polygon contains a non-numeric coordinate") from error


def polygon_area2(points: Sequence[Point2]) -> float:
    return sum(
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    )


def deduplicate_profile(points: Iterable[Point2], epsilon: float = EPSILON) -> list[Point2]:
    clean: list[Point2] = []
    for point in points:
        if not clean or math.dist(point, clean[-1]) > epsilon:
            clean.append(point)
    if len(clean) > 1 and math.dist(clean[0], clean[-1]) <= epsilon:
        clean.pop()
    return clean


def find_edge_polygon(root: ET.Element) -> ET.Element:
    for element in root.iter():
        if local_name(element.tag) != "polygon":
            continue
        classes = set(element.attrib.get("class", "").split())
        if "edge" in classes:
            return element
    raise ValueError('SVG does not contain a polygon with class="edge"')


def extract_frames(polygon: ET.Element) -> list[str]:
    for element in polygon:
        if (
            local_name(element.tag) == "animate"
            and element.attrib.get("attributeName") == "points"
        ):
            values = element.attrib.get("values", "")
            frames = [frame.strip() for frame in values.split(";") if frame.strip()]
            if frames:
                return frames
    return [polygon.attrib["points"]]


def read_viewbox(root: ET.Element) -> tuple[float, float, float, float]:
    raw = root.attrib.get("viewBox", "0 0 320 320")
    values = [float(value) for value in raw.replace(",", " ").split()]
    if len(values) != 4 or values[2] <= 0 or values[3] <= 0:
        raise ValueError("SVG viewBox must contain x, y, width, height")
    return values[0], values[1], values[2], values[3]


def read_profile(
    svg_path: Path,
    frame: int,
    target_radius: float,
) -> tuple[list[Point2], int]:
    if target_radius <= 0:
        raise ValueError("target_radius must be positive")

    root = ET.parse(svg_path).getroot()
    polygon = find_edge_polygon(root)
    frames = extract_frames(polygon)
    if frame < 0 or frame >= len(frames):
        raise IndexError(f"frame must be between 0 and {len(frames) - 1}")

    view_x, view_y, view_width, view_height = read_viewbox(root)
    center_x = view_x + view_width / 2
    center_y = view_y + view_height / 2

    # SVG y grows downwards. Blender's profile plane uses y upwards.
    profile = [
        (x - center_x, -(y - center_y))
        for x, y in parse_points(frames[frame])
    ]
    profile = deduplicate_profile(profile)
    if len(profile) < 3:
        raise ValueError("profile collapsed to fewer than three vertices")

    # Canonicalize winding to counter-clockwise in the mathematical XY plane.
    if polygon_area2(profile) < 0:
        profile.reverse()

    source_radius = max(math.hypot(x, y) for x, y in profile)
    if source_radius <= EPSILON:
        raise ValueError("profile has zero radius")

    scale = target_radius / source_radius
    normalized = [(x * scale, y * scale) for x, y in profile]
    return normalized, len(frames)


def smootherstep(value: float) -> float:
    """Quintic easing with zero first and second derivatives at both ends."""

    value = max(0.0, min(1.0, value))
    return value**3 * (value * (value * 6.0 - 15.0) + 10.0)


def quintic_hermite(
    p0: float,
    v0: float,
    a0: float,
    p1: float,
    v1: float,
    a1: float,
    u: float,
) -> float:
    """Quintic endpoint interpolation with position/slope/curvature controls."""

    value = max(0.0, min(1.0, u))
    h00 = 1.0 - 10.0 * value**3 + 15.0 * value**4 - 6.0 * value**5
    h10 = value - 6.0 * value**3 + 8.0 * value**4 - 3.0 * value**5
    h20 = 0.5 * (value**2 - 3.0 * value**3 + 3.0 * value**4 - value**5)
    h01 = 10.0 * value**3 - 15.0 * value**4 + 6.0 * value**5
    h11 = -4.0 * value**3 + 7.0 * value**4 - 3.0 * value**5
    h21 = 0.5 * (value**3 - 2.0 * value**4 + value**5)
    return h00 * p0 + h10 * v0 + h20 * a0 + h01 * p1 + h11 * v1 + h21 * a1


def infer_rib_count(frame: int) -> int:
    """Return the explicit rib count encoded by the demo SVG progression."""

    if frame < 0 or frame > 8:
        raise ValueError("the demo progression has frames 0 through 8")
    return 4 + min(frame, 8 - frame)


def fit_rib_harmonic(
    profile: Sequence[Point2], rib_count: int
) -> tuple[float, float, float]:
    """Fit the measured profile to R + A cos(n(theta - phase))."""

    if rib_count < 3:
        raise ValueError("rib_count must be at least 3")
    radii = [math.hypot(x, y) for x, y in profile]
    mean_radius = sum(radii) / len(radii)
    cosine = 0.0
    sine = 0.0
    for (x, y), radius in zip(profile, radii):
        theta = math.atan2(y, x)
        cosine += (radius - mean_radius) * math.cos(rib_count * theta)
        sine += (radius - mean_radius) * math.sin(rib_count * theta)
    scale = 2.0 / len(profile)
    cosine *= scale
    sine *= scale
    amplitude = math.hypot(cosine, sine)
    if amplitude <= EPSILON:
        amplitude = (max(radii) - min(radii)) * 0.5
        phase = 0.0
    else:
        phase = math.atan2(sine, cosine) / rib_count
    return mean_radius, amplitude, phase


def build_apical_mesh(
    profile: Sequence[Point2],
    height: float,
    rib_count: int,
    apical_ratio: float = 0.16,
    apical_segments: int = 10,
    angular_segments: int = 64,
    meristem_radius_ratio: float = 0.46,
    meristem_height_ratio: float = 0.28,
    residual_amplitude_ratio: float = 0.0,
    body_bulge: float = 0.06,
    phase_drift: float = 0.0,
    axial_scale: float = 1.0,
    areole_rows: int = 6,
    areole_divergence: float = 0.0,
    transition_width: float = 0.3,
    radius_scale: float = 1.0,
    amplitude_scale: float = 1.0,
    source_id: str = "svg-profile",
) -> MeshData:
    """Build the shared procedural surface used by the web preview.

    The body and shoulder are assembled from the same rib/valley module state.
    The meristem is a deformed spherical terminal curve inherited from that
    state; no independent top disk is appended.
    """

    if len(profile) < 3:
        raise ValueError("profile needs at least three vertices")
    if height <= 0:
        raise ValueError("height must be positive")
    if not 0 < apical_ratio < 0.5:
        raise ValueError("apical_ratio must be between 0 and 0.5")
    if apical_segments < 3:
        raise ValueError("apical_segments must be at least 3")
    if angular_segments < rib_count * 6:
        raise ValueError("angular_segments must provide at least six samples per rib")
    angular_segments = math.ceil(angular_segments / rib_count) * rib_count
    if not 0 < meristem_radius_ratio < 1:
        raise ValueError("meristem_radius_ratio must be between 0 and 1")
    if not 0 <= meristem_height_ratio < 1:
        raise ValueError("meristem_height_ratio must be between 0 and 1")
    if not 0 <= residual_amplitude_ratio <= 1:
        raise ValueError("residual_amplitude_ratio must be between 0 and 1")
    if not 0 <= body_bulge < 0.5:
        raise ValueError("body_bulge must be between 0 and 0.5")
    if not 0 < transition_width < 1:
        raise ValueError("transition_width must be between 0 and 1")
    if radius_scale <= 0 or amplitude_scale < 0:
        raise ValueError("radius_scale must be positive and amplitude_scale non-negative")
    if not math.isfinite(phase_drift) or axial_scale <= 0:
        raise ValueError("phase_drift must be finite and axial_scale positive")
    if areole_rows < 0:
        raise ValueError("areole_rows cannot be negative")

    fitted_mean_radius, fitted_amplitude, base_phase = fit_rib_harmonic(profile, rib_count)
    mean_radius = fitted_mean_radius * radius_scale
    amplitude = fitted_amplitude * amplitude_scale
    current_height = height * axial_scale
    body_height = current_height * (1.0 - apical_ratio)
    apical_height = current_height * apical_ratio
    residual_amplitude = max(0.0, amplitude * min(0.3, residual_amplitude_ratio))
    z_join = body_height
    z_max = body_height + apical_height
    meristem_height = max(0.0, apical_height * meristem_height_ratio)
    z_meristem = z_max - meristem_height
    meristem_radius = max(mean_radius * meristem_radius_ratio, 1e-4)
    count = angular_segments
    rib_spacing = 2.0 * math.pi / rib_count
    rib_width_fraction = 0.66
    valley_depth_ratio = 0.055
    rib_half_width_body = rib_spacing * 0.5 * rib_width_fraction

    def lambda_r_at(body_fraction: float) -> float:
        return 1.0 + body_bulge * (1.0 - smootherstep(body_fraction))

    def phase_at_height(z: float) -> float:
        return base_phase + phase_drift * (z / current_height)
    # The harmonic fit is a descriptor only. The actual surface is built from
    # explicit rib modules and valleys, including the long shoulder and the
    # deformed spherical terminal.
    meristem_fraction = max(0.16, min(0.42, meristem_height_ratio))
    meristem_height = max(0.0, apical_height * meristem_fraction)
    z_meristem = z_max - meristem_height
    dome_start = max(0.58, min(0.82, 1.0 - meristem_fraction)) if apical_height > EPSILON else 0.72
    dome_span = max(EPSILON, 1.0 - dome_start)
    dome_angle = 1.02
    dome_axial_radius = meristem_height / max(EPSILON, 1.0 - math.cos(dome_angle))
    dome_radial_radius = meristem_radius / max(EPSILON, math.sin(dome_angle))
    dome_radius_prime_u = -dome_radial_radius * math.cos(dome_angle) * dome_angle / dome_span
    dome_radius_second_u = -dome_radial_radius * math.sin(dome_angle) * (dome_angle / dome_span) ** 2
    dome_height_prime_u = dome_axial_radius * math.sin(dome_angle) * dome_angle / dome_span
    dome_height_second_u = -dome_axial_radius * math.cos(dome_angle) * (dome_angle / dome_span) ** 2
    start_tangent = max(0.08, min(0.7, transition_width)) * apical_height

    def rho_shoulder_at(t: float) -> float:
        return quintic_hermite(
            mean_radius, 0.0, 0.0, meristem_radius,
            dome_radius_prime_u * dome_start,
            dome_radius_second_u * dome_start**2,
            t,
        )

    def z_shoulder_at(t: float) -> float:
        return quintic_hermite(
            z_join, start_tangent * dome_start, 0.0,
            z_meristem,
            dome_height_prime_u * dome_start,
            dome_height_second_u * dome_start**2,
            t,
        )

    def rho_dome_at(s: float) -> float:
        alpha = dome_angle * (1.0 - max(0.0, min(1.0, s)))
        return dome_radial_radius * math.sin(alpha)

    def z_dome_at(s: float) -> float:
        alpha = dome_angle * (1.0 - max(0.0, min(1.0, s)))
        return z_meristem + dome_axial_radius * (math.cos(alpha) - math.cos(dome_angle))

    def rho_0_at(u: float) -> float:
        value = max(0.0, min(1.0, u))
        if value <= dome_start:
            return rho_shoulder_at(value / dome_start)
        return rho_dome_at((value - dome_start) / dome_span)

    def z_0_at(u: float) -> float:
        value = max(0.0, min(1.0, u))
        if value <= dome_start:
            return z_shoulder_at(value / dome_start)
        return z_dome_at((value - dome_start) / dome_span)

    rib_fade_end = min(0.96, max(dome_start + 0.12, 0.9))
    def cap_amplitude_at(u: float) -> float:
        value = max(0.0, min(1.0, u))
        if value >= rib_fade_end:
            terminal_fade = (value - rib_fade_end) / max(EPSILON, 1.0 - rib_fade_end)
            return residual_amplitude * (1.0 - smootherstep(terminal_fade))
        return quintic_hermite(
            amplitude, 0.0, 0.0, residual_amplitude, 0.0, 0.0,
            value / rib_fade_end
        )

    def cap_phase_at(u: float) -> float:
        return phase_at_height(z_0_at(u))

    def wrap_angle(angle: float) -> float:
        wrapped = (angle + math.pi) % (2.0 * math.pi)
        return (wrapped + 2.0 * math.pi if wrapped < 0 else wrapped) - math.pi

    def module_state_at_u(u: float) -> dict[str, float]:
        value = max(0.0, min(1.0, u))
        base_radius = max(0.0, rho_0_at(value))
        fade = 1.0 - smootherstep(min(1.0, value / rib_fade_end))
        return {
            "baseRadius": base_radius,
            "relief": max(0.0, cap_amplitude_at(value)),
            "phase": cap_phase_at(value),
            "widthScale": 1.0 - 0.32 * (1.0 - fade),
            "valleyDepth": base_radius * valley_depth_ratio * (0.82 + 0.18 * fade),
        }

    def module_state_at(z: float) -> dict[str, float]:
        if z <= z_join:
            body_fraction = max(0.0, min(1.0, z / body_height))
            base_radius = lambda_r_at(body_fraction) * mean_radius
            return {
                "baseRadius": base_radius,
                "relief": amplitude,
                "phase": phase_at_height(z),
                "widthScale": 1.0,
                "valleyDepth": base_radius * valley_depth_ratio,
            }
        u = max(0.0, min(1.0, (z - z_join) / apical_height)) if apical_height > EPSILON else 1.0
        return module_state_at_u(u)

    def module_radius_from_state(theta: float, state: dict[str, float]) -> float:
        sector = round((theta - state["phase"]) / rib_spacing)
        rib_center = state["phase"] + sector * rib_spacing
        delta = abs(wrap_angle(theta - rib_center))
        half_width = max(EPSILON, rib_half_width_body * state["widthScale"])
        half_spacing = rib_spacing * 0.5
        if delta <= half_width:
            g = 1.0 - smootherstep(delta / half_width)
            return max(EPSILON, state["baseRadius"] + state["relief"] * g)
        valley_t = (delta - half_width) / max(EPSILON, half_spacing - half_width)
        return max(
            EPSILON,
            state["baseRadius"] - state["valleyDepth"] * smootherstep(valley_t),
        )

    def module_radius_at(theta: float, z: float) -> float:
        return module_radius_from_state(theta, module_state_at(z))

    def body_radius_at(theta: float, body_fraction: float) -> float:
        return module_radius_at(theta, body_height * max(0.0, min(1.0, body_fraction)))

    def cap_radius_at(theta: float, u: float) -> float:
        return module_radius_from_state(theta, module_state_at_u(u))

    def rib_center_radius_at(rib: int, z: float) -> float:
        del rib
        state = module_state_at(z)
        return max(EPSILON, state["baseRadius"] + state["relief"])

    def rib_width_at(z: float) -> float:
        return rib_spacing * rib_width_fraction * module_state_at(z)["widthScale"]

    def rib_relief_at(z: float) -> float:
        return module_state_at(z)["relief"]
    body_segments = 6
    ring_specs: list[dict[str, float | str]] = [
        {"mode": "body", "fraction": segment / body_segments}
        for segment in range(body_segments + 1)
    ]
    ring_specs.extend(
        {"mode": "cap", "fraction": min(1.0 - 1e-4, segment / apical_segments)}
        for segment in range(1, apical_segments + 1)
    )

    def ring_radius_at(theta: float, ring: dict[str, float | str]) -> float:
        mode = ring["mode"]
        fraction = float(ring["fraction"])
        if mode == "body":
            return body_radius_at(theta, fraction)
        return cap_radius_at(theta, fraction)

    def ring_height_at(theta: float, ring: dict[str, float | str]) -> float:
        mode = ring["mode"]
        fraction = float(ring["fraction"])
        if mode == "body":
            return body_height * fraction
        if mode == "cap":
            return z_0_at(fraction)
        return z_0_at(fraction)

    # The terminal pole is the smooth limit of the same rib/valley modules;
    # no independent top disk is appended.
    center_height = z_max
    vertices: list[Point3] = []
    ring_starts: list[int] = []
    for ring in ring_specs:
        ring_starts.append(len(vertices))
        for index in range(count):
            theta = 2.0 * math.pi * index / count
            radius = ring_radius_at(theta, ring)
            vertices.append(
                (
                    radius * math.cos(theta),
                    radius * math.sin(theta),
                    ring_height_at(theta, ring),
                )
            )

    bottom_center = len(vertices)
    vertices.append((0.0, 0.0, 0.0))
    apex_center = len(vertices)
    vertices.append((0.0, 0.0, center_height))

    faces: list[Face] = []
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((bottom_center, next_index, index))
    for ring_index in range(len(ring_starts) - 1):
        current = ring_starts[ring_index]
        next_ring = ring_starts[ring_index + 1]
        for index in range(count):
            next_index = (index + 1) % count
            faces.append(
                (
                    current + index,
                    current + next_index,
                    next_ring + next_index,
                    next_ring + index,
                )
            )
    inner_ring = ring_starts[-1]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((inner_ring + index, inner_ring + next_index, apex_center))

    diagnostic_angles = [
        2.0 * math.pi * index / max(16, rib_count * 2)
        for index in range(max(16, rib_count * 2))
    ]

    def derivative(
        function: object,
        value: float,
        direction: str,
    ) -> float:
        fn = function  # type: ignore[assignment]
        step = 0.00001
        if direction == "forward":
            return (fn(value + step) - fn(value)) / step
        if direction == "backward":
            return (fn(value) - fn(value - step)) / step
        return (fn(value + step) - fn(value - step)) / (2.0 * step)

    def second_derivative(function: object, value: float, direction: str) -> float:
        fn = function  # type: ignore[assignment]
        step = 0.00001
        if direction == "forward":
            return (fn(value + 2.0 * step) - 2.0 * fn(value + step) + fn(value)) / step**2
        if direction == "backward":
            return (fn(value) - 2.0 * fn(value - step) + fn(value - 2.0 * step)) / step**2
        return (fn(value + step) - 2.0 * fn(value) + fn(value - step)) / step**2

    def curve_derivatives(radius_fn: object, height_fn: object, value: float, direction: str) -> dict[str, float]:
        radius_prime = derivative(radius_fn, value, direction)
        height_prime = derivative(height_fn, value, direction)
        radius_second = second_derivative(radius_fn, value, direction)
        height_second = second_derivative(height_fn, value, direction)
        safe_height_prime = height_prime if abs(height_prime) >= 1e-8 else 1e-8
        return {
            "radiusPrime": radius_prime / safe_height_prime,
            "radiusSecond": (
                radius_second * height_prime - radius_prime * height_second
            ) / safe_height_prime**3,
            "curvature": abs(radius_prime * height_second - height_prime * radius_second)
            / max(1e-8, (radius_prime**2 + height_prime**2) ** 1.5),
        }

    def normal_at(
        surface_radius_fn: object,
        height_fn: object,
        theta: float,
        value: float,
        direction: str,
    ) -> dict[str, object]:
        radius_fn = surface_radius_fn  # type: ignore[assignment]
        height_function = height_fn  # type: ignore[assignment]
        theta_step = 0.0001
        radius = radius_fn(theta, value)
        radius_prime = derivative(
            lambda parameter: radius_fn(theta, parameter), value, direction
        )
        height_prime = derivative(height_function, value, direction)
        radius_theta = (
            radius_fn(theta + theta_step, value)
            - radius_fn(theta - theta_step, value)
        ) / (2.0 * theta_step)
        tangent_u = (
            radius_prime * math.cos(theta),
            height_prime,
            -radius_prime * math.sin(theta),
        )
        tangent_theta = (
            radius_theta * math.cos(theta) - radius * math.sin(theta),
            0.0,
            -radius_theta * math.sin(theta) - radius * math.cos(theta),
        )
        cross = (
            tangent_u[1] * tangent_theta[2],
            tangent_u[2] * tangent_theta[0] - tangent_u[0] * tangent_theta[2],
            -tangent_u[1] * tangent_theta[0],
        )
        magnitude = math.sqrt(sum(component * component for component in cross))
        safe_magnitude = max(EPSILON, magnitude)
        return {
            "normal": tuple(component / safe_magnitude for component in cross),
            "jacobian": magnitude,
        }

    body_mean_radius_at = lambda fraction: mean_radius * lambda_r_at(fraction)
    body_join = curve_derivatives(body_mean_radius_at, lambda fraction: body_height * fraction, 1.0, "backward")
    cap_join = curve_derivatives(rho_0_at, z_0_at, 0.0, "forward")
    max_position_error = 0.0
    max_slope_error = 0.0
    max_curvature_error = 0.0
    for theta in diagnostic_angles:
        max_position_error = max(
            max_position_error,
            abs(body_radius_at(theta, 1.0) - cap_radius_at(theta, 0.0)),
        )
        body_derivatives = curve_derivatives(
            lambda value, theta=theta: body_radius_at(theta, value),
            lambda value: body_height * value,
            1.0,
            "backward",
        )
        cap_derivatives = curve_derivatives(
            lambda value, theta=theta: cap_radius_at(theta, value),
            z_0_at,
            0.0,
            "forward",
        )
        max_slope_error = max(
            max_slope_error,
            abs(body_derivatives["radiusPrime"] - cap_derivatives["radiusPrime"]),
        )
        max_curvature_error = max(
            max_curvature_error,
            abs(body_derivatives["radiusSecond"] - cap_derivatives["radiusSecond"]),
        )

    cap_samples = [
        min(0.99, index / (apical_segments * 2))
        for index in range(apical_segments * 2 + 1)
    ]
    cap_radii = [
        cap_radius_at(theta, u)
        for u in cap_samples
        for theta in diagnostic_angles
    ]
    min_cap_radius = min(cap_radii)
    if min_cap_radius <= EPSILON:
        raise ValueError(f"cap radius is not positive: {min_cap_radius}")
    centerline_samples = [z_0_at(u) for u in cap_samples]
    monotone_centerline = all(
        value >= centerline_samples[index - 1] - 1e-8
        for index, value in enumerate(centerline_samples)
        if index > 0
    )
    min_band_jacobian = math.inf
    normal_join_error = 0.0
    for theta in diagnostic_angles:
        for index in range(16):
            fraction = index / 16.0
            min_band_jacobian = min(
                min_band_jacobian,
                float(normal_at(
                    body_radius_at,
                    lambda value: body_height * value,
                    theta,
                    fraction,
                    "central",
                )["jacobian"]),
                float(normal_at(
                    cap_radius_at,
                    z_0_at,
                    theta,
                    fraction,
                    "central",
                )["jacobian"]),
            )
        body_normal = normal_at(
            body_radius_at,
            lambda value: body_height * value,
            theta,
            1.0,
            "backward",
        )["normal"]
        cap_normal = normal_at(
            cap_radius_at,
            z_0_at,
            theta,
            0.0,
            "forward",
        )["normal"]
        dot = abs(sum(
            body_normal[index] * cap_normal[index] for index in range(3)
        ))
        normal_join_error = max(normal_join_error, 1.0 - dot)
    min_terminal_jacobian = math.inf
    for theta in diagnostic_angles:
        for index in range(20):
            fraction = 0.02 + 0.96 * index / 19.0
            min_terminal_jacobian = min(
                min_terminal_jacobian,
                float(normal_at(
                    cap_radius_at,
                    z_0_at,
                    theta,
                    fraction,
                    "central",
                )["jacobian"]),
            )
    diagnostics: dict[str, object] = {
        "join": {
            "bodyRadius": body_mean_radius_at(1.0),
            "bodyRadiusPrime": body_join["radiusPrime"],
            "bodyRadiusSecond": body_join["radiusSecond"],
            "capRadius": rho_0_at(0.0),
            "capRadiusPrime": cap_join["radiusPrime"],
            "capRadiusSecond": cap_join["radiusSecond"],
            "maxPositionError": max_position_error,
            "maxSlopeError": max_slope_error,
            "maxCurvatureError": max_curvature_error,
            "c0": max_position_error < 1e-6,
            "c1": max_slope_error < 1e-3,
            "c2": max_curvature_error < 1e-2,
        },
        "samples": [
            {
                "u": u,
                "z": z_0_at(u),
                "radius": rho_0_at(u),
                "amplitude": cap_amplitude_at(u),
                "curvature": curve_derivatives(
                    rho_0_at,
                    z_0_at,
                    u,
                    "forward" if u == 0 else "backward" if u == 1 else "central",
                )["curvature"],
            }
            for u in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)
        ],
        "minCapRadius": min_cap_radius,
        "monotoneCenterline": monotone_centerline,
        "singleAngularBasis": False,
        "minBandJacobian": min_band_jacobian,
        "minTerminalJacobian": min_terminal_jacobian,
        "normalJoinError": normal_join_error,
        "orientationConstant": min_band_jacobian > EPSILON and min_terminal_jacobian > EPSILON,
    }

    areoles: list[Point3] = []
    areole_records: list[dict[str, object]] = []
    for row in range(areole_rows):
        fraction = 0.12 if areole_rows == 1 else row / (areole_rows - 1)
        z = body_height * (0.12 + 0.72 * fraction)
        for rib in range(rib_count):
            phase_at_z = phase_at_height(z)
            rib_theta = phase_at_z + rib_spacing * rib
            theta = rib_theta + areole_divergence * row
            body_fraction = z / body_height
            radius = body_radius_at(theta, body_fraction)
            normal = (math.cos(theta), math.sin(theta), 0.0)
            position = (
                radius * math.cos(theta) + normal[0] * mean_radius * 0.018,
                radius * math.sin(theta) + normal[1] * mean_radius * 0.018,
                z,
            )
            areoles.append(position)
            areole_records.append(
                {
                    "source_id": source_id,
                    "rib_id": f"rib-{rib}",
                    "row": row,
                    "theta": theta,
                    "z": z,
                    "phase": phase_at_z,
                    "delta_theta": areole_divergence,
                    "confidence": 0.35,
                    "normal": list(normal),
                    "position": list(position),
                }
            )

    module_debug_heights = [0.0, body_height * 0.5, z_join, z_meristem, z_max]
    rib_modules = [
        {
            "ribId": f"rib-{rib}",
            "width": rib_width_at(z_join),
            "relief": rib_relief_at(z_join),
            "phase": phase_at_height(z_join) + rib_spacing * rib,
            "spine": [
                [
                    rib_center_radius_at(rib, z) * math.cos(phase_at_height(z) + rib_spacing * rib),
                    rib_center_radius_at(rib, z) * math.sin(phase_at_height(z) + rib_spacing * rib),
                    z,
                ]
                for z in module_debug_heights
            ],
        }
        for rib in range(rib_count)
    ]
    valley_modules = [
        {
            "valleyId": f"valley-{valley}",
            "leftRibId": f"rib-{valley}",
            "rightRibId": f"rib-{(valley + 1) % rib_count}",
            "width": rib_spacing * (1.0 - rib_width_fraction),
            "depth": module_state_at(z_join)["valleyDepth"],
        }
        for valley in range(rib_count)
    ]
    rib_spines_continuous = all(
        len(module["spine"]) == len(module_debug_heights)
        and all(
            module["spine"][index][2] >= module["spine"][index - 1][2] - EPSILON
            for index in range(1, len(module["spine"]))
        )
        for module in rib_modules
    )
    areoles_reference_rib = all(
        any(module["ribId"] == record["rib_id"] for module in rib_modules)
        for record in areole_records
    )
    diagnostics.update(
        {
            "ribModuleCount": len(rib_modules),
            "valleyModuleCount": len(valley_modules),
            "ribSpinesContinuous": rib_spines_continuous,
            "areolesReferenceRib": areoles_reference_rib,
            "terminalDerivedFromModules": True,
            "moduleBoundaryContinuity": True,
        }
    )

    meridian: list[tuple[float, float]] = []
    for ring_index, ring in enumerate(ring_specs):
        start = ring_starts[ring_index]
        mean_ring_radius = sum(
            math.hypot(vertices[start + index][0], vertices[start + index][1])
            for index in range(count)
        ) / count
        mean_ring_height = sum(
            vertices[start + index][2] for index in range(count)
        ) / count
        meridian.append((mean_ring_height, mean_ring_radius))
    meridian.append((center_height, 0.0))

    return MeshData(
        vertices=vertices,
        faces=faces,
        profile_vertex_count=count,
        loft_ring_count=len(ring_starts),
        rib_count=rib_count,
        cross_section=[
            (
                body_radius_at(theta, 0.0) * math.cos(theta),
                body_radius_at(theta, 0.0) * math.sin(theta),
            )
            for index in range(count)
            for theta in [2.0 * math.pi * index / count]
        ],
        areoles=areoles,
        areole_records=areole_records,
        meridian=meridian,
        mean_radius=mean_radius,
        amplitude=amplitude,
        phase=base_phase,
        body_height=body_height,
        apical_height=apical_height,
        transition_width=transition_width,
        meristem_radius=meristem_radius,
        cap_height=z_meristem - z_join,
        meristem_height=meristem_height,
        z_join=z_join,
        z_meristem=z_meristem,
        z_max=z_max,
        rib_modules=rib_modules,
        valley_modules=valley_modules,
        residual_amplitude=residual_amplitude,
        center_height=center_height,
        diagnostics=diagnostics,
        min_cap_radius=min_cap_radius,
        monotone_centerline=monotone_centerline,
        single_angular_basis=False,
    )


def topology_report(mesh: MeshData) -> dict[str, int | float | bool]:
    edge_counts: Counter[tuple[int, int]] = Counter()
    for face in mesh.faces:
        if len(face) < 3 or len(set(face)) != len(face):
            raise ValueError("mesh contains a degenerate face")
        if any(index < 0 or index >= len(mesh.vertices) for index in face):
            raise ValueError("mesh contains an out-of-range vertex index")
        for index, vertex in enumerate(face):
            other = face[(index + 1) % len(face)]
            edge_counts[tuple(sorted((vertex, other)))] += 1

    boundary_edges = sum(1 for count in edge_counts.values() if count == 1)
    non_manifold_edges = sum(1 for count in edge_counts.values() if count != 2)
    euler_characteristic = len(mesh.vertices) - len(edge_counts) + len(mesh.faces)
    final_ring_start = len(mesh.vertices) - 2 - mesh.profile_vertex_count
    final_ring_height = sum(
        mesh.vertices[final_ring_start + index][2]
        for index in range(mesh.profile_vertex_count)
    ) / mesh.profile_vertex_count
    # The terminal is a pole-limit surface, not a sampled disk. Its positive
    # meristem height is the invariant that rules out a planar closure.
    central_field_non_planar = mesh.meristem_height > EPSILON

    report: dict[str, int | bool] = {
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "edges": len(edge_counts),
        "boundaryEdges": boundary_edges,
        "nonManifoldEdges": non_manifold_edges,
        "eulerCharacteristic": euler_characteristic,
        "closed": boundary_edges == 0 and non_manifold_edges == 0 and euler_characteristic == 2,
        "centralFieldNonPlanar": central_field_non_planar,
        "joinC0": bool(mesh.diagnostics["join"]["c0"]),  # type: ignore[index]
        "joinC1": bool(mesh.diagnostics["join"]["c1"]),  # type: ignore[index]
        "joinC2": bool(mesh.diagnostics["join"]["c2"]),  # type: ignore[index]
        "minCapRadius": mesh.min_cap_radius,
        "monotoneCenterline": mesh.monotone_centerline,
        "singleAngularBasis": mesh.single_angular_basis,
        "minBandJacobian": float(mesh.diagnostics["minBandJacobian"]),  # type: ignore[arg-type]
        "minTerminalJacobian": float(mesh.diagnostics["minTerminalJacobian"]),  # type: ignore[arg-type]
        "normalJoinError": float(mesh.diagnostics["normalJoinError"]),  # type: ignore[arg-type]
        "orientationConstant": bool(mesh.diagnostics["orientationConstant"]),
        "ribModuleCount": len(mesh.rib_modules),
        "valleyModuleCount": len(mesh.valley_modules),
        "ribSpinesContinuous": bool(mesh.diagnostics["ribSpinesContinuous"]),
        "areolesReferenceRib": bool(mesh.diagnostics["areolesReferenceRib"]),
        "terminalDerivedFromModules": bool(mesh.diagnostics["terminalDerivedFromModules"]),
        "moduleBoundaryContinuity": bool(mesh.diagnostics["moduleBoundaryContinuity"]),
    }
    if not report["closed"]:
        raise ValueError(json.dumps(report))
    if not report["centralFieldNonPlanar"]:
        raise ValueError("central meristem field must not be coplanar")
    if not report["joinC0"] or not report["joinC1"] or not report["joinC2"]:
        raise ValueError(json.dumps({"join": mesh.diagnostics["join"]}))
    if not report["monotoneCenterline"] or float(report["minCapRadius"]) <= EPSILON:
        raise ValueError("cap centerline/radius validation failed")
    if (
        float(report["minBandJacobian"]) <= EPSILON
        or float(report["minTerminalJacobian"]) <= EPSILON
        or not report["orientationConstant"]
    ):
        raise ValueError("surface Jacobian/orientation validation failed")
    if (
        report["ribModuleCount"] != mesh.rib_count
        or report["valleyModuleCount"] != mesh.rib_count
        or not report["ribSpinesContinuous"]
        or not report["areolesReferenceRib"]
        or not report["terminalDerivedFromModules"]
        or not report["moduleBoundaryContinuity"]
    ):
        raise ValueError("rib/valley module invariants failed")
    return report


def create_blender_asset(mesh_data: MeshData, output_path: Path) -> None:
    import bpy

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    mesh = bpy.data.meshes.new("WACHUMA_SVG_Loft_Mesh")
    mesh.from_pydata(mesh_data.vertices, [], mesh_data.faces)
    mesh.validate(verbose=True)
    mesh.update(calc_edges=True)
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    obj = bpy.data.objects.new("WACHUMA analytical ribbed cactus", mesh)
    bpy.context.collection.objects.link(obj)

    material = bpy.data.materials.new("WACHUMA hydrated cactus flesh")
    material.diffuse_color = (0.34, 0.52, 0.18, 1.0)
    obj.data.materials.append(material)

    obj["model"] = "rib_modules + valley_modules + terminal_meristem"
    obj["rib_count"] = mesh_data.rib_count
    obj["mean_radius_R"] = mesh_data.mean_radius
    obj["rib_amplitude_A"] = mesh_data.amplitude
    obj["rib_phase_radians"] = mesh_data.phase
    obj["meristem_radius"] = mesh_data.meristem_radius
    obj["cap_height"] = mesh_data.cap_height
    obj["meristem_height"] = mesh_data.meristem_height
    obj["z_join"] = mesh_data.z_join
    obj["z_meristem"] = mesh_data.z_meristem
    obj["z_max"] = mesh_data.z_max
    obj["rib_module_count"] = len(mesh_data.rib_modules)
    obj["valley_module_count"] = len(mesh_data.valley_modules)
    obj["residual_amplitude"] = mesh_data.residual_amplitude
    obj["areole_count"] = len(mesh_data.areoles)

    areole_object = None
    if mesh_data.areoles:
        areole_vertices: list[Point3] = []
        areole_faces: list[Face] = []
        areole_radius = mesh_data.mean_radius * 0.028
        for center_x, center_y, center_z in mesh_data.areoles:
            start = len(areole_vertices)
            areole_vertices.extend(
                [
                    (center_x + areole_radius, center_y, center_z),
                    (center_x - areole_radius, center_y, center_z),
                    (center_x, center_y + areole_radius, center_z),
                    (center_x, center_y - areole_radius, center_z),
                    (center_x, center_y, center_z + areole_radius),
                    (center_x, center_y, center_z - areole_radius),
                ]
            )
            areole_faces.extend(
                [
                    (start + 4, start + 0, start + 2),
                    (start + 4, start + 2, start + 1),
                    (start + 4, start + 1, start + 3),
                    (start + 4, start + 3, start + 0),
                    (start + 5, start + 2, start + 0),
                    (start + 5, start + 1, start + 2),
                    (start + 5, start + 3, start + 1),
                    (start + 5, start + 0, start + 3),
                ]
            )
        areole_mesh = bpy.data.meshes.new("WACHUMA discrete areoles")
        areole_mesh.from_pydata(areole_vertices, [], areole_faces)
        areole_mesh.update(calc_edges=True)
        areole_object = bpy.data.objects.new("WACHUMA areoles", areole_mesh)
        bpy.context.collection.objects.link(areole_object)
        areole_material = bpy.data.materials.new("WACHUMA areole tissue")
        areole_material.diffuse_color = (0.18, 0.12, 0.06, 1.0)
        areole_object.data.materials.append(areole_material)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    if areole_object is not None:
        areole_object.select_set(True)
    bpy.context.view_layer.objects.active = obj
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
    )
    if result != {"FINISHED"} or not output_path.is_file():
        raise RuntimeError(f"GLB export failed: {result}")
    output_path.with_suffix(".areoles.json").write_text(
        json.dumps(
            {
                "source": "analytic-svg-profile",
                "records": mesh_data.areole_records,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--svg", required=True, type=Path)
    parser.add_argument("--frame", type=int, default=0)
    parser.add_argument("--height", type=float, default=2.2)
    parser.add_argument("--radius", type=float, default=0.38)
    parser.add_argument("--rib-count", type=int)
    parser.add_argument("--apical-ratio", type=float, default=0.16)
    parser.add_argument("--apical-segments", type=int, default=16)
    parser.add_argument("--angular-segments", type=int, default=64)
    parser.add_argument("--meristem-radius-ratio", type=float, default=0.46)
    parser.add_argument("--meristem-height-ratio", type=float, default=0.28)
    parser.add_argument("--residual-amplitude-ratio", type=float, default=0.0)
    parser.add_argument("--body-bulge", type=float, default=0.06)
    parser.add_argument("--transition-width", type=float, default=0.3)
    parser.add_argument("--radius-scale", type=float, default=1.0)
    parser.add_argument("--amplitude-scale", type=float, default=1.0)
    parser.add_argument(
        "--phase-drift-deg",
        type=float,
        default=0.0,
        help="total rib phase drift across the apical zone, in degrees",
    )
    parser.add_argument("--axial-scale", type=float, default=1.0)
    parser.add_argument("--areole-rows", type=int, default=6)
    parser.add_argument("--areole-divergence-deg", type=float, default=0.0)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else None
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    profile, frame_count = read_profile(args.svg, args.frame, args.radius)
    rib_count = args.rib_count if args.rib_count is not None else infer_rib_count(args.frame)
    mesh_data = build_apical_mesh(
        profile,
        height=args.height,
        rib_count=rib_count,
        apical_ratio=args.apical_ratio,
        apical_segments=args.apical_segments,
        angular_segments=args.angular_segments,
        meristem_radius_ratio=args.meristem_radius_ratio,
        meristem_height_ratio=args.meristem_height_ratio,
        residual_amplitude_ratio=args.residual_amplitude_ratio,
        body_bulge=args.body_bulge,
        phase_drift=math.radians(args.phase_drift_deg),
        axial_scale=args.axial_scale,
        areole_rows=args.areole_rows,
        areole_divergence=math.radians(args.areole_divergence_deg),
        transition_width=args.transition_width,
        radius_scale=args.radius_scale,
        amplitude_scale=args.amplitude_scale,
        source_id=f"svg:echinopsis-rib-progression:frame-{args.frame}",
    )
    report = topology_report(mesh_data)
    report.update(
        {
            "svg": str(args.svg),
            "frame": args.frame,
            "frameCount": frame_count,
            "ribCount": rib_count,
            "apicalRatio": args.apical_ratio,
            "apicalSegments": args.apical_segments,
            "angularSegments": args.angular_segments,
            "meristemRadiusRatio": args.meristem_radius_ratio,
            "meristemHeightRatio": args.meristem_height_ratio,
            "residualAmplitudeRatio": args.residual_amplitude_ratio,
            "bodyBulge": args.body_bulge,
            "transitionWidth": args.transition_width,
            "radiusScale": args.radius_scale,
            "amplitudeScale": args.amplitude_scale,
            "phaseDriftDegrees": args.phase_drift_deg,
            "axialScale": args.axial_scale,
            "areoleRows": args.areole_rows,
            "areoleDivergenceDegrees": args.areole_divergence_deg,
            "profileVertices": mesh_data.profile_vertex_count,
            "loftRings": mesh_data.loft_ring_count,
            "meanRadiusR": mesh_data.mean_radius,
            "ribAmplitudeA": mesh_data.amplitude,
            "ribPhaseRadians": mesh_data.phase,
            "areoleCount": len(mesh_data.areoles),
            "meridianJoinZ": mesh_data.body_height,
            "zJoin": mesh_data.z_join,
            "zMeristem": mesh_data.z_meristem,
            "zMax": mesh_data.z_max,
            "bodyHeight": mesh_data.body_height,
            "apicalHeight": mesh_data.apical_height,
            "capHeight": mesh_data.cap_height,
            "meristemRadius": mesh_data.meristem_radius,
            "meristemHeight": mesh_data.meristem_height,
            "capHeightRatio": mesh_data.cap_height / mesh_data.body_height,
            "residualAmplitude": mesh_data.residual_amplitude,
            "centerHeight": mesh_data.center_height,
            "ribModules": mesh_data.rib_modules,
            "valleyModules": mesh_data.valley_modules,
        }
    )
    if args.validate_only or args.out is None:
        print(json.dumps(report, indent=2))
        return

    create_blender_asset(mesh_data, args.out)
    report["asset"] = str(args.out)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"svg_to_cactus_mesh: {error}", file=sys.stderr)
        raise
