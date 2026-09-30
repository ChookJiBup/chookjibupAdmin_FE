import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LocationDraft } from "./locationDraft";

export interface FestivalLocationFieldsProps {
  locations: LocationDraft[];
  addressErrorKeys: string[];
  addressErrorMessage: string;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Partial<Omit<LocationDraft, "key">>) => void;
  onSearchAddress: (key: string) => void;
}

export function FestivalLocationFields({
  locations,
  addressErrorKeys,
  addressErrorMessage,
  onAdd,
  onRemove,
  onChange,
  onSearchAddress,
}: FestivalLocationFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-4 border-t border-zinc-200 pt-4">
        {locations.map((location, index) => (
          <div key={location.key} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              {index > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="body-small-bold text-zinc-950">장소 {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon />}
                    className="py-0"
                    onClick={() => onRemove(location.key)}
                  >
                    삭제
                  </Button>
                </div>
              ) : null}

              {location.roadAddress ? (
                <Input
                  layout="with-button"
                  disabled
                  value={location.roadAddress}
                  className="disabled:border-zinc-400!"
                  errorText={
                    addressErrorKeys.includes(location.key) ? addressErrorMessage : undefined
                  }
                  button={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onSearchAddress(location.key)}
                    >
                      주소 변경
                    </Button>
                  }
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSearchAddress(location.key)}
                  className="body-regular flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 transition-colors hover:bg-zinc-50"
                >
                  <MagnifyingGlassIcon className="size-4" />
                  주소 찾기
                </button>
              )}
            </div>
            <Input
              placeholder="상세주소"
              value={location.detailAddress}
              onChange={(event) => onChange(location.key, { detailAddress: event.target.value })}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" icon={<PlusIcon />} className="mt-3" onClick={onAdd}>
        장소 추가
      </Button>
    </>
  );
}
