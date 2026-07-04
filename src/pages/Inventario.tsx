import { useState } from 'react'
import { ShieldCheck, RotateCcw, Lock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Modal, PageHeader, type Tone } from '../components/ui'
import OrdemServicoPanel from '../components/OrdemServicoPanel'
import { cn } from '../lib/utils'
import type { ContagemItem } from '../lib/types'

const statusMeta: Record<ContagemItem['status'], { l: string; tone: Tone }> = {
  pendente: { l: 'A contar', tone: 'neutral' },
  ok: { l: 'Conferido', tone: 'ok' },
  divergente: { l: 'Divergente', tone: 'bad' },
  'aguardando-aprovacao': { l: 'Aguarda aprovação', tone: 'warn' },
  ajustado: { l: 'Ajustado', tone: 'primary' },
}

export default function Inventario() {
  const { contagens, registrarContagem, recontar, aprovarAjuste, toast } = useStore()
  const [contar, setContar] = useState<ContagemItem | null>(null)

  const prog = Math.round(
    (contagens.filter((c) => c.status === 'ok' || c.status === 'ajustado').length / contagens.length) * 100,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventário Rotativo (Cycle Count)"
        subtitle="Gera contagem por endereço/curva → Conta cego → Diverge? → Recontagem → Ajuste com aprovação"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Contagens do dia', v: contagens.length, tone: 'neutral' },
          { l: 'Divergências', v: contagens.filter((c) => c.status === 'divergente' || c.status === 'aguardando-aprovacao').length, tone: 'bad' },
          { l: 'Aguardando aprovação', v: contagens.filter((c) => c.status === 'aguardando-aprovacao').length, tone: 'warn' },
          { l: 'Progresso', v: `${prog}%`, tone: 'ok' },
        ].map((c) => (
          <div key={c.l} className="card p-4">
            <div className="text-2xl font-semibold text-brand mono">{c.v}</div>
            <div className="text-xs text-ink-muted mt-0.5">{c.l}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex items-start gap-3 bg-info-50/40 border-info/10">
        <RotateCcw className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <p className="text-sm text-ink-soft">
          O inventário rotativo <span className="font-medium text-brand">não para a operação</span>.
          Prioriza curva A (conta com mais frequência). Ajustes acima da tolerância exigem{' '}
          <span className="font-medium text-brand">aprovação do supervisor</span>.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Contagem</th>
              <th className="th">Endereço</th>
              <th className="th">SKU</th>
              <th className="th text-right">Sistêmico</th>
              <th className="th text-right">Contado</th>
              <th className="th text-right">Recontagem</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {contagens.map((c) => (
              <tr key={c.id} className="row-hover">
                <td className="td mono font-medium text-brand">{c.id}</td>
                <td className="td mono">{c.endereco}</td>
                <td className="td">
                  <div className="mono text-xs">{c.skuCodigo}</div>
                  <div className="text-xs text-ink-muted">{c.descricao}</div>
                </td>
                <td className="td text-right mono">{c.sistemico}</td>
                <td className="td text-right mono">{c.contado ?? '—'}</td>
                <td className="td text-right mono">{c.recontagem ?? '—'}</td>
                <td className="td"><Badge tone={statusMeta[c.status].tone}>{statusMeta[c.status].l}</Badge></td>
                <td className="td text-right">
                  {c.status === 'pendente' && (
                    <button onClick={() => setContar(c)} className="btn-outline py-1.5 px-3 text-xs">Contar</button>
                  )}
                  {c.status === 'divergente' && (
                    <button onClick={() => setContar(c)} className="btn-outline py-1.5 px-3 text-xs text-warn border-warn/30">Recontar</button>
                  )}
                  {c.status === 'aguardando-aprovacao' && (
                    <button
                      onClick={() => {
                        aprovarAjuste(c.id)
                        toast({ tipo: 'sucesso', titulo: 'Ajuste aprovado', texto: `${c.endereco} · ajuste sistêmico aplicado` })
                      }}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Aprovar ajuste
                    </button>
                  )}
                  {(c.status === 'ok' || c.status === 'ajustado') && <Lock className="h-4 w-4 text-ink-muted inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrdemServicoPanel
        title="OS de inventário rotativo"
        subtitle="Contagem cega, recontagem por divergência e ajuste com aprovação ficam na mesma fila operacional."
        tipos={['contagem', 'recontagem']}
      />

      {contar && (
        <ContarModal
          item={contar}
          onClose={() => setContar(null)}
          onConfirmar={(v) => {
            if (contar.status === 'divergente') {
              recontar(contar.id, v)
              toast({
                tipo: v === contar.sistemico ? 'sucesso' : 'aviso',
                titulo: v === contar.sistemico ? 'Recontagem confere' : 'Divergência confirmada',
                texto: v === contar.sistemico ? 'Posição conciliada' : 'Enviado para aprovação do supervisor',
              })
            } else {
              registrarContagem(contar.id, v)
              toast({
                tipo: v === contar.sistemico ? 'sucesso' : 'aviso',
                titulo: v === contar.sistemico ? 'Contagem confere' : 'Divergência detectada',
                texto: v === contar.sistemico ? `${contar.endereco} OK` : 'Recontagem necessária',
              })
            }
            setContar(null)
          }}
        />
      )}
    </div>
  )
}

function ContarModal({
  item,
  onClose,
  onConfirmar,
}: {
  item: ContagemItem
  onClose: () => void
  onConfirmar: (v: number) => void
}) {
  const [v, setV] = useState('')
  const recont = item.status === 'divergente'
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={recont ? 'Recontagem' : 'Contagem cega'}
      subtitle={`${item.endereco} · ${item.descricao}`}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={() => onConfirmar(Number(v))} disabled={v === ''} className="btn-primary">Confirmar</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={cn('rounded-xl px-3 py-2 text-xs', recont ? 'bg-warn-50 text-warn' : 'bg-surface-sub text-ink-muted')}>
          {recont
            ? `Primeira contagem: ${item.contado} un (sistêmico ${item.sistemico}). Recontagem obrigatória.`
            : 'Conte fisicamente sem ver o estoque sistêmico — contagem cega.'}
        </div>
        <div>
          <label className="label">Quantidade contada</label>
          <input
            autoFocus
            type="number"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="0"
            className="input mono text-2xl text-center py-4"
          />
        </div>
      </div>
    </Modal>
  )
}
