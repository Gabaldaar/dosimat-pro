
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  MapPin, 
  PhoneCall, 
  User, 
  Trash2, 
  FilterX,
  TrendingUp,
  RefreshCw,
  Calculator,
  Mail,
  PlusCircle,
  Copy,
  MapPinned,
  MessageSquare,
  History,
  Receipt,
  Users,
  Send,
  Loader2,
  Printer,
  Edit,
  Phone,
  AlertTriangle,
  Info,
  Plus,
  CheckCircle2
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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

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
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  
  const { data: customers, isLoading } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: transactions } = useCollection(txQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBalance, setFilterBalance] = useState("all") 
  const [filterComodato, setFilterComodato] = useState("all")
  const [filterReposicion, setFilterReposicion] = useState("all")
  const [filterZone, setFilterZone] = useState("all")
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<any | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)

  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false)
  const [isBulkWsOpen, setIsBulkWsOpen] = useState(false)
  const [isSingleCommOpen, setIsSingleEmailOpen] = useState(false)
  const [isSingleWsOpen, setIsSingleWsOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedCommCustomer, setSelectedCommCustomer] = useState<any>(null)
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [bulkStep, setBulkStep] = useState(0)

  const defaultFormData = {
    apellido: "",
    nombre: "",
    telefono: "",
    direccion: "",
    localidad: "",
    provincia: "Buenos Aires",
    pais: "Argentina",
    mail: "",
    cuit_dni: "",
    observaciones: "", 
    observacionesUbicacion: "",
    equipoInstalado: {
      medidasPileta: "",
      volumen: 0,
      modeloEquipo: "",
      enComodato: false,
      notas: ""
    },
    esClienteReposicion: true,
    saldoActual: 0,
    saldoUSD: 0,
    zonaId: ""
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
    if (customer) {
      setEditingCustomer(customer)
      setFormData({ 
        ...defaultFormData, 
        ...customer, 
        equipoInstalado: { ...defaultFormData.equipoInstalado, ...(customer.equipoInstalado || {}) } 
      })
    } else {
      setEditingCustomer(null)
      setFormData(defaultFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.nombre || !formData.apellido) {
      toast({ title: "Error", description: "Nombre y Apellido son obligatorios", variant: "destructive" })
      return
    }
    const id = editingCustomer?.id || Math.random().toString(36).substr(2, 9)
    const now = new Date().toISOString()
    const finalData = { ...formData, id, creadoPor: editingCustomer ? (editingCustomer.creadoPor || user?.uid) : user?.uid, fechaCreacion: editingCustomer ? (editingCustomer.fechaCreacion || now) : now, ultimaModificacionPor: user?.uid, fechaUltimaModificacion: now }
    setDocumentNonBlocking(doc(db, 'clients', id), finalData, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingCustomer ? "Cliente actualizado" : "Cliente creado" })
  }

  const confirmDelete = () => {
    if (!customerToDelete) return
    deleteDocumentNonBlocking(doc(db, 'clients', customerToDelete.id))
    setCustomerToDelete(null)
    toast({ title: "Cliente eliminado" })
  }

  const getClientDataText = (c: any) => {
    return `*${c.apellido}, ${c.nombre}*\nCelular: ${c.telefono || '---'}\nDir: ${c.direccion || ''}${c.localidad ? ' - ' + c.localidad : ''}${c.provincia ? ', ' + c.provincia : ''}\nSaldo ARS: $${Number(c.saldoActual || 0).toLocaleString('es-AR')}\nSaldo USD: u$s ${Number(c.saldoUSD || 0).toLocaleString('es-AR')}\nemail: ${c.mail || '---'}`;
  }

  const handleCopyClientData = (c: any) => {
    navigator.clipboard.writeText(getClientDataText(c));
    toast({ title: "Copiado", description: "Ficha del cliente lista para enviar." });
  }

  const handleCopyAll = () => {
    const text = `LISTADO DE CLIENTES - DOSIMAT PRO\n\n` + 
      filteredCustomers.map(c => getClientDataText(c)).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Listado copiado" });
  }

  const handleCopyStatement = () => {
    if (!selectedCustomerForStatement || pendingOperations.length === 0) return;
    const now = new Date().toLocaleDateString('es-AR');
    let text = `*RESUMEN DE CUENTA - DOSIMAT PRO*\nCliente: ${selectedCustomerForStatement.apellido}, ${selectedCustomerForStatement.nombre}\nFecha: ${now}\n\n*DETALLE DE DEUDA:*\n`;
    pendingOperations.forEach(op => {
      const info = txTypeMap[op.type] || { label: op.type };
      const symbol = op.currency === 'USD' ? 'u$s' : '$';
      text += `- ${formatLocalDate(op.date)} | ${info.label}: *${symbol} ${Math.abs(op.pendingAmount).toLocaleString('es-AR')}*\n`;
    });
    text += `\n*TOTAL ADEUDADO:*`;
    if (Math.abs(selectedCustomerForStatement.saldoActual) > 0) text += `\nARS: *$${Math.abs(selectedCustomerForStatement.saldoActual).toLocaleString('es-AR')}*`;
    if (Math.abs(selectedCustomerForStatement.saldoUSD) > 0) text += `\nUSD: *u$s ${Math.abs(selectedCustomerForStatement.saldoUSD).toLocaleString('es-AR')}*`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Resumen de deuda listo para pegar." });
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

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
        const escapedName = escapeRegExp(item.name);
        const regexARS = new RegExp(`\\{\\{PrecioARS_${escapedName}\\}\\}`, 'g');
        const regexUSD = new RegExp(`\\{\\{PrecioUSD_${escapedName}\\}\\}`, 'g');
        result = result.replace(regexARS, `$ ${Number(item.priceARS || 0).toLocaleString('es-AR')}`);
        result = result.replace(regexUSD, `u$s ${Number(item.priceUSD || 0).toLocaleString('es-AR')}`);
      });
    }

    if (dynamicVals) {
      Object.entries(dynamicVals).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{\\?${escapeRegExp(key)}\\}\\}`, 'g');
        result = result.replace(regex, val);
      });
    }
    return result;
  };

  const getDynamicKeys = (body: string) => {
    const matches = body.match(/\{\{\?([^}]+)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{\?|\}\}/g, ''))));
  };

  const handleSendSingleEmail = () => {
    const template = emailTemplates?.find(t => t.id === selectedTemplateId);
    if (!template || !selectedCommCustomer) return;
    const body = replaceMarkers(template.body, selectedCommCustomer, dynamicValues);
    const subject = replaceMarkers(template.subject, selectedCommCustomer, dynamicValues);
    const mailtoUrl = `mailto:${selectedCommCustomer.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
    window.open(mailtoUrl, '_blank');
    setIsSingleEmailOpen(false);
  };

  const handleSendSingleWs = () => {
    const template = wsTemplates?.find(t => t.id === selectedTemplateId);
    if (!template || !selectedCommCustomer) return;
    const message = replaceMarkers(template.body, selectedCommCustomer, dynamicValues);
    const phone = selectedCommCustomer.telefono?.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setIsSingleWsOpen(false);
  };

  const handleSendBulkWsNext = () => {
    if (bulkStep === 0) {
      setBulkStep(1);
      const client = filteredCustomers[0];
      const template = wsTemplates?.find(t => t.id === selectedTemplateId);
      if (template && client) {
        const message = replaceMarkers(template.body, client, dynamicValues);
        const phone = client.telefono?.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }
      return;
    }

    if (bulkStep >= filteredCustomers.length) {
      setIsBulkWsOpen(false);
      setBulkStep(0);
      return;
    }

    const client = filteredCustomers[bulkStep];
    const template = wsTemplates?.find(t => t.id === selectedTemplateId);
    if (template && client) {
      const message = replaceMarkers(template.body, client, dynamicValues);
      const phone = client.telefono?.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
    setBulkStep(prev => prev + 1);
  };

  const handleSendBulkEmail = () => {
    const template = emailTemplates?.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const allEmails = new Set<string>();
    filteredCustomers.forEach(c => {
      if (!c.mail) return;
      // Descomponer listas de correos separadas por punto y coma, coma o espacio
      const parts = c.mail.split(/[;, ]+/);
      parts.forEach(p => {
        const cleaned = p.trim().toLowerCase();
        if (cleaned && cleaned.includes('@') && cleaned.includes('.')) {
          allEmails.add(cleaned);
        }
      });
    });

    const uniqueEmails = Array.from(allEmails);
    if (uniqueEmails.length === 0) {
      toast({ title: "Sin destinatarios", description: "No hay emails válidos en la lista filtrada.", variant: "destructive" });
      return;
    }

    const bcc = uniqueEmails.join(';');
    const body = replaceMarkers(template.body, null, dynamicValues);
    const subject = replaceMarkers(template.subject, null, dynamicValues);
    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
    window.open(mailtoUrl, '_blank');
    setIsBulkEmailOpen(false);
  };

  const activeTemplate = useMemo(() => {
    const all = [...(emailTemplates || []), ...(wsTemplates || [])];
    return all.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, emailTemplates, wsTemplates]);

  const dynamicKeys = useMemo(() => {
    return activeTemplate ? getDynamicKeys(activeTemplate.body + (activeTemplate.subject || "")) : [];
  }, [activeTemplate]);

  return (
    <div className="flex min-h-screen bg-background w-full">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 overflow-x-hidden">
          <header className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="flex" />
                <h1 className="text-xl md:text-3xl font-bold text-primary font-headline flex items-center gap-3">
                  Clientes <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredCustomers.length}/{customers?.length || 0}</span>
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyAll} className="h-9 gap-2 font-bold"><Copy className="h-4 w-4" /> Copiar Todo</Button>
                <Button variant="outline" size="sm" onClick={() => { setBulkStep(0); setDynamicValues({}); setSelectedTemplateId(""); setIsBulkEmailOpen(true); }} className="h-9 gap-2 font-bold"><Mail className="h-4 w-4" /> Mail Masivo</Button>
                <Button variant="outline" size="sm" onClick={() => { setBulkStep(0); setDynamicValues({}); setSelectedTemplateId(""); setIsBulkWsOpen(true); }} className="h-9 gap-2 font-bold border-emerald-200 text-emerald-700 bg-emerald-50"><MessageSquare className="h-4 w-4" /> WhatsApp Masivo</Button>
                {!isUserLoading && isAdmin && (
                  <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold bg-primary h-9">
                    <Plus className="mr-2 h-5 w-5" /> Nuevo Cliente
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-l-4 border-l-primary">
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Total Filtrado ARS</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>${filteredTotals.ars.toLocaleString('es-AR')}</h3></div>
                  <Calculator className="h-8 w-8 text-primary/20" />
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-l-4 border-l-emerald-500">
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-widest">Total Filtrado USD</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600")}>u$s {filteredTotals.usd.toLocaleString('es-AR')}</h3></div>
                  <TrendingUp className="h-8 w-8 text-emerald-500/20" />
                </CardContent>
              </Card>
            </div>
          </header>

          <section className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input placeholder="Buscar por nombre, apellido o CUIT/DNI..." className="w-full pl-10 h-11 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/20 rounded-xl border border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Saldo</Label>
                  <Select value={filterBalance} onValueChange={setFilterBalance}>
                    <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      <SelectItem value="debt" className="text-rose-600 text-xs font-bold">Sólo deuda</SelectItem>
                      <SelectItem value="credit" className="text-emerald-600 text-xs font-bold">Sólo a favor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Comodato</Label>
                  <Select value={filterComodato} onValueChange={setFilterComodato}>
                    <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      <SelectItem value="yes" className="text-xs">Sí</SelectItem>
                      <SelectItem value="no" className="text-xs">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Reposición</Label>
                  <Select value={filterReposicion} onValueChange={setFilterReposicion}>
                    <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      <SelectItem value="yes" className="text-xs">Sí</SelectItem>
                      <SelectItem value="no" className="text-xs">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Zona</Label>
                  <Select value={filterZone} onValueChange={setFilterZone}>
                    <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas</SelectItem>
                      {zones?.map((z: any) => (<SelectItem key={z.id} value={z.id} className="text-xs">{z.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setSearchTerm(""); setFilterBalance("all"); setFilterComodato("all"); setFilterReposicion("all"); setFilterZone("all"); }}><FilterX className="h-4 w-4" /></Button>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Cargando...</p></div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 bg-muted/5"><User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-lg font-semibold">Sin coincidencias</h3></Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredCustomers.map((customer: any) => {
                const zone = zones?.find(z => z.id === customer.zonaId);
                const hasDebt = (customer.saldoActual || 0) < 0 || (customer.saldoUSD || 0) < 0;
                return (
                  <Card key={customer.id} className="glass-card group relative overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-1.5 h-full", customer.equipoInstalado?.enComodato ? "bg-amber-500" : "bg-primary")} />
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold truncate leading-tight">{customer.apellido}, {customer.nombre}</h3>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <Badge variant={customer.esClienteReposicion ? "default" : "secondary"} className="text-[9px] h-5 font-bold">{customer.esClienteReposicion ? 'REPO' : 'OCASIONAL'}</Badge>
                            {customer.equipoInstalado?.enComodato && <Badge variant="outline" className="text-[9px] h-5 font-bold border-amber-500 text-amber-700 bg-amber-50">COMODATO</Badge>}
                            {zone && <Badge variant="outline" className="text-[9px] h-5 font-bold border-primary/30 text-primary bg-primary/5">{zone.name}</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <div className={cn("text-[11px] font-black px-2 py-0.5 rounded border text-right", (customer.saldoActual || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>ARS ${(customer.saldoActual || 0).toLocaleString('es-AR')}</div>
                          <div className={cn("text-[11px] font-black px-2 py-0.5 rounded border text-right", (customer.saldoUSD || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>USD u$s {(customer.saldoUSD || 0).toLocaleString('es-AR')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 border-b pb-2">
                        <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="truncate">{customer.direccion}, {customer.localidad}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="default" size="sm" className="h-8 gap-1.5 font-bold px-4" asChild><Link href={`/transactions?clientId=${customer.id}&mode=new`}><PlusCircle className="h-3.5 w-3.5" /> OPERAR</Link></Button>
                        {hasDebt && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100" onClick={() => { setSelectedCustomerForStatement(customer); setIsStatementOpen(true); }} title="Estado de Cuenta"><Receipt className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.open(`https://google.com/maps/search/?api=1&query=${encodeURIComponent(customer.direccion + ", " + customer.localidad)}`, '_blank')} title="Ver Mapa"><MapPinned className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-700 border-emerald-200 bg-emerald-50" onClick={() => window.open(`https://wa.me/${customer.telefono?.replace(/\D/g, '')}`, '_blank')} title="WhatsApp Directo"><PhoneCall className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-700 border-blue-200 bg-blue-50" asChild title="Ver Historial"><Link href={`/transactions?clientId=${customer.id}`}><History className="h-3.5 w-3.5" /></Link></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(customer)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if(customer.mail) { setSelectedCommCustomer(customer); setDynamicValues({}); setSelectedTemplateId(""); setIsSingleEmailOpen(true); } else { toast({title:"Sin Mail", variant:"destructive"}); } }} title="Enviar Mail (Plantilla)"><Mail className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => { setSelectedCommCustomer(customer); setDynamicValues({}); setSelectedTemplateId(""); setIsSingleWsOpen(true); }} title="WhatsApp (Plantilla)"><MessageSquare className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopyClientData(customer)} title="Copiar Datos"><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" asChild title="Llamar"><a href={`tel:${customer.telefono}`}><Phone className="h-3.5 w-3.5" /></a></Button>
                        {isAdmin && (
                          <Button variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setCustomerToDelete(customer)} title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
              <Tabs defaultValue="general" className="py-4">
                <TabsList className="grid grid-cols-3 w-full mb-6">
                  <TabsTrigger value="general" className="font-bold">General</TabsTrigger>
                  <TabsTrigger value="location" className="font-bold">Ubicación</TabsTrigger>
                  <TabsTrigger value="equipment" className="font-bold">Equipo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Apellido</Label><Input value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Nombre</Label><Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} /></div>
                    <div className="space-y-2"><Label>CUIT / DNI</Label><Input value={formData.cuit_dni} onChange={(e) => setFormData({...formData, cuit_dni: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Teléfono</Label><Input value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} /></div>
                    <div className="col-span-2 space-y-2"><Label>Email</Label><Input value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})} /></div>
                    
                    <div className="p-4 bg-muted/10 rounded-xl border border-dashed grid grid-cols-2 gap-4 col-span-2">
                      <div className="space-y-2">
                        <Label className="text-blue-700 font-bold">Saldo ARS ($)</Label>
                        <Input type="number" value={formData.saldoActual} onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} className="border-blue-200 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-emerald-700 font-bold">Saldo USD (u$s)</Label>
                        <Input type="number" value={formData.saldoUSD} onChange={(e) => setFormData({...formData, saldoUSD: Number(e.target.value)})} className="border-emerald-200 font-bold" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-2 col-span-2">
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-white shadow-sm">
                        <Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} />
                        <Label className="font-bold">Cliente de Reposición</Label>
                      </div>
                      <div className={cn("flex items-center gap-3 p-3 border rounded-lg transition-colors", formData.equipoInstalado?.enComodato ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white")}>
                        <Switch checked={formData.equipoInstalado?.enComodato} onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} />
                        <Label className={cn("font-bold", formData.equipoInstalado?.enComodato && "text-amber-800")}>Equipo en Comodato</Label>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-2 pt-2">
                      <Label className="font-bold">Notas Generales</Label>
                      <Textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} className="min-h-[100px]" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Localidad</Label><Input value={formData.localidad} onChange={(e) => setFormData({...formData, localidad: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Zona</Label><Select value={formData.zonaId} onValueChange={(v) => setFormData({...formData, zonaId: v})}><SelectTrigger><SelectValue placeholder="Zona..." /></SelectTrigger><SelectContent>{zones?.map((z: any) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Provincia</Label><Input value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} /></div>
                    <div className="col-span-2 space-y-2 pt-4">
                      <Label className="font-bold">Observaciones de Ubicación</Label>
                      <Textarea value={formData.observacionesUbicacion} onChange={(e) => setFormData({...formData, observacionesUbicacion: e.target.value})} placeholder="Ej: Portón verde, calle de tierra..." />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="equipment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Medidas Pileta</Label><Input value={formData.equipoInstalado.medidasPileta} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, medidasPileta: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Volumen (Lts)</Label><Input type="number" value={formData.equipoInstalado.volumen} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, volumen: Number(e.target.value)}})} /></div>
                    <div className="space-y-2"><Label>Modelo Equipo</Label><Input value={formData.equipoInstalado.modeloEquipo} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, modeloEquipo: e.target.value}})} /></div>
                    <div className="col-span-2 space-y-2"><Label>Notas de Equipo</Label><Textarea value={formData.equipoInstalado.notas} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, notas: e.target.value}})} /></div>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="px-8 font-bold">Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkEmailOpen || isSingleCommOpen} onOpenChange={(o) => { if(!o) { setIsBulkEmailOpen(false); setIsSingleEmailOpen(false); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isBulkEmailOpen ? 'Email Masivo' : `Enviar Email a ${selectedCommCustomer?.nombre}`}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Card className="bg-blue-50 border-blue-100 p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-800 flex items-center gap-2"><Info className="h-4 w-4" /> Nota del sistema</p>
                  <p className="text-[11px] leading-relaxed text-blue-700">
                    {isBulkEmailOpen 
                      ? "En los envíos masivos, los marcadores dinámicos (como el nombre o saldo) no se personalizarán para cada cliente. Sin embargo, los precios de productos y los datos que ingreses arriba sí se actualizarán automáticamente. Mails duplicados o inválidos serán ignorados."
                      : "Los marcadores dinámicos se completarán automáticamente con los datos del cliente."}
                  </p>
                </Card>
                
                <Card className="bg-amber-50 border-amber-100 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Verificar Remitente</p>
                  <p className="text-[11px] leading-relaxed text-amber-700">Al abrir tu aplicación de correo, asegurate de seleccionar la cuenta Remitente (De:) correspondiente a DOSIMAT antes de enviar este mensaje.</p>
                </Card>

                <div className="space-y-2 pt-2">
                  <Label>Seleccionar Plantilla</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>{emailTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {dynamicKeys.length > 0 && (
                  <div className="p-4 border border-dashed rounded-xl space-y-4 bg-muted/5">
                    <p className="text-[10px] font-black uppercase text-primary">Datos Manuales Requeridos</p>
                    <div className="grid grid-cols-1 gap-4">
                      {dynamicKeys.map(key => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs font-bold">{key}</Label>
                          <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-9" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTemplate && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Vista Previa del Mensaje</Label>
                    <ScrollArea className="h-48 border rounded-xl bg-white p-4 italic text-sm text-slate-700 shadow-inner">
                      <p className="font-bold mb-2">Asunto: {replaceMarkers(activeTemplate.subject || "", selectedCommCustomer, dynamicValues)}</p>
                      <div className="whitespace-pre-wrap">{replaceMarkers(activeTemplate.body, selectedCommCustomer, dynamicValues)}</div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsBulkEmailOpen(false); setIsSingleEmailOpen(false); }}>Cancelar</Button>
                <Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={isBulkEmailOpen ? handleSendBulkEmail : handleSendSingleEmail} className="bg-primary font-bold">Abrir Mail App</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkWsOpen || isSingleWsOpen} onOpenChange={(o) => { if(!o) { setIsBulkWsOpen(false); setIsSingleWsOpen(false); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isBulkWsOpen ? 'WhatsApp Masivo' : 'WhatsApp Individual'}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                {bulkStep === 0 || isSingleWsOpen ? (
                  <>
                    {isBulkWsOpen && (
                      <div className="p-4 bg-blue-50 border-blue-100 rounded-xl">
                        <p className="text-[11px] leading-relaxed text-blue-700">Este proceso abrirá una ventana de WhatsApp para cada cliente filtrado uno por uno. Podrás revisar el mensaje antes de enviar en cada paso.</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Seleccionar Plantilla</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                        <SelectContent>{wsTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {dynamicKeys.length > 0 && (
                      <div className="p-4 border border-dashed rounded-xl space-y-4 bg-muted/5">
                        <p className="text-[10px] font-black uppercase text-primary">Datos Manuales Requeridos</p>
                        <div className="grid grid-cols-1 gap-4">
                          {dynamicKeys.map(key => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs font-bold">{key}</Label>
                              <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-9" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeTemplate && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Vista Previa</Label>
                        <div className="p-4 border rounded-xl bg-white italic text-sm text-slate-700 shadow-inner whitespace-pre-wrap">
                          {replaceMarkers(activeTemplate.body, selectedCommCustomer || filteredCustomers[0], dynamicValues)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6 text-center py-6">
                    <Progress value={(bulkStep / filteredCustomers.length) * 100} className="h-2" />
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black">Paso {bulkStep} de {filteredCustomers.length}</h3>
                      <p className="text-muted-foreground">Enviando a: <b>{filteredCustomers[bulkStep-1]?.apellido}, {filteredCustomers[bulkStep-1]?.nombre}</b></p>
                    </div>
                    <div className="p-4 bg-muted/20 rounded-xl text-left italic text-sm shadow-inner whitespace-pre-wrap">
                      "{replaceMarkers(wsTemplates?.find(t => t.id === selectedTemplateId)?.body || "", filteredCustomers[bulkStep-1], dynamicValues)}"
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {isSingleWsOpen ? (
                  <Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={handleSendSingleWs} className="w-full bg-emerald-600 font-bold">Abrir WhatsApp</Button>
                ) : bulkStep === 0 ? (
                  <Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={handleSendBulkWsNext} className="w-full bg-emerald-600 font-bold">Comenzar Secuencia</Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button variant="outline" onClick={() => setIsBulkWsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSendBulkWsNext} className="bg-emerald-600 font-bold">
                      {bulkStep < filteredCustomers.length ? "Siguiente WhatsApp" : "Finalizar"}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <div className="space-y-1"><DialogTitle>Estado de Cuenta</DialogTitle><DialogDescription className="font-bold text-slate-800">{selectedCustomerForStatement?.apellido}, {selectedCustomerForStatement?.nombre}</DialogDescription></div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyStatement} className="h-8 gap-1.5 font-bold"><Copy className="h-3.5 w-3.5" /> COPIAR</Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 gap-1.5 font-bold"><Printer className="h-3.5 w-3.5" /> PDF</Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center"><p className="text-[10px] font-black uppercase text-rose-700">Deuda ARS</p><p className="text-2xl font-black text-rose-800">${Math.abs(selectedCustomerForStatement?.saldoActual || 0).toLocaleString('es-AR')}</p></div>
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center"><p className="text-[10px] font-black uppercase text-rose-700">Deuda USD</p><p className="text-2xl font-black text-rose-800">u$s {Math.abs(selectedCustomerForStatement?.saldoUSD || 0).toLocaleString('es-AR')}</p></div>
                </div>
                <ScrollArea className="max-h-[40vh] border rounded-xl bg-white overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead className="text-[10px] font-bold uppercase">Fecha</TableHead><TableHead className="text-[10px] font-bold uppercase">Tipo</TableHead><TableHead className="text-right text-[10px] font-bold uppercase">Original</TableHead><TableHead className="text-right text-[10px] font-bold uppercase">Pendiente</TableHead></TableRow></TableHeader>
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
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente a <b>{customerToDelete?.apellido}, {customerToDelete?.nombre}</b>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </SidebarInset>
      </div>

      {/* PRINT VIEW */}
      {selectedCustomerForStatement && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div><h1 className="text-2xl font-black uppercase">Estado de Cuenta</h1><p className="text-sm font-bold">Cliente: {selectedCustomerForStatement.apellido}, {selectedCustomerForStatement.nombre}</p></div>
            <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p><p className="text-xs font-bold">{new Date().toLocaleDateString('es-AR')}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50"><h2 className="text-[10px] font-black uppercase mb-1">TOTAL ADEUDADO (ARS)</h2><p className="text-3xl font-black text-rose-700">${Math.abs(selectedCustomerForStatement.saldoActual || 0).toLocaleString('es-AR')}</p></div>
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50"><h2 className="text-[10px] font-black uppercase mb-1">TOTAL ADEUDADO (USD)</h2><p className="text-3xl font-black text-rose-700">u$s {Math.abs(selectedCustomerForStatement.saldoUSD || 0).toLocaleString('es-AR')}</p></div>
          </div>
          <Table className="border-2 border-slate-900">
            <TableHeader className="bg-slate-900"><TableRow><TableHead className="text-white font-black uppercase">Fecha</TableHead><TableHead className="text-white font-black uppercase">Operación</TableHead><TableHead className="text-white font-black uppercase text-right">Monto Original</TableHead><TableHead className="text-white font-black uppercase text-right">Saldo Pendiente</TableHead></TableRow></TableHeader>
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><CustomersContent /></Suspense>
  )
}
