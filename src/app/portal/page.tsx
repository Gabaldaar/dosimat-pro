
"use client"

import { useMemo, useState, useEffect } from "react"
import { useUser, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, limit, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Droplets, 
  History, 
  LogOut, 
  Mail, 
  MessageCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  Info,
  Receipt,
  User,
  Loader2,
  Send,
  Beaker,
  Package,
  RefreshCw,
  Truck,
  Calendar,
  Pencil,
  X,
  Phone,
  Lock,
  CheckCircle2,
  Shield
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { normalizeEmail, isStaffRole } from "@/lib/auth-routing"
import {
  getStaffReviewNoticeMessage,
  isStaffReviewNoticeVisible,
} from "@/lib/client-request-revisions"

const txTypeMap: Record<string, { label: string, icon: any, color: string }> = {
  sale: { label: "Venta de Producto", icon: ArrowDownLeft, color: "text-blue-600 bg-blue-50" },
  refill: { label: "Reposición de Bidones", icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
  Reposición: { label: "Reposición de Bidones", icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
  service: { label: "Servicio Técnico", icon: ArrowDownLeft, color: "text-indigo-600 bg-indigo-50" },
  cobro: { label: "Pago Realizado", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  adjustment: { label: "Ajuste de Saldo", icon: Info, color: "text-slate-600 bg-slate-50" },
}

async function portalOrdersFetch(
  auth: { currentUser: { getIdToken: () => Promise<string> } | null },
  method: 'PATCH' | 'DELETE',
  options: { requestId: string; cloro?: number; acido?: number; notes?: string }
) {
  const user = auth.currentUser
  if (!user) throw new Error('Sesión expirada')
  const token = await user.getIdToken()
  const url =
    method === 'DELETE'
      ? `/api/portal/orders?requestId=${encodeURIComponent(options.requestId)}`
      : '/api/portal/orders'
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
    },
    body:
      method === 'PATCH'
        ? JSON.stringify({
            requestId: options.requestId,
            cloro: options.cloro,
            acido: options.acido,
            notes: options.notes,
          })
        : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'No se pudo completar la operación.') as Error & {
      code?: string
    }
    err.code = data.code
    throw err
  }
  return data as { message?: string }
}

export default function ClientPortal() {
  const { user, userData } = useUser()
  const { auth, firestore } = useFirebase()
  const db = firestore!
  const router = useRouter()
  const { toast } = useToast()

  const [orderData, setOrderData] = useState({ cloro: 0, acido: 0, notes: "" })
  const [isOrdering, setIsOrdering] = useState(false)
  const [editingRequest, setEditingRequest] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ cloro: 0, acido: 0, notes: "" })
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const clientsRef = useMemoFirebase(() => {
    if (!user?.email) return null;
    return query(collection(db, 'clients'), where('mail', '==', normalizeEmail(user.email)), limit(1));
  }, [db, user?.email]);
  
  const { data: clientDocs, isLoading: loadingClient } = useCollection(clientsRef);
  const client = clientDocs?.[0];

  const clientId = client?.id ?? null

  useEffect(() => {
    if (!user || !clientId) return
    if (userData?.clientId === clientId) return

    setDoc(doc(db, 'users', user.uid), {
      clientId,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => console.error("Error syncing clientId:", err))
  }, [user, clientId, userData?.clientId, db])

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'company'), [db]);
  const { data: settings } = useDoc(settingsRef);

  const [transactions, setTransactions] = useState<any[] | null>(null)
  const [loadingTx, setLoadingTx] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId || !auth.currentUser) {
      setTransactions(null)
      setTxError(null)
      return
    }

    let cancelled = false

    const loadTransactions = async () => {
      setLoadingTx(true)
      setTxError(null)
      try {
        const token = await auth.currentUser!.getIdToken()
        const res = await fetch('/api/portal/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'No pudimos cargar el historial.')
        }
        if (!cancelled) {
          setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setTransactions([])
          setTxError(e instanceof Error ? e.message : 'No pudimos cargar el historial.')
        }
      } finally {
        if (!cancelled) setLoadingTx(false)
      }
    }

    loadTransactions()
    return () => {
      cancelled = true
    }
  }, [clientId, auth, user?.uid])

  
  // Global query for any planned route sheet (ignores client)
  const globalPlannedQuery = useMemoFirebase(() => {
    return query(collection(db, 'route_sheets'), where('status', '==', 'planned'));
  }, [db]);

  // Fetch global planned sheets
  const { data: globalPlannedSheets, isLoading: loadingGlobalPlanned } = useCollection(globalPlannedQuery);

  // Compute earliest upcoming planned delivery date (global)
  const upcomingPlanned = useMemo(() => {
    if (!globalPlannedSheets?.length) return null;
    // Filter future dates
    const future = globalPlannedSheets.filter((s: any) => new Date(s.date) >= new Date());
    if (!future.length) return null;
    const sorted = [...future].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sheet = sorted[0];
    return { date: sheet.date };
  }, [globalPlannedSheets]);

  // Existing client‑specific query (kept for other logic that may need it)
  const routeQuery = useMemoFirebase(() => {
    if (!clientId) return null;
    return query(
      collection(db, 'route_sheets'),
      where('participantClientIds', 'array-contains', clientId),
      where('status', 'in', ['planned', 'active'])
    );
  }, [db, clientId]);
  const { data: routeSheets, isLoading: loadingRouteSheets } = useCollection(routeQuery);
  // Query for client‑specific pending/scheduled orders
  const openOrdersQuery = useMemoFirebase(() => {
    if (!clientId) return null;
    return query(
      collection(db, 'client_requests'),
      where('clientId', '==', clientId),
      where('status', 'in', ['pending', 'scheduled'])
    );
  }, [db, clientId]);
  const { data: openOrdersRaw, isLoading: loadingOpenOrders } = useCollection(openOrdersQuery);

  const clientRequestsQuery = useMemoFirebase(() => {
    if (!clientId) return null;
    return query(collection(db, 'client_requests'), where('clientId', '==', clientId), limit(40));
  }, [db, clientId]);
  const { data: clientRequests, isLoading: loadingClientRequests } = useCollection(clientRequestsQuery);
  
  const openOrders = useMemo(() => {
    const list = openOrdersRaw ?? [];
    return [...list].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }, [openOrdersRaw]);

  const staffReviewNotices = useMemo(
    () => (clientRequests ?? []).filter((r: any) => isStaffReviewNoticeVisible(r)),
    [clientRequests]
  );

  const deliveryLocked = useMemo(() => {
    if (!routeSheets?.length || !clientId) return false;
    return routeSheets.some((s: any) => s.status === 'active');
  }, [routeSheets, clientId]);

  const upcomingDelivery = useMemo(() => {
    if (!routeSheets?.length || !clientId) return null;
    const sorted = [...routeSheets].sort(
      (a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime()
    );
    for (const sheet of sorted) {
      const item = sheet.items?.find((i: any) => i.clientId === clientId);
      if (item) {
        return {
          date: sheet.date,
          cloro: Number(item.plannedChlorine || 0),
          acido: Number(item.plannedAcid || 0),
          status: sheet.status as 'planned' | 'active',
        };
      }
    }
    return null;
  }, [routeSheets, clientId]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  const handleSendOrder = async () => {
    if (!client || deliveryLocked) return
    setIsOrdering(true)
    try {
      await addDocumentNonBlocking(collection(db, 'client_requests'), {
        clientId: client.id,
        clientName: `${client.apellido}, ${client.nombre}`,
        date: new Date().toISOString(),
        cloro: orderData.cloro,
        acido: orderData.acido,
        notes: orderData.notes,
        status: 'pending'
      })
      toast({ title: "Pedido enviado", description: "Recibimos tu solicitud. Te avisaremos cuando lo programemos." })
      setOrderData({ cloro: 0, acido: 0, notes: "" })
    } catch (e) {
      toast({ title: "Error", description: "No se pudo enviar el pedido.", variant: "destructive" })
    } finally {
      setIsOrdering(false)
    }
  }

  const openEditDialog = (req: any) => {
    setEditingRequest(req)
    setEditForm({
      cloro: Number(req.cloro || 0),
      acido: Number(req.acido || 0),
      notes: req.notes || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRequest) return
    if (editForm.cloro === 0 && editForm.acido === 0) {
      toast({ title: "Cantidad requerida", description: "Indicá al menos cloro o ácido.", variant: "destructive" })
      return
    }
    setIsSavingOrder(true)
    try {
      const data = await portalOrdersFetch(auth, 'PATCH', {
        requestId: editingRequest.id,
        cloro: editForm.cloro,
        acido: editForm.acido,
        notes: editForm.notes,
      })
      toast({ title: "Pedido actualizado", description: data.message })
      setEditingRequest(null)
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelRequestId) return
    setIsSavingOrder(true)
    try {
      const data = await portalOrdersFetch(auth, 'DELETE', { requestId: cancelRequestId })
      toast({ title: "Pedido anulado", description: data.message })
      setCancelRequestId(null)
    } catch (e: any) {
      toast({ title: "No se pudo anular", description: e.message, variant: "destructive" })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const formatWhatsAppNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith("54") && cleaned.length >= 10) {
      cleaned = "54" + cleaned;
    }
    return cleaned;
  };

  const renderOrderQty = (req: any) => (
    <>
      {Number(req.cloro) > 0 && `${req.cloro} CL`}
      {Number(req.cloro) > 0 && Number(req.acido) > 0 && ' · '}
      {Number(req.acido) > 0 && `${req.acido} AC`}
    </>
  )

  if (loadingClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Droplets className="h-12 w-12 text-primary animate-bounce mb-4" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">CARGANDO TU PORTAL...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <Card className="max-w-md w-full p-8 glass-card border-amber-200 rounded-3xl space-y-6">
          <Info className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Vínculo no encontrado</h2>
          <p className="text-sm text-muted-foreground">Tu correo ({user?.email}) no está vinculado a ninguna ficha de cliente activa. Contacta al soporte si crees que es un error.</p>
          <div className="space-y-2 w-full">
            {isStaffRole(userData?.role) && (
              <Button className="w-full font-bold gap-2" onClick={() => router.push('/')}>
                <Shield className="h-4 w-4" /> Volver a Panel de Trabajo
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setShowLogoutDialog(true)}>Cerrar Sesión</Button>
          </div>
        </Card>
      </div>
    );
  }

  const saldoARS = client.saldoActual || 0;
  const saldoUSD = client.saldoUSD || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm"><Droplets className="h-5 w-5 text-white" /></div>
          <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
        </div>
        <div className="flex items-center gap-2">
          {isStaffRole(userData?.role) && (
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5 h-9">
              <Shield className="h-4 w-4" /> 
              <span className="hidden sm:inline">Volver a Panel de Trabajo</span>
              <span className="sm:hidden">Volver</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)} className="text-muted-foreground font-bold gap-2 h-9">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </header>
            {(upcomingPlanned || upcomingDelivery) && (
        <div className="mx-auto max-w-4xl p-4">
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/20 shadow-lg">
            <CardContent className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600" />
              <p className="font-medium text-amber-900">
                La Próxima reposición será el día {new Date((upcomingPlanned ? upcomingPlanned.date : upcomingDelivery.date) + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}


      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <section className="space-y-1">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">¡Hola, {client.nombre}!</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
            <User className="h-3 w-3 text-primary" /> Mi cuenta Dosimat
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn("border-l-[6px] shadow-lg", saldoARS < 0 ? "border-l-rose-500 bg-rose-50/20" : "border-l-emerald-500 bg-emerald-50/20")}>
            <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo en Pesos (ARS)</p></CardHeader>
            <CardContent>
              <h3 className={cn("text-4xl font-black tabular-nums", saldoARS < 0 ? "text-rose-700" : "text-emerald-700")}>$ {Math.abs(saldoARS).toLocaleString('es-AR')}</h3>
              <p className="text-[10px] font-bold mt-1 text-slate-500 uppercase">{saldoARS < 0 ? "Saldo Pendiente" : "Saldo a Favor"}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-l-[6px] shadow-lg", saldoUSD < 0 ? "border-l-rose-500 bg-rose-50/20" : "border-l-emerald-500 bg-emerald-50/20")}>
            <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo en Dólares (USD)</p></CardHeader>
            <CardContent>
              <h3 className={cn("text-4xl font-black tabular-nums", saldoUSD < 0 ? "text-rose-700" : "text-emerald-700")}>u$s {Math.abs(saldoUSD).toLocaleString('es-AR')}</h3>
              <p className="text-[10px] font-bold mt-1 text-slate-500 uppercase">{saldoUSD < 0 ? "Saldo Pendiente" : "Saldo a Favor"}</p>
            </CardContent>
          </Card>
        </section>

        {deliveryLocked && (
          <Card className="border-l-[6px] border-l-rose-500 shadow-lg bg-rose-50/50">
            <CardContent className="p-5 flex items-start gap-4">
              <Lock className="h-8 w-8 text-rose-600 shrink-0" />
              <div className="space-y-2">
                <p className="font-black text-rose-900">Reparto en curso</p>
                <p className="text-sm text-rose-800/90">
                  Tu pedido ya está en camino. Para modificar o anular, comunicate con nosotros:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {settings?.supportWhatsapp && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2" asChild>
                      <a href={`https://wa.me/${formatWhatsAppNumber(settings.supportWhatsapp)}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {settings?.supportWhatsapp && (
                    <Button size="sm" variant="outline" className="font-bold gap-2" asChild>
                      <a href={`tel:${settings.supportWhatsapp.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4" /> Llamar
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            <Package className="h-4 w-4" /> Pedidos y entregas
          </h3>

          {staffReviewNotices.length > 0 && (
            <div className="space-y-3">
              {staffReviewNotices.map((req: any) => (
                <Card key={`review-${req.id}`} className="border-l-[6px] border-l-emerald-500 shadow-lg bg-emerald-50/60">
                  <CardContent className="p-5 flex items-start gap-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-black text-emerald-900">Tu pedido fue revisado</p>
                      <p className="text-sm text-emerald-800/90">{getStaffReviewNoticeMessage(req)}</p>
                      {req.routeDate && (
                        <p className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wide">
                          Este aviso se muestra hasta el día de la entrega programada.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {loadingRouteSheets ? (
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-bold">Consultando entregas...</span>
              </div>
            </Card>
          ) : upcomingDelivery && upcomingDelivery.status === 'active' ? (
              <Card className="border-l-[6px] border-l-amber-500 shadow-lg bg-gradient-to-r from-amber-50/80 to-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Truck className="h-5 w-5" />
                    Repartidor en camino
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    {new Date(upcomingDelivery.date + 'T12:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {upcomingDelivery.cloro > 0 && (
                      <div className="flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-xl px-4 py-2">
                        <Droplets className="h-4 w-4 text-blue-700" />
                        <span className="font-black text-blue-800">{upcomingDelivery.cloro} Cloro</span>
                      </div>
                    )}
                    {upcomingDelivery.acido > 0 && (
                      <div className="flex items-center gap-2 bg-rose-100 border border-rose-200 rounded-xl px-4 py-2">
                        <Beaker className="h-4 w-4 text-rose-700" />
                        <span className="font-black text-rose-800">{upcomingDelivery.acido} Ácido</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Los números de la planilla de reparto son los que figuran arriba. Para cambios, contactanos por teléfono o WhatsApp.
                  </p>
                </CardContent>
              </Card>
            ) : upcomingDelivery && upcomingDelivery.status === 'planned' ? (
              <Card className="border-l-[6px] border-l-amber-500 shadow-lg bg-gradient-to-r from-amber-50/80 to-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Truck className="h-5 w-5" />
                    Entrega programada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    {new Date(upcomingDelivery.date + 'T12:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    En la planilla figuran {upcomingDelivery.cloro} CL y {upcomingDelivery.acido} AC. Si modificás tu pedido abajo, avisamos al equipo para actualizar la hoja manualmente.
                  </p>
                </CardContent>
              </Card>
            ) : null}

          {loadingOpenOrders ? (
            <Card className="p-4 shadow-md border-dashed">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-bold">Cargando pedidos...</span>
              </div>
            </Card>
          ) : openOrders.length > 0 ? (
            <div className="space-y-3">
              {openOrders.map((req: any) => (
                <Card key={req.id} className="border-l-[6px] border-l-blue-500 shadow-md">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-blue-700">
                        {req.status === 'scheduled' ? 'En planilla de ruta' : 'Pendiente de programar'}
                      </p>
                      <p className="font-black text-slate-800">{renderOrderQty(req)}</p>
                      {req.notes && <p className="text-sm text-muted-foreground italic">&ldquo;{req.notes}&rdquo;</p>}
                      {req.status === 'scheduled' && req.needsStaffReview && (
                        <p className="text-xs text-amber-700 font-bold">Cambio enviado — el equipo actualizará la planilla.</p>
                      )}
                    </div>
                    {!deliveryLocked && (
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="font-bold gap-1" onClick={() => openEditDialog(req)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="font-bold gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setCancelRequestId(req.id)}>
                          <X className="h-3.5 w-3.5" /> Anular
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loadingRouteSheets && !upcomingDelivery && staffReviewNotices.length === 0 ? (
            <p className="text-sm text-muted-foreground font-medium px-1">No tenés pedidos abiertos en este momento.</p>
          ) : null}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            <History className="h-4 w-4" /> Últimas operaciones
          </h3>
          <Card className="overflow-hidden border-none shadow-xl">
            {loadingTx ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : txError ? (
              <div className="p-8 text-center space-y-2">
                <Info className="h-10 w-10 mx-auto text-amber-500" />
                <p className="text-sm font-bold text-slate-600">No pudimos cargar el historial.</p>
                <p className="text-xs text-muted-foreground">{txError}</p>
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <Receipt className="h-12 w-12 mx-auto text-slate-200" />
                <p className="text-sm font-bold text-slate-400 italic">No hay movimientos registrados todavía.</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx: any) => {
                  const info = txTypeMap[tx.type] || { label: tx.type, icon: Package, color: "bg-slate-50" };
                  const isPayment = tx.type === 'cobro';
                  const dateRaw = tx.date || "";
                  const date = new Date(dateRaw.includes('T') ? dateRaw : dateRaw + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <div key={tx.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", info.color)}><info.icon className="h-5 w-5" /></div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-tight">{info.label}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-base font-black tabular-nums", isPayment ? "text-emerald-600" : "text-slate-800")}>{isPayment ? '+' : ''}{tx.currency === 'USD' ? 'u$s' : '$'}{Math.abs(tx.amount).toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={cn("border-t-4 border-t-primary shadow-xl", deliveryLocked && "opacity-60")}>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Pedido Rápido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {deliveryLocked ? (
                <p className="text-sm text-muted-foreground font-medium">No podés enviar pedidos nuevos mientras el reparto está en curso. Contactanos por WhatsApp.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Cloro</Label><Input type="number" min={0} value={orderData.cloro} onChange={(e) => setOrderData({...orderData, cloro: Number(e.target.value)})} className="h-12 text-center font-black text-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Ácido</Label><Input type="number" min={0} value={orderData.acido} onChange={(e) => setOrderData({...orderData, acido: Number(e.target.value)})} className="h-12 text-center font-black text-xl" /></div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Notas</Label><Textarea placeholder="Ej: Pasar por la mañana..." value={orderData.notes} onChange={(e) => setOrderData({...orderData, notes: e.target.value})} className="min-h-[80px]" /></div>
                  <Button className="w-full h-12 font-black uppercase tracking-widest gap-2" onClick={handleSendOrder} disabled={isOrdering || (orderData.cloro === 0 && orderData.acido === 0)}>
                    {isOrdering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Enviar Pedido
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-emerald-600 text-white border-none shadow-xl relative overflow-hidden group">
            <MessageCircle className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform" />
            <CardHeader><CardTitle className="text-white">¿Dudas o Reclamos?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs font-medium leading-relaxed opacity-90">Escríbenos por WhatsApp para soporte técnico o enviar comprobantes de pago.</p>
              {settings?.supportWhatsapp && (
                <Button className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-black gap-2 h-11" asChild>
                  <a href={`https://wa.me/${formatWhatsAppNumber(settings.supportWhatsapp)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-5 w-5" /> WHATSAPP</a>
                </Button>
              )}
              {settings?.supportEmail && (
                <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white font-black gap-2 h-11" asChild>
                  <a href={`mailto:${settings.supportEmail}`}><Mail className="h-5 w-5" /> EMAIL</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar pedido</DialogTitle>
            <DialogDescription>
              {editingRequest?.status === 'scheduled'
                ? 'La planilla de ruta no se modifica sola; avisaremos al equipo de los cambios.'
                : 'Actualizá las cantidades de tu pedido.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Cloro</Label>
                <Input type="number" min={0} value={editForm.cloro} onChange={(e) => setEditForm({ ...editForm, cloro: Number(e.target.value) })} className="h-11 text-center font-black" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Ácido</Label>
                <Input type="number" min={0} value={editForm.acido} onChange={(e) => setEditForm({ ...editForm, acido: Number(e.target.value) })} className="h-11 text-center font-black" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Notas</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingOrder} className="font-bold">
              {isSavingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelRequestId} onOpenChange={(open) => !open && setCancelRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {openOrders?.find((r: any) => r.id === cancelRequestId)?.status === 'scheduled'
                ? 'Tu pedido seguirá visible en la planilla hasta que el equipo lo actualice. Te confirmaremos el cambio.'
                : 'Se eliminará tu solicitud pendiente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive font-bold" disabled={isSavingOrder}>
              {isSavingOrder ? 'Anulando...' : 'Anular pedido'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar sesión</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro que deseas cerrar tu sesión actual?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLogoutDialog(false); handleLogout(); }} className="bg-destructive hover:bg-destructive/90 text-white">Cerrar sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
