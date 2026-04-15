// components/calculator/Resultados.tsx

import { Shield, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCLP } from "@/lib/utils"
import { ResultadosCalculo, Modo } from "@/lib/types"

export function Resultados({
  modo,
  resultados,
}: {
  modo: Modo
  resultados: ResultadosCalculo
}) {
  const headerColor =
    modo === "base_a_liquido"
      ? "bg-gradient-to-r from-blue-600 to-blue-700"
      : "bg-gradient-to-r from-emerald-600 to-emerald-700"

  const headerTitle =
    modo === "base_a_liquido"
      ? "CÁLCULO: BASE → LÍQUIDO"
      : "CÁLCULO: LÍQUIDO → BASE"

  return (
    <Card className="sticky top-4">
      <div className={`${headerColor} text-white rounded-t-lg p-4`}>
        <h2 className="text-lg font-bold text-center">{headerTitle}</h2>
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
              />
              <Separator />
              <ResultRow
                label="SUELDO LÍQUIDO"
                value={resultados.sueldoLiquido}
                variant="principal"
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Líquido Objetivo (entrada)"
                value={resultados.sueldoLiquido}
                variant="entrada"
              />
              <Separator />
              <ResultRow
                label="SUELDO BASE"
                value={resultados.sueldoBase}
                variant="principal"
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
        />

        <Separator />

        {/* Haberes */}
        <div className="space-y-2">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="HABERES"
          />
          <ResultRow label="Gratificación" value={resultados.gratificacion} />
          {resultados.bonosImponibles > 0 && (
            <ResultRow
              label="Bonos Imponibles"
              value={resultados.bonosImponibles}
            />
          )}
          <ResultRow
            label="Total Haberes Imponibles"
            value={resultados.totalHaberesImponibles}
            variant="total"
          />
          <ResultRow label="Movilización" value={resultados.movilizacion} />
          {resultados.bonosNoImponibles > 0 && (
            <ResultRow
              label="Bonos No Imponibles"
              value={resultados.bonosNoImponibles}
            />
          )}
          <ResultRow
            label="Total Haberes"
            value={resultados.totalHaberes}
            variant="total"
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
          />
          <ResultRow
            label="Cotización Salud"
            value={resultados.cotizacionSalud}
          />
          <ResultRow label="Seguro Cesantía" value={resultados.cesantia} />
          <ResultRow label="Impuesto Único" value={resultados.impuesto} />
          <ResultRow
            label="Total Descuentos"
            value={resultados.totalDescuentos}
            variant="descuento"
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
          />
          <ResultRow label="Mutual" value={resultados.mutual} />
          <ResultRow label="SIS" value={resultados.sis} />
          <ResultRow
            label="Cotización Expectativa Vida"
            value={resultados.expectativaVida}
          />
          <ResultRow
            label="Aporte AFP Empleador"
            value={resultados.afpEmpleador}
          />
          <ResultRow
            label="Seguro Complementario Salud"
            value={resultados.seguroComplementario}
          />
          <ResultRow
            label="TOTAL COSTOS PATRONALES"
            value={resultados.totalPatronal}
            variant="total"
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
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento"
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
      <span className={valueClasses[variant]}>{formatCLP(value)}</span>
    </div>
  )
}
