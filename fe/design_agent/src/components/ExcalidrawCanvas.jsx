import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef, useEffect, useState } from "react";
import useDesignStore from "../store/useDesignStore";

export default function ExcalidrawCanvas() {
  const excalidrawRef = useRef(null);
  const setDiagramGraph = useDesignStore((s) => s.setDiagramGraph);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleExport = () => {
    const elements = excalidrawRef.current.getSceneElements();
    const graph = {};
    elements.forEach((el) => {
      if (el.type === "arrow" && el.startBinding && el.endBinding) {
        const from = elements.find((e) => e.id === el.startBinding.elementId)?.text;
        const to = elements.find((e) => e.id === el.endBinding.elementId)?.text;
        if (from && to) {
          if (!graph[from]) graph[from] = [];
          graph[from].push(to);
        }
      }
    });
    setDiagramGraph(graph);
  };

  return (
    <div ref={containerRef} className="flex-grow relative min-h-0">
      <Excalidraw
        ref={excalidrawRef}
        style={{ width: containerSize.width, height: containerSize.height }}
      />
      <button
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-blue-600 text-white rounded shadow"
        onClick={handleExport}
      >
        Export Diagram
      </button>
    </div>
  );
}
