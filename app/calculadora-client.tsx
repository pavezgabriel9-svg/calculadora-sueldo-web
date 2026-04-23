// app/calculadora-client.tsx
"use client"

import { useState } from "react"
import {
  Header,
  ModoCalculo,
  DatosPrincipales,
  Bonos,
  Resultados,
} from "@/components/calculator"
import { useCalculator, useDarkMode } from "@/lib/hooks"
import { formatNumericInput } from "@/lib/utils"
import { Bono, Pais, Modo, SistemaSalud, CountryConfig, Moneda } from "@/lib/types"

// TODO(fase3): re-fetch config when pais changes (actualmente solo carga config de 'chile' desde el servidor)
export function CalculadoraClient({ config }: { config: CountryConfig }) {
  const { darkMode, toggleDarkMode } = useDarkMode()

  const [pais, setPais] = useState<Pais>("chile")
  const [modo, setModo] = useState<Modo>("liquido_a_base")
  const [sueldo, setSueldo] = useState("1.000.000")
  const [afp, setAfp] = useState("Uno")
  const [sistemaSalud, setSistemaSalud] = useState<SistemaSalud>("fonasa")
  const [saludUF, setSaludUF] = useState("")
  const [movilizacion, setMovilizacion] = useState("40.000")
  const [bonoEmpresaTipo, setBonoEmpresaTipo] = useState("empresa")
  const [bonoEmpresaTasaIdx, setBonoEmpresaTasaIdx] = useState(0)
  const [bonoEmpresaMonto, setBonoEmpresaMonto] = useState("600.000")
  const [bonos, setBonos] = useState<Bono[]>([
    //{ id: "1", nombre: "Producción", monto: 100000, imponible: true },
  ])
  const [moneda, setMoneda] = useState<Moneda>('CLP')

  const resultados = useCalculator({
    modo,
    sueldo,
    afp,
    sistemaSalud,
    saludUF,
    movilizacion,
    bonoEmpresaTipo,
    bonoEmpresaTasaIdx,
    bonoEmpresaMonto,
    bonos,
    pais,
    config,
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
              bonoEmpresaTipo={bonoEmpresaTipo}
              onBonoEmpresaTipoChange={(tipo) => {
                setBonoEmpresaTipo(tipo)
                setBonoEmpresaTasaIdx(0)
                const tipoObj = config.bonosEmpresa.find(b => b.id === tipo)
                if (tipoObj?.montoFijo) {
                  setBonoEmpresaMonto(tipoObj.montoFijo.toLocaleString('es-CL'))
                }
              }}
              bonoEmpresaTasaIdx={bonoEmpresaTasaIdx}
              onBonoEmpresaTasaIdxChange={setBonoEmpresaTasaIdx}
              bonoEmpresaMonto={bonoEmpresaMonto}
              onBonoEmpresaMontoChange={setBonoEmpresaMonto}
              bonoEmpresaComputado={resultados.bonoEmpresaAnual.montoImponible}
              bonosEmpresa={config.bonosEmpresa}
              afpData={config.afpData}
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
              moneda={moneda}
              onMonedaChange={setMoneda}
              dolarValue={config.dolarValue}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
