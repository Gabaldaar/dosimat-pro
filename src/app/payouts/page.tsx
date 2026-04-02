
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
  FilterX,
  Settings2,
  ListRestart,
  X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "../../firebase"
import { collection, query, orderBy, where, doc, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function PayoutsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

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

  // Estado para gestión de conceptos
  const [isConceptManagerOpen, setIsConceptManagerOpen] = useState(false)
  const [newConceptName, setNewConceptName] = useState("")
  const [newConceptType, setNewConceptType] = useState<"fixed" | "hourly" | "km">("fixed")

  // Queries
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])
  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'payouts'), orderBy('date', 'desc')), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const conceptsQuery = useMemoFirebase(() => query(collection(db, 'payout_concepts'), orderBy('name', 'asc')), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])

  const { data: collaborators } = useCollection(usersQuery)
  const { data: routeSheets } = useCollection(routesQuery)
  const { data: payouts, isLoading: loadingPayouts } = useCollection(payoutsQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: concepts } = useCollection(conceptsQuery)
  const { data: clients } = useCollection(clientsQuery)

  const selectedCollab = useMemo(() => collaborators?.find(c => c.id === selectedCollabId), [collaborators, selectedCollabId])

  // Filtrar ítems de rutas pendientes de liquidar
  const pendingDeliveries = useMemo(() => {
    if (!selectedCollab || !routeSheets || !clients) return []
    const results: any[] = []
    
    routeSheets.forEach(sheet => {
      const sheetDate = (sheet.date || "").split('T')[0];
      if (sheetDate < startDate || sheetDate > endDate) return;

      sheet.items?.forEach((item: any, idx: number) => {
        const isLiquidado = selectedCollab.role === 'Replenisher' ? item.liquidadoRepositor : item.liquidadoComunicador;
        
        if (!isLiquidado && (item.realChlorine > 0 || item.realAcid > 0)) {
          // Buscar el nombre del cliente en el catálogo de clientes
          const client = clients.find(c => c.id === item.clientId);
          const clientName = client ? `${client.apellido}, ${client.nombre}` : "Cliente Desconocido";

          results.push({
            id: `${sheet.id}_${idx}`,
            sheetId: sheet.id,
            sheetDate: sheet.date,
            itemIdx: idx,
            cloro: item.realChlorine || 0,
            acido: item.realAcid || 0,
            clientName: clientName
          })
        }
      })
    })
    return results
  }, [selectedCollab, routeSheets, clients, startDate, endDate])

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

  const handleAddExtraFromConcept = (conceptId: string) => {
    const concept = concepts?.find(c => c.id === conceptId)
    if (!concept) return

    const config = selectedCollab?.feesConfig || { valorHora: 0, valorKm: 0 }
    const id = Math.random().toString(36).substring(2, 9)
    
    let amount = 0
    if (concept.type === 'hourly') amount = config.valorHora
    else if (concept.type === 'km') amount = config.valorKm
    else amount = Number(concept.defaultAmount || 0)

    const newExtra = {
      id,
      conceptId: concept.id,
      type: concept.type,
      description: concept.name,
      qty: 1,
      amount,
      notes: ""
    }
    setExtras([...extras, newExtra])
  }

  const handleAddManualExtra = () => {
    const id = Math.random().toString(36).substring(2, 9)
    const newExtra = {
      id,
      conceptId: "manual",
      type: "fixed",
      description: "Concepto manual",
      qty: 1,
      amount: 0,
      notes: ""
    }
    setExtras([...extras, newExtra])
  }

  const updateExtra = (id: string, field: string, value: any) => {
    setExtras(extras.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value }
        if (field === 'qty' && (e.type === 'hourly' || e.type === 'km')) {
          const config = selectedCollab?.feesConfig || { valorHora: 0, valorKm: 0 }
          updated.amount = Number(value) * (e.type === 'hourly' ? config.valorHora : config.valorKm)
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

    const payoutData = {
      id: payoutId,
      userId: selectedCollab.id,
      userName: selectedCollab.name,
      date: now,
      totalARS: totals.total,
      currency: "ARS",
      financialAccountId: accountId,
      items: [
        { type: 'items', description: `Entrega de Bidones (${totals.cloro} CL, ${totals.acido} AC)`, amount: totals.subtotalItems, qty: 1, notes: "" },
        { type: 'base', description: 'Sueldo Base / Fijo', amount: totals.baseFija, qty: 1, notes: "" },
        ...extras.map(e => ({ type: e.type, conceptId: e.conceptId, description: e.description, amount: e.amount, qty: e.qty, notes: e.notes }))
      ]
    }
    addDocumentNonBlocking(collection(db, 'payouts'), payoutData)

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
      accountBalanceAfter: (Number(accounts?.find(a => a.id === accountId)?.initialBalance || 0)) - totals.total
    }
    addDocumentNonBlocking(collection(db, 'transactions'), txData)
    updateDocumentNonBlocking(doc(db, 'financial_accounts', accountId), { initialBalance: increment(-totals.total) })

    toast({ title: "Liquidación procesada", description: `Se descontaron $${totals.total.toLocaleString()} de caja.` })
    resetForm()
  }

  const handleAddConcept = () => {
    if (!newConceptName.trim()) return
    const id = Math.random().toString(36).substring(2, 9)
    setDocumentNonBlocking(doc(db, 'payout_concepts', id), {
      id,
      name: newConceptName,
      type: newConceptType,
      defaultAmount: 0
    }, { merge: true })
    setNewConceptName("")
    toast({ title: "Concepto creado" })
  }

  const resetForm = () => {
    setSelectedCollabId("")
    setSelectedItems([])
    setExtras([])
    setAccountId("pending")
    setActiveTab("history")
    toast({ title: "Formulario reiniciado", description: "Se han descartado todos los cambios actuales." })
  }

  if (isUserLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <Banknote className="h-7 w-7" /> Liquidaciones
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 md:flex-none">
              <TabsList className="bg-muted/50 p-1 w-full">
                <TabsTrigger value="new" className="font-bold flex-1">Nueva</TabsTrigger>
                <TabsTrigger value="history" className="font-bold flex-1"><History className="h-4 w-4 mr-2" /> Historial</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setIsConceptManagerOpen(true)} title="Gestionar Conceptos Maestros">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
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
                      <div className="border-t overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="w-12"><Checkbox checked={selectedItems.length === pendingDeliveries.length} onCheckedChange={(checked) => setSelectedItems(checked ? pendingDeliveries.map(d => d.id) : [])} /></TableHead>
                              <TableHead className="text-[10px] font-black uppercase min-w-[100px]">Fecha</TableHead>
                              <TableHead className="text-[10px] font-black uppercase min-w-[150px]">Cliente</TableHead>
                              <TableHead className="text-[10px] font-black uppercase min-w-[120px]">Entrega Real</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase min-w-[100px]">Honorario</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingDeliveries.map(d => {
                              const config = selectedCollab.feesConfig || { valorCloro: 0, valorAcido: 0 }
                              const sub = (Number(d.cloro) * (config.valorCloro || 0)) + (Number(d.acido) * (config.valorAcido || 0))
                              return (
                                <TableRow key={d.id} className="hover:bg-primary/5 cursor-pointer" onClick={() => setSelectedItems(prev => prev.includes(d.id) ? prev.filter(i => i !== d.id) : [...prev, d.id])}>
                                  <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedItems.includes(d.id)} onCheckedChange={(checked) => setSelectedItems(prev => checked ? [...prev, d.id] : prev.filter(i => i !== d.id))} /></TableCell>
                                  <TableCell className="text-xs font-bold">{new Date(d.sheetDate + 'T12:00:00').toLocaleDateString('es-AR')}</TableCell>
                                  <TableCell className="text-xs font-medium truncate max-w-[150px]">{d.clientName}</TableCell>
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest">3. Conceptos Adicionales</CardTitle>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Select onValueChange={handleAddExtraFromConcept}>
                          <SelectTrigger className="h-9 w-full md:w-[200px] text-xs font-bold border-primary/30">
                            <SelectValue placeholder="Añadir Concepto..." />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-48">
                              {concepts?.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                              {(!concepts || concepts.length === 0) && <p className="p-2 text-[10px] text-muted-foreground italic text-center">Sin conceptos maestros.</p>}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-9 text-[10px] font-black border border-dashed flex-1 md:flex-none" onClick={handleAddManualExtra}>
                          <Plus className="h-3 w-3 mr-1" /> MANUAL
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {extras.map(extra => (
                      <div key={extra.id} className="bg-muted/10 p-4 rounded-xl border border-dashed animate-in slide-in-from-left-2 duration-300 space-y-3">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Concepto / Descripción</Label>
                            <Input value={extra.description ?? ""} onChange={(e) => updateExtra(extra.id, 'description', e.target.value)} className="h-9 bg-white font-bold" />
                          </div>
                          {(extra.type === 'hourly' || extra.type === 'km') && (
                            <div className="w-full md:w-24 space-y-1 text-center">
                              <Label className="text-[9px] font-bold uppercase text-muted-foreground">{extra.type === 'hourly' ? 'Horas' : 'Kilómetros'}</Label>
                              <Input type="number" value={extra.qty ?? 0} onChange={(e) => updateExtra(extra.id, 'qty', Number(e.target.value))} className="h-9 text-center font-black bg-white" />
                            </div>
                          )}
                          <div className="w-full md:w-32 space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-emerald-700">Monto ($)</Label>
                            <Input type="number" value={extra.amount ?? 0} onChange={(e) => updateExtra(extra.id, 'amount', Number(e.target.value))} className="h-9 text-right font-black bg-white" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => setExtras(extras.filter(e => e.id !== extra.id))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Notas / Aclaraciones</Label>
                          <Input 
                            placeholder="Ej: Servicio en lo de Pérez, Zona crítica..." 
                            value={extra.notes ?? ""} 
                            onChange={(e) => updateExtra(extra.id, 'notes', e.target.value)} 
                            className="h-8 bg-white text-xs italic" 
                          />
                        </div>
                      </div>
                    ))}
                    {extras.length === 0 && <p className="text-center py-8 text-xs text-muted-foreground italic bg-slate-50/50 rounded-xl border border-dashed">No hay conceptos adicionales agregados para esta liquidación.</p>}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="glass-card h-fit sticky top-8 border-t-4 border-t-primary shadow-2xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs uppercase font-black tracking-widest text-primary">Resumen de Liquidación</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Honorarios por Bidones:</span><span className="font-black">${totals.subtotalItems.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Conceptos Adicionales:</span><span className="font-black">${totals.subtotalExtras.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Sueldo Base / Fijo:</span><span className="font-black">${totals.baseFija.toLocaleString()}</span></div>
                    <div className="pt-3 border-t border-dashed flex justify-between items-end">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">TOTAL A ABONAR</p>
                      <p className="text-4xl font-black text-primary">${totals.total.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Caja de Pago (Origen)</Label>
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
                    <Button variant="outline" className="w-full h-12 border-rose-600 text-rose-600 hover:bg-rose-50 font-bold uppercase text-xs gap-2" onClick={resetForm}>
                      <X className="h-4 w-4" /> CANCELAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Filtrar por Colaborador</Label>
                <Select value={selectedCollabId || "all"} onValueChange={setSelectedCollabId}>
                  <SelectTrigger className="w-[200px] bg-white h-10 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los miembros</SelectItem>
                    {collaborators?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setSelectedCollabId("all"); setStartDate(""); }} title="Limpiar filtros">
                <FilterX className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-md">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Desglose de Conceptos</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Total Pagado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts?.filter(p => selectedCollabId === "all" || p.userId === selectedCollabId).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-bold text-slate-600">{new Date(p.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">{p.userName?.[0]}</div>
                          <span className="font-black text-xs text-slate-800">{p.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {p.items?.map((it: any, idx: number) => it.amount !== 0 && (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="text-[8px] font-bold uppercase bg-slate-50 text-slate-600 border-slate-200">
                                {it.description}: ${Number(it.amount).toLocaleString()}
                              </Badge>
                              {it.notes && <span className="text-[7px] text-muted-foreground italic px-1 truncate max-w-[150px]">Obs: {it.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-700 text-sm">
                        ${Number(p.totalARS || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payouts || payouts.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">No se registran liquidaciones históricas todavía.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Gestor de Conceptos Maestros */}
        <Dialog open={isConceptManagerOpen} onOpenChange={setIsConceptManagerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Settings2 className="h-5 w-5" />
                <DialogTitle>Conceptos de Liquidación</DialogTitle>
              </div>
              <DialogDescription>Configura los ítems recurrentes para estandarizar las liquidaciones y obtener estadísticas precisas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-4">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Nuevo Concepto Maestro</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Nombre del Ítem</Label>
                    <Input value={newConceptName} onChange={(e) => setNewConceptName(e.target.value)} placeholder="Ej: Adicional por distancia" className="bg-white h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Tipo de Cálculo</Label>
                    <Select value={newConceptType} onValueChange={(v: any) => setNewConceptType(v)}>
                      <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Monto Fijo / Directo</SelectItem>
                        <SelectItem value="hourly">Basado en Horas (Perfil)</SelectItem>
                        <SelectItem value="km">Basado en KM (Perfil)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddConcept} className="w-full h-9 font-bold"><Plus className="h-4 w-4 mr-2" /> Crear Concepto</Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Conceptos Configurados</p>
                <ScrollArea className="h-64 border rounded-xl bg-slate-50/50 p-2">
                  <div className="space-y-2">
                    {concepts?.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm group">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-800 uppercase leading-tight">{c.name}</p>
                          <Badge variant="secondary" className="text-[8px] font-bold uppercase px-1.5 h-4">
                            {c.type === 'fixed' ? 'Fijo' : c.type === 'hourly' ? 'Horas' : 'Kilometraje'}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteDocumentNonBlocking(doc(db, 'payout_concepts', c.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!concepts || concepts.length === 0) && <p className="text-center py-12 text-[10px] text-muted-foreground italic">No hay conceptos preconfigurados todavía.</p>}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsConceptManagerOpen(false)} className="w-full font-bold">Cerrar Gestor</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}
