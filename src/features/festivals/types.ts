import type { FestivalMapSummary } from "@/features/boothmap/types";

export type FestivalLocationType =
  | "MAIN_VENUE"
  | "SUB_VENUE"
  | "STAGE_AREA"
  | "EXPERIENCE_AREA"
  | "PARKING"
  | "SHUTTLE_STOP"
  | "ENTRANCE"
  | "OPERATING_AREA"
  | "OTHER";

export type FestivalLocationSourceType = "MANUAL" | "API";

export interface FestivalLocationRequest {
  /** 수정할 기존 장소 UUID. 신규 장소는 생략(undefined). */
  locationId?: string;
  locationType: FestivalLocationType;
  locationName: string;
  roadAddress?: string;
  jibunAddress?: string;
  detailAddress?: string;
  postalCode?: string;
  buildingManagementNumber?: string;
  latitude?: number;
  longitude?: number;
  boundaryGeometry?: Record<string, unknown>;
  primary: boolean;
  sortOrder: number;
}

export interface FestivalLocationResponse {
  locationId: string;
  locationType: FestivalLocationType;
  locationName: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  detailAddress: string | null;
  postalCode: string | null;
  buildingManagementNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  boundaryGeometry: Record<string, unknown> | null;
  sourceType: FestivalLocationSourceType;
  primary: boolean;
  sortOrder: number;
}

export interface CreateFestivalRequest {
  /** 기존 축제 묶음 UUID. 없으면 축제명 기준으로 자동 생성 또는 연결 */
  seriesId?: string;
  name: string;
  description: string;
  /** 축제 장소 목록. 최소 1개, 그중 하나는 primary=true여야 한다. */
  locations: FestivalLocationRequest[];
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
  /** HH:mm:ss */
  operationStartTime: string;
  /** HH:mm:ss */
  operationEndTime: string;
}

export interface CreateFestivalResponse {
  festivalId: string;
  seriesId: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  operationStartTime: string;
  operationEndTime: string;
  locations: FestivalLocationResponse[];
}

export interface CreateFestivalWithMapResponse {
  festival: CreateFestivalResponse;
  map: FestivalMapSummary;
}

/** 화면에서 단일 주소 입력을 백엔드가 요구하는 locations[] 하나짜리 배열로 감쌀 때 쓴다. */
export function toSingleMainVenueLocation(
  roadAddress: string,
  detailAddress: string,
): FestivalLocationRequest {
  return {
    locationType: "MAIN_VENUE",
    locationName: "메인 행사장",
    roadAddress,
    detailAddress: detailAddress || undefined,
    primary: true,
    sortOrder: 0,
  };
}
