
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  ShieldCheck, 
  UserCircle, 
  MoreVertical,
  Trash2,
  ShieldAlert,
  UserPlus,
  Clock,
  Ban,
  Droplets,
  Loader2,
  MessageSquare,
  Truck,
  Info,
  Coins,
  Save,
  ChevronRight,
  Settings2,
  Calculator
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser } from "../../firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "../../hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const roleDisplay: Record<string, { label: string, icon: any, color: string }> = {
  'Admin': { label: 'Administrador', icon: ShieldCheck, color: 'default' },
  'Employee': { label: 'Empleado', icon: UserCircle, color: 'secondary' },
  'Communicator': { label: 'Comunicador', icon: MessageSquare, color: 'outline' },
  'Replenisher': { label: 'Repositor', icon: Truck, color: 'secondary' },
  'Pending': { label: 'Pendiente', icon: Clock, color: 'outline' },
  'Blocked': { label: 'Bloqueado', icon: Ban, color: 'destructive' }
}

export default function TeamPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  const { user: currentUser, userData, isUserLoading } = useUser()
  const isAdmin = userData?.role === 'Admin'

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null)
  const [editingFees, setEditingFees] = useState<any | null>(null)
  
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const { data: team, isLoading } = useCollection(usersQuery)

  const [feesFormData, setFeesFormData] = useState({
    valorCloro: 0,
    valorAcido: 0,
    valorHora: 0,
    valorKm: 0,
    baseFija: 0
  })

  const handleUpdateRole = (userId: string, newRole: string) => {
    if (!isAdmin) return
    updateDocumentNonBlocking(doc(db, 'users', userId), { 
      role: newRole,
      updatedAt: new Date().toISOString()
    })
    toast({ title: `Rol actualizado` })
  }

  const handleOpenFees = (member: any) => {
    setEditingFees(member)
    setFeesFormData({
      valorCloro: member.feesConfig?.valorCloro ?? 0,
      valorAcido: member.feesConfig?.valorAcido ?? 0,
      valorHora: member.feesConfig?.valorHora ?? 0,
      valorKm: member.feesConfig?.valorKm ?? 0,
      baseFija: member.feesConfig?.baseFija ?? 0
    })
  }

  const handleSaveFees = () => {
    if (!editingFees) return
    updateDocumentNonBlocking(doc(db, 'users', editingFees.id), {
      feesConfig: feesFormData,
      updatedAt: new Date().toISOString()
    })
    setEditingFees(null)
    toast({ title: "Honorarios configurados" })
  }

  const sortedTeam = useMemo(() => {
    if (!team) return [];
    return [...team].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [team]);

  const pendingCount = useMemo(() => team?.filter(m => m.role === 'Pending').length || 0, [team]);

  if (isUserLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <SidebarInset className="flex-1 w-full pb-32 md:pb-8 p-4 md:p-8 space-y-6 overflow-x-hidden">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="flex" />
            <h1 className="text-xl md:text-3xl font-headline font-bold text-primary">Equipo</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsInviteOpen(true)} className="font-bold gap-2">
              <UserPlus className="h-4 w-4" /> Invitar
            </Button>
          )}
        </header>

        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4 items-center">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs font-medium text-slate-700">
            <b>Configuración de Pagos:</b> Pulsa el botón <b>"Honorarios"</b> en cada colaborador para definir cuánto se le abona por bidón entregado, por hora de servicio técnico o su sueldo base.
          </p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-muted/50 p-1 mb-6">
            <TabsTrigger value="active" className="font-bold">Activos</TabsTrigger>
            <TabsTrigger value="pending" className="font-bold relative">
              Pendientes 
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="blocked" className="font-bold">Bloqueados</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {sortedTeam.filter(m => ['Admin', 'Employee', 'Communicator', 'Replenisher'].includes(m.role)).map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onDelete={setMemberToDelete} onEditFees={handleOpenFees} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Pending').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onDelete={setMemberToDelete} onEditFees={handleOpenFees} />
            ))}
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Blocked').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onDelete={setMemberToDelete} onEditFees={handleOpenFees} />
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editingFees} onOpenChange={(o) => !o && setEditingFees(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Coins className="h-5 w-5" />
                <DialogTitle>Configurar Honorarios</DialogTitle>
              </div>
              <DialogDescription>Define los valores de retribución para <b>{editingFees?.name}</b>. Estos valores se usarán para calcular sus liquidaciones mensuales automáticamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Bidón Cloro ($)</Label>
                  <Input type="number" value={feesFormData.valorCloro} onChange={(e) => setFeesFormData({...feesFormData, valorCloro: Number(e.target.value)})} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Bidón Ácido ($)</Label>
                  <Input type="number" value={feesFormData.valorAcido} onChange={(e) => setFeesFormData({...feesFormData, valorAcido: Number(e.target.value)})} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor Hora ($)</Label>
                  <Input type="number" value={feesFormData.valorHora} onChange={(e) => setFeesFormData({...feesFormData, valorHora: Number(e.target.value)})} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor KM ($)</Label>
                  <Input type="number" value={feesFormData.valorKm} onChange={(e) => setFeesFormData({...feesFormData, valorKm: Number(e.target.value)})} className="font-bold" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-[10px] font-black uppercase text-primary">Sueldo Base / Fijo Mensual ($)</Label>
                <Input type="number" className="h-12 text-xl font-black border-primary/30" value={feesFormData.baseFija} onChange={(e) => setFeesFormData({...feesFormData, baseFija: Number(e.target.value)})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFees(null)}>Cancelar</Button>
              <Button onClick={handleSaveFees} className="gap-2 bg-primary font-bold"><Save className="h-4 w-4" /> Guardar Configuración</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!memberToDelete} onOpenChange={(o) => !o && setMemberToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
              <AlertDialogDescription>Se borrará el acceso de {memberToDelete?.name}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(db, 'users', memberToDelete.id)); setMemberToDelete(null); }} className="bg-destructive">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}

