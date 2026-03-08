
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Droplets, 
  Wrench, 
  ShoppingCart, 
  RefreshCw,
  Trash2,
  AlertCircle,
  CreditCard,
  Banknote,
  ClipboardCheck,
  History,
  Search,
  Calendar,
  Filter,
  User,
  ArrowRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'ARS' | 'USD';
  stock: number | null;
}

interface Customer {
  id: string;
  nombre: string;
  apellido: string;
}

interface Account {
  id: string;
  name: string;
  currency: 'ARS' | 'USD';
  balance: number;
}

interface SelectedItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  currency: 'ARS' | 'USD';
}

interface Transaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: 'sale' | 'refill' | 'service' | 'adjustment';
  items: SelectedItem[];
  totals: Record<string, number>;
  destinationAccounts: Record<string, string>;
  createdAt: string;
}

const STORAGE_KEYS = {
  CATALOG: 'dosimat_pro_v1_catalog',
  CUSTOMERS: 'dosimat_pro_v1_customers',
  ACCOUNTS: 'dosimat_pro_v1_accounts',
  TRANSACTIONS: 'dosimat_pro_v1_transactions'
}

export default function TransactionsPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [mainView, setMainView] = useState("register")
  const [activeTab, setActiveTab] = useState("sale")
  
  // Data from other modules
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Registration state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [currentAddItem, setCurrentAddItem] = useState<string>("")
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({
    ARS: "",
    USD: ""
  })

  // History filters
  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterAccount, setFilterAccount] = useState("all")

  // Load Initial Data
  useEffect(() => {
    const savedCatalog = localStorage.getItem(STORAGE_KEYS.CATALOG)
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
    const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)
    const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)

    if (savedCatalog) setCatalog(JSON.parse(savedCatalog))
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers))
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts))
    if (savedTransactions) {
      const parsed = JSON.parse(savedTransactions)
      if (Array.isArray(parsed)) setTransactions(parsed)
    }
    
    setMounted(true)
    setIsDataLoaded(true)
  }, [])

  // Persistent Save Effect (Only if data is loaded)
  useEffect(() => {
    if (mounted && isDataLoaded) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts))
    }
  }, [transactions, accounts, mounted, isDataLoaded])

  const handleAddItem = (itemId: string) => {
    if (!itemId || itemId === "none") return;
    const item = catalog.find(i => i.id === itemId)
    if (!item) return

    setSelectedItems(prev => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        qty: 1,
        price: activeTab === 'adjustment' ? 0 : item.price,
        currency: item.currency
      }
    ])
    setCurrentAddItem("")
  }

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: keyof SelectedItem, value: any) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const cartTotals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      acc[item.currency] = (acc[item.currency] || 0) + (item.price * item.qty)
      return acc
    }, { ARS: 0, USD: 0 } as Record<string, number>)
  }, [selectedItems])

  const handleSaveTransaction = () => {
    if (!selectedCustomerId || selectedItems.length === 0) {
      toast({ title: "Error", description: "Completa el cliente y selecciona al menos un ítem.", variant: "destructive" })
      return
    }

    // Validar cuentas si hay montos
    if (cartTotals.ARS > 0 && !destinationAccounts.ARS) {
      toast({ title: "Error", description: "Selecciona una cuenta para los Pesos.", variant: "destructive" })
      return
    }
    if (cartTotals.USD > 0 && !destinationAccounts.USD) {
      toast({ title: "Error", description: "Selecciona una cuenta para los Dólares.", variant: "destructive" })
      return
    }

    const customer = customers.find(c => c.id === selectedCustomerId)
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      customerId: selectedCustomerId,
      customerName: customer ? `${customer.apellido}, ${customer.nombre}` : "Desconocido",
      type: activeTab as any,
      items: [...selectedItems],
      totals: { ...cartTotals },
      destinationAccounts: { ...destinationAccounts },
      createdAt: new Date().toISOString()
    }

    // 1. Actualizar balances de las cuentas financieras
    setAccounts(prev => prev.map(acc => {
      let newBalance = acc.balance
      if (acc.id === destinationAccounts.ARS) newBalance += cartTotals.ARS
      if (acc.id === destinationAccounts.USD) newBalance += cartTotals.USD
      return { ...acc, balance: newBalance }
    }))

    // 2. Guardar transacción en el historial
    setTransactions(prev => [newTx, ...prev])
    
    toast({ title: "Operación Registrada", description: "Se ha guardado y actualizado el saldo de cuentas." })
    
    // Reset
    setSelectedCustomerId("")
    setSelectedItems([])
    setDestinationAccounts({ ARS: "", USD: "" })
    setMainView("history") 
  }

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchCustomer = filterCustomer === "all" || tx.customerId === filterCustomer
      const matchMonth = filterMonth === "all" || tx.date.startsWith(filterMonth)
      const matchAccount = filterAccount === "all" || Object.values(tx.destinationAccounts).includes(filterAccount)
      return matchCustomer && matchMonth && matchAccount
    })
  }, [transactions, filterCustomer, filterMonth, filterAccount])

  const historyTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      acc.ARS += tx.totals.ARS || 0
      acc.USD += tx.totals.USD || 0
      return acc
    }, { ARS: 0, USD: 0 })
  }, [filteredTransactions])

  const monthsAvailable = useMemo(() => {
    const months = transactions.map(tx => tx.date.substring(0, 7))
    return Array.from(new Set(months)).sort().reverse()
  }, [transactions])

  const filteredCatalog = useMemo(() => {
    if (activeTab === 'refill') return catalog.filter(i => i.category === 'Químicos')
    if (activeTab === 'service') return catalog.filter(i => i.category === 'Servicios' || i.category === 'Equipos')
    if (activeTab === 'adjustment') return catalog.filter(i => i.stock !== null)
    return catalog
  }, [catalog, activeTab])

  if (!mounted) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Operaciones</h1>
            <p className="text-muted-foreground">Gestión integrada y seguimiento histórico.</p>
          </div>
          <Tabs value={mainView} onValueChange={setMainView} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Nueva Operación</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        {mainView === "register" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItems([]); }} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-white border mb-6">
                <TabsTrigger value="sale" className="py-3"><ShoppingCart className="h-4 w-4 mr-2" /> Venta</TabsTrigger>
                <TabsTrigger value="refill" className="py-3"><Droplets className="h-4 w-4 mr-2" /> Reposición</TabsTrigger>
                <TabsTrigger value="service" className="py-3"><Wrench className="h-4 w-4 mr-2" /> Técnico</TabsTrigger>
                <TabsTrigger value="adjustment" className="py-3"><RefreshCw className="h-4 w-4 mr-2" /> Ajuste Stock</TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 glass-card">
                  <CardHeader>
                    <CardTitle className="text-xl capitalize">{activeTab === 'adjustment' ? 'Ajuste de Stock' : `Registro de ${activeTab}`}</CardTitle>
                    <CardDescription>Completa los datos de la operación</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Cliente / Responsable</Label>
                        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Agregar Items ({activeTab})</Label>
                        <Select value={currentAddItem} onValueChange={handleAddItem}>
                          <SelectTrigger className="bg-white border-primary/20">
                            <SelectValue placeholder="Elegir del catálogo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCatalog.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} - {item.currency === 'USD' ? 'u$s' : '$'}{item.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="text-[10px] font-bold uppercase">Concepto</TableHead>
                              <TableHead className="text-center w-20 text-[10px] font-bold uppercase">Cant.</TableHead>
                              <TableHead className="text-right text-[10px] font-bold uppercase">Precio</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItems.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Carrito vacío</TableCell></TableRow>
                            ) : (
                              selectedItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-sm font-medium">{item.name}</TableCell>
                                  <TableCell>
                                    <Input 
                                      type="number" 
                                      className="h-8 text-center" 
                                      value={item.qty} 
                                      onChange={(e) => handleUpdateItem(index, 'qty', Number(e.target.value))}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-xs text-muted-foreground">{item.currency}</span>
                                      <Input 
                                        type="number" 
                                        className="h-8 text-right font-bold w-24" 
                                        value={item.price} 
                                        onChange={(e) => handleUpdateItem(index, 'price', Number(e.target.value))}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="glass-card border-primary/30 shadow-lg">
                    <CardHeader className="bg-primary/5 pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" /> Resumen Liquidación
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-3">
                        {cartTotals.ARS > 0 && (
                          <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total ARS</p>
                            <p className="text-3xl font-black text-primary">${cartTotals.ARS.toLocaleString()}</p>
                            <div className="mt-3">
                              <Label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Cuenta de Cobro ARS</Label>
                              <Select value={destinationAccounts.ARS} onValueChange={(v) => setDestinationAccounts(p => ({...p, ARS: v}))}>
                                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                                <SelectContent>{accounts.filter(a => a.currency === 'ARS').map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {cartTotals.USD > 0 && (
                          <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total USD</p>
                            <p className="text-3xl font-black text-emerald-600">u$s {cartTotals.USD.toLocaleString()}</p>
                            <div className="mt-3">
                              <Label className="text-[9px] font-bold uppercase text-muted-foreground mb-1 block">Cuenta de Cobro USD</Label>
                              <Select value={destinationAccounts.USD} onValueChange={(v) => setDestinationAccounts(p => ({...p, USD: v}))}>
                                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                                <SelectContent>{accounts.filter(a => a.currency === 'USD').map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {activeTab === 'adjustment' && cartTotals.ARS === 0 && cartTotals.USD === 0 && selectedItems.length > 0 && (
                          <div className="p-4 rounded-xl border bg-orange-50 border-orange-200">
                            <p className="text-sm font-bold text-orange-700">Movimiento de Stock</p>
                            <p className="text-xs text-orange-600">Esta operación no genera cargos financieros.</p>
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full h-12 font-bold" 
                        onClick={handleSaveTransaction}
                        disabled={selectedItems.length === 0 || !selectedCustomerId}
                      >
                        CONFIRMAR Y GUARDAR
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <Label className="text-[10px] font-bold uppercase mb-2 block">Filtrar por Cliente</Label>
                  <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <Label className="text-[10px] font-bold uppercase mb-2 block">Filtrar por Mes</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el tiempo</SelectItem>
                      {monthsAvailable.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <Label className="text-[10px] font-bold uppercase mb-2 block">Filtrar por Cuenta</Label>
                  <Select value={filterAccount} onValueChange={setFilterAccount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las cuentas</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Listado Histórico</CardTitle>
                  <CardDescription>Resumen de movimientos según filtros</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Pesos</p>
                    <p className="text-xl font-black text-primary">${historyTotals.ARS.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Dólares</p>
                    <p className="text-xl font-black text-emerald-600">u$s {historyTotals.USD.toLocaleString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No hay transacciones que coincidan con los filtros</TableCell></TableRow>
                      ) : (
                        filteredTransactions.map(tx => (
                          <TableRow key={tx.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="text-xs font-bold">{tx.date}</TableCell>
                            <TableCell className="text-sm font-medium">{tx.customerName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                {tx.type === 'sale' ? 'Venta' : tx.type === 'refill' ? 'Reposición' : tx.type === 'service' ? 'Técnico' : 'Ajuste'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                                {tx.items.map(i => `${i.qty}x ${i.name}`).join(", ")}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                {tx.totals.ARS > 0 && <span className="font-bold text-primary">${tx.totals.ARS.toLocaleString()}</span>}
                                {tx.totals.USD > 0 && <span className="font-bold text-emerald-600">u$s {tx.totals.USD.toLocaleString()}</span>}
                                {tx.totals.ARS === 0 && tx.totals.USD === 0 && <span className="text-muted-foreground italic text-xs">Sin cargo</span>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
