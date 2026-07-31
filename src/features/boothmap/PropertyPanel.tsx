"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBoothMapStore } from "./store";

/** 오른쪽 속성 패널 — 선택된 부스/대기열의 값을 수정한다. */
export function PropertyPanel() {
  const objects = useBoothMapStore((state) => state.objects);
  const selectedId = useBoothMapStore((state) => state.selectedId);
  const updateShape = useBoothMapStore((state) => state.updateShape);
  const updateLineLabel = useBoothMapStore((state) => state.updateLineLabel);
  const removeSelected = useBoothMapStore((state) => state.removeSelected);

  const selected = objects.find((object) => object.id === selectedId) ?? null;

  if (!selected) {
    return (
      <div className="flex w-56 shrink-0 flex-col gap-2 rounded-lg border border-zinc-300 p-3">
        <p className="body-small-bold text-zinc-950">속성</p>
        <p className="body-caption text-zinc-500">
          부스나 대기열을 선택하면 여기서 수정할 수 있어요.
        </p>
      </div>
    );
  }

  if (selected.kind === "line") {
    return (
      <div className="flex w-56 shrink-0 flex-col gap-3 rounded-lg border border-zinc-300 p-3">
        <p className="body-small-bold text-zinc-950">속성 — 대기열</p>
        <Input
          label="이름"
          value={selected.label}
          onChange={(event) => updateLineLabel(selected.id, event.target.value)}
        />
        <Button type="button" variant="destructive" size="sm" onClick={removeSelected}>
          삭제
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3 rounded-lg border border-zinc-300 p-3">
      <p className="body-small-bold text-zinc-950">속성 — {selected.label}</p>
      <Input
        label="이름"
        value={selected.label}
        onChange={(event) => updateShape(selected.id, { label: event.target.value })}
      />
      <div className="flex gap-2">
        <Input
          label="X"
          type="number"
          wrapperClassName="flex-1"
          value={selected.x}
          onChange={(event) => updateShape(selected.id, { x: Number(event.target.value) })}
        />
        <Input
          label="Y"
          type="number"
          wrapperClassName="flex-1"
          value={selected.y}
          onChange={(event) => updateShape(selected.id, { y: Number(event.target.value) })}
        />
      </div>
      <div className="flex gap-2">
        <Input
          label="너비"
          type="number"
          wrapperClassName="flex-1"
          value={selected.width}
          onChange={(event) =>
            updateShape(selected.id, { width: Math.max(20, Number(event.target.value)) })
          }
        />
        <Input
          label="높이"
          type="number"
          wrapperClassName="flex-1"
          value={selected.height}
          onChange={(event) =>
            updateShape(selected.id, { height: Math.max(20, Number(event.target.value)) })
          }
        />
      </div>
      <Button type="button" variant="destructive" size="sm" onClick={removeSelected}>
        삭제
      </Button>
    </div>
  );
}
