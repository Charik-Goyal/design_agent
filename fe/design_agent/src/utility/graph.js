export const processData = (elements) => {
    let val = {};
    let rectangles = [];

    for (let t = 0; t < elements.length; t++) {
      let x = elements[t];

      if (x.type === "text") {
        if (x.containerId !== null && val[x.containerId]) {
          val[x.containerId].val = x.text;
        } else {
          if (x.text.length > 0) {
            val[x.id] = {
              type: "FreeText",
              val: x.text,
              position: { x: x.x, y: x.y, width: x.width, height: x.height }
            }
          }
          continue;
        }
      }

      val[x.id] = {
        type: x.type,
        val: "",
        ngr: [],
        position: { x: x.x, y: x.y, width: x.width, height: x.height }
      };

      if (x.type !== "arrow" && x.type !== "text" && x.type !== "line" && x.type !== "freedraw") {
        rectangles.push(x.id);
      }

      if (x.type === "arrow" && x.startBinding && x.endBinding) {
        val[x.id] = {
          ...val[x.id],
          start: x.startBinding.elementId,
          end: x.endBinding.elementId
        };
      }
    }

    for (let x in val) {
      if (val[x].type === "arrow") {
        let p = val[x].start;
        let q = val[x].end;
        if (val[p]) val[p].ngr.push(q);
      }
    }

    const isInside = (inner, outer) => {
      return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.x + inner.width <= outer.x + outer.width &&
        inner.y + inner.height <= outer.y + outer.height
      );
    };

    rectangles.forEach(outerId => {
      rectangles.forEach(innerId => {
        if (innerId !== outerId) {
          let innerRect = val[innerId].position;
          let outerRect = val[outerId].position;

          if (isInside(innerRect, outerRect)) {
            val[outerId].ngr.push(innerId);
          }
        }
      });
    });
    console.log(val)
    return val;
  };