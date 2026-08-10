import { getMapAnalysisStatus } from "./api";
import type { MapAnalysisStatusResponse } from "./types";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

/**
 * OpenAI 도면 분석 작업이 끝날 때까지 상태를 주기적으로 조회한다.
 * PENDING/PROCESSING이 아닌 상태(COMPLETED/FAILED/CANCELLED)가 되면 멈춘다.
 */
export async function pollMapAnalysis(
  festivalId: string,
  mapId: string,
  onProgress?: (status: MapAnalysisStatusResponse) => void,
): Promise<MapAnalysisStatusResponse> {
  const startedAt = Date.now();

  while (true) {
    const status = await getMapAnalysisStatus(festivalId, mapId);
    onProgress?.(status);

    if (TERMINAL_STATUSES.has(status.status)) {
      return status;
    }
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error("배치도 분석이 예상보다 오래 걸리고 있습니다. 잠시 후 다시 확인해 주세요.");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
