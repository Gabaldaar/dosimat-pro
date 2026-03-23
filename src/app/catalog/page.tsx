
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
  Droplet,
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
  MapPin,
  Save,
  Calculator,
  Beaker
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
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [auditSearch, setAuditSearch] = useState("")
  const [auditCategoryFilter, setAuditCategoryFilter] = useState("all")
  
  const [itemToDelete, setItemToDelete] = useState<any | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedForAssembly, setSelectedForAssembly] = useState<any | null>(null)
  const [assemblyQty, setAssemblyQty] = useState(1)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const [newSupplierName, setNewSupplierName] = useState("")
  const [newSupplierPhone, setNewSupplierPhone] = useState("")
  const [newSupplierAddress, setNewSupplierAddress] = useState("")
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [productToPreview, setProductToPreview] = useState<any | null>(null)
  const [orderToView, setOrderToView] = useState<any | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null)
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false)
  
  const [bomFilterCategory, setBomFilterCategory] = useState("all")

  const [manualPurchaseQtys, setManualPurchaseQtys] = useState<Record<string, number>>({})
  const [manualSuppliers, setManualSuppliers] = useState<Record<string, string>>({})
  const [initialPlanData, setInitialPlanData] = useState({ qtys: {}, sups: {} })

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
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isCategoryManagerOpen || isSupplierManagerOpen || !!productToPreview || !!orderToView || !!orderToDelete || isAuditOpen || isExitAlertOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isCategoryManagerOpen, isSupplierManagerOpen, productToPreview, orderToView, orderToDelete, isAuditOpen, isExitAlertOpen]);

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
      toBuySuggested: flatList.filter(f => f.suggestedToBuy > 0 || (orderToView?.purchaseQtys?.[f.id] > 0))
    };
  }, [selectedForAssembly, assemblyQty, items, orderToView]);

  useEffect(() => {
    if (orderToView && explosionSummary) {
      const newManualQtys: Record<string, number> = {};
      const newManualSups: Record<string, string> = {};
      
      explosionSummary.toBuySuggested.forEach(item => {
        newManualQtys[item.id] = orderToView.purchaseQtys?.[item.id] ?? item.suggestedToBuy;
        newManualSups[item.id] = orderToView.purchaseSuppliers?.[item.id] ?? (item.supplier || "Sin Proveedor");
      });
      
      setManualPurchaseQtys(newManualQtys);
      setManualSuppliers(newManualSups);
      setInitialPlanData({ qtys: JSON.parse(JSON.stringify(newManualQtys)), sups: JSON.parse(JSON.stringify(newManualSups)) });
    } else if (isAssemblyOpen && !orderToView && explosionSummary) {
      const newManualQtys: Record<string, number> = {};
      const newManualSups: Record<string, string> = {};
      explosionSummary.toBuySuggested.forEach(item => {
        newManualQtys[item.id] = item.suggestedToBuy;
        newManualSups[item.id] = item.supplier || "Sin Proveedor";
      });
      setManualPurchaseQtys(newManualQtys);
      setManualSuppliers(newManualSups);
    }
  }, [isAssemblyOpen, orderToView, explosionSummary]);

  const hasUnsavedChanges = useMemo(() => {
    if (!orderToView) return false;
    return JSON.stringify(manualPurchaseQtys) !== JSON.stringify(initialPlanData.qtys) ||
           JSON.stringify(manualSuppliers) !== JSON.stringify(initialPlanData.sups);
  }, [manualPurchaseQtys, manualSuppliers, initialPlanData, orderToView]);

  const handleCloseOrderView = () => {
    if (hasUnsavedChanges) {
      setIsExitAlertOpen(true);
    } else {
      setOrderToView(null);
    }
  };

  const purchaseCalculations = useMemo(() => {
    if (!explosionSummary || !items) return null;

    const itemsToBuy = explosionSummary.toBuySuggested.map(item => {
      const manualQty = manualPurchaseQtys[item.id] ?? item.suggestedToBuy;
      const futureStock = item.available + manualQty - item.required;
      const isCritical = futureStock < item.minStock;
      const isInsufficient = futureStock < 0;
      const currentSupplier = manualSuppliers[item.id] || (item.supplier || "Sin Proveedor");

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

  const handleUpdateOrderPlan = () => {
    if (!orderToView) return;
    
    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      purchaseQtys: manualPurchaseQtys,
      purchaseSuppliers: manualSuppliers
    });

    setInitialPlanData({ qtys: JSON.parse(JSON.stringify(manualPurchaseQtys)), sups: JSON.parse(JSON.stringify(manualSuppliers)) });
    toast({ title: "Planificación actualizada", description: "Se han guardado las cantidades y proveedores en la orden." });
  }

  const handleReceiveMaterials = (supplierName: string) => {
    if (!orderToView || !purchaseCalculations) return;

    const newPurchaseQtys = { ...manualPurchaseQtys };
    const itemsToProcess = purchaseCalculations.items.filter(i => (i.supplier || "Sin Proveedor") === supplierName);

    itemsToProcess.forEach(item => {
      if (item.manualQty > 0) {
        updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
          stock: increment(item.manualQty)
        });
        newPurchaseQtys[item.id] = 0;
      }
    });

    setManualPurchaseQtys(newPurchaseQtys);
    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      purchaseQtys: newPurchaseQtys,
      purchaseSuppliers: manualSuppliers
    });

    setInitialPlanData(prev => ({ ...prev, qtys: JSON.parse(JSON.stringify(newPurchaseQtys)) }));
    toast({ title: `Materiales de ${supplierName} ingresados`, description: "Se actualizó el stock y se descuentaron de la lista de pendientes." });
  }

  const handleUpdateStockAudit = (id: string, newStock: number) => {
    updateDocumentNonBlocking(doc(db, 'products_services', id), { stock: newStock });
    toast({ title: "Stock actualizado", description: "Recuento guardado." });
  }

  const handleAssembleFinal = () => {
    if (!orderToView || !items) return;
    const target = items.find(i => i.id === orderToView.productId);
    if (!target) return;

    const confirmAssembly = confirm(`¿Finalizar armado de ${orderToView.quantity} unidades de ${orderToView.productName}? Se descontarán todos los insumos del stock.`);
    if (!confirmAssembly) return;

    const explodeAndSubtract = (productId: string, qtyToSubtract: number) => {
      const item = items.find(i => i.id === productId);
      if (!item) return;

      if (item.trackStock !== false) {
        updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
          stock: increment(-qtyToSubtract)
        });
      }

      if (item.isCompuesto) {
        item.components?.forEach((comp: any) => {
          explodeAndSubtract(comp.productId, comp.quantity * qtyToSubtract);
        });
      }
    };

    explodeAndSubtract(target.id, orderToView.quantity);

    updateDocumentNonBlocking(doc(db, 'products_services', target.id), {
      stock: increment(orderToView.quantity)
    });

    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      status: 'completed'
    });

    setOrderToView(null);
    toast({ title: "Armado completado", description: "Insumos descontados y producto final sumado al stock." });
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

  const handleCopyShoppingList = (supplierFilter: string) => {
    if (!purchaseCalculations) return;
    const dateStr = new Date().toLocaleDateString('es-AR');
    const targetOrder = orderToView || { productName: selectedForAssembly?.name, quantity: assemblyQty };
    
    let text = `*LISTA DE COMPRAS - DOSIMAT PRO*\n`;
    text += `Para: ${targetOrder.quantity} x ${targetOrder.productName}\n`;
    text += `PROVEEDOR: ${supplierFilter.toUpperCase()}\n`;
    
    const supObj = suppliers?.find(s => s.name === supplierFilter);
    if (supObj) {
      if (supObj.phone) text += `Tel: ${supObj.phone}\n`;
      if (supObj.address) text += `Dir: ${supObj.address}\n`;
    }
    
    text += `Fecha: ${dateStr}\n\n`;
    
    const itemsToInclude = purchaseCalculations.items.filter(i => (i.supplier || "Sin Proveedor") === supplierFilter);

    if (itemsToInclude.length === 0) {
      toast({ title: "Sin ítems", description: "No hay faltantes para este proveedor." });
      return;
    }

    const sortedItemsToInclude = [...itemsToInclude].sort((a, b) => a.name.localeCompare(b.name));

    sortedItemsToInclude.forEach(f => {
      text += `- *${f.name}*: ${f.manualQty} unidades.\n`;
    });

    const ars = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * i.costARS), 0);
    const usd = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * i.costUSD), 0);

    text += `\n*INVERSIÓN ESTIMADA:*\n`;
    if (ars > 0) text += `ARS: $${ars.toLocaleString('es-AR')}\n`;
    if (usd > 0) text += `USD: u$s ${usd.toLocaleString('es-AR')}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Lista de compras copiada", description: `Lista filtrada para ${supplierFilter}.` });
  }

  const handleExportBOM = useCallback((item: any) => {
    const originalTitle = document.title;
    document.title = `BOM_${item.name.replace(/\s+/g, '_')}`;
    window.print();
    document.title = originalTitle;
  }, []);

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

  const GroupedPurchaseList = () => {
    if (!purchaseCalculations) return null;

    const itemsBySupplier = useMemo(() => {
      const groups: Record<string, typeof purchaseCalculations.items> = {};
      purchaseCalculations.items.forEach(item => {
        const sup = item.supplier || "Sin Proveedor";
        if (!groups[sup]) groups[sup] = [];
        groups[sup].push(item);
      });
      Object.keys(groups).forEach(sup => {
        groups[sup].sort((a, b) => a.name.localeCompare(b.name));
      });
      return groups;
    }, [purchaseCalculations.items]);

    const supplierNames = Object.keys(itemsBySupplier).sort();

    return (
      <div className="space-y-10">
        {supplierNames.length === 0 ? (
          <div className="p-12 text-center text-emerald-600 bg-white border rounded-xl space-y-2">
            <CheckCircle2 className="h-12 w-12 mx-auto" />
            <p className="font-black">MATERIALES LISTOS</p>
            <p className="text-xs text-muted-foreground italic">Tienes todo lo necesario para empezar el armado.</p>
          </div>
        ) : (
          supplierNames.map(sup => {
            const items = itemsBySupplier[sup];
            const groupARS = items.reduce((sum, i) => sum + (i.manualQty * i.costARS), 0);
            const groupUSD = items.reduce((sum, i) => sum + (i.manualQty * i.costUSD), 0);

            return (
              <div key={sup} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-white">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{sup}</h4>
                      <p className="text-[10px] text-muted-foreground font-bold">{items.length} ÍTEMS PENDIENTES</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-2 font-bold text-xs flex-1 md:flex-none" 
                      onClick={() => handleCopyShoppingList(sup)}
                    >
                      <Copy className="h-3.5 w-3.5" /> COPIAR
                    </Button>
                    {orderToView?.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs flex-1 md:flex-none" 
                        onClick={() => handleReceiveMaterials(sup)}
                        disabled={items.every(i => i.manualQty <= 0)}
                      >
                        <Save className="h-3.5 w-3.5" /> INGRESAR COMPRA
                      </Button>
                    )}
                  </div>
                </div>

                {/* VISTA TABLA (DESKTOP) */}
                <div className="hidden md:block border-2 rounded-xl bg-white shadow-md overflow-hidden">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-24">Cantidad</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-24">Proveedor</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-24">Post-Stock</TableHead>
                        <TableHead className="text-right font-black text-[9px] uppercase w-32">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(f => (
                        <TableRow key={f.id} className="hover:bg-muted/5">
                          <TableCell>
                            <p className="font-bold text-xs">{f.name}</p>
                            <p className="text-[8px] text-muted-foreground uppercase">Disp: {f.available} / Req: {f.required}</p>
                          </TableCell>
                          <TableCell>
                            <input 
                              type="number" 
                              disabled={orderToView?.status === 'completed'}
                              value={manualPurchaseQtys[f.id] ?? f.suggestedToBuy} 
                              onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                              className="w-full text-center font-black text-sm bg-muted/30 border-none rounded py-1 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              disabled={orderToView?.status === 'completed'}
                              value={manualSuppliers[f.id] || (f.supplier || "Sin Proveedor")} 
                              onValueChange={(v) => setManualSuppliers(prev => ({ ...prev, [f.id]: v }))}
                            >
                              <SelectTrigger className="h-7 text-[9px] py-0 px-2 bg-muted/30 border-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-black text-[10px] px-2 py-0.5 rounded",
                              f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {f.futureStock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="text-[10px] font-bold">
                              {f.costARS > 0 ? `$${(f.manualQty * f.costARS).toLocaleString('es-AR')}` : `u$s ${(f.manualQty * f.costUSD).toLocaleString('es-AR')}`}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="bg-slate-50 border-t p-3 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS:</span>
                      <span className="font-black text-xs">${groupARS.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD:</span>
                      <span className="font-black text-xs text-emerald-700">u$s {groupUSD.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* VISTA TARJETAS (MOBILE) */}
                <div className="md:hidden space-y-2">
                  {items.map(f => (
                    <Card key={f.id} className="p-2.5 bg-white border shadow-sm space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs leading-tight truncate">{f.name}</p>
                          <p className="text-[8px] text-muted-foreground uppercase mt-0.5">Disp: {f.available} / Req: {f.required}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-tighter",
                            f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            Stock Post: {f.futureStock}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-muted-foreground">Cant. Compra</Label>
                          <input 
                            type="number" 
                            disabled={orderToView?.status === 'completed'}
                            value={manualPurchaseQtys[f.id] ?? f.suggestedToBuy} 
                            onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                            className="w-full text-center font-black text-sm bg-muted/30 border rounded h-8 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-muted-foreground">Proveedor</Label>
                          <Select 
                            disabled={orderToView?.status === 'completed'}
                            value={manualSuppliers[f.id] || (f.supplier || "Sin Proveedor")} 
                            onValueChange={(v) => setManualSuppliers(prev => ({ ...prev, [f.id]: v }))}
                          >
                            <SelectTrigger className="h-8 text-[10px] bg-white border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                              {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 -mx-2.5 -mb-2.5 p-1.5 rounded-b-lg border-t">
                        <span className="text-[8px] font-black uppercase text-slate-400">Subtotal Compra</span>
                        <span className="font-black text-[10px]">
                          {f.costARS > 0 ? `$${(f.manualQty * f.costARS).toLocaleString('es-AR')}` : `u$s ${(f.manualQty * f.costUSD).toLocaleString('es-AR')}`}
                        </span>
                      </div>
                    </Card>
                  ))}
                  <div className="p-2.5 bg-slate-900 rounded-xl text-white space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS</span>
                      <span className="font-black text-xs">${groupARS.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-1">
                      <span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD</span>
                      <span className="font-black text-xs text-emerald-400">u$s {groupUSD.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

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
            
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={activeView} onValueChange={setActiveTab} className="bg-muted/50 p-1 rounded-xl border">
                <TabsList className="bg-transparent h-9">
                  <TabsTrigger value="inventory" className="text-[10px] font-black h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">Stock</TabsTrigger>
                  <TabsTrigger value="orders" className="text-[10px] font-black h-7 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">Producción</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="w-px h-6 bg-border mx-2 hidden md:block" />
              <div className="flex gap-2">
                <Button variant="outline" className="font-bold gap-2" onClick={() => setIsAuditOpen(true)}>
                  <Calculator className="h-4 w-4" /> <span className="hidden sm:inline">AUDITORÍA / BALANCES</span>
                </Button>
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
                    <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nuevo Ítem</span><span className="sm:hidden">Nuevo</span>
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
                                    onClick={(e) => { e.stopPropagation(); handleExportBOM(item); }} 
                                    title="Ver Ficha / Exportar"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleExportBOM(item)}><Printer className="mr-2 h-4 w-4" /> Exportar Ficha (PDF)</DropdownMenuItem>
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

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 pb-1 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-800">
              <Calculator className="h-5 w-5 text-primary" /> Auditoría de Stock
            </DialogTitle>
            <DialogDescription className="text-xs">Ajusta los niveles de inventario rápidamente.</DialogDescription>
          </DialogHeader>
          <div className="px-4 py-1 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar material..." 
                  className="pl-9 h-9 text-sm"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
              <Select value={auditCategoryFilter} onValueChange={setAuditCategoryFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto">
            <div className="space-y-1.5 md:hidden">
              {items?.filter(i => 
                !i.isService && 
                i.trackStock !== false && 
                i.name.toLowerCase().includes(auditSearch.toLowerCase()) &&
                (auditCategoryFilter === "all" || i.categoryId === auditCategoryFilter)
              ).sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                <Card key={item.id} className="p-2.5 flex items-center justify-between gap-3 bg-white border shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate leading-tight">{item.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-0.5">
                      Stock actual: <span className="font-black text-primary">{item.stock || 0}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Label className="text-[8px] font-black uppercase text-muted-foreground">Nuevo:</Label>
                    <Input 
                      type="number" 
                      className="w-16 h-8 text-right font-black px-2 text-sm" 
                      defaultValue={item.stock || 0}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== item.stock) handleUpdateStockAudit(item.id, val);
                      }}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-hidden">
              <Table className="min-w-[500px]">
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase h-8">Artículo</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase w-32 h-8">Stock Actual</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase w-40 h-8">Nuevo Recuento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.filter(i => 
                    !i.isService && 
                    i.trackStock !== false && 
                    i.name.toLowerCase().includes(auditSearch.toLowerCase()) &&
                    (auditCategoryFilter === "all" || i.categoryId === auditCategoryFilter)
                  ).sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                    <TableRow key={item.id} className="h-10 hover:bg-muted/5 transition-colors">
                      <TableCell className="py-1">
                        <p className="font-bold text-xs">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{categoryMap[item.categoryId] || 'S/C'}</p>
                      </TableCell>
                      <TableCell className="text-center font-black text-primary text-xs">{item.stock || 0}</TableCell>
                      <TableCell className="text-right py-1">
                        <div className="flex items-center justify-end gap-2">
                          <Input 
                            type="number" 
                            className="w-20 text-right font-black h-8 text-xs" 
                            defaultValue={item.stock || 0}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== item.stock) handleUpdateStockAudit(item.id, val);
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter className="p-3 bg-slate-50 border-t shrink-0">
            <Button onClick={() => setIsAuditOpen(false)} className="w-full h-9 font-bold text-xs">Cerrar Auditoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 pb-1 shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start pr-8 gap-2">
              <div>
                <DialogTitle className="flex items-center gap-2 text-primary font-black text-xl">
                  <Factory className="h-5 w-5" /> Orden #{orderToView?.id.toUpperCase().slice(0, 6)}
                </DialogTitle>
                <DialogDescription className="text-xs">Fabricación de <b>{orderToView?.quantity} x {orderToView?.productName}</b></DialogDescription>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto">
                {orderToView && (
                  <Badge className={cn(
                    "font-black uppercase tracking-widest text-[9px] px-2 py-0.5",
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
                {orderToView?.status !== 'completed' && (
                  <Button variant={hasUnsavedChanges ? "default" : "outline"} size="sm" className={cn("h-7 gap-1 font-bold text-[10px] px-2", hasUnsavedChanges && "bg-primary animate-pulse")} onClick={handleUpdateOrderPlan}>
                    <Save className="h-3 w-3" /> GUARDAR {hasUnsavedChanges && "*"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-1 space-y-6">
            {orderToView && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" /> Explosión de Insumos
                    </h3>
                    
                    {/* MOBILE EXPLOSION */}
                    <div className="grid grid-cols-1 gap-1.5 md:hidden">
                      {explosionSummary?.all.sort((a,b) => a.name.localeCompare(b.name)).map(req => {
                        const stockRestante = req.available - req.required;
                        const esCritico = stockRestante < req.minStock;
                        const faltaDirecto = stockRestante < 0;
                        return (
                          <Card key={req.id} className="p-2 bg-white shadow-sm border flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate leading-tight">{req.name}</p>
                              <p className="text-[8px] text-muted-foreground uppercase truncate mt-0.5">{(manualSuppliers[req.id] || req.supplier) || "Sin Proveedor"}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-center px-2 py-0.5 bg-muted/30 rounded border">
                                <p className="text-[7px] font-black text-slate-400 uppercase">Req/Disp</p>
                                <p className="text-[10px] font-black">{req.required}/{req.available}</p>
                              </div>
                              {faltaDirecto ? <Badge className="bg-rose-600 text-[7px] h-4 leading-none uppercase font-black px-1.5">FALTA</Badge> : 
                               esCritico ? <Badge variant="outline" className="text-amber-600 border-amber-200 text-[7px] h-4 leading-none uppercase font-black px-1.5">BAJO</Badge> : 
                               <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                            </div>
                          </Card>
                        )
                      })}
                    </div>

                    {/* DESKTOP EXPLOSION */}
                    <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-x-auto">
                      <Table className="min-w-[500px]">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[9px] font-black uppercase h-8">Pieza / Material</TableHead>
                            <TableHead className="text-center text-[9px] font-black uppercase h-8">Req.</TableHead>
                            <TableHead className="text-center text-[9px] font-black uppercase h-8">Stock Actual</TableHead>
                            <TableHead className="text-right text-[9px] font-black uppercase h-8">Disponibilidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {explosionSummary?.all.sort((a,b) => a.name.localeCompare(b.name)).map(req => {
                            const stockRestante = req.available - req.required;
                            const esCritico = stockRestante < req.minStock;
                            const faltaDirecto = stockRestante < 0;
                            return (
                              <TableRow key={req.id} className="h-9">
                                <TableCell className="py-1">
                                  <p className="font-bold text-xs">{req.name}</p>
                                  <p className="text-[8px] text-muted-foreground uppercase">{(manualSuppliers[req.id] || req.supplier) || "Sin Proveedor"}</p>
                                </TableCell>
                                <TableCell className="text-center font-black text-primary text-xs">{req.required}</TableCell>
                                <TableCell className="text-center text-xs">{req.available}</TableCell>
                                <TableCell className="text-right">
                                  {faltaDirecto ? <Badge className="bg-rose-600 text-[8px] h-4 leading-none py-0 px-1 whitespace-nowrap">FALTA STOCK</Badge> : 
                                   esCritico ? <Badge variant="outline" className="text-amber-600 border-amber-200 text-[8px] h-4 leading-none py-0 px-1 whitespace-nowrap">BAJO MÍNIMO</Badge> : 
                                   <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="h-3.5 w-3.5" /> Plan de Compras por Proveedor
                    </h3>
                    <GroupedPurchaseList />
                  </div>
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-3">
              <div className="flex gap-4">
                <div className="text-left">
                  <p className="text-[7px] font-black uppercase text-slate-400">Inversión ARS</p>
                  <p className="text-lg font-black">${purchaseCalculations?.totalARS.toLocaleString('es-AR')}</p>
                </div>
                <div className="text-left border-l pl-4 border-slate-200">
                  <p className="text-[7px] font-black uppercase text-slate-400">Inversión USD</p>
                  <p className="text-lg font-black text-emerald-600">u$s {purchaseCalculations?.totalUSD.toLocaleString('es-AR')}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="ghost" onClick={handleCloseOrderView} className="font-bold text-xs h-10 flex-1 md:flex-none">Cerrar</Button>
                {orderToView?.status === 'ready' && (
                  <Button onClick={handleAssembleFinal} className="bg-blue-600 hover:bg-blue-700 px-6 font-black shadow-lg h-10 flex-1 md:flex-none text-xs">
                    <Hammer className="mr-2 h-4 w-4" /> FINALIZAR ARMADO
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTAS DE SALIDA */}
      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar cambios antes de salir?</AlertDialogTitle>
            <AlertDialogDescription>
              Has realizado modificaciones en la planificación de esta orden que no han sido guardadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsExitAlertOpen(false); setOrderToView(null); }}>Descartar cambios</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleUpdateOrderPlan(); setIsExitAlertOpen(false); setOrderToView(null); }}>Guardar y Salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw]">
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
                  onClick={() => handleExportBOM(items?.find(i => i.id === editingItemId))}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
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
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 pb-1 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-black text-xl">
              <Hammer className="h-5 w-5" /> Nueva Orden de Armado
            </DialogTitle>
            <DialogDescription className="text-xs">Planificación para <b>{selectedForAssembly?.name}</b></DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-6">
            <section className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="space-y-0.5 text-center md:text-left">
                <Label className="font-black text-amber-800 uppercase tracking-widest text-[10px]">Cantidad a Fabricar</Label>
                <p className="text-[10px] text-amber-600">Se analizará el stock recursivamente.</p>
              </div>
              <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border shadow-inner">
                <Button variant="ghost" size="icon" onClick={() => setAssemblyQty(Math.max(1, assemblyQty - 1))} className="h-8 w-8 text-amber-600">
                  <Minus className="h-4 w-4" />
                </Button>
                <input 
                  type="number" 
                  value={assemblyQty} 
                  onChange={(e) => setAssemblyQty(Number(e.target.value))} 
                  className="w-14 text-xl font-black text-center text-amber-900 focus:outline-none"
                />
                <Button variant="ghost" size="icon" onClick={() => setAssemblyQty(assemblyQty + 1)} className="h-8 w-8 text-amber-600">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>

            {explosionSummary && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" /> Simulación de Insumos
                    </h3>
                    <Badge variant="outline" className="font-bold border-amber-200 text-amber-700 bg-amber-50 text-[9px]">
                      {explosionSummary.all.length} COMPONENTES
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1.5 md:hidden">
                    {explosionSummary.all.sort((a,b) => a.name.localeCompare(b.name)).map((req) => {
                      const stockRestante = req.available - req.required;
                      const esCritico = stockRestante < req.minStock;
                      const faltaDirecto = stockRestante < 0;
                      return (
                        <Card key={req.id} className="p-2 border shadow-sm flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate leading-tight">{req.name}</p>
                            <p className="text-[8px] text-muted-foreground uppercase truncate mt-0.5">{(manualSuppliers[req.id] || req.supplier) || "Sin Proveedor"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-center px-1.5 py-0.5 bg-muted/20 rounded">
                              <p className="text-[10px] font-black text-primary">{req.required}/{req.available}</p>
                            </div>
                            {faltaDirecto ? <Badge className="bg-rose-600 text-[7px] px-1.5">FALTA</Badge> : 
                             esCritico ? <Badge variant="outline" className="text-amber-600 border-amber-200 text-[7px] px-1.5">BAJO</Badge> : 
                             <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-[10px] uppercase h-8">Componente</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase h-8">Requerido</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase h-8">Stock Disp.</TableHead>
                          <TableHead className="text-right font-black text-[10px] uppercase h-8">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {explosionSummary.all.sort((a,b) => a.name.localeCompare(b.name)).map((req) => {
                          const stockRestante = req.available - req.required;
                          const esCritico = stockRestante < req.minStock;
                          const faltaDirecto = stockRestante < 0;

                          return (
                            <TableRow key={req.id} className="h-9">
                              <TableCell className="py-1">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">{req.name}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase">{(manualSuppliers[req.id] || req.supplier) || "Sin Proveedor"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-black text-primary text-xs">{req.required}</TableCell>
                              <TableCell className="text-center font-medium text-slate-500 text-xs">{req.available}</TableCell>
                              <TableCell className="text-right">
                                {faltaDirecto ? (
                                  <Badge className="bg-rose-600 font-bold text-[8px] h-4">FALTA STOCK</Badge>
                                ) : esCritico ? (
                                  <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 font-bold text-[8px] h-4">BAJO MÍNIMO</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 font-bold text-[8px] h-4">OK</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="h-3.5 w-3.5" /> Carrito de Compras
                    </h3>
                    <Button variant="outline" size="sm" className="h-7 gap-1 font-bold text-[10px]" onClick={() => { setManualPurchaseQtys({}); setManualSuppliers({}); }}>
                      <RefreshCw className="h-3 w-3" /> REINICIAR
                    </Button>
                  </div>
                  
                  <GroupedPurchaseList />
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button variant="ghost" onClick={() => setIsAssemblyOpen(false)} className="font-bold text-xs h-10">Cancelar</Button>
            <Button 
              onClick={handleCreateOrder} 
              className="px-6 font-black shadow-xl h-10 bg-primary text-white text-xs"
            >
              <ClipboardList className="mr-2 h-4 w-4" /> GUARDAR COMO ORDEN
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
