
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
  Truck
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
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
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

  useEffect(() => {
    if (!isUserLoading && userData?.role === 'Communicator') {
      router.replace('/customers')
    }
  }, [userData, isUserLoading, router])

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  
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

  const sortedTeam = useMemo(() => {
    if (!team) return [];
    return [...team].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [team]);

  const pendingCount = useMemo(() => team?.filter(m => m.role === 'Pending').length || 0, [team]);

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Pending').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
            ))}
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            {sortedTeam.filter(m => m.role === 'Blocked').map((member: any) => (
              <MemberCard key={member.id} member={member} isAdmin={isAdmin} currentUid={currentUser?.uid} onUpdateRole={handleUpdateRole} onBlock={handleBlockUser} />
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar colaborador</DialogTitle>
              <DialogDescription className="pt-4 space-y-4">
                Pide a tu colaborador que se registre con su email en la pantalla de inicio. Luego aparecerá en la pestaña de <b>"Pendientes"</b>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter><Button onClick={() => setIsInviteOpen(false)} className="w-full">Entendido</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
      <MobileNav />
    </div>
  )
}

function MemberCard({ member, isAdmin, currentUid, onUpdateRole, onBlock }: any) {
  const roleInfo = roleDisplay[member.role] || { label: member.role, icon: UserCircle, color: 'secondary' };
  const Icon = roleInfo.icon;
  const isMe = member.id === currentUid;

  return (
    <Card className={cn("glass-card border-l-4", isMe ? "border-l-primary" : "border-l-muted")}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
            <AvatarFallback>{member.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{member.name || member.email} {isMe && "(Tú)"}</h3>
              <Badge variant={roleInfo.color as any} className="text-[9px] uppercase"><Icon className="h-2.5 w-2.5 mr-1" />{roleInfo.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>

        {isAdmin && !isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Replenisher')}><Truck className="mr-2 h-4 w-4" /> Hacer Repositor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Communicator')}><MessageSquare className="mr-2 h-4 w-4" /> Hacer Comunicador</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Employee')}><UserCircle className="mr-2 h-4 w-4" /> Hacer Empleado</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'Admin')}><ShieldCheck className="mr-2 h-4 w-4" /> Hacer Admin</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={() => onBlock(member.id)}><Ban className="mr-2 h-4 w-4" /> Bloquear</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
