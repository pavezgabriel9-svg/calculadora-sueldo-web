'use client'

// components/calculator/Resultados.tsx

import { useState } from "react"
import { ChevronDown, Shield, TrendingDown, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatCLP, formatUSD } from "@/lib/utils"
import { ResultadosCalculo, Modo, Moneda } from "@/lib/types"

export function Resultados({
  modo,
  resultados,
  moneda,
  onMonedaChange,
  dolarValue,
}: {
  modo: Modo
  resultados: ResultadosCalculo
  moneda: Moneda
  onMonedaChange: (m: Moneda) => void
  dolarValue: number
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggle = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const isOpen = (section: string) => openSections.has(section)

  const headerColor =
    modo === "base_a_liquido"
      ? "bg-gradient-to-r from-blue-600 to-blue-700"
      : "bg-gradient-to-r from-emerald-600 to-emerald-700"

  const headerTitle =
    modo === "base_a_liquido"
      ? "CÁLCULO: BASE → LÍQUIDO"
      : "CÁLCULO: LÍQUIDO → BASE"

  const { bonoNavidad, bonoFiestasPatrias, bonoEscolaridad } = resultados

  return (
    <Card className="sticky top-4">
      <div className={`${headerColor} text-white rounded-t-lg p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{headerTitle}</h2>
          <ToggleGroup
            type="single"
            value={moneda}
            onValueChange={(v) => v && onMonedaChange(v as Moneda)}
            className="shrink-0"
          >
            <ToggleGroupItem
              value="CLP"
              className="h-7 px-3 text-xs font-semibold text-white border-white/40 data-[state=on]:bg-white/30 data-[state=on]:text-white hover:bg-white/20 hover:text-white"
            >
              CLP
            </ToggleGroupItem>
            <ToggleGroupItem
              value="USD"
              className="h-7 px-3 text-xs font-semibold text-white border-white/40 data-[state=on]:bg-white/30 data-[state=on]:text-white hover:bg-white/20 hover:text-white"
            >
              USD
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <p className="text-xs text-white/60 mt-1">1 USD = {dolarFormateado}</p>
      </div>

      <CardContent className="p-4 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">

        {/* Entrada */}
        {modo === "base_a_liquido" ? (
          <ResultRow label="Sueldo Base (entrada)" value={resultados.sueldoBase} variant="entrada" />
        ) : (
          <ResultRow label="Líquido Objetivo (entrada)" value={resultados.sueldoLiquido} variant="entrada" />
        )}

        <Separator className="my-2" />

        {/* Principal */}
        {modo === "base_a_liquido" ? (
          <ResultRow label="SUELDO LÍQUIDO" value={resultados.sueldoLiquido} variant="principal" />
        ) : (
          <ResultRow label="SUELDO BASE" value={resultados.sueldoBase} variant="principal" />
        )}

        <Separator className="my-2" />

        {/* Haberes */}
        <AccordionSection
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Haberes"
          value={resultados.totalHaberes}
          variant="total"
          isOpen={isOpen("haberes")}
          onToggle={() => toggle("haberes")}
        >
          <ResultRow label="Sueldo Base" value={resultados.sueldoBase} />
          <ResultRow label="Gratificación" value={resultados.gratificacion} />
          {resultados.bonosImponibles > 0 && (
            <ResultRow label="Bonos Imponibles" value={resultados.bonosImponibles} />
          )}
          {resultados.movilizacion > 0 && (
            <ResultRow label="Movilización" value={resultados.movilizacion} />
          )}
          {resultados.bonosNoImponibles > 0 && (
            <ResultRow label="Bonos No Imponibles" value={resultados.bonosNoImponibles} />
          )}
        </AccordionSection>

        {/* Descuentos */}
        <AccordionSection
          icon={<TrendingDown className="h-4 w-4" />}
          label="Descuentos Trabajador"
          value={resultados.totalDescuentos}
          variant="descuento"
          isOpen={isOpen("descuentos")}
          onToggle={() => toggle("descuentos")}
        >
          <ResultRow label="Cotización Previsional (AFP)" value={resultados.cotizacionPrevisional} />
          <ResultRow label="Cotización Salud" value={resultados.cotizacionSalud} />
          <ResultRow label="Seguro Cesantía" value={resultados.cesantia} />
          {resultados.impuesto > 0 && (
            <ResultRow label="Impuesto Único" value={resultados.impuesto} />
          )}
        </AccordionSection>

        <Separator className="my-2" />

        {/* Costo empresa mensual */}
        <AccordionSection
          icon={<Shield className="h-4 w-4" />}
          label="Costo Empresa Mensual"
          value={resultados.costoTotalEmpresa}
          variant="total-header"
          isOpen={isOpen("mensual")}
          onToggle={() => toggle("mensual")}
        >
          <ResultRow label="Seguro Cesantía Empleador" value={resultados.cesantiaEmpleador} />
          <ResultRow label="Mutual" value={resultados.mutual} />
          <ResultRow label="SIS" value={resultados.sis} />
          <ResultRow label="Cotización Expectativa Vida" value={resultados.expectativaVida} />
          {resultados.afpEmpleador > 0 && (
            <ResultRow label="Aporte AFP Empleador" value={resultados.afpEmpleador} />
          )}
          {resultados.seguroComplementario > 0 && (
            <ResultRow label="Seguro Complementario Salud" value={resultados.seguroComplementario} />
          )}
          <ResultRow label="Total Costos Patronales" value={resultados.totalPatronal} variant="total" />
        </AccordionSection>

        {/* Costo empresa anual */}
        <AccordionSection
          icon={<Calendar className="h-4 w-4" />}
          label="Costo Empresa Anual"
          value={resultados.costoTotalEmpresaAnual}
          variant="anual"
          isOpen={isOpen("anual")}
          onToggle={() => toggle("anual")}
        >
          <ResultRow
            label="Costo mensual × 12"
            value={resultados.costoTotalEmpresa * 12}
          />
          <div className="mt-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Bonos Anuales
            </span>
          </div>
          <BonoAnualRow
            label="Bono Navidad"
            uf={7}
            bono={bonoNavidad}
          />
          <BonoAnualRow
            label="Bono Fiestas Patrias"
            uf={6}
            bono={bonoFiestasPatrias}
          />
          <BonoAnualRow
            label="Bono Escolaridad"
            uf={3}
            bono={bonoEscolaridad}
          />
        </AccordionSection>

      </CardContent>
    </Card>
  )
}

function AccordionSection({
  icon,
  label,
  value,
  variant,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  label: string
  value: number
  variant: "total" | "total-header" | "descuento" | "anual"
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const valueClasses = {
    total: "text-blue-600 dark:text-blue-400 font-semibold",
    "total-header": "text-blue-600 dark:text-blue-400 font-bold",
    descuento: "text-red-600 dark:text-red-400 font-semibold",
    anual: "text-violet-600 dark:text-violet-400 font-bold",
  }

  const iconClasses = {
    total: "text-blue-500",
    "total-header": "text-blue-500",
    descuento: "text-red-500",
    anual: "text-violet-500",
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1.5 group"
      >
        <div className="flex items-center gap-2">
          <span className={iconClasses[variant]}>{icon}</span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${valueClasses[variant]}`}>{formatCLP(value)}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="pl-6 pb-2 space-y-1 border-l-2 border-border ml-2 mt-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function BonoAnualRow({
  label,
  uf,
  bono,
}: {
  label: string
  uf: number
  bono: { montoImponible: number; costoEmpresa: number }
}) {
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {label} <span className="text-violet-500 font-medium">({uf} UF)</span>
        </span>
        <span className="text-xs text-muted-foreground">{formatCLP(bono.montoImponible)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground pl-3">→ Costo empresa</span>
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
          {formatCLP(bono.costoEmpresa)}
        </span>
      </div>
    </div>
  )
}

function ResultRow({
  label,
  value,
  variant = "normal",
  format,
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento"
  format: (v: number) => string
}) {
  const valueClasses = {
    normal: "text-foreground",
    entrada: "text-muted-foreground font-semibold",
    principal: "text-emerald-600 dark:text-emerald-400 font-bold text-lg",
    total: "text-blue-600 dark:text-blue-400 font-semibold",
    "total-header": "text-blue-600 dark:text-blue-400 font-bold text-lg",
    descuento: "text-red-600 dark:text-red-400 font-semibold",
  }

  const labelClasses = {
    normal: "text-xs text-muted-foreground",
    entrada: "text-sm font-medium",
    principal: "text-sm font-bold",
    total: "text-xs font-semibold text-muted-foreground",
    "total-header": "text-sm font-bold",
    descuento: "text-xs font-semibold text-muted-foreground",
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={labelClasses[variant]}>{label}</span>
      <span className={valueClasses[variant]}>{format(value)}</span>
    </div>
  )
}
