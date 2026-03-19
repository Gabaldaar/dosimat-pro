
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNav } from "@/components/layout/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CheckCircle2,
  Droplets,
  Loader2,
  MessageSquare,
  Truck,
  Info
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

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null)
  
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db])
  const { data: team, isLoading } = useCollection(usersQuery)

  const handleUpdateRole = (userId: string, newRole: string) => {
    if (!isAdmin) {
      toast({ title: "Acceso denegado", variant: "destructive" })
      return
    }

    updateDocumentNonBlocking(doc(db, 'users', userId), { 
      role: newRole,
      updatedAt: new Date().toISOString()
    })
    setDocumentNonBlocking(doc(db, 'user_roles', userId), { 
      roleIds: [newRole.toLowerCase()] 
    }, { merge: true })

    toast({ title: `Rol actualizado a ${roleDisplay[newRole]?.label || newRole}` })
  }

  const handleBlockUser = (userId: string) => {
    if (!isAdmin || userId === currentUser?.uid) return;
    handleUpdateRole(userId, 'Blocked');
  }

  const confirmDeleteMember = () => {
    if (!isAdmin || !memberToDelete) return
    
    // Eliminar de perfiles de usuario
    deleteDocumentNonBlocking(doc(db, 'users', memberToDelete.id))
    // Eliminar de asignación de roles/seguridad
    deleteDocumentNonBlocking(doc(db, 'user_roles', memberToDelete.id))
    
    setMemberToDelete(null)
    toast({ title: "Miembro eliminado", description: "El acceso y el perfil han sido borrados." })
  }

  const sortedTeam = useMemo(() => {
    if (!team) return [];
    return [...team].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [team]);

  const pendingCount = useMemo(() => team?.filter(m => m.role === 'Pending').length || 0, [team]);

  if (isUserLoading || userData?.role === 'Replenisher' || userData?.role === 'Communicator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          {userData?.role === 'Replenisher' ? 'Redirigiendo a Rutas...' : 
           userData?.role === 'Communicator' ? 'Redirigiendo a Clientes...' : 
           'Accediendo...'}
        </p>
      </div>
    )
  }

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
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} onDelete={setMemberToDelete} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Pending').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} onDelete={setMemberToDelete} />
            ))}
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Blocked').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} onDelete={setMemberToDelete} />
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar colaborador</DialogTitle>
              <DialogDescription className="pt-4 space-y-4 text-sm leading-relaxed">
                Pide a tu colaborador que se registre con su email en la pantalla de inicio. Luego aparecerá en tu pestaña de <b>"Pendientes"</b> para que le asignes un rol.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter><Button onClick={() => setIsInviteOpen(false)} className="w-full font-bold">Entendido</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!memberToDelete} onOpenChange={(o) => !o && setMemberToDelete(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="h-5 w-5" /> ¿Confirmar eliminación de acceso?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 text-sm">
                <p>Se borrará el perfil y los permisos de <b>{memberToDelete?.name || memberToDelete?.email}</b>. Perderá acceso inmediato al sistema.</p>
                
                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex gap-3">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Aviso sobre el email:</p>
                    <p className="italic text-[11px] leading-relaxed">
                      El registro de login (email/password) permanecerá en la base de datos de seguridad. Si el usuario intenta entrar de nuevo, el sistema le pedirá solicitar acceso otra vez. <br/><br/>
                      Si deseas liberar el email por completo o borrar su contraseña permanentemente, deberás hacerlo manualmente desde la <b>Consola de Firebase</b>.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteMember} className="bg-destructive text-destructive-foreground font-bold">Eliminar definitivamente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
      <MobileNav />
    </div>
  )
}

function MemberCard({ member, isAdmin, currentUid, onUpdateRole, onBlock, onDelete }: any) {
  const roleInfo = roleDisplay[member.role] || { label: member.role, icon: UserCircle, color: 'secondary' };
  const Icon = roleInfo.icon;
  const isMe = member.id === currentUid;

  return (
    <Card className={cn("glass-card border-l-4 transition-all hover:shadow-md", isMe ? "border-l-primary" : "border-l-muted")}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 border border-muted">
            <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
            <AvatarFallback className="bg-primary/5 text-primary font-bold">{member.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{member.name || member.email} {isMe && "(Tú)"}</h3>
              <Badge variant={roleInfo.color as any} className="text-[9px] uppercase font-black tracking-widest h-5">
                <Icon className="h-2.5 w-2.5 mr-1" />{roleInfo.label}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">{member.email}</p>
          </div>
        </div>

        {isAdmin && !isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Replenisher')} className="text-xs font-medium"><Truck className="mr-2 h-4 w-4" /> Hacer Repositor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Communicator')} className="text-xs font-medium"><MessageSquare className="mr-2 h-4 w-4" /> Hacer Comunicador</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Employee')} className="text-xs font-medium"><UserCircle className="mr-2 h-4 w-4" /> Hacer Empleado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Admin')} className="text-xs font-medium"><ShieldCheck className="mr-2 h-4 w-4" /> Hacer Admin</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-amber-600 text-xs font-medium" onClick={() => onBlock(member.id)}><Ban className="mr-2 h-4 w-4" /> Bloquear acceso</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive font-bold text-xs" onClick={() => onDelete(member)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar definitivamente</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
