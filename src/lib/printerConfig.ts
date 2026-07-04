import type { ZplPrinterConfig } from './zpl'

export const DEFAULT_ZPL_PRINTER_CONFIG: ZplPrinterConfig = {
  host: '192.168.15.80',
  port: 9100,
  dpi: 203,
  widthMm: 70,
  heightMm: 40,
}

export function normalizarZplPrinterConfig(config: ZplPrinterConfig): ZplPrinterConfig {
  const host = config.host.trim() || DEFAULT_ZPL_PRINTER_CONFIG.host
  const port = Number.isFinite(config.port) && config.port > 0
    ? Math.floor(config.port)
    : DEFAULT_ZPL_PRINTER_CONFIG.port
  const dpi = config.dpi === 300 ? 300 : 203
  const widthMm = Number.isFinite(config.widthMm)
    ? Math.max(DEFAULT_ZPL_PRINTER_CONFIG.widthMm, Math.floor(config.widthMm))
    : DEFAULT_ZPL_PRINTER_CONFIG.widthMm
  const heightMm = Number.isFinite(config.heightMm)
    ? Math.max(DEFAULT_ZPL_PRINTER_CONFIG.heightMm, Math.floor(config.heightMm))
    : DEFAULT_ZPL_PRINTER_CONFIG.heightMm

  return { host, port, dpi, widthMm, heightMm }
}
