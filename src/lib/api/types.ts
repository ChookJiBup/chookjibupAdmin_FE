export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  code: number;
  message: string;
  data: null;
}
