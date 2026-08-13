import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  CreateFestivalRequest,
  CreateFestivalResponse,
  CreateFestivalWithMapResponse,
  FestivalSeriesSearchResult,
  ManagedFestivalDetail,
  UpdateFestivalRequest,
} from "./types";

/** "축제 등록" 화면에서 축제명 일부로 기존 축제 시리즈를 검색한다. */
export async function searchFestivalSeries(
  keyword: string,
): Promise<FestivalSeriesSearchResult[]> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalSeriesSearchResult[]>>(
    "/festival-series/search",
    { params: { keyword } },
  );
  return data.data;
}

export async function getManagedFestival(festivalId: string): Promise<ManagedFestivalDetail> {
  const { data } = await adminApiClient.get<ApiResponse<ManagedFestivalDetail>>(
    `/admin/me/managed-festivals/${festivalId}`,
  );
  return data.data;
}

export async function updateFestival(
  festivalId: string,
  request: UpdateFestivalRequest,
): Promise<void> {
  await adminApiClient.patch<ApiResponse<void>>(`/festivals/${festivalId}`, request);
}

export async function createFestival(
  request: CreateFestivalRequest,
): Promise<CreateFestivalResponse> {
  const { data } = await adminApiClient.post<ApiResponse<CreateFestivalResponse>>(
    "/festivals",
    request,
  );
  return data.data;
}

/**
 * 축제 기본 정보와 AI 분석용 배치도 원본 이미지를 함께 등록한다.
 * 배치도(map)는 이 API에서만 생성할 수 있다 — 이미 만들어진 축제에 나중에
 * 배치도를 붙이는 API는 아직 없다(demoAdmin_BE `FestivalMapCommandController` 참고).
 */
export async function createFestivalWithMap(
  request: CreateFestivalRequest,
  image: File,
): Promise<CreateFestivalWithMapResponse> {
  const form = new FormData();
  form.append("festival", new Blob([JSON.stringify(request)], { type: "application/json" }));
  form.append("image", image);
  const { data } = await adminApiClient.post<ApiResponse<CreateFestivalWithMapResponse>>(
    "/festivals",
    form,
  );
  return data.data;
}
