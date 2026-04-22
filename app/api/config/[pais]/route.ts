import { getCountryConfig } from "@/lib/services/configService"
import { PAISES } from "@/lib/config"
import { Pais } from "@/lib/types"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pais: string }> }
) {
  const { pais } = await params
  if (!PAISES.includes(pais as Pais)) {
    return Response.json({ error: "Invalid pais" }, { status: 400 })
  }
  const config = await getCountryConfig(pais as Pais)
  return Response.json(config)
}
