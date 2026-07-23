export interface CreateFestivalRequest {
  /** 기존 축제 묶음 UUID. 없으면 축제명 기준으로 자동 생성 또는 연결 */
  seriesId?: string;
  name: string;
  description: string;
  address: string;
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
}
