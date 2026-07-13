// Impressão física das etiquetas identitárias do WMS.
//
// Caminho preferido: Zebra BrowserPrint (agente local na estação da torre —
// mesmo mecanismo da tela de etiquetas do TMS). Sem agente/impressora, cai no
// FALLBACK: baixa o arquivo .zpl para imprimir por utilitário (ou testar em
// http://labelary.com) — a operação nunca fica travada na impressora.

import { getDefaultPrinter, sendToPrinter } from './browserPrint'
import { gerarZplIdentidadesLote, type ZplIdentidadeInput, type ZplPrinterConfig } from './zpl'

export interface ResultadoImpressao {
  ok: boolean
  /** Como saiu: agente Zebra ou download do .zpl (fallback). */
  via: 'browserprint' | 'download'
  mensagem: string
}

function baixarArquivoZpl(zpl: string, nome: string) {
  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Imprime as etiquetas identitárias: tenta a Zebra padrão do BrowserPrint;
 * sem agente, baixa o .zpl e explica o motivo na mensagem.
 */
export async function imprimirIdentidades(
  itens: ZplIdentidadeInput[],
  config: ZplPrinterConfig,
  nomeArquivo = 'etiquetas.zpl',
): Promise<ResultadoImpressao> {
  if (itens.length === 0) {
    return { ok: false, via: 'download', mensagem: 'Nenhuma etiqueta para imprimir.' }
  }
  const zpl = gerarZplIdentidadesLote(itens, config)
  try {
    const printer = await getDefaultPrinter()
    await sendToPrinter(printer, zpl)
    return {
      ok: true,
      via: 'browserprint',
      mensagem: `${itens.length} etiqueta(s) enviada(s) para ${printer.name || 'a Zebra padrão'}.`,
    }
  } catch (e) {
    baixarArquivoZpl(zpl, nomeArquivo)
    const motivo = e instanceof Error ? e.message : 'agente Zebra indisponível'
    return {
      ok: true,
      via: 'download',
      mensagem: `Sem impressora (${motivo}) — arquivo ${nomeArquivo} baixado com o ZPL das ${itens.length} etiqueta(s).`,
    }
  }
}
