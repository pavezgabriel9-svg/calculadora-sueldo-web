// components/calculator/Resultados.tsx

import { Shield, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatUSD } from "@/lib/utils"
import { ResultadosCalculo, Modo, Pais } from "@/lib/types"

export function Resultados({
  modo,
  resultados,
  pais,
  dolarRate,
  moneda,
  onMonedaChange,
}: {
  modo: Modo
  resultados: ResultadosCalculo
  pais: Pais
  dolarRate: number
  moneda: "local" | "usd"
  onMonedaChange: (m: "local" | "usd") => void
}) {
  const isPeru = pais === "peru"

  const fmt = (value: number) =>
    moneda === "usd"
      ? formatUSD(value / dolarRate)
      : formatCurrency(value, pais)

  const headerColor =
    modo === "base_a_liquido"
      ? "bg-gradient-to-r from-blue-600 to-blue-700"
      : "bg-gradient-to-r from-emerald-600 to-emerald-700"

  const headerTitle =
    modo === "base_a_liquido"
      ? "CÁLCULO: BASE → LÍQUIDO"
      : "CÁLCULO: LÍQUIDO → BASE"

  const localLabel = pais === "chile" ? "$ CLP" : pais === "peru" ? "S/ PEN" : "R$ BRL"

  return (
    <Card className="sticky top-4">
      <div className={`${headerColor} text-white rounded-t-lg p-4`}>
        <h2 className="text-lg font-bold text-center">{headerTitle}</h2>
        <div className="flex justify-center gap-2 mt-2">
          <Button
            size="sm"
            variant={moneda === "local" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs text-white border border-white/30 hover:bg-white/20"
            onClick={() => onMonedaChange("local")}
          >
            {localLabel}
          </Button>
          <Button
            size="sm"
            variant={moneda === "usd" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs text-white border border-white/30 hover:bg-white/20"
            onClick={() => onMonedaChange("usd")}
          >
            $ USD
          </Button>
        </div>
      </div>

      <CardContent className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Sección Principal */}
        <div className="space-y-2">
          {modo === "base_a_liquido" ? (
            <>
              <ResultRow label="Sueldo Base (entrada)" value={resultados.sueldoBase} variant="entrada" fmt={fmt} />
              <Separator />
              <ResultRow
                label={isPeru ? "REMUNERACIÓN NETA" : "SUELDO LÍQUIDO"}
                value={resultados.sueldoLiquido}
                variant="principal"
                fmt={fmt}
              />
            </>
          ) : (
            <>
              <ResultRow
                label={isPeru ? "Neto Objetivo (entrada)" : "Líquido Objetivo (entrada)"}
                value={resultados.sueldoLiquido}
                variant="entrada"
                fmt={fmt}
              />
              <Separator />
              <ResultRow label="SUELDO BASE" value={resultados.sueldoBase} variant="principal" fmt={fmt} />
            </>
          )}
        </div>

        <Separator />

        {/* Costo Total Empresa */}
        <ResultRow label="COSTO TOTAL EMPRESA" value={resultados.costoTotalEmpresa} variant="total-header" fmt={fmt} />

        <Separator />

        {/* Haberes */}
        <div className="space-y-2">
          <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="HABERES" />
          {!isPeru && (
            <ResultRow label="Gratificación" value={resultados.gratificacion} fmt={fmt} />
          )}
          {resultados.bonosImponibles > 0 && (
            <ResultRow label="Bonos Imponibles" value={resultados.bonosImponibles} fmt={fmt} />
          )}
          <ResultRow label="Total Haberes Imponibles" value={resultados.totalHaberesImponibles} variant="total" fmt={fmt} />
          <ResultRow label="Movilización" value={resultados.movilizacion} fmt={fmt} />
          {resultados.bonosNoImponibles > 0 && (
            <ResultRow label="Bonos No Imponibles" value={resultados.bonosNoImponibles} fmt={fmt} />
          )}
          <ResultRow label="Total Haberes" value={resultados.totalHaberes} variant="total" fmt={fmt} />
        </div>

        <Separator />

        {/* Descuentos Trabajador */}
        <div className="space-y-2">
          <SectionHeader icon={<TrendingDown className="h-4 w-4" />} title="DESCUENTOS TRABAJADOR" />
          <ResultRow label="Cotización Previsional (AFP)" value={resultados.cotizacionPrevisional} fmt={fmt} />
          <ResultRow
            label={isPeru ? "Comisión AFP + Seguros" : "Cotización Salud"}
            value={resultados.cotizacionSalud}
            fmt={fmt}
          />
          {!isPeru && (
            <ResultRow label="Seguro Cesantía" value={resultados.cesantia} fmt={fmt} />
          )}
          <ResultRow
            label={isPeru ? "Impuesto Renta (5ta Cat.)" : "Impuesto Único"}
            value={resultados.impuesto}
            fmt={fmt}
          />
          <ResultRow label="Total Descuentos" value={resultados.totalDescuentos} variant="descuento" fmt={fmt} />
        </div>

        <Separator />

        {/* Costos Patronales */}
        <div className="space-y-2">
          <SectionHeader icon={<Shield className="h-4 w-4" />} title="COSTOS PATRONALES" />
          {isPeru ? (
            <>
              <ResultRow label="EsSalud (9% s/remuneración)" value={resultados.totalPatronal} fmt={fmt} />
              <ResultRow
                label="Gratificaciones anuales (×2 sueldos)"
                value={resultados.provisionGratificaciones}
                variant="anual"
                fmt={fmt}
              />
            </>
          ) : (
            <>
              <ResultRow label="Seguro Cesantía Empleador" value={resultados.cesantiaEmpleador} fmt={fmt} />
              <ResultRow label="Mutual" value={resultados.mutual} fmt={fmt} />
              <ResultRow label="SIS" value={resultados.sis} fmt={fmt} />
              <ResultRow label="Cotización Expectativa Vida" value={resultados.expectativaVida} fmt={fmt} />
              <ResultRow label="Aporte AFP Empleador" value={resultados.afpEmpleador} fmt={fmt} />
              <ResultRow label="Seguro Complementario Salud" value={resultados.seguroComplementario} fmt={fmt} />
            </>
          )}
          <ResultRow label="TOTAL COSTOS PATRONALES" value={resultados.totalPatronal} variant="total" fmt={fmt} />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      {icon}
      <span className="font-bold text-sm text-foreground">{title}</span>
    </div>
  )
}

function ResultRow({
  label,
  value,
  variant = "normal",
  fmt,
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento" | "anual"
  fmt: (v: number) => string
}) {
  const valueClasses = {
    normal: "text-foreground",
    entrada: "text-muted-foreground font-semibold",
    principal: "text-emerald-600 font-bold text-lg",
    total: "text-blue-600 font-semibold",
    "total-header": "text-blue-600 font-bold text-lg",
    descuento: "text-red-600 font-semibold",
    anual: "text-amber-600 font-semibold",
  }

  const labelClasses = {
    normal: "text-sm text-muted-foreground",
    entrada: "text-sm font-medium",
    principal: "text-sm font-bold",
    total: "text-sm font-semibold",
    "total-header": "text-sm font-bold",
    descuento: "text-sm font-semibold",
    anual: "text-sm text-muted-foreground italic",
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={labelClasses[variant]}>{label}</span>
      <span className={valueClasses[variant]}>{fmt(value)}</span>
    </div>
  )
}
