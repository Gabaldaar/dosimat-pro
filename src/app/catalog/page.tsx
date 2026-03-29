
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
  ExternalLink
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu as DropdownMenuUI,
  DropdownMenuContent as DropdownMenuContentUI,
  DropdownMenuItem as DropdownMenuItemUI,
  DropdownMenuTrigger as DropdownMenuTriggerUI
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

  // Obtener la versión actualizada de la orden que se está visualizando
  const liveOrderToView = useMemo(() => {
    if (!orderToView || !orders) return null;
    return orders.find(o => o.id === orderToView.id) || orderToView;
  }, [orderToView, orders]);

  // Fix pointer events
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const anyOpen = isDialogOpen || !!itemToDelete || isAssemblyOpen || isNewPurchaseOrderOpen || isCategoryManagerOpen || isSupplierManagerOpen || !!orderToView || !!purchaseOrderToView || !!orderToDelete || !!purchaseOrderToDelete || isAuditOpen || isExitAlertOpen || !!orderToFinalize || isPurchaseHistoryOpen || isSupplierHistoryOpen;
        if (!anyOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isDialogOpen, itemToDelete, isAssemblyOpen, isNewPurchaseOrderOpen, isCategoryManagerOpen, isSupplierManagerOpen, orderToView, purchaseOrderToView, orderToDelete, purchaseOrderToDelete, isAuditOpen, isExitAlertOpen, orderToFinalize, isPurchaseHistoryOpen, isSupplierHistoryOpen]);

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
    const currentOrder = liveOrderToView;
    
    if (currentOrder?.status === 'completed' && currentOrder.explosionSnapshot) {
      return currentOrder.explosionSnapshot;
    }

    const target = currentOrder ? items?.find(i => i.id === currentOrder.productId) : selectedForAssembly;
    const qty = currentOrder ? currentOrder.quantity : assemblyQty;
    
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
      toBuySuggested: flatList.filter(f => f.suggestedToBuy > 0)
    };
  }, [selectedForAssembly, assemblyQty, items, liveOrderToView]);

  // Actualizar el estado de la Orden de Producción según el stock real
  useEffect(() => {
    if (liveOrderToView && liveOrderToView.status !== 'completed' && explosionSummary) {
      const anyMissing = explosionSummary.all.some(f => (f.available - f.required) < 0);
      const newStatus = anyMissing ? 'pending_purchase' : 'ready';
      
      if (newStatus !== liveOrderToView.status) {
        updateDocumentNonBlocking(doc(db, 'production_orders', liveOrderToView.id), { status: newStatus });
      }
    }
  }, [items, liveOrderToView, explosionSummary, db]);

  useEffect(() => {
    if (purchaseOrderToView) {
      const newManualQtys: Record<string, number> = {};
      const newManualPrices: Record<string, number> = {};
      const newManualCurrencies: Record<string, 'ARS' | 'USD'> = {};
      const newManualSups: Record<string, string> = {};
      
      purchaseOrderToView.items.forEach((item: any) => {
        const lineId = item.id || item.productId;
        newManualQtys[lineId] = item.quantity;
        newManualCurrencies[lineId] = item.currency || 'ARS';
        newManualPrices[lineId] = item.price || 0;
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

  const handleCloseOrderView = () => {
    if (hasUnsavedChanges) {
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
        received: item.received || false
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
    const costAmount = costCurrency === 'USD' ? (item.costUSD || 0) : (item.costARS || 0);

    setFormData({
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
      costARS: formData.costCurrency === 'ARS' ? formData.costAmount : 0,
      costUSD: formData.costCurrency === 'USD' ? formData.costAmount : 0
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
    
    const anyMissing = explosionSummary?.all.some(f => (f.available - f.required) < 0);
    const status = anyMissing ? 'pending_purchase' : 'ready';
    
    const newOrder = {
      id,
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
    toast({ title: "Orden de producción creada", description: `Estado inicial: ${status === 'ready' ? 'Listo para armar' : 'Pendiente de compra'}` });
  }

  const handleCreatePurchaseOrder = () => {
    if (newPOItems.length === 0) return;
    const id = Math.random().toString(36).substring(2, 11);
    
    const itemsToSave = newPOItems.map(item => ({
      id: Math.random().toString(36).substring(2, 11),
      productId: item.id,
      productName: item.name,
      quantity: Number(item.qtyToAdd) || 1,
      price: item.costCurrency === 'USD' ? (item.costUSD || 0) : (item.costARS || 0),
      currency: item.costCurrency || 'ARS',
      supplier: item.supplier || "Sin Proveedor",
      received: false
    }));

    const newPO = {
      id,
      description: newPOTitle || "Orden de Reposición Manual",
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
    toast({ title: "Orden de compra creada", description: "Ya puedes gestionarla en la pestaña de Compras." });
  }

  const handleGeneratePOFromProduction = () => {
    if (!liveOrderToView || !explosionSummary) return;
    
    const missingItems = explosionSummary.all.filter(f => (f.required - f.available) > 0);
    
    if (missingItems.length === 0 && !liveOrderToView.purchaseOrderId) {
      toast({ title: "Sin faltantes", description: "No hay materiales faltantes para este armado." });
      return;
    }

    const linkedPOId = liveOrderToView.purchaseOrderId;
    const existingPO = purchaseOrders?.find(po => po.id === linkedPOId);

    if (existingPO && existingPO.status !== 'completed') {
      const updatedItems = [...existingPO.items];
      const newSupplierStatuses = { ...(existingPO.supplierStatuses || {}) };
      let itemsAdded = 0;

      missingItems.forEach(missing => {
        const totalRequired = missing.required;
        const currentInStock = missing.available;
        const totalAlreadyInPO = existingPO.items
          .filter((i: any) => i.productId === missing.id)
          .reduce((sum: number, i: any) => sum + i.quantity, 0);
        
        const netMissing = totalRequired - (currentInStock + totalAlreadyInPO);
        
        if (netMissing > 0) {
          itemsAdded++;
          const supplier = missing.supplier || "Sin Proveedor";
          
          // Al agregar items, desbloqueamos al proveedor automáticamente
          if (newSupplierStatuses[supplier] === 'ordered') {
            newSupplierStatuses[supplier] = 'pending';
          }

          const pendingLineIdx = updatedItems.findIndex((i: any) => 
            i.productId === missing.id && 
            (newSupplierStatuses[i.supplier || "Sin Proveedor"] !== 'ordered') &&
            !i.received
          );

          if (pendingLineIdx > -1) {
            updatedItems[pendingLineIdx].quantity += netMissing;
          } else {
            updatedItems.push({
              id: Math.random().toString(36).substring(2, 11),
              productId: missing.id,
              productName: missing.name,
              quantity: netMissing,
              price: missing.costCurrency === 'USD' ? missing.costUSD : missing.costARS,
              currency: missing.costCurrency || 'ARS',
              supplier: supplier,
              received: false
            });
          }
        }
      });

      if (itemsAdded > 0) {
        updateDocumentNonBlocking(doc(db, 'purchase_orders', existingPO.id), { 
          items: updatedItems,
          supplierStatuses: newSupplierStatuses 
        });
        toast({ title: "Orden de Compra actualizada", description: `Se añadieron ${itemsAdded} ajustes de cantidad. Proveedores afectados desbloqueados.` });
      } else {
        toast({ title: "Orden al día", description: "La orden de compra vinculada ya cubre los materiales necesarios." });
      }
      
      setPurchaseOrderToView(existingPO);
      setOrderToView(null);
      setActiveTab("purchases");
    } else {
      const newPOId = Math.random().toString(36).substring(2, 11);
      const newPOItems = missingItems.map(m => ({
        id: Math.random().toString(36).substring(2, 11),
        productId: m.id,
        productName: m.name,
        quantity: Math.max(m.missing, m.suggestedToBuy),
        price: m.costCurrency === 'USD' ? m.costUSD : m.costARS,
        currency: m.costCurrency || 'ARS',
        supplier: m.supplier || "Sin Proveedor",
        received: false
      }));

      const newPO = {
        id: newPOId,
        description: `Faltantes: ${liveOrderToView.productName} (#${liveOrderToView.id.slice(0, 4)})`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: newPOItems,
        supplierStatuses: {},
        productionOrderId: liveOrderToView.id
      };

      setDocumentNonBlocking(doc(db, 'purchase_orders', newPOId), newPO, { merge: true });
      updateDocumentNonBlocking(doc(db, 'production_orders', liveOrderToView.id), { purchaseOrderId: newPOId });
      
      setPurchaseOrderToView(newPO);
      setOrderToView(null);
      setActiveTab("purchases");
      toast({ title: "Orden de Compra generada", description: "Vinculada a este plan de producción." });
    }
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
      price: prod.costCurrency === 'USD' ? prod.costUSD : prod.costARS,
      currency: prod.costCurrency || 'ARS',
      supplier: prod.supplier || "Sin Proveedor",
      received: false
    };

    const updatedItems = [...purchaseOrderToView.items, newItem];
    const supplier = newItem.supplier;
    const newStatuses = { ...supplierStatuses };
    
    // Si el proveedor estaba bloqueado, lo desbloqueamos al añadir items manuales
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
    if (!purchaseOrderToView || !purchaseCalculations) return;

    const itemsToProcess = purchaseCalculations.items.filter(i => (i.supplier || "Sin Proveedor") === supplierName);
    
    itemsToProcess.forEach(item => {
      if (item.manualQty > 0) {
        const manualCurrency = manualPurchaseCurrencies[item.id] || (item.manualCurrency || 'ARS');
        const purchaseId = Math.random().toString(36).substring(2, 11);
        const purchaseRecord = {
          id: purchaseId,
          productId: item.productId,
          productName: item.name,
          supplierName: supplierName,
          quantity: item.manualQty,
          price: item.manualPrice,
          currency: manualCurrency,
          date: new Date().toISOString(),
          orderId: purchaseOrderToView.id,
          exchangeRate: currentRate,
          rateType: rateType
        };
        setDocumentNonBlocking(doc(db, 'purchases', purchaseId), purchaseRecord, { merge: true });

        updateDocumentNonBlocking(doc(db, 'products_services', item.productId), {
          stock: increment(item.manualQty)
        });
        
        if (item.manualPrice > 0) {
          const costField = manualCurrency === 'USD' ? 'costUSD' : 'costARS';
          const otherCostField = manualCurrency === 'USD' ? 'costARS' : 'costUSD';
          updateDocumentNonBlocking(doc(db, 'products_services', item.productId), {
            [costField]: item.manualPrice,
            [otherCostField]: 0,
            costCurrency: manualCurrency
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
      const itemsInSupplier = purchaseCalculations?.items.filter(i => (i.supplier || "Sin Proveedor") === supplierName) || [];
      const hasZeroPrice = itemsInSupplier.some(i => i.manualPrice <= 0);
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

  const handleUpdateItemSupplierGlobally = useCallback((lineId: string, productId: string, newSupplier: string) => {
    const cleanSupplier = newSupplier === "Sin Proveedor" ? "" : newSupplier;
    
    // Si cambiamos de proveedor, el nuevo proveedor debe estar en estado 'pending' (desbloqueado)
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
    let text = `*LISTA DE COMPRAS - DOSIMAT PRO*\n`;
    text += `PROVEEDOR: ${supplierFilter.toUpperCase()}\n`;
    const supObj = suppliers?.find(s => s.name === supplierFilter);
    if (supObj) {
      if (supObj.phone) text += `Tel: ${supObj.phone}\n`;
      if (supObj.address) text += `Dir: ${supObj.address}\n`;
    }
    text += `Fecha: ${dateStr}\n\n`;
    const itemsToInclude = purchaseCalculations.items.filter((i: any) => (i.supplier || "Sin Proveedor") === supplierFilter);
    if (itemsToInclude.length === 0) {
      toast({ title: "Sin ítems", description: "No hay faltantes para este proveedor." });
      return;
    }
    const sortedItemsToInclude = [...itemsToInclude].sort((a, b) => a.name.localeCompare(b.name));
    sortedItemsToInclude.forEach(f => {
      const lineId = f.id;
      const currency = manualPurchaseCurrencies[lineId] || (f.manualCurrency || 'ARS');
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
                <Card key={order.id} className={cn("glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group", order.status === 'completed' ? 'border-l-emerald-500 opacity-70' : 'border-l-amber-500')} onClick={() => setOrderToView(order)}>
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
                  <CardContent className="space-y-4">
                    <div className="bg-white/50 border rounded-lg p-3 flex items-center justify-between shadow-inner">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Unidades a Fabricar</span>
                      <span className="text-2xl font-black text-amber-600">{order.quantity}</span>
                    </div>
                    {order.purchaseOrderId && (
                      <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                        <ShoppingCart className="h-3 w-3" /> COMPRA ASOCIADA: #{order.purchaseOrderId.slice(0,4).toUpperCase()}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 border-t bg-muted/5 flex justify-between py-3"><Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">VER DETALLE <ChevronRight className="h-3 w-3 ml-1" /></Button>{order.status === 'ready' && <Badge className="bg-blue-600 animate-pulse text-[8px] font-black">PRODUCCIÓN HABILITADA</Badge>}</CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const PurchaseOrdersList = () => {
    return (
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button onClick={() => setIsNewPurchaseOrderOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2">
            <Plus className="h-4 w-4" /> Nueva Orden de Compra
          </Button>
        </div>
        {loadingPO ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-muted-foreground italic">Cargando órdenes de compra...</p>
          </div>
        ) : !purchaseOrders || purchaseOrders.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 bg-muted/5">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xl font-bold text-slate-800">No hay órdenes de compra manuales</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">Crea una orden para reponer stock de componentes sueltos o insumos específicos.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders.map((po: any) => {
              const allReceived = po.items.every((i: any) => i.received);
              return (
                <Card key={po.id} className={cn("glass-card hover:shadow-lg transition-all cursor-pointer border-l-4 group", allReceived ? 'border-l-emerald-500 opacity-70' : 'border-l-emerald-600')} onClick={() => setPurchaseOrderToView(po)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", allReceived ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                        {allReceived ? <CheckCircle className="h-2.5 w-2.5 mr-1" /> : <Clock className="h-2.5 w-2.5 mr-1" />}
                        {allReceived ? 'COMPLETADA' : 'PENDIENTE'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setPurchaseOrderToDelete(po); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <CardTitle className="text-lg mt-2 font-bold leading-tight">{po.description || "Orden de Reposición"}</CardTitle>
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
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase p-0 px-2">GESTIONAR RECEPCIÓN <ChevronRight className="h-3 w-3 ml-1" /></Button>
                  </CardFooter>
                </Card>
              );
            })}
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
            <CheckCircle2 className="h-12 w-12 mx-auto" /><p className="font-black">PEDIDO COMPLETADO</p><p className="text-xs text-muted-foreground italic">Ya se recibieron todos los materiales de esta orden.</p>
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
                    <div className={cn("p-2 rounded-lg text-white", isOrdered ? "bg-slate-400" : "bg-emerald-600")}>
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
                  </div>
                </div>

                <div className="border-2 rounded-xl bg-white shadow-md overflow-hidden">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase">Material</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-20">Cantidad</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-48">Precio Compra</TableHead>
                        <TableHead className="text-center font-black text-[9px] uppercase w-40">Proveedor</TableHead>
                        <TableHead className="text-right font-black text-[9px] uppercase w-28">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsInGroup.map(f => {
                        const lineId = f.id;
                        const isZero = manualPurchasePrices[lineId] <= 0;
                        const currentCurrency = manualPurchaseCurrencies[lineId] || (f.manualCurrency || 'ARS');
                        
                        return (
                          <TableRow key={lineId} className="hover:bg-muted/5 h-10">
                            <TableCell className="py-1">
                              <p className="font-bold text-xs">{f.name}</p>
                              <p className="text-[8px] text-muted-foreground uppercase">Stock Actual: {f.available}</p>
                            </TableCell>
                            <TableCell className="py-1">
                              <input 
                                type="number" 
                                disabled={isOrdered} 
                                value={manualPurchaseQtys[lineId] ?? 0} 
                                onChange={(e) => setManualPurchaseQtys(prev => ({ ...prev, [lineId]: Number(e.target.value) }))} 
                                className="w-full text-center font-black text-xs bg-muted/30 border-none rounded h-7 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  disabled={isOrdered} 
                                  value={manualPurchasePrices[lineId] ?? 0} 
                                  onChange={(e) => setManualPurchasePrices(prev => ({ ...prev, [lineId]: Number(e.target.value) }))} 
                                  className={cn(
                                    "w-full text-center font-black text-xs h-7 border rounded transition-all focus:outline-none focus:ring-2",
                                    isZero ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-white border-emerald-100 text-emerald-700"
                                  )} 
                                />
                                <Tabs 
                                  value={currentCurrency} 
                                  onValueChange={(v: any) => setManualPurchaseCurrencies(prev => ({ ...prev, [lineId]: v }))}
                                  className={cn("shrink-0 h-7", isOrdered && "pointer-events-none opacity-50")}
                                >
                                  <TabsList className="h-7 p-0 gap-0 border">
                                    <TabsTrigger value="ARS" className="h-6 text-[8px] font-black px-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                                    <TabsTrigger value="USD" className="h-6 text-[8px] font-black px-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <Select 
                                disabled={isOrdered}
                                value={manualSuppliers[lineId] || "Sin Proveedor"} 
                                onValueChange={(v) => handleUpdateItemSupplierGlobally(lineId, f.productId, v)}
                              >
                                <SelectTrigger className="h-7 text-[10px] font-bold border-none bg-transparent">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sin Proveedor">Sin Proveedor</SelectItem>
                                  {sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right py-1">
                              <p className="text-[10px] font-bold">{currentCurrency === 'USD' ? 'u$s' : '$'} {( (manualPurchaseQtys[lineId] ?? 0) * (manualPurchasePrices[lineId] ?? 0)).toLocaleString('es-AR')}</p>
                            </TableCell>
                            <TableCell className="py-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive" 
                                disabled={isOrdered}
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
                  <div className="bg-slate-50 border-t p-3 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} ARS:</span><span className="font-black text-xs text-primary">${groupARS.toLocaleString('es-AR')}</span></div>
                    <div className="flex items-center gap-2 justify-end"><span className="text-[8px] font-black uppercase text-slate-400">Total {sup} USD:</span><span className="font-black text-xs text-emerald-700">u$s {groupUSD.toLocaleString('es-AR')}</span></div>
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
                  <TabsTrigger value="orders" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase">PRODUCCIÓN</TabsTrigger>
                  <TabsTrigger value="purchases" className="text-[10px] font-black h-8 px-5 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all uppercase">COMPRAS</TabsTrigger>
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
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input placeholder="Buscar por nombre..." className="w-full pl-10 h-11 bg-white/50 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        const isLowStock = tracksStock && !item.isService && (item.stock || 0) <= (item.minStock || 0); 
                        const catName = categoryMap[item.categoryId] || "Sin Categoría"; 
                        const marginARS = getMarginInfo(item.priceARS, item.calculatedCostARS); 
                        const marginUSD = getMarginInfo(item.priceUSD, item.calculatedCostUSD); 
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
            <TabsContent value="purchases" className="m-0"><PurchaseOrdersList /></TabsContent>
          </Tabs>
        </SidebarInset>
      </div>

      {/* DIALOGS */}
      
      {/* Create Manual Purchase Order Dialog */}
      <Dialog open={isNewPurchaseOrderOpen} onOpenChange={setIsNewPurchaseOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-emerald-600" />
              <DialogTitle className="text-xl font-black uppercase text-emerald-700 tracking-tighter">Nueva Orden de Compra</DialogTitle>
            </div>
            <DialogDescription className="font-bold text-emerald-600/60 uppercase text-[10px]">REPOSICIÓN MANUAL DE INVENTARIO</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">Título / Identificador de la Orden</Label>
              <Input value={newPOTitle} onChange={(e) => setNewPOTitle(e.target.value)} placeholder="Ej: Reposición de Ferretería, Insumos de Verano..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Categoría</Label>
                <Select value={newPOCatFilter} onValueChange={setNewPOCatFilter}>
                  <SelectTrigger className="bg-white h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Todas las Categorías</SelectItem>
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
                  <SelectTrigger className="bg-white h-10"><SelectValue placeholder="Buscar ítem..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {items?.filter(i => !i.isService && (newPOCatFilter === 'all' || i.categoryId === newPOCatFilter)).sort((a,b) => a.name.localeCompare(b.name)).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock || 0})</SelectItem>
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
                            value={item.qtyToAdd} 
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

      {/* Dialog para configurar nueva orden de armado */}
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
                <p className="text-2xl font-black text-amber-900">{selectedForAssembly?.stock || 0}</p>
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
                      <TableHead className="text-center font-black text-[10px] uppercase">Necesario</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Disponible</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Faltante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explosionSummary?.all.map(f => {
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

      {/* Manual Purchase Order Detail View */}
      <Dialog open={!!purchaseOrderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 border-b shrink-0 bg-emerald-500/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pr-8 gap-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
                <div>
                  <DialogTitle className="text-xl font-black uppercase text-emerald-700 tracking-tighter">Orden de Compra #{purchaseOrderToView?.id.toUpperCase().slice(0, 6)}</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase text-emerald-600/60">{purchaseOrderToView?.description || "Reposición manual de componentes"}</DialogDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Filtrar Categoría</Label>
                    <Select value={newPOCatFilter} onValueChange={setNewPOCatFilter}>
                      <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="Ver todas..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Añadir más productos</Label>
                    <Select onValueChange={handleAddItemToPurchaseOrder}>
                      <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="Buscar ítem..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {items?.filter(i => !i.isService && (newPOCatFilter === 'all' || i.categoryId === newPOCatFilter)).sort((a,b) => a.name.localeCompare(b.name)).map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock || 0})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <GroupedPurchaseList />
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex justify-between items-center w-full">
              <div className="flex gap-4">
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Proyectado ARS</p><p className="text-xl font-black text-blue-700">${purchaseCalculations?.totalARS.toLocaleString('es-AR')}</p></div>
                <div><p className="text-[8px] font-black text-slate-400 uppercase">Proyectado USD</p><p className="text-xl font-black text-emerald-600">u$s {purchaseCalculations?.totalUSD.toLocaleString('es-AR')}</p></div>
              </div>
              <Button onClick={handleCloseOrderView} className="font-bold">Cerrar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <History className="h-5 w-5 text-emerald-600" />
              <DialogTitle className="text-xl font-black">Historial Comercial: {selectedSupplierForHistory}</DialogTitle>
            </div>
            <DialogDescription className="font-bold">Resumen de todas las compras ingresadas a este proveedor.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!allPurchases ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="border rounded-2xl bg-white overflow-hidden shadow-md">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Fecha</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Producto</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-20">Cant.</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase">Precio Unit.</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase w-24">Dólar Ref.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPurchases
                      .filter(p => p.supplierName === selectedSupplierForHistory)
                      .map((p: any) => (
                        <TableRow key={p.id} className="h-14 hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="text-xs font-bold text-slate-600">
                            {new Date(p.date).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell className="text-xs font-black text-slate-800">{p.productName}</TableCell>
                          <TableCell className="text-center font-black text-sm">{p.quantity}</TableCell>
                          <TableCell className="text-right font-black">
                            <span className={p.currency === 'USD' ? 'text-emerald-700' : 'text-blue-700'}>
                              {p.currency === 'USD' ? 'u$s' : '$'} {Number(p.price).toLocaleString('es-AR')}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[8px] font-bold uppercase">
                              {p.rateType} ${p.exchangeRate}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    {allPurchases.filter(p => p.supplierName === selectedSupplierForHistory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-muted-foreground italic text-xs">
                          No hay registros de compras para este proveedor.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSupplierHistoryOpen(false)} className="w-full font-bold h-12">Cerrar Historial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-3 pb-1 shrink-0 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-black text-slate-800">Panel de Auditoría</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-4 py-2 shrink-0 border-b bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filtrar artículos..." className="pl-10 h-10" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
              </div>
              <Select value={auditCategoryFilter} onValueChange={setAuditCategoryFilter}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[60vh]">
                  <SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem>
                  {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 min-h-0 px-4 py-2 overflow-y-auto">
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
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
                      <TableCell className="py-1"><p className="font-bold text-xs">{item.name}</p></TableCell>
                      <TableCell className="text-center py-1">
                        <Input type="number" className="w-20 mx-auto text-center font-black h-8 text-xs" defaultValue={item.stock || 0} onBlur={(e) => { const val = Number(e.target.value); if (val !== item.stock) handleUpdateItemAudit(item.id, { stock: val }); }} />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Input type="number" className="w-24 mx-auto text-center font-black h-8 text-xs border-primary/20" defaultValue={item.costCurrency === 'USD' ? item.costUSD : item.costARS} onBlur={(e) => handleUpdateItemAudit(item.id, { costAmount: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Tabs defaultValue={item.costCurrency || (item.costUSD > 0 && !item.costARS ? 'USD' : 'ARS')} onValueChange={(v: any) => handleUpdateItemAudit(item.id, { costCurrency: v })} className="w-28 mx-auto">
                          <TabsList className="grid grid-cols-2 h-8 p-0.5 border shadow-inner">
                            <TabsTrigger value="ARS" className="text-[9px] font-black h-7 data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger>
                            <TabsTrigger value="USD" className="text-[9px] font-black h-7 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Select defaultValue={item.supplier || "Sin Proveedor"} onValueChange={(v) => handleUpdateGlobalSupplier(item.id, v)}>
                          <SelectTrigger className="h-8 text-[10px] bg-transparent border-none focus:ring-0"><SelectValue /></SelectTrigger>
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

      {/* Production Order View - Simplified to Plan only */}
      <Dialog open={!!orderToView} onOpenChange={handleCloseOrderView}>
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-4 border-b shrink-0 bg-amber-500/5">
            <div className="flex flex-col md:flex-row justify-between items-start pr-8 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-amber-600" />
                  <DialogTitle className="text-xl font-black uppercase text-amber-700 tracking-tighter">Plan de Producción #{liveOrderToView?.id.toUpperCase().slice(0, 6)}</DialogTitle>
                </div>
                <div className="flex items-center gap-3">
                  <DialogDescription className="text-base text-amber-800 font-bold">Fabricar <b>{liveOrderToView?.productName}</b></DialogDescription>
                  {liveOrderToView?.status !== 'completed' && (
                    <div className="flex items-center gap-2 bg-amber-100 px-2 py-1 rounded-xl border border-amber-200 shadow-inner">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-700" onClick={() => { const newQty = Math.max(1, liveOrderToView!.quantity - 1); updateDocumentNonBlocking(doc(db, 'production_orders', liveOrderToView!.id), { quantity: newQty }); }}><Minus className="h-4 w-4" /></Button>
                      <span className="text-sm font-black text-amber-900 tabular-nums">{liveOrderToView?.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-700" onClick={() => { const newQty = liveOrderToView!.quantity + 1; updateDocumentNonBlocking(doc(db, 'production_orders', liveOrderToView!.id), { quantity: newQty }); }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="h-9 gap-2 font-bold text-xs bg-white border-amber-200 text-amber-700" onClick={() => handlePrintProductionOrder(liveOrderToView)}>
                  <Printer className="h-4 w-4" /> IMPRIMIR PLAN
                </Button>
                <Badge className={cn("font-black uppercase text-[10px] px-3 py-1", { draft: "bg-slate-100 text-slate-600", pending_purchase: "bg-rose-100 text-rose-700 border-rose-200", ready: "bg-blue-100 text-blue-700 border-blue-200", completed: "bg-emerald-100 text-emerald-700 border-emerald-200" }[liveOrderToView?.status as string])}>
                  {liveOrderToView?.status === 'pending_purchase' ? 'FALTAN MATERIALES' : liveOrderToView?.status === 'ready' ? 'LISTO PARA ARMAR' : liveOrderToView?.status}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Necesidades de Insumos (Explosión)
                </h3>
                {liveOrderToView?.purchaseOrderId && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] gap-1.5 px-3">
                    <Check className="h-3 w-3" /> COMPRA VINCULADA: #{liveOrderToView.purchaseOrderId.slice(0,4).toUpperCase()}
                  </Badge>
                )}
              </div>
              
              <div className="border rounded-2xl bg-white shadow-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Componente</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Necesario</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">En Stock</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase">Faltante</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Proveedor Sugerido</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase w-20">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explosionSummary?.all.map(f => {
                      const deficit = f.required - f.available;
                      const hasMissing = deficit > 0;
                      return (
                        <TableRow key={f.id} className="h-14">
                          <TableCell className="py-2">
                            <p className="font-bold text-sm leading-tight">{f.name}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">{f.isCompuesto ? 'Parte Compuesta' : 'Insumo Directo'}</p>
                          </TableCell>
                          <TableCell className="text-center font-black text-slate-800">{f.required}</TableCell>
                          <TableCell className="text-center font-bold text-slate-600">{f.available}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("font-black text-sm", hasMissing ? "text-rose-600" : "text-emerald-600")}>
                              {hasMissing ? deficit : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-500 uppercase">{f.supplier}</TableCell>
                          <TableCell className="text-center">
                            {hasMissing ? (
                              <div className="flex justify-center"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                            ) : (
                              <div className="flex justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {liveOrderToView?.status === 'pending_purchase' && (
              <Card className="bg-amber-50 border-amber-200 border-dashed p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-amber-800">
                      {liveOrderToView.purchaseOrderId ? 'Sincronizar Pedido de Compra' : 'Faltan Materiales para Fabricar'}
                    </h4>
                    <p className="text-sm text-amber-700">
                      {liveOrderToView.purchaseOrderId 
                        ? 'Ya existe una compra vinculada. Haz clic para agregar los faltantes adicionales según la nueva cantidad.'
                        : `Se han detectado ${explosionSummary?.all.filter(f => (f.required - f.available) > 0).length} ítems sin stock suficiente.`}
                    </p>
                  </div>
                  <Button onClick={handleGeneratePOFromProduction} className="bg-amber-600 hover:bg-amber-700 font-black h-12 px-8 shadow-lg shadow-amber-200 gap-2">
                    {liveOrderToView.purchaseOrderId ? <RefreshCw className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    {liveOrderToView.purchaseOrderId ? 'ACTUALIZAR COMPRA ASOCIADA' : 'GENERAR ORDEN DE COMPRA POR FALTANTES'}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex justify-between items-center w-full">
              <div>
                {liveOrderToView?.purchaseOrderId && (
                  <Button variant="link" className="text-xs font-black text-emerald-700 gap-1.5 p-0 h-auto" onClick={() => { 
                    const po = purchaseOrders?.find(p => p.id === liveOrderToView.purchaseOrderId);
                    if (po) { setPurchaseOrderToView(po); setOrderToView(null); setActiveTab("purchases"); }
                  }}>
                    <ExternalLink className="h-3 w-3" /> VER ORDEN DE COMPRA #{liveOrderToView.purchaseOrderId.slice(0,4).toUpperCase()}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleCloseOrderView} className="font-bold">Cerrar</Button>
                {liveOrderToView?.status === 'ready' && (
                  <Button onClick={handleAssembleFinal} className="bg-blue-600 hover:bg-blue-700 px-8 font-black shadow-lg h-12 uppercase tracking-widest"><Hammer className="mr-2 h-5 w-5" /> FINALIZAR ARMADO</Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[95vh] overflow-hidden w-[95vw] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0 bg-white z-10">
            <div className="flex justify-between items-center pr-8">
              <div className="flex items-center gap-4">
                {editHistory.length > 0 && <Button variant="ghost" size="icon" onClick={handleGoBackInHistory} className="h-10 w-10 text-primary"><ChevronLeft className="h-6 w-6" /></Button>}
                <div>
                  <DialogTitle className="text-2xl font-black font-headline text-primary flex items-center gap-2">{editingItemId ? 'Configurar Ítem' : 'Nuevo Ítem'}</DialogTitle>
                  <DialogDescription>Gestión unificada de precios y estructura de armado.</DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div id="config-item-scroll" className="flex-1 overflow-y-auto p-6 space-y-8">
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b-2 pb-2"><Tag className="h-4 w-4 text-primary" /><h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Datos Básicos</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="font-bold">Nombre del Producto / Servicio</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Dosificador G4" className="h-11" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="font-bold">Categoría</Label><Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}><SelectTrigger className="h-11"><SelectValue placeholder="Elegir..." /></SelectTrigger><SelectContent className="max-h-60">{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="font-bold">Proveedor Defecto</Label><Select value={formData.supplier} onValueChange={(v) => setFormData({...formData, supplier: v})}><SelectTrigger className="h-11"><SelectValue placeholder="Elegir..." /></SelectTrigger><SelectContent className="max-h-60"><SelectItem value="none">SIN PROVEEDOR</SelectItem>{sortedSuppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
              
              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border-t-4 border-primary relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Costo Proyectado Final</p>
                    <p className="text-5xl font-black text-white leading-none tracking-tighter font-mono">$ {currentEditingCosts.ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xl font-black text-emerald-400 font-mono mt-2">u$s {currentEditingCosts.usd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-l md:border-l-white/10 pl-0 md:pl-8">
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Mano de Obra (ARS)</p><p className="text-lg font-bold text-white">${totalLaborARS.toLocaleString()}</p></div>
                    <div><p className="text-[8px] font-bold text-slate-400 uppercase">Materiales (ARS)</p><p className="text-lg font-bold text-white">${(currentEditingCosts.ars - totalLaborARS).toLocaleString()}</p></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-blue-700 font-black text-xs uppercase">Venta ARS ($)</Label><Input type="number" value={formData.priceARS} onChange={(e) => setFormData({...formData, priceARS: Number(e.target.value)})} className="h-11 border-blue-200 font-bold" /></div>
                  <div className="space-y-2"><Label className="text-emerald-700 font-black text-xs uppercase">Venta USD (u$s)</Label><Input type="number" value={formData.priceUSD} onChange={(e) => setFormData({...formData, priceUSD: Number(e.target.value)})} className="h-11 border-emerald-200 font-bold" /></div>
                </div>
                {!formData.isCompuesto ? (
                  <div className="p-4 bg-muted/20 rounded-2xl border border-dashed flex items-center gap-4 shadow-inner">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase">Costo Reposición</Label>
                      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{formData.costCurrency === 'USD' ? 'u$s' : '$'}</span><Input type="number" value={formData.costAmount} onChange={(e) => setFormData({...formData, costAmount: Number(e.target.value)})} className="pl-8 font-black h-11" /></div>
                    </div>
                    <Tabs value={formData.costCurrency} onValueChange={(v: any) => setFormData({...formData, costCurrency: v})} className="shrink-0 pt-4">
                      <TabsList className="grid grid-cols-2 w-28 h-11 p-1 border"><TabsTrigger value="ARS" className="text-[10px] font-black data-[state=active]:bg-primary data-[state=active]:text-white">ARS</TabsTrigger><TabsTrigger value="USD" className="text-[10px] font-black data-[state=active]:bg-emerald-600 data-[state=active]:text-white">USD</TabsTrigger></TabsList>
                    </Tabs>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-inner">
                    <div className="space-y-2"><Label className="text-[10px] font-black text-amber-800 uppercase">Mano Obra ARS</Label><Input type="number" value={formData.laborCostARS} onChange={(e) => setFormData({...formData, laborCostARS: Number(e.target.value)})} className="h-11 border-amber-200 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black text-amber-800 uppercase">Mano Obra USD</Label><Input type="number" value={formData.laborCostUSD} onChange={(e) => setFormData({...formData, laborCostUSD: Number(e.target.value)})} className="h-11 border-amber-200 font-bold" /></div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 p-4 border rounded-2xl bg-white shadow-sm flex-1 min-w-[200px]"><Switch checked={formData.isService} onCheckedChange={(v) => { setFormData({...formData, isService: v, trackStock: !v && formData.trackStock, isCompuesto: v ? false : formData.isCompuesto}); }} /><div><Label className="font-bold">Es un servicio</Label></div></div>
                {!formData.isService && <div className="flex items-center gap-3 p-4 border rounded-2xl bg-amber-50/50 border-amber-200 shadow-sm flex-1 min-w-[200px]"><Switch checked={formData.isCompuesto} onCheckedChange={(v) => { setFormData({...formData, isCompuesto: v, trackStock: v ? true : formData.trackStock}); }} /><div><Label className="font-bold text-amber-800">Producto compuesto</Label></div></div>}
                {!formData.isService && formData.trackStock && <div className="flex gap-4 flex-1 min-w-[200px]"><div className="space-y-1 flex-1"><Label className="font-bold text-xs uppercase text-muted-foreground">Stock Actual</Label><Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="h-11 font-black" /></div><div className="space-y-1 flex-1"><Label className="font-bold text-rose-600 text-xs uppercase">Mínimo Crítico</Label><Input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} className="h-11 border-rose-200 font-black" /></div></div>}
              </div>
            </section>
            
            {formData.isCompuesto && (
              <section className="space-y-6 pt-8 border-t-2">
                <div className="flex items-center justify-between border-b-2 pb-2"><h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4" /> Estructura de Armado (BOM)</h3><Badge className="bg-amber-600 font-black px-3 py-1 shadow-lg">{formData.components.length} PIEZAS ACTIVAS</Badge></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-muted/10 rounded-2xl border border-dashed border-primary/20">
                  <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Categoría</Label><Select value={bomFilterCategory} onValueChange={setBomFilterCategory}><SelectTrigger className="h-11 bg-white shadow-sm"><SelectValue placeholder="Ver todas..." /></SelectTrigger><SelectContent className="max-h-60">{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}<SelectItem value="all">TODAS LAS CATEGORÍAS</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-primary">Agregar Componente</Label><Select onValueChange={addComponent}><SelectTrigger className="h-11 bg-white border-primary/30 shadow-md ring-2 ring-primary/5"><SelectValue placeholder="Seleccionar parte para agregar..." /></SelectTrigger><SelectContent className="max-h-60">{items?.filter(i => i.id !== editingItemId && !i.isService && (bomFilterCategory === "all" || i.categoryId === bomFilterCategory)).map(i => (<SelectItem key={i.id} value={i.id} className="font-bold">{i.name}</SelectItem>))}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-1 gap-3 pb-24">
                  {sortedAddedComponents.map((comp) => { 
                    const product = items?.find(i => i.id === comp.productId); if (!product) return null;
                    const costData = calculateCost(product, items!, currentRate);
                    const isBaseUSD = product.costCurrency === 'USD' || (!product.costCurrency && product.costUSD > 0);
                    const baseSymbol = isBaseUSD ? 'u$s' : '$';
                    const baseAmount = isBaseUSD ? product.costUSD : product.costARS;
                    const convSymbol = isBaseUSD ? '$' : 'u$s';
                    const convAmount = isBaseUSD ? (product.costUSD * currentRate) : (product.costARS / currentRate);

                    return (
                      <div key={`${comp.productId}-${comp.originalIndex}`} className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl border bg-white hover:border-primary/40 transition-all shadow-sm hover:shadow-md group">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-black text-slate-800 leading-tight truncate">{product.name}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className={cn("flex flex-col px-3 py-1 rounded-xl border-2", isBaseUSD ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-blue-700 bg-blue-50 border-blue-100")}>
                              <span className="text-[8px] font-black uppercase opacity-60">Costo Base</span>
                              <span className="text-xs font-black">{baseSymbol} {baseAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col px-3 py-1 rounded-xl border-2 bg-slate-50 text-slate-600 border-slate-100">
                              <span className="text-[8px] font-black uppercase opacity-60">Referencia</span>
                              <span className="text-xs font-bold">{convSymbol} {convAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0">
                          <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-xl border shadow-inner"><Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Cant:</Label><input type="number" value={comp.quantity} onChange={(e) => updateComponentQty(comp.originalIndex, Number(e.target.value))} className="w-14 text-lg font-black text-center bg-transparent focus:outline-none" /></div>
                          <div className="text-right min-w-[140px]"><p className="text-[9px] font-black uppercase text-slate-400">Subtotal Línea</p><p className="text-lg font-black text-blue-700 leading-tight">$ {(costData.ars * comp.quantity).toLocaleString()}</p><p className="text-sm font-black text-emerald-700">u$s {(costData.usd * comp.quantity).toLocaleString()}</p></div>
                          <div className="flex gap-1 shrink-0"><Button variant="ghost" size="icon" className="h-11 w-11 text-primary rounded-full" onClick={() => handleJumpToComponent(comp.productId)}><ChevronRight className="h-5 w-5" /></Button><Button variant="ghost" size="icon" className="h-11 w-11 text-destructive hover:bg-rose-50 rounded-full" onClick={() => removeComponent(comp.originalIndex)}><Trash2 className="h-5 w-5" /></Button></div>
                        </div>
                      </div>
                    ); 
                  })}
                </div>
              </section>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-white shrink-0 z-10"><div className="flex gap-3 w-full justify-end"><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12 px-8 font-bold flex-1 md:flex-none">Cancelar</Button><Button onClick={handleSave} className="h-12 px-12 font-black shadow-2xl uppercase tracking-widest flex-1 md:flex-none"><CheckCircle2 className="mr-2 h-5 w-5" /> {editHistory.length > 0 ? 'GUARDAR Y VOLVER' : 'GUARDAR ÍTEM'}</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupplierManagerOpen} onOpenChange={setIsSupplierManagerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Gestionar Proveedores</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-xl border border-dashed">
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Nombre</Label><Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="Ej: Aceros S.A." className="h-10 bg-white" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Teléfono</Label><Input value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} placeholder="Ej: 11 5555-5555" className="h-10 bg-white" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Dirección</Label><div className="flex gap-2"><Input value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} placeholder="Ej: Av. Rivadavia 123" className="h-10 bg-white" /><Button onClick={handleSaveSupplier} className="h-10 px-3"><Plus className="h-4 w-4" /></Button></div></div>
            </div>
            <ScrollArea className="h-[350px] border rounded-2xl p-4 bg-white shadow-inner">
              <div className="space-y-2">
                {sortedSuppliers.map((sup: any) => (
                  <div key={sup.id} className="flex justify-between items-center p-3 rounded-xl border hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg"><Briefcase className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-none">{sup.name}</p>
                        {sup.phone && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {sup.phone}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => { setSelectedSupplierForHistory(sup.name); setIsSupplierHistoryOpen(true); }} title="Ver Historial de Compras"><History className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-rose-50" onClick={() => handleDeleteSupplier(sup.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(o) => { if(!o) setOrderToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar orden de producción?</AlertDialogTitle><AlertDialogDescription>Esta acción borrará la planificación de esta orden. No afectará el stock actual.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive text-white">Eliminar Orden</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <AlertDialog open={!!purchaseOrderToDelete} onOpenChange={(o) => { if(!o) setPurchaseOrderToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar orden de reposición?</AlertDialogTitle><AlertDialogDescription>Esta acción borrará la lista de compra manual.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeletePurchaseOrder} className="bg-destructive text-white">Eliminar Orden</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={!!orderToFinalize} onOpenChange={(o) => !o && setOrderToFinalize(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar finalización de armado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se descontarán los insumos inteligentemente del inventario y se sumarán {orderToFinalize?.quantity} unidades a "{orderToFinalize?.productName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinalize} className="bg-blue-600">Confirmar y Descontar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>Tienes cambios en la planificación que no han sido guardados. Si cierras ahora, se perderán.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsExitAlertOpen(false)}>Seguir Editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setIsExitAlertOpen(false); setOrderToView(null); setPurchaseOrderToView(null); }} className="bg-destructive">Cerrar de todas formas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />

      {/* VISTA DE IMPRESIÓN (PDF) - FICHA TÉCNICA A4 */}
      {itemToPrint && (
        <div className="print-only w-full p-8 bg-white text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Ficha Técnica de Producto</h1>
              <p className="text-lg font-bold text-slate-600">{itemToPrint.name}</p>
              <Badge variant="outline" className="border-2 border-slate-900 font-black uppercase text-[10px]">{categoryMap[itemToPrint.categoryId] || 'Sin Categoría'}</Badge>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 border-4 border-slate-900 rounded-3xl bg-slate-50 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-2">Estructura de Costo Final</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Total Producción (ARS)</p>
                  <p className="text-3xl font-black text-slate-900">$ {Math.round(itemToPrint.calculatedCostARS).toLocaleString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Total Producción (USD)</p>
                  <p className="text-3xl font-black text-emerald-700">u$s {itemToPrint.calculatedCostUSD.toFixed(2).toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Materiales (ARS)</p>
                  <p className="text-sm font-bold">$ {Math.round(itemToPrint.calculatedCostARS - ((itemToPrint.laborCostARS || 0) + (itemToPrint.laborCostUSD || 0) * currentRate)).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Mano de Obra (ARS)</p>
                  <p className="text-sm font-bold">$ {Math.round((itemToPrint.laborCostARS || 0) + (itemToPrint.laborCostUSD || 0) * currentRate).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-4 border-primary rounded-3xl bg-primary/5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-2">Precios de Venta Sugeridos</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase text-primary/60">PVP Pesos (ARS)</p>
                  <p className="text-3xl font-black text-primary">$ {(itemToPrint.priceARS || 0).toLocaleString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-primary/60">PVP Dólares (USD)</p>
                  <p className="text-3xl font-black text-primary">u$s {(itemToPrint.priceUSD || 0).toLocaleString('es-AR')}</p>
                </div>
              </div>
              {itemToPrint.priceARS > 0 && (
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-[10px] font-black text-primary">MARGEN BRUTO PROYECTADO: {Math.round(((itemToPrint.priceARS - itemToPrint.calculatedCostARS) / itemToPrint.priceARS) * 100)}%</p>
                </div>
              )}
            </div>
          </div>

          {itemToPrint.isCompuesto && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-gap-2">
                <Layers className="h-4 w-4" /> Detalle de Componentes (BOM)
              </h2>
              <div className="border-2 border-slate-900 rounded-2xl overflow-hidden">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 text-left uppercase font-black">Material / Componente</th>
                      <th className="p-2 text-center uppercase font-black w-16">Cant.</th>
                      <th className="p-2 text-right uppercase font-black">Costo Unit. Base</th>
                      <th className="p-2 text-right uppercase font-black">Costo Unit. Ref</th>
                      <th className="p-2 text-right uppercase font-black">Subtotal Línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itemToPrint.components || []).map((comp: any, idx: number) => {
                      const prod = items?.find(i => i.id === comp.productId);
                      if (!prod) return null;
                      const isUSD = prod.costCurrency === 'USD' || (!prod.costCurrency && prod.costUSD > 0);
                      const basePrice = isUSD ? prod.costUSD : prod.costARS;
                      const refPrice = isUSD ? (prod.costUSD * currentRate) : (prod.costARS / currentRate);
                      const subtotal = basePrice * comp.quantity;
                      
                      return (
                        <tr key={idx} className="border-b border-slate-200 h-8">
                          <td className="p-2 font-bold">{prod.name}</td>
                          <td className="p-2 text-center font-black">{comp.quantity}</td>
                          <td className="p-2 text-right">{isUSD ? 'u$s' : '$'} {basePrice.toLocaleString()}</td>
                          <td className="p-2 text-right text-slate-400 italic">{!isUSD ? 'u$s' : '$'} {refPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="p-2 text-right font-black">{isUSD ? 'u$s' : '$'} {subtotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {itemToPrint.description && (
            <div className="mt-8 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl italic text-xs">
              <p className="font-black uppercase text-[8px] text-slate-400 mb-1">Notas Técnicas</p>
              "{itemToPrint.description}"
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end italic text-[9px] text-slate-400">
            <p>Este documento es una ficha de costos internos generada por Dosimat Pro. Prohibida su difusión externa.</p>
            <p>Página 1 de 1</p>
          </div>
        </div>
      )}

      {/* VISTA DE IMPRESIÓN (PDF) - ORDEN DE PRODUCCIÓN */}
      {orderToPrint && (
        <div className="print-only w-full p-8 bg-white text-slate-900 font-sans">
          <div className="flex justify-between items-start border-b-4 border-amber-600 pb-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Plan de Producción / Armado</h1>
              <p className="text-lg font-bold text-slate-600">ID Orden: #{orderToPrint.id.toUpperCase().slice(0, 8)}</p>
              <Badge variant="outline" className="border-2 border-amber-600 text-amber-700 font-black uppercase text-[10px]">Estado: {orderToPrint.status}</Badge>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400">Dosimat Pro System</p>
              <p className="text-sm font-bold">Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="p-6 border-4 border-slate-900 rounded-3xl bg-slate-50 space-y-2">
              <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Producto a Fabricar</h2>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="text-3xl font-black text-slate-900 leading-tight">{orderToPrint.productName}</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">Fecha de creación del plan: {new Date(orderToPrint.createdAt).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="bg-white border-2 border-slate-900 p-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Cant. a Armar</span>
                  <span className="text-5xl font-black">{orderToPrint.quantity}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Unidades Finales</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Explosión de Materiales e Insumos Necesarios
            </h2>
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 text-left uppercase font-black">Insumo / Componente</th>
                    <th className="p-2 text-center uppercase font-black w-24">Cant. Necesaria</th>
                    <th className="p-2 text-center uppercase font-black w-24">En Stock</th>
                    <th className="p-2 text-center uppercase font-black w-24">Check Picking</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const target = items?.find(i => i.id === orderToPrint.productId);
                    if (!target || !items) return null;
                    
                    const requirements: Record<string, {name: string, qty: number, stock: number}> = {};
                    
                    // Simple flat requirements for the worker's checklist
                    target.components?.forEach((c: any) => {
                      const child = items.find(i => i.id === c.productId);
                      if (child) {
                        requirements[c.productId] = {
                          name: child.name,
                          qty: c.quantity * orderToPrint.quantity,
                          stock: child.stock || 0
                        };
                      }
                    });

                    return Object.values(requirements).map((req, idx) => (
                      <tr key={idx} className="border-b border-slate-200 h-12">
                        <td className="p-2 font-bold text-sm">{req.name}</td>
                        <td className="p-2 text-center font-black text-lg">{req.qty}</td>
                        <td className="p-2 text-center font-bold text-slate-400">{req.stock}</td>
                        <td className="p-2 text-center">
                          <div className="w-6 h-6 border-2 border-slate-300 rounded-md mx-auto"></div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-12">
            <div className="border-t-2 border-slate-300 pt-2 h-20">
              <p className="text-[8px] font-black uppercase text-slate-400">Operario Responsable (Firma)</p>
            </div>
            <div className="border-t-2 border-slate-300 pt-2 text-right h-20">
              <p className="text-[8px] font-black uppercase text-slate-400">Control de Calidad Final (Firma y Sello)</p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end italic text-[9px] text-slate-400">
            <p>Este documento es una orden de trabajo interna generada por el sistema Dosimat Pro. Prohibida su difusión externa.</p>
            <p>Página 1 de 1</p>
          </div>
        </div>
      )}
    </div>
  )

  function addComponent(productId: string) {
    if (formData.components.some(c => c.productId === productId)) return;
    setFormData(prev => ({ ...prev, components: [...prev.components, { productId, quantity: 1 }] }));
  }

  function removeComponent(idx: number) {
    setFormData(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== idx) }));
  }

  function updateComponentQty(idx: number, qty: number) {
    const newComps = [...formData.components];
    newComps[idx].quantity = qty;
    setFormData(prev => ({ ...prev, components: newComps }));
  }

  function confirmDeleteOrder() {
    if (!orderToDelete) return
    deleteDocumentNonBlocking(doc(db, 'production_orders', orderToDelete.id))
    setOrderToDelete(null)
    toast({ title: "Orden eliminada" })
  }

  function confirmDeletePurchaseOrder() {
    if (!purchaseOrderToDelete) return
    deleteDocumentNonBlocking(doc(db, 'purchase_orders', purchaseOrderToDelete.id))
    setPurchaseOrderToDelete(null)
    toast({ title: "Orden de compra eliminada" })
  }
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
