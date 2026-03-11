"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebase, setDocumentNonBlocking, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, getDocs, collection, query, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplets, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { auth, firestore } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "Bienvenido", description: "Iniciando sesión..." })
        router.push("/")
      } else {
        // Verificar si es el primer usuario del sistema
        const usersSnap = await getDocs(query(collection(firestore, 'users'), limit(1)))
        const isFirstUser = usersSnap.empty
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        
        // El primer usuario es Admin, los demás son Employee
        const initialRole = isFirstUser ? 'Admin' : 'Employee'
        const initialRoleId = isFirstUser ? 'admin' : 'staff'

        setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          id: user.uid,
          name: name || email.split('@')[0],
          email: email,
          role: initialRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true })

        setDocumentNonBlocking(doc(firestore, 'user_roles', user.uid), {
          roleIds: [initialRoleId]
        }, { merge: true })
        
        toast({ 
          title: isFirstUser ? "Cuenta de Administrador creada" : "Cuenta creada", 
          description: isFirstUser 
            ? "Has sido registrado como el primer administrador del sistema." 
            : "Has sido registrado como Empleado. Un administrador debe autorizar tu nivel de acceso." 
        })
        router.push("/")
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      let message = "Verifica tus datos o regístrate si no tienes cuenta."
      
      if (error.code === 'auth/invalid-credential') {
        message = "Email o contraseña incorrectos."
      } else if (error.code === 'auth/user-not-found') {
        message = "Usuario no encontrado. Por favor, regístrate."
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Este email ya está en uso."
      }
      
      toast({ 
        title: "Error de acceso", 
        description: message,
        variant: "destructive" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card border-primary/20 shadow-2xl">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <Droplets className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold font-headline tracking-tight">Dosimat Pro</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? "Ingresa tus credenciales para continuar" : "Crea tu cuenta de colaborador"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Juan Pérez" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="usuario@dosimat.pro" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-bold h-12" disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {isLogin ? "Iniciar Sesión" : "Registrarse"}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              className="text-sm text-primary" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Ingresa aquí"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}