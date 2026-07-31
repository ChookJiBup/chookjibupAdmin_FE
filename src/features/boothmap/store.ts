import { create } from "zustand";
import type { BoothMapObject, BoothMapQueueLine, BoothMapShape, BoothMapShapeType } from "./types";

export type BoothMapTool = "select" | "queue-line";

const GRID_SIZE = 10;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const HISTORY_LIMIT = 50;

/** 드래그/리사이즈 좌표를 10px 격자에 맞춘다("자동 스냅"). */
export function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface BoothMapEditorState {
  objects: BoothMapObject[];
  selectedId: string | null;
  tool: BoothMapTool;
  zoom: number;
  /** 대기열 그리기 중 임시로 쌓이는 점들(완성 전). */
  draftLinePoints: number[];
  past: BoothMapObject[][];
  future: BoothMapObject[][];

  loadObjects: (objects: BoothMapObject[]) => void;
  addShape: (type: BoothMapShapeType, x: number, y: number) => void;
  updateShape: (id: string, patch: Partial<Omit<BoothMapShape, "kind" | "id">>) => void;
  updateLineLabel: (id: string, label: string) => void;
  removeSelected: () => void;
  select: (id: string | null) => void;
  setTool: (tool: BoothMapTool) => void;
  setZoom: (updater: number | ((zoom: number) => number)) => void;
  addDraftLinePoint: (x: number, y: number) => void;
  finishDraftLine: () => void;
  cancelDraftLine: () => void;
  undo: () => void;
  redo: () => void;
}

const SHAPE_DEFAULT_SIZE: Record<BoothMapShapeType, { width: number; height: number }> = {
  BOOTH: { width: 80, height: 60 },
  PATH: { width: 120, height: 30 },
  BUILDING: { width: 100, height: 80 },
  OPEN_SPACE: { width: 100, height: 100 },
  RESTROOM: { width: 60, height: 60 },
  ENTRANCE: { width: 60, height: 30 },
};

const SHAPE_LABEL: Record<BoothMapShapeType, string> = {
  BOOTH: "부스",
  PATH: "통로",
  BUILDING: "건물",
  OPEN_SPACE: "공터",
  RESTROOM: "화장실",
  ENTRANCE: "출입구",
};

export const useBoothMapStore = create<BoothMapEditorState>((set, get) => ({
  objects: [],
  selectedId: null,
  tool: "select",
  zoom: 1,
  draftLinePoints: [],
  past: [],
  future: [],

  loadObjects: (objects) => set({ objects, selectedId: null, past: [], future: [] }),

  addShape: (type, x, y) => {
    const { width, height } = SHAPE_DEFAULT_SIZE[type];
    const shape: BoothMapShape = {
      kind: "shape",
      id: createId("shape"),
      type,
      label: SHAPE_LABEL[type],
      x: snapToGrid(x - width / 2),
      y: snapToGrid(y - height / 2),
      width,
      height,
    };
    pushHistory(set, get);
    set((state) => ({ objects: [...state.objects, shape], selectedId: shape.id }));
  },

  updateShape: (id, patch) => {
    pushHistory(set, get);
    set((state) => ({
      objects: state.objects.map((object) =>
        object.kind === "shape" && object.id === id ? { ...object, ...patch } : object,
      ),
    }));
  },

  updateLineLabel: (id, label) => {
    pushHistory(set, get);
    set((state) => ({
      objects: state.objects.map((object) =>
        object.kind === "line" && object.id === id ? { ...object, label } : object,
      ),
    }));
  },

  removeSelected: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    pushHistory(set, get);
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== selectedId),
      selectedId: null,
    }));
  },

  select: (id) => set({ selectedId: id }),

  setTool: (tool) => set({ tool, draftLinePoints: [], selectedId: null }),

  setZoom: (updater) =>
    set((state) => {
      const next = typeof updater === "function" ? updater(state.zoom) : updater;
      return { zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)) };
    }),

  addDraftLinePoint: (x, y) =>
    set((state) => ({ draftLinePoints: [...state.draftLinePoints, snapToGrid(x), snapToGrid(y)] })),

  finishDraftLine: () => {
    const { draftLinePoints } = get();
    if (draftLinePoints.length < 4) {
      set({ draftLinePoints: [], tool: "select" });
      return;
    }
    const line: BoothMapQueueLine = {
      kind: "line",
      id: createId("line"),
      label: "대기열",
      points: draftLinePoints,
    };
    pushHistory(set, get);
    set((state) => ({
      objects: [...state.objects, line],
      draftLinePoints: [],
      tool: "select",
      selectedId: line.id,
    }));
  },

  cancelDraftLine: () => set({ draftLinePoints: [], tool: "select" }),

  undo: () => {
    const { past, objects, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      objects: previous,
      past: past.slice(0, -1),
      future: [objects, ...future].slice(0, HISTORY_LIMIT),
      selectedId: null,
    });
  },

  redo: () => {
    const { future, objects, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      objects: next,
      future: future.slice(1),
      past: [...past, objects].slice(-HISTORY_LIMIT),
      selectedId: null,
    });
  },
}));

/** 상태를 바꾸기 직전에 현재 objects 스냅샷을 undo 스택에 쌓는다. */
function pushHistory(
  set: (partial: Partial<BoothMapEditorState>) => void,
  get: () => BoothMapEditorState,
) {
  const { objects, past } = get();
  set({ past: [...past, objects].slice(-HISTORY_LIMIT), future: [] });
}
