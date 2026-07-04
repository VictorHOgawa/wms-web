import { Building2, Boxes, Printer, Smartphone, Users, Workflow } from 'lucide-react'
import { Badge, PageHeader, SelectField } from '../components/ui'
import { useStore } from '../store/useStore'
import type { ZplPrinterConfig } from '../lib/zpl'
import {
  DEMO_DEVICES,
  DEMO_EFFECTIVE_PARAMETERS,
  DEMO_OWNERS,
  DEMO_WAREHOUSES,
} from '../../../wms-shared-demo'

const grupos = [...new Set(DEMO_EFFECTIVE_PARAMETERS.map((item) => item.grupo))]

export default function Configuracoes() {
  const { perfil, cdId, zplPrinterConfig, atualizarZplPrinterConfig } = useStore()
  const armazem = DEMO_WAREHOUSES.find((item) => item.id === cdId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regras vigentes da operacao"
        subtitle="Visao somente leitura para supervisao. Toda alteracao de regra acontece no wms-admin-business."
      >
        <Badge tone="primary">Origem oficial: Admin Business</Badge>
      </PageHeader>

      <div className="card p-4 flex items-start gap-3 bg-primary-50 border-primary/10">
        <Workflow className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-ink-soft">
          <p className="font-medium text-brand">Fronteira consolidada</p>
          <p className="mt-1">
            O web operacional consulta as regras efetivas e acompanha a operacao. O mobile executa
            bipagem e confirmacao. O admin governa parametro, permissao e escopo.
          </p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo} className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-line bg-surface-sub flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-brand">{grupo}</p>
              </div>
              <div className="divide-y divide-line">
                {DEMO_EFFECTIVE_PARAMETERS.filter((item) => item.grupo === grupo).map((item) => (
                  <div key={item.chave} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-brand">{item.label}</p>
                        <Badge tone="info">{item.escopoLabel}</Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">{item.descricao}</p>
                      <p className="text-[11px] text-ink-muted mt-2">
                        Consumido por: {item.consumidoPor.join(' + ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">{item.valorLabel}</p>
                      <p className="text-xs text-ink-muted mt-1">Editar no {item.gerenciadoPor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-sub px-5 py-3">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-brand">Impressora de etiquetas ZPL</p>
              </div>
              <Badge tone="info">{zplPrinterConfig.host}:{zplPrinterConfig.port}</Badge>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr]">
              <div>
                <label htmlFor="config-zpl-host" className="label">Host/IP Zebra</label>
                <input
                  id="config-zpl-host"
                  value={zplPrinterConfig.host}
                  onChange={(event) => atualizarZplPrinterConfig({ ...zplPrinterConfig, host: event.target.value })}
                  className="input mono"
                />
              </div>
              <div>
                <label htmlFor="config-zpl-port" className="label">Porta</label>
                <input
                  id="config-zpl-port"
                  type="number"
                  min={1}
                  value={zplPrinterConfig.port}
                  onChange={(event) => atualizarZplPrinterConfig({ ...zplPrinterConfig, port: Number(event.target.value || 0) })}
                  className="input mono"
                />
              </div>
              <div>
                <label htmlFor="config-zpl-dpi" className="label">DPI</label>
                <SelectField
                  id="config-zpl-dpi"
                  value={zplPrinterConfig.dpi}
                  onChange={(value) => atualizarZplPrinterConfig({ ...zplPrinterConfig, dpi: Number(value) as ZplPrinterConfig['dpi'] })}
                  options={[
                    { value: '203', label: '203' },
                    { value: '300', label: '300' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="config-zpl-width" className="label">Largura mm</label>
                <input
                  id="config-zpl-width"
                  type="number"
                  min={70}
                  value={zplPrinterConfig.widthMm}
                  onChange={(event) => atualizarZplPrinterConfig({ ...zplPrinterConfig, widthMm: Number(event.target.value || 0) })}
                  className="input mono"
                />
              </div>
              <div>
                <label htmlFor="config-zpl-height" className="label">Altura mm</label>
                <input
                  id="config-zpl-height"
                  type="number"
                  min={40}
                  value={zplPrinterConfig.heightMm}
                  onChange={(event) => atualizarZplPrinterConfig({ ...zplPrinterConfig, heightMm: Number(event.target.value || 0) })}
                  className="input mono"
                />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-ink-soft">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Escopo operacional em foco</span>
            </div>
            <p className="text-base font-semibold text-brand">{armazem?.nome ?? 'CD nao encontrado'}</p>
            <p className="text-xs text-ink-muted mt-1">
              {armazem?.cidade}, {armazem?.uf} · modo {armazem?.modo ?? '—'}
            </p>
            <div className="mt-4 space-y-2">
              {DEMO_WAREHOUSES.map((item) => (
                <div key={item.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium text-brand">{item.nome}</p>
                  <p className="text-xs text-ink-muted">{item.codigo} · {item.modo}</p>
                </div>
              ))}
            </div>
          </div>

          {perfil === '3pl' && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3 text-ink-soft">
                <Users className="h-4 w-4" />
                <span className="text-sm font-semibold">Owners ativos na demo</span>
              </div>
              <div className="space-y-2">
                {DEMO_OWNERS.map((owner) => (
                  <div key={owner.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: owner.cor }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-brand">{owner.nome}</p>
                      <p className="text-xs text-ink-muted">{owner.cnpj}</p>
                    </div>
                    <Badge tone={owner.ativo ? 'ok' : 'neutral'}>{owner.ativo ? 'ativo' : 'inativo'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-ink-soft">
              <Smartphone className="h-4 w-4" />
              <span className="text-sm font-semibold">Dispositivos monitorados</span>
            </div>
            <div className="space-y-2">
              {DEMO_DEVICES.map((device) => (
                <div key={device.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-brand">{device.nome}</p>
                    <Badge tone={device.status === 'online' ? 'ok' : device.status === 'offline' ? 'neutral' : 'warn'}>
                      {device.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">Operador: {device.operador}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
