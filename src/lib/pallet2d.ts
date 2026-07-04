export interface CaixaProjetavel2D {
  id: string
  x: number
  z: number
  comprimentoM: number
  larguraM: number
  alturaM: number
  bottomM: number
}

export interface BasePallet2D {
  comprimentoM: number
  larguraM: number
}

function percentual(valor: number, total: number) {
  if (total <= 0) return 0
  return (valor / total) * 100
}

function limitarPercentual(valor: number) {
  return Math.min(100, Math.max(0, valor))
}

export function projetarCaixaPallet2D(caixa: CaixaProjetavel2D, base: BasePallet2D) {
  const leftM = caixa.x - caixa.comprimentoM / 2 + base.comprimentoM / 2
  const topM = caixa.z - caixa.larguraM / 2 + base.larguraM / 2

  return {
    leftPct: limitarPercentual(percentual(leftM, base.comprimentoM)),
    topPct: limitarPercentual(percentual(topM, base.larguraM)),
    widthPct: limitarPercentual(percentual(caixa.comprimentoM, base.comprimentoM)),
    heightPct: limitarPercentual(percentual(caixa.larguraM, base.larguraM)),
  }
}

export function projetarAlturaPallet2D(caixa: CaixaProjetavel2D, alturaLimiteM: number) {
  return {
    bottomPct: limitarPercentual(percentual(caixa.bottomM, alturaLimiteM)),
    heightPct: limitarPercentual(percentual(caixa.alturaM, alturaLimiteM)),
  }
}

