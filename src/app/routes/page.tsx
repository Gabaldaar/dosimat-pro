
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  MapPinned,
  Printer,
  Package,
  Link as LinkIcon,
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Beaker,
  Copy,
  Coins,
  Mail
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useToast } from "../../hooks/use-toast"
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  useUser
} from "../../firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function RoutesContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData, isUserLoading, user } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const isReplenisher = userData?.role === 'Replenisher'

  const [view, setMainView] = useState<"list" | "detail">("list")
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null)
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false)
  const [sheetToDelete, setSheetToDelete] = useState<any | null>(null)

  // Estados para envío de Mail
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedCommCustomer, setSelectedCommCustomer] = useState<any>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isNewSheetOpen && !sheetToDelete && !isEmailDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isNewSheetOpen, sheetToDelete, isEmailDialogOpen]);

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const routesQuery = useMemoFirebase(() => query(collection(db, 'route_sheets'), orderBy('date', 'desc')), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])

  const { data: clients } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: rawRouteSheets, isLoading: loadingSheets } = useCollection(routesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)

  const referencePrices = useMemo(() => {
    if (!catalog) return { cloro: 0, acido: 0 }
    const cloroItem = catalog.find((i: any) => i.name === "Bidón CL (Pago Ef.)")
    const acidoItem = catalog.find((i: any) => i.name === "Bidón Ácido (Pago Ef.)")
    return {
      cloro: Number(cloroItem?.priceARS || 0),
      acido: Number(acidoItem?.priceARS || 0)
    }
  }, [catalog])

  useEffect(() => {
    const sheetId = searchParams.get('sheetId')
    if (sheetId) {
      setSelectedSheetId(sheetId)
      setMainView("detail")
    }
  }, [searchParams])

  const routeSheets = useMemo(() => {
    if (!rawRouteSheets) return []
    if (isReplenisher) {
      return rawRouteSheets.filter(s => s.status === 'active' || s.status === 'completed')
    }
    return rawRouteSheets
  }, [rawRouteSheets, isReplenisher])

  const refillClients = useMemo(() => {
    if (!clients) return []
    return [...clients]
      .filter(c => c.esClienteReposicion)
      .sort((a: any, b: any) => {
        const apellidoA = (a.apellido || "").toLowerCase();
        const apellidoB = (b.apellido || "").toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        const nombreA = (a.nombre || "").toLowerCase();
        const nombreB = (b.nombre || "").toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      })
  }, [clients])

  const selectedSheet = useMemo(() => rawRouteSheets?.find(s => s.id === selectedSheetId), [rawRouteSheets, selectedSheetId])

  const [newSheetDate, setNewSheetDate] = useState(new Date().toISOString().split('T')[0])

  const loadTotals = useMemo(() => {
    if (!selectedSheet) return { plannedChlorine: 0, plannedAcid: 0, realChlorine: 0, realAcid: 0 }
    return selectedSheet.items.reduce((acc: any, curr: any) => {
      acc.plannedChlorine += Number(curr.plannedChlorine || 0)
      acc.plannedAcid += Number(curr.plannedAcid || 0)
      acc.realChlorine += Number(curr.realChlorine || 0)
      acc.realAcid += Number(curr.realAcid || 0)
      return acc
    }, { plannedChlorine: 0, plannedAcid: 0, realChlorine: 0, realAcid: 0 })
  }, [selectedSheet])

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

  const handleConfirmDeleteSheet = () => {
    if (!sheetToDelete) return
    deleteDocumentNonBlocking(doc(db, 'route_sheets', sheetToDelete.id))
    if (selectedSheetId === sheetToDelete.id) {
      setSelectedSheetId(null)
      setMainView("list")
    }
    setSheetToDelete(null)
    toast({ title: "Hoja de ruta eliminada" })
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

    const client = clients?.find(c => c.id === clientId)
    const defaultChlorine = client?.equipoInstalado?.cantBidones || 0

    const newItem = {
      clientId,
      plannedChlorine: defaultChlorine,
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
    toast({ title: "Ruta habilitada para entrega", description: "Ahora es visible para el repositor." })
  }

  const handleResetToPlanning = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "planned" })
    toast({ title: "Ruta devuelta a Planificación", description: "El repositor ya no podrá verla hasta que vuelvas a iniciarla." })
  }

  const handleCompleteRoute = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "completed" })
    toast({ title: "Ruta finalizada" })
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
    toast({ title: "Operado" })
  }

  const loadPlannedToReal = (clientId: string) => {
    if (!selectedSheet) return
    const item = selectedSheet.items.find((i: any) => i.clientId === clientId)
    if (!item) return
    updateItemField(clientId, 'realChlorine', item.plannedChlorine)
    updateItemField(clientId, 'realAcid', item.plannedAcid)
    updateItemField(clientId, 'isDelivered', true)
  }

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Argentina`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  const formatWhatsAppNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("00")) cleaned = cleaned.substring(2);
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith("54") && cleaned.length >= 10) {
      cleaned = "54" + cleaned;
    }
    return cleaned;
  };

  const handleWhatsApp = (phone: string) => {
    const formatted = formatWhatsAppNumber(phone);
    if (!formatted) return;
    window.open(`https://wa.me/${formatted}`, '_blank');
  }

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const handleShareLink = () => {
    if (!selectedSheetId || !selectedSheet) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/routes?sheetId=${selectedSheetId}`
    const dateStr = new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR')
    const text = `*DOSIMAT PRO - HOJA DE RUTA*\nFecha: ${dateStr}\n\nPuedes ver y completar la planilla en este link:\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareOrderWhatsApp = () => {
    if (!selectedSheet) return;
    const now = new Date();
    const greeting = now.getHours() < 13 ? "Buenos días" : "Buenas tardes";
    const dateStr = new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR');
    
    let text = `${greeting}\n\n`;
    text += `*Pedido para la próxima entrega*\n`;
    text += `Fecha: ${dateStr}\n`;
    text += `Bidones de Cloro: ${loadTotals.plannedChlorine}\n`;
    text += `Bidones de Ácido: ${loadTotals.plannedAcid}\n\n`;
    text += `Muchas gracias.\n`;
    text += `Saludos, \n`;
    text += `*DOSIMAT*\n`;
    text += `www.dosimat.com.ar`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  // Lógica de Mail
  const handleOpenEmailDialog = (customer: any) => {
    if (!customer.mail) {
      toast({ title: "Sin Mail", description: "Este cliente no tiene correo registrado.", variant: "destructive" });
      return;
    }
    setSelectedCommCustomer(customer)
    setSelectedTemplateId("")
    setDynamicValues({})
    setIsEmailDialogOpen(true)
  }

  const activeTemplate = useMemo(() => {
    return emailTemplates?.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, emailTemplates]);

  const dynamicKeys = useMemo(() => {
    if (!activeTemplate) return [];
    const content = activeTemplate.body + (activeTemplate.subject || "");
    const matches = content.match(/\{\{\?([^}]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{\?|\}\}/g, ''))));
  }, [activeTemplate]);

  const replaceMarkers = (text: string, client?: any, dynamicVals?: Record<string, string>) => {
    let result = text;
    if (client) {
      result = result.replace(/\{\{Nombre\}\}/g, client.nombre || "");
      result = result.replace(/\{\{Apellido\}\}/g, client.apellido || "");
      result = result.replace(/\{\{Direccion\}\}/g, client.direccion || "");
      result = result.replace(/\{\{Localidad\}\}/g, client.localidad || "");
      result = result.replace(/\{\{Saldo_ARS\}\}/g, `$ ${Number(client.saldoActual || 0).toLocaleString('es-AR')}`);
      result = result.replace(/\{\{Saldo_USD\}\}/g, `u$s ${Number(client.saldoUSD || 0).toLocaleString('es-AR')}`);
    }
    
    if (catalog) {
      catalog.forEach(item => {
        result = result.replace(new RegExp(`\\{\\{PrecioARS_${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), `$ ${Number(item.priceARS || 0).toLocaleString('es-AR')}`);
        result = result.replace(new RegExp(`\\{\\{PrecioUSD_${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), `u$s ${Number(item.priceUSD || 0).toLocaleString('es-AR')}`);
      });
    }

    if (dynamicVals) {
      Object.entries(dynamicVals).forEach(([key, val]) => {
        result = result.replace(new RegExp(`\\{\\{\\?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), val);
      });
    }
    return result;
  };

  const handleSendEmail = () => {
    const template = emailTemplates?.find(t => t.id === selectedTemplateId);
    if (!template || !selectedCommCustomer) return;
    const body = replaceMarkers(template.body, selectedCommCustomer, dynamicValues);
    const subject = replaceMarkers(template.subject || "", selectedCommCustomer, dynamicValues);
    const mailtoUrl = `mailto:${selectedCommCustomer.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
    window.open(mailtoUrl, '_blank');
    setIsEmailDialogOpen(false);
  };

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const isEditingAllowed = selectedSheet && selectedSheet.status === 'planned' && (isAdmin || isCommunicator)
  const showProgressLayout = selectedSheet && (selectedSheet.status === 'active' || selectedSheet.status === 'completed')

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="no-print w-full flex">
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
              <div className="flex gap-2">
                {!isReplenisher && (
                  <Button type="button" variant="outline" size="icon" onClick={handleShareOrderWhatsApp} className="text-emerald-700 border-emerald-200 bg-emerald-50" title="Copiar pedido para WhatsApp">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" variant="outline" size="icon" onClick={handleShareLink} className="text-emerald-600 border-emerald-200" title="Compartir Link de acceso">
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={handlePrint} className="text-primary border-primary/20" title="Imprimir / Exportar PDF">
                  <Printer className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setSheetToDelete(selectedSheet)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                <Button variant="outline" onClick={() => setMainView("list")} className="font-bold">
                  Volver
                </Button>
              </div>
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
                    <h3 className="text-lg font-semibold">No hay hojas de ruta disponibles</h3>
                    {isReplenisher && <p className="text-sm text-muted-foreground mt-2">Aún no se han habilitado rutas para entrega hoy.</p>}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheet); }}>
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
                        <Button onClick={handleStartRoute} className="bg-amber-500 hover:bg-amber-600 font-bold w-full md:w-auto shadow-lg shadow-amber-200">
                          <Truck className="mr-2 h-4 w-4" /> INICIAR ENTREGA
                        </Button>
                      )}
                      {selectedSheet.status === 'active' && (isAdmin || isCommunicator) && (
                        <Button variant="outline" onClick={handleResetToPlanning} className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold w-full md:w-auto">
                          <RefreshCw className="mr-2 h-4 w-4" /> VOLVER A PLANIFICAR
                        </Button>
                      )}
                      {selectedSheet.status === 'active' && (isAdmin || isReplenisher) && (
                        <Button onClick={handleCompleteRoute} className="bg-emerald-600 hover:bg-emerald-700 font-bold w-full md:w-auto">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> FINALIZAR JORNADA
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" /> {showProgressLayout ? 'Resumen de Entrega (Real vs Planificado)' : 'Resumen de Carga para Camioneta'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-blue-600 border-none shadow-xl shadow-blue-200 relative overflow-hidden text-white group">
                        <Package className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform -rotate-12" />
                        <CardContent className="p-6 flex items-center gap-6">
                          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner"><Droplet className="h-8 w-8 text-white" /></div>
                          <div className="flex-1">
                            <p className="text-xs font-black uppercase text-blue-100 tracking-widest">
                              {showProgressLayout ? 'PROGRESO ENTREGA CLORO' : 'TOTAL CLORO A CARGAR'}
                            </p>
                            <div className="flex items-baseline gap-3">
                              <h3 className="text-5xl md:text-6xl font-black tabular-nums">
                                {showProgressLayout ? `${loadTotals.realChlorine}/${loadTotals.plannedChlorine}` : loadTotals.plannedChlorine}
                              </h3>
                              <p className="text-xs font-bold text-blue-200 uppercase">Bidones</p>
                            </div>
                            <p className="text-[9px] font-black text-blue-200/60 mt-1 uppercase tracking-tighter">
                              {showProgressLayout ? 'Cantidad ya entregada vs. Total cargado' : 'Carga planificada para hoy'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-rose-600 border-none shadow-xl shadow-rose-200 relative overflow-hidden text-white group">
                        <Package className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 group-hover:scale-110 transition-transform -rotate-12" />
                        <CardContent className="p-6 flex items-center gap-6">
                          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner"><Beaker className="h-8 w-8 text-white" /></div>
                          <div className="flex-1">
                            <p className="text-xs font-black uppercase text-rose-100 tracking-widest">
                              {showProgressLayout ? 'PROGRESO ENTREGA ÁCIDO' : 'TOTAL ÁCIDO A CARGAR'}
                            </p>
                            <div className="flex items-baseline gap-3">
                              <h3 className="text-5xl md:text-6xl font-black tabular-nums">
                                {showProgressLayout ? `${loadTotals.realAcid}/${loadTotals.plannedAcid}` : loadTotals.plannedAcid}
                              </h3>
                              <p className="text-xs font-bold text-rose-200 uppercase">Bidones</p>
                            </div>
                            <p className="text-[9px] font-black text-rose-200/60 mt-1 uppercase tracking-tighter">
                              {showProgressLayout ? 'Cantidad ya entregada vs. Total cargado' : 'Carga planificada para hoy'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {isEditingAllowed && (
                    <Card className="p-4 glass-card border-dashed">
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 pt-4">
                          <Label className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Agregar Cliente de Reposición</Label>
                          <Select onValueChange={addItemToSheet}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                            <SelectContent className="max-h-96">
                              {refillClients.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} ({c.direccion})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {selectedSheet.items.length === 0 ? (
                      <div className="text-center py-20 bg-muted/5 border-2 border-dashed rounded-3xl">
                        <p className="text-muted-foreground italic">Agregue clientes para comenzar.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {selectedSheet.items.map((item: any, idx: number) => {
                          const client = clients?.find(c => c.id === item.clientId)
                          if (!client) return null
                          const zone = zones?.find(z => z.id === client.zonaId);

                          const cloroSub = Number(item.realChlorine || 0) * referencePrices.cloro;
                          const acidoSub = Number(item.realAcid || 0) * referencePrices.acido;
                          const totalSugerido = cloroSub + acidoSub;

                          return (
                            <Card key={idx} className={cn(
                              "glass-card border-l-4 transition-all",
                              item.processed ? "border-l-slate-300 opacity-60" : 
                              item.isDelivered ? "border-l-emerald-500 bg-emerald-50/20" : "border-l-primary"
                            )}>
                              <CardContent className="p-4 md:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                  <div className="md:col-span-4 space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-black text-lg leading-tight truncate">{client.apellido}, {client.nombre}</h4>
                                      {zone && <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 text-primary border-primary/20">{zone.name}</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {client.direccion}, {client.localidad}</p>
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" asChild>
                                        <a href={`tel:${client.telefono}`}><Phone className="h-3 w-3 mr-1" /> LLAMAR</a>
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" 
                                        onClick={() => handleWhatsApp(client.telefono)}
                                      >
                                        <MessageCircle className="h-3 w-3 mr-1" /> WHATSAPP
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-2 text-[10px] text-primary border-primary/20" 
                                        onClick={() => handleOpenEmailDialog(client)}
                                      >
                                        <Mail className="h-3 w-3 mr-1" /> MAIL
                                      </Button>
                                      <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-7 px-2 text-[10px]" 
                                        onClick={() => handleOpenMaps(client.direccion, client.localidad)}
                                      >
                                        <MapPinned className="h-3 w-3 mr-1" /> MAPA
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="md:col-span-5">
                                    {selectedSheet.status === 'planned' ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-bold uppercase text-blue-700">Cloro (Pedido)</Label>
                                          <input 
                                            type="number" 
                                            className="flex h-10 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800"
                                            value={item.plannedChlorine} 
                                            onChange={(e) => updateItemField(item.clientId, 'plannedChlorine', Number(e.target.value))} 
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-bold uppercase text-rose-700">Ácido (Pedido)</Label>
                                          <input 
                                            type="number" 
                                            className="flex h-10 w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800"
                                            value={item.plannedAcid} 
                                            onChange={(e) => updateItemField(item.clientId, 'plannedAcid', Number(e.target.value))} 
                                          />
                                        </div>
                                      </div>
                                    ) : selectedSheet.status === 'active' ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-600 p-3 rounded-xl text-center shadow-lg shadow-blue-200">
                                          <p className="text-[9px] font-black text-blue-100 uppercase mb-1">DEBE ENTREGAR</p>
                                          <p className="text-4xl font-black text-white">{item.plannedChlorine}</p>
                                          <p className="text-[8px] font-bold text-blue-200 mt-1">BIDONES CLORO</p>
                                        </div>
                                        <div className="bg-rose-600 p-3 rounded-xl text-center shadow-lg shadow-rose-200">
                                          <p className="text-[9px] font-black text-rose-100 uppercase mb-1">DEBE ENTREGAR</p>
                                          <p className="text-4xl font-black text-white">{item.plannedAcid}</p>
                                          <p className="text-[8px] font-bold text-rose-200 mt-1">BIDONES ÁCIDO</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
                                          <p className="text-[8px] font-bold text-blue-600 uppercase">Cloro</p>
                                          <div className="flex justify-center items-baseline gap-1">
                                            <span className="text-lg font-black text-blue-800">{item.realChlorine}</span>
                                            <span className="text-[10px] text-blue-400">/ {item.plannedChlorine}</span>
                                          </div>
                                        </div>
                                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-center">
                                          <p className="text-[8px] font-bold text-rose-600 uppercase">Ácido</p>
                                          <div className="flex justify-center items-baseline gap-1">
                                            <span className="text-lg font-black text-lg text-rose-800">{item.realAcid}</span>
                                            <span className="text-[10px] text-rose-400">/ {item.plannedAcid}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="md:col-span-3 flex flex-col gap-2">
                                    {isEditingAllowed ? (
                                      <div className="space-y-2">
                                        <Input value={item.others} onChange={(e) => updateItemField(item.clientId, 'others', e.target.value)} placeholder="Notas..." className="h-8 text-xs" />
                                        <Button variant="ghost" size="sm" className="text-destructive font-bold w-full h-7" onClick={() => removeItemFromSheet(item.clientId)}>
                                          <Minus className="h-3 w-3 mr-1" /> QUITAR
                                        </Button>
                                      </div>
                                    ) : null}
                                    
                                    {selectedSheet.status === 'completed' && isAdmin ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-xs font-bold text-emerald-700">
                                          <span>Cobró:</span>
                                          <span className="text-sm">${item.cashCollected?.toLocaleString('es-AR')}</span>
                                        </div>
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
                                      </div>
                                    ) : selectedSheet.status === 'active' ? (
                                      <div className="flex flex-col gap-2 mt-4 md:mt-0">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-blue-700">Entregó Cloro</Label>
                                            <Input 
                                              type="number" 
                                              disabled={item.processed || (!isAdmin && !isReplenisher)}
                                              value={item.realChlorine} 
                                              onChange={(e) => updateItemField(item.clientId, 'realChlorine', Number(e.target.value))} 
                                              className="h-10 font-black text-center border-blue-300"
                                            />
                                            {cloroSub > 0 && <p className="text-sm font-black text-emerald-600 text-center animate-in fade-in">${cloroSub.toLocaleString()}</p>}
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-rose-700">Entregó Ácido</Label>
                                            <Input 
                                              type="number" 
                                              disabled={item.processed || (!isAdmin && !isReplenisher)}
                                              value={item.realAcid} 
                                              onChange={(e) => updateItemField(item.clientId, 'realAcid', Number(e.target.value))} 
                                              className="h-10 font-black text-center border-rose-300"
                                            />
                                            {acidoSub > 0 && <p className="text-sm font-black text-emerald-600 text-center animate-in fade-in">${acidoSub.toLocaleString()}</p>}
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 mt-1">
                                          <div className="flex items-center justify-between px-2 bg-emerald-50/50 rounded-t-lg py-1 border-x border-t border-emerald-100">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                                              <Calculator className="h-3 w-3" /> SUGERIDO
                                            </Label>
                                            <span className="text-base font-black text-emerald-700">${totalSugerido.toLocaleString('es-AR')}</span>
                                          </div>
                                          <div className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                              <Input 
                                                type="number" 
                                                disabled={item.processed || (!isAdmin && !isReplenisher)}
                                                placeholder="Cobró ($)" 
                                                value={item.cashCollected || ""} 
                                                onChange={(e) => updateItemField(item.clientId, 'cashCollected', Number(e.target.value))} 
                                                className="h-12 bg-white border-emerald-400 text-center font-black text-emerald-700 text-xl shadow-inner rounded-t-none"
                                              />
                                            </div>
                                            {!item.isDelivered && (isAdmin || isReplenisher) && (
                                              <Button className="h-12 w-12 bg-emerald-600 shrink-0 shadow-lg" onClick={() => loadPlannedToReal(item.clientId)}>
                                                <Check className="h-6 w-6" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <input 
                                          placeholder="Nota entrega..." 
                                          disabled={item.processed || (!isAdmin && !isReplenisher)}
                                          value={item.notes} 
                                          onChange={(e) => updateItemField(item.clientId, 'notes', e.target.value)} 
                                          className="h-8 text-[10px] bg-white italic border rounded px-2"
                                        />
                                      </div>
                                    ) : null}
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
                <Button onClick={handleCreateSheet}>Crear Planilla</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Enviar Email a {selectedCommCustomer?.nombre}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Card className="bg-amber-50 border-amber-100 p-4"><p className="text-xs font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Verificar Remitente (DOSIMAT)</p></Card>
                <div className="space-y-2"><Label>Plantilla</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                  <SelectContent>{emailTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select></div>
                {dynamicKeys.length > 0 && (<div className="p-4 border border-dashed rounded-xl space-y-4 bg-muted/5"><p className="text-[10px] font-black uppercase text-primary">Datos Manuales</p><div className="grid grid-cols-1 gap-4">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-xs font-bold">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-9" /></div>))}</div></div>)}
                {activeTemplate && (<div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Vista Previa</Label><ScrollArea className="h-48 border rounded-xl bg-white p-4 italic text-sm text-slate-700 shadow-inner"><p className="font-bold mb-2">Asunto: {replaceMarkers(activeTemplate.subject || "", selectedCommCustomer, dynamicValues)}</p><div className="whitespace-pre-wrap">{replaceMarkers(activeTemplate.body, selectedCommCustomer, dynamicValues)}</div></ScrollArea></div>)}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancelar</Button><Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={handleSendEmail} className="bg-primary font-bold">Abrir Mail App</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!sheetToDelete} onOpenChange={(o) => { if(!o) setSheetToDelete(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se perderán todos los datos registrados en ella. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteSheet} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </SidebarInset>
        <MobileNav />
      </div>

      {selectedSheet && (
        <div className="print-only w-full p-4 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Hoja de Ruta de Reposición</h1>
              <p className="text-sm font-bold text-slate-600">Fecha: {new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                <Package className="h-3 w-3" /> CARGA TOTAL CAMIONETA
              </h2>
              <div className="flex gap-12">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black">CLORO:</span>
                  <span className="text-3xl font-black px-4 py-1 border-2 border-slate-900 rounded-lg">{loadTotals.plannedChlorine}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black">ÁCIDO:</span>
                  <span className="text-3xl font-black px-4 py-1 border-2 border-slate-900 rounded-lg">{loadTotals.plannedAcid}</span>
                </div>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 p-1 text-left uppercase font-black">Cliente / Dirección</th>
                <th className="border border-slate-900 p-1 text-center uppercase font-black w-16">Cloro</th>
                <th className="border border-slate-900 p-1 text-center uppercase font-black w-16">Ácido</th>
                <th className="border border-slate-900 p-1 text-left uppercase font-black">Cobro / Notas Reales</th>
              </tr>
            </thead>
            <tbody>
              {selectedSheet.items.map((item: any, idx: number) => {
                const client = clients?.find(c => c.id === item.clientId)
                if (!client) return null
                const zone = zones?.find(z => z.id === client.zonaId);
                return (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="border border-slate-900 p-2">
                      <p className="font-black">{client.apellido}, {client.nombre}</p>
                      <p className="text-[10px] mt-0.5">📍 {client.direccion}, {client.localidad}</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase">{zone?.name || 'S/D'} • Tel: {client.telefono || '---'}</p>
                      {item.others && <p className="text-[8px] italic mt-1 border-t pt-1">Obs: {item.others}</p>}
                    </td>
                    <td className="border border-slate-900 p-1 text-center">
                      <p className="text-lg font-black">{item.plannedChlorine}</p>
                      <div className="mt-1 border-t border-slate-200">
                        <div className="h-6 border border-dashed border-slate-300 rounded mt-1"></div>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1 text-center">
                      <p className="text-lg font-black">{item.plannedAcid}</p>
                      <div className="mt-1 border-t border-slate-200">
                        <div className="h-6 border border-dashed border-slate-300 rounded mt-1"></div>
                      </div>
                    </td>
                    <td className="border border-slate-900 p-1">
                      <div className="grid grid-cols-2 gap-2 h-full">
                        <div className="h-10 border border-dashed border-slate-300 rounded relative">
                          <span className="absolute top-0.5 left-1 text-[6px] font-black text-slate-300 uppercase">COBRÓ</span>
                        </div>
                        <div className="h-10 border border-dashed border-slate-300 rounded relative">
                          <span className="absolute top-0.5 left-1 text-[6px] font-black text-slate-300 uppercase">NOTAS</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 mb-4">Salida</p>
              <div className="w-32 border-b border-slate-900"></div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-4">Recepción</p>
              <div className="w-32 border-b border-slate-900 ml-auto"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <RoutesContent />
    </Suspense>
  )
}
