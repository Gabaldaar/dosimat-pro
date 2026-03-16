
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Loader2, 
  Package, 
  AlertTriangle, 
  Droplets, 
  Layers, 
  Wrench, 
  Minus, 
  CheckCircle2,
  Hammer,
  ListFilter,
  Tag,
  Settings,
  Filter,
  ChevronRight,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Star,
  StarOff
} from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc, increment } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function CatalogPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  useEffect(() => {
    if (!isUserLoading && userData?.role === 'Communicator') {
      router.replace('/customers')
    }
  }, [userData, isUserLoading, router])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [hasInitializedFavorites, setHasInitializedFavorites] = useState(false)
  
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])
  
  const { data: items, isLoading } = useCollection(catalogQuery)
  const { data: rawCategories, isLoading: loadingCats } = useCollection(categoriesQuery)
  
  const categories = useMemo(() => {
    if (!rawCategories) return []
    return [...rawCategories].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  }, [rawCategories])

  // Initialize favorite categories on first load
  useEffect(() => {
    if (!loadingCats && categories.length > 0 && !hasInitializedFavorites) {
      const favorites = categories.filter((c: any) => c.isFavorite).map((c: any) => c.id);
      if (favorites.length > 0) {
        setSelectedCategories(favorites);
      }
      setHasInitializedFavorites(true);
    }
  }, [categories, loadingCats, hasInitializedFavorites]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach(c => { map[c.id] = c.name });
    return map
  }, [categories])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedForAssembly, setSelectedForAssembly] = useState<any | null>(null)
  const [assemblyQty, setAssemblyQty] = useState(1)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  
  const [bomFilterCategory, setBomFilterCategory] = useState("all")

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    priceARS: 0,
    priceUSD: 0,
    costARS: 0,
    costUSD: 0,
    laborCostARS: 0,
    laborCostUSD: 0,
    isService: false,
    isCompuesto: false,
    description: "",
    stock: 0,
    minStock: 0,
    components: [] as { productId: string, quantity: number }[]
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isCategoryManagerOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isCategoryManagerOpen]);

  const calculateCost = useCallback((itemData: any, allItems: any[]): { ars: number, usd: number } => {
    if (!itemData.isCompuesto) {
      return { ars: Number(itemData.costARS) || 0, usd: Number(itemData.costUSD) || 0 };
    }
    
    let totalARS = Number(itemData.laborCostARS) || 0;
    let totalUSD = Number(itemData.laborCostUSD) || 0;

    itemData.components?.forEach((comp: any) => {
      const child = allItems.find(i => i.id === comp.productId);
      if (child) {
        const childCosts = calculateCost(child, allItems);
        totalARS += childCosts.ars * (Number(comp.quantity) || 0);
        totalUSD += childCosts.usd * (Number(comp.quantity) || 0);
      }
    });

    return { ars: totalARS, usd: totalUSD };
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items
      .filter((item: any) => {
        const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const itemCat = item.categoryId || "uncategorized";
        const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(itemCat);
        return matchSearch && matchCategory;
      })
      .map(item => {
        const { ars, usd } = calculateCost(item, items);
        return { ...item, calculatedCostARS: ars, calculatedCostUSD: usd };
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [items, searchTerm, selectedCategories, calculateCost])

  const sortedAddedComponents = useMemo(() => {
    if (!items || !formData.components) return []
    return [...formData.components].sort((a, b) => {
      const nameA = items.find(i => i.id === a.productId)?.name || ""
      const nameB = items.find(i => i.id === b.productId)?.name || ""
      return nameA.localeCompare(nameB)
    })
  }, [formData.components, items])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    items?.forEach((item: any) => {
      const cid = item.categoryId || "uncategorized"
      counts[cid] = (counts[cid] || 0) + 1
    })
    return counts
  }, [items])

  const handleOpenDialog = (item?: any) => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", variant: "destructive" })
      return
    }
    if (item) {
      setEditingItemId(item.id)
      setFormData({
        name: item.name || "",
        categoryId: item.categoryId || "",
        priceARS: item.priceARS || 0,
        priceUSD: item.priceUSD || 0,
        costARS: item.costARS || 0,
        costUSD: item.costUSD || 0,
        laborCostARS: item.laborCostARS || 0,
        laborCostUSD: item.laborCostUSD || 0,
        isService: item.isService || false,
        isCompuesto: item.isCompuesto || false,
        description: item.description || "",
        stock: item.stock || 0,
        minStock: item.minStock || 0,
        components: item.components || []
      })
    } else {
      setEditingItemId(null)
      setFormData({ 
        name: "", categoryId: "", priceARS: 0, priceUSD: 0, costARS: 0, costUSD: 0, 
        laborCostARS: 0, laborCostUSD: 0, isService: false, 
        isCompuesto: false, description: "", stock: 0, minStock: 0, components: [] 
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.categoryId) {
      toast({ title: "Error", description: "Nombre y Categoría son obligatorios", variant: "destructive" })
      return
    }
    const id = editingItemId || Math.random().toString(36).substr(2, 9)
    
    if (formData.isCompuesto) {
      const isCircular = (pid: string, targetId: string): boolean => {
        if (pid === targetId) return true;
        const p = items?.find(i => i.id === pid);
        return p?.components?.some((c: any) => isCircular(c.productId, targetId)) || false;
      };
      
      const hasCircle = formData.components.some(c => isCircular(c.productId, id));
      if (hasCircle) {
        toast({ title: "Error de estructura", description: "No se puede crear un bucle circular de componentes.", variant: "destructive" });
        return;
      }
    }

    setDocumentNonBlocking(doc(db, 'products_services', id), { ...formData, id }, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingItemId ? "Item actualizado" : "Item creado" })
  }

  const handleAssemble = () => {
    if (!selectedForAssembly || assemblyQty <= 0) return;

    const shortages: string[] = [];
    selectedForAssembly.components.forEach((comp: any) => {
      const child = items?.find(i => i.id === comp.productId);
      const needed = comp.quantity * assemblyQty;
      if (!child || (child.stock || 0) < needed) {
        shortages.push(child?.name || "Parte desconocida");
      }
    });

    if (shortages.length > 0) {
      toast({ title: "Falta Stock", description: `Falta stock de: ${shortages.join(", ")}`, variant: "destructive" });
      return;
    }

    selectedForAssembly.components.forEach((comp: any) => {
      updateDocumentNonBlocking(doc(db, 'products_services', comp.productId), {
        stock: increment(-(comp.quantity * assemblyQty))
      });
    });

    updateDocumentNonBlocking(doc(db, 'products_services', selectedForAssembly.id), {
      stock: increment(assemblyQty)
    });

    setIsAssemblyOpen(false);
    toast({ title: "Ensamblado completado", description: `Se fabricaron ${assemblyQty} unidades.` });
  }

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return
    const id = editingCategoryId || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'product_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
    setEditingCategoryId(null)
    toast({ title: editingCategoryId ? "Categoría actualizada" : "Categoría creada" })
  }

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id)
    setNewCategoryName(cat.name)
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setNewCategoryName("")
  }

  const toggleFavoriteCategory = (cat: any) => {
    updateDocumentNonBlocking(doc(db, 'product_categories', cat.id), {
      isFavorite: !cat.isFavorite
    });
  }

  const confirmDelete = () => {
    if (!itemToDelete) return
    deleteDocumentNonBlocking(doc(db, 'products_services', itemToDelete.id))
    setItemToDelete(null)
    toast({ title: "Item eliminado" })
  }

  const toggleCategory = (cid: string) => {
    setSelectedCategories(prev => 
      prev.includes(cid) ? prev.filter(i => i !== cid) : [...prev, cid]
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSearchTerm("")
  }

  const getMarginInfo = (salePrice: number, cost: number) => {
    if (!salePrice || salePrice <= 0) return null;
    const margin = ((salePrice - cost) / salePrice) * 100;
    let color = "text-emerald-600";
    let icon = <TrendingUp className="h-3 w-3" />;
    
    if (margin < 0) {
      color = "text-rose-600";
      icon = <TrendingDown className="h-3 w-3" />;
    } else if (margin < 20) {
      color = "text-amber-600";
      icon = <AlertTriangle className="h-3 w-3" />;
    }
    
    return { 
      value: margin.toFixed(0), 
      color,
      icon
    };
  }

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ListFilter className="h-4 w-4" /> Filtros
        </h3>
        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[10px] font-bold text-primary">
            LIMPIAR ({selectedCategories.length})
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        {categoryCounts["uncategorized"] > 0 && (
          <div 
            className={cn(
              "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group",
              selectedCategories.includes("uncategorized") ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            )}
            onClick={() => toggleCategory("uncategorized")}
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedCategories.includes("uncategorized")} />
              <span className="text-sm font-bold truncate max-w-[120px]">Sin Categoría</span>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 bg-white border font-bold">
              {categoryCounts["uncategorized"]}
            </Badge>
          </div>
        )}

        {categories.map((cat: any) => (
          <div 
            key={cat.id} 
            className={cn(
              "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group",
              selectedCategories.includes(cat.id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            )}
            onClick={() => toggleCategory(cat.id)}
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedCategories.includes(cat.id)} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-bold truncate max-w-[120px]">{cat.name}</span>
                {cat.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 bg-white border font-bold">
              {categoryCounts[cat.id] || 0}
            </Badge>
          </div>
        ))}
      </div>

      {isAdmin && (
        <Button 
          variant="outline" 
          className="w-full h-10 border-dashed gap-2 font-bold text-xs" 
          onClick={() => setIsCategoryManagerOpen(true)}
        >
          <Settings className="h-3 w-3" /> GESTIONAR CATEGORÍAS
        </Button>
      )}
    </div>
  )

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-32 md:pb-8 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20"><Droplets className="h-4 w-4 text-white" /></div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Catálogo e Inventario</h1>
          </div>
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Filtrar Catálogo</SheetTitle>
                </SheetHeader>
                <FilterPanel />
              </SheetContent>
            </Sheet>
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <Card className="hidden md:block w-64 glass-card p-4 shrink-0 sticky top-8">
            <FilterPanel />
          </Card>

          <div className="flex-1 space-y-6 w-full">
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
                <p className="text-sm text-muted-foreground italic">Sincronizando inventario...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/5">
                 <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                 <p className="text-muted-foreground font-medium">No se encontraron productos o servicios.</p>
                 {selectedCategories.length > 0 && (
                   <Button variant="link" onClick={clearFilters} className="text-primary font-bold mt-2">
                     Limpiar filtros para ver todo
                   </Button>
                 )}
              </div>
            ) : (
              <section className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredItems.map((item: any) => {
                  const isLowStock = !item.isService && (item.stock || 0) <= (item.minStock || 0);
                  const catName = categoryMap[item.categoryId] || "Sin Categoría";
                  const marginARS = getMarginInfo(item.priceARS, item.calculatedCostARS);
                  const marginUSD = getMarginInfo(item.priceUSD, item.calculatedCostUSD);

                  return (
                    <Card key={item.id} className={cn(
                      "glass-card hover:shadow-md transition-all group border-l-4",
                      isLowStock ? "border-l-rose-500 bg-rose-50/30" : "border-l-primary"
                    )}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={item.isService ? "secondary" : "default"} className="text-[9px] font-black uppercase">
                              {item.isService ? 'SERVICIO' : 'PRODUCTO'}
                            </Badge>
                            {item.isCompuesto && <Badge className="text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600"><Layers className="h-2 w-2 mr-1" /> COMPUESTO</Badge>}
                            <Badge variant="outline" className="text-[9px] font-bold bg-white text-muted-foreground border-muted-foreground/20">{catName}</Badge>
                          </div>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenDialog(item)}><Edit className="mr-2 h-4 w-4" /> Editar parámetros</DropdownMenuItem>
                                {item.isCompuesto && (
                                  <DropdownMenuItem className="text-amber-600 font-bold" onSelect={() => { setSelectedForAssembly(item); setAssemblyQty(1); setIsAssemblyOpen(true); }}>
                                    <Hammer className="mr-2 h-4 w-4" /> Orden de Armado
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onSelect={() => setItemToDelete(item)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <CardTitle className="text-lg mt-2 truncate font-bold">{item.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!item.isService && (
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Stock Actual</span>
                              <span className={cn("text-xl font-black", isLowStock ? "text-rose-600" : "text-emerald-600")}>
                                {item.stock || 0}
                              </span>
                            </div>
                            {isLowStock && <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 relative overflow-hidden">
                            <span className="text-[9px] font-black text-primary uppercase block">Venta ARS</span>
                            <span className="text-md font-black">${(item.priceARS || 0).toLocaleString('es-AR')}</span>
                            {isAdmin && marginARS && (
                              <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginARS.color)}>
                                {marginARS.icon} {marginARS.value}%
                              </div>
                            )}
                          </div>
                          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 relative overflow-hidden">
                            <span className="text-[9px] font-black text-emerald-700 uppercase block">Venta USD</span>
                            <span className="text-md font-black">u$s {(item.priceUSD || 0).toLocaleString('es-AR')}</span>
                            {isAdmin && marginUSD && (
                              <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginUSD.color)}>
                                {marginUSD.icon} {marginUSD.value}%
                              </div>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="pt-2 border-t border-dashed">
                            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground mb-1.5">
                              <span className="uppercase tracking-widest">Costo Estimado</span>
                              <Badge variant="outline" className="h-4 text-[8px] font-black bg-white uppercase">Costo real</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs font-bold italic opacity-80">
                              <div className="flex flex-col">
                                <span className="text-[9px] not-italic text-muted-foreground uppercase">Costo ARS</span>
                                <span>${(item.calculatedCostARS || 0).toLocaleString('es-AR')}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[9px] not-italic text-muted-foreground uppercase">Costo USD</span>
                                <span>u$s {(item.calculatedCostUSD || 0).toLocaleString('es-AR')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </section>
            )}
          </div>
        </div>
      </SidebarInset>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-primary">
              {editingItemId ? 'Configurar Ítem' : 'Nuevo Ítem'}
            </DialogTitle>
            <DialogDescription>Gestión de precios, categoría y estructura de armado.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Nombre del Producto / Servicio</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Dosificador G4" />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Categoría</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar grupo..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-primary font-black">Venta ARS ($)</Label>
                  <Input type="number" value={formData.priceARS} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-emerald-700 font-black">Venta USD (u$s)</Label>
                  <Input type="number" value={formData.priceUSD} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} />
                </div>
              </div>

              {!formData.isCompuesto ? (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Costo ARS</Label>
                    <Input type="number" value={formData.costARS} onChange={(e) => setFormData({...formData, costARS: Number(e.target.value)})} className="h-8" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Costo USD</Label>
                    <Input type="number" value={formData.costUSD} onChange={(e) => setFormData({...formData, costUSD: Number(e.target.value)})} className="h-8" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-amber-800 uppercase">Mano Obra ARS</Label>
                    <Input type="number" value={formData.laborCostARS} onChange={(e) => setFormData({...formData, laborCostARS: Number(e.target.value)})} className="h-8 border-amber-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-amber-800 uppercase">Mano Obra USD</Label>
                    <Input type="number" value={formData.laborCostUSD} onChange={(e) => setFormData({...formData, laborCostUSD: Number(e.target.value)})} className="h-8 border-amber-200" />
                  </div>
                </div>
              )}

              {!formData.isService && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Stock Inicial</Label>
                    <Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-rose-600">Stock Mínimo (Alerta)</Label>
                    <Input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                  <Switch checked={formData.isService} onCheckedChange={(v) => setFormData({...formData, isService: v})} />
                  <div>
                    <Label className="font-bold">Es un servicio técnico</Label>
                    <p className="text-[10px] text-muted-foreground">No controla stock ni tiene armado.</p>
                  </div>
                </div>
                {!formData.isService && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-amber-50/50 border-amber-200">
                    <Switch checked={formData.isCompuesto} onCheckedChange={(v) => setFormData({...formData, isCompuesto: v})} />
                    <div>
                      <Label className="font-bold text-amber-800">Es un producto compuesto</Label>
                      <p className="text-[10px] text-amber-600">Se fabrica a partir de otros ítems.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {formData.isCompuesto ? (
                <div className="flex flex-col h-full border rounded-xl bg-white shadow-inner overflow-hidden">
                  <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Estructura de Armado (BOM)
                    </span>
                    <Badge variant="outline" className="bg-white text-amber-700 border-amber-200 font-bold text-[10px]">
                      {formData.components.length} PIEZAS
                    </Badge>
                  </div>
                  
                  <div className="p-3 border-b space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Categoría</Label>
                      <Select value={bomFilterCategory} onValueChange={setBomFilterCategory}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Añadir Componente</Label>
                      <Select onValueChange={addComponent}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Elegir parte..." /></SelectTrigger>
                        <SelectContent>
                          {items?.filter(i => 
                            i.id !== editingItemId && 
                            !i.isService && 
                            (bomFilterCategory === "all" || i.categoryId === bomFilterCategory)
                          )
                          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                          .map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-2">
                    {formData.components.length === 0 ? (
                      <div className="py-10 text-center text-xs text-muted-foreground italic">Agrega componentes para armar este producto.</div>
                    ) : (
                      <div className="space-y-2">
                        {sortedAddedComponents.map((comp, idx) => {
                          const product = items?.find(i => i.id === comp.productId);
                          const actualIdx = formData.components.findIndex(c => c.productId === comp.productId);
                          return (
                            <div key={comp.productId} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-muted/30">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold truncate">{product?.name || 'Cargando...'}</span>
                                <span className="text-[9px] text-muted-foreground">Stock actual: {product?.stock || 0}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 border rounded bg-white px-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">x</span>
                                  <input 
                                    type="number" 
                                    value={comp.quantity} 
                                    onChange={(e) => updateComponentQty(actualIdx, Number(e.target.value))}
                                    className="w-10 h-7 text-xs font-bold text-center focus:outline-none"
                                  />
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeComponent(actualIdx)}><Minus className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="font-bold">Descripción (opcional)</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="min-h-[200px]" placeholder="Detalles del producto o servicio..." />
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleSave} className="font-black px-8 shadow-xl shadow-primary/20">
              <CheckCircle2 className="mr-2 h-4 w-4" /> GUARDAR ÍTEM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Tag className="h-5 w-5" /> Categorías de Productos
            </DialogTitle>
            <DialogDescription>Administra los grupos y marca tus favoritos para el filtro inicial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder={editingCategoryId ? "Editar nombre..." : "Nueva categoría..."} 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
              />
              {editingCategoryId ? (
                <div className="flex gap-1">
                  <Button onClick={handleSaveCategory} className="bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={cancelEditCategory}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSaveCategory}><Plus className="h-4 w-4" /></Button>
              )}
            </div>
            <ScrollArea className="h-[250px] border rounded-md p-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-muted/20 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-7 w-7", cat.isFavorite ? "text-amber-500" : "text-muted-foreground opacity-40 hover:opacity-100")}
                      onClick={() => toggleFavoriteCategory(cat)}
                    >
                      <Star className={cn("h-4 w-4", cat.isFavorite && "fill-amber-500")} />
                    </Button>
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEditCategory(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'product_categories', cat.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-center py-10 text-xs text-muted-foreground italic">Sin categorías creadas.</p>}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCategoryManagerOpen(false)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssemblyOpen} onOpenChange={setIsAssemblyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-black">
              <Hammer className="h-5 w-5" /> Orden de Fabricación
            </DialogTitle>
            <DialogDescription>Ensamblar nuevas unidades de <b>{selectedForAssembly?.name}</b></DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-lg">¿Cuántas unidades vas a fabricar?</Label>
              <Input type="number" value={assemblyQty} onChange={(e) => setAssemblyQty(Number(e.target.value))} className="h-14 text-2xl font-black text-center" />
            </div>
            
            <div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-3">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Materiales a utilizar</p>
              {selectedForAssembly?.components?.map((comp: any, idx: number) => {
                const child = items?.find(i => i.id === comp.productId);
                const totalNeeded = comp.quantity * assemblyQty;
                const hasStock = (child?.stock || 0) >= totalNeeded;
                return (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-bold">{child?.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className={cn("font-black", hasStock ? "text-emerald-600" : "text-rose-600")}>
                        {totalNeeded} {hasStock ? '✓' : '(Falta stock)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssemblyOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssemble} className="bg-amber-500 hover:bg-amber-600 font-black px-8">
              PROCESAR ARMADO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>Se borrará permanentemente "{itemToDelete?.name}" y no podrá utilizarse en nuevas operaciones ni armados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  )

  function addComponent(productId: string) {
    if (formData.components.some(c => c.productId === productId)) return;
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { productId, quantity: 1 }]
    }));
  }

  function removeComponent(idx: number) {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx)
    }));
  }

  function updateComponentQty(idx: number, qty: number) {
    const newComps = [...formData.components];
    newComps[idx].quantity = qty;
    setFormData(prev => ({ ...prev, components: newComps }));
  }
}
