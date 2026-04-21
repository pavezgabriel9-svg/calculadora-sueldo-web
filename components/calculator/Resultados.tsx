// components/calculator/Resultados.tsx

import { Shield, TrendingDown, TrendingUp } from "lucide-react"
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
  const headerColor =
    modo === "base_a_liquido"
      ? "bg-gradient-to-r from-blue-600 to-blue-700"
      : "bg-gradient-to-r from-emerald-600 to-emerald-700"

  const headerTitle =
    modo === "base_a_liquido"
      ? "CÁLCULO: BASE → LÍQUIDO"
      : "CÁLCULO: LÍQUIDO → BASE"

  const format = (value: number): string =>
    moneda === 'CLP' ? formatCLP(value) : formatUSD(value / dolarValue)

  const dolarFormateado = formatCLP(dolarValue)

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

      <CardContent className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Sección Principal */}
        <div className="space-y-2">
          {modo === "base_a_liquido" ? (
            <>
              <ResultRow
                label="Sueldo Base (entrada)"
                value={resultados.sueldoBase}
                variant="entrada"
                format={format}
              />
              <Separator />
              <ResultRow
                label="SUELDO LÍQUIDO"
                value={resultados.sueldoLiquido}
                variant="principal"
                format={format}
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Líquido Objetivo (entrada)"
                value={resultados.sueldoLiquido}
                variant="entrada"
                format={format}
              />
              <Separator />
              <ResultRow
                label="SUELDO BASE"
                value={resultados.sueldoBase}
                variant="principal"
                format={format}
              />
            </>
          )}
        </div>

        <Separator />

        {/* Costo Total Empresa */}
        <ResultRow
          label="COSTO TOTAL EMPRESA"
          value={resultados.costoTotalEmpresa}
          variant="total-header"
          format={format}
        />

        <Separator />

        {/* Haberes */}
        <div className="space-y-2">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="HABERES"
          />
          <ResultRow label="Gratificación" value={resultados.gratificacion} format={format} />
          {resultados.bonosImponibles > 0 && (
            <ResultRow
              label="Bonos Imponibles"
              value={resultados.bonosImponibles}
              format={format}
            />
          )}
          <ResultRow
            label="Total Haberes Imponibles"
            value={resultados.totalHaberesImponibles}
            variant="total"
            format={format}
          />
          <ResultRow label="Movilización" value={resultados.movilizacion} format={format} />
          {resultados.bonosNoImponibles > 0 && (
            <ResultRow
              label="Bonos No Imponibles"
              value={resultados.bonosNoImponibles}
              format={format}
            />
          )}
          <ResultRow
            label="Total Haberes"
            value={resultados.totalHaberes}
            variant="total"
            format={format}
          />
        </div>

        <Separator />

        {/* Descuentos */}
        <div className="space-y-2">
          <SectionHeader
            icon={<TrendingDown className="h-4 w-4" />}
            title="DESCUENTOS TRABAJADOR"
          />
          <ResultRow
            label="Cotización Previsional (AFP)"
            value={resultados.cotizacionPrevisional}
            format={format}
          />
          <ResultRow
            label="Cotización Salud"
            value={resultados.cotizacionSalud}
            format={format}
          />
          <ResultRow label="Seguro Cesantía" value={resultados.cesantia} format={format} />
          <ResultRow label="Impuesto Único" value={resultados.impuesto} format={format} />
          <ResultRow
            label="Total Descuentos"
            value={resultados.totalDescuentos}
            variant="descuento"
            format={format}
          />
        </div>

        <Separator />

        {/* Costos Patronales */}
        <div className="space-y-2">
          <SectionHeader
            icon={<Shield className="h-4 w-4" />}
            title="COSTOS PATRONALES"
          />
          <ResultRow
            label="Seguro Cesantía Empleador"
            value={resultados.cesantiaEmpleador}
            format={format}
          />
          <ResultRow label="Mutual" value={resultados.mutual} format={format} />
          <ResultRow label="SIS" value={resultados.sis} format={format} />
          <ResultRow
            label="Cotización Expectativa Vida"
            value={resultados.expectativaVida}
            format={format}
          />
          <ResultRow
            label="Aporte AFP Empleador"
            value={resultados.afpEmpleador}
            format={format}
          />
          <ResultRow
            label="Seguro Complementario Salud"
            value={resultados.seguroComplementario}
            format={format}
          />
          <ResultRow
            label="TOTAL COSTOS PATRONALES"
            value={resultados.totalPatronal}
            variant="total"
            format={format}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
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
    principal: "text-emerald-600 font-bold text-lg",
    total: "text-blue-600 font-semibold",
    "total-header": "text-blue-600 font-bold text-lg",
    descuento: "text-red-600 font-semibold",
  }

  const labelClasses = {
    normal: "text-sm text-muted-foreground",
    entrada: "text-sm font-medium",
    principal: "text-sm font-bold",
    total: "text-sm font-semibold",
    "total-header": "text-sm font-bold",
    descuento: "text-sm font-semibold",
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={labelClasses[variant]}>{label}</span>
      <span className={valueClasses[variant]}>{format(value)}</span>
    </div>
  )
}
