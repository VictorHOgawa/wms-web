import { useEffect, useState } from 'react'
import { GitCompareArrows, PackageCheck, PackageX, ArrowRight, Plus } from 'lucide-react'
import { isConnected, wmsApi, type WmsConfrontoChaveDTO, type WmsConfrontoDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

/**
 * Confronto carga × descarga (decisão 26): o sistema cruza os volumes bipados no
 * carregamento (hub) com os bipados na descarga (destino) e acusa sozinho o que
 * faltou/sobrou — sem telefonema. Aqui a torre registra os dois lados (colar os
 * códigos de etiqueta) e vê o resultado; no chão o coletor faz por bipagem.
 */
export default function Confronto() {
  const conectado = isConnected()
  const [chaves, setChaves] = useState<WmsConfrontoChaveDTO[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [res, setRes] = useState<WmsConfrontoDTO | null>(null)
  const [loading, setLoading] = useState(conectado)

  const carregar = async () => {
    try { setChaves(await wmsApi.confrontoChaves()) } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const abrir = async (chave: string) => {
    setSel(chave)
    try { setRes(await wmsApi.confronto(chave)) } catch { setRes(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Confronto carga × descarga" subtitle="Cruza os volumes bipados no carregamento e na descarga — o sistema acusa a diferença sozinho">
        {conectado ? <Badge tone="ok">{num(chaves.length)} cargas · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && <RegistrarBox onSaved={async (chave) => { await carregar(); await abrir(chave) }} />}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Cargas</div>
          {chaves.length === 0 ? (
            <EmptyState icon={<GitCompareArrows className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma carga'} text="Registre um carregamento e uma descarga para confrontar." />
          ) : (
            <ul>
              {chaves.map((k) => (
                <li key={k.chave}>
                  <button
                    className={`w-full text-left px-4 py-2.5 border-b border-line hover:bg-surface-sub/50 ${sel === k.chave ? 'bg-surface-sub' : ''}`}
                    onClick={() => abrir(k.chave)}
                  >
                    <div className="mono text-sm text-brand">{k.chave}</div>
                    <div className="flex gap-1.5 mt-1">
                      <Badge tone={k.temCarga ? 'ok' : 'neutral'}>{k.temCarga ? 'carga ✓' : 'sem carga'}</Badge>
                      <Badge tone={k.temDescarga ? 'ok' : 'neutral'}>{k.temDescarga ? 'descarga ✓' : 'sem descarga'}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          {!res ? (
            <EmptyState icon={<GitCompareArrows className="h-6 w-6" />} title="Selecione uma carga" text="Escolha uma carga à esquerda para ver o confronto." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1 rounded-xl border border-line bg-surface-sub p-3">
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">Carregamento</div>
                  <div className="text-xl font-bold text-ink tabular-nums">{num(res.carga?.total ?? 0)}</div>
                  <div className="text-xs text-ink-muted">{res.carga?.responsavel ?? '—'}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-muted shrink-0" />
                <div className="flex-1 rounded-xl border border-line bg-surface-sub p-3">
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">Descarga</div>
                  <div className="text-xl font-bold text-ink tabular-nums">{num(res.descarga?.total ?? 0)}</div>
                  <div className="text-xs text-ink-muted">{res.descarga?.responsavel ?? '—'}</div>
                </div>
              </div>

              {!res.carga || !res.descarga ? (
                <div className="rounded-xl border border-warn/30 bg-warn-50 p-3 text-sm text-warn">
                  Falta registrar {(!res.carga ? 'o carregamento' : 'a descarga')} para confrontar.
                </div>
              ) : res.bate ? (
                <div className="rounded-xl border border-ok/30 bg-ok-50 p-3 text-sm text-ok flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" /> Carga e descarga batem — nenhum volume divergente.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ListaDiverg titulo="Faltando (saiu e não chegou)" tone="bad" itens={res.faltando} />
                  <ListaDiverg titulo="Sobrando (chegou sem sair)" tone="warn" itens={res.sobrando} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ListaDiverg({ titulo, tone, itens }: { titulo: string; tone: 'bad' | 'warn'; itens: string[] }) {
  const cor = tone === 'bad' ? 'text-bad' : 'text-warn'
  return (
    <div className="rounded-xl border border-line p-3">
      <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${cor}`}>
        <PackageX className="h-3.5 w-3.5" /> {titulo} · {num(itens.length)}
      </div>
      {itens.length === 0 ? (
        <div className="text-xs text-ink-muted">nenhum</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {itens.map((c) => <span key={c} className="mono text-[11px] rounded border border-line bg-surface-sub px-1.5 py-0.5">{c}</span>)}
        </div>
      )}
    </div>
  )
}

function RegistrarBox({ onSaved }: { onSaved: (chave: string) => void }) {
  const [chave, setChave] = useState('')
  const [tipo, setTipo] = useState<'CARGA' | 'DESCARGA'>('CARGA')
  const [codigos, setCodigos] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const salvar = async () => {
    const lista = codigos.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean)
    if (!chave.trim() || lista.length === 0) return
    setBusy(true); setErr(null)
    try {
      await wmsApi.registrarConfronto({ chave: chave.trim(), tipo, codigos: lista })
      setCodigos('')
      onSaved(chave.trim())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div>
          <label className="text-xs font-medium text-ink-muted">Chave da carga (viagem/pallet)</label>
          <input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="ex.: VGM-2026-055" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Momento</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'CARGA' | 'DESCARGA')} className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none">
            <option value="CARGA">Carregamento (hub)</option>
            <option value="DESCARGA">Descarga (destino)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-ink-muted">Códigos das etiquetas bipadas (separados por espaço/vírgula)</label>
        <textarea value={codigos} onChange={(e) => setCodigos(e.target.value)} rows={2} placeholder="V1A2B3… V4C5D6…" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
      </div>
      {err && <div className="text-xs text-bad">{err}</div>}
      <button className="btn-primary ml-auto" disabled={busy || !chave.trim() || !codigos.trim()} onClick={salvar}>
        <Plus className="h-4 w-4" /> Registrar {tipo === 'CARGA' ? 'carregamento' : 'descarga'}
      </button>
    </div>
  )
}
