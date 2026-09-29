const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function getEmailError(email: string): string | null {
  if (!email.trim()) return "이메일을 입력해 주세요.";
  return EMAIL_PATTERN.test(email.trim()) ? null : "올바른 이메일 형식으로 입력해 주세요.";
}

export function getPasswordError(password: string): string | null {
  if (!password) return "비밀번호를 입력해 주세요.";
  if (password.length < 8 || password.length > 100) return "비밀번호는 8~100자로 입력해 주세요.";
  return null;
}

/** 로그인은 기존 계정과의 호환을 위해 백엔드 계약대로 빈 값만 검사한다. */
export function getLoginPasswordError(password: string): string | null {
  return password ? null : "비밀번호를 입력해 주세요.";
}