function MemberCard({ member, isAdmin, currentUid, onUpdateRole, onDelete, onEditFees }: any) {
  const roleInfo = roleDisplay[member.role] || { label: member.role, icon: UserCircle, color: 'secondary' };
  const Icon = roleInfo.icon;
  const isMe = member.id === currentUid;

  const hasFees = member.feesConfig && (
    member.feesConfig.valorCloro > 0 || 
    member.feesConfig.valorAcido > 0 || 
    member.feesConfig.baseFija > 0
  );

  return (
    <Card className={cn("glass-card border-l-4 transition-all hover:shadow-md", isMe ? "border-l-primary" : "border-l-muted")}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-muted shadow-sm">
            <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
            <AvatarFallback className="bg-primary/5 text-primary font-bold text-lg">{member.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base leading-none">{member.name || member.email} {isMe && "(Tú)"}</h3>
              <Badge variant={roleInfo.color as any} className="text-[9px] uppercase font-black tracking-widest h-5 px-2">
                <Icon className="h-2.5 w-2.5 mr-1" />{roleInfo.label}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">{member.email}</p>
            
            {hasFees && (
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[8px] font-black bg-blue-50/50 text-blue-700 border-blue-100">
                  CL: ${member.feesConfig.valorCloro} | AC: ${member.feesConfig.valorAcido}
                </Badge>
                {member.feesConfig.baseFija > 0 && (
                  <Badge variant="outline" className="text-[8px] font-black bg-emerald-50/50 text-emerald-700 border-emerald-100">
                    FIJO: ${member.feesConfig.baseFija.toLocaleString()}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-9 gap-2 font-bold text-[10px] uppercase transition-all",
                hasFees ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-primary/30 text-primary hover:bg-primary/5"
              )} 
              onClick={() => onEditFees(member)}
            >
              <Settings2 className="h-3.5 w-3.5" /> {hasFees ? 'Honorarios' : 'Config. Honorarios'}
            </Button>
          )}
          {isAdmin && !isMe && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4 text-muted-foreground" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-bold">
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Replenisher')}><Truck className="mr-2 h-4 w-4" /> Hacer Repositor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Communicator')}><MessageSquare className="mr-2 h-4 w-4" /> Hacer Comunicador</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Employee')}><UserCircle className="mr-2 h-4 w-4" /> Hacer Empleado</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Admin')}><ShieldCheck className="mr-2 h-4 w-4" /> Hacer Admin</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive font-black" onClick={() => onDelete(member)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
