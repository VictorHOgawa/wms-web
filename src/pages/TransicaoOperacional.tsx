import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Radio,
  Shield,
  Sparkles,
  Users,
  Warehouse,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Modal, PageHeader, Progress } from '../components/ui'
import { useStore } from '../store/useStore'
import {
  DEMO_DEVICES,
  DEMO_EFFECTIVE_PARAMETERS,
  DEMO_OPERATIONAL_TASKS,
  DEMO_WAREHOUSES,
} from '../shared-demo'

const ETAPAS = [
  { id: 'shadow', nome: 'Shadow operation', progresso: 85, status: 'ok', detalhe: 'Pedidos e tarefas sendo comparados com o sistema legado.' },
  { id: 'cadastro', nome: 'Base mestre importada', progresso: 92, status: 'ok', detalhe: 'SKU, owners e regras críticas já revisados.' },
  { id: 'treinamento', nome: 'Treinamento do time', progresso: 68, status: 'warn', detalhe: 'Separadores e conferentes já treinados; líderes em revisão final.' },
  { id: 'virada', nome: 'Plano de virada', progresso: 56, status: 'warn', detalhe: 'Checklist de doca, romaneio, inventário e contingência em construção.' },
] as const

const OBJECOES = [
  {
    id: 'dados',
    titulo: '“E se meus dados vierem bagunçados?”',
    resposta: 'Admin mostra importação assistida, preview e normalização antes da carga.',
    tono: 'info',
  },
  {
    id: 'operacao',
    titulo: '“E se meu time travar no primeiro dia?”',
    resposta: 'Mobile empurra uma instrução por vez; web supervisiona e redistribui tarefas.',
    tono: 'primary',
  },
  {
    id: 'seguranca',
    titulo: '“Quem garante que a virada não para o armazém?”',
    resposta: 'Tela de transição mostra shadow mode, fallback e checklist de go-live.',
    tono: 'warn',
  },
] as const

