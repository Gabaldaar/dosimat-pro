
"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Mail, 
  Waves, 
  ChevronRight,
  Filter,
  Save,
  Wrench,
  Info,
  History,
  ClipboardList,
  User as UserIcon
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Customer {
  id: string;
  apellido: string;
  nombre: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  pais: string;
  mail: string;
  cuitDni: string;
  observaciones: string;
  medidasPileta: string;
  volumen: number;
  dosisCloro: string;
  cantidadBidones: number;
  modeloEquipo: string;
  enComodato: boolean;
  esClienteReposicion: boolean;
  saldoActual: number;
  fechaUltimaReposicion: string;
  creadoPorId: string;
  fechaCreacion: string;
}

const initialCustomers: Customer[] = [
  { 
    id: "1", 
    apellido: "Rodríguez",
    nombre: "Carlos", 
    telefono: "+54 9 11 5555-1234",
    direccion: "B° Privado El Golf, Lote 45", 
    localidad: "Nordelta",
    provincia: "Buenos Aires",
    pais: "Argentina",
    mail: "carlos.r@gmail.com",
    cuitDni: "20-30444555-2",
    observaciones: "Entrar por puerta lateral. Perro amigable.",
    medidasPileta: "8x4x1.5m",
    volumen: 48,
    dosisCloro: "5L semanales",
    cantidadBidones: 2,
    modeloEquipo: "Vulcano VC-30",
    enComodato: false,
    esClienteReposicion: true,
    saldoActual: 0,
    fechaUltimaReposicion: "2024-05-15T10:00:00Z",
    creadoPorId: "admin1",
    fechaCreacion: "2024-01-10T08:30:00Z"
  },
  { 
    id: "2", 
    apellido: "Martínez",
    nombre: "Ana", 
    telefono: "+54 9 11 4444-5678",
    direccion: "Calle Los Sauces 1240", 
    localidad: "Pilar",
    provincia: "Buenos Aires",
    pais: "Argentina",
    mail: "ana.m@outlook.com",
    cuitDni: "27-25666777-1",
    observaciones: "Cliente solo reposición, no requiere limpieza.",
    medidasPileta: "6x3x1.2m",
    volumen: 22,
    dosisCloro: "3L semanales",
    cantidadBidones: 1,
    modeloEquipo: "Filtrado Portátil",
    enComodato: true,
    esClienteReposicion: true,
    saldoActual: 12500,
    fechaUltimaReposicion: "2024-05-10T14:00:00Z",
    creadoPorId: "admin1",
    fechaCreacion: "2024-02-15T11:15:00Z"
  }
]

