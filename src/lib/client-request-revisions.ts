export type ClientRevisionType = 'updated' | 'cancelled'

/** Fecha local Argentina en formato YYYY-MM-DD */
export function getTodayArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Aviso al cliente tras revisión del equipo: visible hasta el día de entrega programada (inclusive). */
export function isStaffReviewNoticeVisible(req: {
  staffReviewedAt?: string | null
  routeDate?: string | null
  clientDismissedReviewNotice?: boolean
}): boolean {
  if (!req.staffReviewedAt || req.clientDismissedReviewNotice) return false
  const today = getTodayArgentina()
  if (req.routeDate) return req.routeDate >= today
  const reviewedAt = new Date(req.staffReviewedAt)
  const visibleUntil = new Date(reviewedAt)
  visibleUntil.setDate(visibleUntil.getDate() + 7)
  return new Date() <= visibleUntil
}

export function getStaffReviewNoticeMessage(req: {
  clientRevisionType?: ClientRevisionType
  routeDate?: string | null
}): string {
  const dateStr = req.routeDate
    ? new Date(req.routeDate + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  if (req.clientRevisionType === 'cancelled') {
    return dateStr
      ? `Confirmamos la anulación de tu pedido. La entrega del ${dateStr} ya no incluye este pedido (salvo que te contactemos).`
      : 'Confirmamos la anulación de tu pedido.'
  }

  return dateStr
    ? `Revisamos tu pedido y actualizamos la planilla para la entrega del ${dateStr}.`
    : 'Revisamos tu pedido. Te contactaremos si hace falta algún ajuste.'
}

export interface ClientRequestRevisionSnapshot {
  cloro: number
  acido: number
  notes: string
}

export function formatRevisionSummary(
  type: ClientRevisionType,
  clientName: string,
  current: ClientRequestRevisionSnapshot,
  previous?: ClientRequestRevisionSnapshot | null
): string {
  const fmt = (n: number, label: string) => (n > 0 ? `${n} ${label}` : '')
  const qty = (s: ClientRequestRevisionSnapshot) =>
    [fmt(s.cloro, 'CL'), fmt(s.acido, 'AC')].filter(Boolean).join(' · ') || 'sin cantidades'

  if (type === 'cancelled') {
    return `${clientName} canceló su pedido del portal (${qty(current)}). Revisá la hoja de ruta.`
  }

  if (previous) {
    return `${clientName} modificó su pedido: antes ${qty(previous)} → ahora ${qty(current)}. La planilla no se actualizó automáticamente.`
  }

  return `${clientName} modificó su pedido del portal (${qty(current)}). Revisá la hoja de ruta.`
}

export function formatRevisionDetail(req: {
  clientRevisionType?: ClientRevisionType
  revisionSnapshot?: ClientRequestRevisionSnapshot
  cloro?: number
  acido?: number
  notes?: string
}): string {
  const prev = req.revisionSnapshot
  const cur = {
    cloro: Number(req.cloro || 0),
    acido: Number(req.acido || 0),
    notes: req.notes || '',
  }

  if (req.clientRevisionType === 'cancelled') {
    const parts = []
    if (prev) {
      if (prev.cloro > 0 || prev.acido > 0) {
        parts.push(`Pedido anterior: ${prev.cloro} CL, ${prev.acido} AC`)
      }
    }
    parts.push('El cliente solicitó anular el pedido.')
    return parts.join('. ')
  }

  if (prev) {
    const lines = [
      `Antes: ${prev.cloro} CL / ${prev.acido} AC`,
      `Ahora: ${cur.cloro} CL / ${cur.acido} AC`,
    ]
    if (cur.notes && cur.notes !== prev.notes) {
      lines.push(`Notas: ${cur.notes}`)
    }
    return lines.join(' · ')
  }

  return `${cur.cloro} CL · ${cur.acido} AC${cur.notes ? ` · ${cur.notes}` : ''}`
}
