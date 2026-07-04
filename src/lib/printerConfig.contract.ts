import { DEFAULT_ZPL_PRINTER_CONFIG, normalizarZplPrinterConfig } from './printerConfig'
import type { ZplPrinterConfig } from './zpl'

const normalized = normalizarZplPrinterConfig({
  ...DEFAULT_ZPL_PRINTER_CONFIG,
  host: ' 192.168.15.90 ',
  port: 0,
  dpi: 999 as ZplPrinterConfig['dpi'],
  widthMm: 30,
  heightMm: 10,
})

export const printerConfigContract: ZplPrinterConfig = {
  host: '192.168.15.90',
  port: 9100,
  dpi: 203,
  widthMm: 70,
  heightMm: 40,
}

if (
  normalized.host !== printerConfigContract.host ||
  normalized.port !== printerConfigContract.port ||
  normalized.dpi !== printerConfigContract.dpi ||
  normalized.widthMm !== printerConfigContract.widthMm ||
  normalized.heightMm !== printerConfigContract.heightMm
) {
  throw new Error('Contrato de configuracao ZPL invalido')
}