export default function TransicaoOperacional() {
  const { toast, cdId } = useStore()
  const [abrirVirada, setAbrirVirada] = useState(false)
  const [abrirFallback, setAbrirFallback] = useState(false)

  const armazem = DEMO_WAREHOUSES.find((item) => item.id === cdId)
  const tarefasAtivas = useMemo(
    () => DEMO_OPERATIONAL_TASKS.filter((item) => item.armazemId === cdId).length,
    [cdId],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transição Operacional e Go-live"
        subtitle="Tela de segurança comercial para diretor, dono do armazém e gestor de implantação."
      >
        <Badge tone="primary">{armazem?.nome ?? 'CD em foco'}</Badge>
        <button className="btn-outline" onClick={() => setAbrirFallback(true)}>
          <Lock className="h-4 w-4" /> Ver contingência
        </button>
        <button className="btn-primary" onClick={() => setAbrirVirada(true)}>
          <ClipboardCheck className="h-4 w-4" /> Simular virada
        </button>
      </PageHeader>

      <div className="grid xl:grid-cols-[1.35fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2 text-ink-soft">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">Andamento da transição</span>
            </div>
            <div className="space-y-4 mt-4">
              {ETAPAS.map((etapa) => (
                <div key={etapa.id}>
                  <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand">{etapa.nome}</span>
                      <Badge tone={etapa.status === 'ok' ? 'ok' : 'warn'}>
                        {etapa.status === 'ok' ? 'controlado' : 'atenção'}
                      </Badge>
                    </div>
                    <span className="mono text-ink-soft">{etapa.progresso}%</span>
                  </div>
                  <Progress value={etapa.progresso} tone={etapa.status === 'ok' ? 'ok' : 'warn'} />
                  <p className="text-xs text-ink-muted mt-1.5">{etapa.detalhe}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <MetricCard icon={<Warehouse className="h-5 w-5 text-primary" />} label="Tarefas vivas da demo" value={`${tarefasAtivas}`} detail="mesma história entre web e mobile" />
            <MetricCard icon={<Radio className="h-5 w-5 text-ok" />} label="Coletores monitorados" value={`${DEMO_DEVICES.length}`} detail="estado exibido ao gestor" />
            <MetricCard icon={<Shield className="h-5 w-5 text-info" />} label="Regras críticas vigentes" value={`${DEMO_EFFECTIVE_PARAMETERS.length}`} detail="herdadas do admin" />
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-ink-soft">
              <Users className="h-4 w-4" />
              <span className="text-sm font-semibold">Objeções respondidas na demonstração</span>
            </div>
            <div className="space-y-3">
              {OBJECOES.map((item) => (
                <div key={item.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={item.tono as 'info' | 'primary' | 'warn'}>{item.id}</Badge>
                    <p className="text-sm font-semibold text-brand">{item.titulo}</p>
                  </div>
                  <p className="text-sm text-ink-muted mt-2">{item.resposta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 bg-primary-50/40 border-primary/10">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">Narrativa comercial sugerida</span>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-ink-soft list-decimal list-inside">
              <li>Mostrar no admin a importação assistida e as regras ativas.</li>
              <li>Abrir no frontend a fila de tarefas e a transição operacional.</li>
              <li>Executar uma tarefa no mobile com ocorrência e confirmação.</li>
              <li>Voltar ao web para mostrar segurança, contingência e supervisão.</li>
            </ol>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-ink-soft">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Pontos de segurança percebida</span>
            </div>
            <div className="space-y-3 text-sm text-ink-soft">
              <p>Shadow mode para comparar operação antiga e nova.</p>
              <p>Checklist de virada por doca, picking, inventário e expedição.</p>
              <p>Plano de fallback se o cliente quiser uma transição gradual por área.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link to="/tarefas" className="btn-outline justify-center py-2.5 text-sm">Fila de tarefas</Link>
              <Link to="/coletor" className="btn-outline justify-center py-2.5 text-sm">Demo do coletor</Link>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-ink-soft">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Decisões antes do go-live</span>
            </div>
            <div className="space-y-2">
              <ActionLine title="Corte do legado" value="Sugerido para sábado 22h" />
              <ActionLine title="Inventário de base" value="Rotativo + validação dos endereços A e B" />
              <ActionLine title="Fallback" value="Troca por corredor ou owner, sem virar tudo de uma vez" />
            </div>
            <button
              className="btn-primary w-full mt-4 py-2.5"
              onClick={() =>
                toast({
                  tipo: 'sucesso',
                  titulo: 'Plano comercial reforçado',
                  texto: 'Esta tela ajuda a responder risco, segurança e adoção na reunião.',
                })
              }
            >
              Reforçar argumento comercial
            </button>
          </div>
        </div>
      </div>

      {abrirVirada && <ViradaModal onClose={() => setAbrirVirada(false)} />}
      {abrirFallback && <FallbackModal onClose={() => setAbrirFallback(false)} />}
    </div>
  )
}

function ViradaModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Simulação de virada operacional"
      subtitle="Sequência de apresentação para o parceiro"
      footer={<button className="btn-primary" onClick={onClose}>Fechar</button>}
    >
      <div className="space-y-4 text-sm text-ink-soft">
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">1. Congelar exportação do legado</p>
          <p className="mt-1 text-ink-muted">Último pacote de cadastro e tarefas entra no ambiente de demonstração.</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">2. Validar base mestre e regras</p>
          <p className="mt-1 text-ink-muted">Admin confirma parâmetro, owner, permissões e dispositivos previstos.</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">3. Abrir operação guiada</p>
          <p className="mt-1 text-ink-muted">Supervisor acompanha a fila e operador recebe tarefa no mobile.</p>
        </div>
      </div>
    </Modal>
  )
}

function FallbackModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Plano de contingência"
      subtitle="Como mostrar segurança sem prometer backend nesta fase"
      footer={<button className="btn-primary" onClick={onClose}>Fechar</button>}
    >
      <div className="space-y-4 text-sm text-ink-soft">
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">Virada por escopo</p>
          <p className="mt-1 text-ink-muted">Começar por owner, doca ou corredor reduz risco percebido pelo cliente.</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">Shadow operation</p>
          <p className="mt-1 text-ink-muted">Comparar tarefa, saldo e conferência em paralelo antes do corte total.</p>
        </div>
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium text-brand">Treinamento assistido</p>
          <p className="mt-1 text-ink-muted">O app mobile reduz leitura e o web mostra rastreabilidade para o líder.</p>
        </div>
      </div>
    </Modal>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="card p-4">
      <div className="h-10 w-10 rounded-xl bg-surface-sub border border-line grid place-items-center">
        {icon}
      </div>
      <p className="text-2xl font-semibold text-brand mono mt-4">{value}</p>
      <p className="text-sm text-ink-soft mt-1">{label}</p>
      <p className="text-xs text-ink-muted mt-1">{detail}</p>
    </div>
  )
}

function ActionLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-sub p-3">
      <p className="text-sm text-ink-soft">{title}</p>
      <p className="text-sm font-medium text-brand text-right">{value}</p>
    </div>
  )
}
