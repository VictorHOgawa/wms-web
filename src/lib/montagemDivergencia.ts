import type { EtiquetaVolume } from './etiquetas'
import type { EtiquetaDivergente, RegistroDivergenciaEtiqueta } from './divergenciaEtiquetagem'

export function separarEtiquetasParaMontagem(
  etiquetas: EtiquetaVolume[],
  divergencias: RegistroDivergenciaEtiqueta[],
): { normais: EtiquetaVolume[]; devolucao: EtiquetaDivergente[] } {
  const canceladas = new Set(divergencias.flatMap((registro) => registro.etiquetasCanceladasIds))

  return {
    normais: etiquetas.filter((etiqueta) => !canceladas.has(etiqueta.id)),
    devolucao: divergencias.flatMap((registro) => registro.etiquetasGeradas),
  }
}
