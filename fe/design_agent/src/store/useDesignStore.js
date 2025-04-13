import { create } from "zustand";

const useDesignStore = create((set) => ({
  functionalReqs: [],
  addFunctionalReq: (req) => set((s) => ({ functionalReqs: [...s.functionalReqs, req] })),
  entities: [],
  addEntity: (e) => set((s) => ({ entities: [...s.entities, e] })),
  apis: [],
  addAPI: (api) => set((s) => ({ apis: [...s.apis, api] })),
  diagramGraph: {},
  setDiagramGraph: (g) => set({ diagramGraph: g }),
}));

export default useDesignStore;