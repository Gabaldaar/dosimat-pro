"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/nav"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc, addDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { 
  ReceiptText, 
  Plus, 
  Search, 
  Printer, 
  Send, 
  MessageSquare, 
  Trash2, 
  Edit, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Coins, 
  DollarSign, 
  Check, 
  Sparkles, 
  Droplets,
  ArrowUpRight,
  ArrowRightLeft,
  Tag,
  Package,
  Boxes,
  HelpCircle,
  RefreshCw,
  MoreVertical
} from "lucide-react"

export interface QuoteItem {
  id: string
  productId?: string
  name: string
  description?: string
  qty: number
  unitPrice: number
  discount: number // porcentaje 0-100
  subtotal: number
  isCustom?: boolean
  originalPrice?: number
  originalCurrency?: 'ARS' | 'USD'
}

export interface Quote {
  id?: string
  quoteNumber: string
  date: string
  validUntil: string
  clientId: string | null
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  isProspect: boolean
  currency: 'ARS' | 'USD'
  exchangeRate: number
  rateType: 'official' | 'blue' | 'custom'
  items: QuoteItem[]
  subtotal: number
  globalDiscountPercent: number
  globalDiscountAmount: number
  total: number
  notes: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
  convertedTransactionId?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Borrador", color: "bg-slate-100 text-slate-700 border-slate-300", icon: Clock },
  sent: { label: "Enviada", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Send },
  approved: { label: "Aprobada", color: "bg-emerald-50 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  converted: { label: "Convertida a Venta", color: "bg-purple-50 text-purple-700 border-purple-300", icon: ArrowUpRight },
  rejected: { label: "Rechazada", color: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
}

export default function QuotesPage() {
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const { userData, isUserLoading } = useUser()

  const isStaff = useMemo(() => {
    return userData && ['Admin', 'Employee', 'Collaborator', 'Communicator'].includes(userData.role)
  }, [userData])

  // Redirección si no es staff
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      } else if (userData.role === 'Client') {
        router.replace('/portal')
      }
    }
  }, [userData, isUserLoading, router])

  // Obtener cotizaciones del Dólar en vivo
  const [exchangeRates, setExchangeRates] = useState<{ official: number; blue: number }>({ official: 1300, blue: 1350 })

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [offRes, blueRes] = await Promise.all([
          fetch('https://dolarapi.com/v1/dolares/oficial'),
          fetch('https://dolarapi.com/v1/dolares/blue')
        ])
        const off = await offRes.json()
        const blue = await blueRes.json()
        if (off?.venta && blue?.venta) {
          setExchangeRates({ official: Number(off.venta), blue: Number(blue.venta) })
        }
      } catch (e) {
        console.error("Error fetching exchange rates:", e)
      }
    }
    fetchRates()
  }, [])

  // Consultas Firestore
  const quotesQuery = useMemoFirebase(() => {
    if (!isStaff) return null
    return query(collection(db, 'quotes'), orderBy('date', 'desc'))
  }, [db, isStaff])

  const clientsQuery = useMemoFirebase(() => isStaff ? collection(db, 'clients') : null, [db, isStaff])
  const productsQuery = useMemoFirebase(() => isStaff ? collection(db, 'products_services') : null, [db, isStaff])
  const categoriesQuery = useMemoFirebase(() => isStaff ? collection(db, 'product_categories') : null, [db, isStaff])
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'company'), [db])

  const { data: quotes, isLoading: loadingQuotes } = useCollection(quotesQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: products } = useCollection(productsQuery)
  const { data: categories } = useCollection(categoriesQuery)
  const { data: settings } = useDoc(settingsRef)

  // Filtros de búsqueda en listado
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currencyFilter, setCurrencyFilter] = useState("all")

  // Estado del Modal de Creación / Edición
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Buscador de Catálogo (Popover)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all")
  const [isCatalogPopoverOpen, setIsCatalogPopoverOpen] = useState(false)

  // Estado del Modal de Vista Previa / Impresión
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Estado de Confirmación de Borrado
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)

  // Estado de Conversión a Venta
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  // Formulario de Cotización
  const [formData, setFormData] = useState<Quote>({
    quoteNumber: "",
    date: new Date().toISOString().split('T')[0],
    validUntil: "",
    clientId: null,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    isProspect: false,
    currency: 'ARS',
    exchangeRate: 1350,
    rateType: 'blue',
    items: [],
    subtotal: 0,
    globalDiscountPercent: 0,
    globalDiscountAmount: 0,
    total: 0,
    notes: "",
    status: 'draft',
  })

  // Generar siguiente número correlativo de cotización
  const getNextQuoteNumber = () => {
    if (!quotes || quotes.length === 0) return "COT-0001"
    let maxNum = 0
    quotes.forEach(q => {
      if (q.quoteNumber && q.quoteNumber.startsWith("COT-")) {
        const numPart = parseInt(q.quoteNumber.replace("COT-", ""), 10)
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart
        }
      }
    })
    return `COT-${String(maxNum + 1).padStart(4, '0')}`
  }

  // Establecer fecha de validez por defecto (15 días)
  const calculateDefaultValidity = (startDateStr: string, days = 15) => {
    const d = new Date(startDateStr || new Date())
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  // Helper para resolver el precio de un producto y convertirlo si es necesario
  const resolveProductPrice = (prod: any, targetCurrency: 'ARS' | 'USD', rate: number) => {
    const validRate = Number(rate) > 0 ? Number(rate) : 1350
    const rawPriceARS = Number(prod.priceARS ?? prod.price ?? 0)
    const rawPriceUSD = Number(prod.priceUSD ?? 0)
    const rawCostARS = Number(prod.costARS ?? 0)
    const rawCostUSD = Number(prod.costUSD ?? 0)

    if (targetCurrency === 'ARS') {
      if (rawPriceARS > 0) return { price: rawPriceARS, originalCurrency: 'ARS' as const, originalPrice: rawPriceARS }
      if (rawPriceUSD > 0) return { price: Math.round(rawPriceUSD * validRate), originalCurrency: 'USD' as const, originalPrice: rawPriceUSD }
      if (rawCostARS > 0) return { price: rawCostARS, originalCurrency: 'ARS' as const, originalPrice: rawCostARS }
      if (rawCostUSD > 0) return { price: Math.round(rawCostUSD * validRate), originalCurrency: 'USD' as const, originalPrice: rawCostUSD }
      return { price: 0, originalCurrency: 'ARS' as const, originalPrice: 0 }
    } else {
      if (rawPriceUSD > 0) return { price: rawPriceUSD, originalCurrency: 'USD' as const, originalPrice: rawPriceUSD }
      if (rawPriceARS > 0) return { price: Math.round((rawPriceARS / validRate) * 100) / 100, originalCurrency: 'ARS' as const, originalPrice: rawPriceARS }
      if (rawCostUSD > 0) return { price: rawCostUSD, originalCurrency: 'USD' as const, originalPrice: rawCostUSD }
      if (rawCostARS > 0) return { price: Math.round((rawCostARS / validRate) * 100) / 100, originalCurrency: 'ARS' as const, originalPrice: rawCostARS }
      return { price: 0, originalCurrency: 'USD' as const, originalPrice: 0 }
    }
  }

  // Lista ordenada y filtrada de productos del catálogo para el buscador rápido
  const sortedAndFilteredCatalog = useMemo(() => {
    if (!products) return []
    return [...products]
      .filter((p: any) => {
        const name = (p.name || "").toLowerCase()
        const cat = p.categoryId || "uncategorized"
        const matchText = !catalogSearch || name.includes(catalogSearch.toLowerCase())
        const matchCategory = catalogCategoryFilter === "all" || cat === catalogCategoryFilter
        return matchText && matchCategory
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [products, catalogSearch, catalogCategoryFilter])

  // Abrir modal para nueva cotización
  const handleOpenNewQuote = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const initialRate = exchangeRates.blue || 1350
    setEditingQuoteId(null)
    setCatalogSearch("")
    setCatalogCategoryFilter("all")
    setFormData({
      quoteNumber: getNextQuoteNumber(),
      date: todayStr,
      validUntil: calculateDefaultValidity(todayStr, 15),
      clientId: null,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      isProspect: false,
      currency: 'ARS',
      exchangeRate: initialRate,
      rateType: 'blue',
      items: [],
      subtotal: 0,
      globalDiscountPercent: 0,
      globalDiscountAmount: 0,
      total: 0,
      notes: "• Validez de la oferta: 15 días a partir de la fecha de emisión.\n• Forma de pago: 50% de anticipo al confirmar, saldo contra entrega o instalación.\n• Precios con IVA incluido. Garantía oficial Dosimat por 6 meses.",
      status: 'draft',
    })
    setIsDialogOpen(true)
  }

  // Abrir modal para editar cotización existente
  const handleEditQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id || null)
    setCatalogSearch("")
    setCatalogCategoryFilter("all")
    setFormData({
      ...quote,
      exchangeRate: quote.exchangeRate || exchangeRates.blue || 1350,
      rateType: quote.rateType || 'blue',
      items: quote.items || []
    })
    setIsDialogOpen(true)
  }

  // Duplicar cotización
  const handleDuplicateQuote = (quote: Quote) => {
    const todayStr = new Date().toISOString().split('T')[0]
    setEditingQuoteId(null)
    setFormData({
      ...quote,
      quoteNumber: getNextQuoteNumber(),
      date: todayStr,
      validUntil: calculateDefaultValidity(todayStr, 15),
      status: 'draft',
      convertedTransactionId: undefined,
    })
    setIsDialogOpen(true)
    toast({ title: "Cotización duplicada", description: "Se ha creado una copia lista para editar y guardar." })
  }

  // Manejo de Cliente
  const handleClientSelect = (clientId: string) => {
    if (clientId === "prospect") {
      setFormData(prev => ({
        ...prev,
        clientId: null,
        isProspect: true,
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: ""
      }))
      return
    }

    const selected = clients?.find(c => c.id === clientId)
    if (selected) {
      setFormData(prev => ({
        ...prev,
        clientId: selected.id,
        isProspect: false,
        clientName: `${selected.apellido || ""}, ${selected.nombre || ""}`.trim() || selected.nombre || "",
        clientEmail: selected.mail || "",
        clientPhone: selected.telefono || "",
        clientAddress: selected.direccion || selected.zona || ""
      }))
    }
  }

  // Recalcular Subtotales y Total
  const recalculateTotals = (items: QuoteItem[], globalDiscountPct: number) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)
    const globalDiscountAmount = (subtotal * (Number(globalDiscountPct) || 0)) / 100
    const total = Math.max(0, subtotal - globalDiscountAmount)
    return { subtotal, globalDiscountAmount, total }
  }

  // Cambiar Moneda y Opcionalmente Convertir Ítems Existentes
  const handleChangeCurrency = (newCurrency: 'ARS' | 'USD') => {
    if (newCurrency === formData.currency) return
    const rate = Number(formData.exchangeRate) > 0 ? Number(formData.exchangeRate) : 1350

    // Convertir los ítems existentes en la cotización
    const convertedItems = formData.items.map(item => {
      let newUnitPrice = 0
      if (newCurrency === 'USD') {
        // De ARS a USD
        newUnitPrice = Math.round((item.unitPrice / rate) * 100) / 100
      } else {
        // De USD a ARS
        newUnitPrice = Math.round(item.unitPrice * rate)
      }
      const qty = Number(item.qty) || 0
      const discount = Number(item.discount) || 0
      const subtotal = qty * newUnitPrice * (1 - discount / 100)

      return {
        ...item,
        unitPrice: newUnitPrice,
        subtotal
      }
    })

    const { subtotal, globalDiscountAmount, total } = recalculateTotals(convertedItems, formData.globalDiscountPercent)

    setFormData(prev => ({
      ...prev,
      currency: newCurrency,
      items: convertedItems,
      subtotal,
      globalDiscountAmount,
      total
    }))

    toast({ 
      title: `Cambiado a ${newCurrency === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}`,
      description: `Los precios de los artículos se convirtieron según el tipo de cambio ($${rate.toLocaleString('es-AR')}).`
    })
  }

  // Cambiar Tipo de Dólar
  const handleRateTypeChange = (type: 'official' | 'blue' | 'custom', customValue?: number) => {
    let rate = formData.exchangeRate
    if (type === 'official') rate = exchangeRates.official || 1300
    else if (type === 'blue') rate = exchangeRates.blue || 1350
    else if (type === 'custom' && customValue !== undefined) rate = customValue

    setFormData(prev => ({
      ...prev,
      rateType: type,
      exchangeRate: rate
    }))
  }

  // Agregar producto desde catálogo con precio resuelto
  const handleAddCatalogProduct = (prod: any) => {
    if (!prod) return
    const rate = Number(formData.exchangeRate) > 0 ? Number(formData.exchangeRate) : 1350
    const { price, originalCurrency, originalPrice } = resolveProductPrice(prod, formData.currency, rate)

    const newItem: QuoteItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      name: prod.name || "Producto sin nombre",
      description: prod.description || "",
      qty: 1,
      unitPrice: price,
      discount: 0,
      subtotal: price,
      isCustom: false,
      originalCurrency,
      originalPrice
    }

    const updatedItems = [...formData.items, newItem]
    const { subtotal, globalDiscountAmount, total } = recalculateTotals(updatedItems, formData.globalDiscountPercent)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      globalDiscountAmount,
      total
    }))

    setIsCatalogPopoverOpen(false)
    toast({ title: "Artículo agregado", description: `Se añadió "${prod.name}" a la cotización.` })
  }

  // Agregar ítem manual libre
  const handleAddCustomItem = () => {
    const newItem: QuoteItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: "",
      description: "",
      qty: 1,
      unitPrice: 0,
      discount: 0,
      subtotal: 0,
      isCustom: true
    }

    const updatedItems = [...formData.items, newItem]
    const { subtotal, globalDiscountAmount, total } = recalculateTotals(updatedItems, formData.globalDiscountPercent)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      globalDiscountAmount,
      total
    }))
  }

  // Modificar campo de un ítem
  const handleUpdateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updatedItems = [...formData.items]
    const current = { ...updatedItems[index], [field]: value }

    // Calcular subtotal de línea
    const qty = Number(current.qty) || 0
    const unitPrice = Number(current.unitPrice) || 0
    const discount = Math.min(100, Math.max(0, Number(current.discount) || 0))
    current.subtotal = qty * unitPrice * (1 - discount / 100)

    updatedItems[index] = current
    const { subtotal, globalDiscountAmount, total } = recalculateTotals(updatedItems, formData.globalDiscountPercent)

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      globalDiscountAmount,
      total
    }))
  }

  // Eliminar ítem
  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    const { subtotal, globalDiscountAmount, total } = recalculateTotals(updatedItems, formData.globalDiscountPercent)
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      globalDiscountAmount,
      total
    }))
  }

  // Modificar Descuento Global
  const handleGlobalDiscountChange = (pct: number) => {
    const discountPct = Math.min(100, Math.max(0, pct || 0))
    const { subtotal, globalDiscountAmount, total } = recalculateTotals(formData.items, discountPct)
    setFormData(prev => ({
      ...prev,
      globalDiscountPercent: discountPct,
      globalDiscountAmount,
      total
    }))
  }

  // Insertar Notas predefinidas
  const handleAppendNotePreset = (presetText: string) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n${presetText}` : presetText
    }))
  }

  // Guardar Cotización (Crear o Actualizar)
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientName.trim()) {
      toast({ title: "Cliente requerido", description: "Por favor selecciona o ingresa el nombre del cliente.", variant: "destructive" })
      return
    }

    if (formData.items.length === 0) {
      toast({ title: "Ítems requeridos", description: "Agrega al menos un producto o servicio a la cotización.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const quotePayload = {
        ...formData,
        updatedAt: new Date().toISOString(),
        createdBy: userData?.email || "Staff"
      }

      if (editingQuoteId) {
        await setDoc(doc(db, 'quotes', editingQuoteId), quotePayload, { merge: true })
        toast({ title: "Cotización actualizada", description: `Se guardaron los cambios de ${formData.quoteNumber}.` })
      } else {
        await addDoc(collection(db, 'quotes'), {
          ...quotePayload,
          createdAt: new Date().toISOString()
        })
        toast({ title: "Cotización creada", description: `Presupuesto ${formData.quoteNumber} guardado con éxito.` })
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving quote:", error)
      toast({ title: "Error", description: "No se pudo guardar la cotización.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Cambiar estado rápido
  const handleUpdateStatus = async (quote: Quote, newStatus: Quote['status']) => {
    if (!quote.id) return
    try {
      await setDoc(doc(db, 'quotes', quote.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Estado actualizado", description: `La cotización ${quote.quoteNumber} ahora está en estado "${statusConfig[newStatus]?.label}".` })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" })
    }
  }

  // Eliminar cotización
  const handleDeleteQuote = async () => {
    if (!quoteToDelete?.id) return
    try {
      await deleteDoc(doc(db, 'quotes', quoteToDelete.id))
      toast({ title: "Cotización eliminada", description: `Se eliminó el presupuesto ${quoteToDelete.quoteNumber}.` })
      setQuoteToDelete(null)
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la cotización.", variant: "destructive" })
    }
  }

  // Convertir Cotización a Venta / Operación
  const handleConfirmConversion = async () => {
    if (!quoteToConvert || !quoteToConvert.id) return
    setIsConverting(true)
    try {
      const txData = {
        type: 'sale',
        clientId: quoteToConvert.clientId || null,
        clientName: quoteToConvert.clientName,
        date: new Date().toISOString(),
        amount: quoteToConvert.total,
        currency: quoteToConvert.currency,
        items: quoteToConvert.items.map(it => ({
          name: it.name,
          qty: it.qty,
          price: it.unitPrice,
          discount: it.discount,
          subtotal: it.subtotal
        })),
        notes: `Generado desde Cotización ${quoteToConvert.quoteNumber}. ${quoteToConvert.notes ? `Notas: ${quoteToConvert.notes}` : ''}`,
        quoteId: quoteToConvert.id,
        quoteNumber: quoteToConvert.quoteNumber,
        status: 'completed',
        createdAt: new Date().toISOString()
      }

      const txRef = await addDoc(collection(db, 'transactions'), txData)

      await setDoc(doc(db, 'quotes', quoteToConvert.id), {
        status: 'converted',
        convertedTransactionId: txRef.id,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      toast({ 
        title: "¡Venta generada con éxito!", 
        description: `Se registró la operación en el módulo de Operaciones a partir de la cotización ${quoteToConvert.quoteNumber}.` 
      })
      setQuoteToConvert(null)
    } catch (error) {
      console.error("Error converting quote:", error)
      toast({ title: "Error", description: "No se pudo convertir la cotización a venta.", variant: "destructive" })
    } finally {
      setIsConverting(false)
    }
  }

  // Compartir por WhatsApp
  const handleShareWhatsApp = (quote: Quote) => {
    const phone = quote.clientPhone ? quote.clientPhone.replace(/\D/g, '') : ""
    const currencySym = quote.currency === 'USD' ? 'USD $' : '$'
    const itemsList = quote.items.map(it => `• ${it.qty}x ${it.name} (${currencySym}${it.unitPrice.toLocaleString('es-AR')})`).join('\n')
    
    const message = `Hola ${quote.clientName}, te adjuntamos el detalle del presupuesto *${quote.quoteNumber}* de *Dosimat*:\n\n` +
      `${itemsList}\n\n` +
      `*Total: ${currencySym}${quote.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}*\n` +
      `Validez de la oferta: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('es-AR') : '15 días'}.\n\n` +
      `Quedamos a tu entera disposición ante cualquier consulta.\n*Dosimat - La opción inteligente para su pileta*`

    const url = phone 
      ? `https://wa.me/${phone.startsWith('54') ? phone : `54${phone}`}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(url, '_blank')
  }

  // Imprimir
  const handlePrint = () => {
    window.print()
  }

  // Cotizaciones filtradas
  const filteredQuotes = useMemo(() => {
    if (!quotes) return []
    return quotes.filter(q => {
      const matchSearch = 
        !searchTerm || 
        q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'all' || q.status === statusFilter
      const matchCurrency = currencyFilter === 'all' || q.currency === currencyFilter

      return matchSearch && matchStatus && matchCurrency
    })
  }, [quotes, searchTerm, statusFilter, currencyFilter])

  // KPIs
  const kpis = useMemo(() => {
    if (!quotes) return { totalARS: 0, totalUSD: 0, activeCount: 0, approvedCount: 0, conversionRate: 0 }
    let totalARS = 0
    let totalUSD = 0
    let activeCount = 0
    let approvedCount = 0

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    quotes.forEach(q => {
      const qDate = new Date(q.date)
      if (qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear) {
        if (q.currency === 'USD') totalUSD += Number(q.total || 0)
        else totalARS += Number(q.total || 0)
      }

      if (['draft', 'sent'].includes(q.status)) activeCount++
      if (['approved', 'converted'].includes(q.status)) approvedCount++
    })

    const totalResolved = approvedCount + quotes.filter(q => q.status === 'rejected').length
    const conversionRate = totalResolved > 0 ? Math.round((approvedCount / totalResolved) * 100) : 0

    return { totalARS, totalUSD, activeCount, approvedCount, conversionRate }
  }, [quotes])

  if (isUserLoading || loadingQuotes) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        
        {/* Cabecera Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="flex" />
            <div className="flex items-center gap-2 md:hidden pr-2 border-r">
               <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                 <Droplets className="h-4 w-4 text-white" />
               </div>
               <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-headline font-bold text-primary flex items-center gap-2">
                <ReceiptText className="h-7 w-7 text-primary" />
                Cotizaciones y Presupuestos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Emite, gestiona y convierte presupuestos comerciales en ventas de forma profesional.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleOpenNewQuote} 
            className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl h-11 px-5 shadow-lg shadow-primary/20 flex items-center gap-2 shrink-0"
          >
            <Plus className="h-5 w-5" />
            Nueva Cotización
          </Button>
        </header>

        {/* Tarjetas de Métricas (KPIs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card shadow-sm border-l-4 border-l-blue-500 rounded-3xl">
            <CardContent className="p-4 md:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Cotizado este mes</p>
                <h3 className="text-lg md:text-2xl font-black text-slate-800 mt-1">
                  ${kpis.totalARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </h3>
                {kpis.totalUSD > 0 && (
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">
                    + USD ${kpis.totalUSD.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-sm border-l-4 border-l-amber-500 rounded-3xl">
            <CardContent className="p-4 md:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Activas / Enviadas</p>
                <h3 className="text-lg md:text-2xl font-black text-slate-800 mt-1">
                  {kpis.activeCount}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Esperando respuesta</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-sm border-l-4 border-l-emerald-500 rounded-3xl">
            <CardContent className="p-4 md:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Aprobadas / Ventas</p>
                <h3 className="text-lg md:text-2xl font-black text-emerald-700 mt-1">
                  {kpis.approvedCount}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Presupuestos cerrados</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-sm border-l-4 border-l-purple-500 rounded-3xl">
            <CardContent className="p-4 md:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Efectividad</p>
                <h3 className="text-lg md:text-2xl font-black text-purple-700 mt-1">
                  {kpis.conversionRate}%
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tasa de aprobación</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                <Sparkles className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Filtros */}
        <Card className="glass-card shadow-sm border rounded-3xl">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Buscar Cotización</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por N°, cliente, email o notas..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 bg-background border rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 bg-background border rounded-2xl">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="approved">Aprobada</SelectItem>
                    <SelectItem value="converted">Convertida a Venta</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Moneda</Label>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="h-11 bg-background border rounded-2xl">
                    <SelectValue placeholder="Todas las monedas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las monedas</SelectItem>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listado de Cotizaciones */}
        <Card className="glass-card shadow-md border rounded-3xl overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Historial de Cotizaciones</CardTitle>
              <CardDescription>Visualiza, exporta y gestiona los presupuestos comerciales.</CardDescription>
            </div>
            <Badge variant="secondary" className="font-bold">
              {filteredQuotes.length} presupuestos
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="pl-6 font-bold text-xs uppercase text-muted-foreground py-4">N° Cotización</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground py-4">Cliente</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground py-4">Fecha / Validez</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground py-4">Total</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground py-4">Estado</TableHead>
                    <TableHead className="pr-6 text-right font-bold text-xs uppercase text-muted-foreground py-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <ReceiptText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-bold text-base text-slate-600">No se encontraron cotizaciones</p>
                        <p className="text-xs text-slate-400 mt-1">Crea tu primera cotización presionando el botón "Nueva Cotización".</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote) => {
                      const status = statusConfig[quote.status] || statusConfig.draft
                      const StatusIcon = status.icon
                      const currencySym = quote.currency === 'USD' ? 'USD $' : '$'

                      return (
                        <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-primary tracking-tight">
                                {quote.quoteNumber}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                {quote.clientName}
                                {quote.isProspect && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50">
                                    Prospecto
                                  </Badge>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {quote.clientPhone || quote.clientEmail || quote.clientAddress || "Sin datos de contacto"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-col text-xs">
                              <span className="font-semibold text-slate-700">
                                {quote.date ? new Date(quote.date).toLocaleDateString('es-AR') : '-'}
                              </span>
                              {quote.validUntil && (
                                <span className="text-muted-foreground text-[11px]">
                                  Vence: {new Date(quote.validUntil).toLocaleDateString('es-AR')}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-base text-slate-900">
                                {currencySym}{Number(quote.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-semibold">
                                {quote.items?.length || 0} {(quote.items?.length === 1) ? 'artículo' : 'artículos'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className={`h-7 px-2.5 rounded-full text-xs font-bold border ${status.color} hover:opacity-80`}>
                                  <StatusIcon className="h-3.5 w-3.5 mr-1" />
                                  {status.label}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-2xl p-1">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'draft')} className="gap-2 text-xs font-semibold">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" /> Marcar como Borrador
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'sent')} className="gap-2 text-xs font-semibold">
                                  <Send className="h-3.5 w-3.5 text-blue-500" /> Marcar como Enviada
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'approved')} className="gap-2 text-xs font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Marcar como Aprobada
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quote, 'rejected')} className="gap-2 text-xs font-semibold">
                                  <XCircle className="h-3.5 w-3.5 text-rose-500" /> Marcar como Rechazada
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>

                          <TableCell className="pr-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Ver / Imprimir PDF */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPreviewQuote(quote)
                                  setIsPreviewOpen(true)
                                }}
                                className="h-8 px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-primary gap-1 font-bold text-xs"
                                title="Ver e imprimir PDF"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </Button>

                              {/* WhatsApp */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareWhatsApp(quote)}
                                className="h-8 px-2.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1 font-bold text-xs"
                                title="Compartir por WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </Button>

                              {/* Convertir a Venta */}
                              {quote.status !== 'converted' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setQuoteToConvert(quote)}
                                  className="h-8 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1 font-bold text-xs shadow-sm"
                                  title="Convertir a Operación / Venta"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline">A Venta</span>
                                </Button>
                              )}

                              {/* Menú Más Acciones */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl p-1">
                                  <DropdownMenuItem onClick={() => handleEditQuote(quote)} className="gap-2 text-xs font-semibold">
                                    <Edit className="h-3.5 w-3.5 text-slate-500" /> Editar Cotización
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)} className="gap-2 text-xs font-semibold">
                                    <Copy className="h-3.5 w-3.5 text-slate-500" /> Duplicar Cotización
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setQuoteToDelete(quote)} className="gap-2 text-xs font-semibold text-destructive focus:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </SidebarInset>

      {/* ======================================================== */}
      {/* MODAL CREADOR / EDITOR DE COTIZACIÓN                     */}
      {/* ======================================================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                  <ReceiptText className="h-6 w-6" />
                  {editingQuoteId ? `Editar Cotización ${formData.quoteNumber}` : "Nueva Cotización"}
                </DialogTitle>
                <DialogDescription>
                  Completa los datos del cliente, selecciona artículos y define las condiciones de pago.
                </DialogDescription>
              </div>
              <Badge className="text-sm px-3 py-1 font-black bg-primary/10 text-primary border-none rounded-xl">
                {formData.quoteNumber}
              </Badge>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveQuote} className="space-y-6 pt-2">
            
            {/* Fila 1: Selección de Cliente y Configuración Base */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-3xl border">
              
              {/* Cliente */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-slate-700">Cliente / Destinatario</Label>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary font-bold"
                    onClick={() => handleClientSelect(formData.isProspect ? "" : "prospect")}
                  >
                    {formData.isProspect ? "← Elegir de Lista de Clientes" : "+ Cliente Ocasional / Prospecto"}
                  </Button>
                </div>

                {!formData.isProspect ? (
                  <Select value={formData.clientId || ""} onValueChange={handleClientSelect}>
                    <SelectTrigger className="h-11 bg-white border rounded-2xl">
                      <SelectValue placeholder="Selecciona un cliente registrado..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.apellido ? `${c.apellido}, ${c.nombre}` : c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    placeholder="Nombre completo o Empresa del prospecto..."
                    value={formData.clientName}
                    onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="h-11 bg-white border rounded-2xl font-bold"
                    required
                  />
                )}
              </div>

              {/* Moneda y Tipo de Cambio */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-slate-700">Moneda</Label>
                  <span className="text-[11px] font-bold text-emerald-700">
                    1 USD = ${formData.exchangeRate.toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.currency === 'ARS' ? 'default' : 'outline'}
                    onClick={() => handleChangeCurrency('ARS')}
                    className={`h-11 rounded-2xl font-bold text-xs ${formData.currency === 'ARS' ? 'bg-primary text-white' : 'bg-white text-slate-700'}`}
                  >
                    🇦🇷 Pesos (ARS)
                  </Button>
                  <Button
                    type="button"
                    variant={formData.currency === 'USD' ? 'default' : 'outline'}
                    onClick={() => handleChangeCurrency('USD')}
                    className={`h-11 rounded-2xl font-bold text-xs ${formData.currency === 'USD' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}
                  >
                    🇺🇸 Dólares (USD)
                  </Button>
                </div>
              </div>

              {/* Datos de Contacto Secundarios */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Teléfono / WhatsApp</Label>
                <Input 
                  placeholder="Ej: 11 2345-6789"
                  value={formData.clientPhone}
                  onChange={e => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  className="h-9 bg-white border rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Correo Electrónico</Label>
                <Input 
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={formData.clientEmail}
                  onChange={e => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="h-9 bg-white border rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-semibold text-slate-500">Cotización Dólar</Label>
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => handleRateTypeChange('blue')}
                      className={`text-[9px] px-1 rounded font-bold ${formData.rateType === 'blue' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Blue (${exchangeRates.blue})
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleRateTypeChange('official')}
                      className={`text-[9px] px-1 rounded font-bold ${formData.rateType === 'official' ? 'bg-blue-100 text-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Oficial (${exchangeRates.official})
                    </button>
                  </div>
                </div>
                <Input 
                  type="number"
                  placeholder="Tipo de cambio"
                  value={formData.exchangeRate}
                  onChange={e => handleRateTypeChange('custom', Number(e.target.value))}
                  className="h-9 bg-white border rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Fila 2: Fechas y Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-700">Fecha de Emisión</Label>
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="h-11 bg-background border rounded-2xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-slate-700">Válido Hasta</Label>
                  <div className="flex gap-1">
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, validUntil: calculateDefaultValidity(prev.date, 7) }))}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      +7d
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, validUntil: calculateDefaultValidity(prev.date, 15) }))}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      +15d
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, validUntil: calculateDefaultValidity(prev.date, 30) }))}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      +30d
                    </button>
                  </div>
                </div>
                <Input 
                  type="date"
                  value={formData.validUntil}
                  onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="h-11 bg-background border rounded-2xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-700">Estado Inicial</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-11 bg-background border rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="approved">Aprobada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 3: Tabla de Artículos / Servicios con Buscador Rápido */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-primary" />
                    Artículos y Servicios
                  </h4>
                  <p className="text-xs text-muted-foreground">Selecciona ítems del catálogo o ingresa conceptos manuales.</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  
                  {/* BUSCADOR RÁPIDO DE CATÁLOGO (POPOVER) */}
                  <Popover open={isCatalogPopoverOpen} onOpenChange={setIsCatalogPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/20 gap-1.5"
                      >
                        <Search className="h-4 w-4" />
                        + Buscar en Catálogo ({products?.length || 0})
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent align="end" className="w-[360px] sm:w-[480px] p-4 rounded-3xl shadow-2xl border-slate-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h5 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-primary" />
                            Catálogo de Productos y Servicios
                          </h5>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {sortedAndFilteredCatalog.length} artículos
                          </Badge>
                        </div>

                        {/* Input de Búsqueda Rápida */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            autoFocus
                            placeholder="Escribe el nombre del producto..."
                            value={catalogSearch}
                            onChange={e => setCatalogSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium"
                          />
                        </div>

                        {/* Filtro por Categorías */}
                        {categories && categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => setCatalogCategoryFilter("all")}
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${catalogCategoryFilter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              Todas
                            </button>
                            {categories.map((cat: any) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCatalogCategoryFilter(cat.id)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${catalogCategoryFilter === cat.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Lista de Productos Encontrados */}
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                          {sortedAndFilteredCatalog.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                              No se encontraron productos que coincidan con la búsqueda.
                            </div>
                          ) : (
                            sortedAndFilteredCatalog.map((prod: any) => {
                              const rate = Number(formData.exchangeRate) > 0 ? Number(formData.exchangeRate) : 1350
                              const { price, originalCurrency, originalPrice } = resolveProductPrice(prod, formData.currency, rate)
                              const catName = categories?.find((c: any) => c.id === prod.categoryId)?.name

                              return (
                                <div
                                  key={prod.id}
                                  onClick={() => handleAddCatalogProduct(prod)}
                                  className="p-2.5 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between gap-3 group border border-transparent hover:border-slate-200"
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-xs text-slate-900 group-hover:text-primary transition-colors truncate">
                                      {prod.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {catName && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-slate-200 text-slate-500">
                                          {catName}
                                        </Badge>
                                      )}
                                      {prod.stock !== undefined && prod.trackStock !== false && (
                                        <span className="text-[10px] text-muted-foreground">
                                          Stock: <b className={prod.stock <= (prod.minStock || 0) ? 'text-amber-600' : 'text-slate-700'}>{prod.stock}</b>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-black text-xs text-slate-900 block">
                                      {formData.currency === 'USD' ? 'USD $' : '$'}
                                      {price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    {originalCurrency !== formData.currency && originalPrice > 0 && (
                                      <span className="text-[9px] text-muted-foreground block">
                                        (Orig: {originalCurrency === 'USD' ? 'USD $' : '$'}{originalPrice.toLocaleString('es-AR')})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Botón Ítem Manual */}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddCustomItem}
                    className="h-10 rounded-2xl font-bold text-xs shrink-0 border-slate-200"
                  >
                    + Ítem Libre
                  </Button>
                </div>
              </div>

              {/* Tabla de Items */}
              <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-600 pl-4 py-2.5">Descripción / Concepto</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 w-20 py-2.5 text-center">Cant.</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 w-36 py-2.5 text-right">
                        Precio Unit. ({formData.currency})
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 w-24 py-2.5 text-center">Desc. %</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 w-36 py-2.5 text-right">Subtotal</TableHead>
                      <TableHead className="w-10 py-2.5 pr-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          No has agregado artículos. Presiona <b>"+ Buscar en Catálogo"</b> arriba o añade un <b>"Ítem Libre"</b>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="pl-4 py-2">
                            <Input 
                              value={item.name}
                              onChange={e => handleUpdateItem(index, 'name', e.target.value)}
                              placeholder="Nombre del artículo o servicio..."
                              className="h-8 text-xs font-bold rounded-lg border-slate-200"
                              required
                            />
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Input 
                              type="number"
                              min="1"
                              step="1"
                              value={item.qty}
                              onChange={e => handleUpdateItem(index, 'qty', e.target.value)}
                              className="h-8 text-xs text-center font-bold rounded-lg border-slate-200"
                              required
                            />
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Input 
                              type="number"
                              step="any"
                              value={item.unitPrice}
                              onChange={e => handleUpdateItem(index, 'unitPrice', e.target.value)}
                              className="h-8 text-xs text-right font-bold rounded-lg border-slate-200"
                              required
                            />
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            <Input 
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount || 0}
                              onChange={e => handleUpdateItem(index, 'discount', e.target.value)}
                              className="h-8 text-xs text-center font-semibold rounded-lg border-slate-200"
                            />
                          </TableCell>
                          <TableCell className="py-2 text-right font-black text-xs text-slate-900">
                            {formData.currency === 'USD' ? 'USD $' : '$'}
                            {Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="pr-4 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-destructive rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Fila 4: Notas / Condiciones & Totales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
              
              {/* Notas y Condiciones */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase text-slate-700">Notas y Condiciones Comerciales</Label>
                </div>
                
                {/* Botones de Presets de Notas */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAppendNotePreset("• Forma de pago: 50% anticipo al confirmar, 50% contra entrega.")}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold"
                  >
                    + Pago 50/50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendNotePreset("• Plazo de entrega: Inmediato / dentro de las 48hs hábiles.")}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold"
                  >
                    + Entrega 48hs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendNotePreset(`• Precios en USD pagaderos en ARS según tipo de cambio Dólar Blue al día de pago (Cotización ref: $${formData.exchangeRate}).`)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold"
                  >
                    + Cláusula USD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendNotePreset("• Garantía oficial Dosimat por 6 meses sobre defectos de fabricación.")}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold"
                  >
                    + Garantía 6M
                  </button>
                </div>

                <Textarea 
                  rows={4}
                  placeholder="Escribe términos de entrega, cuentas bancarias, garantías u observaciones..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-background text-xs rounded-2xl resize-none"
                />
              </div>

              {/* Resumen de Totales */}
              <div className="bg-slate-50 p-5 rounded-3xl border space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>Subtotal Bruto:</span>
                  <span className="font-bold text-sm text-slate-800">
                    {formData.currency === 'USD' ? 'USD $' : '$'}
                    {formData.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-600">Descuento Global (%):</span>
                  <div className="w-28">
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={formData.globalDiscountPercent}
                      onChange={e => handleGlobalDiscountChange(Number(e.target.value))}
                      className="h-8 text-xs text-right font-bold rounded-xl bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                {formData.globalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                    <span>Descuento aplicado:</span>
                    <span>
                      -{formData.currency === 'USD' ? 'USD $' : '$'}
                      {formData.globalDiscountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-sm font-black uppercase text-slate-800 tracking-wide">Total Presupuestado:</span>
                  <span className="text-2xl font-black text-primary">
                    {formData.currency === 'USD' ? 'USD $' : '$'}
                    {formData.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>

            <DialogFooter className="gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-2xl h-11 font-bold"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20"
              >
                {isSaving ? "Guardando..." : (editingQuoteId ? "Actualizar Cotización" : "Crear Cotización")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL VISTA PREVIA E IMPRESIÓN PDF A4                    */}
      {/* ======================================================== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader className="no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  Vista Previa de Cotización {previewQuote?.quoteNumber}
                </DialogTitle>
                <DialogDescription>
                  Formato A4 profesional optimizado para guardar como PDF o imprimir.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => previewQuote && handleShareWhatsApp(previewQuote)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 px-4 gap-1.5 shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={handlePrint}
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl h-10 px-5 gap-1.5 shadow-md shadow-primary/20"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Plantilla A4 (Visible en pantalla y capturada por @media print) */}
          {previewQuote && (
            <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border shadow-sm my-2 font-sans">
              
              {/* Encabezado: Logo y Datos de Empresa */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b-2 border-primary/20 pb-6">
                <div>
                  <img 
                    src="/logo-dosimat.png" 
                    alt="Dosimat Pro" 
                    className="h-16 sm:h-20 object-contain"
                  />
                  <p className="text-[11px] font-bold text-primary tracking-wide uppercase mt-1">
                    La opción inteligente para su pileta
                  </p>
                </div>

                <div className="text-right sm:text-right space-y-0.5 text-xs text-slate-600">
                  <h3 className="font-black text-sm text-slate-900">{settings?.name || "DOSIMAT PRO"}</h3>
                  {settings?.supportWhatsapp && <p>Tel / WhatsApp: <span className="font-bold">{settings.supportWhatsapp}</span></p>}
                  {settings?.supportEmail && <p>Email: {settings.supportEmail}</p>}
                  {settings?.address && <p>Ubicación: {settings.address}</p>}
                  {settings?.website && <p className="text-primary font-semibold">{settings.website}</p>}
                </div>
              </div>

              {/* Ficha: Datos de Cotización y Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                {/* Cliente */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Cliente / Destinatario:
                  </span>
                  <h4 className="text-base font-black text-slate-900">{previewQuote.clientName}</h4>
                  {previewQuote.clientPhone && <p className="text-xs text-slate-700 mt-0.5">Tel: {previewQuote.clientPhone}</p>}
                  {previewQuote.clientEmail && <p className="text-xs text-slate-700">Email: {previewQuote.clientEmail}</p>}
                  {previewQuote.clientAddress && <p className="text-xs text-slate-700">Dirección: {previewQuote.clientAddress}</p>}
                </div>

                {/* Cotización */}
                <div className="sm:text-right space-y-1">
                  <div className="inline-block bg-primary text-white font-black text-sm px-3 py-1 rounded-xl uppercase tracking-wider">
                    Presupuesto {previewQuote.quoteNumber}
                  </div>
                  <p className="text-xs text-slate-600 pt-1">
                    Fecha de Emisión: <span className="font-bold text-slate-800">{previewQuote.date ? new Date(previewQuote.date).toLocaleDateString('es-AR') : '-'}</span>
                  </p>
                  {previewQuote.validUntil && (
                    <p className="text-xs text-slate-600">
                      Validez de Oferta: <span className="font-bold text-slate-800">{new Date(previewQuote.validUntil).toLocaleDateString('es-AR')}</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-600">
                    Moneda: <span className="font-bold text-slate-800">{previewQuote.currency === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}</span>
                  </p>
                </div>
              </div>

              {/* Tabla de Artículos */}
              <div className="my-6 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-left w-12">#</th>
                      <th className="py-3 px-3 text-left">Descripción / Detalle</th>
                      <th className="py-3 px-3 text-center w-16">Cant.</th>
                      <th className="py-3 px-3 text-right w-28">Precio Unit.</th>
                      {previewQuote.items?.some(it => (it.discount || 0) > 0) && (
                        <th className="py-3 px-3 text-center w-20">Desc.</th>
                      )}
                      <th className="py-3 px-4 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewQuote.items?.map((item, i) => {
                      const currencySym = previewQuote.currency === 'USD' ? 'USD $' : '$'
                      return (
                        <tr key={item.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="py-2.5 px-3 font-semibold text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">{item.name}</span>
                            {item.description && <span className="text-[10px] text-slate-500 block">{item.description}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.qty}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {currencySym}{Number(item.unitPrice || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {previewQuote.items?.some(it => (it.discount || 0) > 0) && (
                            <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">
                              {item.discount ? `${item.discount}%` : '-'}
                            </td>
                          )}
                          <td className="py-2.5 px-4 text-right font-black text-slate-900">
                            {currencySym}{Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totales y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start mt-6 pt-4 border-t border-slate-200">
                
                {/* Notas y Condiciones */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <h5 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Condiciones y Observaciones:</h5>
                  <div className="whitespace-pre-line text-slate-600 leading-relaxed">
                    {previewQuote.notes || "Sin observaciones adicionales."}
                  </div>
                </div>

                {/* Resumen de Total */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 sm:text-right">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-800">
                      {previewQuote.currency === 'USD' ? 'USD $' : '$'}
                      {Number(previewQuote.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {previewQuote.globalDiscountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                      <span>Descuento Global ({previewQuote.globalDiscountPercent}%):</span>
                      <span>
                        -{previewQuote.currency === 'USD' ? 'USD $' : '$'}
                        {Number(previewQuote.globalDiscountAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline">
                    <span className="text-xs font-black uppercase text-slate-900">TOTAL FINAL:</span>
                    <span className="text-xl font-black text-primary">
                      {previewQuote.currency === 'USD' ? 'USD $' : '$'}
                      {Number(previewQuote.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pie de página */}
              <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-600">¡Muchas gracias por confiar en Dosimat!</p>
                <p>Este documento es una cotización informativa y no constituye una factura fiscal.</p>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIÁLOGO CONFIRMAR BORRADO                                */}
      {/* ======================================================== */}
      <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la cotización <span className="font-bold">{quoteToDelete?.quoteNumber}</span> correspondiente a <span className="font-bold">{quoteToDelete?.clientName}</span>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteQuote}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================================================== */}
      {/* DIÁLOGO CONVERTIR A VENTA                                */}
      {/* ======================================================== */}
      <AlertDialog open={!!quoteToConvert} onOpenChange={(open) => !open && setQuoteToConvert(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowUpRight className="h-6 w-6 text-purple-600" />
              ¿Convertir Cotización a Venta?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Se registrará automáticamente una nueva operación en <span className="font-bold text-slate-800">Operaciones</span> por un monto de <span className="font-black text-slate-900">{quoteToConvert?.currency === 'USD' ? 'USD $' : '$'}{Number(quoteToConvert?.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                La cotización quedará marcada como "Convertida a Venta" para mantener el historial comercial.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmConversion}
              disabled={isConverting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
            >
              {isConverting ? "Generando venta..." : "Confirmar y Crear Operación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
