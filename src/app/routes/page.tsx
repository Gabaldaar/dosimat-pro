
"use client"

import { useState, useMemo, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Plus, 
  User, 
  Droplet, 
  Minus, 
  CheckCircle2, 
  Trash2, 
  ChevronRight, 
  Send, 
  Clock, 
  MapPin, 
  Phone,
  Loader2,
  Check,
  ClipboardList,
  AlertTriangle,
  Save,
  ArrowRight,
  Calculator,
  Info,
  Calendar as CalendarIcon,
  MapPinned,
  Printer,
  Package,
  Link as LinkIcon,
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Beaker,
  Copy,
  Coins,
  Mail,
  Lock,
  History,
  Settings2,
  Banknote
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { useToast } from "../../hooks/use-toast"
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  useUser
} from "../../firebase"
import { collection, doc, query, orderBy, where, setDoc, getDocs, updateDoc, deleteDoc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sendPushNotification } from "@/app/actions/notifications"
import { formatRevisionDetail } from "@/lib/client-request-revisions"

function getParticipantClientIds(items: any[]): string[] {
  return [...new Set((items ?? []).map((i) => i.clientId).filter(Boolean))]
}

function RoutesContent() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userData, isUserLoading, user } = useUser()
  const isAdmin = userData?.role === 'Admin'
  const isCommunicator = userData?.role === 'Communicator'
  const isReplenisher = userData?.role === 'Replenisher'
  const isStaff = useMemo(() => userData && ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'].includes(userData.role), [userData]);
  const canManageRoutes = userData?.role === 'Admin' || userData?.role === 'Employee' || userData?.role === 'Communicator'

  const [view, setMainView] = useState<"list" | "detail">("list")
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null)
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false)
  const [sheetToDelete, setSheetToDelete] = useState<any | null>(null)
  const [listTab, setListTab] = useState("orders")
  const [initialTabSet, setInitialTabSet] = useState(false)

  // Estados para envío de Mail
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [selectedCommCustomer, setSelectedCommCustomer] = useState<any>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        if (!isNewSheetOpen && !sheetToDelete && !isEmailDialogOpen) {
          document.body.style.pointerEvents = 'auto';
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [isNewSheetOpen, sheetToDelete, isEmailDialogOpen]);

  // Queries Protegidas
  const clientsQuery = useMemoFirebase(() => isStaff ? collection(db, 'clients') : null, [db, isStaff])
  const zonesQuery = useMemoFirebase(() => isStaff ? collection(db, 'zones') : null, [db, isStaff])
  const routesQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'route_sheets'), orderBy('date', 'desc')) : null, [db, isStaff])
  const catalogQuery = useMemoFirebase(() => isStaff ? collection(db, 'products_services') : null, [db, isStaff])
  const emailTemplatesQuery = useMemoFirebase(() => isStaff ? collection(db, 'email_templates') : null, [db, isStaff])
  const usersQuery = useMemoFirebase(() => isStaff ? collection(db, 'users') : null, [db, isStaff])
  const clientRequestsQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'client_requests'), where('status', '==', 'pending')) : null, [db, isStaff])
  const clientReviewQuery = useMemoFirebase(() => isStaff ? query(collection(db, 'client_requests'), where('needsStaffReview', '==', true)) : null, [db, isStaff])

  const { data: clients } = useCollection(clientsQuery)
  const { data: zones } = useCollection(zonesQuery)
  const { data: rawRouteSheets, isLoading: loadingSheets } = useCollection(routesQuery)
  const { data: catalog } = useCollection(catalogQuery)
  const { data: emailTemplates } = useCollection(emailTemplatesQuery)
  const { data: allUsers } = useCollection(usersQuery)
  const { data: pendingClientRequests, isLoading: loadingRequests } = useCollection(clientRequestsQuery)
  const { data: reviewClientRequests, isLoading: loadingReviews } = useCollection(clientReviewQuery)

  const sortedPendingRequests = useMemo(() => {
    if (!pendingClientRequests) return []
    return [...pendingClientRequests].sort((a: any, b: any) =>
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )
  }, [pendingClientRequests])

  const sortedReviewRequests = useMemo(() => {
    if (!reviewClientRequests) return []
    return [...reviewClientRequests].sort((a: any, b: any) =>
      new Date(b.clientRevisionAt || b.updatedAt || b.date || 0).getTime() -
      new Date(a.clientRevisionAt || a.updatedAt || a.date || 0).getTime()
    )
  }, [reviewClientRequests])

  const portalOrdersBadgeCount = sortedPendingRequests.length + sortedReviewRequests.length

  const reviewBySheetId = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const req of sortedReviewRequests) {
      if (!req.routeSheetId) continue
      const list = map.get(req.routeSheetId) || []
      list.push(req)
      map.set(req.routeSheetId, list)
    }
    return map
  }, [sortedReviewRequests])

  const refillClients = useMemo(() => {
    if (!clients) return [];
    return [...clients]
      .filter((c: any) => c.esClienteReposicion)
      .sort((a: any, b: any) => {
        const apA = (a.apellido || "").toLowerCase();
        const apB = (b.apellido || "").toLowerCase();
        if (apA !== apB) return apA.localeCompare(apB);
        return (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase());
      });
  }, [clients]);

  const referencePrices = useMemo(() => {
    if (!catalog) return { cloro: 0, acido: 0 }
    const cloroItem = catalog.find((i: any) => i.name === "Bidón CL (Pago Ef.)")
    const acidoItem = catalog.find((i: any) => i.name === "Bidón Ácido (Pago Ef.)")
    return {
      cloro: Number(cloroItem?.priceARS || 0),
      acido: Number(acidoItem?.priceARS || 0)
    }
  }, [catalog])

  const showRestrictedToast = useCallback(() => {
    toast({
      title: "Acceso restringido",
      description: "Todavía no estás autorizado a ingresar porque esta ruta aún se está planificando.",
      variant: "destructive"
    });
  }, [toast]);

  const notifyTeam = useCallback(async (title: string, body: string, target: 'all' | 'management' = 'management') => {
    if (!allUsers) return;
    const authorizedRoles = ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'];
    const managementRoles = ['Admin', 'Employee'];
    const tokens = allUsers
      .filter(u => {
        const hasRole = target === 'all' ? authorizedRoles.includes(u.role) : managementRoles.includes(u.role);
        return hasRole && u.fcmTokens;
      })
      .flatMap(u => u.fcmTokens);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, title, body, `/routes?sheetId=${selectedSheetId}`);
    }
  }, [allUsers, selectedSheetId]);

  useEffect(() => {
    const sheetId = searchParams.get('sheetId')
    if (sheetId && rawRouteSheets) {
      const sheet = rawRouteSheets.find(s => s.id === sheetId);
      if (isReplenisher && sheet?.status === 'planned') {
        showRestrictedToast();
        return;
      }
      setSelectedSheetId(sheetId)
      setMainView("detail")
    }
  }, [searchParams, rawRouteSheets, isReplenisher, showRestrictedToast])

  const selectedSheet = useMemo(() => rawRouteSheets?.find(s => s.id === selectedSheetId), [rawRouteSheets, selectedSheetId])
  
  useEffect(() => {
    if (isReplenisher && selectedSheet?.status === 'planned' && view === 'detail') {
      setMainView("list");
      setSelectedSheetId(null);
      showRestrictedToast();
    }
  }, [selectedSheet, isReplenisher, view, showRestrictedToast]);

  const activeSheets = useMemo(() => rawRouteSheets?.filter(s => s.status === 'planned' || s.status === 'active') || [], [rawRouteSheets]);
  const historySheets = useMemo(() => rawRouteSheets?.filter(s => s.status === 'completed') || [], [rawRouteSheets]);

  useEffect(() => {
    if (!loadingRequests && !loadingSheets && !initialTabSet && rawRouteSheets && pendingClientRequests) {
      if (portalOrdersBadgeCount > 0) {
        setListTab("orders")
      } else if (activeSheets.length > 0) {
        setListTab("active")
      } else {
        setListTab("history")
      }
      setInitialTabSet(true)
    }
  }, [loadingRequests, loadingSheets, initialTabSet, portalOrdersBadgeCount, activeSheets.length, rawRouteSheets, pendingClientRequests])

  useEffect(() => {
    if (!isStaff || !rawRouteSheets) return
    rawRouteSheets.forEach((sheet: any) => {
      const expected = getParticipantClientIds(sheet.items)
      const current: string[] = sheet.participantClientIds ?? []
      if (expected.length === 0 && current.length === 0) return
      const same =
        expected.length === current.length &&
        expected.every((id) => current.includes(id))
      if (!same) {
        updateDocumentNonBlocking(doc(db, 'route_sheets', sheet.id), {
          participantClientIds: expected,
        })
      }
    })
  }, [rawRouteSheets, isStaff, db])

  const [newSheetDate, setNewSheetDate] = useState(new Date().toISOString().split('T')[0])

  const loadTotals = useMemo(() => {
    if (!selectedSheet) return { plannedChlorine: 0, plannedAcid: 0, realChlorine: 0, realAcid: 0 }
    return selectedSheet.items.reduce((acc: any, curr: any) => {
      acc.plannedChlorine += Number(curr.plannedChlorine || 0)
      acc.plannedAcid += Number(curr.plannedAcid || 0)
      acc.realChlorine += Number(curr.realChlorine || 0)
      acc.realAcid += Number(curr.realAcid || 0)
      return acc
    }, { plannedChlorine: 0, plannedAcid: 0, realChlorine: 0, realAcid: 0 })
  }, [selectedSheet])

  const handleCreateSheet = async () => {
    if (!newSheetDate) {
      toast({ title: "Fecha requerida", description: "Seleccioná una fecha para la planilla.", variant: "destructive" })
      return
    }
    const id = Math.random().toString(36).substring(2, 11)
    const newSheet = { id, date: newSheetDate, status: "planned", createdBy: user?.uid, items: [], participantClientIds: [] }
    try {
      await setDoc(doc(db, 'route_sheets', id), newSheet, { merge: true })
      setIsNewSheetOpen(false)
      setSelectedSheetId(id)
      setMainView("detail")
      setListTab("active")
      toast({ title: "Hoja de ruta creada" })
    } catch {
      toast({ title: "Error al crear planilla", description: "No se pudo guardar. Verificá tus permisos.", variant: "destructive" })
    }
  }

  const handleConfirmDeleteSheet = async () => {
    if (!sheetToDelete) return
    const sheetId = sheetToDelete.id
    try {
      const requestsSnap = await getDocs(
        query(collection(db, 'client_requests'), where('routeSheetId', '==', sheetId))
      )
      await Promise.all(
        requestsSnap.docs.map((d) =>
          updateDoc(doc(db, 'client_requests', d.id), {
            status: 'pending',
            routeSheetId: null,
            updatedAt: new Date().toISOString(),
          })
        )
      )
      await deleteDoc(doc(db, 'route_sheets', sheetId))
      if (selectedSheetId === sheetId) {
        setSelectedSheetId(null)
        setMainView("list")
      }
      setSheetToDelete(null)
      const recovered = requestsSnap.docs.length
      toast({
        title: "Hoja de ruta eliminada",
        description: recovered > 0
          ? `${recovered} pedido${recovered > 1 ? 's' : ''} del portal volvieron a pendientes.`
          : undefined,
      })
    } catch {
      toast({ title: "Error al eliminar", description: "No se pudo completar la operación.", variant: "destructive" })
    }
  }

  const revertClientRequestOnSheet = async (sheetId: string, clientId: string) => {
    const requestsSnap = await getDocs(
      query(
        collection(db, 'client_requests'),
        where('routeSheetId', '==', sheetId),
        where('clientId', '==', clientId)
      )
    )
    await Promise.all(
      requestsSnap.docs.map((d) =>
        updateDoc(doc(db, 'client_requests', d.id), {
          status: 'pending',
          routeSheetId: null,
          updatedAt: new Date().toISOString(),
        })
      )
    )
  }

  const handleMarkRequestDone = (requestId: string) => {
    updateDocumentNonBlocking(doc(db, 'client_requests', requestId), {
      status: 'completed',
      needsStaffReview: false,
      updatedAt: new Date().toISOString(),
    })
    toast({ title: "Pedido marcado como atendido" })
  }

  const handleAcknowledgeRevision = (requestId: string) => {
    updateDocumentNonBlocking(doc(db, 'client_requests', requestId), {
      needsStaffReview: false,
      staffReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    toast({
      title: "Revisión registrada",
      description: "El cliente verá la confirmación en su portal hasta la fecha de entrega.",
    })
  }

  const handleAddRequestToRoute = (request: any) => {
    const plannedSheet = activeSheets.find((s: any) => s.status === 'planned')
    if (!plannedSheet) {
      toast({
        title: "Sin planilla en planificación",
        description: "Creá una hoja de ruta nueva antes de agregar el pedido.",
        variant: "destructive",
      })
      return
    }

    const existingItems = plannedSheet.items ?? []
    const alreadyOnSheet = existingItems.some((i: any) => i.clientId === request.clientId)
    let newItems

    if (alreadyOnSheet) {
      newItems = existingItems.map((i: any) =>
        i.clientId === request.clientId
          ? {
              ...i,
              plannedChlorine: Math.max(Number(i.plannedChlorine || 0), Number(request.cloro || 0)),
              plannedAcid: Math.max(Number(i.plannedAcid || 0), Number(request.acido || 0)),
              notes: [i.notes, request.notes].filter(Boolean).join(' | '),
            }
          : i
      )
    } else {
      const client = clients?.find((c: any) => c.id === request.clientId)
      const defaultChlorine = Number(request.cloro) || client?.equipoInstalado?.cantBidones || 0
      newItems = [
        ...existingItems,
        {
          clientId: request.clientId,
          plannedChlorine: defaultChlorine,
          plannedAcid: Number(request.acido || 0),
          realChlorine: 0,
          realAcid: 0,
          others: request.notes || "",
          cashCollected: 0,
          notes: request.notes || "",
          isDelivered: false,
          processed: false,
          liquidadoRepositor: false,
          liquidadoComunicador: false,
        },
      ]
    }

    updateDocumentNonBlocking(doc(db, 'route_sheets', plannedSheet.id), {
      items: newItems,
      participantClientIds: getParticipantClientIds(newItems),
    })
    updateDocumentNonBlocking(doc(db, 'client_requests', request.id), {
      status: 'scheduled',
      routeSheetId: plannedSheet.id,
      routeDate: plannedSheet.date,
      needsStaffReview: false,
      clientRevisionType: null,
      clientRevisionAt: null,
      revisionSnapshot: null,
      updatedAt: new Date().toISOString(),
    })
    toast({
      title: "Pedido agregado a la ruta",
      description: `Planilla del ${new Date(plannedSheet.date + 'T12:00:00').toLocaleDateString('es-AR')}`,
    })
  }

  const updateSheet = (updatedItems: any[]) => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), {
      items: updatedItems,
      participantClientIds: getParticipantClientIds(updatedItems),
    })
  }

  const addItemToSheet = (clientId: string) => {
    if (!selectedSheet) return
    if (selectedSheet.items.some((i: any) => i.clientId === clientId)) {
      toast({ title: "Cliente ya agregado", variant: "destructive" }); return;
    }
    const client = clients?.find(c => c.id === clientId)
    const defaultChlorine = client?.equipoInstalado?.cantBidones || 0
    const newItem = { clientId, plannedChlorine: defaultChlorine, realChlorine: 0, plannedAcid: 0, realAcid: 0, others: "", cashCollected: 0, notes: "", isDelivered: false, processed: false, liquidadoRepositor: false, liquidadoComunicador: false }
    updateSheet([...selectedSheet.items, newItem])
  }

  const removeItemFromSheet = async (clientId: string) => {
    if (!selectedSheet) return
    updateSheet(selectedSheet.items.filter((i: any) => i.clientId !== clientId))
    if (selectedSheetId) {
      try {
        await revertClientRequestOnSheet(selectedSheetId, clientId)
      } catch {
        console.warn("No se pudo revertir el pedido del portal")
      }
    }
  }

  const updateItemField = (clientId: string, field: string, value: any) => {
    if (!selectedSheet) return
    const newItems = selectedSheet.items.map((i: any) => i.clientId === clientId ? { ...i, [field]: value } : i )
    updateSheet(newItems)
    if (field === 'isDelivered' && value === true) {
      const client = clients?.find(c => c.id === clientId);
      notifyTeam("Entrega Realizada", `${userData?.name || 'El repositor'} entregó en lo de ${client?.apellido || 'un cliente'}.`, 'management');
    }
  }

  const handleStartRoute = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "active" })
    toast({ title: "Ruta habilitada para entrega", description: "Ahora es visible para el repositor." })
    notifyTeam("Ruta Iniciada", `El repositor ha iniciado la hoja de ruta del ${new Date(selectedSheet?.date + 'T12:00:00').toLocaleDateString('es-AR')}.`, 'all');
  }

  const handleResetToPlanning = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "planned" })
    toast({ title: "Ruta devuelta a Planificación", description: "El repositor ya no podrá verla hasta que vuelvas a iniciarla." })
  }

  const handleCompleteRoute = () => {
    if (!selectedSheetId) return
    updateDocumentNonBlocking(doc(db, 'route_sheets', selectedSheetId), { status: "completed" })
    toast({ title: "Ruta finalizada" })
    notifyTeam("Jornada Finalizada", `Se ha cerrado la hoja de ruta. Total entregado: ${loadTotals.realChlorine} CL, ${loadTotals.realAcid} AC.`, 'all');
    setMainView("list")
    setListTab("history")
  }

  const handleGenerateTransaction = (item: any) => {
    const queryParams = new URLSearchParams({ mode: 'new', clientId: item.clientId, type: 'refill', cloro: (item.realChlorine ?? 0).toString(), acido: (item.realAcid ?? 0).toString(), cash: (item.cashCollected ?? 0).toString(), notes: item.notes || '', routeId: selectedSheetId!, fromRoute: 'true' }).toString()
    router.push(`/transactions?${queryParams}`)
  }

  const markAsProcessed = (clientId: string) => {
    if (!selectedSheet) return
    const newItems = selectedSheet.items.map((i: any) => i.clientId === clientId ? { ...i, processed: true } : i )
    updateSheet(newItems); toast({ title: "Operado" })
  }

  const loadPlannedToReal = (clientId: string) => {
    if (!selectedSheet) return
    const item = selectedSheet.items.find((i: any) => i.clientId === clientId)
    if (!item) return
    const newItems = selectedSheet.items.map((i: any) => i.clientId === clientId ? { ...i, realChlorine: item.plannedChlorine, realAcid: item.plannedAcid, isDelivered: true } : i )
    updateSheet(newItems)
    const client = clients?.find(c => c.id === clientId);
    notifyTeam("Entrega Realizada", `${userData?.name || 'El repositor'} entregó en lo de ${client?.apellido || 'un cliente'}.`, 'management');
  }

  const handleOpenMaps = (address: string, city: string) => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Argentina`)}`, '_blank') }
  const handleWhatsApp = (phone: string) => { const f = formatWhatsAppNumber(phone); if (f) window.open(`https://wa.me/${f}`, '_blank'); }
  const handlePrint = useCallback(() => { if (typeof window !== 'undefined') window.print(); }, []);

  const handleShareLink = () => {
    if (!selectedSheetId || !selectedSheet) return
    const url = `${window.location.origin}/routes?sheetId=${selectedSheetId}`
    const text = `*DOSIMAT PRO - HOJA DE RUTA*\nFecha: ${new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR')}\n\nPuedes ver y completar la planilla en este link:\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareOrderWhatsApp = () => {
    if (!selectedSheet) return;
    const dateStr = new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR');
    let text = `*Pedido para la próxima entrega*\nFecha: ${dateStr}\nCloro: ${loadTotals.plannedChlorine}\nÁcido: ${loadTotals.plannedAcid}\n\nGracias.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const handleOpenEmailDialog = (customer: any) => { if (!customer.mail) { toast({ title: "Sin Mail", variant: "destructive" }); return; } setSelectedCommCustomer(customer); setSelectedTemplateId(""); setDynamicValues({}); setIsEmailDialogOpen(true); }
  const activeTemplate = useMemo(() => emailTemplates?.find(t => t.id === selectedTemplateId), [selectedTemplateId, emailTemplates]);
  const dynamicKeys = useMemo(() => { if (!activeTemplate) return []; const content = activeTemplate.body + (activeTemplate.subject || ""); const m = content.match(/\{\{\?([^}]+)\}\}/g); return m ? Array.from(new Set(m.map(match => match.replace(/\{\{\?|\}\}/g, '')))) : []; }, [activeTemplate]);
  const handleSendEmail = () => { const t = emailTemplates?.find(template => template.id === selectedTemplateId); if (!t || !selectedCommCustomer) return; const body = replaceMarkers(t.body, selectedCommCustomer, dynamicValues); const subject = replaceMarkers(t.subject || "", selectedCommCustomer, dynamicValues); window.open(`mailto:${selectedCommCustomer.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body).replace(/%0A/g, '%0D%0A')}`, '_blank'); setIsEmailDialogOpen(false); };

  if (isUserLoading || !isStaff) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const isEditingAllowed = selectedSheet && selectedSheet.status === 'planned' && (isAdmin || isCommunicator)
  const showProgressLayout = selectedSheet && (selectedSheet.status === 'active' || selectedSheet.status === 'completed')

  const renderSheetReviewBanner = () => {
    if (!selectedSheet) return null
    const reviews = reviewBySheetId.get(selectedSheet.id)
    if (!reviews?.length) return null
    return (
      <Card className="border-2 border-rose-300 bg-rose-50/80 shadow-md">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-black uppercase text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> El cliente cambió su pedido — la planilla no se actualizó sola
          </p>
          <ul className="space-y-2">
            {reviews.map((req: any) => (
              <li key={req.id} className="text-sm text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2 last:border-0 last:pb-0">
                <span>
                  <strong>{req.clientName}</strong>: {formatRevisionDetail(req)}
                </span>
                {!isReplenisher && (
                  <Button size="sm" variant="outline" className="shrink-0 font-bold h-8" onClick={() => handleAcknowledgeRevision(req.id)}>
                    Revisado
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  const renderReviewAlerts = () => {
    if (loadingReviews || sortedReviewRequests.length === 0) return null
    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Cambios del portal (revisar planilla)
        </h3>
        {sortedReviewRequests.map((req: any) => (
          <Card key={req.id} className="border-l-4 border-l-rose-500 bg-rose-50/40">
            <CardContent className="p-4 md:p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-lg">{req.clientName}</h4>
                    <Badge className="text-[9px] font-black uppercase bg-rose-600 text-white">
                      {req.clientRevisionType === 'cancelled' ? 'Anuló pedido' : 'Modificó pedido'}
                    </Badge>
                  </div>
                  <p className="text-sm text-rose-900/90 font-medium">{formatRevisionDetail(req)}</p>
                  {req.routeDate && (
                    <p className="text-xs text-muted-foreground">
                      Hoja de ruta: {new Date(req.routeDate + 'T12:00:00').toLocaleDateString('es-AR')}
                      {req.status === 'cancelled' && ' · Quitá al cliente de la planilla si corresponde'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {req.routeSheetId && (
                    <Button
                      variant="outline"
                      className="font-bold gap-2"
                      onClick={() => {
                        setSelectedSheetId(req.routeSheetId)
                        setMainView('detail')
                        setListTab('active')
                      }}
                    >
                      <Truck className="h-4 w-4" /> Ver planilla
                    </Button>
                  )}
                  {!isReplenisher && (
                    <Button className="font-bold gap-2" onClick={() => handleAcknowledgeRevision(req.id)}>
                      <Check className="h-4 w-4" /> Marcar revisado
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderClientRequestsList = () => (
    <div className="space-y-4">
      {renderReviewAlerts()}
      {loadingRequests ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : sortedPendingRequests.length === 0 ? (
        <Card className="p-20 text-center border-dashed bg-muted/5">
          <Send className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-semibold">Sin pedidos pendientes</h3>
          <p className="text-sm text-muted-foreground mt-2">Los pedidos del portal de clientes aparecerán aquí.</p>
        </Card>
      ) : (
        sortedPendingRequests.map((req: any) => {
          const date = req.date
            ? new Date(req.date).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '—'
          return (
            <Card key={req.id} className="glass-card border-l-4 border-l-amber-500">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-lg">{req.clientName}</h4>
                      <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{date}</p>
                    <div className="flex gap-3 flex-wrap">
                      {Number(req.cloro) > 0 && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-black">{req.cloro} Cloro</Badge>
                      )}
                      {Number(req.acido) > 0 && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-black">{req.acido} Ácido</Badge>
                      )}
                    </div>
                    {req.notes && <p className="text-sm text-slate-600 italic">&ldquo;{req.notes}&rdquo;</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {!isReplenisher && (
                      <Button className="font-bold gap-2" onClick={() => handleAddRequestToRoute(req)}>
                        <Truck className="h-4 w-4" /> Agregar a Ruta
                      </Button>
                    )}
                    <Button variant="outline" className="font-bold gap-2" onClick={() => handleMarkRequestDone(req.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Marcar Atendido
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )

  const renderSheetList = (sheets: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sheets.map((sheet: any) => {
        const isLockedForReplenisher = isReplenisher && (sheet.status || "").toLowerCase() === 'planned';
        const isCompleted = sheet.status === 'completed';
        const statusInfo = {
          planned: { label: "Planificada", color: "bg-blue-100 text-blue-700", icon: isLockedForReplenisher ? Lock : Clock },
          active: { label: "En Camino", color: "bg-amber-100 text-amber-700", icon: Truck },
          completed: { label: "Finalizada", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 }
        }[sheet.status as keyof typeof statusInfo] || { label: sheet.status, color: "bg-muted", icon: Clock }
        const Icon = statusInfo.icon
        const sheetPlannedTotals = sheet.items?.reduce((acc: any, curr: any) => { acc.cloro += Number(curr.plannedChlorine || 0); acc.acido += Number(curr.plannedAcid || 0); return acc; }, { cloro: 0, acido: 0 }) || { cloro: 0, acido: 0 };
        return (
          <Card key={sheet.id} className={cn("glass-card hover:shadow-md transition-all cursor-pointer group", isLockedForReplenisher && "opacity-60 cursor-not-allowed border-dashed", isCompleted && "opacity-75 grayscale-[0.3] shadow-none border-dashed")} onClick={() => { if (isLockedForReplenisher) { showRestrictedToast(); return; } setSelectedSheetId(sheet.id); setMainView("detail"); }}>
            <CardHeader className="pb-3"><div className="flex justify-between items-start"><Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider w-fit", statusInfo.color)}><Icon className="h-3 w-3 mr-1" /> {statusInfo.label}</Badge>{(isAdmin || (isCommunicator && sheet.status === 'planned')) && !isCompleted && (<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheet); }}><Trash2 className="h-4 w-4" /></Button>)}</div><CardTitle className="text-xl mt-2">{new Date(sheet.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</CardTitle></CardHeader>
            <CardContent className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Clientes:</span><span className="font-bold">{sheet.items?.length || 0}</span></div><div className="grid grid-cols-2 gap-2"><div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-2 py-1.5 rounded-lg shadow-sm"><Droplet className="h-3.5 w-3.5 text-blue-600" /><span className="text-xs font-black text-blue-700 tracking-tighter">{sheetPlannedTotals.cloro} CLORO</span></div><div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-2 py-1.5 rounded-lg shadow-sm"><Beaker className="h-3.5 w-3.5 text-rose-600" /><span className="text-xs font-black text-rose-700 tracking-tighter">{sheetPlannedTotals.acido} ÁCIDO</span></div></div></CardContent>
            <CardFooter className="pt-0"><Button variant="link" className={cn("p-0 h-auto text-xs font-bold", isLockedForReplenisher ? "text-muted-foreground" : "text-primary")}>{isLockedForReplenisher ? 'SOLO LECTURA' : 'VER DETALLE'} <ChevronRight className="h-3 w-3 ml-1" /></Button></CardFooter>
          </Card>
        )
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="no-print w-full flex">
        <Sidebar />
        <SidebarInset className="flex-1 w-full p-4 md:p-8 space-y-6 pb-32 md:pb-8 overflow-x-hidden">
          <header className="flex justify-between items-center"><div className="flex items-center gap-3"><SidebarTrigger className="flex" /><h1 className="text-xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2"><Truck className="h-7 w-7" /> Hojas de Ruta</h1></div>{view === "list" ? (canManageRoutes && (<Button onClick={() => setIsNewSheetOpen(true)} className="shadow-lg font-bold"><Plus className="mr-2 h-4 w-4" /> Nueva Planilla</Button>)) : (<div className="flex gap-2">{!isReplenisher && (<Button type="button" variant="outline" size="icon" onClick={handleShareOrderWhatsApp} className="text-emerald-700 border-emerald-200 bg-emerald-50" title="Copiar pedido"><Copy className="h-4 w-4" /></Button>)}<Button type="button" variant="outline" size="icon" onClick={handleShareLink} className="text-emerald-600 border-emerald-200"><LinkIcon className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" onClick={handlePrint} className="text-primary border-primary/20"><Printer className="h-4 w-4" /></Button>{isAdmin && (<Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setSheetToDelete(selectedSheet)}><Trash2 className="h-5 w-5" /></Button>)}<Button variant="outline" onClick={() => { setMainView("list"); setSelectedSheetId(null); }} className="font-bold">Volver</Button></div>)}</header>
          {view === "list" ? (<Tabs value={listTab || (portalOrdersBadgeCount > 0 ? "orders" : "active")} onValueChange={setListTab} className="space-y-6"><div className="flex items-center justify-between"><TabsList className="bg-muted/50 p-1"><TabsTrigger value="orders" className="font-bold gap-2 relative">Pedidos Portal {(portalOrdersBadgeCount > 0) && <Badge variant="secondary" className="h-5 min-w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-amber-500 text-white">{portalOrdersBadgeCount}</Badge>}</TabsTrigger><TabsTrigger value="active" className="font-bold gap-2">En Curso <Badge variant="secondary" className={cn("h-5 min-w-5 p-0 flex items-center justify-center rounded-full text-[10px]", activeSheets.length > 0 ? "bg-rose-500 text-white" : "")}>{activeSheets.length}</Badge></TabsTrigger><TabsTrigger value="history" className="font-bold gap-2"><History className="h-3.5 w-3.5" /> Historial <Badge variant="outline" className="h-5 min-w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-emerald-500 text-white border-emerald-500">{historySheets.length}</Badge></TabsTrigger></TabsList></div>{loadingSheets ? (<div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>) : (<><TabsContent value="orders">{renderClientRequestsList()}</TabsContent><TabsContent value="active">{activeSheets.length === 0 ? (<Card className="p-20 text-center border-dashed bg-muted/5"><ClipboardList className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-lg font-semibold">Sin rutas en curso</h3></Card>) : renderSheetList(activeSheets)}</TabsContent><TabsContent value="history">{historySheets.length === 0 ? (<Card className="p-20 text-center border-dashed bg-muted/5"><History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" /><h3 className="text-lg font-semibold">Historial vacío</h3></Card>) : renderSheetList(historySheets)}</TabsContent></>)}</Tabs>) : (<div className="space-y-6 animate-in fade-in duration-300 pb-20">{selectedSheet && (<>{renderSheetReviewBanner()}<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div className="space-y-1"><h2 className="text-2xl font-black text-slate-800">Hoja de Ruta: {new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR')}</h2><div className="text-sm text-muted-foreground flex items-center gap-2">Estado: <Badge variant="secondary" className="font-bold uppercase">{selectedSheet.status}</Badge></div></div><div className="flex gap-2 w-full md:w-auto">{selectedSheet.status === 'planned' && (isAdmin || isCommunicator) && (<Button onClick={handleStartRoute} className="bg-amber-500 hover:bg-amber-600 font-bold w-full md:w-auto shadow-lg shadow-amber-200"><Truck className="mr-2 h-4 w-4" /> INICIAR ENTREGA</Button>)}{selectedSheet.status === 'active' && (isAdmin || isCommunicator) && (<Button variant="outline" onClick={handleResetToPlanning} className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold w-full md:w-auto"><RefreshCw className="mr-2 h-4 w-4" /> VOLVER A PLANIFICAR</Button>)}{selectedSheet.status === 'active' && (isAdmin || isReplenisher) && (<Button onClick={handleCompleteRoute} className="bg-emerald-600 hover:bg-emerald-700 font-bold w-full md:w-auto"><CheckCircle2 className="mr-2 h-4 w-4" /> FINALIZAR JORNADA</Button>)}</div></div><div className="space-y-4"><h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> {showProgressLayout ? 'Resumen de Entrega' : 'Carga para Camioneta'}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card className="bg-blue-600 border-none shadow-xl text-white group"><CardContent className="p-6 flex items-center gap-6"><div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"><Droplet className="h-8 w-8 text-white" /></div><div className="flex-1"><p className="text-xs font-black uppercase text-blue-100 tracking-widest">{showProgressLayout ? 'ENTREGA CLORO' : 'TOTAL CLORO'}</p><div className="flex items-baseline gap-3"><h3 className="text-5xl md:text-6xl font-black">{showProgressLayout ? `${loadTotals.realChlorine}/${loadTotals.plannedChlorine}` : loadTotals.plannedChlorine}</h3><p className="text-xs font-bold text-blue-200">Bidones</p></div></div></CardContent></Card><Card className="bg-rose-600 border-none shadow-xl text-white group"><CardContent className="p-6 flex items-center gap-6"><div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"><Beaker className="h-8 w-8 text-white" /></div><div className="flex-1"><p className="text-xs font-black uppercase text-rose-100 tracking-widest">{showProgressLayout ? 'ENTREGA ÁCIDO' : 'TOTAL ÁCIDO'}</p><div className="flex items-baseline gap-3"><h3 className="text-5xl md:text-6xl font-black">{showProgressLayout ? `${loadTotals.realAcid}/${loadTotals.plannedAcid}` : loadTotals.plannedAcid}</h3><p className="text-xs font-bold text-rose-200">Bidones</p></div></div></CardContent></Card></div></div>{isEditingAllowed && (<Card className="p-4 glass-card border-dashed"><div className="flex flex-col md:flex-row gap-4 items-end"><div className="flex-1 space-y-2 pt-4"><Label className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Agregar Cliente</Label><Select onValueChange={addItemToSheet}><SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger><SelectContent className="max-h-96">{(refillClients ?? []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.apellido}, {c.nombre} ({c.direccion})</SelectItem>))}</SelectContent></Select></div></div></Card>)}<div className="space-y-4">{(selectedSheet.items ?? []).length === 0 ? (<div className="text-center py-20 bg-muted/5 border-2 border-dashed rounded-3xl"><p className="text-muted-foreground italic">Agregue clientes para comenzar.</p></div>) : (<div className="grid grid-cols-1 gap-4">{(selectedSheet.items ?? []).map((item: any, idx: number) => { const client = (clients ?? []).find(c => c.id === item.clientId); if (!client) return null; const zone = (zones ?? []).find(z => z.id === client.zonaId); const cloroSub = Number(item.realChlorine || 0) * referencePrices.cloro; const acidoSub = Number(item.realAcid || 0) * referencePrices.acido; const totalSugerido = cloroSub + acidoSub; return (<Card key={idx} className={cn("glass-card border-l-4 transition-all", item.processed ? "border-l-slate-300 opacity-60" : item.isDelivered ? "border-l-emerald-500 bg-emerald-50/20" : "border-l-primary")}><CardContent className="p-4 md:p-6"><div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center"><div className="md:col-span-4 space-y-1"><div className="flex items-center gap-2 mb-1"><h4 className="font-black text-lg leading-tight truncate">{client.apellido}, {client.nombre}</h4>{zone && <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 text-primary border-primary/20">{zone.name}</Badge>}</div><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {client.direccion}</p><div className="flex gap-1.5 mt-2 flex-wrap"><Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" asChild><a href={`tel:${client.telefono}`}><Phone className="h-3 w-3 mr-1" /> LLAMAR</a></Button><Button variant="outline" size="sm" className="h-7 px-2 text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50" onClick={() => handleWhatsApp(client.telefono)}><MessageCircle className="h-3 w-3 mr-1" /> WHATSAPP</Button><Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleOpenEmailDialog(client)}><Mail className="h-3 w-3 mr-1" /> MAIL</Button><Button variant="secondary" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleOpenMaps(client.direccion, client.localidad)}><MapPinned className="h-3 w-3 mr-1" /> MAPA</Button></div></div><div className="md:col-span-5">{selectedSheet.status === 'planned' ? (<div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-blue-700">Cloro (Pedido)</Label><input type="number" className="flex h-10 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800" value={item.plannedChlorine} onChange={(e) => updateItemField(item.clientId, 'plannedChlorine', Number(e.target.value))} /></div><div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-rose-700">Ácido (Pedido)</Label><input type="number" className="flex h-10 w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" value={item.plannedAcid} onChange={(e) => updateItemField(item.clientId, 'plannedAcid', Number(e.target.value))} /></div></div>) : selectedSheet.status === 'active' ? (<div className="grid grid-cols-2 gap-4"><div className="bg-blue-600 p-3 rounded-xl text-center"><p className="text-[9px] font-black text-blue-100 uppercase mb-1">DEBE ENTREGAR</p><p className="text-4xl font-black text-white">{item.plannedChlorine}</p></div><div className="bg-rose-600 p-3 rounded-xl text-center"><p className="text-[9px] font-black text-rose-100 uppercase mb-1">DEBE ENTREGAR</p><p className="text-4xl font-black text-white">{item.plannedAcid}</p></div></div>) : (<div className="grid grid-cols-2 gap-2"><div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center"><p className="text-[8px] font-bold text-blue-600 uppercase">Cloro</p><span className="text-lg font-black text-blue-800">{item.realChlorine} / {item.plannedChlorine}</span></div><div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-center"><p className="text-[8px] font-bold text-rose-600 uppercase">Ácido</p><span className="text-lg font-black text-rose-800">{item.realAcid} / {item.plannedAcid}</span></div></div>)}</div><div className="md:col-span-3 flex flex-col gap-2">{isEditingAllowed && (<div className="space-y-2"><Input value={item.others} onChange={(e) => updateItemField(item.clientId, 'others', e.target.value)} placeholder="Notas..." className="h-8 text-xs" /><Button variant="ghost" size="sm" className="text-destructive font-bold w-full h-7" onClick={() => removeItemFromSheet(item.clientId)}><Minus className="h-3 w-3 mr-1" /> QUITAR</Button></div>)}{selectedSheet.status === 'completed' && (<div className="flex flex-col gap-2">{isAdmin && (<div className="flex flex-row gap-2"><Button className="flex-1 bg-primary font-black text-[10px]" disabled={item.processed} onClick={() => handleGenerateTransaction(item)}>{item.processed ? 'OPERADO' : 'OPERAR'}</Button>{!item.processed && (<Button variant="outline" size="icon" onClick={() => markAsProcessed(item.clientId)}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>)}</div>)}<div className="flex flex-col gap-1 mt-1"><Badge variant="outline" className={cn("text-[9px] flex-1 justify-center", item.liquidadoRepositor ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200")}>{item.liquidadoRepositor ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />} REP: {item.liquidadoRepositor ? 'LIQUIDADO' : 'PENDIENTE'}</Badge><Badge variant="outline" className={cn("text-[9px] flex-1 justify-center", item.liquidadoComunicador ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200")}>{item.liquidadoComunicador ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />} COM: {item.liquidadoComunicador ? 'LIQUIDADO' : 'PENDIENTE'}</Badge></div></div>)}{selectedSheet.status === 'active' && (<div className="flex flex-col gap-2 mt-4 md:mt-0"><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[10px] font-bold text-blue-700">Entregó Cloro</Label><Input type="number" disabled={item.processed || (!isAdmin && !isReplenisher)} value={item.realChlorine} onChange={(e) => updateItemField(item.clientId, 'realChlorine', Number(e.target.value))} className="h-10 font-black text-center border-blue-300" /></div><div className="space-y-1"><Label className="text-[10px] font-bold text-rose-700">Entregó Ácido</Label><Input type="number" disabled={item.processed || (!isAdmin && !isReplenisher)} value={item.realAcid} onChange={(e) => updateItemField(item.clientId, 'realAcid', Number(e.target.value))} className="h-10 font-black text-center border-rose-300" /></div></div><div className="flex flex-col gap-1 mt-1"><div className="flex items-center justify-between px-2 bg-emerald-50/50 rounded-t-lg py-1 border border-emerald-100"><Label className="text-[10px] font-black uppercase text-muted-foreground">SUGERIDO</Label><span className="text-base font-black text-emerald-700">${totalSugerido.toLocaleString()}</span></div><div className="flex gap-2 items-end"><Input type="number" disabled={item.processed || (!isAdmin && !isReplenisher)} placeholder="Cobró ($)" value={item.cashCollected || ""} onChange={(e) => updateItemField(item.clientId, 'cashCollected', Number(e.target.value))} className="h-12 bg-white border-emerald-400 text-center font-black text-emerald-700 text-xl" />{!item.isDelivered && (isAdmin || isReplenisher) && (<Button className="h-12 w-12 bg-emerald-600 shrink-0 shadow-lg" onClick={() => loadPlannedToReal(item.clientId)}><Check className="h-6 w-6" /></Button>)}</div></div></div>)}</div></div></CardContent></Card>)})}</div>)}</div></>)}</div>)}</SidebarInset><MobileNav /></div>
      {selectedSheet && (<div className="print-only w-full p-4 font-sans text-slate-900 bg-white"><div className="flex justify-between items-start border-b border-slate-900 pb-2 mb-4"><div><h1 className="text-xl font-black uppercase">Hoja de Ruta</h1><p className="text-sm font-bold">Fecha: {new Date(selectedSheet.date + 'T12:00:00').toLocaleDateString('es-AR')}</p></div></div><table className="w-full border-collapse border border-slate-900 text-xs"><thead><tr className="bg-slate-900 text-white"><th className="border border-slate-900 p-1 text-left uppercase">Cliente</th><th className="border border-slate-900 p-1 text-center uppercase w-16">Cloro</th><th className="border border-slate-900 p-1 text-center uppercase w-16">Ácido</th><th className="border border-slate-900 p-1 text-left uppercase">Notas</th></tr></thead><tbody>{(selectedSheet.items ?? []).map((item: any, idx: number) => { const c = clients?.find(cl => cl.id === item.clientId); if (!c) return null; return (<tr key={idx} className="border-b border-slate-300"><td className="border border-slate-900 p-2"><p className="font-black">{c.apellido}, {c.nombre}</p><p className="text-[10px]">{c.direccion}</p></td><td className="border border-slate-900 p-1 text-center font-black">{item.plannedChlorine}</td><td className="border border-slate-900 p-1 text-center font-black">{item.plannedAcid}</td><td className="border border-slate-900 p-1"></td></tr>) })}</tbody></table></div>)}

      <Dialog open={isNewSheetOpen} onOpenChange={setIsNewSheetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Planilla de Ruta</DialogTitle>
            <DialogDescription>Seleccioná la fecha de la entrega para comenzar a planificar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="sheet-date">Fecha de entrega</Label>
            <Input
              id="sheet-date"
              type="date"
              value={newSheetDate}
              onChange={(e) => setNewSheetDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSheet} className="font-bold">Crear Planilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!sheetToDelete} onOpenChange={(open) => !open && setSheetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar planilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará la hoja de ruta del {sheetToDelete?.date ? new Date(sheetToDelete.date + 'T12:00:00').toLocaleDateString('es-AR') : '—'}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSheet} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function RoutesPage() {
  return (<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><RoutesContent /></Suspense>)
}
