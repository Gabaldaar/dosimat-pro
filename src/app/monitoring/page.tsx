"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/nav"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
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
  Activity, 
  Search, 
  Calendar, 
  Smartphone, 
  Laptop, 
  Globe, 
  RefreshCw, 
  Trash2,
  ChevronRight,
  Droplets,
  ArrowRight,
  LogOut,
  Info
} from "lucide-react"

// Helper parsing User Agent into simplified Device/OS/Browser
function parseUserAgent(ua: string) {
  if (!ua) return { type: "Desconocido", icon: Globe, name: "Dispositivo Genérico" }
  const uaLower = ua.toLowerCase()
  
  let type = "Desktop"
  let icon = Laptop
  let name = "Windows"

  if (uaLower.includes("android")) {
    type = "Mobile"
    icon = Smartphone
    name = "Android"
  } else if (uaLower.includes("iphone") || uaLower.includes("ipad")) {
    type = "Mobile"
    icon = Smartphone
    name = "iOS"
  } else if (uaLower.includes("macintosh")) {
    name = "macOS"
  } else if (uaLower.includes("linux")) {
    name = "Linux"
  }

  let browser = "Navegador"
  if (uaLower.includes("chrome") || uaLower.includes("crios")) {
    browser = "Chrome"
  } else if (uaLower.includes("safari")) {
    browser = "Safari"
  } else if (uaLower.includes("firefox")) {
    browser = "Firefox"
  } else if (uaLower.includes("edge")) {
    browser = "Edge"
  }

  return { type, icon, name: `${name} (${browser})` }
}

const actionStyles: Record<string, string> = {
  "Ingreso al Portal": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Envío de Pedido": "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Edición de Pedido": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Anulación de Pedido": "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Cierre de Sesión": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
}

export default function MonitoringPage() {
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const { userData, isUserLoading } = useUser()
  const isStaff = useMemo(() => userData && ['Admin', 'Employee', 'Collaborator', 'Communicator', 'Replenisher'].includes(userData.role), [userData])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  // Redirección por Rol si no es staff
  useEffect(() => {
    if (!isUserLoading && userData) {
      if (userData.role === 'Replenisher') {
        router.replace('/routes')
      } else if (userData.role === 'Communicator') {
        router.replace('/customers')
      } else if (userData.role === 'Client') {
        router.replace('/portal')
      }
    }
  }, [userData, isUserLoading, router])

  const logsQuery = useMemoFirebase(() => {
    if (!isStaff) return null
    return query(collection(db, 'portal_activity_logs'), orderBy('timestamp', 'desc'), limit(100))
  }, [db, isStaff])

  const { data: logs, isLoading: loadingLogs } = useCollection(logsQuery)

  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter(log => {
      const matchSearch = 
        !searchTerm || 
        log.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchAction = actionFilter === "all" || log.action === actionFilter

      const logDate = log.timestamp?.split('T')[0]
      const matchDate = !dateFilter || logDate === dateFilter

      return matchSearch && matchAction && matchDate
    })
  }, [logs, searchTerm, actionFilter, dateFilter])

  const isAllSelected = useMemo(() => {
    return filteredLogs.length > 0 && filteredLogs.every(log => selectedIds.includes(log.id))
  }, [filteredLogs, selectedIds])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filteredLogs.map(l => l.id)
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      const newIds = filteredLogs.map(l => l.id)
      setSelectedIds(prev => Array.from(new Set([...prev, ...newIds])))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'portal_activity_logs', id))
      }
      setSelectedIds([])
      toast({ title: "Registros eliminados", description: "Se han borrado los registros seleccionados con éxito." })
    } catch (error) {
      console.error("Error deleting logs:", error)
      toast({ title: "Error", description: "No se pudieron eliminar los registros.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  const actionTypes = useMemo(() => {
    if (!logs) return []
    const set = new Set<string>()
    logs.forEach(log => {
      if (log.action) set.add(log.action)
    })
    return Array.from(set)
  }, [logs])

  if (isUserLoading || loadingLogs) {
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
        <header className="flex items-center gap-4">
          <SidebarTrigger className="flex" />
          <div className="flex items-center gap-2 md:hidden pr-2 border-r">
             <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
               <Droplets className="h-4 w-4 text-white" />
             </div>
             <span className="font-headline font-black text-primary text-sm tracking-tight uppercase">DosimatPro</span>
          </div>
          <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Monitoreo de Clientes</h1>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {/* Filtros */}
          <Card className="glass-card shadow-sm border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Buscar Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background border rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Acción</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="bg-background border rounded-xl">
                      <SelectValue placeholder="Todas las acciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las acciones</SelectItem>
                      {actionTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="pl-9 bg-background border rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setActionFilter("all")
                      setDateFilter("")
                    }}
                    className="w-full rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Logs */}
          <Card className="glass-card shadow-md border overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Historial de Accesos y Acciones
                  </CardTitle>
                  <CardDescription>
                    Registros en tiempo real del portal de autogestión de clientes.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="font-bold flex items-center gap-2 rounded-xl h-8 px-3 transition-all"
                      onClick={() => setShowConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar ({selectedIds.length})
                    </Button>
                  )}
                  <Badge variant="secondary" className="font-bold">
                    {filteredLogs.length} registros
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-12 pl-6 py-4">
                        <Checkbox 
                          checked={isAllSelected}
                          onCheckedChange={handleToggleSelectAll}
                          aria-label="Seleccionar todo"
                        />
                      </TableHead>
                      <TableHead className="font-bold text-xs text-muted-foreground uppercase py-4">Cliente / Usuario</TableHead>
                      <TableHead className="font-bold text-xs text-muted-foreground uppercase py-4">Acción Realizada</TableHead>
                      <TableHead className="font-bold text-xs text-muted-foreground uppercase py-4">Fecha y Hora</TableHead>
                      <TableHead className="font-bold text-xs text-muted-foreground uppercase py-4">Dispositivo / Sistema</TableHead>
                      <TableHead className="font-bold text-xs text-muted-foreground uppercase pr-6 py-4">Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No se encontraron registros que coincidan con la búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const device = parseUserAgent(log.device)
                        const DeviceIcon = device.icon
                        const style = actionStyles[log.action] || "bg-slate-100 text-slate-700"
                        const localTime = log.timestamp 
                          ? new Date(log.timestamp).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })
                          : "-"

                        return (
                          <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="w-12 pl-6 py-4">
                              <Checkbox 
                                checked={selectedIds.includes(log.id)}
                                onCheckedChange={() => handleToggleSelect(log.id)}
                                aria-label={`Seleccionar log de ${log.clientName}`}
                              />
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-slate-800">{log.clientName || "Cliente Desconocido"}</span>
                                <span className="text-xs text-muted-foreground">{log.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className={`rounded-lg px-2.5 py-1 font-bold text-[11px] border-none shadow-none uppercase ${style}`}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-sm font-semibold text-slate-600">
                              {localTime}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 text-slate-700" title={log.device}>
                                <DeviceIcon className="h-4 w-4 text-slate-500" />
                                <span className="text-xs font-medium">{device.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 py-4 text-xs font-semibold text-slate-500 max-w-[250px] truncate">
                              {log.details ? (
                                <span className="flex items-center gap-1" title={log.details}>
                                  <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  {log.details}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
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
        </div>
      </SidebarInset>

      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">¿Confirmas la eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán de forma permanente {selectedIds.length} {selectedIds.length === 1 ? 'registro' : 'registros'} de actividad del historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSelected} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
