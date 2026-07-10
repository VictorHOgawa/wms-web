import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, RoundedBox, Text } from '@react-three/drei'
import { PageHeader, Badge } from '../components/ui'
import { isConnected, wmsApi, type WmsAddressLiteDTO } from '../lib/wmsApi'
import { num } from '../lib/utils'

/**
 * Planta 3D REAL (v1 — direção do dono, 10/07): o galpão desenhado a partir do
 * CADASTRO de endereços, colorido pela OCUPAÇÃO real (vagas de palete).
 * Endereço com estrutura (rua/coluna/nível) vai para o rack exato; sem
 * estrutura, entra em sequência na fileira da própria zona. Clique numa célula
 * para ver o detalhe. Evolução prevista: volumes/pallets dentro da célula.
 */

const COL_W = 1.6
const LEVEL_H = 1.1
const ROW_GAP = 3.2
const BOX = { w: 1.35, h: 0.9, d: 1.1 }

type Celula = {
  addr: WmsAddressLiteDTO & { rua?: string | null; coluna?: number | null; nivel?: number | null }
  x: number
  y: number
  z: number
}

function corDo(addr: Celula['addr']): string {
  if (addr.blocked) return '#334155'
  if (addr.type === 'RECEBIMENTO') return '#f59e0b'
  if (addr.cheio) return '#ef4444'
  if ((addr.vagasOcupadas ?? 0) > 0) return '#38bdf8'
  return '#e2e8f0'
}

