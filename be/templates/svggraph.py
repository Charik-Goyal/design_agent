"""
svg_to_graph.py  –  Parse an SVG diagram (rects / paths / text) into
                    an LLM-friendly {"nodes":[…], "edges":[…]} structure.

Usage:
    python svg_to_graph.py path/to/diagram.svg > graph.json
"""

import json, math, sys, uuid, requests
import xml.etree.ElementTree as ET
from collections import namedtuple

# ------------------------------------------------------------------ helpers
PT        = namedtuple("PT", "x y")
Node      = namedtuple("Node", "id label cx cy")
Edge      = namedtuple("Edge", "src dst")

def center(elem):
    """Return the visual centre of <rect>, <ellipse>, <path> bounding-box."""
    bb = elem.attrib
    if "x" in bb:                     # rect / image
        cx = float(bb["x"]) + float(bb.get("width", 0))/2
        cy = float(bb["y"]) + float(bb.get("height", 0))/2
    elif "cx" in bb:                  # circle / ellipse
        cx = float(bb["cx"])
        cy = float(bb["cy"])
    else:                             # path – fallback: first moveto
        pathdata = bb["d"].lstrip("M").split()[0:2]
        cx, cy = map(float, pathdata)
    return PT(cx, cy)


def nearest_node(pt, nodes):
    """Which node centre is closest to (x,y)."""
    return min(nodes, key=lambda n: math.hypot(n.cx-pt.x, n.cy-pt.y))


# ------------------------------------------------------------------ main
def svg_to_graph(svg_path: str):
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # namespaces in InkScape / Excalidraw exports
    ns = {"svg": root.tag.split("}")[0].strip("{")}

    ### 1. grab <text> to create nodes  ------------------------------
    nodes = []
    for t in root.findall(".//svg:text", ns):
        label = "".join(t.itertext()).strip()
        if not label:       # skip empty
            continue
        # use parent element's centre if exists, else text's x/y
        parent = t.getparent() if hasattr(t, "getparent") else None
        cx, cy = (center(parent) if parent is not None else
                  (float(t.attrib.get("x", 0)), float(t.attrib.get("y", 0))))
        nid = label.lower().replace(" ", "_").replace("-", "")
        nodes.append(Node(id=nid or str(uuid.uuid4())[:8],
                          label=label, cx=cx, cy=cy))

    ### 2. grab <path> / <line> arrows to create edges ---------------
    paths = root.findall(".//svg:path", ns) + root.findall(".//svg:line", ns)
    edges = []
    for p in paths:
        bb = p.attrib
        # we consider only *straight* first & last points for rough direction
        if "d" in bb:                               # path
            coords = [float(n) for n in bb["d"].replace("M","").replace("L"," ").split()]
            if len(coords) >= 4:
                start = PT(coords[0], coords[1])
                end   = PT(coords[-2], coords[-1])
            else:
                continue
        else:                                       # line
            start = PT(float(bb["x1"]), float(bb["y1"]))
            end   = PT(float(bb["x2"]), float(bb["y2"]))

        src = nearest_node(start, nodes).id
        dst = nearest_node(end,   nodes).id
        if src != dst:                              # skip loops
            edges.append(Edge(src, dst))

    # dedupe edges
    edges = list({(e.src, e.dst): e for e in edges}.values())

    ### 3. dump JSON --------------------------------------------------
    graph = {
        "nodes": [
            {"id": n.id, "label": n.label}
            for n in nodes
        ],
        "edges": [
            {"source": e.src, "target": e.dst}
            for e in edges
        ]
    }
    return graph


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python svg_to_graph.py diagram.svg")
    x = requests.get(sys.argv[1])
    graph = svg_to_graph(x)
    print(json.dumps(graph, indent=2))
