
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Droplets, 
  Wrench, 
  ShoppingCart, 
  ArrowRightLeft,
  Trash2,
  AlertCircle,
  CreditCard,
  Banknote,
  ClipboardCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'ARS' | 'USD';
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
}

interface SelectedItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  currency: 'ARS' | 'USD';
}

const STORAGE_KEYS = {
  CATALOG: 'dosimat_pro_v1_catalog',
  CUSTOMERS: 'dosimat_pro_v1_customers',
  ACCOUNTS: 'dosimat_pro_v1_accounts'
}

export default function TransactionsPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("sale")
  
  // Data from other modules
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  // Transaction state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [currentAddItem, setCurrentAddItem] = useState<string>("")

  // Destino por moneda: { ARS: accountId, USD: accountId }
  const [destinationAccounts, setDestinationAccounts] = useState<Record<string, string>>({
    ARS: "",
    USD: ""
  })

  useEffect(() => {
    const savedCatalog = localStorage.getItem(STORAGE_KEYS.CATALOG)
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
    const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS)

    if (savedCatalog) setCatalog(JSON.parse(savedCatalog))
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers))
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts))
    
    setMounted(true)
  }, [])

  // Filtrar catálogo según la pestaña activa
  const filteredCatalog = useMemo(() => {
    if (activeTab === "sale") return catalog;
    if (activeTab === "refill") return catalog.filter(i => i.category === "Químicos");
    if (activeTab === "service") return catalog.filter(i => i.category === "Servicios" || i.category === "Equipos" || i.category === "Repuestos");
    if (activeTab === "transfer") return catalog; 
    return catalog;
  }, [catalog, activeTab]);

  const tabInfo = useMemo(() => {
    switch (activeTab) {
      case "refill": return { title: "Nueva Reposición", desc: "Registro de entrega de químicos.", icon: Droplets };
      case "service": return { title: "Servicio Técnico", desc: "Mantenimiento o reparación de equipos.", icon: Wrench };
      case "transfer": return { title: "Movimiento Interno", desc: "Uso interno de materiales o ajustes.", icon: ArrowRightLeft };
      default: return { title: "Nueva Venta", desc: "Venta directa de productos o servicios.", icon: ShoppingCart };
    }
  }, [activeTab]);

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
        price: item.price,
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

  const totals = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      acc[item.currency] = (acc[item.currency] || 0) + (item.price * item.qty)
      return acc
    }, { ARS: 0, USD: 0 } as Record<string, number>)
  }, [selectedItems])

  const currenciesInCart = useMemo(() => {
    const set = new Set(selectedItems.map(i => i.currency));
    return Array.from(set);
  }, [selectedItems]);

  const handleSaveTransaction = () => {
    if (!selectedCustomerId || selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Completa el cliente y selecciona al menos un ítem.",
        variant: "destructive"
      })
      return
    }

    const missingAccounts = currenciesInCart.filter(curr => !destinationAccounts[curr]);
    if (missingAccounts.length > 0) {
      toast({
        title: "Atención",
        description: `Selecciona una cuenta de destino para: ${missingAccounts.join(', ')}`,
        variant: "destructive"
      })
      return;
    }

    toast({
      title: "Transacción Registrada",
      description: `Se ha procesado la ${tabInfo.title.toLowerCase()} exitosamente.`,
    })
    
    // Reset form
    setSelectedCustomerId("")
    setDestinationAccounts({ ARS: "", USD: "" })
    setSelectedItems([])
  }

  if (!mounted) return null

  const TabIcon = tabInfo.icon;

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-headline font-bold text-primary">Operaciones</h1>
          <p className="text-muted-foreground">Gestión integrada de ventas, servicios y reposiciones.</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-white border mb-6">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <ShoppingCart className="h-4 w-4 mr-2" /> Venta
            </TabsTrigger>
            <TabsTrigger value="refill" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <Droplets className="h-4 w-4 mr-2" /> Reposición
            </TabsTrigger>
            <TabsTrigger value="service" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <Wrench className="h-4 w-4 mr-2" /> Técnico
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-primary data-[state=active]:text-white py-3">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Interno
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 glass-card border-t-4 border-t-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <TabIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{tabInfo.title}</CardTitle>
                    <CardDescription>{tabInfo.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seleccionar Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Buscar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Operación</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Agregar del Catálogo ({activeTab === 'sale' ? 'Todo' : activeTab})
                    </Label>
                    <Select value={currentAddItem} onValueChange={handleAddItem}>
                      <SelectTrigger className="bg-white border-primary/20 hover:border-primary transition-colors">
                        <SelectValue placeholder="Elegir producto o servicio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCatalog.length > 0 ? (
                          filteredCatalog.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              [{item.category}] {item.name} - {item.currency === 'USD' ? 'u$s' : '$'}{item.price.toLocaleString('es-AR')}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No hay ítems para esta categoría</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold uppercase">Concepto</TableHead>
                          <TableHead className="text-center w-20 text-[10px] font-bold uppercase">Cant.</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase">Precio Un.</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2 opacity-40">
                                <ClipboardCheck className="h-10 w-10" />
                                <p className="text-sm font-medium">Usa el catálogo para agregar ítems al comprobante</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedItems.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/10">
                              <TableCell className="font-medium text-xs md:text-sm py-4">
                                {item.name}
                                <div className="text-[9px] text-primary font-bold uppercase mt-0.5">{item.currency}</div>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8 text-center text-xs" 
                                  value={item.qty} 
                                  onChange={(e) => handleUpdateItem(index, 'qty', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end">
                                  <span className="text-[10px] mr-1 text-muted-foreground">{item.currency === 'USD' ? 'u$s' : '$'}</span>
                                  <Input 
                                    type="number" 
                                    className="h-8 text-right font-bold text-xs w-24" 
                                    value={item.price} 
                                    onChange={(e) => handleUpdateItem(index, 'price', Number(e.target.value))}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-xs">
                                {item.currency === 'USD' ? 'u$s' : '$'}
                                {(item.price * item.qty).toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
              <Card className="glass-card border-primary/20 shadow-xl overflow-hidden flex flex-col">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Resumen de Liquidación
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 flex-1">
                  {/* Totales */}
                  <div className="space-y-3">
                    <div className={`p-4 rounded-xl border transition-all ${totals.ARS > 0 ? 'bg-primary/5 border-primary/20 shadow-inner' : 'bg-muted/10 opacity-40'}`}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Pesos (ARS)</p>
                      <p className="text-3xl font-black text-primary">${totals.ARS.toLocaleString('es-AR')}</p>
                    </div>
                    <div className={`p-4 rounded-xl border transition-all ${totals.USD > 0 ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-muted/10 opacity-40'}`}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Dólares (USD)</p>
                      <p className="text-3xl font-black text-emerald-600">u$s {totals.USD.toLocaleString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Asignación de Cuentas */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <div className="h-1 w-4 bg-primary rounded-full" /> 
                      Destino de Fondos
                    </h4>
                    
                    {currenciesInCart.includes('ARS') && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <Label className="text-[10px] font-bold flex items-center gap-1 text-primary">
                          <Banknote className="h-3 w-3" /> CAJA/BANCO PARA PESOS
                        </Label>
                        <Select 
                          value={destinationAccounts.ARS} 
                          onValueChange={(v) => setDestinationAccounts(prev => ({...prev, ARS: v}))}
                        >
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Elegir cuenta ARS" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.filter(a => a.currency === 'ARS').map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {currenciesInCart.includes('USD') && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <Label className="text-[10px] font-bold flex items-center gap-1 text-emerald-600">
                          <CreditCard className="h-3 w-3" /> CAJA PARA DÓLARES
                        </Label>
                        <Select 
                          value={destinationAccounts.USD} 
                          onValueChange={(v) => setDestinationAccounts(prev => ({...prev, USD: v}))}
                        >
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Elegir cuenta USD" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.filter(a => a.currency === 'USD').map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {currenciesInCart.length === 0 && (
                      <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
                        <p className="text-[10px] font-medium text-muted-foreground">
                          Agrega ítems para habilitar la liquidación
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="p-4 bg-muted/30 border-t">
                  <Button 
                    className="w-full h-14 text-lg font-black shadow-xl rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" 
                    onClick={handleSaveTransaction}
                    disabled={selectedItems.length === 0 || !selectedCustomerId}
                  >
                    CONFIRMAR Y COBRAR
                  </Button>
                </div>
              </Card>

              <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800">Control de Precios</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed italic">
                    Cualquier cambio de precio realizado en la tabla superior se aplicará solo a este comprobante. El catálogo permanecerá intacto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  )
}
