import { QRCodeSVG } from 'qrcode.react'
import type { ReactNode } from 'react'
import {
  Barcode,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  QrCode,
  ScanLine,
  Smartphone,
  Truck,
} from 'lucide-react'
import { Badge, PageHeader } from '../components/ui'
import {
  DEMO_CHECKLIST_TEMPLATES,
  DEMO_OPERATIONAL_TASKS,
  DEMO_RECEBIMENTOS_WEB,
} from '../../../wms-shared-demo'

const RECEBIMENTO_TESTE_ESPERADO = {
  tarefaId: 'T-9011',
  doca: 'DOCA-03',
}

const BIPAGEM_TESTE_ESPERADO = {
  tarefaId: 'T-REC-BIP-2041',
  etiqueta: 'ETQ-REC-2041-SKU-10241-001',
}

const tarefaRecebimento = DEMO_OPERATIONAL_TASKS.find(
  (item) => item.id === RECEBIMENTO_TESTE_ESPERADO.tarefaId,
)
const tarefaBipagem = DEMO_OPERATIONAL_TASKS.find(
  (item) => item.id === BIPAGEM_TESTE_ESPERADO.tarefaId,
)
const recebimentoTeste = DEMO_RECEBIMENTOS_WEB.find((item) => item.id === 'REC-2041')
const checklistEntrada = DEMO_CHECKLIST_TEMPLATES.find((item) => item.code === 'REC-CHEGADA')

const statusContrato = [
  ['Tarefa mobile', RECEBIMENTO_TESTE_ESPERADO.tarefaId],
  ['OS bipagem', BIPAGEM_TESTE_ESPERADO.tarefaId],
  ['Doca esperada', RECEBIMENTO_TESTE_ESPERADO.doca],
  ['Etiqueta WEB', BIPAGEM_TESTE_ESPERADO.etiqueta],
  ['Recebimento', recebimentoTeste?.id ?? 'REC-2041'],
]

export default function Teste() {
  if (!tarefaRecebimento || !tarefaBipagem || !recebimentoTeste || !checklistEntrada) {
    return (
      <div className="space-y-6">
        <PageHeader title="TESTE" subtitle="Contrato de recebimento indisponivel." />
        <div className="card border-bad/30 bg-bad-50 p-4 text-sm font-semibold text-bad">
          O shared-demo nao encontrou T-9011, T-REC-BIP-2041, REC-2041 ou o checklist REC-CHEGADA.
        </div>
      </div>
    )
  }

  const fluxoMobileTeste = [
    ...tarefaRecebimento.passos,
    { instrucao: 'Checklist de chegada', rotulo: 'Placa, motorista, fotos e estado da carga', esperado: 'placa + motorista' },
    ...tarefaBipagem.passos,
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="TESTE"
        subtitle="Bancada de recebimento para abrir no web e validar a leitura pelo wms-mobile."
      >
        <Badge tone="primary" dot>Contrato mobile</Badge>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-brand px-5 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Recebimento teste</p>
                <h2 className="mt-1 text-lg font-semibold">{recebimentoTeste.id} - {recebimentoTeste.documento}</h2>
              </div>
              <Badge tone="info">{tarefaRecebimento.id}</Badge>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-xl border border-line bg-surface-sub p-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-brand">QR Code da doca</p>
              </div>
              <div className="mt-4 rounded-xl border border-line bg-white p-4">
                <QRCodeSVG
                  value={RECEBIMENTO_TESTE_ESPERADO.doca}
                  size={184}
                  level="H"
                  marginSize={4}
                  title="QR Code DOCA-03"
                  className="mx-auto"
                />
              </div>
              <p className="mono mt-3 text-center text-2xl font-black text-primary">
                {RECEBIMENTO_TESTE_ESPERADO.doca}
              </p>
              <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
                No mobile, abra Receber e use a tarefa {RECEBIMENTO_TESTE_ESPERADO.tarefaId}.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-accent" />
                  <p className="text-sm font-semibold text-brand">Etiqueta de /etiquetagem para bipar</p>
                </div>
                <Badge tone="accent">{tarefaBipagem.id}</Badge>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                <div className="rounded-xl border border-line bg-surface-sub p-3">
                  <QRCodeSVG
                    value={BIPAGEM_TESTE_ESPERADO.etiqueta}
                    size={148}
                    level="H"
                    marginSize={3}
                    title="Etiqueta ETQ-REC-2041-SKU-10241-001"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Codigo esperado na OS de bipagem</p>
                  <p className="mono mt-1 text-2xl font-black text-brand">{BIPAGEM_TESTE_ESPERADO.etiqueta}</p>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">
                    {recebimentoTeste.itens[0]?.descricao ?? 'Produto do recebimento'}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Depois do checklist e da conferencia documental, a camera do Expo Go deve ler esta etiqueta.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniInfo label="Fornecedor" value={recebimentoTeste.fornecedor} />
                <MiniInfo label="Placa" value={recebimentoTeste.placa ?? '-'} mono />
                <MiniInfo label="Motorista" value={recebimentoTeste.motorista ?? '-'} />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-brand">Fluxo no wms-mobile</h2>
          </div>
          <div className="mt-4 space-y-3">
            {fluxoMobileTeste.map((passo, index) => (
              <div key={`${passo.rotulo}-${index}`} className="rounded-xl border border-line bg-surface-sub p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand">{passo.instrucao}</p>
                      <p className="text-xs text-ink-muted">{passo.rotulo}</p>
                    </div>
                  </div>
                  <span className="mono shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-primary">
                    {passo.esperado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-info" />
            <h2 className="text-base font-semibold text-brand">Checklist de chegada</h2>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            O recebimento entra no mobile com checklist de entrada antes de liberar a conferencia fisica.
          </p>
          <div className="mt-4 space-y-2">
            {checklistEntrada.questions.map((question) => (
              <div key={question.id} className="rounded-xl border border-line bg-surface-sub px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-ink-soft">{question.text}</p>
                  {question.blocksStep && <Badge tone="bad">bloqueia</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-muted">
                  {question.requiresPhotoOnFail && <span>foto se falhar</span>}
                  {question.requiresObservationOnFail && <span>observacao se falhar</span>}
                  {question.requiresSupervisor && <span>supervisor</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-ok" />
            <h2 className="text-base font-semibold text-brand">Como testar no celular</h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ChecklistItem icon={<Smartphone className="h-4 w-4" />} title="1. Recebimento" text="Expo Go -> Receber -> tarefa T-9011." />
            <ChecklistItem icon={<Camera className="h-4 w-4" />} title="2. Ler doca" text="Aponte para o QR DOCA-03; em seguida abre placa, motorista, fotos e estado da carga." />
            <ChecklistItem icon={<ScanLine className="h-4 w-4" />} title="3. Bipagem" text="Depois da conferencia documental, abra Bipagem -> T-REC-BIP-2041 e leia a etiqueta." />
            <ChecklistItem icon={<Truck className="h-4 w-4" />} title="4. Contagem" text="Informe 10 caixas; o mobile converte para 120 unidades." />
          </div>

          <div className="mt-5 rounded-xl border border-ok/30 bg-ok-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
              <div>
                <p className="text-sm font-semibold text-ok">Contrato esperado</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {statusContrato.map(([label, value]) => (
                    <MiniInfo key={label} label={label} value={value} mono />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MiniInfo({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold text-brand ${mono ? 'mono' : ''}`}>{value}</p>
    </div>
  )
}

function ChecklistItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-sm font-semibold text-brand">{title}</p>
      </div>
      <p className="mt-1 text-xs font-medium text-ink-muted">{text}</p>
    </div>
  )
}
