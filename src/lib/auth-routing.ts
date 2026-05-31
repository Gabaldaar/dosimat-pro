export const STAFF_ROLES = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: string | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role)
}

export function getHomeRouteForRole(role: string | undefined): string {
  if (role === 'Client') return '/portal'
  if (role === 'Replenisher') return '/routes'
  if (role === 'Communicator') return '/customers'
  return '/'
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
