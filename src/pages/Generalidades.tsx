import { useEffect, useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { isConnected, wmsApi, type WmsGeneralidadeDTO, type WmsOwnerLiteDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const PAPEL_LABEL: Record<string, string> = {
  destinatario: 'Destinatário', remetente: 'Remetente', tomador: 'Tomador', qualquer: 'Qualquer',
}
const PAPEL_TONE: Record<string, Tone> = {
  destinatario: 'primary', remetente: 'info', tomador: 'neutral', qualquer: 'neutral',
}

export default function Generalidades() {
  const conectado = isConnected()
  const [regras, setRegras] = useState<WmsGeneralidadeDTO[]>([])
  const [owners, setOwners] = useState<WmsOwnerLiteDTO[]>([])
  const [filtroOwner, setFiltroOwner] = useState('')
  const [loading, setLoading] = useState(conectado)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [g, ow] = await Promise.all([wmsApi.generalidades(), wmsApi.owners()])
        if (!vivo) return
        setRegras(g)
        setOwners(ow)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const nomeOwner = (id: string | null) => (id ? owners.find((o) => o.id === id)?.nome ?? id.slice(0, 8) : 'Todos os clientes')
  const lista = useMemo(
    () => regras.filter((g) => (filtroOwner === '' ? true : filtroOwner === '__todos' ? g.ownerId === null : g.ownerId === filtroOwner)),
    [regras, filtroOwner],
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Generalidades do cliente" subtitle="Regras consultivas para montar/receber a carga — a regra do recebedor prevalece (governadas no admin)">
        {conectado ? (
          <Badge tone="ok">{num(lista.length)} regras · WMS</Badge>
        ) : (
          <Badge tone="warn">modo demo — conecte ao WMS para ver</Badge>
        )}
      </PageHeader>

      {conectado && (
        <div className="card p-3">
          <select
            value={filtroOwner}
            onChange={(e) => setFiltroOwner(e.target.value)}
            className="rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos os clientes e regras gerais</option>
            <option value="__todos">Só regras gerais (todos os clientes)</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Cliente</th>
                <th className="th">Papel</th>
                <th className="th">Regra</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((g) => (
                <tr key={g.id} className="row-hover align-top">
                  <td className="td text-sm">{g.ownerId ? nomeOwner(g.ownerId) : <span className="text-ink-muted">Todos</span>}</td>
                  <td className="td"><Badge tone={PAPEL_TONE[g.papel] ?? 'neutral'}>{PAPEL_LABEL[g.papel] ?? g.papel}</Badge></td>
                  <td className="td text-ink max-w-xl">{g.texto}</td>
                  <td className="td"><Badge tone={g.active ? 'ok' : 'neutral'} dot>{g.active ? 'Ativa' : 'Inativa'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <EmptyState
            icon={<MessageSquareText className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhuma generalidade') : 'Sem conexão com o WMS'}
            text={
              conectado
                ? 'As regras consultivas por cliente são cadastradas no painel administrativo e aparecem aqui para consulta.'
                : 'Entre com credenciais reais do Hub para consultar as generalidades.'
            }
          />
        )}
      </div>
    </div>
  )
}
