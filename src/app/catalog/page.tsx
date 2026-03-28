
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
  MapPin,
  Save,
  Calculator,
  Beaker,
  Lock,
  Unlock,
  ArrowRightLeft,
  Droplet
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
  
  // Exchange Rates Logic
  const [exchangeRates, setExchangeRates] = useState({ official: 1, blue: 1 })
  const [rateType, setRateType] = useState<'official' | 'blue'>('official')

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [offRes, blueRes] = await Promise.all([
          fetch('https://dolarapi.com/v1/dolares/oficial'),
          fetch('https://dolarapi.com/v1/dolares/blue')
        ]);
        const off = await offRes.json();
        const blue = await blueRes.json();
        if (off?.venta && blue?.venta) {
          setExchangeRates({ official: off.venta, blue: blue.venta });
        }
      } catch (e) {
        console.error("Error fetching rates:", e);
      }
    }
    fetchRates();
  }, []);

  const currentRate = rateType === 'blue' ? exchangeRates.blue : exchangeRates.official;

  const catalogQuery = useMemoFirebase(() => collection(db, 'products_services'), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, 'product_categories'), [db])
  const suppliersQuery = useMemoFirebase(() => collection(db, 'suppliers'), [db])
  const ordersQuery = useMemoFirebase(() => query(collection(db, 'production_orders'), orderBy('createdAt', 'desc')), [db])
  const allPurchasesQuery = useMemoFirebase(() => query(collection(db, 'purchases'), orderBy('date', 'desc')), [db])
  
  const { data: items, isLoading } = useCollection(catalogQuery)
  const { data: rawCategories, isLoading: loadingCats } = useCollection(categoriesQuery)
  const { data: suppliers } = useCollection(suppliersQuery)
  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery)
  const { data: allPurchases } = useCollection(allPurchasesQuery)
  
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
  const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false)
  const [isSupplierHistoryOpen, setIsSupplierHistoryOpen] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any | null>(null)
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<string | null>(null)
  
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
  const [itemToPrint, setItemToPrint] = useState<any | null>(null)
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null)
  const [orderToView, setOrderToView] = useState<any | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null)
  const [orderToFinalize, setOrderToFinalize] = useState<any | null>(null)
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false)
  
  const [bomFilterCategory, setBomFilterCategory] = useState("all")

  const [manualPurchaseQtys, setManualPurchaseQtys] = useState<Record<string, number>>({})
  const [manualPurchasePrices, setManualPurchasePrices] = useState<Record<string, number>>({})
  const [manualPurchaseCurrencies, setManualPurchaseCurrencies] = useState<Record<string, 'ARS' | 'USD'>>({})
  const [manualSuppliers, setManualSuppliers] = useState<Record<string, string>>({})
  const [supplierStatuses, setSupplierStatuses] = useState<Record<string, 'pending' | 'ordered'>>({})
  const [initialPlanData, setInitialPlanData] = useState({ qtys: {}, sups: {}, prices: {}, currencies: {}, statuses: {}, qty: 0 })

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    supplier: "none",
    priceARS: 0,
    priceUSD: 0,
    costAmount: 0,
    costCurrency: "ARS",
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

  // Fix pointer events
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isCategoryManagerOpen || isSupplierManagerOpen || !!orderToView || !!orderToDelete || isAuditOpen || isExitAlertOpen || !!orderToFinalize || isPurchaseHistoryOpen || isSupplierHistoryOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isCategoryManagerOpen, isSupplierManagerOpen, orderToView, orderToDelete, isAuditOpen, isExitAlertOpen, orderToFinalize, isPurchaseHistoryOpen, isSupplierHistoryOpen]);

  const calculateCost = useCallback((itemData: any, allItems: any[], currentExchangeRate: number): { ars: number, usd: number } => {
    if (!itemData.isCompuesto) {
      const isARS = itemData.costCurrency === 'ARS' || (!itemData.costCurrency && (itemData.costARS > 0 || !itemData.costUSD));
      const amount = isARS ? (Number(itemData.costARS) || 0) : (Number(itemData.costUSD) || 0);
      
      if (isARS) {
        return { ars: amount, usd: amount / currentExchangeRate };
      } else {
        return { ars: amount * currentExchangeRate, usd: amount };
      }
    }
    
    let totalARS = Number(itemData.laborCostARS) || 0;
    let totalUSD = Number(itemData.laborCostUSD) || 0;

    itemData.components?.forEach((comp: any) => {
      const child = allItems.find(i => i.id === comp.productId);
      if (child) {
        const childCosts = calculateCost(child, allItems, currentExchangeRate);
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
        const { ars, usd } = calculateCost(item, items, currentRate);
        return { ...item, calculatedCostARS: ars, calculatedCostUSD: usd };
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [items, searchTerm, selectedCategories, calculateCost, currentRate])

  const explosionSummary = useMemo(() => {
    if (orderToView?.status === 'completed' && orderToView.explosionSnapshot) {
      return orderToView.explosionSnapshot;
    }

    const target = orderToView ? items?.find(i => i.id === orderToView.productId) : selectedForAssembly;
    const qty = orderToView ? orderToView.quantity : assemblyQty;
    
    if (!target || !items) return null;

    const requirements: Record<string, { id: string, name: string, required: number, available: number, missing: number, minStock: number, costARS: number, costUSD: number, costCurrency: string, isCompuesto: boolean, supplier: string }> = {};

    const explode = (productId: string, qtyNeeded: number, skipAddingToRequirements: boolean = false) => {
      const item = items.find(i => i.id === productId);
      if (!item) return;

      const currentStock = item.stock || 0;
      
      if (!skipAddingToRequirements) {
        if (!requirements[productId]) {
          const costCurrency = item.costCurrency || (item.costUSD > 0 && !item.costARS ? 'USD' : 'ARS');
          requirements[productId] = {
            id: item.id,
            name: item.name,
            required: 0,
            available: currentStock,
            missing: 0,
            minStock: item.minStock || 0,
            costARS: item.costARS || 0,
            costUSD: item.costUSD || 0,
            costCurrency: costCurrency,
            isCompuesto: item.isCompuesto || false,
            supplier: item.supplier || "Sin Proveedor"
          };
        }
        requirements[productId].required += qtyNeeded;
      }

      if (item.isCompuesto) {
        const availableStockToDeduct = skipAddingToRequirements ? 0 : currentStock;
        const deficitToProduce = Math.max(0, qtyNeeded - availableStockToDeduct);

        if (deficitToProduce > 0 || skipAddingToRequirements) {
          const qtyToExplode = skipAddingToRequirements ? qtyNeeded : deficitToProduce;
          
          const groupedComponents: Record<string, number> = {};
          item.components?.forEach((comp: any) => {
            groupedComponents[comp.productId] = (groupedComponents[comp.productId] || 0) + (Number(comp.quantity) || 0);
          });

          Object.entries(groupedComponents).forEach(([compProductId, compQty]) => {
            explode(compProductId, compQty * qtyToExplode, false);
          });
        }
      }
    };

    explode(target.id, qty, true);

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
      const newManualPrices: Record<string, number> = {};
      const newManualCurrencies: Record<string, 'ARS' | 'USD'> = {};
      const newManualSups: Record<string, string> = {};
      const newStatuses: Record<string, 'pending' | 'ordered'> = orderToView.supplierStatuses || {};
      
      explosionSummary.toBuySuggested.forEach(item => {
        newManualQtys[item.id] = orderToView.purchaseQtys?.[item.id] ?? item.suggestedToBuy;
        const defaultCurrency = item.costCurrency as 'ARS' | 'USD' || 'ARS';
        newManualCurrencies[item.id] = orderToView.purchaseCurrencies?.[item.id] ?? defaultCurrency;
        const baseCost = newManualCurrencies[item.id] === 'USD' ? item.costUSD : item.costARS;
        newManualPrices[item.id] = orderToView.purchasePrices?.[item.id] ?? baseCost;
        newManualSups[item.id] = orderToView.purchaseSuppliers?.[item.id] ?? (item.supplier || "Sin Proveedor");
      });
      
      setManualPurchaseQtys(newManualQtys);
      setManualPurchasePrices(newManualPrices);
      setManualPurchaseCurrencies(newManualCurrencies);
      setManualSuppliers(newManualSups);
      setSupplierStatuses(newStatuses);
      setInitialPlanData({ 
        qtys: JSON.parse(JSON.stringify(newManualQtys)), 
        prices: JSON.parse(JSON.stringify(newManualPrices)),
        currencies: JSON.parse(JSON.stringify(newManualCurrencies)),
        sups: JSON.parse(JSON.stringify(newManualSups)),
        statuses: JSON.parse(JSON.stringify(newStatuses)),
        qty: orderToView.quantity
      });
    } else if (isAssemblyOpen && !orderToView && explosionSummary) {
      const newManualQtys: Record<string, number> = {};
      const newManualPrices: Record<string, number> = {};
      const newManualCurrencies: Record<string, 'ARS' | 'USD'> = {};
      const newManualSups: Record<string, string> = {};
      explosionSummary.toBuySuggested.forEach(item => {
        newManualQtys[item.id] = item.suggestedToBuy;
        const defaultCurrency = item.costCurrency as 'ARS' | 'USD' || 'ARS';
        newManualCurrencies[item.id] = defaultCurrency;
        const baseCost = defaultCurrency === 'USD' ? item.costUSD : item.costARS;
        newManualPrices[item.id] = baseCost;
        newManualSups[item.id] = item.supplier || "Sin Proveedor";
      });
      setManualPurchaseQtys(newManualQtys);
      setManualPurchasePrices(newManualPrices);
      setManualPurchaseCurrencies(newManualCurrencies);
      setManualSuppliers(newManualSups);
      setSupplierStatuses({});
    }
  }, [isAssemblyOpen, orderToView, explosionSummary]);

  const hasUnsavedChanges = useMemo(() => {
    if (!orderToView || orderToView.status === 'completed') return false;
    return JSON.stringify(manualPurchaseQtys) !== JSON.stringify(initialPlanData.qtys) ||
           JSON.stringify(manualPurchasePrices) !== JSON.stringify(initialPlanData.prices) ||
           JSON.stringify(manualPurchaseCurrencies) !== JSON.stringify(initialPlanData.currencies) ||
           JSON.stringify(manualSuppliers) !== JSON.stringify(initialPlanData.sups) ||
           JSON.stringify(supplierStatuses) !== JSON.stringify(initialPlanData.statuses) ||
           orderToView.quantity !== initialPlanData.qty;
  }, [manualPurchaseQtys, manualPurchasePrices, manualPurchaseCurrencies, manualSuppliers, supplierStatuses, initialPlanData, orderToView]);

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
      const manualCurrency = manualPurchaseCurrencies[item.id] ?? (item.costCurrency as 'ARS' | 'USD' || 'ARS');
      const baseCost = manualCurrency === 'USD' ? item.costUSD : item.costARS;
      const manualPrice = manualPurchasePrices[item.id] ?? baseCost;
      const futureStock = item.available + manualQty - item.required;
      const isCritical = futureStock < item.minStock;
      const isInsufficient = futureStock < 0;
      const currentSupplier = manualSuppliers[item.id] || (item.supplier || "Sin Proveedor");

      return {
        ...item,
        manualQty,
        manualPrice,
        manualCurrency,
        futureStock,
        isCritical,
        isInsufficient,
        supplier: currentSupplier
      };
    });

    return {
      items: itemsToBuy,
      totalARS: itemsToBuy.reduce((sum, item) => sum + (item.manualQty * (item.manualCurrency === 'ARS' ? item.manualPrice : 0)), 0),
      totalUSD: itemsToBuy.reduce((sum, item) => sum + (item.manualQty * (item.manualCurrency === 'USD' ? item.manualPrice : 0)), 0)
    };
  }, [explosionSummary, manualPurchaseQtys, manualPurchasePrices, manualPurchaseCurrencies, manualSuppliers, items]);

  const currentEditingCosts = useMemo(() => {
    if (!items || !formData.isCompuesto) return { ars: 0, usd: 0 };
    return calculateCost(formData, items, currentRate);
  }, [formData, items, currentRate, calculateCost]);

  const sortedAddedComponents = useMemo(() => {
    if (!items || !formData.components) return []
    return formData.components
      .map((c, i) => ({ ...c, originalIndex: i }))
      .sort((a, b) => {
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
    if (item) {
      setEditingItemId(item.id)
      const sanitizedComponents: { productId: string, quantity: number }[] = [];
      (item.components || []).forEach((c: any) => {
        const existing = sanitizedComponents.find(sc => sc.productId === c.productId);
        if (existing) {
          existing.quantity += (Number(c.quantity) || 0);
        } else {
          sanitizedComponents.push({ ...c });
        }
      });

      const costCurrency = item.costCurrency || (item.costUSD > 0 && !item.costARS ? 'USD' : 'ARS');
      const costAmount = costCurrency === 'USD' ? (item.costUSD || 0) : (item.costARS || 0);

      setFormData({
        ...formData,
        name: item.name || "",
        categoryId: item.categoryId || "",
        supplier: item.supplier || "none",
        priceARS: item.priceARS || 0,
        priceUSD: item.priceUSD || 0,
        costAmount: costAmount,
        costCurrency: costCurrency,
        laborCostARS: item.laborCostARS || 0,
        laborCostUSD: item.laborCostUSD || 0,
        isService: item.isService || false,
        isCompuesto: item.isCompuesto || false,
        trackStock: item.trackStock !== undefined ? item.trackStock : !item.isService,
        description: item.description || "",
        stock: item.stock || 0,
        minStock: item.minStock || 0,
        components: sanitizedComponents
      })
    } else {
      setEditingItemId(null)
      setFormData({ 
        name: "", categoryId: "", supplier: "none", priceARS: 0, priceUSD: 0, costAmount: 0, costCurrency: "ARS", 
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
      supplier: formData.supplier === 'none' ? "" : formData.supplier,
      costARS: formData.costCurrency === 'ARS' ? formData.costAmount : 0,
      costUSD: formData.costCurrency === 'USD' ? formData.costAmount : 0
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
      purchasePrices: manualPurchasePrices,
      purchaseCurrencies: manualPurchaseCurrencies,
      purchaseSuppliers: manualSuppliers,
      supplierStatuses: supplierStatuses
    };

    setDocumentNonBlocking(doc(db, 'production_orders', id), newOrder, { merge: true });
    setIsAssemblyOpen(false);
    setManualSuppliers({});
    setActiveTab("orders");
    toast({ title: "Orden de producción creada", description: `Estado: ${status === 'ready' ? 'Lista para armar' : 'Pendiente de compra'}` });
  }

  const handleUpdateOrderPlan = () => {
    if (!orderToView) return;
    const status = explosionSummary?.all.some(f => {
      const stockAfterEntry = f.id in manualPurchaseQtys ? (f.available + (manualPurchaseQtys[f.id] || 0)) : f.available;
      return (stockAfterEntry - f.required) < 0;
    }) ? 'pending_purchase' : 'ready';
    
    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      quantity: orderToView.quantity,
      purchaseQtys: manualPurchaseQtys,
      purchasePrices: manualPurchasePrices,
      purchaseCurrencies: manualPurchaseCurrencies,
      purchaseSuppliers: manualSuppliers,
      supplierStatuses: supplierStatuses,
      status
    });
    setInitialPlanData({ 
      qtys: JSON.parse(JSON.stringify(manualPurchaseQtys)), 
      prices: JSON.parse(JSON.stringify(manualPurchasePrices)),
      currencies: JSON.parse(JSON.stringify(manualPurchaseCurrencies)),
      sups: JSON.parse(JSON.stringify(manualSuppliers)),
      statuses: JSON.parse(JSON.stringify(supplierStatuses)),
      qty: orderToView.quantity
    });
    toast({ title: "Planificación guardada", description: "Se han actualizado los cambios en la orden." });
  }

  const handleReceiveMaterials = (supplierName: string) => {
    if (!orderToView || !purchaseCalculations) return;
    const newPurchaseQtys = { ...manualPurchaseQtys };
    const itemsToProcess = purchaseCalculations.items.filter(i => (i.supplier || "Sin Proveedor") === supplierName);
    
    itemsToProcess.forEach(item => {
      if (item.manualQty > 0) {
        // 1. Guardar en Historial de Compras (Nueva colección)
        const manualCurrency = manualPurchaseCurrencies[item.id] || (item.costCurrency as 'ARS' | 'USD' || 'ARS');
        const purchaseId = Math.random().toString(36).substring(2, 11);
        const purchaseRecord = {
          id: purchaseId,
          productId: item.id,
          productName: item.name,
          supplierName: supplierName,
          quantity: item.manualQty,
          price: item.manualPrice,
          currency: manualCurrency,
          date: new Date().toISOString(),
          orderId: orderToView.id,
          exchangeRate: currentRate,
          rateType: rateType
        };
        setDocumentNonBlocking(doc(db, 'purchases', purchaseId), purchaseRecord, { merge: true });

        // 2. Actualizar Stock
        updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
          stock: increment(item.manualQty)
        });
        
        // 3. Actualizar Costo Real en el catálogo y Moneda
        if (item.manualPrice > 0) {
          const costField = manualCurrency === 'USD' ? 'costUSD' : 'costARS';
          const otherCostField = manualCurrency === 'USD' ? 'costARS' : 'costUSD';
          updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
            [costField]: item.manualPrice,
            [otherCostField]: 0,
            costCurrency: manualCurrency
          });
        }
        
        newPurchaseQtys[item.id] = 0;
      }
    });

    setManualPurchaseQtys(newPurchaseQtys);
    const status = explosionSummary?.all.some(f => {
      const stockAfterEntry = f.id in newPurchaseQtys ? (f.available + (newPurchaseQtys[f.id] || 0)) : f.available;
      return (stockAfterEntry - f.required) < 0;
    }) ? 'pending_purchase' : 'ready';
    
    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
      purchaseQtys: newPurchaseQtys,
      status
    });
    setInitialPlanData(prev => ({ ...prev, qtys: JSON.parse(JSON.stringify(newPurchaseQtys)) }));
    toast({ title: `Materiales de ${supplierName} ingresados`, description: "Se actualizó el stock, los costos y el historial." });
  }

  const handleToggleSupplierStatus = (supplierName: string) => {
    const current = supplierStatuses[supplierName] || 'pending';
    const next = current === 'pending' ? 'ordered' : 'pending';
    
    if (next === 'ordered') {
      const itemsInSupplier = purchaseCalculations?.items.filter(i => (i.supplier || "Sin Proveedor") === supplierName) || [];
      const hasZeroPrice = itemsInSupplier.some(i => i.manualPrice <= 0);
      if (hasZeroPrice) {
        toast({ 
          title: "Precios incompletos", 
          description: "No puedes marcar como pedido si hay artículos con precio $0.", 
          variant: "destructive" 
        });
        return;
      }
    }

    const newStatuses = { ...supplierStatuses, [supplierName]: next };
    setSupplierStatuses(newStatuses);
    if (orderToView) {
      updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
        supplierStatuses: newStatuses
      });
    }
    toast({ title: next === 'ordered' ? "Pedido confirmado" : "Pedido desbloqueado para edición" });
  }

  const handleUpdateItemAudit = (id: string, updates: any) => {
    const item = items?.find(i => i.id === id);
    if (!item) return;

    const finalUpdates = { ...updates };
    
    if ('costAmount' in updates || 'costCurrency' in updates) {
      const amount = updates.costAmount ?? (item.costCurrency === 'USD' ? item.costUSD : item.costARS);
      const currency = updates.costCurrency ?? item.costCurrency;
      
      finalUpdates.costARS = currency === 'ARS' ? amount : 0;
      finalUpdates.costUSD = currency === 'USD' ? amount : 0;
      finalUpdates.costCurrency = currency;
      delete finalUpdates.costAmount;
    }

    updateDocumentNonBlocking(doc(db, 'products_services', id), finalUpdates);
    toast({ title: "Item actualizado", description: "Cambios guardados en auditoría." });
  }

  const handleUpdateGlobalSupplier = (productId: string, newSupplier: string) => {
    const cleanSupplier = newSupplier === "Sin Proveedor" ? "" : newSupplier;
    updateDocumentNonBlocking(doc(db, 'products_services', productId), {
      supplier: cleanSupplier
    });
    toast({ title: "Proveedor actualizado" });
  }

  const handleUpdateItemSupplierGlobally = useCallback((productId: string, newSupplier: string) => {
    const cleanSupplier = newSupplier === "Sin Proveedor" ? "" : newSupplier;
    setManualSuppliers(prev => ({ ...prev, [productId]: newSupplier }));
    updateDocumentNonBlocking(doc(db, 'products_services', productId), {
      supplier: cleanSupplier
    });
    if (orderToView && orderToView.status !== 'completed') {
      const currentManualSups = { ...manualSuppliers, [productId]: newSupplier };
      updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), {
        purchaseSuppliers: currentManualSups
      });
    }
    toast({ 
      title: "Proveedor asignado permanentemente", 
      description: `El ítem ahora tiene a ${newSupplier} como su proveedor oficial.` 
    });
  }, [db, orderToView, manualSuppliers, toast]);

  const handleAssembleFinal = () => {
    if (!orderToView || !items) return;
    setOrderToFinalize(orderToView);
  }

  const getSmartExplosion = useCallback((productId: string, qtyNeeded: number, level = 0): any[] => {
    if (!items) return [];
    const item = items.find(i => i.id === productId);
    if (!item) return [];

    const available = (level === 0 || item.trackStock === false) ? 0 : (item.stock || 0);
    const takenFromStock = Math.min(qtyNeeded, available);
    const deficit = Math.max(0, qtyNeeded - takenFromStock);

    let results: any[] = [{
      id: item.id,
      name: item.name,
      requested: qtyNeeded,
      fromStock: takenFromStock,
      toProduce: deficit,
      level,
      isCompuesto: item.isCompuesto
    }];

    if (deficit > 0 && item.isCompuesto) {
      item.components?.forEach((comp: any) => {
        const subResults = getSmartExplosion(comp.productId, comp.quantity * deficit, level + 1);
        results = [...results, ...subResults];
      });
    }

    return results;
  }, [items]);

  const handleConfirmFinalize = () => {
    if (!orderToFinalize || !items || !explosionSummary) return;
    const target = items.find(i => i.id === orderToFinalize.productId);
    if (!target) {
      toast({ title: "Error", description: "No se encontró el producto a armar.", variant: "destructive" });
      return;
    }

    try {
      // Capturar snapshots históricos antes de modificar el stock
      const currentExplosionSnapshot = JSON.parse(JSON.stringify(explosionSummary));
      const currentSmartExplosionSnapshot = JSON.parse(JSON.stringify(getSmartExplosion(orderToFinalize.productId, orderToFinalize.quantity, 0)));

      toast({ title: "Procesando armado...", description: "Descontando insumos y actualizando stock final." });

      const smartDeduct = (productId: string, qtyNeeded: number) => {
        const item = items.find(i => i.id === productId);
        if (!item) return;

        const currentStock = item.stock || 0;
        const availableToDeduct = item.trackStock !== false ? Math.min(currentStock, qtyNeeded) : 0;
        const deficitToExplode = qtyNeeded - (item.trackStock !== false ? availableToDeduct : 0);

        if (item.trackStock !== false && availableToDeduct > 0) {
          updateDocumentNonBlocking(doc(db, 'products_services', item.id), {
            stock: increment(-availableToDeduct)
          });
        }

        if (item.isCompuesto && deficitToExplode > 0) {
          const groupedComponents: Record<string, number> = {};
          item.components?.forEach((comp: any) => {
            groupedComponents[comp.productId] = (groupedComponents[comp.productId] || 0) + (Number(comp.quantity) || 0);
          });

          Object.entries(groupedComponents).forEach(([compProductId, compQty]) => {
            smartDeduct(compProductId, compQty * deficitToExplode);
          });
        }
      };

      const rootComponents: Record<string, number> = {};
      target.components?.forEach((comp: any) => {
        rootComponents[comp.productId] = (rootComponents[comp.productId] || 0) + (Number(comp.quantity) || 0);
      });

      Object.entries(rootComponents).forEach(([compId, compQty]) => {
        smartDeduct(compId, compQty * orderToFinalize.quantity);
      });

      updateDocumentNonBlocking(doc(db, 'products_services', target.id), {
        stock: increment(orderToFinalize.quantity)
      });

      updateDocumentNonBlocking(doc(db, 'production_orders', orderToFinalize.id), {
        status: 'completed',
        explosionSnapshot: currentExplosionSnapshot,
        smartExplosionSnapshot: currentSmartExplosionSnapshot
      });

      setOrderToFinalize(null);
      setOrderToView(null);
      toast({ title: "Armado completado", description: "Insumos descontados inteligentemente del inventario." });
    } catch (error) {
      console.error("Error en finalización de armado:", error);
      toast({ title: "Error crítico", description: "Ocurrió un error al intentar procesar el armado.", variant: "destructive" });
    }
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
    return { value: margin.toFixed(0), color, icon };
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
      const currency = manualPurchaseCurrencies[f.id] || (f.costCurrency as 'ARS' | 'USD' || 'ARS');
      text += `- *${f.name}*: ${f.manualQty} unidades. (Precio Ref: ${currency === 'USD' ? 'u$s' : '$'}${f.manualPrice.toLocaleString('es-AR')})\n`;
    });
    const ars = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * (manualPurchaseCurrencies[i.id] === 'ARS' ? manualPurchasePrices[i.id] : 0)), 0);
    const usd = itemsToInclude.reduce((sum, i) => sum + (i.manualQty * (manualPurchaseCurrencies[i.id] === 'USD' ? manualPurchasePrices[i.id] : 0)), 0);
    text += `\n*INVERSIÓN ESTIMADA:*\n`;
    if (ars > 0) text += `ARS: $${ars.toLocaleString('es-AR')}\n`;
    if (usd > 0) text += `USD: u$s ${usd.toLocaleString('es-AR')}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Lista de compras copiada", description: `Lista filtrada para ${supplierFilter}.` });
  }

  const handleExportBOM = (item: any) => {
    setItemToPrint(item);
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `Ficha_${item.name.replace(/\s+/g, '_')}`;
      window.print();
      document.title = originalTitle;
    }, 150);
  };

  const handlePrintProductionOrder = (order: any) => {
    setOrderToPrint(order);
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `Plan_Armado_${order.productName.replace(/\s+/g, '_')}`;
      window.print();
      document.title = originalTitle;
    }, 300);
  };

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
          <div className={cn("flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group", selectedCategories.includes("uncategorized") ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={() => toggleCategory("uncategorized")}>
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedCategories.includes("uncategorized")} />
              <span className="text-sm font-bold truncate max-w-[120px]">Sin Categoría</span>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 bg-white border font-bold">{categoryCounts["uncategorized"]}</Badge>
          </div>
        )}
        {categories.map((cat: any) => (
          <div key={cat.id} className={cn("flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group", selectedCategories.includes(cat.id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={() => toggleCategory(cat.id)}>
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedCategories.includes(cat.id)} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-bold truncate max-w-[120px]">{cat.name}</span>
                {cat.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 bg-white border font-bold">{categoryCounts[cat.id] || 0}</Badge>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="space-y-2 pt-4 border-t">
          <Button variant="outline" className="w-full h-10 border-dashed gap-2 font-bold text-xs" onClick={() => setIsCategoryManagerOpen(true)}><Settings className="h-3 w-3" /> GESTIONAR CATEGORÍAS</Button>
          <Button variant="outline" className="w-full h-10 border-dashed gap-2 font-bold text-xs" onClick={() => setIsSupplierManagerOpen(true)}><Briefcase className="h-3 w-3" /> GESTIONAR PROVEEDORES</Button>
        </div>
      )}
    </div>
  )

  const OrdersList = () => {
    const supplierPurchasesCount = useMemo(() => {
      const counts: Record<string, number> = {};
      allPurchases?.forEach(p => {
        if (p.supplierName) {
          counts[p.supplierName] = (counts[p.supplierName] || 0) + 1;
        }
      });
      return counts;
    }, [allPurchases]);

    return (
      <div className="space-y-8">
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
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
                <Truck className="h-4 w-4" /> Análisis de Proveedores (Compras Realizadas)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(supplierPurchasesCount).sort((a,b) => b[1] - a[1]).slice(0, 12).map(([sup, count]) => (
                  <Card 
                    key={sup} 
                    className="p-3 bg-white border-primary/10 flex flex-col items-center justify-center text-center group hover:border-primary/30 transition-all cursor-pointer relative"
                    onClick={() => { setSelectedSupplierForHistory(sup); setIsSupplierHistoryOpen(true); }}
                  >
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="h-3 w-3 text-primary" /></div>
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-primary transition-colors">{sup}</p>
                    <p className="text-2xl font-black text-slate-800">{count}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">OPERACIONES</p>
                  </Card>
                ))}
              </div>
            </section>

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
                  <Card key={order.id} className={cn("glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group", order.status === 'completed' ? 'border-l-emerald-500 opacity-70' : 'border-l-primary')} onClick={() => setOrderToView(order)}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", statusInfo.color)}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" /> {statusInfo.label}
                        </Badge>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2 font-bold leading-tight">{order.productName}</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Creada el {new Date(order.createdAt).toLocaleDateString('es-AR')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4"><div className="bg-white/50 border rounded-lg p-3 flex items-center justify-between shadow-inner"><span className="text-[10px] font-black text-muted-foreground uppercase">Unidades a Fabricar</span><span className="text-2xl font-black text-primary">{order.quantity}</span></div></CardContent>
                    <CardFooter className="pt-0 border-t bg-muted/5 flex justify-between py-3"><Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">VER DETALLE <ChevronRight className="h-3 w-3 ml-1" /></Button>{order.status === 'ready' && <Badge className="bg-blue-600 animate-pulse text-[8px] font-black">PRODUCCIÓN HABILITADA</Badge>}</CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const GroupedPurchaseList = () => {
    if (!purchaseCalculations) return null;
    const itemsBySupplier = useMemo(() => {
      const groups: Record<string, typeof purchaseCalculations.items> = {};
      purchaseCalculations.items.forEach(item => {
        const sup = item.supplier || "Sin Proveedor";
        if (!groups[sup]) groups[sup] = [];
        groups[sup].push(item);
      });
      Object.keys(groups).forEach(sup => groups[sup].sort((a, b) => a.name.localeCompare(b.name)));
      return groups;
    }, [purchaseCalculations.items]);
    const supplierNames = Object.keys(itemsBySupplier).sort();
    
    return (
      <div className="space-y-10">
        {supplierNames.length === 0 ? (
          <div className="p-12 text-center text-emerald-600 bg-white border rounded-xl space-y-2">
            <CheckCircle2 className="h-12 w-12 mx-auto" /><p className="font-black">MATERIALES LISTOS</p><p className="text-xs text-muted-foreground italic">Tienes todo lo necesario para empezar el armado.</p>
          </div>
        ) : (
          supplierNames.map(sup => {
            const itemsInGroup = itemsBySupplier[sup];
            const isOrdered = supplierStatuses[sup] === 'ordered';
            const groupARS = itemsInGroup.reduce((sum, i) => sum + (i.manualQty * (manualPurchaseCurrencies[i.id] === 'ARS' ? manualPurchasePrices[i.id] : 0)), 0);
            const groupUSD = itemsInGroup.reduce((sum, i) => sum + (i.manualQty * (manualPurchaseCurrencies[i.id] === 'USD' ? manualPurchasePrices[i.id] : 0)), 0);
            
            return (
              <div key={sup} className={cn("space-y-4 p-4 rounded-2xl border transition-all", isOrdered ? "bg-slate-50 border-slate-200" : "bg-white border-primary/10 shadow-sm")}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg text-white", isOrdered ? "bg-slate-400" : "bg-slate-900")}>
                      {isOrdered ? <Lock className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{sup}</h4>
                        {isOrdered && <Badge className="bg-slate-600 text-[8px] font-black uppercase">PEDIDO CONFIRMADO</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{itemsInGroup.length} ÍTEMS • {isOrdered ? 'VALORES BLOQUEADOS' : 'VALORES EDITABLES'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs flex-1 md:flex-none" onClick={() => handleCopyShoppingList(sup)}>
                      <Copy className="h-3.5 w-3.5" /> COPIAR
                    </Button>
                    
                    {orderToView?.status !== 'completed' && (
                      <>
                        <Button 
                          variant={isOrdered ? "ghost" : "outline"} 
                          size="sm" 
                          className={cn("h-8 gap-2 font-bold text-xs flex-1 md:flex-none", isOrdered ? "text-amber-600 hover:bg-amber-50" : "border-emerald-600 text-emerald-700")}
                          onClick={() => handleToggleSupplierStatus(sup)}
                        >
                          {isOrdered ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {isOrdered ? "DESBLOQUEAR" : "MARCAR COMO PEDIDO"}
                        </Button>
                        
                        <Button 
                          size="sm" 
                          className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs flex-1 md:flex-none" 
                          onClick={() => handleReceiveMaterials(sup)} 
                          disabled={itemsInGroup.every(i => i.manualQty <= 0)}
                        >
                          <Save className="h-3.5 w-3.5" /> INGRESAR COMPRA
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="hidden md:block border-2 rounded-xl bg-white shadow-md overflow-hidden">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-20">Cantidad</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-28">Precio Ref.</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-48">Precio Compra</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-20">Stock Post</TableHead>
                        <TableHead className="text-right font-black text-[9px] uppercase w-28">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsInGroup.map(f => {
                        const isZero = manualPurchasePrices[f.id] <= 0;
                        const originalCost = f.costCurrency === 'USD' ? f.costUSD : f.costARS;
                        const currentCurrency = manualPurchaseCurrencies[f.id] || (f.costCurrency as 'ARS' | 'USD' || 'ARS');
                        
                        const lastPurchase = allPurchases?.find(p => p.productId === f.id);
                        const refPrice = lastPurchase ? lastPurchase.price : originalCost;
                        const refCurrency = lastPurchase ? lastPurchase.currency : f.costCurrency;

                        return (
                          <TableRow key={f.id} className="hover:bg-muted/5 h-10">
                            <TableCell className="py-1">
                              <p className="font-bold text-xs">{f.name}</p>
                              <p className="text-[8px] text-muted-foreground uppercase">Disp: {f.available} / Req: {f.required}</p>
                            </TableCell>
                            <TableCell className="py-1">
                              <input 
                                type="number" 
                                disabled={orderToView?.status === 'completed' || isOrdered} 
                                value={manualPurchaseQtys[f.id] ?? f.suggestedToBuy} 
                                onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))} 
                                className="w-full text-center font-black text-xs bg-muted/30 border-none rounded h-7 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                              />
                            </TableCell>
                            <TableCell className="text-center py-1">
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-slate-400">
                                  {refCurrency === 'USD' ? 'u$s' : '$'} {refPrice.toLocaleString('es-AR')}
                                </span>
                                {lastPurchase && <span className="text-[7px] text-slate-300 font-bold uppercase">Últ. Compra</span>}
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex items-center gap-1.5">
                                <div className="relative group flex-1">
                                  <input 
                                    type="number" 
                                    disabled={orderToView?.status === 'completed' || isOrdered} 
                                    value={manualPurchasePrices[f.id] ?? refPrice} 
                                    onChange={(e) => setManualPurchasePrices(prev => ({ ...prev, [f.id]: Number(e.target.value) }))} 
                                    className={cn(
                                      "w-full text-center font-black text-xs h-7 border rounded transition-all focus:outline-none focus:ring-2",
                                      isZero ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-white border-emerald-100 text-emerald-700"
                                    )} 
                                  />
                                  {isZero && !isOrdered && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[7px] font-black px-1 py-0.5 rounded opacity-0 group-hover:opacity-100">PRECIO REQUERIDO</span>}
                                </div>
                                <Tabs 
                                  value={currentCurrency} 
                                  onValueChange={(v: any) => setManualPurchaseCurrencies(prev => ({ ...prev, [f.id]: v }))}
                                  className={cn("shrink-0 h-7", (orderToView?.status === 'completed' || isOrdered) && "pointer-events-none opacity-50")}
                                >
                                  <TabsList className="h-7 p-0 gap-0 border">
                                    <TabsTrigger value="ARS" className="h-6 text-[8px] font-black px-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                                    <TabsTrigger value="USD" className="h-6 text-[8px] font-black px-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-1">
                              <span className={cn("font-black text-[9px] px-1.5 py-0.5 rounded", f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{f.futureStock}</span>
                            </TableCell>
                            <TableCell className="text-right py-1">
                              <p className="text-[10px] font-bold">{currentCurrency === 'USD' ? 'u$s' : '$'} {( (manualPurchaseQtys[f.id] ?? f.suggestedToBuy) * (manualPurchasePrices[f.id] ?? refPrice)).toLocaleString('es-AR')}</p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="bg-slate-50 border-t p-3 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS:</span><span className="font-black text-xs text-primary">${groupARS.toLocaleString('es-AR')}</span></div>
                    <div className="flex items-center gap-2 justify-end"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD:</span><span className="font-black text-xs text-emerald-700">u$s {groupUSD.toLocaleString('es-AR')}</span></div>
                  </div>
                </div>

                <div className="md:hidden space-y-2">
                  {itemsInGroup.map(f => {
                    const isZero = manualPurchasePrices[f.id] <= 0;
                    const originalCost = f.costCurrency === 'USD' ? f.costUSD : f.costARS;
                    const currentCurrency = manualPurchaseCurrencies[f.id] || (f.costCurrency as 'ARS' | 'USD' || 'ARS');
                    
                    const lastPurchase = allPurchases?.find(p => p.productId === f.id);
                    const refPrice = lastPurchase ? lastPurchase.price : originalCost;

                    return (
                      <Card key={f.id} className="p-2.5 bg-white border shadow-sm space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0"><p className="font-bold text-xs truncate">{f.name}</p></div>
                          <span className={cn("font-black text-[8px] px-1.5 py-0.5 rounded uppercase", f.isInsufficient ? "bg-rose-600 text-white" : f.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>Post: {f.futureStock}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground">Cant. Compra</Label>
                            <input 
                              type="number" 
                              disabled={orderToView?.status === 'completed' || isOrdered} 
                              value={manualPurchaseQtys[f.id] ?? f.suggestedToBuy} 
                              onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [f.id]: Number(e.target.value) }))} 
                              className="w-full text-center font-black text-xs bg-muted/30 border rounded h-8 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase text-emerald-700">Precio Compra</Label>
                            <div className="flex flex-col gap-1">
                              <input 
                                type="number" 
                                disabled={orderToView?.status === 'completed' || isOrdered} 
                                value={manualPurchasePrices[f.id] ?? refPrice} 
                                onChange={(e) => setManualPurchasePrices(prev => ({ ...prev, [f.id]: Number(e.target.value) }))} 
                                className={cn(
                                  "w-full text-center font-black text-xs border rounded h-8 transition-all focus:outline-none focus:ring-2",
                                  isZero ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-white border-emerald-100 text-emerald-700"
                                )} 
                              />
                              <Tabs 
                                value={currentCurrency} 
                                onValueChange={(v: any) => setManualPurchaseCurrencies(prev => ({ ...prev, [f.id]: v }))}
                                className={cn("h-6 w-full", (orderToView?.status === 'completed' || isOrdered) && "pointer-events-none opacity-50")}
                              >
                                <TabsList className="h-6 w-full p-0 grid grid-cols-2 border">
                                  <TabsTrigger value="ARS" className="h-5 text-[7px] font-black data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                                  <TabsTrigger value="USD" className="h-5 text-[7px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[8px] italic text-slate-400 px-1">
                          <span>Ref: {currentCurrency === 'USD' ? 'u$s' : '$'} {refPrice.toLocaleString('es-AR')}</span>
                          <span className="not-italic font-black text-slate-600">Sub: {currentCurrency === 'USD' ? 'u$s' : '$'} {( (manualPurchaseQtys[f.id] ?? f.suggestedToBuy) * (manualPurchasePrices[f.id] ?? refPrice)).toLocaleString('es-AR')}$</span>
                        </div>
                      </Card>
                    );
                  })}
                  <div className="p-2.5 bg-slate-900 rounded-xl text-white space-y-1">
                    <div className="flex justify-between items-center"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS</span><span className="font-black text-xs text-primary">${groupARS.toLocaleString('es-AR')}</span></div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-1"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD</span><span className="font-black text-xs text-emerald-400">u$s {groupUSD.toLocaleString('es-AR')}</span></div>
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-sm text-muted-foreground font-medium">{userData?.role === 'Replenisher' ? 'Redirigiendo a Rutas...' : userData?.role === 'Communicator' ? 'Redirigiendo a Clientes...' : 'Accediendo...'}</p>
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
              <div className="flex items-center gap-2 md:hidden pr-2 border-r"><div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20"><Droplets className="h-4 w-4 text-white" /></div><span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span></div>
              <h1 className="text-xl md:text-3xl font-bold text-primary font-headline">Catálogo e Inventario</h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-muted/50 p-1.5 rounded-2xl border shadow-inner">
              <div className="flex items-center gap-2 px-2 border-r pr-4">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-muted-foreground leading-none">Dólar de Referencia</span>
                  <Tabs value={rateType} onValueChange={(v: any) => setRateType(v)} className="h-7 mt-0.5">
                    <TabsList className="bg-transparent h-7 p-0 gap-1">
                      <TabsTrigger value="official" className="h-6 text-[9px] font-black px-2 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent data-[state=active]:border-primary/20 transition-all">OFICIAL (${exchangeRates.official})</TabsTrigger>
                      <TabsTrigger value="blue" className="h-6 text-[9px] font-black px-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-emerald-600/20 transition-all">BLUE (${exchangeRates.blue})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <Tabs value={activeView} onValueChange={setActiveTab} className="bg-transparent">
                <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border overflow-hidden">
                  <TabsTrigger value="inventory" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase">
                    STOCK
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase">
                    PRODUCCIÓN
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 font-bold gap-2 text-xs" onClick={() => setIsAuditOpen(true)}><Calculator className="h-4 w-4" /> <span className="hidden sm:inline">AUDITORÍA</span></Button>
                {isAdmin && activeView === 'inventory' && (<Button onClick={() => handleOpenDialog()} className="h-9 shadow-lg font-bold text-xs"><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>)}
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
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input placeholder="Buscar por nombre..." className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden h-11 w-11 shrink-0">
                          <ListFilter className="h-5 w-5" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[280px] p-0">
                        <SheetHeader className="p-4 border-b">
                          <SheetTitle>Filtrar Catálogo</SheetTitle>
                        </SheetHeader>
                        <div className="p-4">
                          <FilterPanel />
                        </div>
                      </SheetContent>
                    </Sheet>
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
                        <Button variant="link" onClick={clearFilters} className="text-primary font-bold mt-2">Limpiar filtros para ver todo</Button>
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
                        const isCostInUSD = item.costCurrency === 'USD' || (!item.costCurrency && (item.costUSD > 0 && !item.costARS)); 
                        return (
                          <Card key={item.id} className={cn("glass-card hover:shadow-md transition-all group border-l-4", isLowStock ? "border-l-rose-500 bg-rose-50/30" : "border-l-primary")}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={item.isService ? "secondary" : "default"} className="text-[9px] font-black uppercase">{item.isService ? 'SERVICIO' : 'PRODUCTO'}</Badge>
                                  {item.isCompuesto && <Badge className="text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600"><Layers className="h-2 w-2 mr-1" /> COMPUESTO</Badge>}
                                  {!tracksStock && <Badge variant="outline" className="text-[9px] font-black uppercase text-blue-600 border-blue-200 bg-blue-50">ENTREGA DIRECTA</Badge>}
                                  <Badge variant="outline" className="text-[9px] font-bold bg-white text-muted-foreground border-muted-foreground/20">{catName}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" onClick={() => { setSelectedProductForHistory(item); setIsPurchaseHistoryOpen(true); }} title="Ver Historial de Compras"><History className="h-4 w-4" /></Button>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-40 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleExportBOM(item); }} title="Ver Ficha / Exportar"><Printer className="h-4 w-4" /></Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleExportBOM(item)}><Printer className="mr-2 h-4 w-4" /> Exportar Ficha (PDF)</DropdownMenuItem>
                                      {isAdmin && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}><Edit className="mr-2 h-4 w-4" /> Editar parámetros</DropdownMenuItem>
                                          {item.isCompuesto && (
                                            <DropdownMenuItem className="text-amber-600 font-bold" onClick={() => { setSelectedForAssembly(item); setAssemblyQty(1); setManualSuppliers({}); setIsAssemblyOpen(true); }}><Hammer className="mr-2 h-4 w-4" /> Orden de Armado</DropdownMenuItem>
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
                                    <span className={cn("text-xl font-black", isLowStock ? "text-rose-600" : "text-emerald-600")}>{item.stock || 0}</span>
                                  </div>
                                  {isLowStock && <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 relative overflow-hidden">
                                  <span className="text-[9px] font-black text-blue-700 uppercase block">Venta ARS</span>
                                  <span className="text-md font-black text-blue-800">${(item.priceARS || 0).toLocaleString('es-AR')}</span>
                                  {isAdmin && marginARS && (
                                    <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginARS.color)}>{marginARS.icon} {marginARS.value}%</div>
                                  )}
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 relative overflow-hidden">
                                  <span className="text-[9px] font-black text-emerald-700 uppercase block">Venta USD</span>
                                  <span className="text-md font-black text-emerald-700">u$s {(item.priceUSD || 0).toLocaleString('es-AR')}</span>
                                  {isAdmin && marginUSD && (
                                    <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginUSD.color)}>{marginUSD.icon} {marginUSD.value}%</div>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="pt-2 border-t border-dashed">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground mb-1.5">
                                    <div className="flex items-center gap-1 uppercase tracking-widest">Costo Normalizado {isCostInUSD ? <Badge className="h-3 text-[7px] bg-emerald-600 font-black">BASE USD</Badge> : <Badge className="h-3 text-[7px] bg-blue-600 font-black">BASE ARS</Badge>}</div>
                                    <Badge variant="outline" className="h-4 text-[8px] font-black bg-white uppercase">Costo real</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-xs font-bold italic opacity-80">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] not-italic text-muted-foreground uppercase">Costo ARS</span>
                                      <span className="text-blue-700">${(item.calculatedCostARS || 0).toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                      <span className="text-[9px] not-italic text-muted-foreground uppercase">Costo USD</span>
                                      <span className="text-emerald-700">u$s {(item.calculatedCostUSD || 0).toLocaleString('es-AR')}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ); 
                      })}
                    </section>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="orders" className="m-0"><OrdersList /></TabsContent>
          </Tabs>
        </SidebarInset>
      </div>

      <Dialog open={isPurchaseHistoryOpen} onOpenChange={setIsPurchaseHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl font-black">Historial de Compras</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-slate-800">
              {selectedProductForHistory?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!allPurchases ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Proveedor</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-20">Cant.</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">P. Unitario</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-20">Dólar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPurchases
                      .filter(p => p.productId === selectedProductForHistory?.id)
                      .map((p: any) => (
                        <TableRow key={p.id} className="h-12 hover:bg-muted/5">
                          <TableCell className="text-xs font-medium">
                            {new Date(p.date).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{p.supplierName}</TableCell>
                          <TableCell className="text-center font-black text-xs">{p.quantity}</TableCell>
                          <TableCell className="text-right font-black text-xs">
                            <span className={p.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700'}>
                              {p.currency === 'USD' ? 'u$s' : '$'} {Number(p.price).toLocaleString('es-AR')}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-50">
                              {p.rateType} ${p.exchangeRate}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    {allPurchases.filter(p => p.productId === selectedProductForHistory?.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic text-xs">
                          No se registran compras para este artículo.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPurchaseHistoryOpen(false)} className="font-bold">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierHistoryOpen} onOpenChange={setIsSupplierHistoryOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl font-black">Historial de Suministros: {selectedSupplierForHistory}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Listado completo de productos adquiridos a este proveedor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!allPurchases ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Producto</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-20">Cant.</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">P. Unitario</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPurchases
                      .filter(p => p.supplierName === selectedSupplierForHistory)
                      .map((p: any) => (
                        <TableRow key={p.id} className="h-12 hover:bg-muted/5">
                          <TableCell className="text-xs font-medium">
                            {new Date(p.date).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{p.productName}</TableCell>
                          <TableCell className="text-center font-black text-xs">{p.quantity}</TableCell>
                          <TableCell className="text-right font-black text-xs">
                            <span className={p.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700'}>
                              {p.currency === 'USD' ? 'u$s' : '$'} {Number(p.price).toLocaleString('es-AR')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs">
                            <span className={p.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700'}>
                              {p.currency === 'USD' ? 'u$s' : '$'} {(Number(p.price) * Number(p.quantity)).toLocaleString('es-AR')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    {allPurchases.filter(p => p.supplierName === selectedSupplierForHistory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic text-xs">
                          No se registran compras para este proveedor.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSupplierHistoryOpen(false)} className="font-bold">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-3 pb-1 shrink-0 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-black text-slate-800">Panel de Auditoría y Actualización Masiva</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-4 py-2 shrink-0 border-b bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filtrar artículos..." className="pl-10 h-10" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
              </div>
              <Select value={auditCategoryFilter} onValueChange={setAuditCategoryFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="max-h-[60vh]">
                  <SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem>
                  {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 min-h-0 px-4 py-2 overflow-y-auto">
            <div className="space-y-3 md:hidden">
              {items?.filter(i => !i.isService && i.trackStock !== false && i.name.toLowerCase().includes(auditSearch.toLowerCase()) && (auditCategoryFilter === "all" || i.categoryId === auditCategoryFilter)).sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                <Card key={item.id} className="p-3 bg-white border shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate leading-tight">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mt-1">Disp Actual: <span className="font-black text-primary">{item.stock || 0}</span></p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Label className="text-[10px] font-bold uppercase">STOCK:</Label>
                      <Input type="number" className="w-16 h-8 text-right font-black" defaultValue={item.stock || 0} onBlur={(e) => { const val = Number(e.target.value); if (val !== item.stock) handleUpdateItemAudit(item.id, { stock: val }); }} />
                    </div>
                  </div>
                  <div className="pt-2 border-t grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">Costo Reposición</Label>
                        <Input 
                          type="number" 
                          className="h-8 font-black" 
                          defaultValue={item.costCurrency === 'USD' ? item.costUSD : item.costARS} 
                          onBlur={(e) => handleUpdateItemAudit(item.id, { costAmount: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase">Moneda Base</Label>
                        <Tabs 
                          defaultValue={item.costCurrency || (item.costUSD > 0 && !item.costARS ? 'USD' : 'ARS')} 
                          onValueChange={(v: any) => handleUpdateItemAudit(item.id, { costCurrency: v })}
                          className="h-8"
                        >
                          <TabsList className="grid grid-cols-2 h-8 p-0.5 border shadow-inner">
                            <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                            <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] font-bold uppercase">Proveedor Asignado</Label>
                      <Select defaultValue={item.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateGlobalSupplier(item.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                          {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase">Artículo</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase w-24">Stock</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase w-32">Costo Rep.</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase w-32">Moneda</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase w-48">Proveedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.filter(i => !i.isService && i.trackStock !== false && i.name.toLowerCase().includes(auditSearch.toLowerCase()) && (auditCategoryFilter === "all" || i.categoryId === auditCategoryFilter)).sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                    <TableRow key={item.id} className="h-12 hover:bg-muted/5 transition-colors">
                      <TableCell className="py-1">
                        <p className="font-bold text-xs">{item.name}</p>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Input 
                          type="number" 
                          className="w-20 mx-auto text-center font-black h-8 text-xs" 
                          defaultValue={item.stock || 0} 
                          onBlur={(e) => { const val = Number(e.target.value); if (val !== item.stock) handleUpdateItemAudit(item.id, { stock: val }); }} 
                        />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Input 
                          type="number" 
                          className="w-24 mx-auto text-center font-black h-8 text-xs border-primary/20" 
                          defaultValue={item.costCurrency === 'USD' ? item.costUSD : item.costARS} 
                          onBlur={(e) => handleUpdateItemAudit(item.id, { costAmount: Number(e.target.value) })} 
                        />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Tabs 
                          defaultValue={item.costCurrency || (item.costUSD > 0 && !item.costARS ? 'USD' : 'ARS')} 
                          onValueChange={(v: any) => handleUpdateItemAudit(item.id, { costCurrency: v })}
                          className="w-28 mx-auto"
                        >
                          <TabsList className="grid grid-cols-2 h-8 p-0.5 border shadow-inner">
                            <TabsTrigger value="ARS" className="text-[9px] font-black h-7 data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                            <TabsTrigger value="USD" className="text-[9px] font-black h-7 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Select defaultValue={item.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateGlobalSupplier(item.id, v)}>
                          <SelectTrigger className="h-8 text-[10px] bg-transparent border-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                            {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="p-3 bg-slate-50 border-t shrink-0">
            <Button onClick={() => setIsAuditOpen(false)} className="w-full h-10 font-bold text-sm">Cerrar Auditoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-3 pb-1 shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start pr-8 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2"><Factory className="h-4 w-4 text-primary" /><DialogTitle className="text-base font-black">Orden #{orderToView?.id.toUpperCase().slice(0, 6)}</DialogTitle></div>
                <div className="flex items-center gap-3">
                  <DialogDescription className="text-[11px]">Fabricar <b>{orderToView?.productName}</b></DialogDescription>
                  {orderToView?.status !== 'completed' && (
                    <div className="flex items-center gap-1.5 bg-primary/5 px-1.5 py-0.5 rounded-lg border">
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => { const newQty = Math.max(1, orderToView.quantity - 1); setOrderToView({...orderToView, quantity: newQty}); }}><Minus className="h-3 w-3" /></Button>
                      <span className="text-xs font-black text-primary tabular-nums">{orderToView?.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-primary" onClick={() => { const newQty = orderToView.quantity + 1; setOrderToView({...orderToView, quantity: newQty}); }}><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {orderToView && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 font-bold text-[9px]" onClick={() => handlePrintProductionOrder(orderToView)}>
                      <Printer className="h-3 w-3" /> IMPRIMIR PLAN
                    </Button>
                    <Badge className={cn("font-black uppercase text-[8px] px-1.5 py-0.5", { draft: "bg-slate-100 text-slate-600", pending_purchase: "bg-amber-100 text-amber-700", ready: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700" }[orderToView.status as string])}>{orderToView.status === 'pending_purchase' ? 'FALTAN MATERIALES' : orderToView.status === 'ready' ? 'LISTO' : orderToView.status}</Badge>
                  </>
                )}
                {orderToView?.status !== 'completed' && (
                  <Button variant={hasUnsavedChanges ? "default" : "outline"} size="sm" className={cn("h-6 gap-1 font-bold text-[9px] px-2", hasUnsavedChanges && "bg-primary animate-pulse")} onClick={handleUpdateOrderPlan}>
                    <Save className="h-3 w-3" /> GUARDAR {hasUnsavedChanges && "*"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 pt-1 space-y-4">
            {orderToView && (
              <div className="space-y-4">
                <section className="space-y-2">
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Layers className="h-3 w-3" /> Explosión de Insumos</h3>
                    <div className="grid grid-cols-1 gap-1 md:hidden">
                      {explosionSummary?.all.sort((a,b) => a.name.localeCompare(b.name)).map(req => { 
                        const stockRestante = req.available - req.required; 
                        const faltaDirecto = stockRestante < 0; 
                        return (
                          <Card key={req.id} className="p-2 bg-white border flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[10px] truncate">{req.name}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-center px-1 py-0.5 bg-muted/30 rounded border"><p className="text-[9px] font-black">{req.required}/{req.available}</p></div>
                                {faltaDirecto ? <Badge className="bg-rose-600 text-[7px] h-4 leading-none uppercase font-black px-1">FALTA</Badge> : <CheckCircle className="h-3 w-3 text-emerald-500" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 border-t pt-1.5">
                              <span className="text-[8px] font-bold uppercase text-muted-foreground">PROV:</span>
                              <Select disabled={orderToView.status === 'completed'} defaultValue={manualSuppliers[req.id] || req.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateItemSupplierGlobally(req.id, v)}>
                                <SelectTrigger className="h-6 text-[9px] bg-muted/20 border-none p-1 flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-40">
                                  <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                  {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </Card>
                        ) 
                      })}
                    </div>
                    <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[8px] font-black uppercase h-7">Pieza</TableHead>
                            <TableHead className="text-center text-[8px] font-black uppercase h-7 w-12">Req.</TableHead>
                            <TableHead className="text-center text-[8px] font-black uppercase h-7 w-12">Stock</TableHead>
                            <TableHead className="text-center text-[8px] font-black uppercase h-7 w-48">Proveedor Asignado</TableHead>
                            <TableHead className="text-right text-[8px] font-black uppercase h-7 w-20">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {explosionSummary?.all.sort((a,b) => a.name.localeCompare(b.name)).map(req => { 
                            const stockRestante = req.available - req.required; 
                            const faltaDirecto = stockRestante < 0; 
                            return (
                              <TableRow key={req.id} className="h-10">
                                <TableCell className="py-0.5">
                                  <span className="font-bold text-xs">{req.name}</span>
                                </TableCell>
                                <TableCell className="text-center font-black text-primary text-[10px]">{req.required}</TableCell>
                                <TableCell className="text-center text-[10px]">{req.available}</TableCell>
                                <TableCell className="text-center py-0.5">
                                  <Select disabled={orderToView.status === 'completed'} defaultValue={manualSuppliers[req.id] || req.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateItemSupplierGlobally(req.id, v)}>
                                    <SelectTrigger className="h-7 text-[9px] bg-transparent border-none focus:ring-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                      {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right py-0.5">
                                  {orderToView.status === 'completed' ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                                  ) : faltaDirecto ? (
                                    <Badge className="bg-rose-600 text-[7px] h-4 leading-none py-0 px-1">FALTA</Badge>
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ) 
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><ShoppingCart className="h-3 w-3" /> Compras por Proveedor</h3>
                    <GroupedPurchaseList />
                  </div>
                </section>
              </div>
            )}
          </div>
          <DialogFooter className="p-3 border-t bg-slate-50 shrink-0">
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-2">
              <div className="flex gap-3">
                <div className="text-left">
                  <p className="text-[7px] font-black uppercase text-slate-400">Total ARS</p>
                  <p className="text-base font-black text-blue-700">${purchaseCalculations?.totalARS.toLocaleString('es-AR')}</p>
                </div>
                <div className="text-left border-l pl-3 border-slate-200">
                  <p className="text-[7px] font-black uppercase text-slate-400">Total USD</p>
                  <p className="text-base font-black text-emerald-600">u$s {purchaseCalculations?.totalUSD.toLocaleString('es-AR')}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="ghost" onClick={handleCloseOrderView} className="font-bold text-[10px] h-8 flex-1 md:flex-none">Cerrar</Button>
                {orderToView?.status === 'ready' && (
                  <Button 
                    onClick={handleAssembleFinal} 
                    className="bg-blue-600 hover:bg-blue-700 px-4 font-black shadow-lg h-8 flex-1 md:flex-none text-[10px]"
                  >
                    <Hammer className="mr-1.5 h-3 w-3" /> FINALIZAR ARMADO
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Guardar cambios?</AlertDialogTitle><AlertDialogDescription>Modificaste la planificación. ¿Deseas guardarla?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { setIsExitAlertOpen(false); setOrderToView(null); }}>Descartar</AlertDialogCancel><AlertDialogAction onClick={() => { handleUpdateOrderPlan(); setIsExitAlertOpen(false); setOrderToView(null); }}>Guardar y Salir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[95vh] overflow-hidden w-[95vw] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex justify-between items-start pr-8">
              <div>
                <DialogTitle className="text-2xl font-black font-headline text-primary">
                  {editingItemId ? 'Configurar Ítem' : 'Nuevo Ítem'}
                </DialogTitle>
                <DialogDescription>Gestión de precios, categoría y estructura de armado.</DialogDescription>
              </div>
              {editingItemId && (
                <Button variant="outline" size="icon" onClick={() => handleExportBOM(items?.find(i => i.id === editingItemId))} className="text-primary border-primary/20">
                  <Printer className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0">
            {/* COLUMNA IZQUIERDA: INFORMACIÓN GENERAL */}
            <div className="w-full md:w-[380px] p-6 border-b md:border-b-0 md:border-r md:overflow-y-auto shrink-0 bg-muted/5">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold">Nombre del Producto / Servicio</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Dosificador G4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Categoría</Label>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                      <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                      <SelectContent className="max-h-60">{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Proveedor</Label>
                    <Select value={formData.supplier} onValueChange={(v) => setFormData({...formData, supplier: v})}>
                      <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">SIN PROVEEDOR</SelectItem>
                        {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-blue-700 font-black">Venta ARS ($)</Label>
                    <Input type="number" value={formData.priceARS} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} className="border-blue-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-emerald-700 font-black">Venta USD (u$s)</Label>
                    <Input type="number" value={formData.priceUSD} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} className="border-emerald-200" />
                  </div>
                </div>
                {!formData.isCompuesto ? (
                  <div className="p-4 bg-muted/20 rounded-2xl border border-dashed space-y-3 shadow-inner">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Costo de Reposición</Label>
                      <Badge variant="outline" className={cn("text-[8px] font-black", formData.costCurrency === 'ARS' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-300")}>
                        BASE {formData.costCurrency}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{formData.costCurrency === 'USD' ? 'u$s' : '$'}</span>
                        <Input type="number" value={formData.costAmount} onChange={(e) => setFormData({...formData, costAmount: Number(e.target.value)})} className={cn("pl-8 font-black h-11", formData.costCurrency === 'ARS' ? "border-blue-200" : "border-emerald-200")} />
                      </div>
                      <Tabs value={formData.costCurrency} onValueChange={(v: any) => setFormData({...formData, costCurrency: v})} className="shrink-0">
                        <TabsList className="grid grid-cols-2 w-28 h-11 p-1 border shadow-inner">
                          <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                          <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-inner">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Mano Obra ARS</Label>
                      <Input type="number" value={formData.laborCostARS} onChange={(e) => setFormData({...formData, laborCostARS: Number(e.target.value)})} className="h-10 border-amber-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Mano Obra USD</Label>
                      <Input type="number" value={formData.laborCostUSD} onChange={(e) => setFormData({...formData, laborCostUSD: Number(e.target.value)})} className="h-10 border-amber-200 font-bold" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-white shadow-sm">
                    <Switch checked={formData.isService} onCheckedChange={(v) => { setFormData({...formData, isService: v, trackStock: !v && formData.trackStock, isCompuesto: v ? false : formData.isCompuesto}); }} />
                    <div><Label className="font-bold">Es un servicio</Label><p className="text-[10px] text-muted-foreground">Sin stock ni armado.</p></div>
                  </div>
                  {!formData.isService && (
                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-amber-50/50 border-amber-200 shadow-sm">
                      <Switch checked={formData.isCompuesto} onCheckedChange={(v) => { setFormData({...formData, isCompuesto: v, trackStock: v ? true : formData.trackStock}); }} />
                      <div><Label className="font-bold text-amber-800">Producto compuesto</Label><p className="text-[10px] text-amber-600">Se fabrica a partir de otros.</p></div>
                    </div>
                  )}
                </div>
                {!formData.isService && formData.trackStock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="font-bold">Stock Inicial</Label><Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} /></div>
                    <div className="space-y-2"><Label className="font-bold text-rose-600">Mínimo</Label><Input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} /></div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: ESTRUCTURA BOM */}
            <div className="flex-1 flex flex-col bg-white md:h-full overflow-hidden">
              {formData.isCompuesto ? (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="p-4 bg-amber-50 border-b flex items-center justify-between shrink-0">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2"><Layers className="h-4 w-4" /> Estructura de Armado (BOM)</span>
                    <Badge className="bg-amber-600 font-bold">{formData.components.length} PIEZAS</Badge>
                  </div>
                  
                  <div className="p-4 border-b bg-white grid grid-cols-2 gap-4 shrink-0">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar Piezas</Label>
                      <Select value={bomFilterCategory} onValueChange={setBomFilterCategory}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Categoría..." /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}<SelectItem value="all">Ver Todas</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-primary">Agregar Componente</Label>
                      <Select onValueChange={addComponent}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar parte..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {items?.filter(i => i.id !== editingItemId && !i.isService && (bomFilterCategory === "all" || i.categoryId === bomFilterCategory)).map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {sortedAddedComponents.map((comp) => { 
                      const product = items?.find(i => i.id === comp.productId); 
                      if (!product) return null;
                      const costData = calculateCost(product, items!, currentRate);
                      const isBaseUSD = product.costCurrency === 'USD' || (!product.costCurrency && (product.costUSD > 0 && !product.costARS));
                      
                      return (
                        <div key={`${comp.productId}-${comp.originalIndex}`} className="flex flex-col p-3 rounded-xl border bg-muted/10 hover:bg-white transition-all shadow-sm group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-800 leading-tight truncate">{product.name}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className={cn("px-2 py-0.5 rounded text-[10px] font-black border", isBaseUSD ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-blue-700 bg-blue-50 border-blue-100")}>
                                  {isBaseUSD ? `u$s ${product.costUSD?.toLocaleString()}` : `$ ${product.costARS?.toLocaleString()}`}
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">→ {!isBaseUSD ? `u$s ${costData.usd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : `$ ${costData.ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 border-2 border-primary/20 rounded-lg bg-white px-2 py-1">
                                <input type="number" value={comp.quantity} onChange={(e) => updateComponentQty(comp.originalIndex, Number(e.target.value))} className="w-8 text-xs font-black text-center focus:outline-none" />
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeComponent(comp.originalIndex)}><X className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed">
                            <span className="text-[9px] font-black text-muted-foreground uppercase">Subtotal</span>
                            <div className="flex gap-4">
                              <span className="text-xs font-black text-blue-700">$ {(costData.ars * comp.quantity).toLocaleString()}</span>
                              <span className="text-xs font-black text-emerald-700">u$s {(costData.usd * comp.quantity).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ); 
                    })}
                  </div>

                  {/* FOOTER FIJO DE COSTOS BOM */}
                  <div className="p-6 bg-slate-900 text-white shrink-0 border-t-4 border-amber-500 shadow-2xl relative">
                    <div className="absolute right-4 top-4 opacity-10"><Calculator className="h-12 w-12" /></div>
                    <div className="grid grid-cols-2 gap-8 items-end">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                          <span>Materiales</span>
                          <span className="text-blue-400">$ {(currentEditingCosts.ars - (formData.laborCostARS || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                          <span>Mano de Obra</span>
                          <span className="text-amber-400">$ {formData.laborCostARS?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Costo Total Final</p>
                        <p className="text-4xl font-black text-white leading-none tracking-tighter font-mono">$ {currentEditingCosts.ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                        <p className="text-base font-black text-emerald-400 font-mono">u$s {currentEditingCosts.usd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 flex-1 flex flex-col md:overflow-y-auto">
                  <Label className="font-bold mb-2">Descripción del Producto</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="flex-1 min-h-[200px] bg-muted/5 font-sans leading-relaxed p-4" placeholder="Escribe detalles técnicos, notas o información relevante..." />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-white shrink-0">
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12 px-6 font-bold flex-1 md:flex-none">Cancelar</Button>
              <Button onClick={handleSave} className="h-12 px-10 font-black shadow-xl uppercase tracking-wider flex-1 md:flex-none">
                <CheckCircle2 className="mr-2 h-5 w-5" /> GUARDAR
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]"><DialogHeader><DialogTitle>Categorías de Productos</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="flex gap-2"><Input placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><Button onClick={handleSaveCategory}>{editingCategoryId ? "Actualizar" : "Agregar"}</Button>{editingCategoryId && <Button variant="ghost" onClick={cancelEditCategory}>Cancelar</Button>}</div><ScrollArea className="h-[300px] border rounded-md p-2">{categories.map((cat: any) => (<div key={cat.id} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleFavoriteCategory(cat)}><Star className={cn("h-4 w-4", cat.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} /></Button><span className="text-sm font-medium">{cat.name}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCategory(cat)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, 'product_categories', cat.id))}><Trash2 className="h-4 w-4" /></Button></div></div>))}</ScrollArea></div></DialogContent>
      </Dialog>

      <Dialog open={isSupplierManagerOpen} onOpenChange={setIsSupplierManagerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]"><DialogHeader><DialogTitle>Gestionar Proveedores</DialogTitle></DialogHeader><div className="space-y-6 py-4"><div className="p-4 bg-muted/20 rounded-xl border border-dashed space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-xs font-black uppercase">Nombre del Proveedor</Label><Input placeholder="Ferretería Central..." value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} /></div><div className="space-y-2"><Label className="text-xs font-black uppercase">Teléfono / WhatsApp</Label><Input placeholder="+54 9 11..." value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} /></div></div><div className="space-y-2"><Label className="text-xs font-black uppercase">Dirección</Label><Input placeholder="Av. Principal 123, Pilar..." value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} /></div><Button onClick={handleSaveSupplier} className="w-full font-bold"><Plus className="h-4 w-4 mr-2" /> Guardar Proveedor</Button></div><ScrollArea className="h-[300px] border rounded-xl p-2 bg-white">{sortedSuppliers.length === 0 ? (<p className="text-center py-10 text-xs text-muted-foreground italic">No hay proveedores registrados.</p>) : (<div className="space-y-2">{sortedSuppliers.map((sup: any) => (<div key={sup.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors group"><div className="space-y-1"><div className="flex items-center gap-2"><span className="text-sm font-black text-slate-800">{sup.name}</span>{sup.phone && <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-100">{sup.phone}</Badge>}</div>{sup.address && (<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> {sup.address}</div>)}</div><div className="flex gap-1 mt-2 md:mt-0 md:opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setNewSupplierName(sup.name || ""); setNewSupplierPhone(sup.phone || ""); setNewSupplierAddress(sup.address || ""); deleteDocumentNonBlocking(doc(db, 'suppliers', sup.id)); }}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSupplier(sup.id)}><Trash2 className="h-4 w-4" /></Button></div></div>))}</div>)}</ScrollArea></div></DialogContent>
      </Dialog>

      <Dialog open={isAssemblyOpen} onOpenChange={setIsAssemblyOpen}>
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-3 pb-1 shrink-0"><div className="flex items-center gap-2"><Hammer className="h-4 w-4 text-amber-600" /><DialogTitle className="text-base font-black">Nuevo Armado</DialogTitle></div><DialogDescription className="text-[10px]">Planificar fabricación para <b>{selectedForAssembly?.name}</b></DialogDescription></DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-4">
            <section className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center justify-between gap-4">
              <div><Label className="font-black text-amber-800 uppercase tracking-widest text-[9px]">Unidades a fabricar</Label></div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-inner"><Button variant="ghost" size="icon" onClick={() => setAssemblyQty(Math.max(1, assemblyQty - 1))} className="h-7 w-7 text-amber-600"><Minus className="h-3 w-3" /></Button><input type="number" value={assemblyQty} onChange={(e) => setAssemblyQty(Number(e.target.value))} className="w-10 text-lg font-black text-center text-amber-900 focus:outline-none" /><Button variant="ghost" size="icon" onClick={() => setAssemblyQty(assemblyQty + 1)} className="h-7 w-7 text-amber-600"><Plus className="h-3 w-3" /></Button></div>
            </section>
            {explosionSummary && (<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <section className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><Layers className="h-3 w-3" /> Simulación de Insumos</h3><Badge variant="outline" className="font-bold border-amber-200 text-amber-700 bg-amber-50 text-[8px]">{explosionSummary.all.length} PIEZAS</Badge></div>
                <div className="grid grid-cols-1 gap-1 md:hidden">{explosionSummary.all.sort((a,b) => a.name.localeCompare(b.name)).map((req) => { const stockRestante = req.available - req.required; const faltaDirecto = stockRestante < 0; return (
                  <Card key={req.id} className="p-1.5 border shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[10px] truncate">{req.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-center px-1 py-0.5 bg-muted/20 rounded"><p className="text-[10px] font-black text-primary">{req.required}/{req.available}</p></div>
                        {faltaDirecto ? <Badge className="bg-rose-600 text-[7px] px-1">FALTA</Badge> : <CheckCircle className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t pt-1">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">PROV:</span>
                      <Select defaultValue={manualSuppliers[req.id] || req.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateItemSupplierGlobally(req.id, v)}>
                        <SelectTrigger className="h-6 text-[9px] bg-muted/20 border-none p-1 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-40">
                          <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                          {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ); })}</div>
                <div className="hidden md:block border rounded-xl bg-white shadow-sm overflow-x-auto"><Table className="min-w-[500px]"><TableHeader className="bg-slate-50"><TableRow><TableHead className="font-black text-[8px] uppercase h-7">Componente</TableHead><TableHead className="text-center font-black text-[8px] uppercase h-7 w-12">Req.</TableHead><TableHead className="text-center font-black text-[8px] uppercase h-7 w-12">Stock</TableHead><TableHead className="text-center font-black text-[8px] uppercase h-7 w-40">Proveedor</TableHead><TableHead className="text-right font-black text-[8px] uppercase h-7 w-20">Estado</TableHead></TableRow></TableHeader><TableBody>{explosionSummary.all.sort((a,b) => a.name.localeCompare(b.name)).map((req) => { const stockRestante = req.available - req.required; const faltaDirecto = stockRestante < 0; return (<TableRow key={req.id} className="h-10"><TableCell className="py-0.5"><span className="font-bold text-[11px]">{req.name}</span></TableCell><TableCell className="text-center font-black text-primary text-[10px]">{req.required}</TableCell><TableCell className="text-center text-slate-500 text-[10px]">{req.available}</TableCell><TableCell className="text-center py-0.5"><Select defaultValue={manualSuppliers[req.id] || req.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateItemSupplierGlobally(req.id, v)}><SelectTrigger className="h-7 text-[9px] bg-transparent border-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent className="max-h-60"><SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>{sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-right py-0.5">{faltaDirecto ? <Badge className="bg-rose-600 font-bold text-[7px] h-4">FALTA</Badge> : <CheckCircle className="h-3 w-3 text-emerald-500 ml-auto" />}</TableCell></TableRow>); })}</TableBody></Table></div>
              </section>
              <section className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="text-[9px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2"><ShoppingCart className="h-3 w-3" /> Carrito de Compras</h3><Button variant="outline" size="sm" className="h-6 gap-1 font-bold text-[8px]" onClick={() => { setManualPurchaseQtys({}); setManualPurchasePrices({}); setManualSuppliers({}); setManualPurchaseCurrencies({}); }}><RefreshCw className="h-2 w-2" /> REINICIAR</Button></div>
                <GroupedPurchaseList />
              </section>
            </div>)}
          </div>
          <DialogFooter className="p-3 border-t bg-slate-50 shrink-0"><Button variant="ghost" onClick={() => setIsAssemblyOpen(false)} className="font-bold text-[10px] h-8">Cancelar</Button><Button onClick={handleCreateOrder} className="px-4 font-black shadow-xl h-8 bg-primary text-white text-[10px]"><ClipboardList className="mr-1.5 h-3 w-3" /> GUARDAR COMO ORDEN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if(!o) setItemToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente "{itemToDelete?.name}" y no podrá utilizarse en nuevas operaciones ni armados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => { if(!o) setOrderToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden de producción?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción borrará la planificación de esta orden. No afectará el stock actual.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive text-white">Eliminar Orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToFinalize} onOpenChange={(o) => { if(!o) setOrderToFinalize(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-600" /> Finalizar Armado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmar la finalización de <b>{orderToFinalize?.quantity} unidades</b> de <b>{orderToFinalize?.productName}</b>?<br /><br />
              Se descontarán inteligentemente los insumos disponibles del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinalize} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirmar y Descontar Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FICHA TÉCNICA DE PRODUCTO (PDF) */}
      {itemToPrint && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{itemToPrint.name}</h1>
              <p className="text-sm font-bold text-slate-600">Categoría: {categoryMap[itemToPrint.categoryId] || 'S/D'}</p>
              <p className="text-xs text-slate-400 uppercase mt-1">ID: {itemToPrint.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
              <p className="text-xs font-bold">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
              <h2 className="text-[10px] font-black uppercase mb-3 border-b border-slate-200 pb-1">Precios de Venta</h2>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">PESOS (ARS):</span>
                  <span className="text-lg font-black text-blue-700">${(itemToPrint.priceARS || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">DÓLARES (USD):</span>
                  <span className="text-lg font-black text-emerald-700">u$s {(itemToPrint.priceUSD || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
                <h2 className="text-[10px] font-black uppercase mb-3 border-b border-slate-200 pb-1 text-slate-500">Análisis de Costos (Privado)</h2>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">COSTO ARS:</span>
                    <span className="text-sm font-black text-blue-700">${(itemToPrint.calculatedCostARS || 0).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">COSTO USD:</span>
                    <span className="text-sm font-black text-emerald-700">u$s {(itemToPrint.calculatedCostUSD || 0).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {itemToPrint.isCompuesto && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4" /> Estructura de Armado (BOM)
              </h3>
              <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-900 p-2 text-left uppercase font-black">Componente / Pieza</th>
                    <th className="border border-slate-900 p-2 text-center uppercase font-black w-24">Cantidad</th>
                    <th className="border border-slate-900 p-2 text-center uppercase font-black w-32">Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {itemToPrint.components?.map((comp: any, idx: number) => {
                    const product = items?.find(i => i.id === comp.productId);
                    return (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border border-slate-900 p-2">
                          <p className="font-black">{product?.name || 'Cargando...'}</p>
                          <p className="text-[9px] text-slate-500 uppercase mt-0.5">{categoryMap[product?.categoryId || ''] || 'S/D'}</p>
                        </td>
                        <td className="border border-slate-900 p-2 text-center font-black text-base">{comp.quantity}</td>
                        <td className="border border-slate-900 p-2 text-center font-medium">{product?.supplier || '---'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!itemToPrint.isCompuesto && itemToPrint.description && (
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase mb-2">Descripción del Producto</h3>
              <div className="p-4 border border-dashed border-slate-400 rounded-lg text-sm italic leading-relaxed text-slate-700">
                {itemToPrint.description}
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t-2 border-slate-900 flex justify-between items-end italic text-[10px] text-slate-400">
            <p>Este documento es una ficha técnica oficial generada por el sistema Dosimat Pro.</p>
            <p>Pág 1/1</p>
          </div>
        </div>
      )}

      {/* PLAN DE ARMADO DE ORDEN DE PRODUCCIÓN (PDF) */}
      {orderToPrint && (
        <div className="print-only w-full p-8 font-sans text-slate-900 bg-white">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Plan de Armado / Producción</h1>
              <p className="text-sm font-bold text-slate-600">Orden #{orderToPrint.id.toUpperCase().slice(0, 6)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-primary">CANTIDAD: {orderToPrint.quantity}</p>
              <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="mb-8 p-4 border-2 border-slate-900 rounded-2xl bg-slate-50">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1">Producto a Fabricar</h2>
            <h3 className="text-3xl font-black uppercase">{orderToPrint.productName}</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <h3 className="text-sm font-black uppercase tracking-widest">Explosión de Materiales Inteligente</h3>
            </div>
            
            <p className="text-[10px] text-slate-500 italic mb-4">
              * Nota: Los componentes con stock suficiente aparecen como "Retirar de Stock". 
              Aquellos sin stock se han expandido en sus partes componentes para su fabricación.
            </p>

            <table className="w-full border-collapse border-2 border-slate-900 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-900 p-2 text-left uppercase font-black">Componente / Insumo</th>
                  <th className="border border-slate-900 p-2 text-center uppercase font-black w-24">Cantidad</th>
                  <th className="border border-slate-900 p-2 text-left uppercase font-black w-48">Instrucción</th>
                </tr>
              </thead>
              <tbody>
                {(orderToPrint.status === 'completed' && orderToPrint.smartExplosionSnapshot 
                  ? orderToPrint.smartExplosionSnapshot 
                  : getSmartExplosion(orderToPrint.productId, orderToPrint.quantity, 0)
                ).map((row: any, idx: number) => {
                  if (row.level === 0) return null;
                  return (
                    <tr key={idx} className={cn("border-b border-slate-300", row.level > 1 && "bg-slate-50/50")}>
                      <td className="border border-slate-900 p-2">
                        <div style={{ paddingLeft: `${(row.level - 1) * 20}px` }} className="flex items-center gap-2">
                          {row.level > 1 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                          <span className={cn("font-bold", row.level === 1 && "text-sm font-black")}>{row.name}</span>
                        </div>
                      </td>
                      <td className="border border-slate-900 p-2 text-center font-black text-lg">
                        {row.requested}
                      </td>
                      <td className="border border-slate-900 p-2">
                        {orderToPrint.status === 'completed' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle className="h-3 w-3" />
                            <span>COMPLETADO</span>
                          </div>
                        ) : row.fromStock > 0 ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle className="h-3 w-3" />
                            <span>Retirar {row.fromStock} de STOCK</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            <span>FABRICAR / COMPRAR</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-12">
            <div className="border-t-2 border-slate-900 pt-2">
              <p className="text-[10px] font-black uppercase text-slate-400">Salida de Materiales (Firma)</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Recepción de Producto (Firma)</p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-dashed border-slate-300 italic text-[9px] text-slate-400 text-center">
            Este documento es una orden de producción interna generada por Dosimat Pro.
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
