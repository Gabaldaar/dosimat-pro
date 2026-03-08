
"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  Layers,
  Activity
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

const catalogItems = [
  { id: 1, name: "Cloro Líquido x 20L", category: "Químicos", price: 8500, currency: "ARS", stock: 45 },
  { id: 2, name: "Cloro Granulado x 10Kg", category: "Químicos", price: 18200, currency: "ARS", stock: 12 },
  { id: 3, name: "Bomba Peristáltica Pro", category: "Equipos", price: 450, currency: "USD", stock: 3 },
  { id: 4, name: "Servicio Mantenimiento Estándar", category: "Servicios", price: 25000, currency: "ARS", stock: null },
  { id: 5, name: "Repuesto Filtro V8", category: "Equipos", price: 85, currency: "USD", stock: 8 },
]

export default function CatalogPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Catálogo</h1>
            <p className="text-muted-foreground">Gestiona tus productos, servicios y listas de precios.</p>
          </div>
          <Button className="rounded-full shadow-lg">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Item
          </Button>
        </header>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o categoría..." className="pl-10" />
          </div>
          <Button variant="outline">Categorías</Button>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogItems.map((item) => (
            <Card key={item.id} className="glass-card group overflow-hidden border-transparent hover:border-primary/20 transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground font-bold">
                    {item.category}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem><Activity className="mr-2 h-4 w-4" /> Historial Precios</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">
                    {item.currency === 'USD' ? 'u$s ' : '$'}
                    {mounted ? item.price.toLocaleString() : item.price}
                  </span>
                  {item.stock !== null && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Stock</span>
                      <span className={`text-sm font-bold ${item.stock < 10 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {item.stock} unidades
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold">ACTUALIZAR PRECIO</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <MobileNav />
    </div>
  )
}
