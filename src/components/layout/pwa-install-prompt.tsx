"use client"

import React, { useState, useEffect } from "react"
import { X, Download, Share, PlusSquare, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // 1. Verificar si la app ya está instalada / ejecutándose en modo standalone
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // 2. Verificar si el usuario la rechazó recientemente (ocultar por 24 horas)
    const dismissedTime = localStorage.getItem("pwa_prompt_dismissed")
    if (dismissedTime) {
      const now = new Date().getTime()
      const oneDay = 24 * 60 * 60 * 1000
      if (now - Number(dismissedTime) < oneDay) {
        return
      }
    }

    // 3. Detectar si es iOS (Safari)
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    if (isAppleDevice && isSafari) {
      setIsIOS(true)
      // En iOS no hay beforeinstallprompt, por lo que mostramos el banner después de unos segundos
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 5000)
      return () => clearTimeout(timer)
    }

    // 4. Capturar el evento beforeinstallprompt para navegadores compatibles (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      console.log("El usuario aceptó instalar la PWA")
      setIsVisible(false)
    } else {
      console.log("El usuario rechazó instalar la PWA")
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setShowIosGuide(false)
    // Guardar marca de tiempo del rechazo
    localStorage.setItem("pwa_prompt_dismissed", new Date().getTime().toString())
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9999] animate-in slide-in-from-bottom duration-300">
      <Card className="glass-card border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-3xl p-5 border border-primary/10 overflow-hidden relative">
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <CardContent className="p-0 flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl text-primary shrink-0">
              <Download className="h-6 w-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Instalar Dosimat Pro</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Añadí la app a tu pantalla de inicio para un acceso rápido, sin barras de navegación y con mejor velocidad.
              </p>
            </div>
          </div>

          {showIosGuide ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-3 border border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              <p className="font-bold text-slate-800 dark:text-white">Para instalar en tu iPhone/iPad:</p>
              <ol className="list-decimal pl-4 space-y-2">
                <li className="flex items-center gap-1.5">
                  Toca el botón de compartir <Share className="h-3.5 w-3.5 text-primary inline" /> abajo en tu pantalla.
                </li>
                <li className="flex items-center gap-1.5">
                  Desplázate y selecciona <PlusSquare className="h-3.5 w-3.5 text-primary inline" /> "Agregar a pantalla de inicio".
                </li>
                <li>Toca "Agregar" en la esquina superior derecha.</li>
              </ol>
            </div>
          ) : (
            <div className="flex gap-2 w-full pt-1">
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="w-1/2 rounded-2xl h-12 font-bold text-xs hover:bg-slate-50 text-slate-500 border-slate-200 dark:border-slate-800"
              >
                Más tarde
              </Button>
              <Button 
                onClick={handleInstallClick}
                className="w-1/2 bg-primary hover:bg-primary-hover text-white rounded-2xl h-12 font-bold text-xs shadow-lg shadow-primary/20"
              >
                {isIOS ? "Ver instrucciones" : "Instalar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
