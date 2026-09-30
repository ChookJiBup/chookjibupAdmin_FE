import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * 한 축제의 부스맵을 보는 편집기·대시보드가 공유하는 서버 조회 키.
 * 각 API는 편집 노드와 운영 부스를 다른 모양으로 내려주지만, 저장 후에는 항상
 * 함께 무효화해 다음 화면이 로컬 스냅샷이 아닌 같은 server source of truth를 읽게 한다.
 */
export const festivalMapKeys = {
  current: (festivalId: string) => ["coordinate-map", festivalId] as const,
  editor: (festivalId: string, mapId?: string) =>
    mapId ? (["map-editor", festivalId, mapId] as const) : (["map-editor", festivalId] as const),
  legacyEditor: (festivalId: string, mapId?: string) =>
    mapId
      ? (["boothmap-editor", festivalId, mapId] as const)
      : (["boothmap-editor", festivalId] as const),
  dashboard: (festivalId: string) => ["festival-dashboard", festivalId] as const,
  operationsMap: (festivalId: string) => ["festival-operations-map", festivalId] as const,
  queues: (festivalId: string) => ["festival-queues", festivalId] as const,
  congestion: (festivalId: string) => ["festival-congestion", festivalId] as const,
};

export function festivalMapInvalidationKeys(festivalId: string): QueryKey[] {
  return [
    festivalMapKeys.current(festivalId),
    festivalMapKeys.editor(festivalId),
    festivalMapKeys.legacyEditor(festivalId),
    festivalMapKeys.dashboard(festivalId),
    festivalMapKeys.operationsMap(festivalId),
    festivalMapKeys.queues(festivalId),
    festivalMapKeys.congestion(festivalId),
  ];
}

export async function invalidateFestivalMapQueries(
  queryClient: QueryClient,
  festivalId: string,
): Promise<void> {
  await Promise.all(
    festivalMapInvalidationKeys(festivalId).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
