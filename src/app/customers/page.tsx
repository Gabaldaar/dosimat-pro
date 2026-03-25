
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  MapPin, 
  ChevronRight, 
  PhoneCall, 
  User, 
  Trash2, 
  Map, 
  FilterX,
  TrendingUp,
  Banknote,
  RefreshCw,
  Calculator,
  CheckCircle2,
  Mail,
  PlusCircle,
  Copy,
  ArrowLeftRight,
  Settings2,
  MapPinned,
  Send,
  Info,
  Droplets,
  Loader2,
  MessageSquare,
  History,
  ChevronLeft,
  FastForward,
  Sparkles,
  AlertTriangle,
  FileText,
  Printer,
  Receipt,
  ArrowRight,
  MoreVertical
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc, query, orderBy, where } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const txTypeMap: Record<string, { label: string, color: string }> = {
  sale: { label: "Venta", color: "text-blue-600 bg-blue-50" },
  refill: { label: "Reposición", color: "text-cyan-600 bg-cyan-50" },
  service: { label: "Técnico", color: "text-indigo-600 bg-indigo-50" },
  adjustment: { label: "Ajuste", color: "text-slate-600 bg-slate-50" },
}

function formatLocalDate(dateString: string) {
  if (!dateString) return "---";
  const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-AR');
}

function CustomersContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { user, userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const isReplenisher = userData?.role === 'Replenisher'
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      }
    }
  }, [userData, isUserLoading, router])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBalance, setFilterBalance] = useState("all") 
  const [filterComodato, setFilterComodato] = useState("all")
  const [filterReposicion, setFilterReposicion] = useState("all")
  const [filterZone, setFilterZone] = useState("all")
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  
  const { data: customers, isLoading } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: transactions } = useCollection(txQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false)
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<any | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null)
  const [newZoneName, setNewZoneName] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [isPrintingStatement, setIsPrintingStatement] = useState(false)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isDialogOpen && !isZoneManagerOpen && !isStatementOpen && !customerToDelete) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, isZoneManagerOpen, isStatementOpen, customerToDelete]);

  useEffect(() => {
    const balanceParam = searchParams.get('filterBalance')
    if (balanceParam) {
      setFilterBalance(balanceParam)
    }
  }, [searchParams])

  const defaultFormData = {
    apellido: "",
    nombre: "",
    telefono: "",
    direccion: "",
    localidad: "",
    provincia: "",
    pais: "Argentina",
    mail: "",
    cuit_dni: "",
    observaciones: "", 
    equipoInstalado: {
      medidasPileta: "",
      volumen: 0,
      dosisCloro: "",
      cantidadBidones: 0,
      modeloEquipo: "",
      enComodato: false,
      notas: ""
    },
    esClienteReposicion: true,
    saldoActual: 0,
    saldoUSD: 0
  }

  const [formData, setFormData] = useState(defaultFormData)

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    return customers
      .filter((c: any) => {
        const fullName = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase();
        const searchMatch = fullName.includes(searchTerm.toLowerCase()) ||
                            (c.cuit_dni && c.cuit_dni.includes(searchTerm)) ||
                            (c.mail && c.mail.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!searchMatch) return false
        
        const saldoARS = Number(c.saldoActual || 0)
        const saldoUSD = Number(c.saldoUSD || 0)
        if (filterBalance === 'debt' && (saldoARS >= 0 && saldoUSD >= 0)) return false
        if (filterBalance === 'credit' && (saldoARS <= 0 && saldoUSD <= 0)) return false

        const isComodato = c.equipoInstalado?.enComodato === true
        if (filterComodato === 'yes' && !isComodato) return false
        if (filterComodato === 'no' && isComodato) return false

        const isRepo = c.esClienteReposicion === true
        if (filterReposicion === 'yes' && !isRepo) return false
        if (filterReposicion === 'no' && isRepo) return false

        if (filterZone !== 'all' && c.zonaId !== filterZone) return false

        return true
      })
      .sort((a: any, b: any) => {
        const apellidoA = (a.apellido || "").toLowerCase();
        const apellidoB = (b.apellido || "").toLowerCase();
        if (apellidoA < apellidoB) return -1;
        if (apellidoA > apellidoB) return 1;
        return (a.nombre || "").localeCompare(b.nombre || "");
      })
  }, [customers, searchTerm, filterBalance, filterComodato, filterReposicion, filterZone])

  const filteredTotals = useMemo(() => {
    return filteredCustomers.reduce((acc, curr) => {
      acc.ars += Number(curr.saldoActual || 0)
      acc.usd += Number(curr.saldoUSD || 0)
      return acc
    }, { ars: 0, usd: 0 })
  }, [filteredCustomers])

  const pendingOperations = useMemo(() => {
    if (!selectedCustomerForStatement || !transactions) return [];
    return transactions.filter(tx => 
      tx.clientId === selectedCustomerForStatement.id && 
      (tx.pendingAmount !== undefined && tx.pendingAmount !== null && Math.abs(tx.pendingAmount) > 0.01) &&
      ['sale', 'refill', 'service', 'adjustment'].includes(tx.type)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedCustomerForStatement, transactions]);

  const handleOpenDialog = (customer?: any) => {
    if (isCommunicator || isReplenisher) return;
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        ...defaultFormData,
        ...customer,
        equipoInstalado: {
          ...defaultFormData.equipoInstalado,
          ...(customer.equipoInstalado || {})
        }
      })
    } else {
      setEditingCustomer(null)
      setFormData(defaultFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (isCommunicator || isReplenisher) return;
    if (!formData.nombre || !formData.apellido) {
      toast({ title: "Error", description: "Nombre y Apellido son obligatorios", variant: "destructive" })
      return
    }

    const id = editingCustomer?.id || Math.random().toString(36).substr(2, 9)
    const now = new Date().toISOString()
    
    const finalData = {
      ...formData,
      id,
      creadoPor: editingCustomer ? (editingCustomer.creadoPor || user?.uid) : user?.uid,
      fechaCreacion: editingCustomer ? (editingCustomer.fechaCreacion || now) : now,
      ultimaModificacionPor: user?.uid,
      fechaUltimaModificacion: now
    }

    setDocumentNonBlocking(doc(db, 'clients', id), finalData, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingCustomer ? "Cliente actualizado" : "Cliente creado" })
  }

  const confirmDelete = () => {
    if (!customerToDelete) return
    deleteDocumentNonBlocking(doc(db, 'clients', customerToDelete.id))
    setCustomerToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: "Cliente eliminado" })
  }

  const handleCopyStatement = () => {
    if (!selectedCustomerForStatement || pendingOperations.length === 0) return;
    
    const now = new Date().toLocaleDateString('es-AR');
    let text = `*RESUMEN DE CUENTA - DOSIMAT PRO*\n`;
    text += `Cliente: ${selectedCustomerForStatement.apellido}, ${selectedCustomerForStatement.nombre}\n`;
    text += `Fecha: ${now}\n\n`;
    text += `*DETALLE DE DEUDA:*\n`;
    
    pendingOperations.forEach(op => {
      const info = txTypeMap[op.type] || { label: op.type };
      const symbol = op.currency === 'USD' ? 'u$s' : '$';
      text += `- ${formatLocalDate(op.date)} | ${info.label}: *${symbol} ${Math.abs(op.pendingAmount).toLocaleString('es-AR')}*\n`;
    });

    text += `\n*TOTAL ADEUDADO:*`;
    if (Math.abs(selectedCustomerForStatement.saldoActual) > 0) {
      text += `\nARS: *$${Math.abs(selectedCustomerForStatement.saldoActual).toLocaleString('es-AR')}*`;
    }
    if (Math.abs(selectedCustomerForStatement.saldoUSD) > 0) {
      text += `\nUSD: *u$s ${Math.abs(selectedCustomerForStatement.saldoUSD).toLocaleString('es-AR')}*`;
    }

    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Resumen de deuda listo para pegar." });
  }

  const handleWhatsApp = (customer: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!customer.telefono) {
      toast({ title: "Sin Teléfono", description: "Este cliente no tiene un número registrado.", variant: "destructive" })
      return
    }
    const phone = customer.telefono.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Argentina`)
    window.open(`https://google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="flex" />
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Clientes</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdmin && !isCommunicator && (
                <Button variant="outline" onClick={() => setIsZoneManagerOpen(true)}>
                  <MapPinned className="mr-2 h-4 w-4" /> Zonas
                </Button>
              )}
              {!isCommunicator && !isReplenisher && (
                <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold">
                  <Plus className="mr-2 h-5 w-5" /> Nuevo
                </Button>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-primary/5 border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Saldo Total Filtrado ARS</p>
                  <h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>
                    ${filteredTotals.ars.toLocaleString('es-AR')}
                  </h3>
                </div>
                <Calculator className="h-8 w-8 text-primary/20" />
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-widest">Saldo Total Filtrado USD</p>
                  <h3 className={cn("text-2xl font-black mt-1", filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600")}>
                    u$s {filteredTotals.usd.toLocaleString('es-AR')}
                  </h3>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500/20" />
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input 
                  placeholder="Buscar por nombre, apellido o CUIT/DNI..." 
                  className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filtro Saldo</Label>
                  <Select value={filterBalance} onValueChange={setFilterBalance}>
                    <SelectTrigger className="w-[140px] bg-white/50 h-10"><SelectValue placeholder="Saldo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TODOS LOS SALDOS</SelectItem>
                      <SelectItem value="debt" className="text-rose-600 font-bold">SÓLO DEUDA</SelectItem>
                      <SelectItem value="credit" className="text-emerald-600 font-bold">SÓLO A FAVOR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Comodato</Label>
                  <Select value={filterComodato} onValueChange={setFilterComodato}>
                    <SelectTrigger className="w-[140px] bg-white/50 h-10"><SelectValue placeholder="Comodato" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TODOS LOS EQUIPOS</SelectItem>
                      <SelectItem value="yes">EN COMODATO</SelectItem>
                      <SelectItem value="no">SIN COMODATO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tipo Cliente</Label>
                  <Select value={filterReposicion} onValueChange={setFilterReposicion}>
                    <SelectTrigger className="w-[140px] bg-white/50 h-10"><SelectValue placeholder="Tipo Cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TODOS LOS TIPOS</SelectItem>
                      <SelectItem value="yes">REPOSICIÓN</SelectItem>
                      <SelectItem value="no">OCASIONAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Zona</Label>
                  <Select value={filterZone} onValueChange={setFilterZone}>
                    <SelectTrigger className="w-[140px] bg-white/50 h-10"><SelectValue placeholder="Zona" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TODAS LAS ZONAS</SelectItem>
                      {zones?.map((z: any) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setSearchTerm(""); setFilterBalance("all"); setFilterComodato("all"); setFilterReposicion("all"); setFilterZone("all"); }}><FilterX className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Cargando...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 bg-muted/5">
              <User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold">Sin coincidencias</h3>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredCustomers.map((customer: any) => {
                const zone = zones?.find(z => z.id === customer.zonaId);
                const hasDebt = (customer.saldoActual || 0) < 0 || (customer.saldoUSD || 0) < 0;
                return (
                  <Card 
                    key={customer.id} 
                    className={cn(
                      "glass-card hover:shadow-md transition-all group relative overflow-hidden",
                      (!isCommunicator && !isReplenisher) && "cursor-pointer"
                    )}
                    onClick={() => (!isCommunicator && !isReplenisher) && handleOpenDialog(customer)}
                  >
                    <div className={cn(
                      "absolute top-0 left-0 w-1.5 h-full",
                      customer.equipoInstalado?.enComodato ? "bg-amber-500" : "bg-primary"
                    )} />
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold truncate leading-tight">
                              {customer.apellido}, {customer.nombre}
                            </h3>
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              <Badge variant={customer.esClienteReposicion ? "default" : "secondary"} className="text-[9px] h-5 font-bold px-2">
                                {customer.esClienteReposicion ? 'REPO' : 'OCASIONAL'}
                              </Badge>
                              {customer.equipoInstalado?.enComodato && (
                                <Badge variant="outline" className="text-[9px] h-5 font-bold border-amber-500 text-amber-700 bg-amber-50 px-2">COMODATO</Badge>
                              )}
                              {zone && <Badge variant="outline" className="text-[9px] h-5 font-bold border-primary/30 text-primary bg-primary/5 px-2">{zone.name}</Badge>}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0">
                            <div className={cn(
                              "text-[11px] font-black px-3 py-1 rounded-md border flex items-center gap-2 justify-end",
                              (customer.saldoActual || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              <span className="opacity-50 text-[9px]">ARS</span>
                              <span className="font-black">${(customer.saldoActual || 0).toLocaleString('es-AR')}</span>
                            </div>
                            <div className={cn(
                              "text-[11px] font-black px-3 py-1 rounded-md border flex items-center gap-2 justify-end",
                              (customer.saldoUSD || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}>
                              <span className="opacity-50 text-[9px]">USD</span>
                              <span className="font-black">u$s {(customer.saldoUSD || 0).toLocaleString('es-AR')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-primary/5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                            <span className="truncate">{customer.direccion}, {customer.localidad}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasDebt && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 gap-2 font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedCustomerForStatement(customer); setIsStatementOpen(true); }}
                              >
                                <Receipt className="h-4 w-4" /> Resumen
                              </Button>
                            )}
                            
                            {!isCommunicator && !isReplenisher && (
                              <Button variant="default" size="sm" className="h-9 gap-2 font-bold px-4" asChild onClick={(e) => e.stopPropagation()}>
                                <Link href={`/transactions?clientId=${customer.id}&mode=new`}><PlusCircle className="h-4 w-4" /> Operar</Link>
                              </Button>
                            )}

                            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-bold text-slate-600" onClick={(e) => { e.stopPropagation(); handleOpenMaps(customer.direccion, customer.localidad); }}>
                              <MapPinned className="h-4 w-4" /> <span className="hidden sm:inline">Mapa</span>
                            </Button>

                            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-bold text-emerald-600 border-emerald-200" onClick={(e) => handleWhatsApp(customer, e)}>
                              <PhoneCall className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
                            </Button>

                            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-bold text-blue-600 border-blue-200" asChild onClick={(e) => e.stopPropagation()}>
                              <Link href={`/transactions?clientId=${customer.id}`}><History className="h-4 w-4" /> <span className="hidden sm:inline">Historial</span></Link>
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-60"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* handleWsPlantilla(customer) */ }}>
                                  <MessageSquare className="mr-2 h-4 w-4" /> Notificar por WS
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* handleEmail(customer) */ }}>
                                  <Mail className="mr-2 h-4 w-4" /> Enviar Mail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${customer.apellido}, ${customer.nombre}\nTel: ${customer.telefono}\nDir: ${customer.direccion}`); toast({ title: "Copiado" }); }}>
                                  <Copy className="mr-2 h-4 w-4" /> Copiar Datos
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem className="text-destructive font-bold" onClick={(e) => { e.stopPropagation(); setCustomerToDelete(customer); }}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Diálogos */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Apellido</Label><Input value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} /></div>
                <div className="space-y-2"><Label>Nombre</Label><Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} /></div>
                <div className="space-y-2"><Label>CUIT / DNI</Label><Input value={formData.cuit_dni} onChange={(e) => setFormData({...formData, cuit_dni: e.target.value})} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Email</Label><Input value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} /></div>
                <div className="space-y-2">
                  <Label>Zona</Label>
                  <Select value={formData.zonaId} onValueChange={(v) => setFormData({...formData, zonaId: v})}>
                    <SelectTrigger><SelectValue placeholder="Zona..." /></SelectTrigger>
                    <SelectContent>{zones?.map((z: any) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Localidad</Label><Input value={formData.localidad} onChange={(e) => setFormData({...formData, localidad: e.target.value})} /></div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} />
                  <Label>Cliente de Reposición</Label>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={formData.equipoInstalado.enComodato} onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} />
                  <Label>Equipo en Comodato</Label>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <div className="space-y-1">
                    <DialogTitle>Estado de Cuenta</DialogTitle>
                    <DialogDescription className="font-bold text-slate-800">{selectedCustomerForStatement?.apellido}, {selectedCustomerForStatement?.nombre}</DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyStatement} className="h-8 gap-1.5 font-bold"><Copy className="h-3.5 w-3.5" /> COPIAR</Button>
                    <Button variant="outline" size="sm" onClick={() => { setIsPrintingStatement(true); setTimeout(() => { window.print(); setIsPrintingStatement(false); }, 300); }} className="h-8 gap-1.5 font-bold"><Printer className="h-3.5 w-3.5" /> PDF</Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase text-rose-700">Deuda ARS</p>
                    <p className="text-2xl font-black text-rose-800">${Math.abs(selectedCustomerForStatement?.saldoActual || 0).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase text-rose-700">Deuda USD</p>
                    <p className="text-2xl font-black text-rose-800">u$s {Math.abs(selectedCustomerForStatement?.saldoUSD || 0).toLocaleString('es-AR')}</p>
                  </div>
                </div>
                <ScrollArea className="max-h-[40vh] border rounded-xl bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase">Fecha</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase">Tipo</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase">Original</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase">Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOperations.map(op => {
                        const info = txTypeMap[op.type] || { label: op.type, color: "text-slate-600" };
                        const symbol = op.currency === 'USD' ? 'u$s' : '$';
                        return (
                          <TableRow key={op.id}>
                            <TableCell className="text-xs">{formatLocalDate(op.date)}</TableCell>
                            <TableCell><Badge variant="outline" className={cn("text-[9px] uppercase", info.color)}>{info.label}</Badge></TableCell>
                            <TableCell className="text-right text-xs">{symbol} {Math.abs(op.amount).toLocaleString('es-AR')}</TableCell>
                            <TableCell className="text-right text-xs font-black text-rose-600">{symbol} {Math.abs(op.pendingAmount).toLocaleString('es-AR')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!customerToDelete} onOpenChange={(o) => !o && setCustomerToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente a <b>{customerToDelete?.apellido}, {customerToDelete?.nombre}</b>.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </SidebarInset>
      </div>

      {/* VISTA DE IMPRESIÓN */}
      {selectedCustomerForStatement && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase">Estado de Cuenta</h1>
              <p className="text-sm font-bold">Cliente: {selectedCustomerForStatement.apellido}, {selectedCustomerForStatement.nombre}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
              <p className="text-xs font-bold">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-1">TOTAL ADEUDADO (ARS)</h2>
              <p className="text-3xl font-black text-rose-700">${Math.abs(selectedCustomerForStatement.saldoActual || 0).toLocaleString('es-AR')}</p>
            </div>
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-1">TOTAL ADEUDADO (USD)</h2>
              <p className="text-3xl font-black text-rose-700">u$s {Math.abs(selectedCustomerForStatement.saldoUSD || 0).toLocaleString('es-AR')}</p>
            </div>
          </div>
          <Table className="border-2 border-slate-900">
            <TableHeader className="bg-slate-900">
              <TableRow>
                <TableHead className="text-white font-black uppercase">Fecha</TableHead>
                <TableHead className="text-white font-black uppercase">Operación</TableHead>
                <TableHead className="text-white font-black uppercase text-right">Monto Original</TableHead>
                <TableHead className="text-white font-black uppercase text-right">Saldo Pendiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOperations.map((op, idx) => {
                const info = txTypeMap[op.type] || { label: op.type };
                const symbol = op.currency === 'USD' ? 'u$s' : '$';
                return (
                  <TableRow key={idx} className="border-b border-slate-300">
                    <td className="p-2 border border-slate-900">{formatLocalDate(op.date)}</td>
                    <td className="p-2 border border-slate-900 uppercase font-bold">{info.label}</td>
                    <td className="p-2 border border-slate-900 text-right">{symbol} {Math.abs(op.amount).toLocaleString('es-AR')}</td>
                    <td className="p-2 border border-slate-900 text-right font-black text-rose-700">{symbol} {Math.abs(op.pendingAmount).toLocaleString('es-AR')}</td>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MobileNav />
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CustomersContent />
    </Suspense>
  )
}
