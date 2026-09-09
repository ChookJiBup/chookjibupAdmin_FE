import axios from "axios";
import { staffLoginPath } from "@/features/auth/staff/loginPath";
import { useStaffAuthStore } from "@/store/staffAuthStore";

/**
 * 이 요청이 현장 스태프 콘솔에서 나갔음을 서버에 알리는 헤더.
 *
 * 관리자 콘솔과 스태프 콘솔이 같은 브라우저에 함께 로그인돼 있으면 두 쿠키가 모두
 * 전송돼 서버가 호출한 화면을 구분할 수 없다. 서버가 임의로 한쪽을 고르면, 스태프가
 * 갱신한 줄끝이 관리자 이름으로 남거나(스태프 우선이 아닐 때) 관리자가 담당 축제가
 * 아닌 축제에서 아무것도 못 하게 된다(스태프 우선일 때). 어느 화면에서 눌렀는지는
 * 클라이언트만 확실히 아니까 여기서 알려 준다.
 */
export const STAFF_CONSOLE_HEADER = "X-Chookjibup-Console";
export const STAFF_CONSOLE_HEADER_VALUE = "field-staff";

export const staffApiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { [STAFF_CONSOLE_HEADER]: STAFF_CONSOLE_HEADER_VALUE },
});

/** 로그인 화면 자체의 401(아이디/비밀번호 오류)은 그 화면에서 직접 안내하므로 리다이렉트 대상이 아니다. */
function isStaffScreen(pathname: string) {
  return pathname.startsWith("/staff") && !pathname.startsWith("/staff/login");
}

/**
 * 현장에서 세션이 만료되면 줄끝 갱신 같은 요청이 조용히 실패한다.
 * 401이면 스태프 세션을 지우고 만료 안내와 함께 로그인 화면으로 보낸다.
 */
staffApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const expiredSession = useStaffAuthStore.getState().session;
      useStaffAuthStore.getState().clearSession();
      // 스태프 로그인에는 축제 ID가 필요한데, 스토어의 축제 ID는 세션을 지워도 남는다.
      const festivalId = useStaffAuthStore.getState().festivalId;
      // 처음부터 로그인한 적 없는 경우(StaffAuthGuard의 최초 세션 조회 실패)는
      // 만료가 아니므로 가드가 하는 기존 이동에 맡긴다.
      if (
        expiredSession &&
        typeof window !== "undefined" &&
        isStaffScreen(window.location.pathname)
      ) {
        window.location.replace(staffLoginPath({ festivalId, expired: true }));
      }
    }
    return Promise.reject(error);
  },
);
