"use client"

import { useState, useMemo } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, MoreVertical, Save, DollarSign } from "lucide-react"
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
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"

export default function CatalogPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const { data: items, isLoading } = useCollection(catalogQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    priceARS: 0,
    priceUSD: 0,
    isService: false,
    description: ""
  })

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItemId(item.id)
      setFormData({
        name: item.name,
        priceARS: item.priceARS || 0,
        priceUSD: item.priceUSD || 0,
        isService: item.isService || false,
        description: item.description || ""
      })
    } else {
      setEditingItemId(null)
      setFormData({ name: "", priceARS: 0, priceUSD: 0, isService: false, description: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name) return
    const id = editingItemId || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'products_services', id), { ...formData, id }, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingItemId ? "Item actualizado" : "Item creado" })
  }

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'products_services', id))
    toast({ title: "Item eliminado" })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:flex w-64 fixed inset-y-0" />
      <main className="flex-1 md:ml-64 p-4 md:p-8 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Catálogo Cloud</h1>
          <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Cargando catálogo...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
             <p className="text-muted-foreground">No se encontraron productos o servicios.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <Badge variant="secondary">{item.isService ? 'Servicio' : 'Producto'}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleOpenDialog(item)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg mt-2">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-xl font-bold">${(item.priceARS || 0).toLocaleString()} ARS</p>
                    <p className="text-sm text-muted-foreground">u$s {(item.priceUSD || 0).toLocaleString()} USD</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItemId ? "Editar Item" : "Nuevo Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio ARS</Label>
                <Input type="number" value={formData.priceARS} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Precio USD</Label>
                <Input type="number" value={formData.priceUSD} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isService} onChange={(e) => setFormData({...formData, isService: e.target.checked})} />
              <Label>Es un Servicio</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <MobileNav />
    </div>
  )
}