export default function CustomersPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Form State
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'creadoPorId' | 'fechaCreacion'>>({
    apellido: "",
    nombre: "",
    telefono: "",
    direccion: "",
    localidad: "Nordelta",
    provincia: "Buenos Aires",
    pais: "Argentina",
    mail: "",
    cuitDni: "",
    observaciones: "",
    medidasPileta: "",
    volumen: 0,
    dosisCloro: "",
    cantidadBidones: 0,
    modeloEquipo: "",
    enComodato: false,
    esClienteReposicion: true,
    saldoActual: 0,
    fechaUltimaReposicion: new Date().toISOString()
  })

  const filteredCustomers = customers.filter(c => 
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm) ||
    c.cuitDni.includes(searchTerm)
  )

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        apellido: customer.apellido,
        nombre: customer.nombre,
        telefono: customer.telefono,
        direccion: customer.direccion,
        localidad: customer.localidad,
        provincia: customer.provincia,
        pais: customer.pais,
        mail: customer.mail,
        cuitDni: customer.cuitDni,
        observaciones: customer.observaciones,
        medidasPileta: customer.medidasPileta,
        volumen: customer.volumen,
        dosisCloro: customer.dosisCloro,
        cantidadBidones: customer.cantidadBidones,
        modeloEquipo: customer.modeloEquipo,
        enComodato: customer.enComodato,
        esClienteReposicion: customer.esClienteReposicion,
        saldoActual: customer.saldoActual,
        fechaUltimaReposicion: customer.fechaUltimaReposicion
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        apellido: "",
        nombre: "",
        telefono: "",
        direccion: "",
        localidad: "Nordelta",
        provincia: "Buenos Aires",
        pais: "Argentina",
        mail: "",
        cuitDni: "",
        observaciones: "",
        medidasPileta: "",
        volumen: 0,
        dosisCloro: "",
        cantidadBidones: 0,
        modeloEquipo: "",
        enComodato: false,
        esClienteReposicion: true,
        saldoActual: 0,
        fechaUltimaReposicion: new Date().toISOString()
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveCustomer = () => {
    if (!formData.nombre || !formData.apellido) {
      toast({ title: "Error", description: "Nombre y Apellido son obligatorios", variant: "destructive" })
      return
    }

    if (editingCustomer) {
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData } 
          : c
      ))
      toast({ title: "Cliente actualizado", description: "Los cambios se guardaron correctamente." })
    } else {
      const newCustomer: Customer = {
        ...formData,
        id: (customers.length + 1).toString(),
        creadoPorId: "current-user-id",
        fechaCreacion: new Date().toISOString()
      }
      setCustomers([...customers, newCustomer])
      toast({ title: "Cliente creado", description: "El cliente ha sido agregado al sistema." })
    }
    setIsDialogOpen(false)
  }

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation()
    window.location.href = `mailto:${email}`
  }

  const handleMap = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation()
    const fullAddress = `${customer.direccion}, ${customer.localidad}, ${customer.provincia}, ${customer.pais}`
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, '_blank')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-headline font-bold text-primary">Clientes</h1>
          <Button className="rounded-full shadow-lg" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
          </Button>
        </header>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, CUIT, dirección..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCustomers.map((customer) => (
            <Card 
              key={customer.id} 
              className="glass-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden group border-transparent hover:border-primary/20"
              onClick={() => handleOpenDialog(customer)}
            >
              <CardContent className="p-0">
                <div className="p-5 flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold text-lg">
                      {customer.nombre[0]}{customer.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                        {customer.apellido}, {customer.nombre}
                      </h3>
                      {customer.saldoActual > 0 && (
                        <Badge variant="destructive" className="ml-2 whitespace-nowrap animate-pulse">
                          Deuda: ${mounted ? customer.saldoActual.toLocaleString() : customer.saldoActual}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 shrink-0" /> {customer.direccion}, {customer.localidad}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                        <Waves className="h-3 w-3 mr-1" /> {customer.medidasPileta || 'Sin medidas'}
                      </Badge>
                      {customer.esClienteReposicion && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">
                          <History className="h-3 w-3 mr-1" /> Reposición activa
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="bg-accent/10 grid grid-cols-3 border-t">
                  <button 
                    onClick={(e) => handleCall(e, customer.telefono)}
                    className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold">Llamar</span>
                  </button>
                  <button 
                    onClick={(e) => handleMap(e, customer)}
                    className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-bold">Mapa</span>
                  </button>
                  <button 
                    onClick={(e) => handleEmail(e, customer.mail)}
                    className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-bold">Email</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground">No se encontraron clientes que coincidan con la búsqueda.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingCustomer ? 'Ficha de Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              Completa los datos detallados del cliente y los parámetros técnicos de su piscina.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="personal"><UserIcon className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Personal</span></TabsTrigger>
                <TabsTrigger value="location"><MapPin className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Ubicación</span></TabsTrigger>
                <TabsTrigger value="pool"><Waves className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Piscina</span></TabsTrigger>
                <TabsTrigger value="tech"><Wrench className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Técnico</span></TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 pb-6">
              <TabsContent value="personal" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input id="apellido" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail">Email</Label>
                  <Input id="mail" type="email" value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cuitDni">CUIT/DNI</Label>
                    <Input id="cuitDni" value={formData.cuitDni} onChange={(e) => setFormData({...formData, cuitDni: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saldo">Saldo Actual ($)</Label>
                  <Input id="saldo" type="number" value={formData.saldoActual} onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} />
                </div>
              </TabsContent>

              <TabsContent value="location" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="localidad">Localidad</Label>
                    <Input id="localidad" value={formData.localidad} onChange={(e) => setFormData({...formData, localidad: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input id="provincia" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input id="pais" value={formData.pais} onChange={(e) => setFormData({...formData, pais: e.target.value})} />
                </div>
              </TabsContent>

              <TabsContent value="pool" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medidas">Medidas (ej: 8x4x1.5)</Label>
                    <Input id="medidas" value={formData.medidasPileta} onChange={(e) => setFormData({...formData, medidasPileta: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volumen">Volumen (m³)</Label>
                    <Input id="volumen" type="number" value={formData.volumen} onChange={(e) => setFormData({...formData, volumen: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dosis">Dosis Cloro Recom.</Label>
                    <Input id="dosis" placeholder="Ej: 5L" value={formData.dosisCloro} onChange={(e) => setFormData({...formData, dosisCloro: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bidones">Cantidad Bidones</Label>
                    <Input id="bidones" type="number" value={formData.cantidadBidones} onChange={(e) => setFormData({...formData, cantidadBidones: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>Cliente Reposición</Label>
                    <p className="text-xs text-muted-foreground">Activar recordatorios de cloro</p>
                  </div>
                  <Switch checked={formData.esClienteReposicion} onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} />
                </div>
              </TabsContent>

              <TabsContent value="tech" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="equipo">Modelo de Equipo</Label>
                  <Input id="equipo" placeholder="Ej: Bomba Vulcano 3/4 HP" value={formData.modeloEquipo} onChange={(e) => setFormData({...formData, modeloEquipo: e.target.value})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label>En Comodato</Label>
                    <p className="text-xs text-muted-foreground">Equipo de la empresa en préstamo</p>
                  </div>
                  <Switch checked={formData.enComodato} onCheckedChange={(v) => setFormData({...formData, enComodato: v})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observaciones / Notas</Label>
                  <Textarea id="obs" className="min-h-[100px]" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} />
                </div>
                {editingCustomer && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Auditoría</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Creado: {new Date(editingCustomer.fechaCreacion).toLocaleDateString()}</span>
                      <span>Últ. Reposición: {new Date(editingCustomer.fechaUltimaReposicion).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
            <Button onClick={handleSaveCustomer} className="w-full">
              <Save className="mr-2 h-4 w-4" /> {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
