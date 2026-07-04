export interface LimitesPallet {
  comprimentoM: number
  larguraM: number
  alturaM: number
  pesoKg: number
}

export interface DimensoesVolumePallet {
  comprimentoM: number
  larguraM: number
  alturaM: number
}

interface PlanejarBucketsPalletsOptions<T> {
  limites: LimitesPallet
  getPesoKg: (volume: T) => number
  getCubagemM3: (volume: T) => number
  getDimensoes?: (volume: T) => DimensoesVolumePallet
  getFatorCritico?: (volume: T) => number
}

interface BucketStats {
  pesoKg: number
  cubagemM3: number
  alturaM: number
}

const EPSILON = 0.000001
const MAX_REBALANCE_PASSES = 80

export function capacidadeCubagemPallet(limites: Pick<LimitesPallet, 'comprimentoM' | 'larguraM' | 'alturaM'>) {
  return limites.comprimentoM * limites.larguraM * limites.alturaM
}

function cubagemDoVolume(volume: unknown) {
  return Number((volume as { cubagemM3?: number }).cubagemM3 ?? 0)
}

function dimensoesValidas(dimensoes: DimensoesVolumePallet) {
  return {
    comprimentoM: Math.max(dimensoes.comprimentoM, EPSILON),
    larguraM: Math.max(dimensoes.larguraM, EPSILON),
    alturaM: Math.max(dimensoes.alturaM, EPSILON),
  }
}

function orientacoesPossiveis(dimensoes: DimensoesVolumePallet) {
  const normalizadas = dimensoesValidas(dimensoes)
  if (Math.abs(normalizadas.comprimentoM - normalizadas.larguraM) < EPSILON) return [normalizadas]

  return [
    normalizadas,
    {
      comprimentoM: normalizadas.larguraM,
      larguraM: normalizadas.comprimentoM,
      alturaM: normalizadas.alturaM,
    },
  ]
}

function escolherOrientacao(
  dimensoes: DimensoesVolumePallet,
  disponivelComprimentoM: number,
  disponivelLarguraM: number,
) {
  return orientacoesPossiveis(dimensoes)
    .filter(
      (orientacao) =>
        orientacao.comprimentoM <= disponivelComprimentoM + EPSILON &&
        orientacao.larguraM <= disponivelLarguraM + EPSILON,
    )
    .sort((a, b) => {
      const areaA = a.comprimentoM * a.larguraM
      const areaB = b.comprimentoM * b.larguraM
      return areaB - areaA
    })[0] ?? null
}

export function volumeCabeNoPallet<T>(
  volume: T,
  limites: LimitesPallet,
  getDimensoes: (volume: T) => DimensoesVolumePallet,
) {
  const dimensoes = getDimensoes(volume)
  return orientacoesPossiveis(dimensoes).some(
    (orientacao) =>
      orientacao.comprimentoM <= limites.comprimentoM + EPSILON &&
      orientacao.larguraM <= limites.larguraM + EPSILON &&
      orientacao.alturaM <= limites.alturaM + EPSILON,
  )
}

