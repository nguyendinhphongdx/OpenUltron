export type PasswordStrength = {
  label: string;
  score: number;
  helper: string;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return 'Email là bắt buộc.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Email chưa đúng định dạng.';
  }
  return undefined;
}

export function validateDisplayName(name: string) {
  if (!name.trim()) {
    return 'Tên hiển thị là bắt buộc.';
  }
  if (name.trim().length < 2) {
    return 'Tên hiển thị cần ít nhất 2 ký tự.';
  }
  return undefined;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { label: 'Chưa nhập', score: 0, helper: 'Dùng tối thiểu 8 ký tự để mô phỏng policy prod.' };
  }
  if (score <= 1) {
    return { label: 'Yếu', score, helper: 'Thêm chữ hoa, số hoặc ký tự đặc biệt.' };
  }
  if (score <= 3) {
    return { label: 'Ổn', score, helper: 'Đủ cho mock flow; prod sẽ kiểm tra phía server.' };
  }
  return { label: 'Mạnh', score, helper: 'Password policy đã sẵn sàng để nối API thật.' };
}

export function validatePassword(password: string) {
  if (!password) {
    return 'Password là bắt buộc.';
  }
  if (password.length < 8) {
    return 'Password cần ít nhất 8 ký tự.';
  }
  return undefined;
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return 'Vui lòng nhập lại password.';
  }
  if (password !== confirmPassword) {
    return 'Password nhập lại chưa khớp.';
  }
  return undefined;
}

export function validateVerificationCode(code: string) {
  const normalizedCode = code.trim();
  if (!normalizedCode) {
    return 'Mã xác minh là bắt buộc.';
  }
  if (!/^\d{6}$/.test(normalizedCode)) {
    return 'Mã xác minh gồm 6 chữ số.';
  }
  return undefined;
}
