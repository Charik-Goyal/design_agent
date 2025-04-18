import { Excalidraw } from "@excalidraw/excalidraw";
import { useState, useCallback, useEffect } from "react";
import "@excalidraw/excalidraw/index.css";
import { useRecoilState } from "recoil";
import { graph } from "../atoms/graph";

export default function ExcalidrawCanvas() {
  const [elements, setElements] = useRecoilState(graph)

  // Load saved elements from localStorage and initialize Excalidraw using initialData
  const getInitialData = () => {
    const savedElements = JSON.parse(localStorage.getItem("myKey"));
    if (savedElements?.length) {
      return {
        elements: savedElements,
        appState: { viewBackgroundColor: "#ffffff" },
        scrollToContent: true
      };
    }
    return undefined;
  };

  // Save elements to localStorage whenever they change
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("myKey") || "[]");
      if (Array.isArray(saved)) setElements(saved);
    } catch {}
  }, [setElements]);

  useEffect(() => {
    localStorage.setItem("myKey", JSON.stringify(elements));
  }, [elements]);

  const handleChange = useCallback(
    (updatedElements) => {
      // clone each object so that next time Excalidraw mutates them,
      // it isn’t mutating your frozen Recoil state:
      const clones = updatedElements.map((el) => ({ ...el }));
      setElements(clones);
    },
    [setElements]
  );

  return (
    <div className="h-full rounded-lg overflow-hidden shadow relative">
          <Excalidraw 
          initialData={getInitialData()} 
          onChange={handleChange}
          />
    </div>
  );
}