export function estimarAlturaPallet<T>(
  volumes: readonly T[],
  limites: LimitesPallet,
  getDimensoes?: (volume: T) => DimensoesVolumePallet,
) {
  if (!volumes.length) return 0

  if (!getDimensoes) {
    const cubagemM3 = volumes.reduce((total, volume) => total + cubagemDoVolume(volume), 0)
    return cubagemM3 / Math.max(limites.comprimentoM * limites.larguraM, EPSILON)
  }

  const ordenados = [...volumes].sort((a, b) => {
    const dimA = dimensoesValidas(getDimensoes(a))
    const dimB = dimensoesValidas(getDimensoes(b))
    return dimB.comprimentoM * dimB.larguraM - dimA.comprimentoM * dimA.larguraM
  })

  const novaCamada = (baseY: number) => ({
    baseY,
    cursorX: 0,
    cursorZ: 0,
    rowDepth: 0,
    altura: 0,
  })

  let camadaAtual = novaCamada(0)
  let maiorAlturaM = 0

  for (const volume of ordenados) {
    const dimensoes = dimensoesValidas(getDimensoes(volume))
    const cabeNaBase = escolherOrientacao(dimensoes, limites.comprimentoM, limites.larguraM)
    if (!cabeNaBase) return Number.POSITIVE_INFINITY

    let posicao = escolherOrientacao(
      dimensoes,
      limites.comprimentoM - camadaAtual.cursorX,
      limites.larguraM - camadaAtual.cursorZ,
    )

    if (!posicao) {
      const proximaLinhaZ = camadaAtual.cursorZ + camadaAtual.rowDepth
      posicao = escolherOrientacao(dimensoes, limites.comprimentoM, limites.larguraM - proximaLinhaZ)

      if (posicao) {
        camadaAtual.cursorX = 0
        camadaAtual.cursorZ = proximaLinhaZ
        camadaAtual.rowDepth = 0
      }
    }

    if (!posicao) {
      camadaAtual = novaCamada(camadaAtual.baseY + camadaAtual.altura)
      posicao = escolherOrientacao(dimensoes, limites.comprimentoM, limites.larguraM)
    }

    if (!posicao) return Number.POSITIVE_INFINITY

    camadaAtual.cursorX += posicao.comprimentoM
    camadaAtual.rowDepth = Math.max(camadaAtual.rowDepth, posicao.larguraM)
    camadaAtual.altura = Math.max(camadaAtual.altura, posicao.alturaM)
    maiorAlturaM = Math.max(maiorAlturaM, camadaAtual.baseY + camadaAtual.altura)
  }

  return maiorAlturaM
}

function statsBucket<T>(bucket: readonly T[], options: PlanejarBucketsPalletsOptions<T>): BucketStats {
  return {
    pesoKg: bucket.reduce((total, volume) => total + options.getPesoKg(volume), 0),
    cubagemM3: bucket.reduce((total, volume) => total + options.getCubagemM3(volume), 0),
    alturaM: estimarAlturaPallet(bucket, options.limites, options.getDimensoes),
  }
}

function bucketViavel<T>(bucket: readonly T[], options: PlanejarBucketsPalletsOptions<T>) {
  const stats = statsBucket(bucket, options)
  return (
    stats.pesoKg <= options.limites.pesoKg + EPSILON &&
    stats.alturaM <= options.limites.alturaM + EPSILON
  )
}

function scoreBuckets<T>(buckets: readonly T[][], options: PlanejarBucketsPalletsOptions<T>) {
  const stats = buckets.map((bucket) => statsBucket(bucket, options))
  if (stats.some((item) => !Number.isFinite(item.alturaM))) return Number.POSITIVE_INFINITY

  const alturas = stats.map((item) => item.alturaM)
  const pesos = stats.map((item) => item.pesoKg)
  const totalAltura = alturas.reduce((total, altura) => total + altura, 0)
  const totalPeso = pesos.reduce((total, peso) => total + peso, 0)
  const alvoAltura = totalAltura / Math.max(buckets.length, 1)
  const alvoPeso = totalPeso / Math.max(buckets.length, 1)
  const maiorAltura = Math.max(...alturas, 0)
  const menorAltura = Math.min(...alturas, 0)
  const maiorPeso = Math.max(...pesos, 0)
  const menorPeso = Math.min(...pesos, 0)
  const desvioAltura = alturas.reduce((total, altura) => total + (altura - alvoAltura) ** 2, 0)
  const desvioPeso = pesos.reduce((total, peso) => total + ((peso - alvoPeso) / options.limites.pesoKg) ** 2, 0)

  return (
    buckets.length * 10_000 +
    (maiorAltura / options.limites.alturaM) * 500 +
    ((maiorAltura - menorAltura) / options.limites.alturaM) * 220 +
    (maiorPeso / options.limites.pesoKg) * 80 +
    ((maiorPeso - menorPeso) / options.limites.pesoKg) * 40 +
    desvioAltura * 90 +
    desvioPeso * 20
  )
}

function quantidadeMinimaPallets<T>(volumes: readonly T[], options: PlanejarBucketsPalletsOptions<T>) {
  const totalPesoKg = volumes.reduce((total, volume) => total + options.getPesoKg(volume), 0)
  const totalCubagemM3 = volumes.reduce((total, volume) => total + options.getCubagemM3(volume), 0)
  const capacidadeCubagemM3 = capacidadeCubagemPallet(options.limites)

  return Math.max(
    1,
    Math.ceil(totalPesoKg / Math.max(options.limites.pesoKg, EPSILON)),
    Math.ceil(totalCubagemM3 / Math.max(capacidadeCubagemM3, EPSILON)),
  )
}

