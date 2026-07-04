export const DEMO_ADMIN_BUSINESS_ADDRESS_BLUEPRINT = {
  armazemId: 'cd-sp',
  zonaId: 'zn-2',
  ruas: ['A', 'B', 'C'],
  colunas: 4,
  niveis: 3,
  posicoes: 1,
  tipo: 'picking',
  capacidadePeso: 800,
  capacidadePaletes: 1,
} as const

export const DEMO_ADMIN_BUSINESS_PUTAWAY = {
  nanoPrincipal: 'A-01-01-01',
  nanoSecundario: 'A-01-02-01',
  bellaPrincipal: 'B-01-01-01',
  bellaSecundario: 'B-01-02-01',
  verdePrincipal: 'C-01-01-01',
  verdeSecundario: 'C-01-02-01',
  excecaoQualidade: 'C-04-03-01',
  alternativa: 'A-04-03-01',
} as const

export const DEMO_ADMIN_BUSINESS_DOCAS = {
  recebimento01: 'DOCA-01',
  recebimento02: 'DOCA-02',
  expedicao03: 'DOCA-03',
  mista04: 'DOCA-04',
} as const

export const DEMO_ADMIN_BUSINESS_ENDERECOS_SUGESTOES = [
  DEMO_ADMIN_BUSINESS_PUTAWAY.nanoPrincipal,
  DEMO_ADMIN_BUSINESS_PUTAWAY.nanoSecundario,
  DEMO_ADMIN_BUSINESS_PUTAWAY.bellaPrincipal,
  DEMO_ADMIN_BUSINESS_PUTAWAY.bellaSecundario,
  DEMO_ADMIN_BUSINESS_PUTAWAY.verdePrincipal,
  DEMO_ADMIN_BUSINESS_PUTAWAY.verdeSecundario,
  DEMO_ADMIN_BUSINESS_PUTAWAY.excecaoQualidade,
] as const

export function demoSugerirEnderecoPutaway(skuCodigo: string) {
  if (skuCodigo === 'SKU-10241') return DEMO_ADMIN_BUSINESS_PUTAWAY.nanoPrincipal
  if (skuCodigo.startsWith('SKU-102')) return DEMO_ADMIN_BUSINESS_PUTAWAY.nanoSecundario
  if (skuCodigo === 'SKU-20056') return DEMO_ADMIN_BUSINESS_PUTAWAY.bellaSecundario
  if (skuCodigo.startsWith('SKU-200')) return DEMO_ADMIN_BUSINESS_PUTAWAY.bellaPrincipal
  if (skuCodigo === 'SKU-30012') return DEMO_ADMIN_BUSINESS_PUTAWAY.verdeSecundario
  if (skuCodigo.startsWith('SKU-300')) return DEMO_ADMIN_BUSINESS_PUTAWAY.verdePrincipal
  return DEMO_ADMIN_BUSINESS_PUTAWAY.excecaoQualidade
}
