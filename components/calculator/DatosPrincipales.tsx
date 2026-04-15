// components/calculator/DatosPrincipales.tsx

import { Building2, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AFP_DATA } from "@/lib/config"
import { formatCLP, formatNumericInput } from "@/lib/utils"
import { Modo, SistemaSalud } from "@/lib/types"

export function DatosPrincipales({
  modo,
  sueldo,
  onSueldoChange,
  afp,
  onAfpChange,
  sistemaSalud,
  onSistemaSaludChange,
  saludUF,
  onSaludUFChange,
  movilizacion,
  onMovilizacionChange,
}: {
  modo: Modo
  sueldo: string
  onSueldoChange: (v: string) => void
  afp: string
  onAfpChange: (v: string) => void
  sistemaSalud: SistemaSalud
  onSistemaSaludChange: (v: SistemaSalud) => void
  saludUF: string
  onSaludUFChange: (v: string) => void
  movilizacion: string
  onMovilizacionChange: (v: string) => void
}) {
  const tasaAFP = AFP_DATA[afp] || 0.1049

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Datos Principales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Sueldo Principal */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            {modo === "liquido_a_base" ? "Sueldo Líquido Deseado" : "Sueldo Base"}
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={sueldo}
              onChange={(e) => onSueldoChange(formatNumericInput(e.target.value))}
              placeholder={
                modo === "liquido_a_base" ? "Ej: 1.000.000" : "Ej: 1.500.000"
              }
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* AFP */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">AFP</Label>
          <div className="flex gap-3">
            <Select value={afp} onValueChange={onAfpChange}>
              <SelectTrigger className="flex-1 h-11">
                <SelectValue placeholder="Selecciona AFP" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(AFP_DATA).map((afpName) => (
                  <SelectItem key={afpName} value={afpName}>
                    {afpName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="h-11 px-4 flex items-center text-sm">
              {(tasaAFP * 100).toFixed(2)}%
            </Badge>
          </div>
        </div>

        {/* Sistema de Salud */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Sistema de Salud</Label>
          <RadioGroup
            value={sistemaSalud}
            onValueChange={(v) => onSistemaSaludChange(v as SistemaSalud)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fonasa" id="fonasa" />
              <Label htmlFor="fonasa" className="cursor-pointer">
                Fonasa
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="isapre" id="isapre" />
              <Label htmlFor="isapre" className="cursor-pointer">
                Isapre
              </Label>
            </div>
          </RadioGroup>

          {sistemaSalud === "isapre" && (
            <div className="flex items-center gap-3 mt-2">
              <Label className="text-sm">UF:</Label>
              <Input
                type="text"
                value={saludUF}
                onChange={(e) => onSaludUFChange(e.target.value)}
                placeholder="Ej: 3.5"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                ({formatCLP(parseFloat(saludUF || "0") * 38000)})
              </span>
            </div>
          )}
        </div>

        {/* Movilización */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Movilización</Label>
          <Input
            type="text"
            value={movilizacion}
            onChange={(e) =>
              onMovilizacionChange(formatNumericInput(e.target.value))
            }
            placeholder="Ej: 40.000"
            className="h-11"
          />
        </div>
      </CardContent>
    </Card>
  )
}
