export type TipoDestinoA4 = 'armazenagem' | 'cross-docking'

export const tipoDestinoA4Label: Record<TipoDestinoA4, string> = {
  armazenagem: 'Armazenagem',
  'cross-docking': 'Cross-docking',
}

export interface CriarDadosDestinoA4Input {
  tipo: TipoDestinoA4
  cliente?: string
  entradaStagingIso?: string
}

export interface DadosDestinoA4 {
  destino: TipoDestinoA4
  destinoLabel: string
  cliente?: string
  entradaStagingIso?: string
}

export function criarDadosDestinoA4(input: CriarDadosDestinoA4Input): DadosDestinoA4 {
  if (input.tipo === 'armazenagem') {
    return {
      destino: input.tipo,
      destinoLabel: tipoDestinoA4Label[input.tipo],
    }
  }

  const cliente = input.cliente?.trim()
  if (!cliente) {
    throw new Error('Informe o cliente para o A4 de cross-docking.')
  }

  if (!input.entradaStagingIso) {
    throw new Error('Informe a data de entrada no staging para o A4 de cross-docking.')
  }

  return {
    destino: input.tipo,
    destinoLabel: tipoDestinoA4Label[input.tipo],
    cliente,
    entradaStagingIso: input.entradaStagingIso,
  }
}
