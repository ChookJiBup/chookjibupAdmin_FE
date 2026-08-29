import type { FestivalDashboard } from "@/features/dashboard/types";
import { staffApiClient } from "@/lib/api/staffApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalQueue, FestivalQueueList, UpdateQueueTailRequest } from "./types";

/** 담당 축제의 부스·구역·혼잡도를 한 번에 가져온다(스태프 토큰으로도 조회 가능). */
export async function getStaffFestivalDashboard(festivalId: string): Promise<FestivalDashboard> {
  const { data } = await staffApiClient.get<ApiResponse<FestivalDashboard>>(
    `/festivals/${festivalId}/dashboard`,
  );
  return data.data;
}

export async function getFestivalQueues(festivalId: string): Promise<FestivalQueueList> {
  const { data } = await staffApiClient.get<ApiResponse<FestivalQueueList>>(
    `/festivals/${festivalId}/operations/queues`,
  );
  return data.data;
}

export async function updateQueueTail(
  festivalId: string,
  queueId: string,
  request: UpdateQueueTailRequest,
): Promise<FestivalQueue> {
  const { data } = await staffApiClient.patch<ApiResponse<FestivalQueue>>(
    `/festivals/${festivalId}/operations/queues/${queueId}`,
    request,
  );
  return data.data;
}
