"use client"

import { useState, useEffect } from "react"
import {
  Header,
  ModoCalculo,
  DatosPrincipales,
  Bonos,
  Resultados,
} from "@/components/calculator"
import { useCalculator, useDarkMode } from "@/lib/hooks"
import { formatNumericInput } from "@/lib/utils"
import { Bono, Pais, Modo, SistemaSalud, CountryConfig } from "@/lib/types"

export function CalculadoraClient({ config }: { config: CountryConfig }) {
  const { darkMode, toggleDarkMode } = useDarkMode()

  const [pais, setPais] = useState<Pais>("chile")
  const [modo, setModo] = useState<Modo>("liquido_a_base")
  const [sueldo, setSueldo] = useState("1.000.000")
  const [afp, setAfp] = useState("Uno")
  const [sistemaSalud, setSistemaSalud] = useState<SistemaSalud>("fonasa")
  const [saludUF, setSaludUF] = useState("")
  const [movilizacion, setMovilizacion] = useState("40.000")
  const [bonos, setBonos] = useState<Bono[]>([
    { id: "1", nombre: "Producción", monto: 100000, imponible: true },
    { id: "2", nombre: "Colación", monto: 50000, imponible: false },
  ])
  const [configState, setConfigState] = useState<CountryConfig>(config)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [moneda, setMoneda] = useState<"local" | "usd">("local")

  useEffect(() => {
    if (pais === "chile") {
      setConfigState(config)
      setAfp("Uno")
      setSistemaSalud("fonasa")
      return
    }
    setIsLoadingConfig(true)
    fetch(`/api/config/${pais}`)
      .then((r) => r.json())
      .then((newConfig: CountryConfig) => {
        setConfigState(newConfig)
        setAfp(Object.keys(newConfig.afpData)[0] ?? "")
        setSistemaSalud(pais === "peru" ? "essalud" : "fonasa")
      })
      .catch(() => {
        setSistemaSalud(pais === "peru" ? "essalud" : "fonasa")
      })
      .finally(() => setIsLoadingConfig(false))
  }, [pais]) // eslint-disable-line react-hooks/exhaustive-deps

  const resultados = useCalculator({
    modo,
    sueldo,
    afp,
    sistemaSalud,
    saludUF,
    movilizacion,
    bonos,
    pais,
    config: configState,
  })

  const addBono = (bono: Omit<Bono, "id">) => {
    setBonos([...bonos, { ...bono, id: Date.now().toString() }])
  }

  const removeBono = (id: string) => {
    setBonos(bonos.filter((b) => b.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header
        pais={pais}
        onPaisChange={setPais}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <ModoCalculo modo={modo} onModoChange={setModo} />

            <DatosPrincipales
              modo={modo}
              sueldo={sueldo}
              onSueldoChange={setSueldo}
              afp={afp}
              onAfpChange={setAfp}
              sistemaSalud={sistemaSalud}
              onSistemaSaludChange={setSistemaSalud}
              saludUF={saludUF}
              onSaludUFChange={setSaludUF}
              movilizacion={movilizacion}
              onMovilizacionChange={setMovilizacion}
              afpData={configState.afpData}
              pais={pais}
              ufValue={configState.ufValue}
              isLoadingConfig={isLoadingConfig}
            />

            <Bonos
              bonos={bonos}
              onAddBono={addBono}
              onRemoveBono={removeBono}
            />
          </div>

          <div className="lg:col-span-2">
            <Resultados
              modo={modo}
              resultados={resultados}
              pais={pais}
              dolarRate={configState.dolarRate}
              moneda={moneda}
              onMonedaChange={setMoneda}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
