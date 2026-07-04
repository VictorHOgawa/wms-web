import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BatteryFull,
  CheckCircle2,
  MapPin,
  PackageCheck,
  ScanLine,
  Signal,
  Smartphone,
  Truck,
  Wifi,
} from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'
import { cn } from '../lib/utils'
import { DEMO_OPERATIONAL_TASKS } from '../../../wms-shared-demo'
import { useStore } from '../store/useStore'
import { statusTarefaLabel, tipoTarefaLabel } from '../lib/tarefaMeta'

type Fluxo = 'separar' | 'receber' | 'guardar'

const fluxoMeta: Record<Fluxo, { nome: string; cor: string; papel: string }> = {
  separar: {
    nome: 'Picking RF',
    cor: 'text-primary',
    papel: 'Demonstra como o operador executa a tarefa no app mobile.',
  },
  receber: {
    nome: 'Recebimento RF',
    cor: 'text-info',
    papel: 'Mostra a conferencia cega e o scan-to-confirm em doca.',
  },
  guardar: {
    nome: 'Putaway RF',
    cor: 'text-accent',
    papel: 'Mostra a validacao do destino sugerido pelo sistema.',
  },
}

export default function Coletor() {
  const osAtribuidas = useStore((s) => s.tarefas.filter((t) => t.operador && t.status !== 'feito'))
  const [fluxo, setFluxo] = useState<Fluxo>('separar')
  const [passo, setPasso] = useState(0)
  const [val, setVal] = useState('')
  const [erro, setErro] = useState(false)
  const [done, setDone] = useState(false)

  const tarefa = useMemo(
    () => DEMO_OPERATIONAL_TASKS.find((item) => item.fluxo === fluxo)!,
    [fluxo],
  )
  const p = tarefa.passos[passo]

  const trocar = (novoFluxo: Fluxo) => {
    setFluxo(novoFluxo)
    setPasso(0)
    setVal('')
    setErro(false)
    setDone(false)
  }

  const confirmar = () => {
    if (val.trim().toUpperCase() !== p.esperado.toUpperCase()) {
      setErro(true)
      return
    }

    setErro(false)
    setVal('')
    if (passo + 1 < tarefa.passos.length) setPasso(passo + 1)
    else setDone(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coletor RF — Simulador comercial"
        subtitle="Tela de demonstracao para apresentar o scan-to-confirm. A execucao oficial do operador permanece no wms-mobile."
      >
        <Badge tone="warn">Classificacao: demo</Badge>
      </PageHeader>

      <div className="card p-4 flex items-start gap-3 bg-primary-50 border-primary/10">
        <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-ink-soft">
          <p className="font-medium text-brand">Fronteira assumida nesta fase</p>
          <p className="mt-1">
            Esta tela existe para apresentacao e treinamento. Bipagem real, fila do operador e
            registro de ocorrencia pertencem ao app mobile.
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-brand">OS atribuídas para execução no app</h2>
          <Badge tone="primary" dot>{osAtribuidas.length} ativas</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {osAtribuidas.slice(0, 4).map((os) => (
            <div key={os.id} className="rounded-xl border border-line bg-surface-sub p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-xs font-semibold text-brand">{os.id}</span>
                <Badge tone={os.status === 'problema' ? 'bad' : os.status === 'fazendo' ? 'primary' : 'neutral'}>
                  {statusTarefaLabel(os.status)}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-medium text-ink-soft line-clamp-2">{os.descricao}</p>
              <p className="mt-2 text-xs text-ink-muted">{tipoTarefaLabel(os.tipo)} · {os.operador}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
        <div className="space-y-4 order-2 lg:order-1">
          <div className="card p-5">
            <h3 className="font-semibold text-brand mb-3">Selecione o fluxo demo</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              {(Object.keys(fluxoMeta) as Fluxo[]).map((id) => (
                <button
                  key={id}
                  onClick={() => trocar(id)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-medium transition-colors cursor-pointer',
                    fluxo === id ? 'border-primary bg-primary-50 text-primary' : 'border-line text-ink-soft hover:bg-surface-sub',
                  )}
                >
                  {fluxoMeta[id].nome}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted mt-3">{fluxoMeta[fluxo].papel}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-brand">Tarefa apresentada</h3>
                <p className="text-xs text-ink-muted">{tarefa.id} · {tarefa.resumo}</p>
              </div>
              <Badge tone={tarefa.prioridade === 'alta' ? 'bad' : 'info'}>{tarefa.prioridade}</Badge>
            </div>
            <p className="text-sm text-ink-soft">{tarefa.contexto}</p>
            <div className="space-y-2 mt-4">
              {tarefa.passos.map((item, index) => (
                <div
                  key={`${tarefa.id}-${index}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                    done || index < passo ? 'border-ok/40 bg-ok-50' : index === passo ? 'border-primary bg-primary-50' : 'border-line',
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-lg grid place-items-center text-xs font-semibold', done || index < passo ? 'bg-ok text-white' : index === passo ? 'bg-primary text-white' : 'bg-slate-100 text-ink-muted')}>
                    {done || index < passo ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand">{item.instrucao}</p>
                    <p className="text-xs text-ink-muted">{item.rotulo}</p>
                  </div>
                  <span className="mono text-xs text-ink-muted">{item.esperado}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 flex items-start gap-3 bg-warn-50/40 border-warn/10">
            <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
            <p className="text-sm text-ink-soft">
              Excecao continua tratada dentro do fluxo. Em demonstracao comercial, o ideal e abrir
              esta tela e em seguida mostrar o `wms-mobile` registrando a ocorrencia.
            </p>
          </div>
        </div>

        <div className="order-1 lg:order-2 mx-auto">
          <div className="w-[320px] rounded-[2.5rem] bg-brand p-3 shadow-phone">
            <div className="rounded-[2rem] bg-surface-sub overflow-hidden">
              <div className="flex items-center justify-between px-5 py-2 bg-brand text-white text-xs">
                <span className="mono">08:42</span>
                <div className="flex items-center gap-1.5">
                  <Signal className="h-3.5 w-3.5" />
                  <Wifi className="h-3.5 w-3.5" />
                  <BatteryFull className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="px-5 py-3 bg-brand text-white">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Integra WMS · Demo</p>
                <p className={cn('font-semibold', fluxoMeta[fluxo].cor)}>{fluxoMeta[fluxo].nome}</p>
              </div>

              <div className="p-5 min-h-[420px] flex flex-col">
                {!done ? (
                  <>
                    <div className="text-center">
                      <p className="text-xs font-medium text-ink-muted">Passo {passo + 1} de {tarefa.passos.length}</p>
                      <div className="mt-4 mx-auto h-16 w-16 rounded-2xl bg-primary-50 text-primary grid place-items-center">
                        {(fluxo === 'receber' ? <Truck className="h-7 w-7" /> : <MapPin className="h-7 w-7" />)}
                      </div>
                      <p className="mt-4 text-lg font-semibold text-brand leading-tight">{p.instrucao}</p>
                      <p className="mt-2 mono text-2xl font-bold text-primary tracking-tight">{p.esperado}</p>
                      {p.dica && <p className="text-xs text-ink-muted mt-2">{p.dica}</p>}
                    </div>

                    <div className="mt-auto pt-6">
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 bg-surface transition-colors',
                          erro ? 'border-bad' : 'border-line focus-within:border-primary',
                        )}
                      >
                        <ScanLine className="h-5 w-5 text-ink-muted" />
                        <input
                          value={val}
                          onChange={(event) => {
                            setVal(event.target.value)
                            setErro(false)
                          }}
                          onKeyDown={(event) => event.key === 'Enter' && confirmar()}
                          placeholder={p.rotulo}
                          className="flex-1 bg-transparent outline-none text-sm mono"
                        />
                      </div>
                      {erro && <p className="text-xs text-bad mt-1.5 text-center">Nao confere com o esperado. Digite novamente.</p>}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setVal(p.esperado)} className="btn-outline flex-1 py-2.5 text-xs">
                          Simular bip
                        </button>
                        <button onClick={confirmar} className="btn-primary flex-1 py-2.5">
                          Confirmar <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="h-20 w-20 rounded-full bg-ok-50 text-ok grid place-items-center animate-pulse-ok">
                      <PackageCheck className="h-10 w-10" />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-brand">Tarefa demonstrada</p>
                    <p className="text-sm text-ink-muted mt-1">{tarefa.conclusao}</p>
                    <button onClick={() => trocar(fluxo)} className="btn-primary mt-6 py-2.5 px-6">
                      Reiniciar demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-ink-muted mt-3">Use “Simular bip” para a narrativa comercial</p>
        </div>
      </div>
    </div>
  )
}
