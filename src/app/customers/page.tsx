"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
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
  Info, 
  Droplets, 
  Trash2, 
  Map, 
  History,
  FilterX,
  TrendingUp,
  Banknote,
  PlusCircle,
  RefreshCw,
  Calculator,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBalance, setFilterBalance] = useState("all") 
  const [filterComodato, setFilterComodato] = useState("all")
  const [filterReposicion, setFilterReposicion] = useState("all")
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const { data: customers, isLoading } = useCollection(clientsQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  
  // Autocomplete Address State
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [showNoResults, setShowNoResults] = useState(false)

  // SOLUCIÓN TÉCNICA: Observador de mutaciones para forzar desbloqueo del puntero
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen]);

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
      enComodato: false
    },
    esClienteReposicion: true,
    saldoActual: 0,
    saldoUSD: 0,
    fechaUltimaReposicion: null
  }

  const [formData, setFormData] = useState(defaultFormData)

  const handleAddressSearch = async (val: string) => {
    setFormData({ ...formData, direccion: val })
    setShowNoResults(false)
    if (val.length > 4) {
      setIsSearchingAddress(true)
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5&lang=es`)
        const data = await res.json()
        const features = data.features || []
        setAddressSuggestions(features)
        if (features.length === 0) setShowNoResults(true)
      } catch (e) {
        console.error("Error fetching address:", e)
      } finally {
        setIsSearchingAddress(false)
      }
    } else {
      setAddressSuggestions([])
    }
  }

  const selectAddress = (feature: any) => {
    const p = feature.properties
    const street = p.name || ""
    const num = p.housenumber ? ` ${p.housenumber}` : ""
    const city = p.city || p.town || p.village || ""
    const state = p.state || ""
    
    setFormData({
      ...formData,
      direccion: `${street}${num}`,
      localidad: city,
      provincia: state
    })
    setAddressSuggestions([])
    setShowNoResults(false)
  }

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    return customers.filter((c: any) => {
      const searchMatch = `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.cuit_dni && c.cuit_dni.includes(searchTerm))
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

      return true
    })
  }, [customers, searchTerm, filterBalance, filterComodato, filterReposicion])

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
  }

  const handleOpenDialog = (customer?: any) => {
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
    setAddressSuggestions([])
    setShowNoResults(false)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
      deleteDocumentNonBlocking(doc(db, 'clients', id))
      toast({ title: "Cliente eliminado" })
    }
  }

  const handleOpenMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Argentina`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline">Clientes</h1>
            <p className="text-muted-foreground">Gestión de perfiles y cuentas corrientes.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-12 px-6 shadow-lg shadow-primary/20 font-bold">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Cliente
          </Button>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Buscar por nombre, apellido o CUIT/DNI..." 
                className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="glass-card bg-primary/5 border-l-4 border-l-primary overflow-hidden relative">
              <Calculator className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-primary/10 -rotate-12" />
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Filtrado ARS</p>
                  <h3 className={cn(
                    "text-xl font-black mt-1",
                    filteredTotals.ars < 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    ${filteredTotals.ars.toLocaleString('es-AR')}
                  </h3>
                </div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">Pesos Argentinos</div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-emerald-50/50 border-l-4 border-l-emerald-500 overflow-hidden relative">
              <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-emerald-500/10 -rotate-12" />
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total Filtrado USD</p>
                  <h3 className={cn(
                    "text-xl font-black mt-1",
                    filteredTotals.usd < 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    u$s {filteredTotals.usd.toLocaleString('es-AR')}
                  </h3>
                </div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">Dólares Estadounidenses</div>
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
            <Button variant="link" onClick={resetFilters} className="mt-2 text-primary">Restablecer filtros</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredCustomers.map((customer: any) => (
              <Card 
                key={customer.id} 
                className="glass-card hover:shadow-md transition-all cursor-pointer group relative overflow-hidden" 
                onClick={() => handleOpenDialog(customer)}
              >
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  customer.equipoInstalado?.enComodato ? "bg-amber-500" : "bg-primary"
                )} />
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/10">
                      <AvatarFallback className="bg-primary/5 text-primary font-bold text-xl uppercase">
                        {customer.nombre?.[0]}{customer.apellido?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-bold truncate">{customer.apellido}, {customer.nombre}</h3>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant={customer.esClienteReposicion ? "default" : "secondary"} className="text-[10px] font-bold">
                              {customer.esClienteReposicion ? 'REPOSICIÓN' : 'OCASIONAL'}
                            </Badge>
                            {customer.equipoInstalado?.enComodato && (
                              <Badge variant="outline" className="text-[10px] font-bold border-amber-500 text-amber-600 bg-amber-50">
                                COMODATO
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-1 justify-end",
                            (customer.saldoActual || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            <Banknote className="h-3 w-3" /> ARS: ${(customer.saldoActual || 0).toLocaleString('es-AR')}
                          </div>
                          <div className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-1 justify-end",
                            (customer.saldoUSD || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            <TrendingUp className="h-3 w-3" /> USD: u$s {(customer.saldoUSD || 0).toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                          <span className="truncate">{customer.direccion}, {customer.localidad}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 gap-2 font-bold"
                            onClick={(e) => { e.stopPropagation(); handleOpenMaps(customer.direccion, customer.localidad); }}
                          >
                            <Map className="h-3 w-3" /> Mapa
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`tel:${customer.telefono}`}>
                              <PhoneCall className="h-3 w-3" /> Llamar
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/30" 
                            asChild 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/transactions?clientId=${customer.id}`}>
                              <History className="h-3 w-3" /> Historial
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 font-bold bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" 
                            asChild 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/transactions?clientId=${customer.id}&mode=new`}>
                              <PlusCircle className="h-3 w-3" /> Operación
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDelete(customer.id, e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={(o) => {
        setIsDialogOpen(o);
        if(!o) setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {editingCustomer ? 'Perfil de Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" className="font-bold"><Info className="h-4 w-4 mr-2" /> General</TabsTrigger>
              <TabsTrigger value="address" className="font-bold"><MapPin className="h-4 w-4 mr-2" /> Ubicación</TabsTrigger>
              <TabsTrigger value="equipment" className="font-bold"><Droplets className="h-4 w-4 mr-2" /> Equipo</TabsTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-bold"><Banknote className="h-3 w-3 text-primary" /> Saldo ARS ($)</Label>
                  <Input type="number" value={formData.saldoActual} onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} className="bg-muted/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-bold"><TrendingUp className="h-3 w-3 text-emerald-600" /> Saldo USD (u$s)</Label>
                  <Input type="number" value={formData.saldoUSD} onChange={(e) => setFormData({...formData, saldoUSD: Number(e.target.value)})} className="bg-muted/10 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="font-bold">Cliente de Reposición</Label>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Seguimiento de cloro habilitado</p>
                  </div>
                  <Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 border-amber-200">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-amber-700">Equipo en Comodato</Label>
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest font-black">Propiedad de la empresa</p>
                  </div>
                  <Switch 
                    checked={formData.equipoInstalado.enComodato} 
                    onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 py-4 relative">
              <div className="space-y-2 relative">
                <Label className="flex items-center gap-2">Dirección (Escribir para autocompletar)</Label>
                <div className="relative">
                  <Input 
                    value={formData.direccion} 
                    onChange={(e) => handleAddressSearch(e.target.value)} 
                    placeholder="Av. Principal 123" 
                    className="pr-10"
                  />
                  {isSearchingAddress && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Sugerencias de dirección con mayor visibilidad */}
                {(addressSuggestions.length > 0 || showNoResults) && (
                  <Card className="absolute z-[100] w-full mt-1 bg-white shadow-2xl border-2 border-primary/20 max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2">
                    <CardContent className="p-0">
                      {showNoResults ? (
                        <div className="p-4 text-center text-sm text-muted-foreground italic">No se encontraron resultados</div>
                      ) : (
                        addressSuggestions.map((s, i) => (
                          <div 
                            key={i} 
                            className="p-3 hover:bg-primary/10 cursor-pointer text-sm border-b last:border-0 transition-colors flex items-start gap-3"
                            onClick={() => selectAddress(s)}
                          >
                            <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <div>
                              <p className="font-bold text-primary">{s.properties.name} {s.properties.housenumber || ""}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {s.properties.city || s.properties.town || ""}, {s.properties.state || ""}, {s.properties.country || ""}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
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
                <Label>Observaciones Internas</Label>
                <Textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Detalles sobre el acceso, perros, etc..." className="min-h-[100px]" />
              </div>
            </TabsContent>

            <TabsContent value="equipment" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo del Dosificador</Label>
                  <Input value={formData.equipoInstalado.modeloEquipo} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, modeloEquipo: e.target.value}})} placeholder="Ej: Dosimat G4" />
                </div>
                <div className="space-y-2">
                  <Label>Volumen de Piscina (Litros)</Label>
                  <Input type="number" value={formData.equipoInstalado.volumen} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, volumen: Number(e.target.value)}})} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 border-amber-200 mt-6">
                <div className="space-y-0.5">
                  <Label className="font-bold text-amber-700">Equipo en Comodato</Label>
                  <p className="text-[10px] text-amber-600 uppercase tracking-widest font-black">Propiedad de la empresa</p>
                </div>
                <Switch 
                  checked={formData.equipoInstalado.enComodato} 
                  onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} 
                />
              </div>
              <div className="space-y-2 mt-4">
                <Label>Medidas y Dosis</Label>
                <Input value={formData.equipoInstalado.medidasPileta} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, medidasPileta: e.target.value}})} placeholder="Ej: 8x4 metros" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
            }} className="font-bold">Cancelar</Button>
            <Button onClick={handleSave} className="px-8 font-bold"><CheckCircle2 className="mr-2 h-4 w-4" /> Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  )
}
