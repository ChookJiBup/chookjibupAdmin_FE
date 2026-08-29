import type { ModifierType } from "@/features/dashboard/types";

export interface QueuePathPoint {
  lat: number;
  lng: number;
}

/** 부스 하나의 대기열(줄) 상태. */
export interface FestivalQueue {
  queueId: string;
  boothId: number;
  boothName: string;
  tailLatitude: number | null;
  tailLongitude: number | null;
  /** 부스에서 줄끝까지의 거리(m). */
  queueTailMeters: number | null;
  path: QueuePathPoint[] | null;
  lastModifierType: ModifierType | null;
  /** 마지막으로 줄끝을 갱신한 사람의 이름. */
  lastModifierName: string | null;
  updatedAt: string | null;
}

export interface FestivalQueueList {
  festivalId: string;
  queues: FestivalQueue[];
}

export interface UpdateQueueTailRequest {
  tailLatitude: number;
  tailLongitude: number;
  queueTailMeters?: number;
  path?: QueuePathPoint[];
}
