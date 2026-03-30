
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Badge as BadgeUI } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  MapPin, 
  Phone, 
  User, 
  Trash2, 
  FilterX,
  TrendingUp,
  RefreshCw,
  Calculator,
  Mail,
  PlusCircle,
  MapPinned,
  MessageSquare,
  MessageCircle,
  History,
  Receipt,
  Send,
  Loader2,
  Edit,
  AlertTriangle,
  Info,
  Plus,
  CheckCircle2,
  Droplets,
  Copy,
  Printer
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

function formatLocalDate(dateString: string) {
  if (!dateString) return "---";
  const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-AR');
}

const txTypeMap: Record<string, { label: string, color: string }> = {
  sale: { label: "Venta", color: "text-blue-600 bg-blue-50" },
  refill: { label: "Reposición", color: "text-cyan-600 bg-cyan-50" },
  service: { label: "Técnico", color: "text-indigo-600 bg-indigo-50" },
  adjustment: { label: "Ajuste", color: "text-slate-600 bg-slate-50" },
  Reposición: { label: "Reposición", color: "text-cyan-600 bg-cyan-50" },
}

function CustomersContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const searchParams = useSearchParams()
  const { user, userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const zonesQuery = useMemoFirebase(() => collection(db, 'zones'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  
  const { data: customers, isLoading: loadingCustomers } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: transactions } = useCollection(txQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBalance, setFilterBalance] = useState("all") 
  const [filterComodato, setFilterComodato] = useState("all")
  const [filterReposicion, setFilterReposicion] = useState("yes") 
  const [filterZone, setFilterZone] = useState("all")

  useEffect(() => {
    const balance = searchParams.get('filterBalance')
    if (balance) setFilterBalance(balance)
    
    const repo = searchParams.get('filterReposicion')
    if (repo) setFilterReposicion(repo)
    
    const zone = searchParams.get('filterZone')
    if (zone) setFilterZone(zone)
  }, [searchParams])
  
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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || isStatementOpen || !!customerToDelete || isBulkEmailOpen || isBulkWsOpen || isSingleCommOpen || isSingleWsOpen;
        if (!anyOpen) document.body.style.pointerEvents = 'auto';
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, isStatementOpen, customerToDelete, isBulkEmailOpen, isBulkWsOpen, isSingleCommOpen, isSingleWsOpen]);

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
        if (filterBalance === 'debt' && (saldoARS >= -0.01 && saldoUSD >= -0.01)) return false
        if (filterBalance === 'credit' && (saldoARS <= 0.01 && saldoUSD <= 0.01)) return false

        const isComodato = c.equipoInstalado?.enComodato === true
        if (filterComodato === 'yes' && !isComodato) return false
        if (filterComodato === 'no' && isComodato) return false

        const isRepo = c.esClienteReposicion === true
        if (filterReposicion === 'yes' && !isRepo) return false
        if (filterReposicion === 'no' && isRepo) return false

        if (filterZone !== 'all' && c.zonaId !== filterZone) return false

        return true
      })
      .sort((a: any, b: any) => (a.apellido || "").localeCompare(b.apellido || ""))
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
      ['sale', 'refill', 'service', 'adjustment', 'Reposición'].includes(tx.type)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedCustomerForStatement, transactions]);

  const activeFilters = useMemo(() => {
    const list: { label: string, value: string }[] = [];
    if (searchTerm) list.push({ label: 'Búsqueda', value: searchTerm });
    if (filterBalance !== 'all') list.push({ label: 'Saldo', value: filterBalance === 'debt' ? 'Sólo Deuda' : 'Sólo a Favor' });
    if (filterComodato !== 'all') list.push({ label: 'Comodato', value: filterComodato === 'yes' ? 'Sí' : 'No' });
    if (filterReposicion !== 'all') list.push({ label: 'Reposición', value: filterReposicion === 'yes' ? 'Sí' : 'No' });
    if (filterZone !== 'all') {
      const z = zones?.find(zone => zone.id === filterZone);
      list.push({ label: 'Zona', value: z ? z.name : filterZone });
    }
    return list;
  }, [searchTerm, filterBalance, filterComodato, filterReposicion, filterZone, zones]);

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

  const handleOpenStatement = (customer: any) => {
    setSelectedCustomerForStatement(customer);
    setTimeout(() => setIsStatementOpen(true), 50);
  }

  const handleCopyStatement = () => {
    if (!selectedCustomerForStatement) return;
    
    const now = new Date();
    let text = `*ESTADO DE CUENTA - DOSIMAT PRO*\n`;
    text += `*Cliente:* ${selectedCustomerForStatement.apellido}, ${selectedCustomerForStatement.nombre}\n`;
    text += `*Fecha:* ${now.toLocaleDateString('es-AR')}\n\n`;
    
    text += `*RESUMEN DE SALDOS:*\n`;
    text += `ARS: $${Number(selectedCustomerForStatement.saldoActual || 0).toLocaleString('es-AR')} ${selectedCustomerForStatement.saldoActual < 0 ? '(Deuda)' : '(A favor)'}\n`;
    text += `USD: u$s ${Number(selectedCustomerForStatement.saldoUSD || 0).toLocaleString('es-AR')} ${selectedCustomerForStatement.saldoUSD < 0 ? '(Deuda)' : '(A favor)'}\n\n`;
    
    if (pendingOperations.length > 0) {
      text += `*DETALLE DE COMPROBANTES PENDIENTES:* \n`;
      pendingOperations.forEach(tx => {
        const type = txTypeMap[tx.type]?.label || tx.type;
        const symbol = tx.currency === 'USD' ? 'u$s' : '$';
        text += `- ${formatLocalDate(tx.date)} | ${type}: Pendiente ${symbol} ${Math.abs(tx.pendingAmount || 0).toLocaleString('es-AR')}\n`;
      });
    } else {
      text += `No se registran comprobantes con deuda pendiente.\n`;
    }
    
    text += `\n_Generado automáticamente por Dosimat Pro_`;
    
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Estado de cuenta listo para pegar." });
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

  const handleWhatsApp = (phone: string, message: string = "") => {
    const formatted = formatWhatsAppNumber(phone);
    if (!formatted) {
      toast({ title: "Sin teléfono", description: "El cliente no tiene un número válido.", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpenMaps = (address: string, locality: string) => {
    if (!address) {
      toast({ title: "Sin dirección", description: "El cliente no tiene domicilio registrado.", variant: "destructive" });
      return;
    }
    const query = encodeURIComponent(`${address}, ${locality}, Argentina`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleBulkEmail = () => {
    const uniqueEmails = new Set<string>();
    filteredCustomers.forEach(c => {
      if (!c.mail) return;
      const parts = c.mail.split(/[;, ]+/);
      parts.forEach(p => {
        const cleaned = p.trim().toLowerCase();
        if (cleaned && cleaned.includes('@') && cleaned.includes('.')) uniqueEmails.add(cleaned);
      });
    });

    if (uniqueEmails.size === 0) {
      toast({ title: "Sin destinatarios", description: "No hay emails válidos en la lista filtrada.", variant: "destructive" });
      return;
    }

    setBulkStep(0);
    setDynamicValues({});
    setSelectedTemplateId("");
    setIsBulkEmailOpen(true);
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

  const handleSendSingleEmail = () => {
    const template = emailTemplates?.find(t => t.id === selectedTemplateId);
    if (!template || !selectedCommCustomer) return;
    const body = replaceMarkers(template.body, selectedCommCustomer, dynamicValues);
    const subject = replaceMarkers(template.subject || "", selectedCommCustomer, dynamicValues);
    const mailtoUrl = `mailto:${selectedCommCustomer.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
    window.open(mailtoUrl, '_blank');
    setIsSingleEmailOpen(false);
  };

  const handleSendSingleWs = () => {
    const template = wsTemplates?.find(t => t.id === selectedTemplateId);
    if (!template || !selectedCommCustomer) return;
    const message = replaceMarkers(template.body, selectedCommCustomer, dynamicValues);
    handleWhatsApp(selectedCommCustomer.telefono, message);
    setIsSingleWsOpen(false);
  };

  const handleSendBulkEmailConfirm = () => {
    const template = emailTemplates?.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const uniqueEmails = new Set<string>();
    filteredCustomers.forEach(c => {
      if (!c.mail) return;
      const parts = c.mail.split(/[;, ]+/);
      parts.forEach(p => {
        const cleaned = p.trim().toLowerCase();
        if (cleaned && cleaned.includes('@') && cleaned.includes('.')) uniqueEmails.add(cleaned);
      });
    });

    const bcc = Array.from(uniqueEmails).join(';');
    const body = replaceMarkers(template.body, null, dynamicValues);
    const subject = replaceMarkers(template.subject || "", null, dynamicValues);
    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`;
    window.open(mailtoUrl, '_blank');
    setIsBulkEmailOpen(false);
  };

  const handleSendBulkWsNext = () => {
    if (bulkStep >= filteredCustomers.length) {
      setIsBulkWsOpen(false);
      setBulkStep(0);
      return;
    }
    const client = filteredCustomers[bulkStep];
    const template = wsTemplates?.find(t => t.id === selectedTemplateId);
    if (template && client) {
      const message = replaceMarkers(template.body, client, dynamicValues);
      handleWhatsApp(client.telefono, message);
    }
    setBulkStep(prev => prev + 1);
  };

  const activeTemplate = useMemo(() => {
    const all = [...(emailTemplates || []), ...(wsTemplates || [])];
    return all.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, emailTemplates, wsTemplates]);

  const dynamicKeys = useMemo(() => {
    if (!activeTemplate) return [];
    const content = activeTemplate.body + (activeTemplate.subject || "");
    const matches = content.match(/\{\{\?([^}]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{\?|\}\}/g, ''))));
  }, [activeTemplate]);

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

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
                <Button variant="outline" size="sm" onClick={handleBulkEmail} className="h-9 gap-2 font-bold"><Mail className="h-4 w-4" /> Mail Masivo</Button>
                <Button variant="outline" size="sm" onClick={() => { setBulkStep(0); setDynamicValues({}); setSelectedTemplateId(""); setIsBulkWsOpen(true); }} className="h-9 gap-2 font-bold border-emerald-200 text-emerald-700 bg-emerald-50"><MessageCircle className="h-4 w-4" /> WhatsApp Masivo</Button>
                {isAdmin && <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold bg-primary h-9"><Plus className="mr-2 h-5 w-5" /> Nuevo Cliente</Button>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-l-4 border-l-primary shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Total Filtrado ARS</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>${filteredTotals.ars.toLocaleString('es-AR')}</h3></div>
                  <Calculator className="h-8 w-8 text-primary/20" />
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-l-4 border-l-emerald-500 shadow-sm">
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
                <input 
                  placeholder="Buscar por nombre, apellido o CUIT/DNI..." 
                  className={cn(
                    "w-full pl-10 h-11 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all",
                    searchTerm && "border-primary ring-2 ring-primary/10"
                  )}
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/20 rounded-xl border border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Saldo</Label>
                  <Select value={filterBalance} onValueChange={setFilterBalance}>
                    <SelectTrigger className={cn("w-[140px] h-9 text-xs transition-all", filterBalance !== 'all' && "border-primary bg-primary/5 text-primary ring-2 ring-primary/10 font-bold")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="debt" className="text-rose-600 font-bold">Sólo deuda</SelectItem>
                      <SelectItem value="credit" className="text-emerald-600 font-bold">Sólo a favor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Comodato</Label>
                  <Select value={filterComodato} onValueChange={setFilterComodato}>
                    <SelectTrigger className={cn("w-[110px] h-9 text-xs transition-all", filterComodato !== 'all' && "border-primary bg-primary/5 text-primary ring-2 ring-primary/10 font-bold")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Reposición</Label>
                  <Select value={filterReposicion} onValueChange={setFilterReposicion}>
                    <SelectTrigger className={cn("w-[110px] h-9 text-xs transition-all", filterReposicion !== 'all' && "border-primary bg-primary/5 text-primary ring-2 ring-primary/10 font-bold")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Zona</Label>
                  <Select value={filterZone} onValueChange={setFilterZone}>
                    <SelectTrigger className={cn("w-[140px] h-9 text-xs transition-all", filterZone !== 'all' && "border-primary bg-primary/5 text-primary ring-2 ring-primary/10 font-bold")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {zones?.map((z: any) => (<SelectItem key={z.id} value={z.id} className="text-xs">{z.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setSearchTerm(""); setFilterBalance("all"); setFilterComodato("all"); setFilterReposicion("all"); setFilterZone("all"); }} title="Limpiar todos los filtros"><FilterX className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-emerald-200 text-emerald-700 bg-emerald-50" onClick={handlePrintPDF} title="Generar reporte PDF de clientes"><Printer className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </section>

          {loadingCustomers ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Cargando...</p></div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 bg-muted/5"><User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-lg font-semibold">Sin coincidencias</h3></Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredCustomers.map((customer: any) => {
                const zone = zones?.find(z => z.id === customer.zonaId);
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
                        <Button variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100" onClick={() => handleOpenStatement(customer)} title="Estado de Cuenta"><Receipt className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenMaps(customer.direccion, customer.localidad)} title="Mapa"><MapPinned className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-700 border-blue-200 bg-blue-50" asChild title="Llamar"><a href={`tel:${customer.telefono}`}><Phone className="h-3.5 w-3.5" /></a></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-700 border-emerald-200 bg-emerald-50" onClick={() => handleWhatsApp(customer.telefono)} title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-700 border-blue-200 bg-blue-50" asChild title="Historial"><Link href={`/transactions?clientId=${customer.id}`}><History className="h-3.5 w-3.5" /></Link></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(customer)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { if(customer.mail) { setSelectedCommCustomer(customer); setDynamicValues({}); setSelectedTemplateId(""); setIsSingleEmailOpen(true); } }} title="Mail"><Mail className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => { setSelectedCommCustomer(customer); setDynamicValues({}); setSelectedTemplateId(""); setIsSingleWsOpen(true); }} title="WS Plantilla"><MessageSquare className="h-3.5 w-3.5" /></Button>
                        {isAdmin && <Button variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-100" onClick={() => setCustomerToDelete(customer)} title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>}
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
                      <div className="space-y-2"><Label className="text-blue-700 font-bold">Saldo ARS ($)</Label><Input type="number" value={formData.saldoActual} onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} className="border-blue-200 font-bold" /></div>
                      <div className="space-y-2"><Label className="text-emerald-700 font-bold">Saldo USD (u$s)</Label><Input type="number" value={formData.saldoUSD} onChange={(e) => setFormData({...formData, saldoUSD: Number(e.target.value)})} className="border-emerald-200 font-bold" /></div>
                    </div>
                    <div className="flex flex-col gap-4 pt-2 col-span-2">
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-white shadow-sm"><Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} /><Label className="font-bold">Cliente de Reposición</Label></div>
                      <div className={cn("flex items-center gap-3 p-3 border rounded-lg transition-colors", formData.equipoInstalado?.enComodato ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white")}><Switch checked={formData.equipoInstalado?.enComodato} onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} /><Label className={cn("font-bold", formData.equipoInstalado?.enComodato && "text-amber-800")}>Equipo en Comodato</Label></div>
                    </div>
                    <div className="col-span-2 space-y-2 pt-2"><Label className="font-bold">Notas Generales</Label><Textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} className="min-h-[100px]" /></div>
                  </div>
                </TabsContent>
                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Localidad</Label><Input value={formData.localidad} onChange={(e) => setFormData({...formData, localidad: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Zona</Label><Select value={formData.zonaId} onValueChange={(v) => setFormData({...formData, zonaId: v})}><SelectTrigger><SelectValue placeholder="Zona..." /></SelectTrigger><SelectContent>{zones?.map((z: any) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Provincia</Label><Input value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} /></div>
                    <div className="col-span-2 space-y-2 pt-4"><Label className="font-bold">Observaciones de Ubicación</Label><Textarea value={formData.observacionesUbicacion} onChange={(e) => setFormData({...formData, observacionesUbicacion: e.target.value})} placeholder="Ej: Portón verde..." /></div>
                  </div>
                </TabsContent>
                <TabsContent value="equipment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Medidas Pileta</Label><Input value={formData.equipoInstalado.medidasPileta} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, medidasPileta: e.target.value}})} /></div>
                    <div className="space-y-2"><Label>Volumen (Lts)</Label><Input type="number" value={formData.equipoInstalado.volumen} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, volumen: Number(e.target.value)}})} /></div>
                    <div className="space-y-2"><Label>Modelo Equipo</Label><Input value={formData.equipoInstalado.modeloEquipo} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, modeloEquipo: e.target.value}})} /></div>
                    <div className="col-span-2 space-y-2"><Label>Notas de Equipo</Label><Textarea value={formData.equipoInstalado.notes} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, notes: e.target.value}})} /></div>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="px-8 font-bold">Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-6 w-6 text-rose-600" />
                    <DialogTitle className="text-2xl font-black">Estado de Cuenta</DialogTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyStatement} className="h-8 gap-2 font-bold border-primary text-primary hover:bg-primary/5">
                    <Copy className="h-4 w-4" /> COPIAR
                  </Button>
                </div>
                <DialogDescription className="font-bold text-lg text-slate-800">
                  {selectedCustomerForStatement?.apellido}, {selectedCustomerForStatement?.nombre}
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-4 border rounded-2xl", (selectedCustomerForStatement?.saldoActual || 0) < 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Saldo ARS</p>
                    <p className={cn("text-3xl font-black", (selectedCustomerForStatement?.saldoActual || 0) < 0 ? "text-rose-800" : "text-emerald-800")}>
                      ${Number(selectedCustomerForStatement?.saldoActual || 0).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className={cn("p-4 border rounded-2xl", (selectedCustomerForStatement?.saldoUSD || 0) < 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Saldo USD</p>
                    <p className={cn("text-3xl font-black", (selectedCustomerForStatement?.saldoUSD || 0) < 0 ? "text-rose-800" : "text-emerald-800")}>
                      u$s {Number(selectedCustomerForStatement?.saldoUSD || 0).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest px-1">Operaciones Pendientes de Pago</h4>
                  <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                    <Table><TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-black uppercase">Fecha</TableHead><TableHead className="text-[10px] font-black uppercase">Operación</TableHead><TableHead className="text-right text-[10px] font-black uppercase">Monto Original</TableHead><TableHead className="text-right text-[10px] font-black uppercase">Deuda Pendiente</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pendingOperations.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">Sin deudas pendientes.</TableCell></TableRow>) : pendingOperations.map(tx => (
                          <TableRow key={tx.id} className="hover:bg-muted/5 transition-colors">
                            <TableCell className="text-xs font-medium">{formatLocalDate(tx.date)}</TableCell>
                            <TableCell><BadgeUI variant="outline" className={cn("text-[9px] uppercase font-bold", txTypeMap[tx.type]?.color || "bg-slate-50")}>{txTypeMap[tx.type]?.label || tx.type}</BadgeUI></TableCell>
                            <TableCell className="text-right font-medium text-xs">{tx.currency==='USD'?'u$s':'$'} {Math.abs(tx.amount || 0).toLocaleString('es-AR')}</TableCell>
                            <TableCell className="text-right font-black text-rose-600">{tx.currency==='USD'?'u$s':'$'} {Math.abs(tx.pendingAmount || 0).toLocaleString('es-AR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={() => setIsStatementOpen(false)} className="w-full font-bold h-12">Cerrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkEmailOpen || isSingleCommOpen} onOpenChange={(o) => { if(!o) { setIsBulkEmailOpen(false); setIsSingleEmailOpen(false); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isBulkEmailOpen ? 'Email Masivo' : `Email a ${selectedCommCustomer?.nombre}`}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Card className="bg-amber-50 border-amber-100 p-4"><p className="text-xs font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Verificar Remitente (DOSIMAT)</p></Card>
                <div className="space-y-2"><Label>Plantilla</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                  <SelectContent>{emailTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select></div>
                {dynamicKeys.length > 0 && (<div className="p-4 border border-dashed rounded-xl space-y-4 bg-muted/5"><p className="text-[10px] font-black uppercase text-primary">Datos Manuales</p><div className="grid grid-cols-1 gap-4">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-xs font-bold">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-9" /></div>))}</div></div>)}
                {activeTemplate && (<div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Vista Previa</Label><ScrollArea className="h-48 border rounded-xl bg-white p-4 italic text-sm text-slate-700 shadow-inner"><p className="font-bold mb-2">Asunto: {replaceMarkers(activeTemplate.subject || "", selectedCommCustomer, dynamicValues)}</p><div className="whitespace-pre-wrap">{replaceMarkers(activeTemplate.body, selectedCommCustomer, dynamicValues)}</div></ScrollArea></div>)}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => { setIsBulkEmailOpen(false); setIsSingleEmailOpen(false); }}>Cancelar</Button><Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={isBulkEmailOpen ? handleSendBulkEmailConfirm : handleSendSingleEmail} className="bg-primary font-bold">Abrir Mail App</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkWsOpen || isSingleWsOpen} onOpenChange={(o) => { if(!o) { setIsBulkWsOpen(false); setIsSingleWsOpen(false); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isBulkWsOpen ? 'WhatsApp Masivo' : 'WhatsApp Individual'}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                {bulkStep === 0 || isSingleWsOpen ? (
                  <>
                    <div className="space-y-2"><Label>Plantilla</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger><SelectContent>{wsTemplates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                    {dynamicKeys.length > 0 && (<div className="p-4 border border-dashed rounded-xl space-y-4 bg-muted/5"><p className="text-[10px] font-black uppercase text-primary">Datos Manuales</p><div className="grid grid-cols-1 gap-4">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-xs font-bold">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white h-9" /></div>))}</div></div>)}
                    {activeTemplate && (<div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Vista Previa</Label><div className="p-4 border rounded-xl bg-white italic text-sm text-slate-700 shadow-inner whitespace-pre-wrap">{replaceMarkers(activeTemplate.body, selectedCommCustomer || filteredCustomers[0], dynamicValues)}</div></div>)}
                  </>
                ) : (
                  <div className="space-y-6 text-center py-6"><Progress value={(bulkStep / filteredCustomers.length) * 100} className="h-2" /><div className="space-y-2"><h3 className="text-2xl font-black">Paso {bulkStep} de {filteredCustomers.length}</h3><p className="text-muted-foreground">Para: <b>{filteredCustomers[bulkStep-1]?.apellido}, {filteredCustomers[bulkStep-1]?.nombre}</b></p></div></div>
                )}
              </div>
              <DialogFooter>{isSingleWsOpen ? (<Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={handleSendSingleWs} className="w-full bg-emerald-600 font-bold">Abrir WhatsApp</Button>) : bulkStep === 0 ? (<Button disabled={!selectedTemplateId || dynamicKeys.some(k => !dynamicValues[k])} onClick={() => setBulkStep(1)} className="w-full bg-emerald-600 font-bold">Comenzar Secuencia</Button>) : (<div className="grid grid-cols-2 gap-2 w-full"><Button variant="outline" onClick={() => setIsBulkWsOpen(false)}>Cerrar</Button><Button onClick={handleSendBulkWsNext} className="bg-emerald-600 font-bold">{bulkStep < filteredCustomers.length ? "Siguiente" : "Finalizar"}</Button></div>)}</DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!customerToDelete} onOpenChange={(o) => !o && setCustomerToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente a <b>{customerToDelete?.apellido}, {customerToDelete?.nombre}</b>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </SidebarInset>
      </div>

      <div className="print-only w-full p-8 bg-white text-slate-900 font-sans">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Reporte de Clientes</h1>
            <p className="text-sm font-bold text-slate-600">Dosimat Pro System</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-400">Fecha de emisión</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Filtros Aplicados</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {activeFilters.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{f.label}:</span>
                  <span className="text-xs font-black text-slate-800">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border-2 border-slate-900 rounded-2xl bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Saldo ARS (Filtrado)</p>
            <p className={cn("text-2xl font-black", filteredTotals.ars < 0 ? "text-rose-700" : "text-emerald-700")}>
              ${filteredTotals.ars.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="p-4 border-2 border-slate-900 rounded-2xl bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Saldo USD (Filtrado)</p>
            <p className={cn("text-2xl font-black", filteredTotals.usd < 0 ? "text-rose-700" : "text-emerald-700")}>
              u$s {filteredTotals.usd.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Apellido y Nombre</th>
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Dirección / Localidad</th>
              <th className="border border-slate-900 p-2 text-left uppercase font-black">Zona</th>
              <th className="border border-slate-900 p-2 text-center uppercase font-black">Repo</th>
              <th className="border border-slate-900 p-2 text-center uppercase font-black">Comod.</th>
              <th className="border border-slate-900 p-2 text-right uppercase font-black">Saldo ARS</th>
              <th className="border border-slate-900 p-2 text-right uppercase font-black">Saldo USD</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c: any) => {
              const zone = zones?.find(z => z.id === c.zonaId);
              return (
                <tr key={c.id} className="border-b border-slate-300">
                  <td className="border border-slate-900 p-2 font-black">{c.apellido}, {c.nombre}</td>
                  <td className="border border-slate-900 p-2 uppercase font-medium">{c.direccion}, {c.localidad}</td>
                  <td className="border border-slate-900 p-2 uppercase font-bold">{zone?.name || 'S/D'}</td>
                  <td className="border border-slate-900 p-2 text-center font-bold">{c.esClienteReposicion ? 'SÍ' : 'NO'}</td>
                  <td className="border border-slate-900 p-2 text-center font-bold">{c.equipoInstalado?.enComodato ? 'SÍ' : 'NO'}</td>
                  <td className={cn("border border-slate-900 p-2 text-right font-black", c.saldoActual < 0 ? "text-rose-700" : "text-emerald-700")}>
                    ${Number(c.saldoActual || 0).toLocaleString('es-AR')}
                  </td>
                  <td className={cn("border border-slate-900 p-2 text-right font-black", c.saldoUSD < 0 ? "text-rose-700" : "text-emerald-700")}>
                    u$s {Number(c.saldoUSD || 0).toLocaleString('es-AR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-12 pt-6 border-t border-dashed border-slate-300 flex justify-between items-end italic text-[9px] text-slate-400">
          <p>Este reporte refleja la situación de cartera de clientes según los criterios aplicados.</p>
          <p>Página 1 de 1</p>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}

export default function CustomersPage() {
  return (<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><CustomersContent /></Suspense>)
}
