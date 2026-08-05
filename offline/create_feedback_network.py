"""
Create the first TouchDesigner VJ network for this site.

Run inside TouchDesigner from a Text DAT:

    exec(op("create_feedback_network").text)

The script builds a TOP feedback chain, a CHOP timing/control chain,
and a Movie File Out TOP. It avoids hard-failing on renamed parameters
by checking parameter existence before assignment.
"""

LOOP_SECONDS = 16
OUTPUT_BASENAME = "feedback_top_network"


def main() -> None:
    root = parent()
    network = get_or_create_base(root, "daily_feedback_top_network")
    clear_children(network)

    top_nodes = build_top_chain(network)
    chop_nodes = build_chop_controls(network)
    wire_controls(top_nodes, chop_nodes)
    layout_nodes(top_nodes, chop_nodes)

    network.par.nodeX = 0
    network.par.nodeY = 0
    print("Created TouchDesigner VJ network: daily_feedback_top_network")


def get_or_create_base(root, name):
    existing = root.op(name)
    if existing:
        return existing
    node = root.create(baseCOMP, name)
    node.nodeX = 0
    node.nodeY = 0
    return node


def clear_children(network) -> None:
    for child in list(network.children):
        child.destroy()


def build_top_chain(network) -> dict:
    noise = network.create(noiseTOP, "noise_seed")
    level_in = network.create(levelTOP, "level_contrast")
    transform = network.create(transformTOP, "transform_loop")
    feedback = network.create(feedbackTOP, "feedback_memory")
    composite = network.create(compositeTOP, "composite_feedback")
    displace = network.create(displaceTOP, "displace_orbit")
    level_out = network.create(levelTOP, "level_output")
    null_out = network.create(nullTOP, "OUT_preview")
    movie_out = network.create(moviefileoutTOP, "moviefileout_master")

    connect(level_in, noise)
    connect(transform, level_in)
    connect(composite, transform, 0)
    connect(composite, feedback, 1)
    connect(feedback, composite)
    connect(displace, composite, 0)
    connect(displace, noise, 1)
    connect(level_out, displace)
    connect(null_out, level_out)
    connect(movie_out, null_out)

    set_par(noise, "type", "sparse")
    set_par(noise, "period", 3.0)
    set_par(noise, "harmon", 4)
    set_par(noise, "amp", 0.78)
    set_par(noise, "monochrome", False)

    set_par(level_in, "blacklevel", 0.08)
    set_par(level_in, "brightness1", 0.04)
    set_par(level_in, "gamma1", 0.82)

    set_par(transform, "sx", 1.015)
    set_par(transform, "sy", 1.015)
    set_par(transform, "rz", 0.0)

    set_par(composite, "operand", "add")
    set_par(displace, "displaceweight", 0.08)
    set_par(level_out, "blacklevel", 0.02)
    set_par(level_out, "brightness1", 0.08)
    set_par(level_out, "opacity", 1.0)

    set_par(movie_out, "file", f"$HIP/renders/{OUTPUT_BASENAME}.mov")
    set_par(movie_out, "type", "movie")
    set_par(movie_out, "codec", "hap")
    set_par(movie_out, "framerate", 60)

    return {
        "noise": noise,
        "level_in": level_in,
        "transform": transform,
        "feedback": feedback,
        "composite": composite,
        "displace": displace,
        "level_out": level_out,
        "null_out": null_out,
        "movie_out": movie_out,
    }


def build_chop_controls(network) -> dict:
    timer = network.create(timerCHOP, "timer_loop")
    math = network.create(mathCHOP, "math_loop_phase")
    pattern = network.create(patternCHOP, "pattern_modulation")
    lag = network.create(lagCHOP, "lag_smooth")
    null = network.create(nullCHOP, "OUT_controls")

    connect(math, timer)
    connect(pattern, math)
    connect(lag, pattern)
    connect(null, lag)

    set_par(timer, "length", LOOP_SECONDS)
    set_par(timer, "cycle", True)
    set_par(timer, "play", True)
    set_par(math, "fromrange1", 0)
    set_par(math, "fromrange2", 1)
    set_par(math, "torange1", 0)
    set_par(math, "torange2", 360)
    set_par(pattern, "type", "sine")
    set_par(pattern, "length", 240)
    set_par(pattern, "cycles", 1)
    set_par(lag, "lag1", 0.08)

    return {
        "timer": timer,
        "math": math,
        "pattern": pattern,
        "lag": lag,
        "null": null,
    }


def wire_controls(top_nodes: dict, chop_nodes: dict) -> None:
    timer = chop_nodes["timer"]
    pattern = chop_nodes["pattern"]

    # Expressions keep the visual loop tied to the same LOOP_SECONDS timer.
    set_expr(top_nodes["transform"], "rz", f"op('{timer.path}')['fraction'] * 360")
    set_expr(top_nodes["transform"], "tx", f"math.sin(op('{timer.path}')['fraction'] * 6.2831853) * 0.045")
    set_expr(top_nodes["transform"], "ty", f"math.cos(op('{timer.path}')['fraction'] * 6.2831853) * 0.045")
    set_expr(top_nodes["displace"], "displaceweight", f"0.04 + abs(op('{pattern.path}')[0]) * 0.08")
    set_expr(top_nodes["level_out"], "brightness1", f"0.04 + abs(op('{pattern.path}')[0]) * 0.12")


def layout_nodes(top_nodes: dict, chop_nodes: dict) -> None:
    top_order = ["noise", "level_in", "transform", "feedback", "composite", "displace", "level_out", "null_out", "movie_out"]
    for index, key in enumerate(top_order):
        node = top_nodes[key]
        node.nodeX = index * 170
        node.nodeY = 120 if key == "feedback" else 0

    chop_order = ["timer", "math", "pattern", "lag", "null"]
    for index, key in enumerate(chop_order):
        node = chop_nodes[key]
        node.nodeX = index * 170
        node.nodeY = -220


def connect(target, source, index: int = 0) -> None:
    try:
        target.inputConnectors[index].connect(source)
    except Exception:
        target.setInput(index, source)


def set_par(node, name: str, value) -> None:
    par = getattr(node.par, name, None)
    if par is not None:
        par.val = value


def set_expr(node, name: str, expression: str) -> None:
    par = getattr(node.par, name, None)
    if par is not None:
        par.expr = expression


if __name__ == "__main__":
    main()
