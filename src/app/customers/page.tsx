
"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Save
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

interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  poolType: string;
  status: 'active' | 'debtor';
  debt: number;
}

const initialCustomers: Customer[] = [
  { 
    id: 1, 
    name: "Carlos Rodríguez", 
    address: "B° Privado El Golf, Lote 45", 
    phone: "+54 9 11 5555-1234",
    email: "carlos.r@gmail.com",
    poolType: "Hormigón 8x4",
    status: "active",
    debt: 0
  },
  { 
    id: 2, 
    name: "Ana Martínez", 
    address: "Calle Los Sauces 1240", 
    phone: "+54 9 11 4444-5678",
    email: "ana.m@outlook.com",
    poolType: "Fibra 6x3",
    status: "debtor",
    debt: 12500
  },
  { 
    id: 3, 
    name: "Estancia La Paz", 
    address: "Ruta 2, Km 45", 
    phone: "+54 9 11 2222-9999",
    email: "contacto@lapaz.com.ar",
    poolType: "Olímpica 25x12",
    status: "active",
    debt: 0
  },
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
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'status'>>({
    name: "",
    address: "",
    phone: "",
    email: "",
    poolType: "",
    debt: 0
  })

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        poolType: customer.poolType,
        debt: customer.debt
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        poolType: "",
        debt: 0
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveCustomer = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" })
      return
    }

    if (editingCustomer) {
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData, status: formData.debt > 0 ? 'debtor' : 'active' } 
          : c
      ))
      toast({ title: "Cliente actualizado", description: "Los cambios se guardaron correctamente." })
    } else {
      const newCustomer: Customer = {
        ...formData,
        id: Math.max(...customers.map(c => c.id)) + 1,
        status: formData.debt > 0 ? 'debtor' : 'active'
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

  const handleMap = (e: React.MouseEvent, address: string) => {
    e.stopPropagation()
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
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
              placeholder="Buscar por nombre, dirección o teléfono..." 
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
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{customer.name}</h3>
                      {customer.status === 'debtor' && (
                        <Badge variant="destructive" className="ml-2 whitespace-nowrap animate-pulse">
                          Deuda: ${mounted ? customer.debt.toLocaleString() : customer.debt}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3 shrink-0" /> {customer.address}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium bg-blue-50 w-fit px-2 py-1 rounded-full">
                      <Waves className="h-3 w-3" /> {customer.poolType}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="bg-accent/10 grid grid-cols-3 border-t">
                  <button 
                    onClick={(e) => handleCall(e, customer.phone)}
                    className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold">Llamar</span>
                  </button>
                  <button 
                    onClick={(e) => handleMap(e, customer.address)}
                    className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-bold">Mapa</span>
                  </button>
                  <button 
                    onClick={(e) => handleEmail(e, customer.email)}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              Ingresa los datos del cliente y su piscina para el seguimiento técnico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre</Label>
              <Input 
                id="name" 
                className="col-span-3" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Dirección</Label>
              <Input 
                id="address" 
                className="col-span-3" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Teléfono</Label>
              <Input 
                id="phone" 
                className="col-span-3" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input 
                id="email" 
                className="col-span-3" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pool" className="text-right">Piscina</Label>
              <Input 
                id="pool" 
                placeholder="Ej: Hormigón 8x4" 
                className="col-span-3" 
                value={formData.poolType}
                onChange={(e) => setFormData({...formData, poolType: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="debt" className="text-right">Deuda ($)</Label>
              <Input 
                id="debt" 
                type="number" 
                className="col-span-3" 
                value={formData.debt}
                onChange={(e) => setFormData({...formData, debt: Number(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
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
