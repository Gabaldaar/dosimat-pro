"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebase, useUser } from "../../firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Droplets, RefreshCw } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import Link from "next/link"
import { getHomeRouteForRole, normalizeEmail } from "@/lib/auth-routing"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { auth, firestore } = useFirebase()
  const { user, userData } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user && userData?.role) {
      router.replace(getHomeRouteForRole(userData.role))
    }
  }, [user, userData, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (!name.trim()) {
      toast({ title: "Error", description: "Por favor ingresa tu nombre completo.", variant: "destructive" })
      return
    }

    if (password.length < 6) {
      toast({ title: "Contraseña muy corta", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const normalizedEmail = normalizeEmail(email)
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      const newUser = userCredential.user
      const db = firestore!

      let matchedClientId = null;
      let isClient = false;
      try {
        const res = await fetch('/api/portal/lookup-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isClient && data.clientId) {
            matchedClientId = data.clientId;
            isClient = true;
          }
        }
      } catch (err) {
        console.error("Lookup error during registration", err);
      }

      const userProfile: Record<string, string> = {
        id: newUser.uid,
        email: normalizedEmail,
        name: name.trim(),
        role: isClient ? 'Client' : 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (isClient && matchedClientId) {
        userProfile.clientId = matchedClientId
      }

      await setDoc(doc(db, 'users', newUser.uid), userProfile)

      if (isClient) {
        toast({ 
          title: "¡Bienvenido!", 
          description: "Tu cuenta de cliente fue activada. Entrando al portal...",
        })
        router.push('/portal')
      } else {
        toast({ 
          title: "Registro Exitoso", 
          description: "Tu cuenta ha sido creada. Un administrador revisará tu acceso.",
        })
        router.push('/')
      }
    } catch (error: any) {
      console.error("Register Error:", error);
      let message = "No se pudo crear la cuenta."
      if (error.code === 'auth/email-already-in-use') {
        message = "El email ya está registrado."
      } else if (error.code === 'auth/invalid-email') {
        message = "El formato del email no es válido."
      } else if (error.code === 'auth/weak-password') {
        message = "La contraseña es muy débil."
      }
      toast({ title: "Error de Registro", description: message, variant: "destructive" })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
      <Card className="w-full max-w-[400px] border-none shadow-xl rounded-3xl overflow-hidden p-6">
        <CardHeader className="text-center space-y-4 pt-4 pb-6">
          <div className="flex justify-center">
            <div className="bg-[#1D77FF] p-4 rounded-[22px] shadow-lg shadow-blue-200">
              <Droplets className="h-10 w-10 text-white fill-white/20" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-4xl font-bold tracking-tight text-[#1A1F36]">Dosimat Pro</CardTitle>
            <CardDescription className="text-[#697386] font-medium text-sm">Crea tu cuenta de colaborador o cliente</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#1A1F36] ml-1">Nombre Completo</Label>
              <Input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ej: Juan Pérez"
                required 
                className="h-14 bg-[#EDF2F7] border-none rounded-2xl px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#1A1F36] ml-1">Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="usuario@dosimat.pro"
                required 
                className="h-14 bg-[#EDF2F7] border-none rounded-2xl px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#1A1F36] ml-1">Contraseña</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••••"
                required 
                className="h-14 bg-[#EDF2F7] border-none rounded-2xl px-4 text-base focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-16 bg-[#1D77FF] hover:bg-[#1565D8] text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-100 transition-all mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-6 w-6 animate-spin" />
              ) : (
                "Registrarse"
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link href="/login" className="text-[#1D77FF] font-semibold text-sm hover:underline">
              ¿Ya tienes cuenta? Ingresa aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
