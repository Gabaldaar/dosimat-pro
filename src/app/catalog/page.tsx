
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  Activity,
  Save,
  DollarSign,
  Tag
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: 'ARS' | 'USD';
  stock: number | null;
}

const STORAGE_KEY = 'dosimat_pro_v1_catalog'

const defaultItems: CatalogItem[] = [
  { id: '1', name: "Cloro Líquido x 20L", category: "Químicos", price: 8500, currency: "ARS", stock: 45 },
  { id: '2', name: "Cloro Granulado x 10Kg", category: "Químicos", price: 18200, currency: "ARS", stock: 12 },
  { id: '3', name: "Bomba Peristáltica Pro", category: "Equipos", price: 450, currency: "USD", stock: 3 },
  { id: '4', name: "Servicio Mantenimiento Estándar", category: "Servicios", price: 25000, currency: "ARS", stock: null },
]

export default function CatalogPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<Omit<CatalogItem, 'id'>>({
    name: "",
    category: "Químicos",
    price: 0,
    currency: "ARS",
    stock: 0
  })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setItems(JSON.parse(saved))
    } else {
      setItems(defaultItems)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, mounted])

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleOpenDialog = (item?: CatalogItem) => {
    if (item) {
      setEditingItemId(item.id)
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price,
        currency: item.currency,
        stock: item.stock
      })
    } else {
      setEditingItemId(null)
      setFormData({
        name: "",
        category: "Químicos",
        price: 0,
        currency: "ARS",
        stock: 0
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || formData.price < 0) {
      toast({ title: "Error", description: "Completa los campos obligatorios", variant: "destructive" })
      return
    }

    if (editingItemId) {
      setItems(prev => prev.map(item => item.id === editingItemId ? { ...item, ...formData } : item))
      toast({ title: "Actualizado", description: "El ítem se actualizó correctamente." })
    } else {
      const newItem: CatalogItem = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      }
      setItems(prev => [...prev, newItem])
      toast({ title: "Creado", description: "Se agregó un nuevo ítem al catálogo." })
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    toast({ title: "Eliminado", description: "El ítem ha sido removido del catálogo." })
  }

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 p-4 md:p-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Catálogo</h1>
            <p className="text-muted-foreground">Gestiona tus productos, servicios y listas de precios.</p>
          </div>
          <Button className="rounded-full shadow-lg" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Item
          </Button>
        </header>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o categoría..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
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
                      <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">
                    {item.currency === 'USD' ? 'u$s ' : '$'}
                    {item.price.toLocaleString('es-AR')}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs font-bold"
                    onClick={() => handleOpenDialog(item)}
                  >
                    ACTUALIZAR DATOS
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground">No se encontraron ítems en el catálogo.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Editar Item" : "Nuevo Item"}</DialogTitle>
            <DialogDescription>Completa los detalles del producto o servicio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: Cloro Líquido x 20L"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Químicos">Químicos</SelectItem>
                    <SelectItem value="Equipos">Equipos</SelectItem>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Repuestos">Repuestos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formData.currency} onValueChange={(v: any) => setFormData({...formData, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="price" 
                    type="number" 
                    className="pl-10"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock (Opcional)</Label>
                <Input 
                  id="stock" 
                  type="number" 
                  placeholder="0"
                  value={formData.stock === null ? "" : formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value === "" ? null : Number(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Guardar Ítem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  )
}
