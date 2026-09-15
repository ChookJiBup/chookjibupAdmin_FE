"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "./LeafletMapCanvas";

export type { LeafletMapProps };

function MapLoadingNotice() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 px-4 text-center">
      <p className="body-small text-zinc-500">지도를 불러오는 중...</p>
    </div>
  );
}

/**
 * Leaflet 지도. 화면에서는 이것만 쓴다.
 *
 * leaflet은 import 시점에 `window`를 읽어 서버 렌더링에서 죽는다. 그래서 실제 구현
 * (`LeafletMapCanvas`)은 브라우저에서만 불러온다. Next.js 16에서 `ssr: false`는
 * Client Component 안에서만 쓸 수 있어 이 파일에 "use client"를 둔다.
 *
 * 부모 상자에 크기가 있어야 한다(`absolute inset-0` 또는 `h-full w-full`).
 */
export const LeafletMap = dynamic<LeafletMapProps>(
  () => import("./LeafletMapCanvas").then((mod) => mod.LeafletMapCanvas),
  { ssr: false, loading: MapLoadingNotice },
);
