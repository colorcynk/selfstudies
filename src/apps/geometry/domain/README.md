# Geometry domain

The domain uses finite `Point` coordinates and either positive-radius circles or strictly convex polygons with 3–32 vertices. Coordinates and circle radii must be at most 1,000 in absolute value, in the app's small teaching units. Degenerate polygons, repeated adjacent vertices, collinear consecutive vertices, and non-convex or inconsistently ordered polygons are rejected by `validateShape` with `RangeError`.

Comparisons use `EPS = 1e-6` with the relative rule `abs(a-b) <= EPS * max(1, abs(a), abs(b))`. Polygon turn and area checks use the same absolute tolerance after coordinates have been bounded. Applications should avoid near-degenerate teaching examples: this tolerance is for floating-point roundoff, not for visually ambiguous answer choices.

`classifyShape` returns every applicable `ShapeKind`. A square is also a rectangle, an equilateral triangle is also isosceles, and a right isosceles triangle receives both triangle labels.

`getCongruenceTransform(source, target)` returns a proper rotation and translation, plus a vertex correspondence for polygon overlays, or `null`. It never uses scaling or reflection. Polygon input may begin at any vertex and may enumerate the same boundary in either direction; the routine normalizes enumeration while preserving the polygon's physical orientation.
