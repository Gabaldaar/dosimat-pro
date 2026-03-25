
"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Calendar as CalendarIcon, 
  Trash2, 
  ShoppingBag, 
  Droplet, 
  Wrench, 
  Settings2, 
  Receipt, 
  MoreVertical, 
  Edit, 
  RefreshCw, 
  Loader2, 
  ArrowDownLeft, 
  Info, 
  Calculator, 
  TrendingUp,
  FilterX,
  MessageSquare,
  PlusCircle,
  Copy,
  Send,
  ArrowRight
} from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc, increment, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

const txTypeMap: Record<string, { label: string, icon: any, color: string, description: string }> = {
  sale: { label: "Venta", icon: ShoppingBag, color: "text-blue-600 bg-blue-50", description: "Venta general de productos o accesorios." },
  refill: { label: "Reposición", icon: Droplet, color: "text-cyan-600 bg-cyan-50", description: "Servicio de reposición de químicos." },
  service: { label: "Técnico", icon: Wrench, color: "text-indigo-600 bg-indigo-50", description: "Reparaciones o visitas de mantenimiento." },
  cobro: { label: "Cobro", icon: Receipt, color: "text-emerald-600 bg-emerald-50", description: "Pago recibido del cliente." },
  adjustment: { label: "Ajuste", icon: Settings2, color: "text-slate-600 bg-slate-50", description: "Corrección manual de saldo." },
  Adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-slate-600 bg-slate-50", description: "Ajuste manual." },
  Expense: { label: "Gasto", icon: ArrowDownLeft, color: "text-rose-600 bg-rose-50", description: "Gasto manual registrado." },
}

function formatLocalDate(dateString: string) {
  if (!dateString) return "---";
  const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-AR');
}

function TransactionsContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const searchParams = useSearchParams()
  
  const [mainView, setMainView] = useState("history")
  const [activeTab, setActiveTab] = useState("refill")
  const [editingTx, setEditingTx] = useState<any | null>(null)
  const [txToDelete, setTxToDelete] = useState<any | null>(null)
  const [selectedTxDetails, setSelectedTxDetails] = useState<any | null>(null)

  const [isWsDialogOpen, setIsWsDialogOpen] = useState(false)
  const [selectedTxForWs, setSelectedTxForWs] = useState<any | null>(null)
  const [selectedWsTemplateId, setSelectedWsTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})

  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterOpType, setFilterOpType] = useState("all") 
  const [filterFlow, setFilterFlow] = useState("all")
  const [itemFilterCategory, setItemFilterCategory] = useState("all")

  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const accountsQuery = useMemoFirebase(() => collection(db, 'financial_accounts'), [db])
  const txQuery = useMemoFirebase(() => query(collection(db, 'transactions'), orderBy('date', 'desc')), [db])
  const wsTemplatesQuery = useMemoFirebase(() => collection(db, 'whatsapp_templates'), [db])
  const productCatsQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])

  const { data: customers } = useCollection(clientsQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: accounts } = useCollection(accountsQuery)
  const { data: transactions } = useCollection(txQuery)
  const { data: wsTemplates } = useCollection(wsTemplatesQuery)
  const { data: productCategories } = useCollection(productCatsQuery)

  const sortedCatalog = useMemo(() => {
    if (!catalog) return []
    return [...catalog].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [catalog])

  const sortedProductCategories = useMemo(() => {
    if (!productCategories) return []
    return [...productCategories].sort((a: any, b: any) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [productCategories]);

  const filteredCatalogItems = useMemo(() => {
    if (!sortedCatalog) return []
    if (itemFilterCategory === "all") return sortedCatalog
    return sortedCatalog.filter((item: any) => item.categoryId === itemFilterCategory)
  }, [sortedCatalog, itemFilterCategory])

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({ ARS: "pending", USD: "pending" })
  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({ ARS: 0, USD: 0 })
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  const [manualAmount, setManualAmount] = useState(0)
  const [manualCurrency, setManualCurrency] = useState("ARS")
  const [manualAccountId, setManualAccountId] = useState("pending")
  const [adjustmentSign, setAdjustmentSign] = useState<"1" | "-1">("1")
  const [txDescription, setTxDescription] = useState("")

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.qty) || 0)
      const discountAmount = subtotal * ((Number(item.discount) || 0) / 100)
      const amount = subtotal - discountAmount
      acc[item.currency as 'ARS' | 'USD'] = (acc[item.currency as 'ARS' | 'USD'] || 0) + amount
      return acc
    }, { ARS: 0, USD: 0 })
  }, [selectedItems])

  const handleAddItem = (itemId: string) => {
    const item = catalog?.find((i: any) => i.id === itemId)
    if (!item) return
    const defaultCurrency = (item.priceARS || 0) > 0 ? 'ARS' : 'USD'
    const defaultPrice = (item.priceARS || 0) > 0 ? item.priceARS : item.priceUSD
    setSelectedItems(prev => [...prev, { itemId: item.id, name: item.name, qty: 1, price: defaultPrice, currency: defaultCurrency, discount: 0 }])
  }

  const handleSaveTransaction = () => {
    const client = selectedCustomerId ? customers?.find(c => c.id === selectedCustomerId) : null;
    const finalDateStr = new Date(operationDate + 'T12:00:00').toISOString();

    if (['cobro', 'adjustment', 'Expense'].includes(activeTab)) {
      const txId = Math.random().toString(36).substring(2, 11)
      const finalAmount = Number(manualAmount) * (activeTab === 'adjustment' ? Number(adjustmentSign) : activeTab === 'Expense' ? -1 : 1)
      const txData = { 
        id: txId, 
        date: finalDateStr, 
        clientId: selectedCustomerId || null, 
        type: activeTab, 
        amount: finalAmount, 
        currency: manualCurrency, 
        description: txDescription || `${activeTab} manual`, 
        financialAccountId: manualAccountId === "pending" ? null : manualAccountId, 
        paidAmount: activeTab === 'cobro' ? finalAmount : 0, 
        pendingAmount: (activeTab === 'adjustment' && finalAmount < 0) ? finalAmount : 0 
      }
      setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
      if (manualAccountId !== "pending") updateDocumentNonBlocking(doc(db, 'financial_accounts', manualAccountId), { initialBalance: increment(finalAmount) });
      if (client) { const field = manualCurrency === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(finalAmount) }); }
    } else {
      ['ARS', 'USD'].forEach(curr => {
        const total = cartTotals[curr as 'ARS' | 'USD']; if (total <= 0) return;
        const paid = Number(paidAmounts[curr] || 0); const debt = total - paid;
        const txId = Math.random().toString(36).substring(2, 11);
        const txData = { 
          id: txId, 
          date: finalDateStr, 
          clientId: selectedCustomerId || null, 
          type: activeTab, 
          amount: -Number(total), 
          paidAmount: paid, 
          debtAmount: debt, 
          currency: curr, 
          description: txDescription || `Operación ${activeTab}`, 
          financialAccountId: (destinationAccounts[curr]==="pending" || paid === 0) ? null : destinationAccounts[curr], 
          items: selectedItems.filter(i => i.currency === curr), 
          pendingAmount: -debt 
        }
        setDocumentNonBlocking(doc(db, 'transactions', txId), txData, { merge: true })
        if (destinationAccounts[curr] !== "pending" && paid !== 0) updateDocumentNonBlocking(doc(db, 'financial_accounts', destinationAccounts[curr]), { initialBalance: increment(paid) });
        if (client && debt !== 0) { const field = curr === 'ARS' ? 'saldoActual' : 'saldoUSD'; updateDocumentNonBlocking(doc(db, 'clients', client.id), { [field]: increment(-debt) }); }
      })
    }
    toast({ title: "Operación registrada" }); resetRegisterForm(); setMainView("history");
  }

  const resetRegisterForm = () => {
    setEditingTx(null); setSelectedCustomerId(""); setSelectedItems([]); setTxDescription(""); setManualAmount(0); setPaidAmounts({ ARS: 0, USD: 0 }); setDestinationAccounts({ ARS: "pending", USD: "pending" });
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
      const matchCustomer = filterCustomer === "all" || tx.clientId === filterCustomer
      const matchAccount = filterAccount === "all" || (filterAccount === "null" ? !tx.financialAccountId : tx.financialAccountId === filterAccount)
      const txDateStr = tx.date.split('T')[0];
      const matchStart = !filterStartDate || txDateStr >= filterStartDate;
      const matchEnd = !filterEndDate || txDateStr <= filterEndDate;
      const matchType = filterOpType === "all" || tx.type === filterOpType;
      
      let matchFlow = true;
      if (filterFlow === 'income') matchFlow = tx.amount > 0 || tx.type === 'cobro';
      if (filterFlow === 'expense') matchFlow = tx.amount < 0 && tx.type !== 'cobro';

      return matchCustomer && matchAccount && matchStart && matchEnd && matchType && matchFlow;
    })
  }, [transactions, filterCustomer, filterAccount, filterStartDate, filterEndDate, filterOpType, filterFlow])

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.currency === 'ARS') acc.ars += Number(tx.amount || 0);
      if (tx.currency === 'USD') acc.usd += Number(tx.amount || 0);
      return acc;
    }, { ars: 0, usd: 0 })
  }, [filteredTransactions]);

  const dynamicKeys = useMemo(() => {
    if (!selectedWsTemplateId || !wsTemplates) return [];
    const template = wsTemplates.find(t => t.id === selectedWsTemplateId);
    if (!template) return [];
    const matches = template.body.match(/\{\{\?([^}]+)\}\}/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{\?|\}\}/g, ''))));
  }, [selectedWsTemplateId, wsTemplates]);

  const handleOpenWsDialog = (tx: any) => {
    setSelectedTxForWs(tx);
    setSelectedWsTemplateId("");
    setDynamicValues({});
    setIsWsDialogOpen(true);
  }

  const handleSendWs = () => {
    if (!selectedTxForWs || !selectedWsTemplateId || !wsTemplates) return;
    const template = wsTemplates.find(t => t.id === selectedWsTemplateId);
    if (!template) return;

    const client = customers?.find(c => c.id === selectedTxForWs.clientId);
    let message = template.body;

    const standardValues: Record<string, string> = {
      "Nombre": client?.nombre || "Cliente",
      "Apellido": client?.apellido || "",
      "Fecha": formatLocalDate(selectedTxForWs.date),
      "Total": Math.abs(selectedTxForWs.amount).toLocaleString('es-AR'),
      "Pendiente_Operacion": Math.abs(selectedTxForWs.pendingAmount || 0).toLocaleString('es-AR'),
      "Moneda": selectedTxForWs.currency,
      "Descripción": selectedTxForWs.description || ""
    };

    Object.entries(standardValues).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      message = message.replace(regex, val);
    });

    Object.entries(dynamicValues).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\?${key}\\}\\}`, 'g');
      message = message.replace(regex, val);
    });

    const phone = client?.telefono?.replace(/\D/g, '') || "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    setIsWsDialogOpen(false);
  }

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-48 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">{editingTx ? "Editar" : "Operaciones"}</h1>
          </div>
          <Tabs value={mainView} onValueChange={setMainView}>
            <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border">
              <TabsTrigger value="register" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">NUEVA</TabsTrigger>
              <TabsTrigger value="history" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary uppercase">HISTORIAL</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <Card className="lg:col-span-2 glass-card border-t-4 border-t-primary">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="space-y-1">
                     <CardTitle className="text-xl flex items-center gap-2">Registrar {txTypeMap[activeTab]?.label}</CardTitle>
                     <p className="text-xs text-muted-foreground">{txTypeMap[activeTab]?.description}</p>
                   </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50 border">
                          {['sale', 'refill', 'service', 'cobro', 'adjustment'].map(key => {
                            const Icon = txTypeMap[key].icon;
                            return (
                              <TabsTrigger key={key} value={key} className="data-[state=active]:bg-primary data-[state=active]:text-white py-2 flex flex-col gap-1">
                                <Icon className="h-4 w-4" />
                                <span className="text-[9px] font-black uppercase">{txTypeMap[key].label}</span>
                              </TabsTrigger>
                            );
                          })}
                      </TabsList>
                    </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-xl">
                  <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold"><User className="h-4 w-4" /> Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">GLOBAL / SIN CLIENTE</SelectItem>
                        {customers?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} (${Number(c.saldoActual || 0).toLocaleString()})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="flex items-center gap-2 text-primary font-bold"><CalendarIcon className="h-4 w-4" /> Fecha</Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="bg-white" />
                  </div>
                </div>
                {['cobro', 'adjustment'].includes(activeTab) ? (
                  <div className="p-6 border rounded-xl space-y-4 bg-muted/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Monto</Label><Input type="number" value={manualAmount} onChange={(e) => setManualAmount(Number(e.target.value))} className="bg-white font-bold" /></div>
                      <div className="space-y-2"><Label>Moneda</Label>
                        <Tabs value={manualCurrency} onValueChange={setManualCurrency} className="w-full">
                          <TabsList className="grid grid-cols-2 h-10 p-1 border">
                            <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                            <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <div className="space-y-2"><Label>Caja Destino</Label>
                        <Select value={manualAccountId} onValueChange={setManualAccountId}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="pending">A CUENTA</SelectItem>{accounts?.filter(a => a.currency === manualCurrency).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={itemFilterCategory} onValueChange={setItemFilterCategory}>
                        <SelectTrigger><SelectValue placeholder="Categoría..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="all">TODAS</SelectItem>
                          {sortedProductCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} {c.isFavorite && "⭐"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={handleAddItem}>
                        <SelectTrigger><SelectValue placeholder="Añadir producto..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {filteredCatalogItems.map(i => (<SelectItem key={i.id} value={i.id}>{i.name} (${i.priceARS} / u$s {i.priceUSD})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border rounded-xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Ítem</TableHead>
                            <TableHead className="w-24 text-center">Cant.</TableHead>
                            <TableHead className="w-32 text-center">Precio Unit.</TableHead>
                            <TableHead className="w-24 text-center">Desc %</TableHead>
                            <TableHead className="w-32 text-center">Moneda</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-bold text-xs">{item.name}</TableCell>
                              <TableCell><Input type="number" value={item.qty} className="h-8 text-center font-bold px-1" onChange={(e) => { const n = [...selectedItems]; n[i].qty = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                              <TableCell><Input type="number" value={item.price} className="h-8 text-center font-bold px-1" onChange={(e) => { const n = [...selectedItems]; n[i].price = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                              <TableCell><Input type="number" value={item.discount} className="h-8 text-center font-bold px-1" onChange={(e) => { const n = [...selectedItems]; n[i].discount = Number(e.target.value); setSelectedItems(n); }} /></TableCell>
                              <TableCell>
                                <Tabs value={item.currency} onValueChange={(v) => { const n = [...selectedItems]; n[i].currency = v; setSelectedItems(n); }} className="w-full">
                                  <TabsList className="grid grid-cols-2 h-7 p-0.5 border">
                                    <TabsTrigger value="ARS" className="text-[7px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                    <TabsTrigger value="USD" className="text-[7px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </TableCell>
                              <TableCell className="text-right font-black text-xs">{(item.price * item.qty * (1 - item.discount/100)).toLocaleString()}</TableCell>
                              <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItems(selectedItems.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                <div className="space-y-2"><Label className="font-bold">Notas</Label><Input value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="bg-white h-11" /></div>
              </CardContent>
            </Card>
            <Card className="glass-card h-fit sticky top-8 border-primary/20">
              <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-base uppercase font-black">Confirmar Registro</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!['cobro', 'adjustment', 'Expense'].includes(activeTab) && (
                  <div className="space-y-4">
                    {['ARS', 'USD'].map(curr => {
                      const total = cartTotals[curr as 'ARS'|'USD'];
                      if (total <= 0) return null;
                      const paid = paidAmounts[curr];
                      const debt = total - paid;
                      return (
                        <div key={curr} className="p-4 rounded-xl border bg-muted/10 space-y-3">
                          <div className="flex justify-between items-center"><span className="text-xs font-black uppercase text-muted-foreground">Total {curr}:</span><span className="text-xl font-black">{curr==='USD'?'u$s':'$'} {total.toLocaleString()}</span></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black text-emerald-700">Abonado hoy:</Label><Input type="number" value={paid} onChange={(e) => setPaidAmounts({...paidAmounts, [curr]: Number(e.target.value)})} className="h-10 border-emerald-200 font-black text-lg" /></div>
                          <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Caja:</Label><Select value={destinationAccounts[curr]} onValueChange={(v) => setDestinationAccounts({...destinationAccounts, [curr]: v})}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">A CUENTA</SelectItem>{accounts?.filter(a => a.currency === curr).map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                          {debt > 0 && (
                            <div className="pt-2 border-t border-dashed mt-2 text-rose-600 font-black text-xs flex justify-between uppercase italic">
                              <span>Quedará a cuenta:</span>
                              <span>{curr==='USD'?'u$s':'$'} {debt.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <Button className="w-full h-14 font-black shadow-xl text-lg uppercase" onClick={handleSaveTransaction}>REGISTRAR</Button>
                <Button variant="outline" className="w-full h-12 border-rose-600 text-rose-600 hover:bg-rose-50 font-bold uppercase" onClick={() => { resetRegisterForm(); setMainView("history"); }}>CANCELAR</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-l-4 border-l-primary"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Flujo Neto ARS</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600")}>${filteredTotals.ars.toLocaleString()}</h3></div><Calculator className="h-8 w-8 text-primary/20" /></CardContent></Card>
              <Card className="bg-emerald-50 border-l-4 border-l-emerald-500"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-emerald-700/60 tracking-widest">Flujo Neto USD</p><h3 className={cn("text-2xl font-black mt-1", filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600")}>u$s {filteredTotals.usd.toLocaleString()}</h3></div><TrendingUp className="h-8 w-8 text-emerald-500/20" /></CardContent></Card>
            </div>
            <Card className="glass-card p-4 flex flex-wrap gap-4 items-end">
                 <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</Label><Select value={filterCustomer} onValueChange={setFilterCustomer}><SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{customers?.map(c => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Caja</Label><Select value={filterAccount} onValueChange={setFilterAccount}><SelectTrigger className="w-[160px] h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{accounts?.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                 <div className="space-y-1">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Flujo</Label>
                   <Select value={filterFlow} onValueChange={setFilterFlow}>
                     <SelectTrigger className="w-[120px] h-10"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todos</SelectItem>
                       <SelectItem value="income" className="text-emerald-600">Ingresos</SelectItem>
                       <SelectItem value="expense" className="text-rose-600">Egresos</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Operación</Label>
                   <Select value={filterOpType} onValueChange={setFilterOpType}>
                     <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Todas</SelectItem>
                       {Object.keys(txTypeMap).map(k => <SelectItem key={k} value={k}>{txTypeMap[k].label}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Desde</Label><Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="h-10 w-[140px]" /></div>
                 <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Hasta</Label><Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="h-10 w-[140px]" /></div>
                 <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setFilterCustomer("all"); setFilterAccount("all"); setFilterStartDate(""); setFilterEndDate(""); setFilterOpType("all"); setFilterFlow("all"); }}><FilterX className="h-4 w-4" /></Button>
            </Card>
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Saldo Caja Post</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx: any) => {
                    const cust = customers?.find(c => c.id === tx.clientId);
                    const acc = accounts?.find(a => a.id === tx.financialAccountId);
                    const info = txTypeMap[tx.type] || { label: tx.type, icon: ShoppingBag, color: "text-slate-600 bg-slate-50" };
                    const Icon = info.icon;
                    return (
                      <TableRow key={tx.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setSelectedTxDetails(tx)}>
                        <TableCell className="text-xs font-medium">{formatLocalDate(tx.date)}</TableCell>
                        <TableCell><span className="font-bold">{cust ? `${cust.apellido}, ${cust.nombre}` : 'Global'}</span></TableCell>
                        <TableCell><Badge variant="outline" className={cn("text-[9px] gap-1", info.color)}><Icon className="h-3 w-3" />{info.label}</Badge></TableCell>
                        <TableCell><span className="text-[10px] font-bold text-muted-foreground uppercase">{acc?.name || "---"}</span></TableCell>
                        <TableCell className="text-right font-bold">{tx.currency==='USD'?'u$s':'$'} {Math.abs(tx.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs text-rose-600 font-bold">{tx.currency==='USD'?'u$s':'$'} {Math.abs(tx.pendingAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">{tx.accountBalanceAfter !== null ? `${tx.currency==='USD'?'u$s':'$'} ${tx.accountBalanceAfter.toLocaleString()}` : "---"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setSelectedTxDetails(tx)}><Info className="h-4 w-4 mr-2" /> Detalle</DropdownMenuItem><DropdownMenuItem onClick={() => handleOpenWsDialog(tx)}><MessageSquare className="h-4 w-4 mr-2" /> Notificar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        <Dialog open={!!selectedTxDetails} onOpenChange={(o) => !o && setSelectedTxDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
                    {selectedTxDetails && (
                      <>
                        {(() => {
                          const info = txTypeMap[selectedTxDetails.type] || { icon: Info };
                          const Icon = info.icon;
                          return <Icon className="h-5 w-5 text-primary" />;
                        })()}
                        {txTypeMap[selectedTxDetails.type]?.label || 'Detalle'}
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription className="font-bold text-slate-800">
                    {selectedTxDetails && formatLocalDate(selectedTxDetails.date)}
                  </DialogDescription>
                </div>
                {selectedTxDetails && (
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-black", txTypeMap[selectedTxDetails.type]?.color)}>
                    {selectedTxDetails.type}
                  </Badge>
                )}
              </div>
            </DialogHeader>
            {selectedTxDetails && (
              <div className="py-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 rounded-2xl border space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Monto Operación</p>
                    <p className="text-2xl font-black">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {Math.abs(selectedTxDetails.amount).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black uppercase text-rose-700">Saldo Pendiente</p>
                    <p className="text-2xl font-black text-rose-800">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {Math.abs(selectedTxDetails.pendingAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><User className="h-3 w-3" /> Información del Cliente</p>
                  <div className="p-3 border rounded-xl bg-white flex justify-between items-center">
                    <span className="font-bold">{customers?.find(c => c.id === selectedTxDetails.clientId)?.apellido || 'Global'}, {customers?.find(c => c.id === selectedTxDetails.clientId)?.nombre || ''}</span>
                    <Badge variant="secondary">{selectedTxDetails.financialAccountId ? accounts?.find(a => a.id === selectedTxDetails.financialAccountId)?.name : 'Sin Caja'}</Badge>
                  </div>
                </div>

                {selectedTxDetails.items && selectedTxDetails.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-muted-foreground">Detalle de Productos</p>
                    <div className="border rounded-xl bg-white overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold uppercase">Ítem</TableHead>
                            <TableHead className="text-center text-[10px] font-bold uppercase">Cant.</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTxDetails.items.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium">{item.name}</TableCell>
                              <TableCell className="text-center text-xs font-black">{item.qty}</TableCell>
                              <TableCell className="text-right text-xs font-bold">{selectedTxDetails.currency === 'USD' ? 'u$s' : '$'} {(item.price * item.qty * (1 - (item.discount || 0)/100)).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {selectedTxDetails.description && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Notas</p>
                    <div className="p-3 bg-white border border-dashed rounded-lg italic text-sm">{selectedTxDetails.description}</div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setSelectedTxDetails(null)} className="w-full font-bold">Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isWsDialogOpen} onOpenChange={setIsWsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" /> Notificación por WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Seleccionar Plantilla</Label>
                <Select value={selectedWsTemplateId} onValueChange={setSelectedWsTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {wsTemplates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {dynamicKeys.length > 0 && (
                <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-dashed">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Datos Requeridos por la Plantilla</p>
                  <div className="grid grid-cols-1 gap-4">
                    {dynamicKeys.map(key => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-bold">{key}</Label>
                        <Input value={dynamicValues[key] || ""} onChange={(e) => setDynamicValues({...dynamicValues, [key]: e.target.value})} className="bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsWsDialogOpen(false)}>Cerrar</Button>
              <Button 
                onClick={handleSendWs} 
                disabled={!selectedWsTemplateId || dynamicKeys.some(k => !dynamicValues[k])} 
                className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                <Send className="mr-2 h-4 w-4" /> Abrir WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TransactionsContent />
    </Suspense>
  )
}
