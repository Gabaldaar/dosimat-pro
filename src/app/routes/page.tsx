
"use client"

import { useState, useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Plus, 
  Calendar as CalendarIcon, 
  User, 
  Droplet, 
  Minus, 
  CheckCircle2, 
  Trash2, 
  ChevronRight, 
  Send, 
  Clock, 
  MapPin, 
  Phone,
  Search,
  Loader2,
  Settings2,
  Check,
  ClipboardList,
  AlertTriangle,
  History,
  Save,
  ArrowRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  useUser,
  addDocumentNonBlocking
} from "@/firebase"
import { collection, doc, query, orderBy, increment } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function RoutesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { userData, isUserLoading, user } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const isReplenisher = userData?.role === 'Replenisher'

  const [view, setMainView] = useState<"list" | "detail">("list")
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null)
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Queries
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])

  const { data: clients } = useCollection(clientsQuery)
  const { data: routeSheets, isLoading: loadingSheets } = useCollection(routesQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: catalog } = useCollection(catalogQuery)

  const refillClients = useMemo(() => clients?.filter(c => c.esClienteReposicion) || [], [clients])
  const selectedSheet = useMemo(() => routeSheets?.find(s => s.id === selectedSheetId), [routeSheets, selectedSheetId])

  // New Sheet Form
  const [newSheetDate, setNewSheetDate] = useState(new Date().toISOString().split('T')[0])

  // Handlers
  const handleCreateSheet = () => {
    const id = Math.random().toString(36).substring(2, 11)
    const newSheet = {
      id,
      date: newSheetDate,
      status: "planned",
      createdBy: user?.uid,
      items: []
    }
    setDocumentNonBlocking(doc(db, 'route_sheets', id), newSheet, { merge: true })
    setIsNewSheetOpen(false)
    setSelectedSheetId(id)
    setMainView("detail")
    toast({ title: "Hoja de ruta creada" })
  }

  const handleDeleteSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("¿Eliminar esta hoja de ruta?")) {
      deleteDocumentNonBlocking(doc(db, 'route_sheets', id))
      if (selectedSheetId === id) setMainView("list")
      toast({ title: "Hoja de ruta eliminada" })
    }
  }

  const updateSheet = (updatedItems: any[]) => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { items: updatedItems })
  }

  const addItemToSheet = (clientId: string) => {
    if (!selectedSheet) return
    if (selectedSheet.items.some((i: any) => i.clientId === clientId)) {
      toast({ title: "Cliente ya agregado", variant: "destructive" })
      return
    }
    const newItem = {
      clientId,
      plannedChlorine: 0,
      realChlorine: 0,
      plannedAcid: 0,
      realAcid: 0,
      others: "",
      cashCollected: 0,
      notes: "",
      isDelivered: false,
      processed: false
    }
    updateSheet([...selectedSheet.items, newItem])
  }

  const removeItemFromSheet = (clientId: string) => {
    if (!selectedSheet) return
    updateSheet(selectedSheet.items.filter((i: any) => i.clientId !== clientId))
  }

  const updateItemField = (clientId: string, field: string, value: any) => {
    if (!selectedSheet) return
    const newItems = selectedSheet.items.map((i: any) => 
      i.clientId === clientId ? { ...i, [field]: value } : i
    )
    updateSheet(newItems)
  }

  const handleStartRoute = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "active" })
    toast({ title: "Ruta iniciada" })
  }

  const handleCompleteRoute = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "completed" })
    toast({ title: "Ruta finalizada por el repositor" })
    setMainView("list")
  }

  // Logic for Admin Processing
  const [isProcessingOpen, setIsProcessingOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState("")

  const handleProcessRoute = () => {
    if (!selectedSheet || !selectedAccountId) return
    
    // In a real scenario, we'd map these to real catalog IDs
    // For now, we'll create generic refill transactions for each client in the sheet
    selectedSheet.items.forEach((item: any) => {
      if (item.processed) return

      const client = clients?.find(c => c.id === item.clientId)
      if (!client) return

      // Logic: Calculate total ARS based on Chlorine/Acid entregado
      // We assume standard prices for simplicity or get them from catalog
      const chlorinePrice = catalog?.find(p => p.name.toLowerCase().includes("cloro"))?.priceARS || 1000
      const acidPrice = catalog?.find(p => p.name.toLowerCase().includes("ácido"))?.priceARS || 1200
      
      const totalAmount = (item.realChlorine * chlorinePrice) + (item.realAcid * acidPrice)
      const cash = Number(item.cashCollected || 0)
      
      const txId = Math.random().toString(36).substring(2, 11)
      const finalDate = new Date(selectedSheet.date + 'T12:00:00').toISOString()

      // Create Transaction
      const txData = {
        id: txId,
        date: finalDate,
        clientId: item.clientId,
        type: 'refill',
        amount: totalAmount,
        paidAmount: cash,
        currency: 'ARS',
        description: `Reposición de Ruta (${selectedSheet.date}). ${item.notes || ''}`,
        financialAccountId: cash > 0 ? selectedAccountId : null,
        items: [
          { name: "Cloro (Ruta)", qty: item.realChlorine, price: chlorinePrice, currency: "ARS", discount: 0 },
          { name: "Ácido (Ruta)", qty: item.realAcid, price: acidPrice, currency: "ARS", discount: 0 }
        ]
      }

      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })

      // Update Financial Account if cash collected
      if (cash > 0) {
        updateDocumentNonBlocking(doc(db, 'financial_accounts', selectedAccountId), {
          initialBalance: increment(cash)
        })
      }

      // Update Client Balance (Debt = total - cash)
      const debt = totalAmount - cash
      if (debt !== 0) {
        updateDocumentNonBlocking(doc(db, 'clients', item.clientId), {
          saldoActual: increment(-debt)
        })
      }
    })

    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheet.id), { status: "processed" })
    setIsProcessingOpen(false)
    toast({ title: "Ruta procesada y facturada" })
    setMainView("list")
  }

  const loadPlannedToReal = (clientId: string) => {
    if (!selectedSheet) return
    const item = selectedSheet.items.find((i: any) => i.clientId === clientId)
    if (!item) return
    updateItemField(clientId, 'realChlorine', item.plannedChlorine)
    updateItemField(clientId, 'realAcid', item.plannedAcid)
    updateItemField(clientId, 'isDelivered', true)
  }

  // Totals for Load
  const loadTotals = useMemo(() => {
    if (!selectedSheet) return { chlorine: 0, acid: 0 }
    return selectedSheet.items.reduce((acc: any, curr: any) => {
      acc.chlorine += Number(curr.plannedChlorine || 0)
      acc.acid += Number(curr.plannedAcid || 0)
      return acc
    }, { chlorine: 0, acid: 0 })
  }, [selectedSheet])

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-32 md:pb-8 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2">
              <Truck className="h-7 w-7" /> Hojas de Ruta
            </h1>
          </div>
          {view === "list" ? (
            !isReplenisher && (
              <Button onClick={() => setIsNewSheetOpen(true)} className="shadow-lg font-bold">
                <Plus className="mr-2 h-4 w-4" /> Nueva Planilla
              </Button>
            )
          ) : (
            <Button variant="outline" onClick={() => setMainView("list")} className="font-bold">
              Volver al listado
            </Button>
          )}
        </header>

        {view === "list" ? (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loadingSheets ? (
                <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : routeSheets?.length === 0 ? (
                <Card className="col-span-full p-12 text-center border-dashed bg-muted/5">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <h3 className="text-lg font-semibold">No hay hojas de ruta registradas</h3>
                  <p className="text-sm text-muted-foreground">Comienza planificando una nueva entrega.</p>
                </Card>
              ) : routeSheets?.map((sheet: any) => {
                const statusInfo = {
                  planned: { label: "Planificada", color: "bg-blue-100 text-blue-700", icon: Clock },
                  active: { label: "En Camino", color: "bg-amber-100 text-amber-700", icon: Truck },
                  completed: { label: "Finalizada", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
                  processed: { label: "Procesada", color: "bg-slate-100 text-slate-700", icon: Settings2 }
                }[sheet.status as keyof typeof statusInfo] || { label: sheet.status, color: "bg-muted", icon: Clock }
                const Icon = statusInfo.icon

                return (
                  <Card key={sheet.id} className="glass-card hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedSheetId(sheet.id); setMainView("detail"); }}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider", statusInfo.color)}>
                          <Icon className="h-3 w-3 mr-1" /> {statusInfo.label}
                        </Badge>
                        {!isReplenisher && !isCommunicator && sheet.status === 'planned' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteSheet(sheet.id, e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <CardTitle className="text-xl mt-2">{new Date(sheet.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Clientes:</span>
                        <span className="font-bold">{sheet.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entregas hechas:</span>
                        <span className="font-bold text-emerald-600">{sheet.items?.filter((i: any) => i.isDelivered).length || 0}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary">VER DETALLE <ChevronRight className="h-3 w-3 ml-1" /></Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            {selectedSheet && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800">
                      Hoja de Ruta: {new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      Estado actual: <Badge variant="secondary" className="font-bold">{selectedSheet.status.toUpperCase()}</Badge>
                    </p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {selectedSheet.status === 'planned' && (isAdmin || isCommunicator) && (
                      <Button onClick={handleStartRoute} className="bg-amber-500 hover:bg-amber-600 font-bold w-full md:w-auto">
                        <Truck className="mr-2 h-4 w-4" /> INICIAR ENTREGA
                      </Button>
                    )}
                    {selectedSheet.status === 'active' && (isAdmin || isReplenisher) && (
                      <Button onClick={handleCompleteRoute} className="bg-emerald-600 hover:bg-emerald-700 font-bold w-full md:w-auto">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> FINALIZAR JORNADA
                      </Button>
                    )}
                    {selectedSheet.status === 'completed' && isAdmin && (
                      <Button onClick={() => setIsProcessingOpen(true)} className="bg-primary font-bold w-full md:w-auto">
                        <Save className="mr-2 h-4 w-4" /> PROCESAR Y FACTURAR
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-100 shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Droplet className="h-6 w-6" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-700">Total Cloro</p>
                        <p className="text-2xl font-black">{loadTotals.chlorine} Bidones</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-rose-50 border-rose-100 shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-rose-100 rounded-full text-rose-600"><AlertTriangle className="h-6 w-6" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-rose-700">Total Ácido</p>
                        <p className="text-2xl font-black">{loadTotals.acid} Bidones</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedSheet.status === 'planned' && (isAdmin || isCommunicator) && (
                  <Card className="p-4 glass-card border-dashed">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Agregar Cliente de Reposición</Label>
                        <Select onValueChange={addItemToSheet}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                          <SelectContent>
                            {refillClients.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} ({c.direccion})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mb-2">Solo aparecen clientes marcados como "Reposición".</p>
                    </div>
                  </Card>
                )}

                <div className="space-y-4">
                  {selectedSheet.items.length === 0 ? (
                    <div className="text-center py-20 bg-muted/5 border-2 border-dashed rounded-3xl">
                      <p className="text-muted-foreground italic">Agregue clientes para comenzar la planificación.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedSheet.items.map((item: any, idx: number) => {
                        const client = clients?.find(c => c.id === item.clientId)
                        if (!client) return null

                        return (
                          <Card key={idx} className={cn(
                            "glass-card border-l-4 transition-all",
                            item.isDelivered ? "border-l-emerald-500 bg-emerald-50/20" : "border-l-primary"
                          )}>
                            <CardContent className="p-4 md:p-6">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-3 space-y-1">
                                  <h4 className="font-black text-lg leading-tight">{client.apellido}, {client.nombre}</h4>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.direccion}</p>
                                  <div className="flex gap-2 mt-2">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" asChild>
                                      <a href={`tel:${client.telefono}`}><Phone className="h-3 w-3 mr-1" /> LLAMAR</a>
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-emerald-600 border-emerald-200" asChild>
                                      <a href={`https://wa.me/${client.telefono?.replace(/\D/g, '')}`} target="_blank"><Send className="h-3 w-3 mr-1" /> WS</a>
                                    </Button>
                                  </div>
                                </div>

                                <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {/* PLANIFICACION - Editable por Comunicador/Admin si está planificada */}
                                  {selectedSheet.status === 'planned' ? (
                                    <>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Cloro (Bidones)</Label>
                                        <Input type="number" value={item.plannedChlorine} onChange={(e) => updateItemField(item.clientId, 'plannedChlorine', Number(e.target.value))} />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Ácido (Bidones)</Label>
                                        <Input type="number" value={item.plannedAcid} onChange={(e) => updateItemField(item.clientId, 'plannedAcid', Number(e.target.value))} />
                                      </div>
                                      <div className="space-y-1 col-span-2 md:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase">Otros / Notas</Label>
                                        <Input value={item.others} onChange={(e) => updateItemField(item.clientId, 'others', e.target.value)} placeholder="Ej: Revisar boya" />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {/* EJECUCION - Editable por Repositor */}
                                      <div className="bg-muted/30 p-2 rounded-lg border border-dashed text-center">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Pedido Original</p>
                                        <p className="text-xs font-bold text-slate-600">{item.plannedChlorine} Cloro / {item.plannedAcid} Ácido</p>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-emerald-700">Entregado Cloro</Label>
                                        <Input 
                                          type="number" 
                                          disabled={selectedSheet.status === 'processed' || (!isAdmin && !isReplenisher)}
                                          value={item.realChlorine} 
                                          onChange={(e) => updateItemField(item.clientId, 'realChlorine', Number(e.target.value))} 
                                          className="h-10 font-black text-emerald-700 bg-white"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-rose-700">Entregado Ácido</Label>
                                        <Input 
                                          type="number" 
                                          disabled={selectedSheet.status === 'processed' || (!isAdmin && !isReplenisher)}
                                          value={item.realAcid} 
                                          onChange={(e) => updateItemField(item.clientId, 'realAcid', Number(e.target.value))} 
                                          className="h-10 font-black text-rose-700 bg-white"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="md:col-span-3 flex flex-col gap-2">
                                  {selectedSheet.status === 'planned' ? (
                                    <Button variant="ghost" size="sm" className="text-destructive font-bold self-end" onClick={() => removeItemFromSheet(item.clientId)}>
                                      <Minus className="h-4 w-4 mr-1" /> QUITAR
                                    </Button>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[10px] font-bold uppercase">Cobrado ($)</Label>
                                          <Input 
                                            type="number" 
                                            disabled={selectedSheet.status === 'processed' || (!isAdmin && !isReplenisher)}
                                            placeholder="Efectivo..." 
                                            value={item.cashCollected} 
                                            onChange={(e) => updateItemField(item.clientId, 'cashCollected', Number(e.target.value))} 
                                            className="h-10 bg-white border-emerald-200"
                                          />
                                        </div>
                                        {!item.isDelivered && (isAdmin || isReplenisher) && (
                                          <Button className="h-10 mt-auto bg-emerald-600" onClick={() => loadPlannedToReal(item.clientId)}>
                                            <Check className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      <Input 
                                        placeholder="Comentario entrega..." 
                                        disabled={selectedSheet.status === 'processed' || (!isAdmin && !isReplenisher)}
                                        value={item.notes} 
                                        onChange={(e) => updateItemField(item.clientId, 'notes', e.target.value)} 
                                        className="h-8 text-[10px] bg-white italic"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* DIALOGS */}
        <Dialog open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Hoja de Ruta</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fecha de la Reposición</Label>
                <Input type="date" value={newSheetDate} onChange={(e) => setNewSheetDate(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Luego podrás agregar los clientes y las cantidades planificadas.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewSheetOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSheet}>Crear y Empezar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isProcessingOpen} onOpenChange={setIsProcessingOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Mesa de Entradas: Procesar Facturación</DialogTitle>
              <DialogDescription>Revisa los datos entregados por el repositor antes de generar las operaciones reales.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold">Caja para ingresos en efectivo</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar caja..." /></SelectTrigger>
                  <SelectContent>
                    {accounts?.filter(a => a.currency === 'ARS').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} (Saldo: ${a.initialBalance.toLocaleString('es-AR')})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[300px] border rounded-xl p-2 bg-muted/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Cloro</TableHead>
                      <TableHead className="text-center">Ácido</TableHead>
                      <TableHead className="text-right">Cobrado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSheet?.items.map((item: any, i: number) => {
                      const client = clients?.find(c => c.id === item.clientId)
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-xs">{client?.apellido}, {client?.nombre}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600">{item.realChlorine}</TableCell>
                          <TableCell className="text-center font-black text-rose-600">{item.realAcid}</TableCell>
                          <TableCell className="text-right font-bold">${item.cashCollected.toLocaleString('es-AR')}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
                <Info className="h-5 w-5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  Al confirmar, el sistema creará una <b>Operación de Reposición</b> para cada cliente, actualizará sus saldos y registrará los ingresos en la caja seleccionada.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProcessingOpen(false)}>Cancelar y Seguir Revisando</Button>
              <Button onClick={handleProcessRoute} disabled={!selectedAccountId} className="font-black px-8">
                CONFIRMAR Y FACTURAR TODO
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}
