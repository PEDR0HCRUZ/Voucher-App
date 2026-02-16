"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"

interface QrScannerProps {
  onScan: (code: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string>("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  async function startScanner() {
    setError("")

    if (!containerRef.current) return

    try {
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          stopScanner()
        },
        () => {
          // ignore scan errors (no QR found in frame)
        }
      )

      setIsScanning(true)
    } catch (err) {
      console.error("Scanner error:", err)
      setError("Não foi possível acessar a câmera. Verifique as permissões.")
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-sm rounded-lg overflow-hidden"
        style={{ minHeight: isScanning ? 300 : 0 }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        variant={isScanning ? "destructive" : "outline"}
        onClick={isScanning ? stopScanner : startScanner}
        className="w-full max-w-sm"
      >
        {isScanning ? "Parar Scanner" : "Escanear QR Code"}
      </Button>
    </div>
  )
}
