import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  CreateFestivalRequest,
  CreateFestivalResponse,
  CreateFestivalWithMapResponse,
} from "./types";

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
