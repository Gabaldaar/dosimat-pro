
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  ArrowLeftRight, 
  Package, 
  Wallet, 
  Bell, 
  Settings,
  Menu,
  Droplets,
  LogOut,
  User,
  Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/transactions", label: "Operaciones", icon: ArrowLeftRight },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/catalog", label: "Catálogo", icon: Package },
  { href: "/team", label: "Equipo", icon: Shield },
  { href: "/notifications", label: "IA Notificaciones", icon: Bell },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { auth, firestore, user } = useFirebase()
  const router = useRouter()

  // Obtenemos el perfil real del usuario desde Firestore
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore])
  const { data: userData } = useDoc(userDocRef)
  
  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  return (
    <div className={cn("flex flex-col h-full bg-white border-r", className)}>
      <div className="p-6 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <Droplets className="h-6 w-6 text-white" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight text-primary">Dosimat<span className="text-accent-foreground font-medium">Pro</span></span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
              pathname === item.href 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{userData?.name || user.email?.split('@')[0]}</span>
              <span className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">
                {userData?.role || 'Cargando...'}
              </span>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex items-center justify-around px-2 py-3 md:hidden">
      {navItems.slice(0, 4).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-md transition-all",
            pathname === item.href ? "text-primary" : "text-muted-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar className="w-full border-none" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
