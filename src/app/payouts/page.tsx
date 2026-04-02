"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Banknote, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Coins, 
  History, 
  Plus, 
  Trash2, 
  User, 
  Wallet,
  Calculator,
  Droplet,
  Beaker,
  Clock,
  MapPin,
  ChevronRight,
  ArrowRight,
  Info,
  Loader2,
  FilterX
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "../../firebase"
import { collection, query, orderBy, where, doc, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function PayoutsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isEmployee = userData?.role === 'Employee'

  // Redirección por Rol
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (!['Admin', 'Employee'].includes(userData.role)) {
        router.replace('/')
      }
    }
  }, [userData, isUserLoading, router])

  const [activeTab, setActiveTab] = useState("new")
  const [selectedCollabId, setSelectedCollabId] = useState("")
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  })
  const [endDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [extras, setExtras] = useState<any[]>([])
  const [accountId, setAccountId] = useState("pending")

  // Queries
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])
  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'payouts'), orderBy('date', 'desc')), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])

  const { data: collaborators } = useCollection(usersQuery)
  const { data: routeSheets } = useCollection(routesQuery)
  const { data: payouts, isLoading: loadingPayouts } = useCollection(payoutsQuery)
  const { data: accounts } = useCollection(accountsQuery)

  const selectedCollab = useMemo(() => collaborators?.find(c => c.id === selectedCollabId), [collaborators, selectedCollabId])

  // Filtrar ítems de rutas pendientes de liquidar para este colaborador
  const pendingDeliveries = useMemo(() => {
    if (!selectedCollab || !routeSheets) return []
    const results: any[] = []
    
    routeSheets.forEach(sheet => {
      const sheetDate = sheet.date.split('T')[0];
      if (sheetDate < startDate || sheetDate > endDate) return;

      sheet.items?.forEach((item: any, idx: number) => {
        // Determinamos si ya fue liquidado para el rol correspondiente
        const isLiquidado = selectedCollab.role === 'Replenisher' ? item.liquidadoRepositor : item.liquidadoComunicador;
        
        if (!isLiquidado && (item.realChlorine > 0 || item.realAcid > 0)) {
          results.push({
            id: `${sheet.id}_${idx}`,
            sheetId: sheet.id,
            sheetDate: sheet.date,
            itemIdx: idx,
            cloro: item.realChlorine || 0,
            acido: item.realAcid || 0,
            clientName: item.clientName || "Cliente"
          })
        }
      })
    })
    return results
  }, [selectedCollab, routeSheets, startDate, endDate])

  const totals = useMemo(() => {
    const config = selectedCollab?.feesConfig || { valorCloro: 0, valorAcido: 0, valorHora: 0, valorKm: 0, baseFija: 0 }
    let subtotalItems = 0
    let totalCloro = 0
    let totalAcido = 0

    pendingDeliveries.forEach(d => {
      if (selectedItems.includes(d.id)) {
        totalCloro += d.cloro
        totalAcido += d.acido
        subtotalItems += (d.cloro * (config.valorCloro || 0)) + (d.acido * (config.valorAcido || 0))
      }
    })

    const subtotalExtras = extras.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const baseFija = Number(config.baseFija || 0)

    return {
      cloro: totalCloro,
      acido: totalAcido,
      subtotalItems,
      subtotalExtras,
      baseFija,
      total: subtotalItems + subtotalExtras + baseFija
    }
  }, [selectedItems, pendingDeliveries, selectedCollab, extras])

  const handleAddExtra = (type: 'hours' | 'km' | 'manual') => {
    const config = selectedCollab?.feesConfig || { valorHora: 0, valorKm: 0 }
    const id = Math.random().toString(36).substring(2, 9)
    let newExtra = { id, type, description: "", qty: 1, amount: 0 }

    if (type === 'hours') {
      newExtra.description = "Servicio Técnico / Horas";
      newExtra.amount = config.valorHora;
    } else if (type === 'km') {
      newExtra.description = "Adicional por KM";
      newExtra.amount = config.valorKm;
    } else {
      newExtra.description = "Concepto Adicional";
    }
    setExtras([...extras, newExtra])
  }

  const updateExtra = (id: string, field: string, value: any) => {
    setExtras(extras.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value }
        if (field === 'qty' && (e.type === 'hours' || e.type === 'km')) {
          const config = selectedCollab?.feesConfig || { valorHora: 0, valorKm: 0 }
          updated.amount = value * (e.type === 'hours' ? config.valorHora : config.valorKm)
        }
        return updated
      }
      return e
    }))
  }

  const handleProcessPayout = () => {
    if (!selectedCollab || totals.total <= 0 || accountId === 'pending') {
      toast({ title: "Datos incompletos", description: "Selecciona un colaborador, ítems y la caja de pago.", variant: "destructive" });
      return;
    }

    const payoutId = Math.random().toString(36).substring(2, 11)
    const now = new Date().toISOString()

    // 1. Crear documento de Liquidación
    const payoutData = {
      id: payoutId,
      userId: selectedCollab.id,
      userName: selectedCollab.name,
      date: now,
      totalARS: totals.total,
      currency: "ARS",
      financialAccountId: accountId,
      items: [
        { type: 'items', description: `Entrega de Bidones (${totals.cloro} CL, ${totals.acido} AC)`, amount: totals.subtotalItems },
        { type: 'base', description: 'Sueldo Base / Fijo', amount: totals.baseFija },
        ...extras.map(e => ({ type: e.type, description: e.description, amount: e.amount, qty: e.qty }))
      ]
    }
    addDocumentNonBlocking(collection(db, 'payouts'), payoutData)

    // 2. Marcar rutas como liquidadas
    const fieldToUpdate = selectedCollab.role === 'Replenisher' ? 'liquidadoRepositor' : 'liquidadoComunicador';
    selectedItems.forEach(itemId => {
      const itemData = pendingDeliveries.find(d => d.id === itemId)
      if (itemData && routeSheets) {
        const sheet = routeSheets.find(s => s.id === itemData.sheetId);
        if (sheet) {
          const updatedItems = sheet.items.map((it: any, idx: number) => 
            idx === itemData.itemIdx ? { ...it, [fieldToUpdate]: true } : it
          )
          updateDocumentNonBlocking(doc(db, 'route_sheets', sheet.id), { items: updatedItems })
        }
      }
    })

    // 3. Generar Gasto en Finanzas
    const txId = Math.random().toString(36).substring(2, 11)
    const txData = {
      id: txId,
      date: now,
      type: 'Expense',
      amount: -totals.total,
      currency: 'ARS',
      description: `Liquidación de haberes: ${selectedCollab.name} (#${payoutId.toUpperCase().slice(0,6)})`,
      financialAccountId: accountId,
      recordedByUserId: userData?.id || 'system',
      isAdjustment: false
    }
    addDocumentNonBlocking(collection(db, 'transactions'), txData)
    updateDocumentNonBlocking(doc(db, 'financial_accounts', accountId), { initialBalance: increment(-totals.total) })

    toast({ title: "Liquidación procesada", description: `Se descontaron $${totals.total.toLocaleString()} de caja.` })
    resetForm()
    setActiveTab("history")
  }

  const resetForm = () => {
    setSelectedCollabId("")
    setSelectedItems([])
    setExtras([])
    setAccountId("pending")
  }

  if (isUserLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <Banknote className="h-7 w-7" /> Liquidaciones
            </h1>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="new" className="font-bold">Nueva</TabsTrigger>
              <TabsTrigger value="history" className="font-bold"><History className="h-4 w-4 mr-2" /> Historial</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {activeTab === "new" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest">1. Selección de Colaborador</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Colaborador</Label>
                    <Select value={selectedCollabId} onValueChange={setSelectedCollabId}>
                      <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                      <SelectContent>
                        {collaborators?.filter(c => ['Admin', 'Employee', 'Communicator', 'Replenisher'].includes(c.role)).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Desde</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Hasta</Label>
                    <Input type="date" value={endDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {selectedCollab && (
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest">2. Reposiciones Pendientes</CardTitle>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{pendingDeliveries.length} disponibles</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {pendingDeliveries.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground italic text-sm">No hay entregas pendientes para liquidar en este periodo.</div>
                    ) : (
                      <div className="border-t">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="w-12"><Checkbox checked={selectedItems.length === pendingDeliveries.length} onCheckedChange={(checked) => setSelectedItems(checked ? pendingDeliveries.map(d => d.id) : [])} /></TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Entrega Real</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase">Subtotal Honorario</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingDeliveries.map(d => {
                              const config = selectedCollab.feesConfig || { valorCloro: 0, valorAcido: 0 }
                              const sub = (d.cloro * (config.valorCloro || 0)) + (d.acido * (config.valorAcido || 0))
                              return (
                                <TableRow key={d.id} className="hover:bg-primary/5 cursor-pointer" onClick={() => setSelectedItems(prev => prev.includes(d.id) ? prev.filter(i => i !== d.id) : [...prev, d.id])}>
                                  <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedItems.includes(d.id)} onCheckedChange={(checked) => setSelectedItems(prev => checked ? [...prev, d.id] : prev.filter(i => i !== d.id))} /></TableCell>
                                  <TableCell className="text-xs font-bold">{new Date(d.sheetDate + 'T12:00:00').toLocaleDateString('es-AR')}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700">{d.cloro} CL</Badge>
                                      <Badge variant="outline" className="text-[9px] font-bold bg-rose-50 text-rose-700">{d.acido} AC</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-black text-xs text-emerald-700">${sub.toLocaleString()}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedCollab && (
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest">3. Otros Conceptos y Extras</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black" onClick={() => handleAddExtra('hours')}><Clock className="h-3 w-3 mr-1" /> HORAS</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black" onClick={() => handleAddExtra('km')}><MapPin className="h-3 w-3 mr-1" /> KM</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black" onClick={() => handleAddExtra('manual')}><Plus className="h-3 w-3 mr-1" /> MANUAL</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {extras.map(extra => (
                      <div key={extra.id} className="flex gap-4 items-end bg-muted/10 p-3 rounded-xl border border-dashed animate-in slide-in-from-left-2 duration-300">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">Descripción</Label>
                          <Input value={extra.description ?? ""} onChange={(e) => updateExtra(extra.id, 'description', e.target.value)} className="h-9 bg-white" />
                        </div>
                        {(extra.type === 'hours' || extra.type === 'km') && (
                          <div className="w-24 space-y-1 text-center">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">{extra.type === 'hours' ? 'Horas' : 'Kilómetros'}</Label>
                            <Input type="number" value={extra.qty ?? 0} onChange={(e) => updateExtra(extra.id, 'qty', Number(e.target.value))} className="h-9 text-center font-black bg-white" />
                          </div>
                        )}
                        <div className="w-32 space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-emerald-700">Monto ($)</Label>
                          <Input type="number" value={extra.amount ?? 0} onChange={(e) => updateExtra(extra.id, 'amount', Number(e.target.value))} className="h-9 text-right font-black bg-white" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setExtras(extras.filter(e => e.id !== extra.id))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {extras.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground italic">No hay conceptos adicionales agregados.</p>}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="glass-card sticky top-8 border-t-4 border-t-primary shadow-2xl">
                <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs uppercase font-black tracking-widest text-primary">Resumen de Boleta</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Honorarios Variable:</span><span className="font-black">${totals.subtotalItems.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Conceptos Extras:</span><span className="font-black">${totals.subtotalExtras.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Sueldo Fijo / Base:</span><span className="font-black">${totals.baseFija.toLocaleString()}</span></div>
                    <div className="pt-3 border-t border-dashed flex justify-between items-end">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">TOTAL A PAGAR</p>
                      <p className="text-4xl font-black text-primary">${totals.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Caja de Salida</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger className="h-12 bg-white border-emerald-200"><SelectValue placeholder="Elegir caja..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">--- SELECCIONAR CAJA ---</SelectItem>
                          {accounts?.filter(a => a.currency === 'ARS').map(a => (<SelectItem key={a.id} value={a.id}>{a.name} (${Number(a.initialBalance || 0).toLocaleString()})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full h-16 font-black shadow-xl text-xl uppercase tracking-tighter gap-3" disabled={!selectedCollab || totals.total <= 0 || accountId === 'pending'} onClick={handleProcessPayout}>
                      <Banknote className="h-6 w-6" /> LIQUIDAR Y PAGAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Colaborador</Label><Select value={selectedCollabId || "all"} onValueChange={setSelectedCollabId}><SelectTrigger className="w-[200px] bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{collaborators?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <Button variant="outline" size="icon" onClick={() => { setSelectedCollabId("all"); setStartDate(""); }}><FilterX className="h-4 w-4" /></Button>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-md">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Desglose</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Total Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts?.filter(p => selectedCollabId === "all" || p.userId === selectedCollabId).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-bold">{new Date(p.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.userName?.[0]}</div><span className="font-bold text-xs">{p.userName}</span></div></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.items?.map((it: any, idx: number) => it.amount > 0 && (
                            <Badge key={idx} variant="outline" className="text-[8px] font-bold uppercase">{it.description}: ${it.amount.toLocaleString()}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-700">${p.totalARS.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!payouts || payouts.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No se registran liquidaciones aún.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </SidebarInset>
      <MobileNav />
    </div>
  )
}
