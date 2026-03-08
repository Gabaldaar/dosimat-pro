"use client"

import { useState } from "react"
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
  Filter
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const customers = [
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
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-headline font-bold text-primary">Clientes</h1>
          <Button className="rounded-full">
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
          {customers.map((customer) => (
            <Card key={customer.id} className="glass-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
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
                        <Badge variant="destructive" className="ml-2 whitespace-nowrap">Deuda: ${customer.debt}</Badge>
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
                  <button className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold">Llamar</span>
                  </button>
                  <button className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors border-r">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-bold">Mapa</span>
                  </button>
                  <button className="py-3 flex items-center justify-center gap-2 text-primary hover:bg-white/50 transition-colors">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-bold">Email</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}