
"use client"

import { useMemo, useState, useEffect } from "react"
import { useUser, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc, limit, setDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Calendar
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { normalizeEmail } from "@/lib/auth-routing"

const txTypeMap: Record<string, { label: string, icon: any, color: string }> = {
  sale: { label: "Venta de Producto", icon: ArrowDownLeft, color: "text-blue-600 bg-blue-50" },
  refill: { label: "Reposición de Bidones", icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
  Reposición: { label: "Reposición de Bidones", icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
  service: { label: "Servicio Técnico", icon: ArrowDownLeft, color: "text-indigo-600 bg-indigo-50" },
  cobro: { label: "Pago Realizado", icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50" },
  adjustment: { label: "Ajuste de Saldo", icon: Info, color: "text-slate-600 bg-slate-50" },
}

export default function ClientPortal() {
  const { user, userData } = useUser()
  const { auth, firestore } = useFirebase()
  const db = firestore!
  const router = useRouter()
  const { toast } = useToast()

  const [orderData, setOrderData] = useState({ cloro: 0, acido: 0, notes: "" })
  const [isOrdering, setIsOrdering] = useState(false)
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null)
  const [isLinkingClient, setIsLinkingClient] = useState(false)

  const clientsRef = useMemoFirebase(() => {
    if (!user?.email) return null;
    return query(collection(db, 'clients'), where('mail', '==', normalizeEmail(user.email)), limit(1));
  }, [db, user?.email]);
  
  const { data: clientDocs, isLoading: loadingClient } = useCollection(clientsRef);
  const client = clientDocs?.[0];

  useEffect(() => {
    if (!user || !client?.id) {
      setLinkedClientId(null)
      return
    }

    if (userData?.clientId === client.id) {
      setLinkedClientId(client.id)
      return
    }

    let cancelled = false
    setIsLinkingClient(true)

    setDoc(doc(db, 'users', user.uid), {
      clientId: client.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
      .then(() => {
        if (!cancelled) setLinkedClientId(client.id)
      })
      .catch((err) => console.error("Error syncing clientId:", err))
      .finally(() => {
        if (!cancelled) setIsLinkingClient(false)
      })

    return () => { cancelled = true }
  }, [user, client?.id, userData?.clientId, db])

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'company'), [db]);
  const { data: settings } = useDoc(settingsRef);

  const txQuery = useMemoFirebase(() => {
    if (!linkedClientId) return null;
    return query(collection(db, 'transactions'), where('clientId', '==', linkedClientId), orderBy('date', 'desc'));
  }, [db, linkedClientId]);
  
  const { data: transactions, isLoading: loadingTx } = useCollection(txQuery);

  const routeQuery = useMemoFirebase(() => {
    if (!linkedClientId) return null;
    return query(
      collection(db, 'route_sheets'),
      where('participantClientIds', 'array-contains', linkedClientId),
      where('status', 'in', ['planned', 'active'])
    );
  }, [db, linkedClientId]);

  const pendingOrderQuery = useMemoFirebase(() => {
    if (!linkedClientId) return null;
    return query(
      collection(db, 'client_requests'),
      where('clientId', '==', linkedClientId),
      where('status', '==', 'pending')
    );
  }, [db, linkedClientId]);

  const { data: routeSheets, isLoading: loadingRoute } = useCollection(routeQuery);
  const { data: pendingOrders } = useCollection(pendingOrderQuery);

  const upcomingDelivery = useMemo(() => {
    if (!routeSheets?.length || !linkedClientId) return null;
    const sorted = [...routeSheets].sort(
      (a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime()
    );
    for (const sheet of sorted) {
      const item = sheet.items?.find((i: any) => i.clientId === linkedClientId);
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
  }, [routeSheets, linkedClientId]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  const handleSendOrder = async () => {
    if (!client) return
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

  const formatWhatsAppNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith("54") && cleaned.length >= 10) {
      cleaned = "54" + cleaned;
    }
    return cleaned;
  };

  if (loadingClient || isLinkingClient) {
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
          <Button variant="outline" className="w-full" onClick={handleLogout}>Cerrar Sesión</Button>
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
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground font-bold gap-2">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </header>

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

        {(loadingRoute || upcomingDelivery || (pendingOrders && pendingOrders.length > 0)) && (
          <section className="space-y-4">
            {loadingRoute ? (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-bold">Consultando entregas...</span>
                </div>
              </Card>
            ) : upcomingDelivery ? (
              <Card className="border-l-[6px] border-l-amber-500 shadow-lg bg-gradient-to-r from-amber-50/80 to-white overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Truck className="h-5 w-5" />
                    {upcomingDelivery.status === 'active' ? 'Repartidor en camino' : 'Entrega programada'}
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
                    {upcomingDelivery.status === 'active'
                      ? 'Tu pedido está en la ruta de entrega de hoy.'
                      : 'Tu pedido fue incluido en la planilla de reparto.'}
                  </p>
                </CardContent>
              </Card>
            ) : pendingOrders && pendingOrders.length > 0 ? (
              <Card className="border-l-[6px] border-l-blue-500 shadow-lg bg-blue-50/30">
                <CardContent className="p-5 flex items-start gap-4">
                  <Send className="h-8 w-8 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-slate-800">Pedido en revisión</p>
                    <p className="text-sm text-muted-foreground">
                      Recibimos tu solicitud y la estamos programando. Te avisaremos acá cuando quede en ruta.
                    </p>
                    <div className="flex gap-2 pt-2 flex-wrap">
                      {pendingOrders.map((req: any) => (
                        <span key={req.id} className="text-[10px] font-black uppercase bg-white border px-2 py-1 rounded-lg text-slate-600">
                          {Number(req.cloro) > 0 && `${req.cloro} CL`}
                          {Number(req.cloro) > 0 && Number(req.acido) > 0 && ' · '}
                          {Number(req.acido) > 0 && `${req.acido} AC`}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><History className="h-4 w-4" /> Historial Reciente</h3>
            </div>
            <Card className="overflow-hidden border-none shadow-xl">
              {loadingTx ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="p-12 text-center space-y-4"><Receipt className="h-12 w-12 mx-auto text-slate-200" /><p className="text-sm font-bold text-slate-400 italic">No hay movimientos todavía registrados.</p></div>
              ) : (
                <div className="divide-y">
                  {transactions.map((tx: any) => {
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: Package, color: "bg-slate-50" };
                    const isPayment = tx.type === 'cobro';
                    const dateRaw = tx.date || "";
                    const date = new Date(dateRaw.includes('T') ? dateRaw : dateRaw + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
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
          </div>

          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-xl">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Pedido Rápido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Cloro</Label><Input type="number" value={orderData.cloro} onChange={(e) => setOrderData({...orderData, cloro: Number(e.target.value)})} className="h-12 text-center font-black text-xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Ácido</Label><Input type="number" value={orderData.acido} onChange={(e) => setOrderData({...orderData, acido: Number(e.target.value)})} className="h-12 text-center font-black text-xl" /></div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Notas</Label><Textarea placeholder="Ej: Pasar por la mañana..." value={orderData.notes} onChange={(e) => setOrderData({...orderData, notes: e.target.value})} className="min-h-[80px]" /></div>
                <Button className="w-full h-12 font-black uppercase tracking-widest gap-2" onClick={handleSendOrder} disabled={isOrdering || (orderData.cloro === 0 && orderData.acido === 0)}>
                  {isOrdering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Enviar Pedido
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white border-none shadow-xl relative overflow-hidden group">
              <MessageCircle className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform" />
              <CardHeader><CardTitle className="text-white">¿Dudas o Reclamos?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs font-medium leading-relaxed opacity-90">Escríbenos por WhatsApp para soporte técnico o enviar comprobantes de pago.</p>
                {settings?.supportWhatsapp && (
                  <Button className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-black gap-2 h-11" asChild>
                    <a href={`https://wa.me/${formatWhatsAppNumber(settings.supportWhatsapp)}`} target="_blank"><MessageCircle className="h-5 w-5" /> WHATSAPP</a>
                  </Button>
                )}
                {settings?.supportEmail && (
                  <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white font-black gap-2 h-11" asChild>
                    <a href={`mailto:${settings.supportEmail}`}><Mail className="h-5 w-5" /> EMAIL</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
