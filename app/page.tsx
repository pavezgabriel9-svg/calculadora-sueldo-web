// app/page.tsx
import { getCountryConfig } from "@/lib/services/configService"
import { CalculadoraClient } from "./calculadora-client"

export default async function Page() {
  const config = await getCountryConfig("chile")
  return <CalculadoraClient config={config} />
}
