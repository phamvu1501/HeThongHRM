export type Role = 'ADMIN' | 'EMPLOYEE'

export interface AuthUser {
  role: Role
  empId?: string
}

export function getAuth(): AuthUser | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  let role: Role | null = null;
  let empId: string | undefined = undefined;

  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'role') {
      role = value as Role;
    } else if (key === 'empId') {
      empId = value;
    }
  }

  // Fallback for legacy auth cookie
  if (!role) {
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === 'auth' && value === 'true') {
        role = 'ADMIN';
      }
    }
  }

  if (role) {
    return { role, empId };
  }

  return null;
}
