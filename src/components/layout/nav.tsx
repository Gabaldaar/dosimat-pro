"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/catalog", label: "Catálogo", icon: Package },
  { href: "/notifications", label: "IA Notificaciones", icon: Bell },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={cn("flex flex-col h-full bg-white border-r", className)}>
      <div className="p-6 flex items-center gap-2">
        <div className="bg-primary p-2 rounded-lg">
          <Droplets className="h-6 w-6 text-white" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight text-primary">ChloriTrack<span className="text-accent-foreground font-medium">Pro</span></span>
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
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://picsum.photos/seed/admin/100/100" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Admin User</span>
            <span className="text-xs text-muted-foreground">Administrador</span>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
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
      {navItems.slice(0, 5).map((item) => (
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