function ordenarVolumes<T>(volumes: readonly T[], options: PlanejarBucketsPalletsOptions<T>) {
  const capacidadeCubagemM3 = capacidadeCubagemPallet(options.limites)

  return [...volumes].sort((a, b) => {
    const fatorA = options.getFatorCritico?.(a) ?? 0
    const fatorB = options.getFatorCritico?.(b) ?? 0
    const scoreA = Math.max(
      fatorA,
      options.getPesoKg(a) / Math.max(options.limites.pesoKg, EPSILON),
      options.getCubagemM3(a) / Math.max(capacidadeCubagemM3, EPSILON),
      options.getDimensoes ? getScoreDimensional(a, options) : 0,
    )
    const scoreB = Math.max(
      fatorB,
      options.getPesoKg(b) / Math.max(options.limites.pesoKg, EPSILON),
      options.getCubagemM3(b) / Math.max(capacidadeCubagemM3, EPSILON),
      options.getDimensoes ? getScoreDimensional(b, options) : 0,
    )
    return scoreB - scoreA
  })
}

function getScoreDimensional<T>(volume: T, options: PlanejarBucketsPalletsOptions<T>) {
  if (!options.getDimensoes) return 0
  const dimensoes = dimensoesValidas(options.getDimensoes(volume))
  return Math.max(
    dimensoes.alturaM / Math.max(options.limites.alturaM, EPSILON),
    (dimensoes.comprimentoM * dimensoes.larguraM) /
      Math.max(options.limites.comprimentoM * options.limites.larguraM, EPSILON),
  )
}

function clonarBuckets<T>(buckets: readonly T[][]) {
  return buckets.map((bucket) => [...bucket])
}

function rebalancearBuckets<T>(buckets: T[][], options: PlanejarBucketsPalletsOptions<T>) {
  let atuais = clonarBuckets(buckets)

  for (let passe = 0; passe < MAX_REBALANCE_PASSES; passe += 1) {
    const scoreAtual = scoreBuckets(atuais, options)
    let melhorScore = scoreAtual
    let melhoresBuckets: T[][] | null = null

    atuais.forEach((bucketOrigem, origemIndex) => {
      bucketOrigem.forEach((volume, volumeIndex) => {
        atuais.forEach((_, destinoIndex) => {
          if (origemIndex === destinoIndex) return

          const tentativa = clonarBuckets(atuais)
          tentativa[origemIndex].splice(volumeIndex, 1)
          tentativa[destinoIndex].push(volume)

          if (!bucketViavel(tentativa[destinoIndex], options)) return
          const score = scoreBuckets(tentativa, options)
          if (score + EPSILON < melhorScore) {
            melhorScore = score
            melhoresBuckets = tentativa
          }
        })
      })
    })

    if (!melhoresBuckets) break
    atuais = melhoresBuckets
  }

  return atuais
}

export function planejarBucketsPallets<T>(
  volumes: readonly T[],
  options: PlanejarBucketsPalletsOptions<T>,
) {
  if (!volumes.length) return []

  const buckets: T[][] = Array.from(
    { length: quantidadeMinimaPallets(volumes, options) },
    () => [],
  )

  ordenarVolumes(volumes, options).forEach((volume) => {
    let melhorIndice = -1
    let melhorScore = Number.POSITIVE_INFINITY

    buckets.forEach((bucket, index) => {
      const tentativa = clonarBuckets(buckets)
      tentativa[index] = [...bucket, volume]
      if (!bucketViavel(tentativa[index], options)) return

      const score = scoreBuckets(tentativa, options)
      if (score < melhorScore) {
        melhorScore = score
        melhorIndice = index
      }
    })

    if (melhorIndice === -1) {
      buckets.push([volume])
      return
    }

    buckets[melhorIndice].push(volume)
  })

  return rebalancearBuckets(buckets, options)
    .filter((bucket) => bucket.length > 0)
    .map((bucket) => [...bucket])
}
