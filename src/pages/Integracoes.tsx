import { RefreshCw, Database, Truck, ShoppingCart, FileCode2, CheckCircle2, AlertTriangle, Loader2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { INTEGRACOES } from '../lib/mock'
import { Badge, PageHeader } from '../components/ui'
import { num } from '../lib/utils'
import type { Integracao } from '../lib/types'
import { useStore } from '../store/useStore'

const tipoIcon: Record<Integracao['tipo'], LucideIcon> = {
  ERP: Database,
  TMS: Truck,
  Marketplace: ShoppingCart,
  EDI: FileCode2,
  Transportadora: Truck,
}

export default function Integracoes() {
  const { toast } = useStore()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        subtitle="ERP, TMS/transportadoras, marketplaces e EDI — pedidos, estoque, fiscal e documentos em tempo real"
      >
        <Link to="/transicao-operacional" className="btn-outline">Plano de transição</Link>
        <button
          className="btn-outline"
          onClick={() =>
            toast({
              tipo: 'info',
              titulo: 'Sincronização simulada',
              texto: 'A demo atualiza o status visual das integrações sem depender de backend.',
            })
          }
        >
          <RefreshCw className="h-4 w-4" /> Sincronizar tudo
        </button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRACOES.map((i) => {
          const Icon = tipoIcon[i.tipo]
          return (
            <div key={i.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-surface-sub border border-line grid place-items-center text-ink-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-brand">{i.nome}</p>
                    <p className="text-xs text-ink-muted">{i.tipo}</p>
                  </div>
                </div>
                {i.status === 'conectado' && <Badge tone="ok" dot><CheckCircle2 className="h-3.5 w-3.5" /> Conectado</Badge>}
                {i.status === 'erro' && <Badge tone="bad" dot><AlertTriangle className="h-3.5 w-3.5" /> Erro</Badge>}
                {i.status === 'sincronizando' && <Badge tone="primary"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sincronizando</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-sub p-3">
                  <p className="text-xs text-ink-muted">Última sync</p>
                  <p className="text-sm font-medium text-brand">{i.ultimaSync}</p>
                </div>
                <div className="rounded-xl bg-surface-sub p-3">
                  <p className="text-xs text-ink-muted">Registros</p>
                  <p className="text-sm font-medium text-brand mono">{num(i.registros)}</p>
                </div>
              </div>
              {i.status === 'erro' && (
                <div className="mt-3 rounded-xl bg-bad-50 text-bad text-xs px-3 py-2">
                  Falha de autenticação no parceiro. Reconfigurar credenciais EDI.
                </div>
              )}
              <button
                className="btn-outline w-full mt-3 py-2 text-sm"
                onClick={() =>
                  toast({
                    tipo: i.status === 'erro' ? 'aviso' : 'sucesso',
                    titulo: i.status === 'erro' ? 'Fluxo de reconexão aberto' : 'Integração pronta para revisão',
                    texto: `${i.nome} foi marcada para apresentação ao parceiro.`,
                  })
                }
              >
                {i.status === 'erro' ? 'Reconectar' : 'Configurar'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
