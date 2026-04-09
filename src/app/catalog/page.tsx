
"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Droplet,
  ChevronLeft,
  ExternalLink,
  ChevronDown,
  LinkIcon,
  Archive,
  CreditCard
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu as DropdownMenuUI,
  DropdownMenuContent as DropdownMenuContentUI,
  DropdownMenuItem as DropdownMenuItemUI,
  DropdownMenuTrigger as DropdownMenuTriggerUI,
  DropdownMenuSeparator
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

function CatalogContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  const [activeView, setActiveTab] = useState("inventory")

  // Sincronizar pestaña activa con parámetros de URL (Dashboard)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'orders') setActiveTab('orders')
    else if (tab === 'purchases') setActiveTab('purchases')
    else if (tab === 'inventory') setActiveTab('inventory')
  }, [searchParams])

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
  
  // Exchange Rates Logic
  const [exchangeRates, setExchangeRates] = useState({ official: 1, blue: 1 })
  const [rateType, setOrderRateType] = useState<'official' | 'blue'>('official')

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
  const purchaseOrdersQuery = useMemoFirebase(() => query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc')), [db])
  const allPurchasesQuery = useMemoFirebase(() => query(collection(db, 'purchases'), orderBy('date', 'desc')), [db])
  
  const { data: items, isLoading } = useCollection(catalogQuery)
  const { data: rawCategories, isLoading: loadingCats } = useCollection(categoriesQuery)
  const { data: suppliers } = useCollection(suppliersQuery)
  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery)
  const { data: purchaseOrders, isLoading: loadingPO } = useCollection(purchaseOrdersQuery)
  const { data: allPurchases } = useCollection(allPurchasesQuery)
  
  const categories = useMemo(() => {
    if (!rawCategories) return []
    return [...rawCategories].sort((a: any, b: any) => {
      // Priorizar favoritos
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Luego por nombre alfabéticamente
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
  const [isNewPurchaseOrderOpen, setIsNewPurchaseOrderOpen] = useState(false)
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
  const [supplierToDelete, setSupplierToDelete] = useState<any | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedForAssembly, setSelectedForAssembly] = useState<any | null>(null)
  const [assemblyQty, setAssemblyQty] = useState(1)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const [newSupplierName, setNewSupplierName] = useState("")
  const [newSupplierPhone, setNewSupplierPhone] = useState("")
  const [newSupplierAddress, setNewSupplierAddress] = useState("")
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [itemToPrint, setItemToPrint] = useState<any | null>(null)
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null)
  const [orderToView, setOrderToView] = useState<any | null>(null)
  const [purchaseOrderToView, setPurchaseOrderToView] = useState<any | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null)
  const [purchaseOrderToDelete, setPurchaseOrderToDelete] = useState<any | null>(null)
  const [orderToFinalize, setOrderToFinalize] = useState<any | null>(null)
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false)
  
  const [bomFilterCategory, setBomFilterCategory] = useState("all")

  // States for Purchase Orders creation
  const [newPOItems, setNewPurchaseOrderItems] = useState<any[]>([])
  const [newPOTitle, setNewPOTitle] = useState("")
  const [newPOCatFilter, setNewPOCatFilter] = useState("all")

  const [manualPurchaseQtys, setManualPurchaseQtys] = useState<Record<string, number>>({})
  const [manualPurchasePrices, setManualPurchasePrices] = useState<Record<string, number>>({})
  const [manualPurchaseCurrencies, setManualPurchaseCurrencies] = useState<Record<string, 'ARS' | 'USD'>>({})
  const [manualSuppliers, setManualSuppliers] = useState<Record<string, string>>({})
  const [supplierStatuses, setSupplierStatuses] = useState<Record<string, 'pending' | 'ordered'>>({})
  const [initialPlanData, setInitialPlanData] = useState({ qtys: {}, sups: {}, prices: {}, currencies: {}, statuses: {}, qty: 0, itemsCount: 0 })

  const [initialProductionQty, setInitialProductionQty] = useState<number | null>(null)
  const [localProductionQty, setLocalProductionQty] = useState<number>(0)

  const [editHistory, setEditHistory] = useState<any[]>([])

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

  // Grouping Counts
  const activeProdCount = useMemo(() => orders?.filter(o => o.status !== 'completed').length || 0, [orders]);
  const activePurchCount = useMemo(() => purchaseOrders?.filter(po => !po.items.every((i: any) => i.received)).length || 0, [purchaseOrders]);

  // Grouping Orders and Purchases
  const groupedOrders = useMemo(() => ({
    active: orders?.filter(o => o.status !== 'completed') || [],
    history: orders?.filter(o => o.status === 'completed') || []
  }), [orders]);

  const groupedPurchases = useMemo(() => ({
    active: purchaseOrders?.filter(po => !po.items.every((i: any) => i.received)) || [],
    history: purchaseOrders?.filter(po => po.items.every((i: any) => i.received)) || []
  }), [purchaseOrders]);

  // Obtener la versión actualizada de la orden que se está visualizando
  const liveOrderToView = useMemo(() => {
    if (!orderToView || !orders) return null;
    return orders.find(o => o.id === orderToView.id) || orderToView;
  }, [orderToView, orders]);

  // Fix pointer events
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isNewPurchaseOrderOpen || isCategoryManagerOpen || isSupplierManagerOpen || !!orderToView || !!purchaseOrderToView || !!orderToDelete || !!purchaseOrderToDelete || isAuditOpen || isExitAlertOpen || !!orderToFinalize || isPurchaseHistoryOpen || isSupplierHistoryOpen || !!supplierToDelete || !!categoryToDelete;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isNewPurchaseOrderOpen, isCategoryManagerOpen, isSupplierManagerOpen, orderToView, purchaseOrderToView, orderToDelete, purchaseOrderToDelete, isAuditOpen, isExitAlertOpen, orderToFinalize, isPurchaseHistoryOpen, isSupplierHistoryOpen, supplierToDelete, categoryToDelete]);

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
    
    const laborARS = (Number(itemData.laborCostARS) || 0) + (Number(itemData.laborCostUSD || 0) * currentExchangeRate);
    const laborUSD = (Number(itemData.laborCostUSD) || 0) + (Number(itemData.laborCostARS || 0) / currentExchangeRate);
    
    let totalARS = laborARS;
    let totalUSD = laborUSD;

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
        const name = item.name ?? "";
        const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
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
    const currentOrder = liveOrderToView;
    
    if (currentOrder?.status === 'completed' && currentOrder.explosionSnapshot) {
      const all = [...currentOrder.explosionSnapshot.all].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      return { ...currentOrder.explosionSnapshot, all };
    }

    const target = currentOrder ? items?.find(i => i.id === currentOrder.productId) : selectedForAssembly;
    const qty = currentOrder ? localProductionQty : assemblyQty;
    
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

    const flatList = Object.values(requirements)
      .map(req => {
        const missingForOrder = Math.max(0, req.required - req.available);
        const totalSuggestedToBuy = Math.max(missingForOrder, (req.available < req.required + req.minStock) ? (req.required + req.minStock - req.available) : 0);
        
        return {
          ...req,
          missing: missingForOrder,
          suggestedToBuy: totalSuggestedToBuy
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return {
      all: flatList,
      toBuySuggested: flatList.filter(f => f.suggestedToBuy > 0)
    };
  }, [selectedForAssembly, assemblyQty, items, liveOrderToView, localProductionQty]);

  useEffect(() => {
    if (liveOrderToView && liveOrderToView.status !== 'completed' && explosionSummary) {
      // Solo actualizamos estado si la cantidad de la DB ya se actualizó
      if (liveOrderToView.quantity === localProductionQty) {
        const anyMissing = explosionSummary.all.some(f => (f.available - f.required) < 0);
        const newStatus = anyMissing ? 'pending_purchase' : 'ready';
        
        if (newStatus !== liveOrderToView.status) {
          updateDocumentNonBlocking(doc(db, 'production_orders', liveOrderToView.id), { status: newStatus });
        }
      }
    }
  }, [items, liveOrderToView, explosionSummary, db, localProductionQty]);

  useEffect(() => {
    if (purchaseOrderToView) {
      const newManualQtys: Record<string, number> = {};
      const newManualPrices: Record<string, number> = {};
      const newManualCurrencies: Record<string, 'ARS' | 'USD'> = {};
      const newManualSups: Record<string, string> = {};
      
      purchaseOrderToView.items.forEach((item: any) => {
        const lineId = item.id || item.productId;
        newManualQtys[lineId] = item.quantity ?? 0;
        newManualCurrencies[lineId] = item.currency || 'ARS';
        newManualPrices[lineId] = item.price ?? 0;
        newManualSups[lineId] = item.supplier || "Sin Proveedor";
      });
      
      setManualPurchaseQtys(newManualQtys);
      setManualPurchasePrices(newManualPrices);
      setManualPurchaseCurrencies(newManualCurrencies);
      setManualSuppliers(newManualSups);
      setSupplierStatuses(purchaseOrderToView.supplierStatuses || {});
      setInitialPlanData({
        qtys: JSON.parse(JSON.stringify(newManualQtys)),
        prices: JSON.parse(JSON.stringify(newManualPrices)),
        currencies: JSON.parse(JSON.stringify(newManualCurrencies)),
        sups: JSON.parse(JSON.stringify(newManualSups)),
        statuses: JSON.parse(JSON.stringify(purchaseOrderToView.supplierStatuses || {})),
        qty: 0,
        itemsCount: purchaseOrderToView.items.length
      });
    }
  }, [purchaseOrderToView]);

  const hasUnsavedChanges = useMemo(() => {
    if (!purchaseOrderToView) return false;
    if (purchaseOrderToView?.status === 'completed') return false;
    
    const itemsCountMatch = purchaseOrderToView.items.length === initialPlanData.itemsCount;
    
    return JSON.stringify(manualPurchaseQtys) !== JSON.stringify(initialPlanData.qtys) ||
           JSON.stringify(manualPurchasePrices) !== JSON.stringify(initialPlanData.prices) ||
           JSON.stringify(manualPurchaseCurrencies) !== JSON.stringify(initialPlanData.currencies) ||
           JSON.stringify(manualSuppliers) !== JSON.stringify(initialPlanData.sups) ||
           JSON.stringify(supplierStatuses) !== JSON.stringify(initialPlanData.statuses) ||
           !itemsCountMatch;
  }, [manualPurchaseQtys, manualPurchasePrices, manualPurchaseCurrencies, manualSuppliers, supplierStatuses, initialPlanData, purchaseOrderToView]);

  const isProductionOutOfSync = useMemo(() => {
    if (!orderToView || !liveOrderToView) return false;
    if (liveOrderToView.status === 'completed') return false;
    return localProductionQty !== initialProductionQty;
  }, [orderToView, liveOrderToView, initialProductionQty, localProductionQty]);

  const handleCloseOrderView = () => {
    if (hasUnsavedChanges || isProductionOutOfSync) {
      setIsExitAlertOpen(true);
    } else {
      setOrderToView(null);
      setPurchaseOrderToView(null);
    }
  };

  const purchaseCalculations = useMemo(() => {
    if (!items || !purchaseOrderToView) return null;

    const itemsToBuy = purchaseOrderToView.items.map((item: any) => {
      const prod = items.find(i => i.id === item.productId);
      const lineId = item.id || item.productId;
      const manualQty = manualPurchaseQtys[lineId] ?? item.quantity;
      const manualCurrency = manualPurchaseCurrencies[lineId] ?? (item.currency || 'ARS');
      const manualPrice = manualPurchasePrices[lineId] ?? item.price;
      const currentSup = manualSuppliers[lineId] || (item.supplier || "Sin Proveedor");

      return {
        id: lineId,
        productId: item.productId,
        name: item.productName,
        available: prod?.stock || 0,
        required: 0,
        manualQty,
        manualPrice,
        manualCurrency,
        supplier: currentSup,
        received: item.received || false,
        refCostARS: prod?.costARS || 0,
        refCostUSD: prod?.costUSD || 0,
        refCostCurrency: prod?.costCurrency || (prod?.costUSD > 0 && !prod?.costARS ? 'USD' : 'ARS')
      };
    }).filter((i: any) => !i.received);

    return {
      items: itemsToBuy,
      totalARS: itemsToBuy.reduce((sum: number, item: any) => sum + (item.manualQty * (item.manualCurrency === 'ARS' ? item.manualPrice : 0)), 0),
      totalUSD: itemsToBuy.reduce((sum: number, item: any) => sum + (item.manualQty * (item.manualCurrency === 'USD' ? item.manualPrice : 0)), 0)
    };
  }, [manualPurchaseQtys, manualPurchasePrices, manualPurchaseCurrencies, manualSuppliers, items, purchaseOrderToView]);

  const currentEditingCosts = useMemo(() => {
    if (!items || !formData.isCompuesto) return { ars: 0, usd: 0 };
    return calculateCost(formData, items, currentRate);
  }, [formData, items, currentRate, calculateCost]);

  const totalLaborARS = useMemo(() => {
    return (formData.laborCostARS || 0) + (formData.laborCostUSD || 0) * currentRate;
  }, [formData.laborCostARS, formData.laborCostUSD, currentRate]);

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

  const whereUsed = useMemo(() => {
    if (!editingItemId || !items) return [];
    return items
      .filter((parent: any) => 
        parent.isCompuesto && 
        parent.components?.some((comp: any) => comp.productId === editingItemId)
      )
      .map((parent: any) => {
        const comp = parent.components.find((c: any) => c.productId === editingItemId);
        return {
          id: parent.id,
          name: parent.name,
          quantity: comp?.quantity || 0
        };
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [editingItemId, items]);

  const generateFriendlyOrderId = useCallback((existingOrders: any[]) => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    
    const todayOrders = existingOrders.filter(o => {
      const oDate = new Date(o.createdAt);
      return oDate.toDateString() === now.toDateString();
    });
    
    const nextSeq = (todayOrders.length + 1).toString().padStart(2, '0');
    return `${datePrefix}_${nextSeq}`;
  }, []);

  const loadItemIntoForm = useCallback((item: any) => {
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
    const costAmount = costCurrency === 'USD' ? (item.costUSD ?? 0) : (item.costARS ?? 0);

    setFormData({
      name: item.name || "",
      categoryId: item.categoryId || "",
      supplier: item.supplier || "none",
      priceARS: item.priceARS ?? 0,
      priceUSD: item.priceUSD ?? 0,
      costAmount: costAmount,
      costCurrency: costCurrency,
      laborCostARS: item.laborCostARS ?? 0,
      laborCostUSD: item.laborCostUSD ?? 0,
      isService: item.isService || false,
      isCompuesto: item.isCompuesto || false,
      trackStock: item.trackStock !== undefined ? item.trackStock : !item.isService,
      description: item.description || "",
      stock: item.stock ?? 0,
      minStock: item.minStock ?? 0,
      components: sanitizedComponents
    })
  }, []);

  const handleOpenDialog = (item?: any) => {
    setEditHistory([]); 
    if (item) {
      loadItemIntoForm(item);
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

  const handleOpenOrderView = (order: any) => {
    setOrderToView(order);
    setInitialProductionQty(order.quantity);
    setLocalProductionQty(order.quantity);
  };

  const handleJumpToComponent = (componentId: string) => {
    const component = items?.find(i => i.id === componentId);
    if (!component) return;
    setEditHistory(prev => [...prev, { id: editingItemId, data: JSON.parse(JSON.stringify(formData)) }]);
    loadItemIntoForm(component);
    const scrollContainer = document.getElementById('config-item-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }

  const handleGoBackInHistory = () => {
    const newHistory = [...editHistory];
    const previousState = newHistory.pop();
    if (!previousState) return;
    setEditHistory(newHistory);
    setEditingItemId(previousState.id);
    setFormData(previousState.data);
    const scrollContainer = document.getElementById('config-item-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
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
      costARS: formData.costCurrency === 'ARS' ? (formData.costAmount ?? 0) : 0,
      costUSD: formData.costCurrency === 'USD' ? (formData.costAmount ?? 0) : 0
    }

    setDocumentNonBlocking(doc(db, 'products_services', id), savePayload, { merge: true })
    
    if (editHistory.length > 0) {
      toast({ title: "Cambios guardados en componente" });
      handleGoBackInHistory();
    } else {
      setIsDialogOpen(false)
      toast({ title: editingItemId ? "Item actualizado" : "Item creado" })
    }
  }

  const handleCreateOrder = () => {
    if (!selectedForAssembly) return;
    const id = Math.random().toString(36).substring(2, 11);
    const friendlyId = generateFriendlyOrderId(orders || []);
    
    const anyMissing = explosionSummary?.all.some(f => (f.available - f.required) < 0);
    const status = anyMissing ? 'pending_purchase' : 'ready';
    
    const newOrder = {
      id,
      friendlyId,
      productId: selectedForAssembly.id,
      productName: selectedForAssembly.name,
      quantity: assemblyQty,
      status,
      createdAt: new Date().toISOString(),
      purchaseOrderId: null
    };

    setDocumentNonBlocking(doc(db, 'production_orders', id), newOrder, { merge: true });
    setIsAssemblyOpen(false);
    setActiveTab("orders");
    toast({ title: "Orden de producción creada", description: `ID: #${friendlyId}` });
  }

  const handleCreatePurchaseOrder = () => {
    if (newPOItems.length === 0) return;
    const id = Math.random().toString(36).substring(2, 11);
    const friendlyId = generateFriendlyOrderId(purchaseOrders || []);
    
    const itemsToSave = newPOItems.map(item => ({
      id: Math.random().toString(36).substring(2, 11),
      productId: item.id,
      productName: item.name,
      quantity: Number(item.qtyToAdd) || 1,
      price: item.costCurrency === 'USD' ? (item.costUSD ?? 0) : (item.costARS ?? 0),
      currency: item.costCurrency || 'ARS',
      supplier: item.supplier || "Sin Proveedor",
      received: false
    }));

    const newPO = {
      id,
      friendlyId,
      description: newPOTitle || "Compra Manual",
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: itemsToSave,
      supplierStatuses: {},
      productionOrderId: null
    };

    setDocumentNonBlocking(doc(db, 'purchase_orders', id), newPO, { merge: true });
    
    setIsNewPurchaseOrderOpen(false);
    setNewPurchaseOrderItems([]);
    setNewPOTitle("");
    setActiveTab("purchases");
    toast({ title: "Orden de compra creada", description: `ID: #${friendlyId}` });
  }

  const handleGeneratePOFromProduction = () => {
    if (!orderToView || !explosionSummary) return;
    
    // 1. Actualizar la cantidad del plan en la DB
    updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), { 
      quantity: localProductionQty 
    });

    const linkedPOId = orderToView.purchaseOrderId;
    const existingPO = purchaseOrders?.find(po => po.id === linkedPOId);

    if (existingPO && existingPO.status !== 'completed') {
      const updatedItems = [...existingPO.items];
      const newSupplierStatuses = { ...(existingPO.supplierStatuses || {}) };
      
      explosionSummary.all.forEach(req => {
        const productId = req.id;
        const required = req.required; // Total necesario para el NUEVO plan
        const stock = req.available;   // Stock actual
        
        // Buscar líneas existentes en la OC para este producto
        const poLines = updatedItems.filter((i: any) => i.productId === productId);
        const totalPendingInPO = poLines.filter((i: any) => !i.received).reduce((sum, i) => sum + i.quantity, 0);
        
        // Cuánto necesitamos tener en la OC (Pendiente) para cubrir el plan
        const targetPending = Math.max(0, required - stock);
        
        if (targetPending !== totalPendingInPO) {
          if (targetPending > totalPendingInPO) {
            // Aumentar: sumar a la primera línea pendiente o crear nueva
            const diff = targetPending - totalPendingInPO;
            const firstPendingLine = updatedItems.find(i => i.productId === productId && !i.received);
            
            if (firstPendingLine) {
              const lineIdx = updatedItems.findIndex(i => i.id === firstPendingLine.id);
              updatedItems[lineIdx].quantity += diff;
              const supplier = updatedItems[lineIdx].supplier || "Sin Proveedor";
              newSupplierStatuses[supplier] = 'pending'; // Desbloquear proveedor
            } else {
              const supplier = req.supplier || "Sin Proveedor";
              updatedItems.push({
                id: Math.random().toString(36).substring(2, 11),
                productId: productId,
                productName: req.name,
                quantity: diff,
                price: req.costCurrency === 'USD' ? (req.costUSD ?? 0) : (req.costARS ?? 0),
                currency: req.costCurrency || 'ARS',
                supplier: supplier,
                received: false
              });
              newSupplierStatuses[supplier] = 'pending'; // Desbloquear proveedor
            }
          } else {
            // Disminuir: reducir de las líneas pendientes
            let diff = totalPendingInPO - targetPending;
            const pendingLines = updatedItems.filter(i => i.productId === productId && !i.received);
            
            for (const line of pendingLines) {
              if (diff <= 0) break;
              const lineIdx = updatedItems.findIndex(i => i.id === line.id);
              const toReduce = Math.min(updatedItems[lineIdx].quantity, diff);
              updatedItems[lineIdx].quantity -= toReduce;
              diff -= toReduce;
              const supplier = updatedItems[lineIdx].supplier || "Sin Proveedor";
              newSupplierStatuses[supplier] = 'pending'; // Desbloquear proveedor
            }
          }
        }
      });

      // Limpiar ítems con cantidad 0 que no fueron recibidos
      const finalItems = updatedItems.filter(i => i.quantity > 0 || i.received);

      updateDocumentNonBlocking(doc(db, 'purchase_orders', existingPO.id), { 
        items: finalItems,
        supplierStatuses: newSupplierStatuses 
      });
      toast({ title: "Orden de Compra sincronizada", description: "Cantidades ajustadas y proveedores afectados desbloqueados para revisión." });
    } else {
      // Crear nueva OC si no existía (basada en el nuevo plan)
      const missingItems = explosionSummary.all.filter(f => (f.required - f.available) > 0);
      const newPOId = Math.random().toString(36).substring(2, 11);
      const friendlyId = generateFriendlyOrderId(purchaseOrders || []);
      
      const newPOItems = missingItems.map(m => ({
        id: Math.random().toString(36).substring(2, 11),
        productId: m.id,
        productName: m.name,
        quantity: Math.max(m.missing, m.suggestedToBuy),
        price: m.costCurrency === 'USD' ? (m.costUSD ?? 0) : (m.costARS ?? 0),
        currency: m.costCurrency || 'ARS',
        supplier: m.supplier || "Sin Proveedor",
        received: false
      }));

      const newPO = {
        id: newPOId,
        friendlyId,
        description: `Faltantes: ${orderToView.productName}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: newPOItems,
        supplierStatuses: {},
        productionOrderId: orderToView.id
      };

      setDocumentNonBlocking(doc(db, 'purchase_orders', newPOId), newPO, { merge: true });
      updateDocumentNonBlocking(doc(db, 'production_orders', orderToView.id), { purchaseOrderId: newPOId });
      toast({ title: "Orden de Compra generada", description: `Vinculada al plan. ID: #${friendlyId}` });
    }
    
    setInitialProductionQty(localProductionQty);
  }

  const handleUpdateOrderPlan = () => {
    if (purchaseOrderToView) {
      const updatedItems = purchaseOrderToView.items.map((item: any) => {
        const lineId = item.id || item.productId;
        return {
          ...item,
          id: lineId,
          quantity: manualPurchaseQtys[lineId] ?? item.quantity,
          price: manualPurchasePrices[lineId] ?? item.price,
          currency: manualPurchaseCurrencies[lineId] ?? item.currency,
          supplier: manualSuppliers[lineId] ?? item.supplier
        };
      });

      updateDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToView.id), {
        items: updatedItems,
        supplierStatuses: supplierStatuses
      });

      setInitialPlanData(prev => ({
        ...prev,
        qtys: JSON.parse(JSON.stringify(manualPurchaseQtys)),
        prices: JSON.parse(JSON.stringify(manualPurchasePrices)),
        currencies: JSON.parse(JSON.stringify(manualPurchaseCurrencies)),
        sups: JSON.parse(JSON.stringify(manualSuppliers)),
        statuses: JSON.parse(JSON.stringify(supplierStatuses)),
        itemsCount: updatedItems.length
      }));
      toast({ title: "Cambios guardados", description: "Se actualizó la orden de compra." });
    }
  }

  const handleAddItemToPurchaseOrder = (productId: string) => {
    if (!purchaseOrderToView || !items) return;
    const prod = items.find(i => i.id === productId);
    if (!prod) return;

    const lineId = Math.random().toString(36).substring(2, 11);
    const newItem = {
      id: lineId,
      productId: prod.id,
      productName: prod.name,
      quantity: 1,
      price: prod.costCurrency === 'USD' ? (prod.costUSD ?? 0) : (prod.costARS ?? 0),
      currency: prod.costCurrency || 'ARS',
      supplier: prod.supplier || "Sin Proveedor",
      received: false
    };

    const updatedItems = [...purchaseOrderToView.items, newItem];
    const supplier = newItem.supplier;
    const newStatuses = { ...supplierStatuses };
    
    if (newStatuses[supplier] === 'ordered') {
      newStatuses[supplier] = 'pending';
      setSupplierStatuses(newStatuses);
    }

    setPurchaseOrderToView({ ...purchaseOrderToView, items: updatedItems });
    setManualPurchaseQtys(prev => ({ ...prev, [lineId]: 1 }));
    setManualPurchasePrices(prev => ({ ...prev, [lineId]: newItem.price }));
    setManualPurchaseCurrencies(prev => ({ ...prev, [lineId]: newItem.currency as 'ARS' | 'USD' }));
    setManualSuppliers(prev => ({ ...prev, [lineId]: newItem.supplier }));
    
    toast({ title: "Ítem agregado", description: "Recuerda guardar los cambios de la orden. Proveedor desbloqueado si era necesario." });
  }

  const handleRemoveItemFromPurchaseOrder = (lineId: string) => {
    if (!purchaseOrderToView) return;
    const updatedItems = purchaseOrderToView.items.filter((i: any) => (i.id || i.productId) !== lineId);
    setPurchaseOrderToView({ ...purchaseOrderToView, items: updatedItems });
    
    const newQtys = { ...manualPurchaseQtys }; delete newQtys[lineId];
    const newPrices = { ...manualPurchasePrices }; delete newPrices[lineId];
    const newCurrencies = { ...manualPurchaseCurrencies }; delete newCurrencies[lineId];
    const newSups = { ...manualSuppliers }; delete newSups[lineId];
    
    setManualPurchaseQtys(newQtys);
    setManualPurchasePrices(newPrices);
    setManualPurchaseCurrencies(newCurrencies);
    setManualSuppliers(newSups);
    
    toast({ title: "Ítem removido", description: "Recuerda guardar los cambios de la orden." });
  }

  const handleReceiveMaterials = (supplierName: string) => {
    if (!purchaseOrderToView) return;

    const itemsBySup = displayItemsBySupplier[supplierName] || [];
    const itemsToProcess = itemsBySup.filter(i => !i.received);
    
    itemsToProcess.forEach(item => {
      const lineId = item.id;
      const qty = manualPurchaseQtys[lineId] ?? item.quantity;
      const price = manualPurchasePrices[lineId] ?? item.price;
      const currency = manualPurchaseCurrencies[lineId] ?? (item.currency || 'ARS');

      if (qty > 0) {
        const purchaseId = Math.random().toString(36).substring(2, 11);
        const purchaseRecord = {
          id: purchaseId,
          productId: item.productId,
          productName: item.productName,
          supplierName: supplierName,
          quantity: qty,
          price: price,
          currency: currency,
          date: new Date().toISOString(),
          orderId: purchaseOrderToView.id,
          exchangeRate: currentRate,
          rateType: rateType
        };
        setDocumentNonBlocking(doc(db, 'purchases', purchaseId), purchaseRecord, { merge: true });

        updateDocumentNonBlocking(doc(db, 'products_services', item.productId), {
          stock: increment(qty)
        });
        
        if (price > 0) {
          const costField = currency === 'USD' ? 'costUSD' : 'costARS';
          const otherCostField = currency === 'USD' ? 'costARS' : 'costUSD';
          updateDocumentNonBlocking(doc(db, 'products_services', item.productId), {
            [costField]: price,
            [otherCostField]: 0,
            costCurrency: currency
          });
        }
      }
    });

    const updatedItems = purchaseOrderToView.items.map((item: any) => {
      const lineId = item.id || item.productId;
      if (itemsToProcess.some(i => i.id === lineId)) {
        return { ...item, received: true };
      }
      return item;
    });
    const allReceived = updatedItems.every((i: any) => i.received);
    updateDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToView.id), {
      items: updatedItems,
      status: allReceived ? 'completed' : 'pending'
    });
    setPurchaseOrderToView({ ...purchaseOrderToView, items: updatedItems, status: allReceived ? 'completed' : 'pending' });

    toast({ title: `Materiales de ${supplierName} ingresados`, description: "Se actualizó el stock global." });
  }

  const handleToggleSupplierStatus = (supplierName: string) => {
    if (!purchaseOrderToView) return;

    const current = supplierStatuses[supplierName] || 'pending';
    const next = current === 'pending' ? 'ordered' : 'pending';
    
    if (next === 'ordered') {
      const itemsInSupplier = displayItemsBySupplier[supplierName] || [];
      const pendingItems = itemsInSupplier.filter(i => !i.received);
      const hasZeroPrice = pendingItems.some(i => (manualPurchasePrices[i.id] ?? i.price) <= 0);
      if (hasZeroPrice) {
        toast({ title: "Precios incompletos", description: "No puedes marcar como pedido si hay artículos con precio $0.", variant: "destructive" });
        return;
      }
    }

    const newStatuses = { ...supplierStatuses, [supplierName]: next };
    setSupplierStatuses(newStatuses);
    updateDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToView.id), {
      supplierStatuses: newStatuses
    });
    
    toast({ title: next === 'ordered' ? "Pedido confirmado" : "Pedido desbloqueado para edición" });
  }

  const handleUpdateItemAudit = (id: string, updates: any) => {
    const item = items?.find(i => i.id === id);
    if (!item) return;
    const finalUpdates = { ...updates };
    if ('costAmount' in updates || 'costCurrency' in updates) {
      const amount = updates.costAmount ?? (item.costCurrency === 'USD' ? (item.costUSD ?? 0) : (item.costARS ?? 0));
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

  const handleUpdateItemSupplierGlobally = useCallback((lineId: string, productId: string, newSupplier: string) => {
    const cleanSupplier = newSupplier === "Sin Proveedor" ? "" : newSupplier;
    
    const newStatuses = { ...supplierStatuses };
    if (newStatuses[newSupplier] === 'ordered') {
      newStatuses[newSupplier] = 'pending';
      setSupplierStatuses(newStatuses);
    }

    setManualSuppliers(prev => ({ ...prev, [lineId]: newSupplier }));
    updateDocumentNonBlocking(doc(db, 'products_services', productId), {
      supplier: cleanSupplier
    });
    
    if (purchaseOrderToView && purchaseOrderToView.status !== 'completed') {
      const updatedItems = purchaseOrderToView.items.map((i: any) => 
        (i.id || i.productId) === lineId ? { ...i, supplier: newSupplier } : i
      );
      setPurchaseOrderToView({ ...purchaseOrderToView, items: updatedItems });
      
      updateDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToView.id), {
        items: updatedItems,
        supplierStatuses: newStatuses
      });
    }
    toast({ title: "Proveedor asignado", description: `El ítem ahora tiene a ${newSupplier} como su proveedor. Grupo desbloqueado si era necesario.` });
  }, [db, purchaseOrderToView, manualSuppliers, supplierStatuses, toast]);

  const handleAssembleFinal = () => {
    if (!liveOrderToView || !items) return;
    setOrderToFinalize(liveOrderToView);
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

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setNewCategoryName(cat.name || "");
  };

  const handleSaveSupplier = () => {
    if (!newSupplierName.trim()) return
    const id = editingSupplierId || Math.random().toString(36).substr(2, 9)
    setDocumentNonBlocking(doc(db, 'suppliers', id), { 
      id, 
      name: newSupplierName,
      phone: newSupplierPhone,
      address: newSupplierAddress
    }, { merge: true })
    setNewSupplierName("")
    setNewSupplierPhone("")
    setNewSupplierAddress("")
    setEditingSupplierId(null)
    toast({ title: editingSupplierId ? "Proveedor actualizado" : "Proveedor guardado" })
  }

  const handleEditSupplier = (sup: any) => {
    setEditingSupplierId(sup.id);
    setNewSupplierName(sup.name || "");
    setNewSupplierPhone(sup.phone || "");
    setNewSupplierAddress(sup.address || "");
  };

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
    const itemsInGroup = displayItemsBySupplier[supplierFilter] || [];
    const dateStr = new Date().toLocaleDateString('es-AR');
    let text = `*LISTA DE COMPRAS - DOSIMAT PRO*\n`;
    text += `PROVEEDOR: ${supplierFilter.toUpperCase()}\n`;
    const supObj = suppliers?.find(s => s.name === supplierFilter);
    if (supObj) {
      if (supObj.phone) text += `Tel: ${supObj.phone}\n`;
      if (supObj.address) text += `Dir: ${supObj.address}\n`;
    }
    text += `Fecha: ${dateStr}\n\n`;
    const pendingItems = itemsInGroup.filter((i: any) => !i.received);
    if (pendingItems.length === 0) {
      toast({ title: "Sin ítems", description: "No hay faltantes pendientes para este proveedor." });
      return;
    }
    pendingItems.forEach(f => {
      const lineId = f.id;
      const qty = manualPurchaseQtys[lineId] ?? f.quantity;
      const price = manualPurchasePrices[lineId] ?? f.price;
      const currency = manualPurchaseCurrencies[lineId] || (f.currency || 'ARS');
      text += `- *${f.productName}*: ${qty} unidades. (Precio Ref: ${currency === 'USD' ? 'u$s' : '$'}${price.toLocaleString('es-AR')})\n`;
    });
    const ars = pendingItems.reduce((sum, i) => sum + ((manualPurchaseQtys[i.id] ?? i.quantity) * (manualPurchaseCurrencies[i.id] === 'ARS' ? (manualPurchasePrices[i.id] ?? i.price) : 0)), 0);
    const usd = pendingItems.reduce((sum, i) => sum + ((manualPurchaseQtys[i.id] ?? i.quantity) * (manualPurchaseCurrencies[i.id] === 'USD' ? (manualPurchasePrices[i.id] ?? i.price) : 0)), 0);
    text += `\n*INVERSIÓN ESTIMADA:*\n`;
    if (ars > 0) text += `ARS: $${ars.toLocaleString('es-AR')}\n`;
    if (usd > 0) text += `USD: u$s ${usd.toLocaleString('es-AR')}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Lista de compras copiada", description: `Lista filtrada para ${supplierFilter}.` });
  }

  const handleRegisterPayment = (supplierName: string) => {
    if (!purchaseOrderToView) return;
    const itemsInGroup = displayItemsBySupplier[supplierName] || [];
    const receivedItems = itemsInGroup.filter(i => i.received);
    
    if (receivedItems.length === 0) {
      toast({ title: "Sin entregas", description: "Debes ingresar la mercadería antes de registrar el pago.", variant: "destructive" });
      return;
    }

    const ars = receivedItems.reduce((sum, i) => sum + ((manualPurchaseQtys[i.id] ?? i.quantity) * (manualPurchaseCurrencies[i.id] === 'ARS' ? (manualPurchasePrices[i.id] ?? i.price) : 0)), 0);
    const usd = receivedItems.reduce((sum, i) => sum + ((manualPurchaseQtys[i.id] ?? i.quantity) * (manualPurchaseCurrencies[i.id] === 'USD' ? (manualPurchasePrices[i.id] ?? i.price) : 0)), 0);

    const amount = ars > 0 ? ars : usd;
    const currency = ars > 0 ? 'ARS' : 'USD';
    const poRef = purchaseOrderToView.friendlyId || purchaseOrderToView.id.toUpperCase().slice(0, 6);
    const desc = `Pago Compra OC #${poRef} - Prov: ${supplierName}`;

    router.push(`/transactions?mode=new&type=Expense&amount=${amount}&currency=${currency}&description=${encodeURIComponent(desc)}`);
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

  const confirmDeleteOrder = () => {
    if (!orderToDelete) return
    deleteDocumentNonBlocking(doc(db, 'production_orders', orderToDelete.id))
    setOrderToDelete(null)
    toast({ title: "Orden de producción eliminada" })
  }

  const confirmDeletePurchaseOrder = () => {
    if (!purchaseOrderToDelete) return
    deleteDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToDelete.id))
    setPurchaseOrderToDelete(null)
    toast({ title: "Orden de compra eliminada" })
  }

  const addComponent = (productId: string) => {
    if (formData.components.some(c => c.productId === productId)) return;
    setFormData(prev => ({ ...prev, components: [...prev.components, { productId, quantity: 1 }] }));
  }

  const removeComponent = (idx: number) => {
    setFormData(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== idx) }));
  }

  const updateComponentQty = (idx: number, qty: number) => {
    const newComps = [...formData.components];
    newComps[idx].quantity = qty;
    setFormData(prev => ({ ...prev, components: newComps }));
  }

  const handleOpenSupplierHistory = (supplierName: string) => {
    setSelectedSupplierForHistory(supplierName);
    setIsSupplierHistoryOpen(true);
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
    </div>
  )

  const displayItemsBySupplier = useMemo(() => {
    if (!purchaseOrderToView) return {};
    const groups: Record<string, any[]> = {};
    purchaseOrderToView.items.forEach((item: any) => {
      const sup = item.supplier || "Sin Proveedor";
      if (!groups[sup]) groups[sup] = [];
      
      const prod = items?.find(i => i.id === item.productId);
      const lineId = item.id || item.productId;
      
      groups[sup].push({
        ...item,
        id: lineId,
        available: prod?.stock ?? 0,
        refCostARS: prod?.costARS ?? 0,
        refCostUSD: prod?.costUSD ?? 0,
        refCostCurrency: prod?.costCurrency || (prod?.costUSD > 0 && !prod?.costARS ? 'USD' : 'ARS')
      });
    });
    Object.keys(groups).forEach(sup => groups[sup].sort((a, b) => (a.productName || "").localeCompare(b.productName || "")));
    return groups;
  }, [purchaseOrderToView, items]);

  const renderProductionOrders = (ordersList: any[], isHistory: boolean = false) => (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", isHistory && "opacity-75 grayscale-[0.2]")}>
      {ordersList.map((order: any) => {
        const statusInfo = {
          draft: { label: "Borrador", icon: ClipboardList, color: "text-slate-600 bg-slate-100 border-slate-200" },
          pending_purchase: { label: "Faltan Materiales", icon: ShoppingCart, color: "text-amber-700 bg-amber-50 border-amber-200" },
          ready: { label: "Listo para Armar", icon: Hammer, color: "text-blue-700 bg-blue-50 border-blue-200" },
          completed: { label: "Completado", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
        }[order.status as keyof typeof statusInfo] || { label: order.status, icon: Factory, color: "bg-muted" };
        const StatusIcon = statusInfo.icon;
        const friendlyId = order.friendlyId ? `#${order.friendlyId}` : `#${order.id.toUpperCase().slice(0, 6)}`;
        
        return (
          <Card 
            key={order.id} 
            className={cn(
              "glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group", 
              isHistory ? 'border-l-emerald-500 shadow-none' : 'border-l-amber-500'
            )} 
            onClick={() => handleOpenOrderView(order)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", statusInfo.color)}>
                    <StatusIcon className="h-2.5 w-2.5 mr-1" /> {statusInfo.label}
                  </Badge>
                  <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{friendlyId}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={(e) => { e.stopPropagation(); handlePrintProductionOrder(order); }}><Printer className="h-4 w-4" /></Button>
                  {!isHistory && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg mt-2 font-bold leading-tight">{order.productName}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Creada el {new Date(order.createdAt).toLocaleDateString('es-AR')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/50 border rounded-lg p-3 flex items-center justify-between shadow-inner">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Unidades a Fabricar</span>
                <span className={cn("text-2xl font-black", isHistory ? "text-emerald-600" : "text-amber-600")}>{order.quantity}</span>
              </div>
              {order.purchaseOrderId && (
                <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                  <ShoppingCart className="h-3 w-3" /> COMPRA ASOCIADA: #{order.purchaseOrderId.slice(0,4).toUpperCase()}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 border-t bg-muted/5 flex justify-between py-3">
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">VER DETALLE <ChevronRight className="h-3 w-3 ml-1" /></Button>
              {!isHistory && order.status === 'ready' && <Badge className="bg-blue-600 animate-pulse text-[8px] font-black">PRODUCCIÓN HABILITADA</Badge>}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

  const renderPurchaseOrders = (poList: any[], isHistory: boolean = false) => (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", isHistory && "opacity-75 grayscale-[0.2]")}>
      {poList.map((po: any) => {
        const allReceived = po.items.every((i: any) => i.received);
        const friendlyId = po.friendlyId ? `#${po.friendlyId}` : `#${po.id.toUpperCase().slice(0, 6)}`;
        return (
          <Card 
            key={po.id} 
            className={cn(
              "glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group", 
              allReceived ? 'border-l-emerald-500 shadow-none' : 'border-l-emerald-600'
            )} 
            onClick={() => setPurchaseOrderToView(po)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", allReceived ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                    {allReceived ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> : <Clock className="h-2.5 w-2.5 mr-1" />}
                    {allReceived ? 'COMPLETADA' : 'PENDIENTE'}
                  </Badge>
                  <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{friendlyId}</span>
                </div>
                {!isHistory && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setPurchaseOrderToDelete(po); }}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
              <CardTitle className="text-lg mt-2 font-bold leading-tight">{po.description || "Orden de Compra"}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Creada el {new Date(po.createdAt).toLocaleDateString('es-AR')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Ítems Totales</span>
                <span className="text-2xl font-black text-emerald-700">{po.items.length}</span>
              </div>
              {po.productionOrderId && (
                <div className="flex items-center gap-2 text-[9px] font-bold text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100">
                  <Hammer className="h-3 w-3" /> ARMADO ASOCIADO: #{po.productionOrderId.slice(0,4).toUpperCase()}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 border-t bg-muted/5 flex justify-between py-3">
              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">{isHistory ? 'VER RESUMEN' : 'GESTIONAR RECEPCIÓN'} <ChevronRight className="h-3 w-3 ml-1" /></Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );

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
                  <Tabs value={rateType} onValueChange={(v: any) => setOrderRateType(v)} className="h-7 mt-0.5">
                    <TabsList className="bg-transparent h-7 p-0 gap-1">
                      <TabsTrigger value="official" className="h-6 text-[9px] font-black px-2 data-[state=active]:bg-primary data-[state=active]:text-white border border-transparent data-[state=active]:border-primary/20 transition-all">OFICIAL (${exchangeRates.official})</TabsTrigger>
                      <TabsTrigger value="blue" className="h-6 text-[9px] font-black px-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-emerald-600/20 transition-all">BLUE (${exchangeRates.blue})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <Tabs value={activeView} onValueChange={setActiveTab} className="bg-transparent">
                <TabsList className="bg-muted/40 h-10 p-1 rounded-xl shadow-inner border overflow-hidden">
                  <TabsTrigger value="inventory" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase">STOCK</TabsTrigger>
                  <TabsTrigger value="orders" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase gap-2">
                    PRODUCCIÓN {activeProdCount > 0 && <span className="bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{activeProdCount}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="purchases" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase gap-2">
                    COMPRAS {activePurchCount > 0 && <span className="bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{activePurchCount}</span>}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 font-bold gap-2 text-xs" onClick={() => setIsAuditOpen(true)}><Calculator className="h-4 w-4" /> <span className="hidden sm:inline">AUDITORÍA</span></Button>
                
                {isAdmin && (
                  <DropdownMenuUI>
                    <DropdownMenuTriggerUI asChild>
                      <Button variant="outline" className="h-9 font-bold gap-2 text-xs">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline uppercase">Gestión</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </DropdownMenuTriggerUI>
                    <DropdownMenuContentUI align="end" className="w-56">
                      <DropdownMenuItemUI onClick={() => setIsCategoryManagerOpen(true)}>
                        <Tag className="mr-2 h-4 w-4" /> Gestionar Categorías
                      </DropdownMenuItemUI>
                      <DropdownMenuItemUI onClick={() => setIsSupplierManagerOpen(true)}>
                        <Briefcase className="mr-2 h-4 w-4" /> Gestionar Proveedores
                      </DropdownMenuItemUI>
                      <DropdownMenuSeparator />
                      <DropdownMenuItemUI className="font-bold text-primary" onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
                      </DropdownMenuItemUI>
                    </DropdownMenuContentUI>
                  </DropdownMenuUI>
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
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input placeholder="Buscar por nombre..." className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm ?? ""} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <div className="md:hidden w-full sm:w-auto">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full h-11 gap-2 font-bold border-dashed">
                            <ListFilter className="h-4 w-4" /> FILTRAR CATEGORÍAS
                            {selectedCategories.length > 0 && <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{selectedCategories.length}</Badge>}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] p-6">
                          <SheetHeader>
                            <SheetTitle className="text-left font-black uppercase tracking-tighter">Filtros de Catálogo</SheetTitle>
                          </SheetHeader>
                          <div className="mt-8">
                            <FilterPanel />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
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
                    </div>
                  ) : (
                    <section className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {filteredItems.map((item: any) => { 
                        const tracksStock = item.trackStock !== false; 
                        const isLowStock = tracksStock && !item.isService && (item.stock ?? 0) <= (item.minStock ?? 0); 
                        const catName = categoryMap[item.categoryId] || "Sin Categoría"; 
                        const marginARS = getMarginInfo(item.priceARS ?? 0, item.calculatedCostARS ?? 0); 
                        const marginUSD = getMarginInfo(item.priceUSD ?? 0, item.calculatedCostUSD ?? 0); 
                        return (
                          <Card key={item.id} className={cn("glass-card hover:shadow-md transition-all group border-l-4", isLowStock ? "border-l-rose-500 bg-rose-50/30" : "border-l-primary")}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={item.isService ? "secondary" : "default"} className="text-[9px] font-black uppercase">{item.isService ? 'SERVICIO' : 'PRODUCTO'}</Badge>
                                  {item.isCompuesto && <Badge className="text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600"><Layers className="h-2 w-2 mr-1" /> COMPUESTO</Badge>}
                                  <Badge variant="outline" className="text-[9px] font-bold bg-white text-muted-foreground border-muted-foreground/20">{catName}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" onClick={() => { setSelectedProductForHistory(item); setIsPurchaseHistoryOpen(true); }} title="Ver Historial de Compras"><History className="h-4 w-4" /></Button>
                                  <DropdownMenuUI>
                                    <DropdownMenuTriggerUI asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTriggerUI>
                                    <DropdownMenuContentUI align="end">
                                      <DropdownMenuItemUI onSelect={() => handleExportBOM(item)}><Printer className="mr-2 h-4 w-4" /> Exportar Ficha (PDF)</DropdownMenuItemUI>
                                      {isAdmin && (
                                        <>
                                          <DropdownMenuItemUI onSelect={() => handleOpenDialog(item)}><Edit className="mr-2 h-4 w-4" /> Editar parámetros</DropdownMenuItemUI>
                                          {item.isCompuesto && (
                                            <DropdownMenuItemUI className="text-amber-600 font-bold" onSelect={() => { setSelectedForAssembly(item); setAssemblyQty(1); setIsAssemblyOpen(true); }}><Hammer className="mr-2 h-4 w-4" /> Orden de Armado</DropdownMenuItemUI>
                                          )}
                                          <DropdownMenuItemUI className="text-destructive" onSelect={() => setItemToDelete(item)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItemUI>
                                        </>
                                      )}
                                    </DropdownMenuContentUI>
                                  </DropdownMenuUI>
                                </div>
                              </div>
                              <CardTitle className="text-lg mt-2 truncate font-bold">{item.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {tracksStock && !item.isService && (
                                <div className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Stock Actual</span>
                                    <span className={cn("text-xl font-black", isLowStock ? "text-rose-600" : "text-emerald-600")}>{item.stock ?? 0}</span>
                                  </div>
                                  {isLowStock && <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 relative overflow-hidden">
                                  <span className="text-[9px] font-black text-blue-700 uppercase block">Venta ARS</span>
                                  <span className="text-md font-black text-blue-800">${(item.priceARS ?? 0).toLocaleString('es-AR')}</span>
                                  {isAdmin && marginARS && (
                                    <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginARS.color)}>{marginARS.icon} {marginARS.value}%</div>
                                  )}
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 relative overflow-hidden">
                                  <span className="text-[9px] font-black text-emerald-700 uppercase block">Venta USD</span>
                                  <span className="text-md font-black text-emerald-700">u$s {(item.priceUSD ?? 0).toLocaleString('es-AR')}</span>
                                  {isAdmin && marginUSD && (
                                    <div className={cn("absolute top-1 right-1 flex items-center gap-0.5 text-[9px] font-black", marginUSD.color)}>{marginUSD.icon} {marginUSD.value}%</div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ); 
                      })}
                    </section>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="orders" className="m-0 space-y-10">
              {loadingOrders ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground italic">Cargando...</p></div>
              ) : !orders || orders.length === 0 ? (
                <Card className="p-20 text-center border-dashed border-2 bg-muted/5"><Factory className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-xl font-bold text-slate-800">No hay órdenes de producción</h3></Card>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <Badge className="bg-amber-600 font-black h-6">EN CURSO</Badge>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Planes de producción activos</span>
                    </div>
                    {groupedOrders.active.length > 0 ? renderProductionOrders(groupedOrders.active) : (
                      <p className="text-sm italic text-muted-foreground px-4 py-8 bg-muted/10 rounded-xl border border-dashed">No hay producciones activas en este momento.</p>
                    )}
                  </div>

                  {groupedOrders.history.length > 0 && (
                    <div className="space-y-4 pt-10 border-t border-dashed">
                      <div className="flex items-center gap-3 px-1 opacity-60">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Historial de Armados Finalizados</span>
                      </div>
                      {renderProductionOrders(groupedOrders.history, true)}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="purchases" className="m-0 space-y-10">
              <div className="flex justify-end">
                <Button onClick={() => setIsNewPurchaseOrderOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2">
                  <Plus className="h-4 w-4" /> Nueva Orden de Compra
                </Button>
              </div>
              {loadingPO ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /><p className="text-sm text-muted-foreground italic">Cargando...</p></div>
              ) : !purchaseOrders || purchaseOrders.length === 0 ? (
                <Card className="p-20 text-center border-dashed border-2 bg-muted/5"><ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-xl font-bold text-slate-800">No hay órdenes de compra</h3></Card>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <Badge className="bg-emerald-600 font-black h-6 uppercase">Pendientes</Badge>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Materiales por recibir</span>
                    </div>
                    {groupedPurchases.active.length > 0 ? renderPurchaseOrders(groupedPurchases.active) : (
                      <p className="text-sm italic text-muted-foreground px-4 py-8 bg-muted/10 rounded-xl border border-dashed">No hay compras pendientes.</p>
                    )}
                  </div>

                  {groupedPurchases.history.length > 0 && (
                    <div className="space-y-4 pt-10 border-t border-dashed">
                      <div className="flex items-center gap-3 px-1 opacity-60">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Historial de Compras Completadas</span>
                      </div>
                      {renderPurchaseOrders(groupedPurchases.history, true)}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </SidebarInset>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex justify-between items-start pr-8">
              <div className="flex items-center gap-3">
                <Box className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl font-black uppercase text-primary tracking-tighter">{editingItemId ? 'Configurar Ítem' : 'Nuevo Ítem'}</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase text-slate-500">Parámetros técnicos, costos y estructura</DialogDescription>
                </div>
              </div>
              {editHistory.length > 0 && (
                <Button variant="outline" size="sm" className="h-8 gap-1 font-bold text-[10px]" onClick={handleGoBackInHistory}>
                  <ChevronLeft className="h-3 w-3" /> VOLVER A ANTERIOR
                </Button>
              )}
            </div>
          </DialogHeader>
          <div id="config-item-scroll" className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre del Ítem</Label>
                  <Input value={formData.name ?? ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-12 text-lg font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Categoría</Label>
                    <Select value={formData.categoryId ?? ""} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                      <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Proveedor Preferido</Label>
                    <Select value={formData.supplier || "none"} onValueChange={(v) => setFormData({...formData, supplier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin Proveedor</SelectItem>
                        {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-2xl border border-dashed">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Switch checked={formData.isService} onCheckedChange={(v) => setFormData({...formData, isService: v, trackStock: !v})} /><Label className="text-[10px] font-black uppercase">Es un Servicio</Label></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Switch disabled={formData.isService} checked={formData.trackStock} onCheckedChange={(v) => setFormData({...formData, trackStock: v})} /><Label className="text-[10px] font-black uppercase">Controlar Stock</Label></div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Precios de Venta</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                    <Label className="text-[9px] font-black text-blue-700 uppercase">Venta ARS</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">$</span>
                      <Input type="number" value={formData.priceARS ?? 0} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} className="pl-8 bg-white font-black text-lg h-10 border-blue-200" />
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                    <Label className="text-[9px] font-black text-emerald-700 uppercase">Venta USD</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">u$s</span>
                      <Input type="number" value={formData.priceUSD ?? 0} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} className="pl-10 bg-white font-black text-lg h-10 border-emerald-200" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-2xl bg-slate-50">
                  <Switch checked={formData.isCompuesto} onCheckedChange={(v) => setFormData({...formData, isCompuesto: v})} />
                  <div>
                    <Label className="font-black text-xs uppercase text-slate-700">Producto Compuesto (BOM)</Label>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">SE FABRICA A PARTIR DE OTROS COMPONENTES</p>
                  </div>
                </div>
              </div>
            </div>

            {!formData.isCompuesto ? (
              <section className="space-y-4 p-6 bg-slate-50 border rounded-2xl">
                <div className="flex items-center gap-2 mb-2"><Coins className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Costo de Reposición (Simple)</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor del Insumo</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" value={formData.costAmount ?? 0} onChange={(e) => setFormData({...formData, costAmount: Number(e.target.value)})} className="h-12 text-xl font-black border-primary/20" />
                      <Tabs value={formData.costCurrency || "ARS"} onValueChange={(v) => setFormData({...formData, costCurrency: v})} className="shrink-0">
                        <TabsList className="h-12 p-1 border">
                          <TabsTrigger value="ARS" className="h-10 text-[10px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                          <TabsTrigger value="USD" className="h-10 text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Stock Actual</Label>
                      <Input type="number" value={formData.stock ?? 0} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="h-12 font-black text-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-rose-600">Stock Mínimo</Label>
                      <Input type="number" value={formData.minStock ?? 0} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} className="h-12 font-black text-xl border-rose-200 text-rose-700" />
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-6">
                <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-6 shadow-xl">
                  <div className="flex justify-between items-center"><h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Estructura de Materiales (BOM)</h3><Badge variant="outline" className="text-white border-white/20">COSTOS CALCULADOS</Badge></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Materiales (ARS)</p><p className="text-2xl font-black">${(currentEditingCosts.ars - totalLaborARS).toLocaleString('es-AR')}</p></div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mano de Obra (ARS)</p><p className="text-2xl font-black">${totalLaborARS.toLocaleString('es-AR')}</p></div>
                    <div className="p-4 bg-primary rounded-2xl shadow-lg"><p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Costo Total Final (ARS)</p><p className="text-3xl font-black">${currentEditingCosts.ars.toLocaleString('es-AR')}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Plus className="h-3 w-3" /> Agregar Componente</Label>
                    <div className="space-y-2">
                      <Select value={bomFilterCategory} onValueChange={setBomFilterCategory}>
                        <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Filtrar categoría..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={addComponent}>
                        <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Buscar pieza..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {items?.filter(i => i.id !== editingItemId && !i.isService && (bomFilterCategory === 'all' || i.categoryId === bomFilterCategory)).sort((a,b) => (a.name ?? "").localeCompare(b.name ?? "")).map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock ?? 0})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 border rounded-2xl bg-slate-50 space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Mano de Obra / Gastos de Armado</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Pesos (ARS)</Label><Input type="number" value={formData.laborCostARS ?? 0} onChange={(e) => setFormData({...formData, laborCostARS: Number(e.target.value)})} className="bg-white" /></div>
                        <div className="space-y-1"><Label className="text-[9px] font-bold uppercase">Dólares (USD)</Label><Input type="number" value={formData.laborCostUSD ?? 0} onChange={(e) => setFormData({...formData, laborCostUSD: Number(e.target.value)})} className="bg-white" /></div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-2xl bg-slate-50 space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Inventario de Producto Terminado</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase">Stock Actual</Label>
                          <Input 
                            type="number" 
                            value={formData.stock ?? 0} 
                            onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} 
                            className="bg-white font-black text-center" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-rose-600">Stock Mínimo</Label>
                          <Input 
                            type="number" 
                            value={formData.minStock ?? 0} 
                            onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} 
                            className="bg-white font-black text-center border-rose-100 text-rose-700" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lista de Materiales</Label>
                    <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[9px] font-black uppercase">Pieza</TableHead><TableHead className="text-center font-black text-[9px] uppercase w-20">Cant.</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {sortedAddedComponents.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic text-xs">No hay componentes.</TableCell></TableRow>
                          ) : sortedAddedComponents.map((comp, idx) => (
                            <TableRow key={comp.productId}>
                              <TableCell className="py-2">
                                <p className="text-xs font-bold leading-tight">{items?.find(i => i.id === comp.productId)?.name}</p>
                                <Button variant="link" className="h-auto p-0 text-[9px] font-black uppercase text-primary" onClick={() => handleJumpToComponent(comp.productId)}>Ver Componente</Button>
                              </TableCell>
                              <TableCell className="py-2"><Input type="number" value={comp.quantity ?? 0} onChange={(e) => updateComponentQty(comp.originalIndex, Number(e.target.value))} className="h-8 text-center font-black" /></TableCell>
                              <TableCell className="py-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeComponent(comp.originalIndex)}><X className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {whereUsed.length > 0 && (
              <section className="space-y-4 pt-6 border-t">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Impacto en Producción (Donde se usa)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whereUsed.map((parent) => (
                    <div key={parent.id} className="p-4 border rounded-2xl bg-primary/5 flex justify-between items-center group">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">{parent.name}</p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Requerido: {parent.quantity} unidades</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleJumpToComponent(parent.id)}>
                        VER PADRE <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleSave} className="font-black px-12 h-11 uppercase text-xs tracking-widest">{editingItemId ? 'Guardar Cambios' : 'Crear Producto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-primary/5">
            <div className="flex justify-between items-start pr-8">
              <div className="flex items-center gap-3">
                <Factory className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-black uppercase text-primary tracking-tighter">Plan de Producción</DialogTitle>
                    <Badge className="bg-primary text-white font-black">#{liveOrderToView?.friendlyId || liveOrderToView?.id.toUpperCase().slice(0, 6)}</Badge>
                  </div>
                  <DialogDescription className="text-[10px] font-bold uppercase text-slate-500">Gestión de armado de producto compuesto</DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePrintProductionOrder(liveOrderToView)} title="Imprimir Plan de Armado"><Printer className="h-4 w-4" /></Button>
                <Badge variant="outline" className="font-black uppercase text-[10px] py-1 px-3 bg-white">{liveOrderToView?.status}</Badge>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Producto a Fabricar</Label>
                <div className="p-4 border rounded-2xl bg-slate-50 font-black text-lg text-slate-800">{liveOrderToView?.productName}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cantidad Planificada</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-16 w-16 shrink-0 border-primary/20 bg-slate-50 text-primary"
                    disabled={liveOrderToView?.status === 'completed'}
                    onClick={() => setLocalProductionQty(prev => Math.max(1, (prev || 0) - 1))}
                  >
                    <Minus className="h-8 w-8" />
                  </Button>
                  <Input 
                    type="number" 
                    value={localProductionQty ?? 0} 
                    disabled={liveOrderToView?.status === 'completed'}
                    onChange={(e) => setLocalProductionQty(Number(e.target.value))}
                    className="h-16 text-3xl font-black text-primary bg-slate-50 border-primary/20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-16 w-16 shrink-0 border-primary/20 bg-slate-50 text-primary"
                    disabled={liveOrderToView?.status === 'completed'}
                    onClick={() => setLocalProductionQty(prev => (prev || 0) + 1)}
                  >
                    <Plus className="h-8 w-8" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4" /> Explosión de Materiales</h3>
                {liveOrderToView?.status !== 'completed' && (
                  <Button 
                    variant={isProductionOutOfSync ? "destructive" : "outline"} 
                    size="sm" 
                    className={cn(
                      "h-8 font-bold text-[10px] transition-all", 
                      isProductionOutOfSync && "animate-pulse shadow-lg shadow-destructive/20"
                    )} 
                    onClick={handleGeneratePOFromProduction}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> 
                    {isProductionOutOfSync ? 'ACTUALIZAR COMPRA (PLAN MODIFICADO)' : 'SINCRONIZAR COMPRA'}
                  </Button>
                )}
              </div>
              <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Componente</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Necesario</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Disponible</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Faltante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explosionSummary?.all.map((f: any) => {
                      const deficit = Math.max(0, f.required - f.available);
                      const isOk = deficit <= 0;
                      return (
                        <TableRow key={f.id} className="h-12">
                          <TableCell className="text-xs font-bold">{f.name}</TableCell>
                          <TableCell className="text-center font-black">{f.required}</TableCell>
                          <TableCell className="text-center font-bold text-slate-500">{f.available}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("font-black px-2 py-0.5 rounded", isOk ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                              {isOk ? "OK" : deficit}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50">
            <div className="flex justify-between items-center w-full">
              <Button variant="outline" onClick={handleCloseOrderView} className="font-bold">Cerrar</Button>
              {liveOrderToView?.status === 'ready' && !isProductionOutOfSync && (
                <Button onClick={handleAssembleFinal} className="bg-blue-600 hover:bg-blue-700 font-black px-8">FINALIZAR ARMADO E INGRESAR STOCK</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewPurchaseOrderOpen} onOpenChange={setIsNewPurchaseOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-emerald-600" />
              <DialogTitle className="text-xl font-black uppercase text-emerald-700 tracking-tighter">Nueva Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-emerald-600/60 uppercase text-[10px]">COMPRA MANUAL DE INVENTARIO</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">Título / Identificador de la Orden</Label>
              <Input value={newPOTitle ?? ""} onChange={(e) => setNewPOTitle(e.target.value)} placeholder="Ej: Reposición de Ferretería, Insumos de Verano..." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar Categoría</Label>
                <Select value={newPOCatFilter ?? ""} onValueChange={setNewPOCatFilter}>
                  <SelectTrigger className="bg-white h-10 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Seleccionar Producto</Label>
                <Select onValueChange={(id) => {
                  const item = items?.find(i => i.id === id);
                  if (item) {
                    setNewPurchaseOrderItems([...newPOItems, { ...item, qtyToAdd: 1, lineId: Math.random().toString(36).substring(2, 9) }]);
                  }
                }}>
                  <SelectTrigger className="bg-white h-10 text-xs"><SelectValue placeholder="Buscar..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {items?.filter(i => !i.isService && (newPOCatFilter === 'all' || i.categoryId === newPOCatFilter)).sort((a,b) => (a.name ?? "").localeCompare(b.name ?? "")).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock ?? 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newPOItems.length > 0 && (
              <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Producto</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-24">Cantidad</TableHead>
                      <TableHead className="text-[10px] font-black uppercase w-48">Proveedor</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newPOItems.map((item, idx) => (
                      <TableRow key={item.lineId || idx}>
                        <TableCell className="text-xs font-bold">{item.name}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            className="h-8 text-center font-black" 
                            value={item.qtyToAdd ?? 0} 
                            onChange={(e) => {
                              const newList = [...newPOItems];
                              newList[idx].qtyToAdd = Number(e.target.value);
                              setNewPurchaseOrderItems(newList);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-bold bg-muted/30">{item.supplier || "Sin Proveedor"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setNewPurchaseOrderItems(newPOItems.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsNewPurchaseOrderOpen(false)} className="font-bold">Cancelar</Button>
            <Button disabled={newPOItems.length === 0} onClick={handleCreatePurchaseOrder} className="bg-emerald-600 hover:bg-emerald-700 font-black px-8">CREAR ORDEN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssemblyOpen} onOpenChange={setIsAssemblyOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <Hammer className="h-6 w-6 text-amber-600" />
              <DialogTitle className="text-xl font-black uppercase text-amber-700 tracking-tighter">Planificar Armado</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-amber-600/60 uppercase text-[10px]">
              CONFIGURACIÓN DE PRODUCCIÓN: <b>{selectedForAssembly?.name}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center gap-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl shadow-inner">
              <div className="space-y-1 flex-1">
                <Label className="text-xs font-black text-amber-800 uppercase tracking-widest">Unidades a fabricar</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="h-12 w-12 border-amber-300 text-amber-700 bg-white" onClick={() => setAssemblyQty(Math.max(1, assemblyQty - 1))}><Minus className="h-6 w-6" /></Button>
                  <span className="text-4xl font-black text-amber-900 min-w-[60px] text-center">{assemblyQty}</span>
                  <Button variant="outline" size="icon" className="h-12 w-12 border-amber-300 text-amber-700 bg-white" onClick={() => setAssemblyQty(assemblyQty + 1)}><Plus className="h-6 w-6" /></Button>
                </div>
              </div>
              <div className="hidden md:block h-16 w-px bg-amber-200" />
              <div className="hidden md:block flex-1 text-right">
                <p className="text-[10px] font-black text-amber-700 uppercase">Stock Actual</p>
                <p className="text-2xl font-black text-amber-900">{selectedForAssembly?.stock ?? 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" /> Explosión de Insumos requeridos
              </h3>
              <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Componente</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Necesario</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Disponible</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-24">Faltante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explosionSummary?.all.map((f: any) => {
                      const deficit = f.required - f.available;
                      const hasMissing = deficit > 0;
                      return (
                        <TableRow key={f.id} className="h-12">
                          <TableCell className="text-xs font-bold">{f.name}</TableCell>
                          <TableCell className="text-center font-black">{f.required}</TableCell>
                          <TableCell className="text-center font-bold text-slate-500">{f.available}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("font-black", hasMissing ? "text-rose-600" : "text-emerald-600")}>
                              {hasMissing ? deficit : "OK"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsAssemblyOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleCreateOrder} className="bg-amber-600 hover:bg-amber-700 font-black px-8">CONFIRMAR PLAN DE PRODUCCIÓN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!purchaseOrderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 border-b shrink-0 bg-emerald-500/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pr-8 gap-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-black uppercase text-emerald-700 tracking-tighter">Orden de Compra</DialogTitle>
                    <Badge className="bg-primary text-white font-black">#{purchaseOrderToView?.friendlyId || purchaseOrderToView?.id.toUpperCase().slice(0, 6)}</Badge>
                  </div>
                  <DialogDescription className="text-[10px] font-bold uppercase text-emerald-600/60">{purchaseOrderToView?.description || "Compra manual de componentes"}</DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("font-black uppercase text-[10px]", purchaseOrderToView?.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                  {purchaseOrderToView?.status === 'completed' ? 'RECIBIDA COMPLETA' : 'PENDIENTE DE RECEPCIÓN'}
                </Badge>
                {purchaseOrderToView?.status !== 'completed' && (
                  <Button 
                    variant={hasUnsavedChanges ? "default" : "outline"} 
                    size="sm" 
                    className={cn("h-8 gap-1.5 font-bold text-[10px] px-3", hasUnsavedChanges && "bg-primary animate-pulse")} 
                    onClick={handleUpdateOrderPlan}
                  >
                    <Save className="h-3.5 w-3.5" /> GUARDAR {hasUnsavedChanges && "*"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          {purchaseOrderToView?.status !== 'completed' && (
            <div className="px-6 py-3 bg-muted/10 border-b flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-1 flex-1">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Filtrar Categoría</Label>
                    <Select value={newPOCatFilter ?? ""} onValueChange={setNewPOCatFilter}>
                      <SelectTrigger className="bg-white h-9 text-[10px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Añadir más productos</Label>
                    <Select onValueChange={handleAddItemToPurchaseOrder}>
                      <SelectTrigger className="bg-white h-9 text-[10px]"><SelectValue placeholder="Añadir..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {items?.filter(i => !i.isService && (newPOCatFilter === 'all' || i.categoryId === newPOCatFilter)).sort((a,b) => (a.name ?? "").localeCompare(b.name ?? "")).map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock ?? 0})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-10">
              {Object.keys(displayItemsBySupplier).length === 0 ? (
                <div className="p-12 text-center text-emerald-600 bg-white border rounded-xl space-y-2">
                  <AlertTriangle className="h-12 w-12 mx-auto" /><p className="font-black">SIN ÍTEMS</p><p className="text-xs text-muted-foreground italic">No se han agregado productos a esta orden.</p>
                </div>
              ) : (
                Object.keys(displayItemsBySupplier).sort().map(sup => {
                  const itemsInGroup = displayItemsBySupplier[sup];
                  const isOrdered = supplierStatuses[sup] === 'ordered';
                  const isCompleted = purchaseOrderToView?.status === 'completed';
                  const receivedItemsCount = itemsInGroup.filter(i => i.received).length;
                  const hasSomeReceived = receivedItemsCount > 0;
                  
                  const groupARS = itemsInGroup.reduce((sum, i) => {
                    const q = manualPurchaseQtys[i.id] ?? i.quantity ?? 0;
                    const p = manualPurchasePrices[i.id] ?? i.price ?? 0;
                    const c = manualPurchaseCurrencies[i.id] ?? (i.currency || 'ARS');
                    return sum + (q * (c === 'ARS' ? p : 0));
                  }, 0);
                  
                  const groupUSD = itemsInGroup.reduce((sum, i) => {
                    const q = manualPurchaseQtys[i.id] ?? i.quantity ?? 0;
                    const p = manualPurchasePrices[i.id] ?? i.price ?? 0;
                    const c = manualPurchaseCurrencies[i.id] ?? (i.currency || 'ARS');
                    return sum + (q * (c === 'USD' ? p : 0));
                  }, 0);
                  
                  return (
                    <div key={sup} className={cn("space-y-4 p-4 rounded-2xl border transition-all", (isOrdered || isCompleted) ? "bg-slate-50 border-slate-200" : "bg-white border-primary/10 shadow-sm")}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg text-white", (isOrdered || isCompleted) ? "bg-slate-400" : "bg-emerald-600")}>
                            {(isOrdered || isCompleted) ? <Lock className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{sup}</h4>
                              {(isOrdered || isCompleted) && <Badge className="bg-slate-600 text-[8px] font-black uppercase">PEDIDO CONFIRMADO</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{itemsInGroup.length} ÍTEMS • {(isOrdered || isCompleted) ? 'VALORES BLOQUEADOS' : 'VALORES EDITABLES'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isCompleted && (
                            <>
                              <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs flex-1 md:flex-none" onClick={() => handleCopyShoppingList(sup)}>
                                <Copy className="h-3.5 w-3.5" /> COPIAR
                              </Button>
                              
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
                                disabled={itemsInGroup.every(i => (manualPurchaseQtys[i.id] ?? i.quantity ?? 0) <= 0)}
                              >
                                <Save className="h-3.5 w-3.5" /> INGRESAR COMPRA
                              </Button>
                            </>
                          )}
                          
                          {hasSomeReceived && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-2 border-primary text-primary hover:bg-primary/5 font-bold text-xs flex-1 md:flex-none" 
                              onClick={() => handleRegisterPayment(sup)}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> REGISTRAR PAGO
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:block border-2 rounded-xl bg-white shadow-md overflow-hidden">
                        <Table className="min-w-[600px]">
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                              <TableHead className="text-center font-black text-[9px] uppercase w-32">Cantidad</TableHead>
                              <TableHead className="text-center font-black text-[9px] uppercase w-56">Precio Compra</TableHead>
                              <TableHead className="text-center font-black text-[9px] uppercase w-48">Proveedor</TableHead>
                              <TableHead className="text-right font-black text-[9px] uppercase w-36">Subtotal</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemsInGroup.map((f: any) => {
                              const lineId = f.id;
                              const currentQty = manualPurchaseQtys[lineId] ?? f.quantity ?? 0;
                              const currentPrice = manualPurchasePrices[lineId] ?? f.price ?? 0;
                              const currentCurrency = manualPurchaseCurrencies[lineId] || (f.currency || 'ARS');
                              const isZero = currentPrice <= 0 && !f.received;
                              const isLineLocked = isOrdered || isCompleted || f.received;
                              const refCost = f.refCostCurrency === 'USD' ? f.refCostUSD : f.refCostARS;
                              const refSymbol = f.refCostCurrency === 'USD' ? 'u$s' : '$';
                              
                              return (
                                <TableRow key={lineId} className={cn("hover:bg-muted/5 h-12", f.received && "bg-emerald-50/20")}>
                                  <TableCell className="py-1">
                                    <div className="flex items-center gap-2">
                                      {f.received && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                      <div>
                                        <p className="font-bold text-xs">{f.productName}</p>
                                        <div className="flex gap-2 items-center">
                                          <span className="text-[8px] text-muted-foreground uppercase font-black">Stock: {f.available}</span>
                                          <span className="text-[8px] text-primary/60 uppercase font-black">Ref: {refSymbol} {(refCost ?? 0).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Input 
                                      type="number" 
                                      disabled={isLineLocked} 
                                      value={currentQty ?? 0} 
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setManualPurchaseQtys(prev => ({ ...prev, [lineId]: val }));
                                      }} 
                                      className="w-full text-center font-black text-xs bg-muted/30 border-none rounded h-8 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                                    />
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <div className="flex items-center gap-1.5">
                                      <Input 
                                        type="number" 
                                        disabled={isLineLocked} 
                                        value={currentPrice ?? 0} 
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setManualPurchasePrices(prev => ({ ...prev, [lineId]: val }));
                                        }} 
                                        className={cn(
                                          "w-full text-center font-black text-xs h-8 border rounded transition-all focus:outline-none focus:ring-2",
                                          isZero ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-white border-emerald-100 text-emerald-700"
                                        )} 
                                      />
                                      <Tabs 
                                        value={currentCurrency ?? ""} 
                                        onValueChange={(v: any) => setManualPurchaseCurrencies(prev => ({ ...prev, [lineId]: v }))}
                                        className={cn("shrink-0 h-8", isLineLocked && "pointer-events-none opacity-50")}
                                      >
                                        <TabsList className="h-8 p-0 gap-0 border">
                                          <TabsTrigger value="ARS" className="h-7 text-[8px] font-black px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                          <TabsTrigger value="USD" className="h-7 text-[8px] font-black px-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                        </TabsList>
                                      </Tabs>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Select 
                                      disabled={isLineLocked}
                                      value={manualSuppliers[lineId] || f.supplier || "Sin Proveedor"} 
                                      onValueChange={(v) => handleUpdateItemSupplierGlobally(lineId, f.productId, v)}
                                    >
                                      <SelectTrigger className="h-8 text-[10px] font-bold border-none bg-transparent">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                        {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-right py-1">
                                    <p className="text-[10px] font-bold">{currentCurrency === 'USD' ? 'u$s' : '$'} {(currentQty * currentPrice).toLocaleString('es-AR')}</p>
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive" 
                                      disabled={isLineLocked}
                                      onClick={() => handleRemoveItemFromPurchaseOrder(lineId)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="md:hidden space-y-4">
                        {itemsInGroup.map((f: any) => {
                          const lineId = f.id;
                          const currentQty = manualPurchaseQtys[lineId] ?? f.quantity ?? 0;
                          const currentPrice = manualPurchasePrices[lineId] ?? f.price ?? 0;
                          const currentCurrency = manualPurchaseCurrencies[lineId] || (f.currency || 'ARS');
                          const isLineLocked = isOrdered || isCompleted || f.received;
                          const isZero = currentPrice <= 0 && !f.received;
                          const refCost = f.refCostCurrency === 'USD' ? f.refCostUSD : f.refCostARS;
                          const refSymbol = f.refCostCurrency === 'USD' ? 'u$s' : '$';
                          
                          return (
                            <Card key={lineId} className={cn("p-4 border shadow-sm", f.received ? "border-emerald-200 bg-emerald-50/10" : "border-muted shadow-sm bg-white")}>
                              <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {f.received && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                                    <h5 className="font-black text-xs uppercase tracking-tight">{f.productName}</h5>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    <span className="text-[9px] text-muted-foreground font-black">STOCK: {f.available}</span>
                                    <span className="text-[9px] text-primary font-black uppercase">REF: {refSymbol} {(refCost ?? 0).toLocaleString()}</span>
                                  </div>
                                </div>
                                {!isLineLocked && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItemFromPurchaseOrder(lineId)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-4 mb-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Cantidad</Label>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={isLineLocked} onClick={() => setManualPurchaseQtys(prev => ({ ...prev, [lineId]: Math.max(0, (prev[lineId] ?? f.quantity ?? 0) - 1) }))}>
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input 
                                      type="number" 
                                      className="h-11 flex-1 text-center font-black text-xl bg-slate-50 border-slate-200" 
                                      disabled={isLineLocked}
                                      value={currentQty ?? 0}
                                      onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [lineId]: Number(e.target.value) }))}
                                    />
                                    <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={isLineLocked} onClick={() => setManualPurchaseQtys(prev => ({ ...prev, [lineId]: (prev[lineId] ?? f.quantity ?? 0) + 1 }))}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Precio Compra</Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">{currentCurrency === 'USD' ? 'u$s' : '$'}</span>
                                    <Input 
                                      type="number" 
                                      className={cn("h-11 pl-10 text-center font-black text-xl bg-white", isZero ? "bg-rose-50 border-rose-300" : "border-emerald-200")} 
                                      disabled={isLineLocked}
                                      value={currentPrice ?? 0}
                                      onChange={(e) => setManualPurchasePrices(prev => ({ ...prev, [lineId]: Number(e.target.value) }))}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-4 items-end mb-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Proveedor</Label>
                                  <Select 
                                    disabled={isLineLocked}
                                    value={manualSuppliers[lineId] || f.supplier || "Sin Proveedor"} 
                                    onValueChange={(v) => handleUpdateItemSupplierGlobally(lineId, f.productId, v)}
                                  >
                                    <SelectTrigger className="h-11 bg-white border-slate-200 text-xs font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                      {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Moneda</Label>
                                  <Tabs 
                                    value={currentCurrency ?? ""} 
                                    onValueChange={(v: any) => setManualPurchaseCurrencies(prev => ({ ...prev, [lineId]: v }))}
                                    className={cn("w-full", isLineLocked && "pointer-events-none opacity-50")}
                                  >
                                    <TabsList className="grid grid-cols-2 h-10 p-1 border bg-muted/20">
                                      <TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                                      <TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Subtotal</Label>
                                  <div className="h-10 flex items-center justify-end px-3 bg-slate-50 border rounded-lg">
                                    <span className="font-black text-base">{currentCurrency === 'USD' ? 'u$s' : '$'} {(currentQty * currentPrice).toLocaleString('es-AR')}</span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>

                      <div className="bg-slate-50 border-t p-3 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS:</span><span className="font-black text-xs text-primary">${groupARS.toLocaleString('es-AR')}</span></div>
                        <div className="flex items-center gap-2 justify-end"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD:</span><span className="font-black text-xs text-emerald-700">u$s {groupUSD.toLocaleString('es-AR')}</span></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex justify-between items-center w-full">
              <div className="flex gap-4">
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Proyectado ARS</p><p className="text-lg md:text-xl font-black text-blue-700">${(purchaseCalculations?.totalARS ?? 0).toLocaleString('es-AR')}</p></div>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Proyectado USD</p><p className="text-lg md:text-xl font-black text-emerald-600">u$s {(purchaseCalculations?.totalUSD ?? 0).toLocaleString('es-AR')}</p></div>
              </div>
              <Button onClick={handleCloseOrderView} className="font-bold">Cerrar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-primary/5">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-black uppercase text-primary">Panel de Auditoría de Stock</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase">Ajuste rápido de inventario y costos</DialogDescription>
              </div>
              <div className="flex gap-4">
                <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar..." value={auditSearch ?? ""} onChange={(e) => setAuditSearch(e.target.value)} className="h-8 pl-8 text-xs w-48 bg-white" /></div>
                <Select value={auditCategoryFilter ?? ""} onValueChange={setAuditCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs w-40 bg-white"><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}<SelectItem value="all">Todas</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow><TableHead className="text-[10px] font-black uppercase">Producto</TableHead><TableHead className="text-center font-black text-[10px] uppercase w-32">Stock</TableHead><TableHead className="text-center font-black text-[10px] uppercase w-32">Mínimo</TableHead><TableHead className="text-center font-black text-[10px] uppercase w-48">Costo Ref.</TableHead><TableHead className="text-center font-black text-[10px] uppercase w-48">Proveedor</TableHead></TableRow></TableHeader>
              <TableBody>
                {items?.filter(i => !i.isService && (auditCategoryFilter === 'all' || i.categoryId === auditCategoryFilter) && ((i.name ?? "").toLowerCase().includes(auditSearch.toLowerCase()))).sort((a,b) => (a.name ?? "").localeCompare(b.name ?? "")).map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/5 h-12">
                    <TableCell className="py-1"><p className="text-xs font-bold leading-tight">{item.name}</p><p className="text-[9px] text-muted-foreground font-medium uppercase">{categoryMap[item.categoryId] || 'S/C'}</p></TableCell>
                    <TableCell className="py-1"><Input type="number" value={item.stock ?? 0} onChange={(e) => handleUpdateItemAudit(item.id, { stock: Number(e.target.value) })} className="h-8 text-center font-black text-xs" /></TableCell>
                    <TableCell className="py-1"><Input type="number" value={item.minStock ?? 0} onChange={(e) => handleUpdateItemAudit(item.id, { minStock: Number(e.target.value) })} className="h-8 text-center font-black text-xs text-rose-600" /></TableCell>
                    <TableCell className="py-1">
                      <div className="flex items-center gap-1.5">
                        <Input type="number" value={(item.costCurrency === 'USD' ? item.costUSD : item.costARS) ?? 0} onChange={(e) => handleUpdateItemAudit(item.id, { costAmount: Number(e.target.value) })} className="h-8 text-center font-black text-xs text-emerald-700" />
                        <Tabs value={item.costCurrency || 'ARS'} onValueChange={(v) => handleUpdateItemAudit(item.id, { costCurrency: v })} className="shrink-0">
                          <TabsList className="h-8 p-0 gap-0 border">
                            <TabsTrigger value="ARS" className="h-7 text-[8px] font-black px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">ARS</TabsTrigger>
                            <TabsTrigger value="USD" className="h-7 text-[8px] font-black px-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </TableCell>
                    <TableCell className="py-1">
                      <Select value={item.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateGlobalSupplier(item.id, v)}><SelectTrigger className="h-8 text-[10px] font-bold border-none bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>{sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50"><Button onClick={() => setIsAuditOpen(false)} className="font-bold">Cerrar Auditoría</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gestionar Categorías</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Nombre de categoría..." value={newCategoryName ?? ""} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button onClick={handleSaveCategory}>{editingCategoryId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button>
            </div>
            <ScrollArea className="h-64 border rounded-xl p-2 bg-slate-50">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-white transition-colors">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-500" onClick={() => updateDocumentNonBlocking(doc(db, 'product_categories', cat.id), { isFavorite: !cat.isFavorite })}>{cat.isFavorite ? <Star className="h-4 w-4 fill-amber-500" /> : <StarOff className="h-4 w-4" />}</Button>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEditCategory(cat)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCategoryToDelete(cat)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierManagerOpen} onOpenChange={setIsSupplierManagerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b shrink-0"><DialogTitle>Gestionar Proveedores</DialogTitle></DialogHeader>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <Card className="p-4 bg-muted/20 border-dashed space-y-4">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">{editingSupplierId ? 'Editando Proveedor' : 'Nuevo Proveedor'}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs">Nombre Fantasía</Label><Input value={newSupplierName ?? ""} onChange={(e) => setNewSupplierName(e.target.value)} className="bg-white" /></div>
                <div className="space-y-1"><Label className="text-xs">Teléfono / WhatsApp</Label><Input value={newSupplierPhone ?? ""} onChange={(e) => setNewSupplierPhone(e.target.value)} className="bg-white" /></div>
                <div className="col-span-full space-y-1"><Label className="text-xs">Dirección / Localidad</Label><Input value={newSupplierAddress ?? ""} onChange={(e) => setNewSupplierAddress(e.target.value)} className="bg-white" /></div>
              </div>
              <div className="flex justify-end gap-2">
                {editingSupplierId && <Button variant="outline" onClick={() => { setEditingSupplierId(null); setNewSupplierName(""); setNewSupplierPhone(""); setNewSupplierAddress(""); }}>Cancelar</Button>}
                <Button onClick={handleSaveSupplier} className="px-8 font-bold">{editingSupplierId ? 'Guardar Cambios' : 'Registrar Proveedor'}</Button>
              </div>
            </Card>
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Proveedores Registrados ({sortedSuppliers.length})</p>
              <div className="grid grid-cols-1 gap-3">
                {sortedSuppliers.map((sup: any) => (
                  <div key={sup.id} className="p-4 border rounded-2xl bg-white flex justify-between items-center hover:shadow-md transition-all group">
                    <div className="space-y-1">
                      <h4 className="font-black text-sm uppercase tracking-tight text-slate-800">{sup.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {sup.phone ? (
                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {sup.phone}</p>
                        ) : (
                          <p className="text-[10px] font-medium text-slate-400 italic">Sin teléfono</p>
                        )}
                        {sup.address ? (
                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {sup.address}</p>
                        ) : (
                          <p className="text-[10px] font-medium text-slate-400 italic">Sin dirección</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenSupplierHistory(sup.name)} title="Ver Historial de Compras"><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEditSupplier(sup)} title="Editar Proveedor"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSupplierToDelete(sup)} title="Eliminar Proveedor"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50"><Button variant="outline" onClick={() => setIsSupplierManagerOpen(false)} className="w-full font-bold">Cerrar Gestor</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPurchaseHistoryOpen} onOpenChange={setIsPurchaseHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b shrink-0 bg-primary/5">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl font-black uppercase text-primary tracking-tighter">Historial de Compras</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase text-slate-500">{selectedProductForHistory?.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow><TableHead className="text-[9px] font-black uppercase">Fecha</TableHead><TableHead className="text-[9px] font-black uppercase">Proveedor</TableHead><TableHead className="text-center font-black text-[9px] uppercase">Cant.</TableHead><TableHead className="text-right font-black text-[9px] uppercase">Precio Unit.</TableHead><TableHead className="text-right font-black text-[9px] uppercase">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {allPurchases?.filter(p => p.productId === selectedProductForHistory?.id).map(p => (
                  <TableRow key={p.id} className="h-12">
                    <TableCell className="text-xs font-bold">{new Date(p.date).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-xs font-black uppercase text-slate-600">{p.supplierName}</TableCell>
                    <TableCell className="text-center font-bold">{p.quantity}</TableCell>
                    <TableCell className="text-right font-black text-emerald-700">{p.currency === 'USD' ? 'u$s' : '$'} {(p.price ?? 0).toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-black">{p.currency === 'USD' ? 'u$s' : '$'} {(p.quantity * p.price).toLocaleString('es-AR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50"><Button onClick={() => setIsPurchaseHistoryOpen(false)} className="font-bold">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierHistoryOpen} onOpenChange={setIsSupplierHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b shrink-0 bg-emerald-50">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-emerald-600" />
              <div>
                <DialogTitle className="text-xl font-black uppercase text-emerald-700 tracking-tighter">Historial de Compras al Proveedor</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase text-slate-500">{selectedSupplierForHistory}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase">Fecha</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Producto</TableHead>
                  <TableHead className="text-center font-black text-[9px] uppercase">Cant.</TableHead>
                  <TableHead className="text-right font-black text-[9px] uppercase">Precio Unit.</TableHead>
                  <TableHead className="text-right font-black text-[9px] uppercase">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!allPurchases || allPurchases.filter(p => p.supplierName === selectedSupplierForHistory).length === 0) ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No se registran compras para este proveedor.</TableCell></TableRow>
                ) : allPurchases.filter(p => p.supplierName === selectedSupplierForHistory).map(p => (
                  <TableRow key={p.id} className="h-12">
                    <TableCell className="text-xs font-bold">{new Date(p.date).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell className="text-xs font-black uppercase text-slate-600">{p.productName}</TableCell>
                    <TableCell className="text-center font-bold">{p.quantity}</TableCell>
                    <TableCell className="text-right font-black text-emerald-700">{p.currency === 'USD' ? 'u$s' : '$'} {(p.price ?? 0).toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-black">{p.currency === 'USD' ? 'u$s' : '$'} {(p.quantity * p.price).toLocaleString('es-AR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50"><Button onClick={() => setIsSupplierHistoryOpen(false)} className="font-bold">Cerrar Historial</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => !o && setItemToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Se borrará permanentemente a <b>{itemToDelete?.name}</b> del catálogo y stock. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(db, 'products_services', itemToDelete.id)); setItemToDelete(null); toast({ title: "Ítem eliminado" }); }} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => !o && setOrderToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar plan de producción?</AlertDialogTitle><AlertDialogDescription>Se perderá la planificación de <b>{orderToDelete?.productName}</b>. El stock de insumos permanecerá intacto.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!purchaseOrderToDelete} onOpenChange={(o) => !o && setPurchaseOrderToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar orden de compra?</AlertDialogTitle><AlertDialogDescription>Se cancelará el pedido de reposición. Esta acción no afecta el stock actual.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePurchaseOrder} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!orderToFinalize} onOpenChange={(o) => !o && setOrderToFinalize(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-600" /> ¿Confirmar Finalización de Armado?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p>Al confirmar:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs font-bold text-slate-700">
                <li>Se descontarán automáticamente los insumos del stock según la explosión inteligente.</li>
                <li>Se sumarán <b>{orderToFinalize?.quantity} unidades</b> al stock de <b>{orderToFinalize?.productName}</b>.</li>
                <li>La orden pasará al historial como completada.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmFinalize} className="bg-emerald-600 hover:bg-emerald-700">CONFIRMAR E INGRESAR</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cambios sin guardar o sincronizar</AlertDialogTitle><AlertDialogDescription>Has realizado modificaciones en el plan o en la orden de compra que no han sido guardadas. ¿Deseas salir de todas formas?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Seguir editando</AlertDialogCancel><AlertDialogAction onClick={() => { setIsExitAlertOpen(false); setPurchaseOrderToView(null); setOrderToView(null); setInitialProductionQty(null); }} className="bg-destructive">Salir sin guardar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!supplierToDelete} onOpenChange={(o) => !o && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará a <b>{supplierToDelete?.name}</b>. Esto no afectará a los productos que ya lo tengan asignado, pero dejará de aparecer en las listas de selección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(supplierToDelete) { deleteDocumentNonBlocking(doc(db, 'suppliers', supplierToDelete.id)); setSupplierToDelete(null); toast({ title: "Proveedor eliminado" }); } }} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(o) => !o && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará la categoría <b>{categoryToDelete?.name}</b>. Los productos asignados a ella quedarán como "Sin Categoría".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(categoryToDelete) { deleteDocumentNonBlocking(doc(db, 'product_categories', categoryToDelete.id)); setCategoryToDelete(null); toast({ title: "Categoría eliminada" }); } }} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />

      {/* VISTA DE IMPRESIÓN (PDF) */}
      <div className="print-only w-full p-8 bg-white text-slate-900 font-sans">
        {itemToPrint && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Ficha Técnica de Producto</h1>
                <p className="text-sm font-bold text-slate-600">{itemToPrint.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase text-slate-400">Dosimat Pro System</p>
                <p className="text-sm font-bold">{new Date().toLocaleDateString('es-AR')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">Parámetros de Venta</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[8px] font-black uppercase text-blue-600">Venta ARS</p>
                    <p className="text-lg font-black">${(itemToPrint.priceARS ?? 0).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[8px] font-black uppercase text-emerald-600">Venta USD</p>
                    <p className="text-lg font-black">u$s {(itemToPrint.priceUSD ?? 0).toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">Situación de Stock</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[8px] font-black uppercase text-slate-400">Actual</p>
                    <p className="text-lg font-black">{itemToPrint.stock ?? 0}</p>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[8px] font-black uppercase text-rose-600">Mínimo</p>
                    <p className="text-lg font-black">{itemToPrint.minStock ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {itemToPrint.isCompuesto && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">Estructura de Materiales (BOM)</h3>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 text-left uppercase font-black">Componente</th>
                      <th className="p-2 text-center uppercase font-black">Cantidad</th>
                      <th className="p-2 text-right uppercase font-black">Costo Ref. (ARS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itemToPrint.components || []).map((comp: any, i: number) => {
                      const detail = items?.find(it => it.id === comp.productId);
                      const cost = calculateCost(detail || {}, items || [], currentRate).ars;
                      return (
                        <tr key={i} className="border-b border-slate-300">
                          <td className="p-2 font-bold">{detail?.name || 'Desconocido'}</td>
                          <td className="p-2 text-center font-black">{comp.quantity}</td>
                          <td className="p-2 text-right">${(cost * comp.quantity).toLocaleString('es-AR')}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={2} className="p-2 text-right uppercase">Total Costo Materiales</td>
                      <td className="p-2 text-right">${(itemToPrint.calculatedCostARS - ((itemToPrint.laborCostARS ?? 0) + (itemToPrint.laborCostUSD ?? 0) * currentRate)).toLocaleString('es-AR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {orderToPrint && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Plan de Armado / Producción</h1>
                <p className="text-sm font-bold text-slate-600">#{orderToPrint.friendlyId || orderToPrint.id.toUpperCase().slice(0, 6)} - {orderToPrint.productName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">Fecha de Plan</p>
                <p className="text-sm font-bold">{new Date(orderToPrint.createdAt).toLocaleDateString('es-AR')}</p>
              </div>
            </div>

            <div className="p-6 border-2 border-slate-900 rounded-2xl bg-slate-50 flex justify-between items-center mb-8">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Unidades a fabricar</p>
                <p className="text-5xl font-black text-slate-900">{orderToPrint.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase text-slate-500">Estado de Plan</p>
                <p className="text-xl font-black uppercase text-primary">{orderToPrint.status}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">Lista de Recolección de Materiales (Picking List)</h3>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 text-left uppercase font-black">Material</th>
                    <th className="p-2 text-center uppercase font-black">Requerido</th>
                    <th className="p-2 text-center uppercase font-black">Entregado</th>
                    <th className="p-2 text-left uppercase font-black">Ubicación / Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {explosionSummary?.all.map((f: any, i: number) => (
                    <tr key={i} className="border-b border-slate-300 h-12">
                      <td className="p-2 font-bold">{f.name}</td>
                      <td className="p-2 text-center font-black text-lg">{f.required}</td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 border-2 border-slate-900 rounded mx-auto"></div>
                      </td>
                      <td className="p-2 border-l border-slate-200">
                        <div className="h-4 border-b border-dotted border-slate-400 w-full"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-12 pt-8 border-t border-dashed grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="h-px bg-slate-900 w-48 mx-auto mb-2"></div>
                <p className="text-[10px] font-black uppercase">Responsable de Armado</p>
              </div>
              <div className="text-center">
                <div className="h-px bg-slate-900 w-48 mx-auto mb-2"></div>
                <p className="text-[10px] font-black uppercase">Control de Calidad / Stock</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CatalogContent />
    </Suspense>
  )
}
