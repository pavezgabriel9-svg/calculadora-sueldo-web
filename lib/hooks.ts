// lib/hooks.ts

"use client"

import { useMemo, useState, useEffect } from "react"
import { calcularRemuneracion } from "./calculations"
import { parseNumericInput } from "./utils"
import { ResultadosCalculo, CalculatorParams } from "./types"

export function useCalculator(params: CalculatorParams): ResultadosCalculo {
  return useMemo(() => {
    const montoSueldo = parseNumericInput(params.sueldo)
    const montoMovilizacion = parseNumericInput(params.movilizacion)

    if (montoSueldo === 0) {
      return calcularRemuneracion(
        params.modo,
        1000000,
        params.afp,
        params.sistemaSalud,
        parseFloat(params.saludUF || "0"),
        montoMovilizacion,
        params.bonos,
        params.pais
      )
    }

    return calcularRemuneracion(
      params.modo,
      montoSueldo,
      params.afp,
      params.sistemaSalud,
      parseFloat(params.saludUF || "0"),
      montoMovilizacion,
      params.bonos,
      params.pais
    )
  }, [
    params.modo,
    params.sueldo,
    params.afp,
    params.sistemaSalud,
    params.saludUF,
    params.movilizacion,
    params.bonos,
    params.pais,
  ])
}

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Cargar de localStorage al montar
    const saved = localStorage.getItem("darkMode")
    if (saved !== null) {
      const isDark = JSON.parse(saved)
      setDarkMode(isDark)
      applyDarkMode(isDark)
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newValue = !prev
      localStorage.setItem("darkMode", JSON.stringify(newValue))
      applyDarkMode(newValue)
      return newValue
    })
  }

  const applyDarkMode = (isDark: boolean) => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }

  return { darkMode, toggleDarkMode }
}
