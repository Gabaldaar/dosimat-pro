
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Plus, 
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
  Loader2,
  Check,
  ClipboardList,
  AlertTriangle,
  Save,
  ArrowRight,
  Calculator,
  Info,
  Calendar as CalendarIcon,
  MapPinned
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
  useUser
} from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function RoutesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading, user } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const isReplenisher = userData?.role === 'Replenisher'

  const [view, setMainView] = useState<"list" | "detail">("list")
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null)
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false)

  // Queries
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])

  const { data: clients } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: routeSheets, isLoading: loadingSheets } = useCollection(routesQuery)

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
    if (confirm("¿Estás seguro de que deseas eliminar esta hoja de ruta? Se perderán todos los datos registrados en ella.")) {
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

  const handleGenerateTransaction = (item: any) => {
    const queryParams = new URLSearchParams({
      mode: 'new',
      clientId: item.clientId,
      type: 'refill',
      cloro: item.realChlorine.toString(),
      acido: item.realAcid.toString(),
      cash: item.cashCollected.toString(),
      notes: item.notes || '',
      routeId: selectedSheetId!,
      fromRoute: 'true'
    }).toString()
    
    router.push(`/transactions?${queryParams}`)
  }

  const markAsProcessed = (clientId: string) => {
    if (!selectedSheet) return
    const newItems = selectedSheet.items.map((i: any) => 
      i.clientId === clientId ? { ...i, processed: true } : i
    )
    updateSheet(newItems)
    toast({ title: "Cliente marcado como operado" })
  }

  const loadPlannedToReal = (clientId: string) => {
    if (!selectedSheet) return
    const item = selectedSheet.items.find((i: any) => i.clientId === clientId)
    if (!item) return
    updateItemField(clientId, 'realChlorine', item.plannedChlorine)
    updateItemField(clientId, 'realAcid', item.plannedAcid)
    updateItemField(clientId, 'isDelivered', true)
  }

  const loadTotals = useMemo(() => {
    if (!selectedSheet) return { chlorine: 0, acid: 0 }
    return selectedSheet.items.reduce((acc: any, curr: any) => {
      acc.chlorine += Number(curr.plannedChlorine || 0)
      acc.acid += Number(curr.plannedAcid || 0)
      return acc
    }, { chlorine: 0, acid: 0 })
  }, [selectedSheet])

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Argentina`)
    window.open(`https://google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

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
                  completed: { label: "Finalizada", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 }
                }[sheet.status as keyof typeof statusInfo] || { label: sheet.status, color: "bg-muted", icon: Clock }
                const Icon = statusInfo.icon

                return (
                  <Card key={sheet.id} className="glass-card hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedSheetId(sheet.id); setMainView("detail"); }}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider", statusInfo.color)}>
                          <Icon className="h-3 w-3 mr-1" /> {statusInfo.label}
                        </Badge>
                        {(isAdmin || (isCommunicator && sheet.status === 'planned')) && (
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
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      Estado: <Badge variant="secondary" className="font-bold uppercase">{selectedSheet.status}</Badge>
                    </div>
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-100 shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Calculator className="h-6 w-6" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-700">Total Cloro</p>
                        <p className="text-2xl font-black">{loadTotals.chlorine} Bidones</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-rose-50 border-rose-100 shadow-none">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-rose-100 rounded-full text-rose-600"><Calculator className="h-6 w-6" /></div>
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
                    </div>
                  </Card>
                )}

                {selectedSheet.status === 'completed' && isAdmin && (
                  <Card className="bg-amber-50 border-amber-200 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900">Mesa de Entradas: Ruta Finalizada</h4>
                        <p className="text-xs text-amber-800">
                          Revisa los datos del repositor. Toca el botón <b>"Operar"</b> para generar la factura de cada cliente manualmente con los datos pre-cargados.
                        </p>
                      </div>
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
                        const zone = zones?.find(z => z.id === client.zonaId);

                        return (
                          <Card key={idx} className={cn(
                            "glass-card border-l-4 transition-all",
                            item.processed ? "border-l-slate-300 opacity-60" : 
                            item.isDelivered ? "border-l-emerald-500 bg-emerald-50/20" : "border-l-primary"
                          )}>
                            <CardContent className="p-4 md:p-6">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div className="md:col-span-3 space-y-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-lg leading-tight truncate">{client.apellido}, {client.nombre}</h4>
                                    {zone && <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 text-primary border-primary/20">{zone.name}</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {client.direccion}, {client.localidad}</p>
                                  <div className="flex gap-2 mt-2">
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" asChild>
                                      <a href={`tel:${client.telefono}`}><Phone className="h-3 w-3 mr-1" /> LLAMAR</a>
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-7 px-2 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                                      onClick={() => handleOpenMaps(client.direccion, client.localidad)}
                                    >
                                      <MapPinned className="h-3 w-3 mr-1" /> MAPA
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-emerald-600 border-emerald-200" asChild>
                                      <a href={`https://wa.me/${client.telefono?.replace(/\D/g, '')}`} target="_blank"><Send className="h-3 w-3 mr-1" /> WS</a>
                                    </Button>
                                  </div>
                                </div>

                                <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {selectedSheet.status === 'planned' ? (
                                    <>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Cloro (Pedido)</Label>
                                        <Input type="number" value={item.plannedChlorine} onChange={(e) => updateItemField(item.clientId, 'plannedChlorine', Number(e.target.value))} />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Ácido (Pedido)</Label>
                                        <Input type="number" value={item.plannedAcid} onChange={(e) => updateItemField(item.clientId, 'plannedAcid', Number(e.target.value))} />
                                      </div>
                                      <div className="space-y-1 col-span-2 md:col-span-1">
                                        <Label className="text-[10px] font-bold uppercase">Otros / Notas</Label>
                                        <Input value={item.others} onChange={(e) => updateItemField(item.clientId, 'others', e.target.value)} placeholder="..." />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="bg-muted/30 p-2 rounded-lg border border-dashed text-center">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Pedido Ref.</p>
                                        <p className="text-xs font-bold text-slate-600">{item.plannedChlorine} Cl / {item.plannedAcid} Ác</p>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-emerald-700">Entregado Cloro</Label>
                                        <Input 
                                          type="number" 
                                          disabled={item.processed || (!isAdmin && !isReplenisher)}
                                          value={item.realChlorine} 
                                          onChange={(e) => updateItemField(item.clientId, 'realChlorine', Number(e.target.value))} 
                                          className="h-10 font-black text-emerald-700 bg-white"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-rose-700">Entregado Ácido</Label>
                                        <Input 
                                          type="number" 
                                          disabled={item.processed || (!isAdmin && !isReplenisher)}
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
                                  ) : selectedSheet.status === 'completed' && isAdmin ? (
                                    <div className="flex gap-2">
                                      <Button 
                                        className="flex-1 bg-primary font-black text-[10px]"
                                        disabled={item.processed}
                                        onClick={() => handleGenerateTransaction(item)}
                                      >
                                        {item.processed ? 'OPERADO' : 'OPERAR'}
                                      </Button>
                                      {!item.processed && (
                                        <Button variant="outline" size="icon" onClick={() => markAsProcessed(item.clientId)}>
                                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                          <Label className="text-[10px] font-bold uppercase">Cobrado ($)</Label>
                                          <Input 
                                            type="number" 
                                            disabled={item.processed || (!isAdmin && !isReplenisher)}
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
                                        disabled={item.processed || (!isAdmin && !isReplenisher)}
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

        <Dialog open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Hoja de Ruta</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fecha de la Reposición</Label>
                <Input type="date" value={newSheetDate} onChange={(e) => setNewSheetDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewSheetOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSheet}>Crear y Empezar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}
