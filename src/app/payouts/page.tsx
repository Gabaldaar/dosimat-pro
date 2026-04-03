
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
  X,
  AlertTriangle,
  Eye,
  FileText,
  Truck,
  ArrowRightLeft,
  Edit,
  Save
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
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
  const [exchangeRate, setExchangeRate] = useState(1)

  // Estado para gestión de conceptos
  const [isConceptManagerOpen, setIsConceptManagerOpen] = useState(false)
  const [newConceptName, setNewConceptName] = useState("")
  const [newConceptType, setNewConceptType] = useState<"fixed" | "hourly" | "km">("fixed")
  const [newConceptCurrency, setNewConceptCurrency] = useState<"ARS" | "USD">("ARS")
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null)
  
  // Estado para eliminación/reversión
  const [payoutToDelete, setPayoutToDelete] = useState<any | null>(null)
  const [payoutForDetails, setPayoutForDetails] = useState<any | null>(null)

  // Queries
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])
  const payoutsQuery = useMemoFirebase(() => query(collection(db, 'payouts'), orderBy('date', 'desc')), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const conceptsQuery = useMemoFirebase(() => query(collection(db, 'payout_concepts'), orderBy('name', 'asc')), [db])
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const txQuery = useMemoFirebase(() => collection(db, 'transactions'), [db])

  const { data: collaborators } = useCollection(usersQuery)
  const { data: routeSheets } = useCollection(routesQuery)
  const { data: payouts, isLoading: loadingPayouts } = useCollection(payoutsQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: concepts } = useCollection(conceptsQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: transactions } = useCollection(txQuery)

  const selectedCollab = useMemo(() => collaborators?.find(c => c.id === selectedCollabId), [collaborators, selectedCollabId])
  const selectedAccount = useMemo(() => accounts?.find(a => a.id === accountId), [accounts, accountId])

  // Obtener tipo de cambio si hay multimoneda
  useEffect(() => {
    if (activeTab === 'new') {
      fetch('https://dolarapi.com/v1/dolares/oficial')
        .then(res => res.json())
        .then(data => {
          if (data && data.venta) setExchangeRate(data.venta);
        })
        .catch(err => console.error("Error fetching rate:", err));
    }
  }, [activeTab]);

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
    let totalCloro = 0
    let totalAcido = 0
    let subtotalItemsARS = 0

    pendingDeliveries.forEach(d => {
      if (selectedItems.includes(d.id)) {
        totalCloro += d.cloro
        totalAcido += d.acido
        subtotalItemsARS += (d.cloro * (config.valorCloro || 0)) + (d.acido * (config.valorAcido || 0))
      }
    })

    const baseFijaARS = Number(config.baseFija || 0)
    
    let subtotalExtrasARS = 0
    let subtotalExtrasUSD = 0

    extras.forEach(e => {
      if (e.currency === 'USD') subtotalExtrasUSD += Number(e.amount) || 0;
      else subtotalExtrasARS += Number(e.amount) || 0;
    })

    const totalARS = subtotalItemsARS + baseFijaARS + subtotalExtrasARS;
    const totalUSD = subtotalExtrasUSD;

    return {
      cloro: totalCloro,
      acido: totalAcido,
      subtotalItemsARS,
      subtotalExtrasARS,
      subtotalExtrasUSD,
      baseFijaARS,
      totalARS,
      totalUSD
    }
  }, [selectedItems, pendingDeliveries, selectedCollab, extras])

  // Cálculo del monto real a descontar de la caja seleccionada
  const finalTotalInAccountCurrency = useMemo(() => {
    if (!selectedAccount) return 0;
    const { totalARS, totalUSD } = totals;
    
    if (selectedAccount.currency === 'ARS') {
      // Si la caja es ARS, convertimos los USD a ARS usando el tipo de cambio
      return totalARS + (totalUSD * exchangeRate);
    } else {
      // Si la caja es USD, convertimos los ARS a USD
      return totalUSD + (totalARS / exchangeRate);
    }
  }, [selectedAccount, totals, exchangeRate]);

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
      currency: concept.currency || "ARS",
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
      currency: "ARS",
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
    if (!selectedCollab || (totals.totalARS <= 0 && totals.totalUSD <= 0) || accountId === 'pending') {
      toast({ title: "Datos incompletos", description: "Selecciona un colaborador, ítems y la caja de pago.", variant: "destructive" });
      return;
    }

    const payoutId = Math.random().toString(36).substring(2, 11)
    const txId = Math.random().toString(36).substring(2, 11)
    const now = new Date().toISOString()

    // Snapshot de ítems de ruta
    const routeItemsSnapshot = selectedItems.map(id => {
      const d = pendingDeliveries.find(item => item.id === id);
      return {
        sheetDate: d?.sheetDate || "",
        clientName: d?.clientName || "",
        cloro: d?.cloro || 0,
        acido: d?.acido || 0
      };
    });

    // 1. Crear el objeto de Liquidación
    const payoutData = {
      id: payoutId,
      userId: selectedCollab.id,
      userName: selectedCollab.name,
      userRole: selectedCollab.role,
      date: now,
      totalARS: totals.totalARS,
      totalUSD: totals.totalUSD,
      exchangeRate: exchangeRate,
      currency: selectedAccount?.currency || "ARS",
      financialAccountId: accountId,
      transactionId: txId,
      itemIds: selectedItems,
      routeItemsSnapshot,
      items: [
        { type: 'items', description: `Entrega de Bidones (${totals.cloro} CL, ${totals.acido} AC)`, amount: totals.subtotalItemsARS, currency: "ARS", qty: 1, notes: "" },
        { type: 'base', description: 'Sueldo Base / Fijo', amount: totals.baseFijaARS, currency: "ARS", qty: 1, notes: "" },
        ...extras.map(e => ({ type: e.type, conceptId: e.conceptId, description: e.description, amount: e.amount, currency: e.currency, qty: e.qty, notes: e.notes }))
      ]
    }
    setDocumentNonBlocking(doc(db, 'payouts', payoutId), payoutData, { merge: true })

    // 2. Marcar ítems de ruta como liquidados
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

    // 3. Crear la Transacción financiera en la moneda de la CAJA
    const txData = {
      id: txId,
      date: now,
      type: 'Expense',
      amount: -finalTotalInAccountCurrency,
      currency: selectedAccount?.currency || 'ARS',
      description: `Liquidación de haberes: ${selectedCollab.name} (#${payoutId.toUpperCase().slice(0,6)})`,
      financialAccountId: accountId,
      recordedByUserId: userData?.id || 'system',
      accountBalanceAfter: (Number(selectedAccount?.initialBalance || 0)) - finalTotalInAccountCurrency
    }
    setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
    
    // 4. Actualizar saldo de caja
    updateDocumentNonBlocking(doc(db, 'financial_accounts', accountId), { initialBalance: increment(-finalTotalInAccountCurrency) })

    toast({ title: "Liquidación procesada", description: `Se descontaron ${selectedAccount?.currency} ${finalTotalInAccountCurrency.toLocaleString()} de caja.` })
    resetForm()
  }

  const handleDeletePayout = () => {
    if (!payoutToDelete || !isAdmin) return;
    const p = payoutToDelete;

    if (p.itemIds && p.itemIds.length > 0) {
      const fieldToRevert = p.userRole === 'Replenisher' ? 'liquidadoRepositor' : 'liquidadoComunicador';
      p.itemIds.forEach((itemId: string) => {
        const [sheetId, idxStr] = itemId.split('_');
        const idx = parseInt(idxStr);
        const sheet = routeSheets?.find(s => s.id === sheetId);
        if (sheet && sheet.items) {
          const updatedItems = [...sheet.items];
          if (updatedItems[idx]) {
            updatedItems[idx][fieldToRevert] = false;
            updateDocumentNonBlocking(doc(db, 'route_sheets', sheetId), { items: updatedItems });
          }
        }
      });
    }

    if (p.financialAccountId) {
      const tx = transactions?.find(t => t.id === p.transactionId);
      const amountToRevert = Math.abs(tx?.amount || 0);
      updateDocumentNonBlocking(doc(db, 'financial_accounts', p.financialAccountId), { initialBalance: increment(amountToRevert) });
    }

    if (p.transactionId) {
      deleteDocumentNonBlocking(doc(db, 'transactions', p.transactionId));
    }

    deleteDocumentNonBlocking(doc(db, 'payouts', p.id));
    setPayoutToDelete(null);
    toast({ title: "Liquidación revertida" });
  };

  const handleAddConcept = () => {
    if (!newConceptName.trim()) return
    const id = editingConceptId || Math.random().toString(36).substring(2, 9)
    setDocumentNonBlocking(doc(db, 'payout_concepts', id), {
      id,
      name: newConceptName,
      type: newConceptType,
      currency: newConceptCurrency,
      defaultAmount: 0
    }, { merge: true })
    setNewConceptName("")
    setEditingConceptId(null)
    toast({ title: editingConceptId ? "Concepto actualizado" : "Concepto creado" })
  }

  const handleStartEditConcept = (c: any) => {
    setEditingConceptId(c.id);
    setNewConceptName(c.name);
    setNewConceptType(c.type);
    setNewConceptCurrency(c.currency || "ARS");
  }

  const resetForm = () => {
    setSelectedCollabId("")
    setSelectedItems([])
    setExtras([])
    setAccountId("pending")
    setActiveTab("history")
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
                      <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest">2. Reposiciones Pendientes (ARS)</CardTitle>
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
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} ({c.currency || 'ARS'})</SelectItem>
                              ))}
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
                          <div className="w-full md:w-36 space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-emerald-700">Monto</Label>
                            <div className="flex gap-1">
                              <Input type="number" value={extra.amount ?? 0} onChange={(e) => updateExtra(extra.id, 'amount', Number(e.target.value))} className="h-9 text-right font-black bg-white" />
                              <Tabs value={extra.currency} onValueChange={(v: any) => updateExtra(extra.id, 'currency', v)} className="h-9">
                                <TabsList className="h-9 p-0.5 border">
                                  <TabsTrigger value="ARS" className="h-8 text-[8px] font-black px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                  <TabsTrigger value="USD" className="h-8 text-[8px] font-black px-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => setExtras(extras.filter(e => e.id !== extra.id))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Notas / Aclaraciones</Label>
                          <Input 
                            placeholder="Ej: Servicio en lo de Pérez, Pago pactado en USD..." 
                            value={extra.notes ?? ""} 
                            onChange={(e) => updateExtra(extra.id, 'notes', e.target.value)} 
                            className="h-8 bg-white text-xs italic" 
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="glass-card h-fit sticky top-8 border-t-4 border-t-primary shadow-2xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs uppercase font-black tracking-widest text-primary">Resumen de Liquidación</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Honorarios y Base (ARS):</span><span className="font-black text-blue-700">${(totals.subtotalItemsARS + totals.baseFijaARS).toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Extras en Pesos:</span><span className="font-black text-blue-700">${totals.subtotalExtrasARS.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Extras en Dólares:</span><span className="font-black text-emerald-700">u$s {totals.subtotalExtrasUSD.toLocaleString()}</span></div>
                    
                    <div className="pt-3 border-t border-dashed space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider">TOTAL ARS</p>
                        <p className="text-2xl font-black text-blue-700">${totals.totalARS.toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">TOTAL USD</p>
                        <p className="text-2xl font-black text-emerald-700">u$s {totals.totalUSD.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Caja de Pago</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger className="h-12 bg-white"><SelectValue placeholder="Elegir caja..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">--- SELECCIONAR CAJA ---</SelectItem>
                          {accounts?.map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedAccount && (
                      <div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-4">
                        {((selectedAccount.currency === 'ARS' && totals.totalUSD > 0) || (selectedAccount.currency === 'USD' && totals.totalARS > 0)) && (
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                              <ArrowRightLeft className="h-3 w-3" /> Tipo de Cambio Conversión
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">$</span>
                              <Input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="h-10 pl-8 bg-white font-black" />
                            </div>
                          </div>
                        )}
                        <div className={cn("flex justify-between items-center text-white p-3 rounded-lg shadow-lg", selectedAccount.currency === 'USD' ? 'bg-emerald-600' : 'bg-blue-600')}>
                          <span className="text-[9px] font-black uppercase tracking-widest">Descontará de Caja:</span>
                          <span className="text-xl font-black">{selectedAccount.currency === 'USD' ? 'u$s' : '$'} {finalTotalInAccountCurrency.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <Button className="w-full h-16 font-black shadow-xl text-xl uppercase tracking-tighter gap-3" disabled={!selectedCollab || (totals.totalARS <= 0 && totals.totalUSD <= 0) || accountId === 'pending'} onClick={handleProcessPayout}>
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
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setSelectedCollabId("all"); }} title="Limpiar filtros">
                <FilterX className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-md">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Conceptos</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Total Pagado</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts?.filter(p => selectedCollabId === "all" || p.userId === selectedCollabId).map(p => {
                    const acc = accounts?.find(a => a.id === p.financialAccountId);
                    const tx = transactions?.find(t => t.id === p.transactionId);
                    const symbol = p.currency === 'USD' ? 'u$s' : '$';
                    return (
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
                              <Badge key={idx} variant="outline" className={cn("text-[8px] font-bold uppercase", it.currency === 'USD' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                                {it.description}: {it.currency === 'USD' ? 'u$s' : '$'}{Number(it.amount).toLocaleString()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className={cn("font-black text-sm", p.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700')}>{symbol} {Math.abs(tx?.amount || 0).toLocaleString()}</p>
                          <p className="text-[8px] font-black text-muted-foreground uppercase">{acc?.name}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setPayoutForDetails(p)} title="Ver Detalle"><Eye className="h-4 w-4" /></Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPayoutToDelete(p)} title="Revertir Pago"><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Gestor de Conceptos */}
        <Dialog open={isConceptManagerOpen} onOpenChange={(o) => { if(!o) { setEditingConceptId(null); setNewConceptName(""); } setIsConceptManagerOpen(o); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Settings2 className="h-5 w-5" />
                <DialogTitle>Conceptos de Liquidación</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-4">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">{editingConceptId ? 'Editando Concepto' : 'Nuevo Concepto Maestro'}</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Nombre del Ítem</Label>
                    <Input value={newConceptName} onChange={(e) => setNewConceptName(e.target.value)} placeholder="Ej: Bono productividad" className="bg-white h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Tipo de Cálculo</Label>
                      <Select value={newConceptType} onValueChange={(v: any) => setNewConceptType(v)}>
                        <SelectTrigger className="bg-white h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Monto Fijo</SelectItem>
                          <SelectItem value="hourly">Horas</SelectItem>
                          <SelectItem value="km">KM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold">Moneda</Label>
                      <Tabs value={newConceptCurrency} onValueChange={(v: any) => setNewConceptCurrency(v)} className="w-full">
                        <TabsList className="grid grid-cols-2 h-9 p-0.5 border bg-muted/20">
                          <TabsTrigger value="ARS" className="text-[9px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                          <TabsTrigger value="USD" className="text-[9px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingConceptId && (
                      <Button variant="outline" onClick={() => { setEditingConceptId(null); setNewConceptName(""); }} className="flex-1">Cancelar</Button>
                    )}
                    <Button onClick={handleAddConcept} className="flex-1 h-10 font-bold">
                      {editingConceptId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {editingConceptId ? 'Guardar' : 'Crear Concepto'}
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-xl bg-slate-50/50 p-2">
                <div className="space-y-2">
                  {concepts?.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase">{c.name}</p>
                        <div className="flex gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[7px] font-bold uppercase h-4">{c.type}</Badge>
                          <Badge variant="outline" className={cn("text-[7px] font-black uppercase h-4", c.currency === 'USD' ? "border-emerald-200 text-emerald-700" : "border-blue-200 text-blue-700")}>{c.currency}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleStartEditConcept(c)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'payout_concepts', c.id))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detalle de Liquidación */}
        <Dialog open={!!payoutForDetails} onOpenChange={(o) => !o && setPayoutForDetails(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 md:p-6">
            <DialogHeader className="p-4 md:p-0">
              <div className="flex items-center gap-2 text-primary mb-1">
                <FileText className="h-6 w-6" />
                <DialogTitle>Detalle de Liquidación</DialogTitle>
              </div>
              <DialogDescription className="font-bold text-slate-800">
                Colaborador: {payoutForDetails?.userName} • Fecha: {payoutForDetails && new Date(payoutForDetails.date).toLocaleDateString('es-AR')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 px-4 md:px-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/20 rounded-xl border text-center">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Total Pagado</p>
                  <p className={cn("text-lg font-black", payoutForDetails?.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700')}>
                    {payoutForDetails?.currency === 'USD' ? 'u$s' : '$'} {Math.abs(transactions?.find(t => t.id === payoutForDetails?.transactionId)?.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border text-center">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Tipo Cambio</p>
                  <p className="text-sm font-bold">${payoutForDetails?.exchangeRate || '1'}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border text-center">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Original ARS</p>
                  <p className="text-sm font-bold text-blue-700">${payoutForDetails?.totalARS.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border text-center">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Original USD</p>
                  <p className="text-sm font-bold text-emerald-700">u$s {payoutForDetails?.totalUSD.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Entregas Liquidadas</h4>
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[9px] font-black uppercase">Fecha</TableHead><TableHead className="text-[9px] font-black uppercase">Cliente</TableHead><TableHead className="text-center text-[9px] font-black uppercase">Entrega</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payoutForDetails?.routeItemsSnapshot?.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-[10px] font-bold">{new Date(item.sheetDate + 'T12:00:00').toLocaleDateString('es-AR')}</TableCell>
                          <TableCell className="text-xs font-black">{item.clientName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] font-bold bg-blue-50 text-blue-700">{item.cloro} CL | {item.acido} AC</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Coins className="h-3.5 w-3.5" /> Desglose de Conceptos</h4>
                <div className="space-y-2">
                  {payoutForDetails?.items?.filter((it: any) => it.amount !== 0).map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800">{it.description}</p>
                        {it.notes && <p className="text-[10px] text-muted-foreground italic">"{it.notes}"</p>}
                      </div>
                      <span className={cn("font-black text-sm", it.currency === 'USD' ? "text-emerald-700" : "text-blue-700")}>
                        {it.currency === 'USD' ? 'u$s' : '$'} {it.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="p-4 border-t bg-slate-50 md:bg-transparent">
              <Button onClick={() => setPayoutForDetails(null)} className="w-full font-black h-12 uppercase tracking-widest">Cerrar Ficha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alerta de Reversión */}
        <AlertDialog open={!!payoutToDelete} onOpenChange={(o) => !o && setPayoutToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-destructive mb-2"><AlertTriangle className="h-6 w-6" /><AlertDialogTitle>¿Confirmar reversión?</AlertDialogTitle></div>
              <AlertDialogDescription className="text-xs font-bold text-slate-700">Se restaurarán los saldos de caja y las hojas de ruta volverán a quedar pendientes de pago.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePayout} className="bg-destructive font-black uppercase">REVERTIR Y BORRAR</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}
