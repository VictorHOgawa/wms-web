// Wrapper sobre o Zebra BrowserPrint SDK — mesmo mecanismo já usado na tela de
// etiquetas do TMS (integra-web-v2).
//
// O BrowserPrint é um pequeno agente instalado no PC (estação da torre) que
// expõe as impressoras Zebra locais para a página. O SDK em JS (fornecido pela
// Zebra) precisa estar disponível em /public:
//   public/browserprint/BrowserPrint-3.1.250.min.js
// Baixe em: https://www.zebra.com (Zebra BrowserPrint SDK).
//
// Sem agente/SDK a impressão cai no fallback de download do arquivo .zpl
// (ver etiquetaPrint.ts) — a operação não fica travada.

const SDK_SRC = '/browserprint/BrowserPrint-3.1.250.min.js'

export interface ZebraDevice {
  name: string
  uid: string
  connection: string
  deviceType: string
  send: (data: string, success?: () => void, error?: (e: string) => void) => void
}

interface BrowserPrintGlobal {
  getDefaultDevice: (
    type: 'printer',
    success: (device: ZebraDevice) => void,
    error: (e: string) => void,
  ) => void
  getLocalDevices: (
    success: (devices: ZebraDevice[]) => void,
    error: (e: string) => void,
    type?: 'printer',
  ) => void
}

declare global {
  interface Window {
    BrowserPrint?: BrowserPrintGlobal
  }
}

let sdkPromise: Promise<BrowserPrintGlobal> | null = null

/** Carrega o SDK do BrowserPrint uma única vez (sob demanda). */
export function loadBrowserPrint(): Promise<BrowserPrintGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('BrowserPrint só funciona no navegador.'))
  }
  if (window.BrowserPrint) return Promise.resolve(window.BrowserPrint)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`)
    const onReady = () => {
      if (window.BrowserPrint) resolve(window.BrowserPrint)
      else reject(new Error('SDK do BrowserPrint carregou, mas não inicializou.'))
    }
    if (existing) {
      existing.addEventListener('load', onReady)
      existing.addEventListener('error', () =>
        reject(new Error('Falha ao carregar o SDK do BrowserPrint.')),
      )
      if (window.BrowserPrint) onReady()
      return
    }
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onload = onReady
    script.onerror = () => {
      sdkPromise = null
      reject(
        new Error(
          'SDK do BrowserPrint não encontrado (coloque o .js da Zebra em /public/browserprint).',
        ),
      )
    }
    document.body.appendChild(script)
  })

  return sdkPromise
}

/** Impressora Zebra padrão configurada no agente BrowserPrint da estação. */
export function getDefaultPrinter(): Promise<ZebraDevice> {
  return loadBrowserPrint().then(
    (bp) =>
      new Promise((resolve, reject) => {
        bp.getDefaultDevice(
          'printer',
          (device) => {
            if (device) resolve(device)
            else
              reject(
                new Error(
                  'Nenhuma impressora padrão no BrowserPrint. Verifique se a Zebra está ligada e configurada no agente.',
                ),
              )
          },
          (e) => reject(new Error(e || 'Erro ao buscar a impressora.')),
        )
      }),
  )
}

/** Envia um comando ZPL para a impressora informada. */
export function sendToPrinter(device: ZebraDevice, zpl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    device.send(
      zpl,
      () => resolve(),
      (e) => reject(new Error(e || 'Erro ao enviar para a impressora.')),
    )
  })
}
