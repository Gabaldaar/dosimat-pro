
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
  ArrowRight
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
  const emailTemplatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  
  const { data: customers, isLoading } = useCollection(clientsQuery)
  const { data: zones, isLoading: isLoadingZones } = useCollection(zonesQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: transactions } = useCollection(txQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false)
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false)
  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [isBulkWsOpen, setIsBulkWsOpen] = useState(false)
  const [isDirectEmailWarningOpen, setIsDirectEmailWarningOpen] = useState(false)
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<any | null>(null)
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null)
  const [customerForDirectEmail, setCustomerForDirectEmail] = useState<any | null>(null)
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [selectedBulkWsTemplateId, setSelectedBulkWsTemplateId] = useState("")
  const [bulkWsIndex, setBulkWsIndex] = useState(0)
  
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([])

  const [newZoneName, setNewZoneName] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<any>(null)

  const [isPrintingStatement, setIsPrintingStatement] = useState(false)

  useEffect(() => {
    const balanceParam = searchParams.get('filterBalance')
    if (balanceParam) {
      setFilterBalance(balanceParam)
    }
  }, [searchParams])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || isZoneManagerOpen || isBulkEmailOpen || isWsDialogOpen || !!customerToDelete || isBulkWsOpen || isDirectEmailWarningOpen || isStatementOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, isZoneManagerOpen, isBulkEmailOpen, isWsDialogOpen, customerToDelete, isBulkWsOpen, isDirectEmailWarningOpen, isStatementOpen]);

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

  const pendingOperations = useMemo(() => {
    if (!selectedCustomerForStatement || !transactions) return [];
    return transactions.filter(tx => 
      tx.clientId === selectedCustomerForStatement.id && 
      (tx.pendingAmount !== undefined && tx.pendingAmount !== null && Math.abs(tx.pendingAmount) > 0.01) &&
      ['sale', 'refill', 'service', 'adjustment'].includes(tx.type)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedCustomerForStatement, transactions]);

  const resetFilters = () => {
    setSearchTerm("")
    setFilterBalance("all")
    setFilterComodato("all")
    setFilterReposicion("all")
    setFilterZone("all")
  }

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
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: editingCustomer ? "Cliente actualizado" : "Cliente creado" })
  }

  const confirmDelete = () => {
    if (!customerToDelete || isCommunicator || isReplenisher) return;
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
    if (!isAdmin || isCommunicator || isReplenisher) return
    if (!newZoneName.trim()) return
    const id = Math.random().toString(36).substring(2, 11)
    setDocumentNonBlocking(doc(db, 'zones', id), { id, name: newZoneName }, { merge: true })
    setNewZoneName("")
    toast({ title: "Zona agregada" })
  }

  const handleDeleteZone = (id: string) => {
    if (!isAdmin || isCommunicator || isReplenisher) return
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
    const emailsStr = uniqueEmails.join(';');

    if (!emailsStr) {
      toast({ title: "Sin emails", description: "Ningún cliente filtrado tiene un email válido.", variant: "destructive" })
      return
    }

    const subject = processMarkers(template.subject, {});
    const body = processMarkers(template.body, {});

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
    const encodedBcc = encodeURIComponent(emailsStr);

    const mailtoLink = `mailto:?bcc=${encodedBcc}&subject=${encodedSubject}&body=${encodedBody}`;
    
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.click();
    
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

  const handleOpenDirectEmailWarning = (customer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customer.mail) {
      toast({ title: "Sin Email", description: "Este cliente no tiene correo registrado.", variant: "destructive" });
      return;
    }
    setCustomerForDirectEmail(customer);
    setIsDirectEmailWarningOpen(true);
  }

  const handleConfirmDirectEmail = () => {
    if (customerForDirectEmail?.mail) {
      const link = document.createElement('a');
      link.href = `mailto:${customerForDirectEmail.mail}`;
      link.click();
    }
    setIsDirectEmailWarningOpen(false);
  }

  const handlePrintStatement = () => {
    setIsPrintingStatement(true);
    setTimeout(() => {
      window.print();
      setIsPrintingStatement(false);
    }, 300);
  };

  const handleSendStatementWs = () => {
    if (!selectedCustomerForStatement || pendingOperations.length === 0) return;
    
    const phone = selectedCustomerForStatement.telefono?.replace(/\D/g, '');
    if (!phone) {
      toast({ title: "Sin teléfono", description: "No se puede enviar WhatsApp.", variant: "destructive" });
      return;
    }

    let text = `*RESUMEN DE CUENTA - DOSIMAT PRO*\n`;
    text += `*Cliente:* ${selectedCustomerForStatement.apellido}, ${selectedCustomerForStatement.nombre}\n`;
    text += `*Fecha:* ${new Date().toLocaleDateString('es-AR')}\n\n`;
    text += `*Operaciones Pendientes:*\n`;
    
    pendingOperations.forEach(op => {
      const info = txTypeMap[op.type] || { label: op.type };
      const symbol = op.currency === 'USD' ? 'u$s' : '$';
      text += `- ${formatLocalDate(op.date)} | ${info.label}: *${symbol}${Math.abs(op.pendingAmount).toLocaleString('es-AR')}*\n`;
    });

    text += `\n*TOTAL DEUDA ARS:* $${Math.abs(selectedCustomerForStatement.saldoActual || 0).toLocaleString('es-AR')}\n`;
    text += `*TOTAL DEUDA USD:* u$s ${Math.abs(selectedCustomerForStatement.saldoUSD || 0).toLocaleString('es-AR')}\n\n`;
    text += `_Por favor, póngase en contacto para coordinar el pago. Gracias!_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const currentTemplate = emailTemplates?.find(t => t.id === selectedTemplateId);
  const currentWsTemplate = wsTemplates?.find(t => t.id === selectedWsTemplateId);

  if (isUserLoading || userData?.role === 'Replenisher') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">
          {userData?.role === 'Replenisher' ? 'Redirigiendo a Rutas...' : 'Cargando...'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="flex" />
              <div className="flex items-center gap-2 md:hidden pr-2 border-r">
                 <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                   <Droplets className="h-4 w-4 text-white" />
                 </div>
                 <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
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
              {!isCommunicator && !isReplenisher && (
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
                              </>
                            )}
                            
                            {customer.telefono && (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 text-emerald-600 border-emerald-200 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); setSelectedTxForWs(customer); setSelectedWsTemplateId(""); setDynamicValues({}); setIsWsDialogOpen(true); }}
                                title="WhatsApp con Plantilla"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-60 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMaps(customer.direccion, customer.localidad); }}>
                                  <MapPinned className="mr-2 h-4 w-4" /> Ver Mapa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleWhatsApp(customer, e)}>
                                  <PhoneCall className="mr-2 h-4 w-4 text-emerald-600" /> WhatsApp Directo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenDirectEmailWarning(customer, e)}>
                                  <Mail className="mr-2 h-4 w-4" /> Enviar Mail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleCopyClipboard(customer, e)}>
                                  <Copy className="mr-2 h-4 w-4" /> Copiar Datos
                                </DropdownMenuItem>
                                {!isCommunicator && !isReplenisher && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/transactions?clientId=${customer.id}`}>
                                      <History className="mr-2 h-4 w-4" /> Historial Completo
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && !isCommunicator && !isReplenisher && (
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

          <div className="h-40" />

          {/* Diálogo de Perfil de Cliente */}
          {!isCommunicator && !isReplenisher && (
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

          {/* Diálogo de Resumen de Cuenta / Reporte de Deuda */}
          <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-rose-600" /> Resumen de Deuda Pendiente
                    </DialogTitle>
                    <DialogDescription>
                      {selectedCustomerForStatement?.apellido}, {selectedCustomerForStatement?.nombre}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs" onClick={handlePrintStatement}>
                      <Printer className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs text-emerald-700 border-emerald-200" onClick={handleSendStatementWs}>
                      <MessageSquare className="h-3.5 w-3.5" /> RECLAMAR
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Total Adeudado ARS</p>
                    <p className="text-2xl font-black text-rose-800">${Math.abs(selectedCustomerForStatement?.saldoActual || 0).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Total Adeudado USD</p>
                    <p className="text-2xl font-black text-rose-800">u$s {Math.abs(selectedCustomerForStatement?.saldoUSD || 0).toLocaleString('es-AR')}</p>
                  </div>
                </div>

                <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Operación</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Total</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOperations.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 italic text-muted-foreground">No hay operaciones pendientes de pago registradas por imputación.</TableCell></TableRow>
                      ) : pendingOperations.map(op => {
                        const info = txTypeMap[op.type] || { label: op.type, color: "text-slate-600 bg-slate-50" };
                        const symbol = op.currency === 'USD' ? 'u$s' : '$';
                        return (
                          <TableRow key={op.id}>
                            <TableCell className="text-xs">{formatLocalDate(op.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", info.color)}>{info.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">{symbol} {Math.abs(op.amount).toLocaleString('es-AR')}</TableCell>
                            <TableCell className="text-right text-xs font-black text-rose-600">{symbol} {Math.abs(op.pendingAmount).toLocaleString('es-AR')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="p-4 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground flex gap-3">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>Este listado muestra únicamente las facturas o registros de deuda que aún no han sido cancelados en su totalidad mediante la aplicación de cobros.</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsStatementOpen(false)} className="w-full font-bold">Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Otros Diálogos (Zonas, Bulk, WS, etc.) - Sin cambios estructurales */}
          <Dialog open={isZoneManagerOpen} onOpenChange={setIsZoneManagerOpen}><DialogContent><DialogHeader><DialogTitle>Administrar Zonas Geográficas</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="flex gap-2"><Input placeholder="Nueva zona (Ej: Pilar, Escobar, San Isidro...)" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} /><Button onClick={handleAddZone}><Plus className="h-4 w-4" /></Button></div><ScrollArea className="h-[250px] border rounded-md p-2">{isLoadingZones ? (<p className="text-center py-4 text-xs text-muted-foreground">Cargando...</p>) : zones?.length === 0 ? (<p className="text-center py-4 text-xs text-muted-foreground italic">No hay zonas creadas.</p>) : (<div className="space-y-1">{zones?.map((z: any) => (<div key={z.id} className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors border-b last:border-0"><span className="text-sm font-medium">{z.name}</span><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteZone(z.id)}><Trash2 className="h-4 w-4" /></Button></div>))}</div>)}</ScrollArea></div><DialogFooter><Button onClick={() => setIsZoneManagerOpen(false)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
          <Dialog open={isBulkEmailOpen} onOpenChange={setIsBulkEmailOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Envío Masivo a Filtrados</DialogTitle><DialogDescription>Se enviará un mail a los clientes filtrados usando CCO (Copia Oculta).</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Seleccionar Plantilla</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger><SelectValue placeholder="Elige un formato..." /></SelectTrigger><SelectContent>{emailTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>{dynamicKeys.length > 0 && (<Card className="border-primary/20 bg-primary/5 p-4 space-y-4"><div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-widest"><Sparkles className="h-4 w-4" /> Datos requeridos para esta plantilla</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-[10px] font-bold uppercase">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} placeholder={`Completar ${key}...`} className="h-9 bg-white" /></div>))}</div></Card>)}<Card className="bg-amber-50 border-amber-200 p-3"><div className="flex gap-2 text-amber-800"><Info className="h-4 w-4 shrink-0" /><p className="text-xs"><b>Nota:</b> En los envíos masivos, los marcadores dinámicos no se personalizarán para cada cliente. Los precios de productos y los datos ingresados arriba sí.</p></div></Card><Card className="bg-amber-100 border-amber-400 p-4 border-2"><div className="flex gap-3 text-amber-900"><AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" /><div className="space-y-1"><p className="text-sm font-bold uppercase">Verificar Remitente</p><p className="text-xs leading-relaxed">Al abrir tu aplicación de correo, selecciona la cuenta <b>Remitente</b> correspondiente a <b>DOSIMAT</b>.</p></div></div></Card>{selectedTemplateId && currentTemplate && (<div className="space-y-3 animate-in fade-in duration-300"><div className="p-2 bg-muted/50 rounded border text-sm font-bold truncate">Asunto: {processMarkers(currentTemplate.subject, {})}</div><div className="p-3 bg-white rounded border text-xs whitespace-pre-wrap italic text-slate-600 max-h-[150px] overflow-y-auto shadow-inner">{processMarkers(currentTemplate.body, {})}</div></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setIsBulkEmailOpen(false)}>Cancelar</Button><Button onClick={handleSendBulkEmail} disabled={!selectedTemplateId || !allDynamicFieldsFilled} className="bg-primary font-bold"><Send className="mr-2 h-4 w-4" /> Preparar Envío</Button></DialogFooter></DialogContent></Dialog>
          <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> WhatsApp con Plantilla</DialogTitle><DialogDescription>Selecciona un formato para enviar a <b>{selectedTxForWs?.apellido}, {selectedTxForWs?.nombre}</b>.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Seleccionar Plantilla de WhatsApp</Label><Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}><SelectTrigger><SelectValue placeholder="Elige un mensaje..." /></SelectTrigger><SelectContent>{wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>{dynamicKeys.length > 0 && (<Card className="border-emerald-200 bg-emerald-50/30 p-4 space-y-4"><div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 tracking-widest"><Sparkles className="h-4 w-4" /> Completar datos de la plantilla</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-[10px] font-bold uppercase">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} placeholder={`Completar ${key}...`} className="h-9 bg-white border-emerald-100" /></div>))}</div></Card>)}{selectedWsTemplateId && currentWsTemplate && (<div className="space-y-3 animate-in fade-in duration-300"><div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-sm whitespace-pre-wrap italic text-slate-700 max-h-[200px] overflow-y-auto shadow-inner">{processMarkers(currentWsTemplate.body, selectedTxForWs)}</div></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSendWsTemplate} disabled={!selectedWsTemplateId || !allDynamicFieldsFilled} className="bg-emerald-600 hover:bg-emerald-700 font-bold"><Send className="mr-2 h-4 w-4" /> Abrir WhatsApp</Button></DialogFooter></DialogContent></Dialog>
          <Dialog open={isBulkWsOpen} onOpenChange={(o) => { setIsBulkWsOpen(o); if(!o) setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-600" /> Secuencia Masiva de WhatsApp</DialogTitle><DialogDescription>Estás enviando a la lista de {filteredCustomers.length} clientes filtrados.</DialogDescription></DialogHeader><div className="space-y-6 py-4"><div className="space-y-2"><Label className="font-bold">1. Seleccionar Plantilla para la secuencia</Label><Select value={selectedBulkWsTemplateId} onValueChange={setSelectedBulkWsTemplateId}><SelectTrigger><SelectValue placeholder="Elige el mensaje..." /></SelectTrigger><SelectContent>{wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>{dynamicKeys.length > 0 && (<Card className="border-emerald-200 bg-emerald-50/30 p-4 space-y-4"><div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 tracking-widest"><Sparkles className="h-4 w-4" /> Datos para toda la secuencia</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{dynamicKeys.map(key => (<div key={key} className="space-y-1"><Label className="text-[10px] font-bold uppercase">{key}</Label><Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} placeholder={`Ej: Este viernes, $500, etc...`} className="h-9 bg-white border-emerald-100" /></div>))}</div></Card>)}{selectedBulkWsTemplateId && currentBulkCustomer && (<div className="space-y-4 animate-in fade-in duration-300"><div className="flex flex-col gap-2"><div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground"><span>Progreso del envío</span><span>{bulkWsIndex + 1} de {filteredCustomers.length}</span></div><Progress value={((bulkWsIndex + 1) / filteredCustomers.length) * 100} className="h-2" /></div><Card className="border-emerald-200 bg-emerald-50/30"><CardContent className="pt-6"><div className="flex justify-between items-start mb-4"><div><p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Destinatario Actual</p><h3 className="text-xl font-bold">{currentBulkCustomer.apellido}, {currentBulkCustomer.nombre}</h3><p className="text-xs text-muted-foreground">{currentBulkCustomer.telefono || "SIN TELÉFONO"}</p></div><Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">{bulkWsIndex + 1}/{filteredCustomers.length}</Badge></div><div className="space-y-2"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vista previa</p><div className="p-4 bg-white rounded-xl border border-emerald-100 text-sm italic whitespace-pre-wrap leading-relaxed shadow-inner max-h-[150px] overflow-y-auto">{processMarkers(currentBulkWsTemplate.body, currentBulkCustomer)}</div></div></CardContent></Card></div>)}{!selectedBulkWsTemplateId && (<div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5"><MessageSquare className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" /><p className="text-sm text-muted-foreground">Selecciona una plantilla para comenzar.</p></div>)}</div><DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4"><Button variant="ghost" onClick={() => setIsBulkWsOpen(false)} className="font-bold w-full sm:w-auto">Finalizar</Button><div className="flex gap-2 w-full sm:w-auto"><Button variant="outline" onClick={handleSkipWs} disabled={!selectedBulkWsTemplateId} className="gap-2 flex-1 sm:flex-none">Omitir <FastForward className="h-4 w-4" /></Button><Button onClick={handleSendNextWs} disabled={!selectedBulkWsTemplateId || !currentBulkCustomer?.telefono || !allDynamicFieldsFilled} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 shadow-lg shadow-emerald-200 gap-2 flex-1 sm:flex-none"><Send className="h-4 w-4" /> Enviar</Button></div></DialogFooter></DialogContent></Dialog>
          <Dialog open={isDirectEmailWarningOpen} onOpenChange={setIsDirectEmailWarningOpen}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Aviso de Seguridad</DialogTitle><DialogDescription>Se abrirá tu programa de correo para escribirle a <b>{customerForDirectEmail?.apellido}, {customerForDirectEmail?.nombre}</b>.</DialogDescription></DialogHeader><div className="py-4"><Card className="bg-amber-100 border-amber-400 p-4 border-2"><div className="flex gap-3 text-amber-900"><AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" /><div className="space-y-1"><p className="text-sm font-bold uppercase">Verificar Remitente</p><p className="text-xs leading-relaxed">Al abrir tu aplicación de correo, asegúrate de seleccionar la cuenta correspondiente a <b>DOSIMAT</b>.</p></div></div></Card></div><DialogFooter><Button variant="outline" onClick={() => setIsDirectEmailWarningOpen(false)}>Cancelar</Button><Button onClick={handleConfirmDirectEmail} className="bg-primary font-bold">Continuar al Email</Button></DialogFooter></DialogContent></Dialog>
          <AlertDialog open={!!customerToDelete} onOpenChange={(o) => { if(!o) setCustomerToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente a <b>{customerToDelete?.apellido}, {customerToDelete?.nombre}</b> y sus datos. Asegúrate de haber revisado sus cuentas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

        </SidebarInset>
      </div>

      {/* VISTA DE IMPRESIÓN DEL REPORTE DE DEUDA */}
      {selectedCustomerForStatement && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Estado de Cuenta / Deuda Pendiente</h1>
              <p className="text-sm font-bold text-slate-600">Cliente: {selectedCustomerForStatement.apellido}, {selectedCustomerForStatement.nombre}</p>
              <p className="text-xs text-slate-400 uppercase mt-1">Dirección: {selectedCustomerForStatement.direccion}, {selectedCustomerForStatement.localidad}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
              <p className="text-xs font-bold">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-3 border-b border-slate-200 pb-1">TOTAL ADEUDADO (ARS)</h2>
              <p className="text-3xl font-black text-rose-700">${Math.abs(selectedCustomerForStatement.saldoActual || 0).toLocaleString('es-AR')}</p>
            </div>
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-3 border-b border-slate-200 pb-1">TOTAL ADEUDADO (USD)</h2>
              <p className="text-3xl font-black text-rose-700">u$s {Math.abs(selectedCustomerForStatement.saldoUSD || 0).toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Detalle de Operaciones Pendientes
            </h3>
            <table className="w-full border-collapse border-2 border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-900 p-2 text-left uppercase font-black">Fecha</th>
                  <th className="border border-slate-900 p-2 text-left uppercase font-black">Operación / Concepto</th>
                  <th className="border border-slate-900 p-2 text-right uppercase font-black w-32">Monto Original</th>
                  <th className="border border-slate-900 p-2 text-right uppercase font-black w-32">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {pendingOperations.map((op, idx) => {
                  const info = txTypeMap[op.type] || { label: op.type };
                  const symbol = op.currency === 'USD' ? 'u$s' : '$';
                  return (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="border border-slate-900 p-2">{formatLocalDate(op.date)}</td>
                      <td className="border border-slate-900 p-2">
                        <p className="font-black uppercase">{info.label}</p>
                        <p className="text-[9px] text-slate-500 italic">{op.description}</p>
                      </td>
                      <td className="border border-slate-900 p-2 text-right font-medium">{symbol} {Math.abs(op.amount).toLocaleString('es-AR')}</td>
                      <td className="border border-slate-900 p-2 text-right font-black text-rose-700">{symbol} {Math.abs(op.pendingAmount).toLocaleString('es-AR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-12 p-6 border border-dashed border-slate-400 rounded-2xl bg-slate-50/50">
            <h4 className="text-[10px] font-black uppercase mb-2">Información de Pago</h4>
            <p className="text-xs leading-relaxed">
              Por favor, realice el pago de las operaciones detalladas arriba. Si ya realizó un pago parcial, el mismo ya se encuentra descontado del "Saldo Pendiente" de cada fila.
              <br/><br/>
              Gracias por confiar en nosotros.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t-2 border-slate-900 flex justify-between items-end italic text-[10px] text-slate-400">
            <p>Este documento es un comprobante de estado de cuenta oficial generado por Dosimat Pro.</p>
            <p>Pág 1/1</p>
          </div>
        </div>
      )}

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
