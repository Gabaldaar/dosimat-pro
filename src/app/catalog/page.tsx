
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  StarOff,
  History,
  Box,
  FileText,
  Printer,
  Eye,
  Download,
  MessageSquare,
  Coins,
  ShoppingCart,
  ArrowRight,
  Copy,
  RefreshCw,
  ClipboardList,
  Factory,
  Clock,
  CheckCircle,
  Truck,
  Briefcase,
  Phone,
  MapPin
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
import { useToast } from "../../hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, addDocumentNonBlocking } from "../../firebase"
import { collection, doc, increment, query, orderBy } from "firebase/firestore"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CatalogPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  // Redirecciones por Rol
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      } else if (userData.role === 'Communicator') {
        router.replace('/customers')
      }
    }
  }, [userData, isUserLoading, router])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [hasInitializedFavorites, setHasInitializedFavorites] = useState(false)
  const [activeView, setActiveTab] = useState("inventory")
  
  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])
  const suppliersQuery = useMemoFirebase(() => collection(db, 'suppliers'), [db])
  const ordersQuery = useMemoFirebase(() => query(collection(db, 'production_orders'), orderBy('createdAt', 'desc')), [db])
  
  const { data: items, isLoading } = useCollection(catalogQuery)
  const { data: rawCategories, isLoading: loadingCats } = useCollection(categoriesQuery)
  const { data: suppliers } = useCollection(suppliersQuery)
  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery)
  
  const categories = useMemo(() => {
    if (!rawCategories) return []
    return [...rawCategories].sort((a: any, b: any) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.name || "").localeCompare(b.name || "")
    })
  }, [rawCategories])

  const sortedSuppliers = useMemo(() => {
    if (!suppliers) return []
    return [...suppliers].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [suppliers])

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
  const [isSupplierManagerOpen, setIsSupplierManagerOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedForAssembly, setSelectedForAssembly] = useState<any | null>(null)
  const [assemblyQty, setAssemblyQty] = useState(1)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  // Supplier Form State
  const [newSupplierName, setNewSupplierName] = useState("")
  const [newSupplierPhone, setNewSupplierPhone] = useState("")
  const [newSupplierAddress, setNewSupplierAddress] = useState("")
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [productToPreview, setProductToPreview] = useState<any | null>(null)
  const [orderToView, setOrderToView] = useState<any | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null)
  
  const [bomFilterCategory, setBomFilterCategory] = useState("all")

  // Carrito de compras manual para armado
  const [manualPurchaseQtys, setManualPurchaseQtys] = useState<Record<string, number>>({})
  const [manualSuppliers, setManualSuppliers] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    supplier: "none",
    priceARS: 0,
    priceUSD: 0,
    costARS: 0,
    costUSD: 0,
    laborCostARS: 0,
    laborCostUSD: 0,
    isService: false,
    isCompuesto: false,
    trackStock: true,
    description: "",
    stock: 0,
    minStock: 0,
    components: [] as { productId: string, quantity: number }[]
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isCategoryManagerOpen || isSupplierManagerOpen || !!productToPreview || !!orderToView || !!orderToDelete;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isCategoryManagerOpen, isSupplierManagerOpen, productToPreview, orderToView, orderToDelete]);

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

  // LÓGICA DE EXPLOSIÓN DE MATERIALES (MRP)
  const explosionSummary = useMemo(() => {
    const target = orderToView ? items?.find(i => i.id === orderToView.productId) : selectedForAssembly;
    const qty = orderToView ? orderToView.quantity : assemblyQty;
    
    if (!target || !items) return null;

    const requirements: Record<string, { id: string, name: string, required: number, available: number, missing: number, minStock: number, costARS: number, costUSD: number, isCompuesto: boolean, supplier: string }> = {};

    const explode = (productId: string, qtyNeeded: number) => {
      const item = items.find(i => i.id === productId);
      if (!item) return;

      const currentStock = item.stock || 0;
      
      if (!requirements[productId]) {
        requirements[productId] = {
          id: item.id,
          name: item.name,
          required: 0,
          available: currentStock,
          missing: 0,
          minStock: item.minStock || 0,
          costARS: item.costARS || 0,
          costUSD: item.costUSD || 0,
          isCompuesto: item.isCompuesto || false,
          supplier: item.supplier || "Sin Proveedor"
        };
      }
      
      requirements[productId].required += qtyNeeded;

      if (item.isCompuesto) {
        const neededToProduce = Math.max(0, qtyNeeded - currentStock);
        if (neededToProduce > 0) {
          item.components?.forEach((comp: any) => {
            explode(comp.productId, comp.quantity * neededToProduce);
          });
        }
      }
    };

    explode(target.id, qty);

    const flatList = Object.values(requirements).map(req => {
      const missingForOrder = Math.max(0, req.required - req.available);
      const totalSuggestedToBuy = Math.max(missingForOrder, (req.available < req.required + req.minStock) ? (req.required + req.minStock - req.available) : 0);
      
      return {
        ...req,
        missing: missingForOrder,
        suggestedToBuy: totalSuggestedToBuy
      };
    });

    return {
      all: flatList,
      toBuySuggested: flatList.filter(f => f.suggestedToBuy > 0)
    };
  }, [selectedForAssembly, assemblyQty, items, orderToView]);

  // Inicializar el carrito de compras manual cada vez que la explosión cambie
  useEffect(() => {
    if (explosionSummary?.toBuySuggested) {
      const newManualQtys: Record<string, number> = {};
      const newManualSups: Record<string, string> = {};
      
      explosionSummary.toBuySuggested.forEach(item => {
        // Solo inicializar si no existen ya (para no pisar cambios mientras el modal está abierto)
        // Pero si estamos viendo una orden guardada, cargamos sus valores
        if (orderToView?.purchaseQtys?.[item.id] !== undefined) {
          newManualQtys[item.id] = orderToView.purchaseQtys[item.id];
        } else {
          newManualQtys[item.id] = item.suggestedToBuy;
        }

        if (orderToView?.purchaseSuppliers?.[item.id] !== undefined) {
          newManualSups[item.id] = orderToView.purchaseSuppliers[item.id];
        } else {
          newManualSups[item.id] = item.supplier;
        }
      });
      
      setManualPurchaseQtys(newManualQtys);
      setManualSuppliers(newManualSups);
    }
  }, [explosionSummary, orderToView]);

  const purchaseCalculations = useMemo(() => {
    if (!explosionSummary || !items) return null;

    const itemsToBuy = explosionSummary.toBuySuggested.map(item => {
      const manualQty = manualPurchaseQtys[item.id] ?? item.suggestedToBuy;
      const futureStock = item.available + manualQty - item.required;
      const isCritical = futureStock < item.minStock;
      const isInsufficient = futureStock < 0;
      const currentSupplier = manualSuppliers[item.id] || item.supplier;

      return {
        ...item,
        manualQty,
        futureStock,
        isCritical,
        isInsufficient,
        supplier: currentSupplier
      };
    });

    return {
      items: itemsToBuy,
      totalARS: itemsToBuy.reduce((sum, item) => sum + (item.manualQty * item.costARS), 0),
      totalUSD: itemsToBuy.reduce((sum, item) => sum + (item.manualQty * item.costUSD), 0)
    };
  }, [explosionSummary, manualPurchaseQtys, manualSuppliers, items]);

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
        ...formData,
        name: item.name || "",
        categoryId: item.categoryId || "",
        supplier: item.supplier || "none",
        priceARS: item.priceARS || 0,
        priceUSD: item.priceUSD || 0,
        costARS: item.costARS || 0,
        costUSD: item.costUSD || 0,
        laborCostARS: item.laborCostARS || 0,
        laborCostUSD: item.laborCostUSD || 0,
        isService: item.isService || false,
        isCompuesto: item.isCompuesto || false,
        trackStock: item.trackStock !== undefined ? item.trackStock : !item.isService,
        description: item.description || "",
        stock: item.stock || 0,
        minStock: item.minStock || 0,
        components: item.components || []
      })
    } else {
      setEditingItemId(null)
      setFormData({ 
        name: "", categoryId: "", supplier: "none", priceARS: 0, priceUSD: 0, costARS: 0, costUSD: 0, 
        laborCostARS: 0, laborCostUSD: 0, isService: false, 
        isCompuesto: false, trackStock: true, description: "", stock: 0, minStock: 0, components: [] 
      })
    }
    setIsDialogOpen(true)
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined' && productToPreview) {
      const originalTitle = document.title;
      const cleanName = productToPreview.name.replace(/[/\\?%*:|"<>]/g, '-');
      document.title = `BOM_${cleanName}`;
      window.print();
      document.title = originalTitle;
    }
  };

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

    const savePayload = {
      ...formData,
      id,
      supplier: formData.supplier === 'none' ? "" : formData.supplier
    }

    setDocumentNonBlocking(doc(db, 'products_services', id), savePayload, { merge: true })
    setIsDialogOpen(false)
    toast({ title: editingItemId ? "Item actualizado" : "Item creado" })
  }

  const handleCreateOrder = () => {
    if (!selectedForAssembly) return;
    const id = Math.random().toString(36).substring(2, 11);
    const status = explosionSummary?.all.some(f => (f.available - f.required) < 0) ? 'pending_purchase' : 'ready';
    
    const newOrder = {
      id,
      productId: selectedForAssembly.id,
      productName: selectedForAssembly.name,
      quantity: assemblyQty,
      status,
      createdAt: new Date().toISOString(),
      purchaseQtys: manualPurchaseQtys,
      purchaseSuppliers: manualSuppliers
    };

    setDocumentNonBlocking(doc(db, 'production_orders', id), newOrder, { merge: true });
    setIsAssemblyOpen(false);
    setManualSuppliers({});
    setActiveTab("orders");
    toast({ title: "Orden de producción creada", description: `Estado: ${status === 'ready' ? 'Lista para armar' : 'Pendiente de compra'}` });
  }

  const handleReceiveMaterials = () => {
    if (!orderToView || !purchaseCalculations) return;

    purchaseCalculations.items.forEach(item => {
      if (item.manualQty > 0) {
        updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
          stock: increment(item.manualQty)
        });
      }
    });

    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      status: 'ready'
    });

    toast({ title: "Materiales ingresados", description: "El stock ha sido actualizado y la orden está lista para armar." });
    setOrderToView(null);
  }

  const handleAssembleFinal = () => {
    const order = orderToView;
    if (!order || !items) return;

    const product = items.find(i => i.id === order.productId);
    if (!product) return;

    // Recalcular explosión para asegurar stock actual
    const explosion = explosionSummary;
    if (explosion?.all.some(f => (f.available - f.required) < 0)) {
      toast({ title: "Error de stock", description: "No hay materiales suficientes para finalizar el armado.", variant: "destructive" });
      return;
    }

    // Descontar componentes (solo los de nivel 1 directo del producto final)
    product.components.forEach((comp: any) => {
      const child = items.find(i => i.id === comp.productId);
      if (child?.trackStock !== false) {
        updateDocumentNonBlocking(doc(db, 'products_services', comp.productId), {
          stock: increment(-(comp.quantity * order.quantity))
        });
      }
    });

    // Sumar producto final
    if (product.trackStock !== false) {
      updateDocumentNonBlocking(doc(db, 'products_services', product.id), {
        stock: increment(order.quantity)
      });
    }

    // Actualizar orden
    updateDocumentNonBlocking(doc(db, 'production_orders', order.id), {
      status: 'completed'
    });

    setOrderToView(null);
    toast({ title: "Armado completado", description: `Se han fabricado ${order.quantity} unidades de ${order.productName}.` });
  }

  const handleSaveCategory = () => {
    if (!newCategoryName.trim()) return
    const id = editingCategoryId || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'product_categories', id), { id, name: newCategoryName }, { merge: true })
    setNewCategoryName("")
    setEditingCategoryId(null)
    toast({ title: editingCategoryId ? "Categoría actualizada" : "Categoría creada" })
  }

  const handleSaveSupplier = () => {
    if (!newSupplierName.trim()) return
    const id = Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'suppliers', id), { 
      id, 
      name: newSupplierName,
      phone: newSupplierPhone,
      address: newSupplierAddress
    }, { merge: true })
    setNewSupplierName("")
    setNewSupplierPhone("")
    setNewSupplierAddress("")
    toast({ title: "Proveedor guardado" })
  }

  const handleDeleteSupplier = (id: string) => {
    if (!isAdmin) return
    deleteDocumentNonBlocking(doc(db, 'suppliers', id))
    toast({ title: "Proveedor eliminado" })
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

  const handleCopyShoppingList = (supplierFilter?: string) => {
    if (!purchaseCalculations) return;
    const dateStr = new Date().toLocaleDateString('es-AR');
    const targetOrder = orderToView || { productName: selectedForAssembly?.name, quantity: assemblyQty };
    
    let text = `*LISTA DE COMPRAS - DOSIMAT PRO*\n`;
    text += `Para: ${targetOrder.quantity} x ${targetOrder.productName}\n`;
    
    if (supplierFilter) {
      text += `PROVEEDOR: ${supplierFilter.toUpperCase()}\n`;
      const supObj = suppliers?.find(s => s.name === supplierFilter);
      if (supObj) {
        if (supObj.phone) text += `Tel: ${supObj.phone}\n`;
        if (supObj.address) text += `Dir: ${supObj.address}\n`;
      }
    }
    
    text += `Fecha: ${dateStr}\n\n`;
    
    let itemsToInclude = purchaseCalculations.items;
    if (supplierFilter) {
      itemsToInclude = itemsToInclude.filter(i => i.supplier === supplierFilter);
    }

    if (itemsToInclude.length === 0) {
      toast({ title: "Sin ítems", description: "No hay faltantes para este proveedor." });
      return;
    }

    itemsToInclude.forEach(f => {
      text += `- *${f.name}*: Comprar ${f.manualQty} unidades.\n`;
    });

    const ars = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * i.costARS), 0);
    const usd = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * i.costUSD), 0);

    text += `\n*INVERSIÓN ESTIMADA:*\n`;
    if (ars > 0) text += `ARS: $${ars.toLocaleString('es-AR')}\n`;
    if (usd > 0) text += `USD: u$s ${usd.toLocaleString('es-AR')}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Lista de compras copiada", description: supplierFilter ? `Lista filtrada para ${supplierFilter}.` : "Lista completa copiada." });
  }

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Filtros
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
        <div className="space-y-2 pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full h-10 border-dashed gap-2 font-bold text-xs" 
            onClick={() => setIsCategoryManagerOpen(true)}
          >
            <Settings className="h-3 w-3" /> GESTIONAR CATEGORÍAS
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-10 border-dashed gap-2 font-bold text-xs" 
            onClick={() => setIsSupplierManagerOpen(true)}
          >
            <Briefcase className="h-3 w-3" /> GESTIONAR PROVEEDORES
          </Button>
        </div>
      )}
    </div>
  )

  const OrdersList = () => (
    <div className="space-y-4">
      {loadingOrders ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground italic">Cargando órdenes de producción...</p>
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card className="p-20 text-center border-dashed border-2 bg-muted/5">
          <Factory className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-xl font-bold text-slate-800">No hay órdenes de producción</h3>
          <p className="text-muted-foreground max-w-md mx-auto mt-2">Crea una orden desde el catálogo para planificar la fabricación de productos compuestos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order: any) => {
            const statusInfo = {
              draft: { label: "Borrador", icon: ClipboardList, color: "text-slate-600 bg-slate-100 border-slate-200" },
              pending_purchase: { label: "Faltan Materiales", icon: ShoppingCart, color: "text-amber-700 bg-amber-50 border-amber-200" },
              ready: { label: "Listo para Armar", icon: Hammer, color: "text-blue-700 bg-blue-50 border-blue-200" },
              completed: { label: "Completado", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
            }[order.status as keyof typeof statusInfo] || { label: order.status, icon: Factory, color: "bg-muted" };
            
            const StatusIcon = statusInfo.icon;

            return (
              <Card 
                key={order.id} 
                className={cn(
                  "glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group",
                  order.status === 'completed' ? 'border-l-emerald-500 opacity-70' : 'border-l-primary'
                )}
                onClick={() => setOrderToView(order)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", statusInfo.color)}>
                      <StatusIcon className="h-2.5 w-2.5 mr-1" /> {statusInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive" 
                        onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 font-bold leading-tight">{order.productName}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">
                    Creada el {new Date(order.createdAt).toLocaleDateString('es-AR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/50 border rounded-lg p-3 flex items-center justify-between shadow-inner">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">Unidades a Fabricar</span>
                    <span className="text-2xl font-black text-primary">{order.quantity}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t bg-muted/5 flex justify-between py-3">
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">VER DETALLE <ChevronRight className="h-3 w-3 ml-1" /></Button>
                  {order.status === 'ready' && <Badge className="bg-blue-600 animate-pulse text-[8px] font-black">PRODUCCIÓN HABILITADA</Badge>}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  )

  if (isUserLoading || userData?.role === 'Replenisher' || userData?.role === 'Communicator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">
          {userData?.role === 'Replenisher' ? 'Redirigiendo a Rutas...' : 
           userData?.role === 'Communicator' ? 'Redirigiendo a Clientes...' : 
           'Accediendo...'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-32 md:pb-8 overflow-x-hidden">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="flex" />
              <div className="flex items-center gap-2 md:hidden pr-2 border-r">
                 <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20"><Droplets className="h-4 w-4 text-white" /></div>
                 <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Catálogo e Inventario</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={activeView} onValueChange={setActiveTab} className="bg-muted/50 p-1 rounded-xl border">
                <TabsList className="bg-transparent h-9">
                  <TabsTrigger value="inventory" className="text-[10px] font-black h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">Stock</TabsTrigger>
                  <TabsTrigger value="orders" className="text-[10px] font-black h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">Producción</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="w-px h-6 bg-border mx-2 hidden md:block" />
              <div className="flex gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="md:hidden">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] flex flex-col p-0">
                    <div className="p-6 pb-2">
                      <SheetHeader className="mb-2">
                        <SheetTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Filtrar Catálogo</SheetTitle>
                      </SheetHeader>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-6 pt-0">
                        <FilterPanel />
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
                {isAdmin && activeView === 'inventory' && (
                  <Button onClick={() => handleOpenDialog()} className="shadow-lg font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
                  </Button>
                )}
              </div>
            </div>
          </header>

          <Tabs value={activeView} className="w-full">
            <TabsContent value="inventory" className="m-0 space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <Card className="hidden md:block w-64 glass-card p-4 shrink-0 sticky top-8 max-h-[calc(100vh-100px)] overflow-y-auto">
                  <FilterPanel />
                </Card>

                <div className="flex-1 space-y-6 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input 
                      placeholder="Buscar por nombre..." 
                      className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" 
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
                        const tracksStock = item.trackStock !== false;
                        const isLowStock = tracksStock && !item.isService && (item.stock || 0) <= (item.minStock || 0);
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
                                  {!tracksStock && <Badge variant="outline" className="text-[9px] font-black uppercase text-blue-600 border-blue-200 bg-blue-50">ENTREGA DIRECTA</Badge>}
                                  <Badge variant="outline" className="text-[9px] font-bold bg-white text-muted-foreground border-muted-foreground/20">{catName}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-primary opacity-40 group-hover:opacity-100 transition-opacity" 
                                    onClick={(e) => { e.stopPropagation(); setProductToPreview(item); }} 
                                    title="Ver Ficha / Exportar"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setProductToPreview(item)}><Printer className="mr-2 h-4 w-4" /> Exportar Ficha (PDF)</DropdownMenuItem>
                                      {isAdmin && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}><Edit className="mr-2 h-4 w-4" /> Editar parámetros</DropdownMenuItem>
                                          {item.isCompuesto && (
                                            <DropdownMenuItem className="text-amber-600 font-bold" onClick={() => { setSelectedForAssembly(item); setAssemblyQty(1); setManualSuppliers({}); setIsAssemblyOpen(true); }}>
                                              <Hammer className="mr-2 h-4 w-4" /> Orden de Armado
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <CardTitle className="text-lg mt-2 truncate font-bold">{item.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {tracksStock && !item.isService && (
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
            </TabsContent>
            <TabsContent value="orders" className="m-0">
              <OrdersList />
            </TabsContent>
          </Tabs>
        </SidebarInset>
      </div>

      {/* MODAL DE DETALLE DE ORDEN DE PRODUCCIÓN */}
      <Dialog open={!!orderToView} onOpenChange={(o) => { if(!o) setOrderToView(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2 text-primary font-black text-2xl">
                  <Factory className="h-6 w-6" /> Orden #{orderToView?.id.toUpperCase()}
                </DialogTitle>
                <DialogDescription>Gestión de fabricación para <b>{orderToView?.quantity} x {orderToView?.productName}</b></DialogDescription>
              </div>
              {orderToView && (
                <Badge className={cn(
                  "font-black uppercase tracking-widest",
                  {
                    draft: "bg-slate-100 text-slate-600",
                    pending_purchase: "bg-amber-100 text-amber-700",
                    ready: "bg-blue-100 text-blue-700",
                    completed: "bg-emerald-100 text-emerald-700"
                  }[orderToView.status as string]
                )}>
                  {orderToView.status === 'pending_purchase' ? 'FALTAN MATERIALES' : 
                   orderToView.status === 'ready' ? 'LISTO PARA ARMAR' : 
                   orderToView.status === 'completed' ? 'COMPLETADO' : orderToView.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {orderToView && (
            <div className="py-4 space-y-8">
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Explosión de Insumos
                    </h3>
                  </div>
                  <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase">Pieza</TableHead>
                          <TableHead className="text-center text-[9px] font-black uppercase">Req.</TableHead>
                          <TableHead className="text-center text-[9px] font-black uppercase">Stock</TableHead>
                          <TableHead className="text-right text-[9px] font-black uppercase">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {explosionSummary?.all.map(req => {
                          const stockRestante = req.available - req.required;
                          const esCritico = stockRestante < req.minStock;
                          const faltaDirecto = stockRestante < 0;
                          return (
                            <TableRow key={req.id}>
                              <TableCell className="py-2">
                                <p className="font-bold text-xs">{req.name}</p>
                                <p className="text-[8px] text-muted-foreground uppercase">{manualSuppliers[req.id] || req.supplier}</p>
                              </TableCell>
                              <TableCell className="text-center font-black text-primary text-xs">{req.required}</TableCell>
                              <TableCell className="text-center text-xs">{req.available}</TableCell>
                              <TableCell className="text-right">
                                {faltaDirecto ? <Badge className="bg-rose-600 text-[8px] h-4">FALTA</Badge> : 
                                 esCritico ? <Badge variant="outline" className="text-amber-600 border-amber-200 text-[8px] h-4">BAJO</Badge> : 
                                 <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" /> Compras / Insumos
                    </h3>
                    {orderToView.status !== 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs"><Copy className="h-3.5 w-3.5" /> COPIAR LISTA</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyShoppingList()}>Lista Completa</DropdownMenuItem>
                          <div className="h-px bg-muted my-1" />
                          {Array.from(new Set(purchaseCalculations?.items.map(i => i.supplier))).map(sup => (
                            <DropdownMenuItem key={sup} onClick={() => handleCopyShoppingList(sup)}>{sup}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <Card className="border-2 shadow-lg relative overflow-hidden bg-white">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingCart className="h-32 w-32" /></div>
                    <CardContent className="p-0">
                      {purchaseCalculations?.items.length === 0 ? (
                        <div className="p-12 text-center text-emerald-600 space-y-2">
                          <CheckCircle2 className="h-12 w-12 mx-auto" />
                          <p className="font-black">MATERIALES LISTOS</p>
                          <p className="text-xs text-muted-foreground italic">Tienes todo lo necesario para empezar el armado.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-900 text-white">
                              <TableRow>
                                <TableHead className="text-white text-[9px] font-black uppercase">Material / Proveedor</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-center w-20">Compra</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-center">Post</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchaseCalculations?.items.map(f => (
                                <TableRow key={f.id} className="hover:bg-muted/5">
                                  <TableCell className="py-2">
                                    <p className="font-bold text-xs">{f.name}</p>
                                    <div className="mt-1">
                                      <Select 
                                        disabled={orderToView.status === 'completed'}
                                        value={manualSuppliers[f.id] || f.supplier} 
                                        onValueChange={(v) => setManualSuppliers(prev => ({ ...prev, [f.id]: v }))}
                                      >
                                        <SelectTrigger className="h-7 text-[9px] py-0 px-2 bg-muted/30 border-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Sin Proveedor</SelectItem>
                                          {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <input 
                                      type="number" 
                                      disabled={orderToView.status === 'completed'}
                                      value={f.manualQty} 
                                      onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                                      className="w-full text-center font-black text-sm bg-muted/20 border rounded focus:outline-none"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={cn(
                                      "font-black text-[10px] px-1.5 py-0.5 rounded",
                                      f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {f.futureStock}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <p className="text-[10px] font-bold">{f.costARS > 0 ? `$${(f.manualQty * f.costARS).toLocaleString('es-AR')}` : `u$s ${(f.manualQty * f.costUSD).toLocaleString('es-AR')}`}</p>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="bg-slate-900 text-white p-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-black uppercase text-slate-400">Total ARS</p>
                              <h4 className="text-xl font-black">${purchaseCalculations?.totalARS.toLocaleString('es-AR')}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-black uppercase text-slate-400">Total USD</p>
                              <h4 className="text-xl font-black text-emerald-400">u$s {purchaseCalculations?.totalUSD.toLocaleString('es-AR')}</h4>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {orderToView.status === 'pending_purchase' && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-black h-12 shadow-lg" onClick={handleReceiveMaterials}>
                      <Truck className="mr-2 h-5 w-5" /> INGRESAR MATERIALES COMPRADOS
                    </Button>
                  )}
                </div>
              </section>
            </div>
          )}

          <DialogFooter className="mt-6 border-t pt-6">
            <Button variant="ghost" onClick={() => setOrderToView(null)} className="font-bold">Cerrar</Button>
            {orderToView?.status === 'ready' && (
              <Button onClick={handleAssembleFinal} className="bg-blue-600 hover:bg-blue-700 px-10 font-black shadow-xl h-12">
                <Hammer className="mr-2 h-5 w-5" /> FINALIZAR ARMADO Y SUMAR STOCK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start pr-8">
              <div>
                <DialogTitle className="text-2xl font-black font-headline text-primary">
                  {editingItemId ? 'Configurar Ítem' : 'Nuevo Ítem'}
                </DialogTitle>
                <DialogDescription>Gestión de precios, categoría y estructura de armado.</DialogDescription>
              </div>
              {editingItemId && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setProductToPreview(editingItemId ? items?.find(i => i.id === editingItemId) : null)}
                  className="text-primary border-primary/20"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Nombre del Producto / Servicio</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Dosificador G4" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Categoría</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Proveedor</Label>
                  <Select value={formData.supplier} onValueChange={(v) => setFormData({...formData, supplier: v})}>
                    <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">SIN PROVEEDOR</SelectItem>
                      {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                  <Switch checked={formData.isService} onCheckedChange={(v) => {
                    setFormData({...formData, isService: v, trackStock: !v && formData.trackStock, isCompuesto: v ? false : formData.isCompuesto});
                  }} />
                  <div>
                    <Label className="font-bold">Es un servicio técnico</Label>
                    <p className="text-[10px] text-muted-foreground">No controla stock ni tiene armado.</p>
                  </div>
                </div>

                {!formData.isService && (
                  <div className={cn("flex items-center gap-3 p-3 border rounded-lg transition-colors", formData.trackStock ? "bg-emerald-50/50 border-emerald-200" : "bg-blue-50/50 border-blue-200")}>
                    <Switch checked={formData.trackStock} onCheckedChange={(v) => setFormData({...formData, trackStock: v})} />
                    <div>
                      <Label className={cn("font-bold", formData.trackStock ? "text-emerald-800" : "text-blue-800")}>Controlar Stock de este ítem</Label>
                      <p className={cn("text-[10px]", formData.trackStock ? "text-emerald-600" : "text-blue-600")}>
                        {formData.trackStock ? "Descuenta unidades en cada venta." : "Producto de entrega directa (sin inventario)."}
                      </p>
                    </div>
                  </div>
                )}

                {!formData.isService && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-amber-50/50 border-amber-200">
                    <Switch checked={formData.isCompuesto} onCheckedChange={(v) => {
                      setFormData({...formData, isCompuesto: v, trackStock: v ? true : formData.trackStock});
                    }} />
                    <div>
                      <Label className="font-bold text-amber-800">Es un producto compuesto</Label>
                      <p className="text-[10px] text-amber-600">Se fabrica a partir de otros ítems.</p>
                    </div>
                  </div>
                )}
              </div>

              {!formData.isService && formData.trackStock && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-200">
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
                                {product?.trackStock !== false && (
                                  <span className="text-[9px] text-muted-foreground">Stock: {product?.stock || 0} | {product?.supplier || "---"}</span>
                                )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Categorías de Productos</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button onClick={handleSaveCategory}>{editingCategoryId ? "Actualizar" : "Agregar"}</Button>
              {editingCategoryId && <Button variant="ghost" onClick={cancelEditCategory}>Cancelar</Button>}
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleFavoriteCategory(cat)}>
                      <Star className={cn("h-4 w-4", cat.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    </Button>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCategory(cat)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'product_categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierManagerOpen} onOpenChange={setIsSupplierManagerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gestionar Proveedores</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Nombre del Proveedor</Label>
                  <Input placeholder="Ferretería Central..." value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Teléfono / WhatsApp</Label>
                  <Input placeholder="+54 9 11..." value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Dirección</Label>
                <Input placeholder="Av. Principal 123, Pilar..." value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} />
              </div>
              <Button onClick={handleSaveSupplier} className="w-full font-bold"><Plus className="h-4 w-4 mr-2" /> Guardar Proveedor</Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-xl p-2 bg-white">
              {sortedSuppliers.length === 0 ? (
                <p className="text-center py-10 text-xs text-muted-foreground italic">No hay proveedores registrados.</p>
              ) : (
                <div className="space-y-2">
                  {sortedSuppliers.map((sup: any) => (
                    <div key={sup.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-800">{sup.name}</span>
                          {sup.phone && <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-100">{sup.phone}</Badge>}
                        </div>
                        {sup.address && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {sup.address}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2 md:mt-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => {
                            setNewSupplierName(sup.name || "");
                            setNewSupplierPhone(sup.phone || "");
                            setNewSupplierAddress(sup.address || "");
                            deleteDocumentNonBlocking(doc(db, 'suppliers', sup.id));
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSupplier(sup.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssemblyOpen} onOpenChange={setIsAssemblyOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-black text-2xl">
              <Hammer className="h-6 w-6" /> Nueva Orden de Armado
            </DialogTitle>
            <DialogDescription>Planificación de fabricación para <b>{selectedForAssembly?.name}</b></DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-8">
            <section className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <Label className="font-black text-amber-800 uppercase tracking-widest text-xs">Cantidad a Fabricar</Label>
                <p className="text-xs text-amber-600">El sistema analizará el stock de todos los componentes recursivamente.</p>
              </div>
              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-inner">
                <Button variant="ghost" size="icon" onClick={() => setAssemblyQty(Math.max(1, assemblyQty - 1))} className="h-10 w-10 text-amber-600 hover:bg-amber-50">
                  <Minus className="h-5 w-5" />
                </Button>
                <input 
                  type="number" 
                  value={assemblyQty} 
                  onChange={(e) => setAssemblyQty(Number(e.target.value))} 
                  className="w-20 text-3xl font-black text-center text-amber-900 focus:outline-none"
                />
                <Button variant="ghost" size="icon" onClick={() => setAssemblyQty(assemblyQty + 1)} className="h-10 w-10 text-amber-600 hover:bg-amber-50">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </section>

            {explosionSummary && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Simulación de Insumos
                    </h3>
                    <Badge variant="outline" className="font-bold border-amber-200 text-amber-700 bg-amber-50">
                      {explosionSummary.all.length} COMPONENTES IMPACTADOS
                    </Badge>
                  </div>
                  <div className="border rounded-xl bg-white shadow-sm overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-[10px] uppercase">Componente</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase">Requerido</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase">Stock Disp.</TableHead>
                          <TableHead className="text-right font-black text-[10px] uppercase">Estado Post-Armado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {explosionSummary.all.map((req) => {
                          const stockRestante = req.available - req.required;
                          const esCritico = stockRestante < req.minStock;
                          const faltaDirecto = stockRestante < 0;

                          return (
                            <TableRow key={req.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{req.name}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase">{manualSuppliers[req.id] || req.supplier}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-black text-primary">{req.required}</TableCell>
                              <TableCell className="text-center font-medium text-slate-500">{req.available}</TableCell>
                              <TableCell className="text-right">
                                {faltaDirecto ? (
                                  <Badge className="bg-rose-600 font-bold text-[9px]">FALTA STOCK</Badge>
                                ) : esCritico ? (
                                  <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 font-bold text-[9px]">BAJO MÍNIMO</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 font-bold text-[9px]">OK</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" /> Carrito de Compras Sugerido
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs" onClick={() => { setManualPurchaseQtys({}); setManualSuppliers({}); }}>
                        <RefreshCw className="h-3.5 w-3.5" /> REINICIAR
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs"><Copy className="h-3.5 w-3.5" /> COPIAR LISTA</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyShoppingList()}>Lista Completa</DropdownMenuItem>
                          <div className="h-px bg-muted my-1" />
                          {Array.from(new Set(purchaseCalculations?.items.map(i => i.supplier))).map(sup => (
                            <DropdownMenuItem key={sup} onClick={() => handleCopyShoppingList(sup)}>{sup}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <Card className="border-2 border-slate-900/10 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingCart className="h-32 w-32" /></div>
                    <CardContent className="p-0">
                      {purchaseCalculations?.items.length === 0 ? (
                        <div className="p-12 text-center text-emerald-600 space-y-2">
                          <CheckCircle2 className="h-12 w-12 mx-auto" />
                          <p className="font-black">MATERIALES SUFICIENTES</p>
                          <p className="text-xs text-muted-foreground italic">No se requieren compras para esta orden.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-900 text-white">
                              <TableRow>
                                <TableHead className="text-white text-[9px] font-black uppercase">Material / Proveedor</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-center w-20">A Comprar</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-center">Post-Armado</TableHead>
                                <TableHead className="text-white text-[9px] font-black uppercase text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchaseCalculations?.items.map(f => (
                                <TableRow key={f.id} className="hover:bg-muted/5">
                                  <TableCell className="py-2">
                                    <p className="font-bold text-xs">{f.name}</p>
                                    <div className="mt-1">
                                      <Select 
                                        value={manualSuppliers[f.id] || f.supplier} 
                                        onValueChange={(v) => setManualSuppliers(prev => ({ ...prev, [f.id]: v }))}
                                      >
                                        <SelectTrigger className="h-7 text-[9px] py-0 px-2 bg-muted/30 border-none">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Sin Proveedor</SelectItem>
                                          {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <input 
                                      type="number" 
                                      value={f.manualQty} 
                                      onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                                      className="w-full text-center font-black text-sm bg-muted/20 border rounded focus:outline-none"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={cn(
                                      "font-black text-[10px] px-1.5 py-0.5 rounded",
                                      f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {f.futureStock}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {f.costARS > 0 && <p className="text-xs font-black text-slate-800">${(f.manualQty * f.costARS).toLocaleString('es-AR')}</p>}
                                    {f.costUSD > 0 && <p className="text-xs font-bold text-emerald-700">u$s {(f.manualQty * f.costUSD).toLocaleString('es-AR')}</p>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="bg-slate-900 text-white p-6 grid grid-cols-2 gap-8 border-t border-slate-800">
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Inversión Definida ARS</p>
                              <h4 className="text-3xl font-black">${purchaseCalculations?.totalARS.toLocaleString('es-AR')}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Inversión Definida USD</p>
                              <h4 className="text-3xl font-black text-emerald-400">u$s {purchaseCalculations?.totalUSD.toLocaleString('es-AR')}</h4>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 border-t pt-6">
            <Button variant="ghost" onClick={() => setIsAssemblyOpen(false)} className="font-bold">Cancelar</Button>
            <Button 
              onClick={handleCreateOrder} 
              className="px-10 font-black shadow-xl h-12 bg-primary text-white"
            >
              <ClipboardList className="mr-2 h-5 w-5" /> GUARDAR COMO ORDEN DE PRODUCCIÓN
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

      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => { if(!o) setOrderToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden de producción?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción borrará la planificación de esta orden. No afectará el stock actual.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive">Eliminar Orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FICHA TÉCNICA (INVISIBLE EN PANTALLA, SOLO PARA IMPRESIÓN) */}
      {productToPreview && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Ficha Técnica de Producto</h1>
              </div>
              <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Dosimat Pro System • Control de Ingeniería</p>
            </div>
            <div className="text-right space-y-1">
              <Badge className="bg-slate-900 text-white font-black px-4 py-1 rounded-none uppercase tracking-widest text-xs">Documento Oficial</Badge>
              <p className="text-[10px] font-black text-slate-400">REF ID: {productToPreview.id.toUpperCase()}</p>
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
            <div className="space-y-6">
              <div>
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 block">Nombre del Ítem</Label>
                <h2 className="text-4xl font-black text-slate-900 leading-tight">{productToPreview.name}</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 block">Categoría</Label>
                  <p className="font-bold text-lg">{categoryMap[productToPreview.categoryId] || "General"}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 block">Tipo</Label>
                  <p className="font-bold text-lg">{productToPreview.isService ? 'Servicio Técnico' : 'Producto Físico'}</p>
                </div>
              </div>
              {productToPreview.description && (
                <div>
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 block">Especificaciones Generales</Label>
                  <p className="text-sm text-slate-700 leading-relaxed border-l-4 border-slate-200 pl-4 py-1 italic">{productToPreview.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-6 border-2 border-slate-900 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Coins className="h-24 w-24" /></div>
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 block">Lista de Precios Vigente</Label>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-baseline border-b border-slate-200 pb-2">
                    <span className="text-xs font-black uppercase">P. Venta ARS:</span>
                    <span className="text-3xl font-black">${(productToPreview.priceARS || 0).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black uppercase">P. Venta USD:</span>
                    <span className="text-3xl font-black text-emerald-700">u$s {(productToPreview.priceUSD || 0).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/50 p-4 border border-slate-200 rounded-xl">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 block">Costo Total Estimado</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Costo ARS</span>
                    <span className="font-black text-slate-700">${(productToPreview.calculatedCostARS || 0).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex flex-col border-l pl-4 border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Costo USD</span>
                    <span className="font-black text-emerald-700">u$s {(productToPreview.calculatedCostUSD || 0).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {productToPreview.isCompuesto && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-slate-900" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Estructura de Armado (BOM)</h3>
                </div>
                <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-900">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-white font-black uppercase text-[10px]">Componente / Referencia</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] text-center w-24">Cantidad</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] text-right">Costo Unit.</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] text-right">Subtotal Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productToPreview.components?.map((comp: any, idx: number) => {
                        const child = items?.find(i => i.id === comp.productId);
                        const cost = child ? calculateCost(child, items || []) : { ars: 0, usd: 0 };
                        const currencySymbol = child?.costARS > 0 ? '$' : 'u$s';
                        const unitCostValue = child?.costARS > 0 ? cost.ars : cost.usd;
                        const subtotalCostValue = unitCostValue * comp.quantity;

                        return (
                          <TableRow key={idx} className="border-b border-slate-200">
                            <TableCell>
                              <p className="font-black text-sm">{child?.name || 'Cargando...'}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{child?.supplier || 'Sin Proveedor Especificado'}</p>
                            </TableCell>
                            <TableCell className="text-center font-black text-lg">{comp.quantity}</TableCell>
                            <TableCell className="text-right font-bold text-xs">
                              {currencySymbol} {unitCostValue.toLocaleString('es-AR')}
                            </TableCell>
                            <TableCell className="text-right font-black text-sm">
                              {currencySymbol} {subtotalCostValue.toLocaleString('es-AR')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {productToPreview.laborCostARS > 0 || productToPreview.laborCostUSD > 0 ? (
                        <TableRow className="bg-slate-50">
                          <TableCell className="font-black text-xs uppercase italic">Gastos de Ensamblado / Mano de Obra</TableCell>
                          <TableCell className="text-center">---</TableCell>
                          <TableCell className="text-right font-bold text-xs">---</TableCell>
                          <TableCell className="text-right font-black text-sm">
                            {productToPreview.laborCostARS > 0 
                              ? `$ ${Number(productToPreview.laborCostARS).toLocaleString('es-AR')}`
                              : `u$s ${Number(productToPreview.laborCostUSD).toLocaleString('es-AR')}`}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {productToPreview.components?.some((c: any) => items?.find(i => i.id === c.productId)?.isCompuesto) && (
                <section className="space-y-6 pt-6 border-t-2 border-dashed border-slate-200">
                  <div className="flex items-center gap-3">
                    <Factory className="h-5 w-5 text-slate-900" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Desglose de Partes Compuestas</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    {productToPreview.components.filter((c: any) => items?.find(i => i.id === c.productId)?.isCompuesto).map((comp: any, idx: number) => {
                      const child = items?.find(i => i.id === comp.productId);
                      return (
                        <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                          <h4 className="font-black text-slate-800 mb-4 border-b pb-2 flex justify-between">
                            <span>{child.name.toUpperCase()} (Estructura Interna)</span>
                            <Badge variant="outline" className="border-slate-900 font-black">X {comp.quantity} UNIDADES</Badge>
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b-2 border-slate-300">
                                <TableHead className="font-black text-slate-900 text-[9px] uppercase">Pieza Interna</TableHead>
                                <TableHead className="font-black text-slate-900 text-[9px] uppercase text-center">Cant. x Unidad</TableHead>
                                <TableHead className="font-black text-slate-900 text-[9px] uppercase text-right">Costo Unit. Ref.</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {child.components?.map((subComp: any, sidx: number) => {
                                const subChild = items?.find(i => i.id === subComp.productId);
                                const subCost = subChild ? calculateCost(subChild, items || []) : { ars: 0, usd: 0 };
                                const subCurrency = subChild?.costARS > 0 ? '$' : 'u$s';
                                const subUnitCost = subChild?.costARS > 0 ? subCost.ars : subCost.usd;

                                return (
                                  <TableRow key={sidx} className="border-b border-slate-200/50">
                                    <TableCell className="py-2">
                                      <p className="font-bold text-xs text-slate-700">{subChild?.name || '---'}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-900">{subComp.quantity}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-500 italic">
                                      {subCurrency} {subUnitCost.toLocaleString('es-AR')}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="mt-20 pt-12 border-t border-slate-200">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400">Generado el: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro v2.5 • Ingeniería de Procesos</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

  function toggleFavoriteCategory(cat: any) {
    updateDocumentNonBlocking(doc(db, 'product_categories', cat.id), {
      isFavorite: !cat.isFavorite
    });
  }

  function handleEditCategory(cat: any) {
    setEditingCategoryId(cat.id)
    setNewCategoryName(cat.name)
  }

  function cancelEditCategory() {
    setEditingCategoryId(null)
    setNewCategoryName("")
  }

  function confirmDeleteOrder() {
    if (!orderToDelete) return
    deleteDocumentNonBlocking(doc(db, 'production_orders', orderToDelete.id))
    setOrderToDelete(null)
    toast({ title: "Orden eliminada" })
  }

  function confirmDelete() {
    if (!itemToDelete) return
    deleteDocumentNonBlocking(doc(db, 'products_services', itemToDelete.id))
    setItemToDelete(null)
    toast({ title: "Item eliminado" })
  }
}
