export const STAFF_ROLES = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'] as const

export const CLIENT_ROLE = 'Client'

export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: string | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role)
}

export function isClientRole(role: string | undefined): boolean {
  return role === CLIENT_ROLE
}

export function isStaffOrClientRole(role: string | undefined): boolean {
  return isStaffRole(role) || isClientRole(role)
}

export function getHomeRouteForRole(role: string | undefined): string {
  if (role === CLIENT_ROLE) return '/portal'
  if (role === 'Replenisher') return '/routes'
  if (role === 'Communicator') return '/customers'
  return '/'
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

