import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { CreateFestivalRequest, CreateFestivalResponse } from "./types";

export async function createFestival(
  request: CreateFestivalRequest,
): Promise<CreateFestivalResponse> {
  const { data } = await adminApiClient.post<ApiResponse<CreateFestivalResponse>>(
    "/festivals",
    request,
  );
  return data.data;
}
