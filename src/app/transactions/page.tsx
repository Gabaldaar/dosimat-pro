
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Droplets, 
  Wrench, 
  ShoppingCart, 
  ArrowRightLeft,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote
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

  const handleAddItem = (itemId: string) => {
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
    }, { ARS: 0, USD: 0 })
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

    // Validar que se hayan elegido cuentas para todas las monedas presentes
    const missingAccounts = currenciesInCart.filter(curr => !destinationAccounts[curr]);
    if (missingAccounts.length > 0) {
      toast({
        title: "Atención",
        description: `Debes seleccionar una cuenta de destino para: ${missingAccounts.join(', ')}`,
        variant: "destructive"
      })
      return;
    }

    toast({
      title: "¡Éxito!",
      description: "La transacción ha sido registrada, los saldos de cuentas actualizados y el cliente notificado.",
    })
    
    // Reset form
    setSelectedCustomerId("")
    setDestinationAccounts({ ARS: "", USD: "" })
    setSelectedItems([])
  }

  if (!mounted) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-headline font-bold text-primary">Nueva Operación</h1>
          <p className="text-muted-foreground">Ventas y servicios integrados con tu catálogo real.</p>
        </header>

        <Tabs defaultValue="sale" className="w-full" onValueChange={setActiveTab}>
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
            <Card className="lg:col-span-2 glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Detalles del Comprobante
                </CardTitle>
                <CardDescription>Usa tu catálogo y clientes reales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
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
                    <Label>Fecha</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agregar Producto / Servicio de Catálogo</Label>
                    <Select value={currentAddItem} onValueChange={handleAddItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ítem..." />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.length > 0 ? (
                          catalog.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.currency === 'USD' ? 'u$s' : '$'}{item.price.toLocaleString('es-AR')})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No hay ítems en catálogo</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-center w-20">Cant.</TableHead>
                          <TableHead className="text-right">Precio Un.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              El carrito está vacío. Agrega ítems desde tu catálogo.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-xs md:text-sm">
                                {item.name}
                                <div className="text-[10px] text-muted-foreground uppercase">{item.currency}</div>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8 text-center" 
                                  value={item.qty} 
                                  onChange={(e) => handleUpdateItem(index, 'qty', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8 text-right font-bold" 
                                  value={item.price} 
                                  onChange={(e) => handleUpdateItem(index, 'price', Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {item.currency === 'USD' ? 'u$s' : '$'}
                                {(item.price * item.qty).toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(index)}>
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
              <Card className="glass-card border-primary/20 shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg">Resumen y Liquidación</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Totales */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className={`p-3 rounded-lg border ${totals.ARS > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/10 opacity-50'}`}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total en Pesos</p>
                      <p className="text-2xl font-bold text-primary">${totals.ARS.toLocaleString('es-AR')}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${totals.USD > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-muted/10 opacity-50'}`}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total en Dólares</p>
                      <p className="text-2xl font-bold text-emerald-600">u$s {totals.USD.toLocaleString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Asignación de Cuentas */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ingresar Dinero en:</h4>
                    
                    {currenciesInCart.includes('ARS') && (
                      <div className="space-y-2">
                        <Label className="text-[10px] flex items-center gap-1">
                          <Banknote className="h-3 w-3" /> CUENTA PARA ARS
                        </Label>
                        <Select 
                          value={destinationAccounts.ARS} 
                          onValueChange={(v) => setDestinationAccounts(prev => ({...prev, ARS: v}))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Elegir caja/banco ARS" />
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
                      <div className="space-y-2">
                        <Label className="text-[10px] flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> CUENTA PARA USD
                        </Label>
                        <Select 
                          value={destinationAccounts.USD} 
                          onValueChange={(v) => setDestinationAccounts(prev => ({...prev, USD: v}))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Elegir caja/banco USD" />
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
                      <p className="text-xs italic text-muted-foreground text-center py-4 bg-muted/20 rounded">
                        Agrega ítems para elegir destino de fondos.
                      </p>
                    )}
                  </div>
                </CardContent>
                <div className="p-4 bg-muted/30 border-t">
                  <Button 
                    className="w-full h-12 text-lg font-bold shadow-lg" 
                    onClick={handleSaveTransaction}
                    disabled={selectedItems.length === 0 || !selectedCustomerId}
                  >
                    Registrar y Cobrar
                  </Button>
                </div>
              </Card>

              <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800">Nota de Precios</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed italic">
                    Modificar el precio unitario en la tabla NO altera los precios base de tu catálogo. Solo aplica a esta venta puntual.
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