export default function Planta3DReal() {
  const conectado = isConnected()
  const [enderecos, setEnderecos] = useState<Celula['addr'][]>([])
  const [sel, setSel] = useState<Celula['addr'] | null>(null)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    wmsApi
      .addresses()
      .then((ends) => {
        if (vivo) setEnderecos(ends as Celula['addr'][])
      })
      .catch(() => {
        /* fica vazio (estado honesto) */
      })
    return () => {
      vivo = false
    }
  }, [conectado])

  // Layout: uma FILEIRA por rua (ou por zona, para endereço sem estrutura).
  const celulas = useMemo<Celula[]>(() => {
    const porFileira = new Map<string, Celula['addr'][]>()
    for (const e of enderecos) {
      const chave = e.rua ?? `zona:${e.zoneRef?.name ?? e.type}`
      ;(porFileira.get(chave) ?? porFileira.set(chave, []).get(chave)!).push(e)
    }
    const fileiras = [...porFileira.entries()].sort(([a], [b]) => a.localeCompare(b))
    const out: Celula[] = []
    fileiras.forEach(([, ends], linha) => {
      // Com estrutura usa a coluna/nível reais; sem estrutura, enfileira.
      let seq = 0
      const usadas = new Set<string>()
      for (const e of ends.sort((a, b) => a.code.localeCompare(b.code))) {
        let col = e.coluna ?? null
        const niv = e.nivel ?? 1
        if (col == null || usadas.has(`${col}:${niv}`)) {
          do {
            seq += 1
            col = seq + 10 // sem estrutura: à direita das colunas reais
          } while (usadas.has(`${col}:${niv}`))
        }
        usadas.add(`${col}:${niv}`)
        out.push({ addr: e, x: (col - 1) * COL_W, y: (niv - 1) * LEVEL_H + BOX.h / 2, z: linha * ROW_GAP })
      }
    })
    return out
  }, [enderecos])

  const rotulos = useMemo(() => {
    const porLinha = new Map<number, { z: number; nome: string }>()
    for (const c of celulas) {
      if (!porLinha.has(c.z)) {
        const zona = c.addr.zoneRef?.name ?? c.addr.type
        porLinha.set(c.z, { z: c.z, nome: c.addr.rua ? `Rua ${c.addr.rua} · ${zona}` : zona })
      }
    }
    return [...porLinha.values()]
  }, [celulas])

  const cheios = enderecos.filter((e) => e.cheio).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planta 3D"
        subtitle="O galpão desenhado do cadastro real de endereços, colorido pela ocupação — clique numa célula"
      >
        <Badge tone="ok" dot>dados reais</Badge>
        <Badge tone={cheios > 0 ? 'warn' : 'neutral'}>{num(cheios)} de {num(enderecos.length)} cheios</Badge>
      </PageHeader>

      <div className="card p-0 overflow-hidden relative" style={{ height: '60vh', minHeight: 380 }}>
        {enderecos.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">
            Nenhum endereço cadastrado — crie a estrutura física no admin.
          </p>
        ) : (
          <Canvas camera={{ position: [8, 7, 12], fov: 45 }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[10, 14, 8]} intensity={0.7} />
            <Grid args={[60, 60]} cellColor="#e5e9f0" sectionColor="#cbd5e1" position={[6, 0, 4]} />
            {celulas.map((c) => (
              <group key={c.addr.id} position={[c.x, c.y, c.z]}>
                <RoundedBox
                  args={[BOX.w, BOX.h, BOX.d]}
                  radius={0.06}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setSel(c.addr)
                  }}
                >
                  <meshStandardMaterial
                    color={corDo(c.addr)}
                    emissive={sel?.id === c.addr.id ? '#21274e' : '#000000'}
                    emissiveIntensity={sel?.id === c.addr.id ? 0.35 : 0}
                  />
                </RoundedBox>
                <Text position={[0, BOX.h / 2 + 0.16, 0]} fontSize={0.19} color="#475569" anchorX="center">
                  {c.addr.code}
                </Text>
              </group>
            ))}
            {rotulos.map((r) => (
              <Text
                key={r.z}
                position={[-2.2, 0.05, r.z]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.34}
                color="#94a3b8"
                anchorX="right"
              >
                {r.nome}
              </Text>
            ))}
            <OrbitControls makeDefault enableDamping target={[6, 1, 4]} />
          </Canvas>
        )}

        {/* painel do endereço selecionado */}
        {sel && (
          <div className="absolute top-3 right-3 w-64 card p-3 shadow-pop bg-white/95">
            <div className="flex items-start justify-between gap-2">
              <p className="mono font-semibold text-brand">{sel.code}</p>
              <button className="text-ink-muted hover:text-ink text-xs" onClick={() => setSel(null)}>✕</button>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {sel.zoneRef?.name ?? sel.type}
              {sel.blocked ? ' · bloqueado' : ''}
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex justify-between"><span className="text-ink-muted">Vagas de palete</span><span className="mono">{sel.vagasOcupadas ?? 0}/{sel.capacidadePaletes || '∞'}</span></p>
              <p className="flex justify-between"><span className="text-ink-muted">Volumes</span><span className="mono">{num(sel.volumesOcupados ?? 0)}</span></p>
              <p className="flex justify-between"><span className="text-ink-muted">Situação</span>
                <Badge tone={sel.cheio ? 'bad' : (sel.vagasOcupadas ?? 0) > 0 ? 'info' : 'ok'}>
                  {sel.cheio ? 'cheio' : (sel.vagasOcupadas ?? 0) > 0 ? 'parcial' : 'vago'}
                </Badge>
              </p>
            </div>
          </div>
        )}

        {/* legenda */}
        <div className="absolute bottom-3 left-3 card px-3 py-2 flex items-center gap-3 text-[11px] text-ink-muted bg-white/95">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#ef4444' }} /> cheio</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#38bdf8' }} /> parcial</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#e2e8f0', border: '1px solid #cbd5e1' }} /> vago</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#f59e0b' }} /> staging</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#334155' }} /> bloqueado</span>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Endereço com rua/coluna/nível cadastrados aparece no rack exato; sem estrutura, entra em
        sequência na fileira da zona. Próximos passos: pallets/volumes dentro da célula e o duplo
        clique navegando para o Estoque filtrado.
      </p>
    </div>
  )
}
