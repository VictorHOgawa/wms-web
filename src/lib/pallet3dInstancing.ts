export interface CaixaInstanciavel3D {
  id: string
  x: number
  y: number
  z: number
  comprimentoM: number
  alturaM: number
  larguraM: number
  cor: string
}

export interface TransformacaoCaixa3D {
  id: string
  position: [number, number, number]
  scale: [number, number, number]
  color: string
}

export function criarTransformacoesCaixas3D(caixas: readonly CaixaInstanciavel3D[]): TransformacaoCaixa3D[] {
  return caixas.map((caixa) => ({
    id: caixa.id,
    position: [caixa.x, caixa.y, caixa.z],
    scale: [caixa.comprimentoM, caixa.alturaM, caixa.larguraM],
    color: caixa.cor,
  }))
}

