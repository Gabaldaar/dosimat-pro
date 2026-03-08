
"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Plus, 
  MapPin, 
  ChevronRight, 
  Phone, 
  Mail, 
  User, 
  Info, 
  Droplets, 
  Trash2, 
  Map, 
  PhoneCall, 
  ExternalLink,
  Wallet,
  Box
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function CustomersPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  
  const clientsQuery = useMemoFirebase(() => collection(db, 'clients'), [db])
  const { data: customers, isLoading } = useCollection(clientsQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  
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
    fechaUltimaReposicion: null
  }

  const [formData, setFormData] = useState(defaultFormData)

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    return customers.filter((c: any) => 
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cuit_dni && c.cuit_dni.includes(searchTerm))
    )
  }, [customers, searchTerm])

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
            <h1 className="text-3xl font-bold text-primary font-headline">Maestro de Clientes</h1>
            <p className="text-muted-foreground">Gestión centralizada de perfiles y equipos instalados.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-12 px-6 shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Cliente
          </Button>
        </header>

        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, apellido o CUIT/DNI..." 
            className="pl-10 h-11 bg-white/50 backdrop-blur-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground animate-pulse">Cargando base de datos...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-muted/5">
            <User className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">Sin coincidencias</h3>
            <p className="text-muted-foreground">No hay clientes que coincidan con tu búsqueda.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredCustomers.map((customer: any) => (
              <Card 
                key={customer.id} 
                className="glass-card hover:shadow-md transition-all cursor-pointer group" 
                onClick={() => handleOpenDialog(customer)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/10">
                      <AvatarFallback className="bg-primary/5 text-primary font-bold text-xl">
                        {customer.nombre[0]}{customer.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-lg font-bold truncate">{customer.apellido}, {customer.nombre}</h3>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant={customer.esClienteReposicion ? "default" : "secondary"} className="text-[10px]">
                              {customer.esClienteReposicion ? 'REPOSICIÓN' : 'OCASIONAL'}
                            </Badge>
                            {customer.equipoInstalado?.enComodato && (
                              <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                                <Box className="h-2 w-2 mr-1" /> COMODATO
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "text-right font-bold text-sm px-2 py-1 rounded-lg border",
                          (customer.saldoActual || 0) < 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                          Saldo: ${(customer.saldoActual || 0).toLocaleString('es-AR')}
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
                            className="h-8 gap-2"
                            onClick={(e) => { e.stopPropagation(); handleOpenMaps(customer.direccion, customer.localidad); }}
                          >
                            <Map className="h-3 w-3" /> Cómo llegar
                          </Button>
                          {customer.telefono && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-2"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a href={`tel:${customer.telefono}`}>
                                <PhoneCall className="h-3 w-3" /> Llamar
                              </a>
                            </Button>
                          )}
                          {customer.mail && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-2"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a href={`mailto:${customer.mail}`}>
                                <Mail className="h-3 w-3" /> Email
                              </a>
                            </Button>
                          )}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {editingCustomer ? 'Editar Perfil de Cliente' : 'Nuevo Registro de Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general"><Info className="h-4 w-4 mr-2" /> General</TabsTrigger>
              <TabsTrigger value="address"><MapPin className="h-4 w-4 mr-2" /> Ubicación</TabsTrigger>
              <TabsTrigger value="equipment"><Droplets className="h-4 w-4 mr-2" /> Equipo</TabsTrigger>
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
                  <Label>Email</Label>
                  <Input type="email" value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})} placeholder="cliente@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Actual ($)</Label>
                  <Input 
                    type="number" 
                    value={formData.saldoActual} 
                    onChange={(e) => setFormData({...formData, saldoActual: Number(e.target.value)})} 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Cliente de Reposición</Label>
                  <p className="text-xs text-muted-foreground">Habilitar seguimiento de cloro.</p>
                </div>
                <Switch 
                  checked={formData.esClienteReposicion} 
                  onCheckedChange={(v) => setFormData({...formData, esClienteReposicion: v})} 
                />
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Dirección</Label>
                <div className="flex gap-2">
                  <Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} placeholder="Av. Principal 123" />
                  <Button variant="outline" size="icon" onClick={() => handleOpenMaps(formData.direccion, formData.localidad)}>
                    <Map className="h-4 w-4" />
                  </Button>
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
                <Label>Observaciones / Notas</Label>
                <Textarea 
                  value={formData.observaciones} 
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})} 
                  placeholder="Detalles adicionales sobre el cliente o acceso al domicilio..."
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="equipment" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo del Equipo</Label>
                  <Input value={formData.equipoInstalado.modeloEquipo} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, modeloEquipo: e.target.value}})} placeholder="Ej: Dosimat Pro V2" />
                </div>
                <div className="space-y-2">
                  <Label>Medidas Pileta</Label>
                  <Input value={formData.equipoInstalado.medidasPileta} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, medidasPileta: e.target.value}})} placeholder="8x4 m" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Volumen (Litros)</Label>
                  <Input type="number" value={formData.equipoInstalado.volumen} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, volumen: Number(e.target.value)}})} />
                </div>
                <div className="space-y-2">
                  <Label>Dosis Diaria Cloro</Label>
                  <Input value={formData.equipoInstalado.dosisCloro} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, dosisCloro: e.target.value}})} placeholder="500ml / día" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad Bidones</Label>
                  <Input type="number" value={formData.equipoInstalado.cantidadBidones} onChange={(e) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, cantidadBidones: Number(e.target.value)}})} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 mt-6">
                  <Label className="cursor-pointer">En Comodato</Label>
                  <Switch 
                    checked={formData.equipoInstalado.enComodato} 
                    onCheckedChange={(v) => setFormData({...formData, equipoInstalado: {...formData.equipoInstalado, enComodato: v}})} 
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center w-full">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                {editingCustomer ? `Modificado por: ${editingCustomer.ultimaModificacionPor || 'S/D'}` : 'Nuevo Registro'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="px-8"><Plus className="mr-2 h-4 w-4" /> Guardar Cliente</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  )
}
