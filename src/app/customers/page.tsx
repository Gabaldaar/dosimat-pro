
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent } from "@/components/ui/card"
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
  AlertTriangle
} from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"

function CustomersContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, userData } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBalance, setFilterBalance] = useState("all") 
  const [filterComodato, setFilterComodato] = useState("all")
  const [filterReposicion, setFilterReposicion] = useState("all")
  const [filterZone, setFilterZone] = useState("all")
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  
  const { data: customers, isLoading } = useCollection(clientsQuery)
  const { data: zones, isLoading: isLoadingZones } = useCollection(zonesQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false)
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false)
  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [isBulkWsOpen, setIsBulkWsOpen] = useState(false)
  
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null)
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [selectedBulkWsTemplateId, setSelectedBulkWsTemplateId] = useState("")
  const [bulkWsIndex, setBulkWsIndex] = useState(0)
  
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([])

  const [newZoneName, setNewZoneName] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<any>(null)

  useEffect(() => {
    const balanceParam = searchParams.get('filterBalance')
    if (balanceParam) {
      setFilterBalance(balanceParam)
    }
  }, [searchParams])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || isZoneManagerOpen || isBulkEmailOpen || isWsDialogOpen || !!customerToDelete || isBulkWsOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, isZoneManagerOpen, isBulkEmailOpen, isWsDialogOpen, customerToDelete, isBulkWsOpen]);

  const extractDynamicKeys = (text: string) => {
    const regex = /\{\{\?([^}]+)\}\}/g;
    const keys = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      keys.add(match[1]);
    }
    return Array.from(keys);
  };

  useEffect(() => {
    let combinedText = "";
    if (isBulkEmailOpen && selectedTemplateId) {
      const tpl = emailTemplates?.find(t => t.id === selectedTemplateId);
      if (tpl) combinedText = (tpl.subject || "") + " " + (tpl.body || "");
    } else if (isWsDialogOpen && selectedWsTemplateId) {
      const tpl = wsTemplates?.find(t => t.id === selectedWsTemplateId);
      if (tpl) combinedText = tpl.body || "";
    } else if (isBulkWsOpen && selectedBulkWsTemplateId) {
      const tpl = wsTemplates?.find(t => t.id === selectedBulkWsTemplateId);
      if (tpl) combinedText = tpl.body || "";
    }

    const keys = extractDynamicKeys(combinedText);
    setDynamicKeys(keys);
    setDynamicValues(prev => {
      const next: Record<string, string> = {};
      keys.forEach(k => {
        next[k] = prev[k] || "";
      });
      return next;
    });
  }, [selectedTemplateId, selectedWsTemplateId, selectedBulkWsTemplateId, isBulkEmailOpen, isWsDialogOpen, isBulkWsOpen, emailTemplates, wsTemplates]);

  const allDynamicFieldsFilled = useMemo(() => {
    if (dynamicKeys.length === 0) return true;
    return dynamicKeys.every(key => dynamicValues[key]?.trim() !== "");
  }, [dynamicKeys, dynamicValues]);

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
    notasGeneral: "",
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
    saldoUSD: 0,
    fechaUltimaReposicion: null
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
        const nombreA = (a.nombre || "").toLowerCase();
        const nombreB = (b.nombre || "").toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      })
  }, [customers, searchTerm, filterBalance, filterComodato, filterReposicion, filterZone])

  const filteredTotals = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => {
      acc.ars += Number(c.saldoActual || 0)
      acc.usd += Number(c.saldoUSD || 0)
      return acc
    }, { ars: 0, usd: 0 })
  }, [filteredCustomers])

  const resetFilters = () => {
    setSearchTerm("")
    setFilterBalance("all")
    setFilterComodato("all")
    setFilterReposicion("all")
    setFilterZone("all")
  }

  const handleOpenDialog = (customer?: any) => {
    if (isCommunicator) return;
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
    if (isCommunicator) return;
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
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: editingCustomer ? "Cliente actualizado" : "Cliente creado" })
  }

  const confirmDelete = () => {
    if (!customerToDelete || isCommunicator) return;
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Solo administradores pueden eliminar clientes.", variant: "destructive" })
      return
    }
    deleteDocumentNonBlocking(doc(db, 'clients', customerToDelete.id))
    setCustomerToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: "Cliente eliminado" })
  }

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Argentina`)
    window.open(`https://google.com/maps/search/?api=1&query=${query}`, '_blank')
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

  const handleCopyClipboard = (customer: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const balanceARS = Number(customer.saldoActual || 0).toLocaleString('es-AR')
    const balanceUSD = Number(customer.saldoUSD || 0).toLocaleString('es-AR')
    const fullAddress = [customer.direccion, customer.localidad, customer.provincia].filter(Boolean).join(", ")
    
    const text = `*${customer.apellido}, ${customer.nombre}*\nCelular: ${customer.telefono || 'N/A'}\nDir: ${fullAddress || 'N/A'}\nSaldo ARS: $${balanceARS}\nSaldo USD: u$s ${balanceUSD}\nemail: ${customer.mail || 'N/A'}`
    
    if (e) {
      navigator.clipboard.writeText(text)
      toast({
        title: "Copiado",
        description: "Información completa del cliente copiada."
      })
    }
    return text
  }

  const handleCopyAllFiltered = () => {
    if (filteredCustomers.length === 0) {
      toast({ title: "Sin clientes", description: "No hay clientes filtrados para copiar.", variant: "destructive" })
      return
    }

    const text = filteredCustomers.map(customer => {
      const balanceARS = Number(customer.saldoActual || 0).toLocaleString('es-AR')
      const balanceUSD = Number(customer.saldoUSD || 0).toLocaleString('es-AR')
      const fullAddress = [customer.direccion, customer.localidad, customer.provincia].filter(Boolean).join(", ")
      
      return `*${customer.apellido}, ${customer.nombre}*\nCelular: ${customer.telefono || 'N/A'}\nDir: ${fullAddress || 'N/A'}\nSaldo ARS: $${balanceARS}\nSaldo USD: u$s ${balanceUSD}\nemail: ${customer.mail || 'N/A'}`
    }).join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado Masivo",
      description: `Se han copiado los datos de ${filteredCustomers.length} clientes filtrados.`
    });
  }

  const handleAddZone = () => {
    if (!isAdmin || isCommunicator) return
    if (!newZoneName.trim()) return
    const id = Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'zones', id), { id, name: newZoneName }, { merge: true })
    setNewZoneName("")
    toast({ title: "Zona agregada" })
  }

  const handleDeleteZone = (id: string) => {
    if (!isAdmin || isCommunicator) return
    if (confirm("¿Eliminar esta zona?")) {
      deleteDocumentNonBlocking(doc(db, 'zones', id))
      toast({ title: "Zona eliminada" })
    }
  }

  const processMarkers = (text: string, customer: any) => {
    if (!text) return text;
    let result = text;
    
    const replacements: Record<string, string> = {
      "{{Apellido}}": customer.apellido || "",
      "{{Nombre}}": customer.nombre || "",
      "{{Saldo_ARS}}": `$${(customer.saldoActual || 0).toLocaleString('es-AR')}`,
      "{{Saldo_USD}}": `u$s ${(customer.saldoUSD || 0).toLocaleString('es-AR')}`,
      "{{Direccion}}": customer.direccion || "",
      "{{Localidad}}": customer.localidad || "",
      "{{Fecha}}": new Date().toLocaleDateString('es-AR')
    }

    Object.entries(replacements).forEach(([marker, val]) => {
      result = result.replaceAll(marker, val);
    });

    if (catalog) {
      const markerRegex = /{{Precio(ARS|USD)_([^}]+)}}/gi;
      result = result.replace(markerRegex, (match, currency, prodName) => {
        const product = catalog.find(p => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
        if (product) {
          const price = currency.toUpperCase() === 'USD' ? (product.priceUSD || 0) : (product.priceARS || 0);
          return `${currency.toUpperCase() === 'USD' ? 'u$s' : '$'} ${price.toLocaleString('es-AR')}`;
        }
        return match;
      });
    }

    const dynamicRegex = /\{\{\?([^}]+)\}\}/g;
    result = result.replace(dynamicRegex, (match, key) => {
      return dynamicValues[key] || match;
    });

    return result;
  };

  const handleSendWsTemplate = () => {
    if (!allDynamicFieldsFilled) {
      toast({ title: "Campos incompletos", description: "Por favor completa todos los datos dinámicos requeridos.", variant: "destructive" });
      return;
    }
    const template = wsTemplates?.find(t => t.id === selectedWsTemplateId)
    if (!template || !selectedTxForWs) return

    const message = processMarkers(template.body, selectedTxForWs)
    const phone = selectedTxForWs.telefono?.replace(/\D/g, '')
    
    if (!phone) {
      toast({ title: "Sin teléfono", description: "El cliente no tiene un número registrado.", variant: "destructive" })
      return
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    setIsWsDialogOpen(false)
  }

  const handleSendBulkEmail = () => {
    if (!allDynamicFieldsFilled) {
      toast({ title: "Campos incompletos", description: "Por favor completa todos los datos dinámicos requeridos.", variant: "destructive" });
      return;
    }
    const template = emailTemplates?.find(t => t.id === selectedTemplateId)
    if (!template) return

    const customerEmails = filteredCustomers
      .map(c => c.mail?.trim().toLowerCase())
      .filter(m => !!m && m.includes('@'))
    
    let templateBccs: string[] = []
    if (template.bcc) {
      templateBccs = template.bcc.split(';').map((e: string) => e.trim().toLowerCase()).filter((e: string) => !!e)
    }

    const uniqueEmails = [...new Set([...customerEmails, ...templateBccs])]
    const emails = uniqueEmails.join(';')

    if (!emails) {
      toast({ title: "Sin emails", description: "Ningún cliente filtrado tiene un email válido.", variant: "destructive" })
      return
    }

    const subject = processMarkers(template.subject, {});
    const body = processMarkers(template.body, {});

    const mailtoLink = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoLink
    setIsBulkEmailOpen(false)
    toast({ title: "Correo Masivo Preparado", description: `Se han incluido ${uniqueEmails.length} direcciones únicas en CCO.` })
  }

  const currentBulkCustomer = filteredCustomers[bulkWsIndex]
  const currentBulkWsTemplate = wsTemplates?.find(t => t.id === selectedBulkWsTemplateId)

  const handleStartBulkWs = () => {
    if (filteredCustomers.length === 0) {
      toast({ title: "Sin clientes", description: "No hay clientes en la lista filtrada.", variant: "destructive" })
      return
    }
    setBulkWsIndex(0)
    setSelectedBulkWsTemplateId("")
    setDynamicValues({})
    setIsBulkWsOpen(true)
  }

  const handleSendNextWs = () => {
    if (!allDynamicFieldsFilled) {
      toast({ title: "Campos incompletos", description: "Por favor completa todos los datos dinámicos antes de enviar.", variant: "destructive" });
      return;
    }
    if (!currentBulkCustomer || !currentBulkWsTemplate) return

    const message = processMarkers(currentBulkWsTemplate.body, currentBulkCustomer)
    const phone = currentBulkCustomer.telefono?.replace(/\D/g, '')
    
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    } else {
      toast({ title: "Sin teléfono", description: `${currentBulkCustomer.apellido} no tiene teléfono.`, variant: "destructive" })
    }

    if (bulkWsIndex < filteredCustomers.length - 1) {
      setBulkWsIndex(prev => prev + 1)
    } else {
      toast({ title: "Secuencia completada", description: "Has llegado al final de la lista." })
      setIsBulkWsOpen(false)
    }
  }

  const handleSkipWs = () => {
    if (bulkWsIndex < filteredCustomers.length - 1) {
      setBulkWsIndex(prev => prev + 1)
    } else {
      setIsBulkWsOpen(false)
    }
  }

  const currentTemplate = emailTemplates?.find(t => t.id === selectedTemplateId);
  const currentWsTemplate = wsTemplates?.find(t => t.id === selectedWsTemplateId);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline flex items-baseline gap-2">
                Clientes
                {!isLoading && customers && (
                  <span className="text-xs md:text-sm font-medium text-muted-foreground opacity-70">
                    ({filteredCustomers.length}/{customers.length})
                  </span>
                )}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopyAllFiltered} className="border-primary text-primary hover:bg-primary/5">
              <Copy className="mr-2 h-4 w-4" /> Copiar Todo
            </Button>
            <div className="flex gap-1 border rounded-lg p-1 bg-muted/20">
              <Button variant="ghost" size="sm" onClick={() => setIsBulkEmailOpen(true)} className="text-[10px] font-bold h-8 gap-1.5">
                <Mail className="h-3.5 w-3.5" /> MAIL MASIVO
              </Button>
              <div className="w-px h-4 bg-border self-center" />
              <Button variant="ghost" size="sm" onClick={handleStartBulkWs} className="text-[10px] font-bold h-8 gap-1.5 text-emerald-700">
                <MessageSquare className="h-3.5 w-3.5" /> WHATSAPP MASIVO
              </Button>
            </div>
            {isAdmin && !isCommunicator && (
              <Button variant="outline" onClick={() => setIsZoneManagerOpen(true)}>
                <MapPinned className="mr-2 h-4 w-4" /> Zonas
              </Button>
            )}
            {!isCommunicator && (
              <Button onClick={() => handleOpenDialog()} className="shadow-lg shadow-primary/20 font-bold">
                <Plus className="mr-2 h-5 w-5" /> Nuevo
              </Button>
            )}
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Buscar por nombre, apellido, email o CUIT/DNI..." 
                className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Saldo</Label>
                <Select value={filterBalance} onValueChange={setFilterBalance}>
                  <SelectTrigger className="h-10 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="debt" className="text-rose-600">Solo Deuda</SelectItem>
                    <SelectItem value="credit" className="text-emerald-600">Solo A Favor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Zona</Label>
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="h-10 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Zonas</SelectItem>
                    {zones?.map((z: any) => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Comodato</Label>
                <Select value={filterComodato} onValueChange={setFilterComodato}>
                  <SelectTrigger className="h-10 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="yes">Con Comodato</SelectItem>
                    <SelectItem value="no">Sin Comodato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reposición</Label>
                <Select value={filterReposicion} onValueChange={setFilterReposicion}>
                  <SelectTrigger className="h-10 bg-white/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver Todos</SelectItem>
                    <SelectItem value="yes">Solo Reposición</SelectItem>
                    <SelectItem value="no">Solo Ocasionales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="h-10 w-full font-bold" onClick={resetFilters}>
                  <FilterX className="h-4 w-4 mr-2" /> Limpiar
                </Button>
              </div>
            </div>
          </div>
        </section>

        {!isLoading && customers && customers.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card bg-primary/5 border-l-4 border-l-primary overflow-hidden relative">
              <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-primary/10 -rotate-12" />
              <CardContent className="p-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Filtrado ARS</p>
                <h3 className={cn(
                  "text-xl font-black mt-1",
                  filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                  ${filteredTotals.ars.toLocaleString('es-AR')}
                </h3>
              </CardContent>
            </Card>
            <Card className="glass-card bg-emerald-50/50 border-l-4 border-l-emerald-500 overflow-hidden relative">
              <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-emerald-500/10 -rotate-12" />
              <CardContent className="p-4">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total Filtrado USD</p>
                <h3 className={cn(
                  "text-xl font-black mt-1",
                  filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                  u$s {filteredTotals.usd.toLocaleString('es-AR')}
                </h3>
              </CardContent>
            </Card>
          </section>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Sincronizando clientes...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-muted/5">
            <User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">Sin coincidencias</h3>
            <p className="text-muted-foreground">No hay clientes que coincidan con los filtros aplicados.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredCustomers.map((customer: any) => {
              const zone = zones?.find(z => z.id === customer.zonaId);
              return (
                <Card 
                  key={customer.id} 
                  className={cn(
                    "glass-card hover:shadow-md transition-all group relative overflow-hidden",
                    !isCommunicator && "cursor-pointer"
                  )}
                  onClick={() => !isCommunicator && handleOpenDialog(customer)}
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
                            {customer.cuit_dni && (
                              <span className="text-[10px] font-normal text-muted-foreground ml-2">
                                ({customer.cuit_dni})
                              </span>
                            )}
                          </h3>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <Badge variant={customer.esClienteReposicion ? "default" : "secondary"} className="text-[9px] h-5 font-bold px-2">
                              {customer.esClienteReposicion ? 'REPO' : 'OCASIONAL'}
                            </Badge>
                            {customer.equipoInstalado?.enComodato && (
                              <Badge variant="outline" className="text-[9px] h-5 font-bold border-amber-500 text-amber-700 bg-amber-50 px-2">
                                COMODATO
                              </Badge>
                            )}
                            {zone && (
                              <Badge variant="outline" className="text-[9px] h-5 font-bold border-primary/30 text-primary bg-primary/5 px-2">
                                {zone.name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          <div className={cn(
                            "text-[11px] font-black px-3 py-1 rounded-md border flex items-center gap-2 justify-end min-w-[100px]",
                            (customer.saldoActual || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            <span className="opacity-50 text-[9px] font-bold">ARS</span>
                            <span className="font-black">${(customer.saldoActual || 0).toLocaleString('es-AR')}</span>
                          </div>
                          <div className={cn(
                            "text-[11px] font-black px-3 py-1 rounded-md border flex items-center gap-2 justify-end min-w-[100px]",
                            (customer.saldoUSD || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            <span className="opacity-50 text-[9px] font-bold">USD</span>
                            <span className="font-black">u$s {(customer.saldoUSD || 0).toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-primary/5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
                          <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                          <span className="truncate">{customer.direccion}, {customer.localidad}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCommunicator && (
                            <>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-9 gap-2 font-bold px-4"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href={`/transactions?clientId=${customer.id}&mode=new`}>
                                  <PlusCircle className="h-4 w-4" /> Operar
                                </Link>
                              </Button>

                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 text-blue-600 border-blue-200 hover:bg-blue-50"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                                title="Ver Historial"
                              >
                                <Link href={`/transactions?clientId=${customer.id}`}>
                                  <History className="h-4 w-4" />
                                </Link>
                              </Button>
                            </>
                          )}
                          
                          {customer.telefono && (
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 text-emerald-600 border-emerald-200 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTxForWs(customer); setSelectedWsTemplateId(""); setDynamicValues({}); setIsWsDialogOpen(true); }}
                                title="WhatsApp con Plantilla"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={(e) => handleWhatsApp(customer, e)}
                                title="WhatsApp Directo"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.05-.148-.471-1.138-.645-1.556-.17-.41-.344-.354-.471-.354-.121-.002-.261-.002-.401-.002-.14 0-.368.05-.56.269-.193.218-.735.718-.735 1.754 0 1.035.753 2.034.858 2.183.104.149 1.48 2.259 3.587 3.168.501.217.892.347 1.197.442.503.159.96.137 1.32.077.401-.067 1.23-.503 1.403-.989.173-.486.173-.902.122-.989-.05-.087-.185-.137-.482-.286zM12.004 20.122l-.001.001-3.112-.816a8.12 8.12 0 0 1-3.926-1.36l-.282-.167-3.71.972 1.003-3.61-.183-.291a8.13 8.13 0 0 1-1.247-4.34C3.547 6.01 7.34 2.122 12 2.122c2.258 0 4.382.88 5.978 2.477a8.41 8.41 0 0 1 2.474 5.979c-.004 4.656-3.846 8.544-8.448 8.544zm0-17.962C6.695 2.16 2.364 6.49 2.36 11.8c0 1.7.44 3.36 1.28 4.84l-1.36 4.89 5.01-1.31c1.43.78 3.04 1.2 4.7 1.2h.01c5.3 0 9.63-4.33 9.64-9.64 0-2.57-1.01-4.99-2.83-6.81-1.82-1.82-4.24-2.83-6.81-2.83z"/>
                                </svg>
                              </Button>
                            </div>
                          )}
                          
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); handleOpenMaps(customer.direccion, customer.localidad); }}
                            title="Ver en Mapa"
                          >
                            <MapPinned className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 text-slate-600 border-slate-200 hover:bg-slate-50"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                            title="Llamar"
                          >
                            <a href={`tel:${customer.telefono}`}>
                              <PhoneCall className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (customer.mail) {
                                window.location.href = `mailto:${customer.mail}`;
                              } else {
                                toast({ title: "Sin Email", description: "Este cliente no tiene correo registrado.", variant: "destructive" });
                              }
                            }}
                            title="Enviar Email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={(e) => handleCopyClipboard(customer, e)}
                            title="Copiar Datos"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {isAdmin && !isCommunicator && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-all" 
                              onClick={(e) => { e.stopPropagation(); setCustomerToDelete(customer); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="h-40" />

        {!isCommunicator && (
          <Dialog open={isDialogOpen} onOpenChange={(o) => {
            setIsDialogOpen(o);
            if(!o) setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  {editingCustomer ? 'Perfil de Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="general" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general" className="font-bold">General</TabsTrigger>
                  <TabsTrigger value="address" className="font-bold">Ubicación</TabsTrigger>
                  <TabsTrigger value="equipment" className="font-bold">Equipo</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} placeholder="Pérez" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Juan" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CUIT / DNI</Label>
                      <Input value={formData.cuit_dni} onChange={(e) => setFormData({...formData, cuit_dni: e.target.value})} placeholder="20-XXXXXXXX-X" />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} placeholder="+54 9 11 ..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})} placeholder="cliente@ejemplo.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Saldo ARS ($)</Label>
                      <Input type="number" value={formData.saldoActual} onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} className="bg-muted/10 font-bold" disabled={!isAdmin} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-emerald-600">Saldo USD (u$s)</Label>
                      <Input type="number" value={formData.saldoUSD} onChange={(e) => setFormData({...formData, saldoUSD: Number(e.target.value)})} className="bg-muted/10 font-bold" disabled={!isAdmin} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <Label className="font-bold">Cliente de Reposición</Label>
                      <Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData(prev => ({ ...prev, esClienteReposicion: v }))} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 border-amber-200">
                      <Label className="font-bold text-amber-700">Equipo en Comodato</Label>
                      <Switch 
                        checked={formData.equipoInstalado?.enComodato} 
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, equipoInstalado: { ...prev.equipoInstalado, enComodato: v } }))} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Notas Generales</Label>
                    <Textarea value={formData.notasGeneral} onChange={(e) => setFormData({...formData, notasGeneral: e.target.value})} placeholder="Notas sobre el perfil del cliente..." className="min-h-[80px]" />
                  </div>
                </TabsContent>

                <TabsContent value="address" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Dirección</Label>
                      <Input 
                        value={formData.direccion} 
                        onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                        placeholder="Calle y altura" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Zona</Label>
                      <Select value={formData.zonaId} onValueChange={(v) => setFormData({...formData, zonaId: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar zona..." /></SelectTrigger>
                        <SelectContent>
                          {zones?.map((z: any) => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Localidad</Label>
                      <Input value={formData.localidad} onChange={(e) => setFormData({...formData, localidad: e.target.value})} placeholder="Ej: Pilar" />
                    </div>
                    <div className="space-y-2">
                      <Label>Provincia</Label>
                      <Input value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} placeholder="Buenos Aires" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones de Ubicación</Label>
                    <Textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Detalles de acceso, perros, etc..." className="min-h-[100px]" />
                  </div>
                </TabsContent>

                <TabsContent value="equipment" className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modelo del Dosificador</Label>
                      <Input value={formData.equipoInstalado.modeloEquipo} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, modeloEquipo: e.target.value}}))} placeholder="Ej: Dosimat G4" />
                    </div>
                    <div className="space-y-2">
                      <Label>Volumen de Piscina (Litros)</Label>
                      <Input type="number" value={formData.equipoInstalado.volumen} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, volumen: Number(e.target.value)}}))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Medidas de la Pileta</Label>
                      <Input value={formData.equipoInstalado.medidasPileta} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, medidasPileta: e.target.value}}))} placeholder="Ej: 8x4 metros" />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosis de Cloro (L/día)</Label>
                      <Input value={formData.equipoInstalado.dosisCloro} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, dosisCloro: e.target.value}}))} placeholder="Ej: 2 Litros" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cantidad de Bidones</Label>
                      <Input type="number" value={formData.equipoInstalado.cantidadBidones} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, cantidadBidones: Number(e.target.value)}}))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Notas Técnicas / Equipo</Label>
                    <Textarea value={formData.equipoInstalado.notes} onChange={(e) => setFormData(prev => ({...prev, equipoInstalado: {...prev.equipoInstalado, notes: e.target.value}}))} placeholder="Detalles sobre la instalación, fallas técnicas, reparaciones..." className="min-h-[80px]" />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold">Cancelar</Button>
                <Button onClick={handleSave} className="px-8 font-bold shadow-lg shadow-primary/20"><CheckCircle2 className="mr-2 h-4 w-4" /> Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isZoneManagerOpen} onOpenChange={setIsZoneManagerOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Administrar Zonas Geográficas</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input placeholder="Nueva zona (Ej: Pilar, Escobar, San Isidro...)" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} />
                <Button onClick={handleAddZone}><Plus className="h-4 w-4" /></Button>
              </div>
              <ScrollArea className="h-[250px] border rounded-md p-2">
                {isLoadingZones ? (
                  <p className="text-center py-4 text-xs text-muted-foreground">Cargando...</p>
                ) : zones?.length === 0 ? (
                  <p className="text-center py-4 text-xs text-muted-foreground italic">No hay zonas creadas.</p>
                ) : (
                  <div className="space-y-1">
                    {zones?.map((z: any) => (
                      <div key={z.id} className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors border-b last:border-0">
                        <span className="text-sm font-medium">{z.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteZone(z.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsZoneManagerOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkEmailOpen} onOpenChange={setIsBulkEmailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> Envío Masivo a Filtrados
              </DialogTitle>
              <DialogDescription>
                Se enviará un mail a los clientes filtrados usando CCO (Copia Oculta).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleccionar Plantilla</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Elige un formato..." /></SelectTrigger>
                  <SelectContent>
                    {emailTemplates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dynamicKeys.length > 0 && (
                <Card className="border-primary/20 bg-primary/5 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-widest">
                    <Sparkles className="h-4 w-4" /> Datos requeridos para esta plantilla
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">{key}</Label>
                        <Input 
                          value={dynamicValues[key] || ""} 
                          onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})}
                          placeholder={`Completar ${key}...`}
                          className="h-9 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="bg-amber-50 border-amber-200 p-3">
                <div className="flex gap-2 text-amber-800">
                  <Info className="h-4 w-4 shrink-0" />
                  <p className="text-xs">
                    <b>Nota:</b> En los envíos masivos, los marcadores dinámicos (como el nombre o saldo) no se personalizarán para cada cliente. Sin embargo, los <b>precios de productos</b> y los <b>datos que ingreses arriba</b> sí se actualizarán automáticamente.
                  </p>
                </div>
              </Card>

              <Card className="bg-amber-100 border-amber-400 p-4 border-2">
                <div className="flex gap-3 text-amber-900">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase">Aviso de Remitente</p>
                    <p className="text-xs leading-relaxed">
                      Al abrir su programa de correo (Outlook, Gmail, etc.), asegúrese de que la cuenta <b>Remitente (De)</b> sea la correcta antes de enviar.
                    </p>
                  </div>
                </div>
              </Card>

              {selectedTemplateId && currentTemplate && (
                <div className="space-y-3 animate-in fade-in duration-300">
                   <div className="p-2 bg-muted/50 rounded border text-sm font-bold truncate">
                     Asunto: {processMarkers(currentTemplate.subject, {})}
                   </div>
                   {currentTemplate.bcc && (
                     <div className="p-2 bg-blue-50 rounded border text-[10px] font-bold text-blue-700 truncate">
                       CCO Fijo: {currentTemplate.bcc}
                     </div>
                   )}
                   <div className="p-3 bg-white rounded border text-xs whitespace-pre-wrap italic text-slate-600 max-h-[150px] overflow-y-auto shadow-inner">
                     {processMarkers(currentTemplate.body, {})}
                   </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkEmailOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleSendBulkEmail} 
                disabled={!selectedTemplateId || !allDynamicFieldsFilled} 
                className="bg-primary font-bold"
              >
                <Send className="mr-2 h-4 w-4" /> Preparar Envío
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" /> WhatsApp con Plantilla
              </DialogTitle>
              <DialogDescription>
                Selecciona un formato para enviar a <b>{selectedTxForWs?.apellido}, {selectedTxForWs?.nombre}</b>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleccionar Plantilla de WhatsApp</Label>
                <Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Elige un mensaje..." /></SelectTrigger>
                  <SelectContent>
                    {wsTemplates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dynamicKeys.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 tracking-widest">
                    <Sparkles className="h-4 w-4" /> Completar datos de la plantilla
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">{key}</Label>
                        <Input 
                          value={dynamicValues[key] || ""} 
                          onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})}
                          placeholder={`Completar ${key}...`}
                          className="h-9 bg-white border-emerald-100"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedWsTemplateId && currentWsTemplate && (
                <div className="space-y-3 animate-in fade-in duration-300">
                   <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-sm whitespace-pre-wrap italic text-slate-700 max-h-[200px] overflow-y-auto shadow-inner">
                     {processMarkers(currentWsTemplate.body, selectedTxForWs)}
                   </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleSendWsTemplate} 
                disabled={!selectedWsTemplateId || !allDynamicFieldsFilled} 
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                <Send className="mr-2 h-4 w-4" /> Abrir WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkWsOpen} onOpenChange={(o) => {
          setIsBulkWsOpen(o);
          if(!o) setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" /> Secuencia Masiva de WhatsApp
              </DialogTitle>
              <DialogDescription>
                Estás enviando a la lista de {filteredCustomers.length} clientes filtrados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="font-bold">1. Seleccionar Plantilla para la secuencia</Label>
                <Select value={selectedBulkWsTemplateId} onValueChange={setSelectedBulkWsTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Elige el mensaje..." /></SelectTrigger>
                  <SelectContent>
                    {wsTemplates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dynamicKeys.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 tracking-widest">
                    <Sparkles className="h-4 w-4" /> Datos para toda la secuencia
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">{key}</Label>
                        <Input 
                          value={dynamicValues[key] || ""} 
                          onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})}
                          placeholder={`Ej: Este viernes, $500, etc...`}
                          className="h-9 bg-white border-emerald-100"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedBulkWsTemplateId && currentBulkCustomer && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <span>Progreso del envío</span>
                      <span>{bulkWsIndex + 1} de {filteredCustomers.length}</span>
                    </div>
                    <Progress value={((bulkWsIndex + 1) / filteredCustomers.length) * 100} className="h-2" />
                  </div>

                  <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Destinatario Actual</p>
                          <h3 className="text-xl font-bold">{currentBulkCustomer.apellido}, {currentBulkCustomer.nombre}</h3>
                          <p className="text-xs text-muted-foreground">{currentBulkCustomer.telefono || "SIN TELÉFONO REGISTRADO"}</p>
                        </div>
                        <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
                          {bulkWsIndex + 1}/{filteredCustomers.length}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vista previa del mensaje</p>
                        <div className="p-4 bg-white rounded-xl border border-emerald-100 text-sm italic whitespace-pre-wrap leading-relaxed shadow-inner max-h-[150px] overflow-y-auto">
                          {processMarkers(currentBulkWsTemplate.body, currentBulkCustomer)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!selectedBulkWsTemplateId && (
                <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecciona una plantilla para comenzar a recorrer la lista.</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              <Button variant="ghost" onClick={() => setIsBulkWsOpen(false)} className="font-bold w-full sm:w-auto">Finalizar</Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleSkipWs} 
                  disabled={!selectedBulkWsTemplateId}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  Omitir <FastForward className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleSendNextWs} 
                  disabled={!selectedBulkWsTemplateId || !currentBulkCustomer?.telefono || !allDynamicFieldsFilled}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 shadow-lg shadow-emerald-200 gap-2 flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4" /> Enviar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!customerToDelete} onOpenChange={(o) => { if(!o) setCustomerToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar eliminación de cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borrará permanentemente a <b>{customerToDelete?.apellido}, {customerToDelete?.nombre}</b> y todos sus datos de contacto. Asegúrate de haber revisado sus cuentas antes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar permanentemente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CustomersContent />
    </Suspense>
  )
}
