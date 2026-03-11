"use client"

import { useState, useMemo, useEffect } from "react"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, MoreVertical, Loader2, Package, AlertTriangle, Droplets } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"

export default function CatalogPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { userData } = useUser()
  const isAdmin = userData?.role === 'Admin'

  const [searchTerm, setSearchTerm] = useState("")
  
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const { data: items, isLoading } = useCollection(catalogQuery)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    priceARS: 0,
    priceUSD: 0,
    isService: false,
    description: ""
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isDialogOpen && !itemToDelete) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete]);

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleOpenDialog = (item?: any) => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", description: "Su usuario no tiene permisos para gestionar el catálogo.", variant: "destructive" })
      return
    }
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
    
    setIsDialogOpen(false)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)

    setDocumentNonBlocking(doc(db, 'products_services', id), { ...formData, id }, { merge: true })
    toast({ title: editingItemId ? "Item actualizado" : "Item creado" })
  }

  const confirmDelete = () => {
    if (!itemToDelete) return
    deleteDocumentNonBlocking(doc(db, 'products_services', itemToDelete.id))
    setItemToDelete(null)
    setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100)
    toast({ title: "Item eliminado" })
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-32 md:pb-8 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">Dosimat<span className="text-accent-foreground">Pro</span></span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Catálogo</h1>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()} className="shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Nuevo
            </Button>
          )}
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre..." 
            className="pl-10 h-11 bg-white/50" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Sincronizando catálogo...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
             <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
             <p className="text-muted-foreground font-medium">No se encontraron productos o servicios.</p>
             <Button variant="link" onClick={() => setSearchTerm("")}>Limpiar búsqueda</Button>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="glass-card hover:shadow-md transition-shadow group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant={item.isService ? "secondary" : "default"} className="text-[10px] font-bold">
                      {item.isService ? 'SERVICIO' : 'PRODUCTO'}
                    </Badge>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleOpenDialog(item)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setItemToDelete(item)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 truncate">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/10">
                       <span className="text-[10px] font-black text-primary uppercase">Monto ARS</span>
                       <span className="text-lg font-black text-primary">${(item.priceARS || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                       <span className="text-[10px] font-black text-emerald-700 uppercase">Monto USD</span>
                       <span className="text-lg font-black text-emerald-700">u$s {(item.priceUSD || 0).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </SidebarInset>

      <Dialog open={isDialogOpen} onOpenChange={(o) => {
        setIsDialogOpen(o);
        if(!o) setTimeout(() => { document.body.style.pointerEvents = 'auto' }, 100);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? 'Editar Item' : 'Nuevo Item'}</DialogTitle>
            <DialogDescription>Completa los datos del producto o servicio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priceARS">Precio ARS ($)</Label>
                <Input id="priceARS" type="number" value={formData.priceARS} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceUSD">Precio USD (u$s)</Label>
                <Input id="priceUSD" type="number" value={formData.priceUSD} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isService} onCheckedChange={(v) => setFormData({...formData, isService: v})} />
              <Label>Es un servicio técnico</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará permanentemente "{itemToDelete?.name}" del catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  )
}
