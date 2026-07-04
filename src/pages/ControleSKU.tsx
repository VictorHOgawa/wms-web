import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  History,
  Pencil,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react'
import { Badge, EmptyState, PageHeader, SelectField, type Tone } from '../components/ui'
import {
  empresaSkuColor,
  empresaSkuIdPorOwner,
  empresaSkuName,
  EMPRESAS_SKU,
  ownerColor,
  ownerName,
  OWNERS,
} from '../lib/mock'
import {
  EMPRESA_TODAS_SKU,
  filtrarSkusControlePorEmpresa,
  skusPendentesRecebimentos,
} from '../lib/skuControle'
import { cn, num } from '../lib/utils'
import { useStore } from '../store/useStore'
import type {
  SkuControle,
  SkuControleInput,
  SkuPendenteRecebimento,
  TipoEmbalagemSku,
} from '../lib/types'

const tipoMeta: Record<TipoEmbalagemSku, { label: string; tone: Tone }> = {
  unidade: { label: 'Unidade', tone: 'info' },
  'caixa-matriz': { label: 'Caixa matriz', tone: 'accent' },
}

const filtrosTipo: { id: TipoEmbalagemSku | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'unidade', label: 'Unidade' },
  { id: 'caixa-matriz', label: 'Caixa matriz' },
]

const ownersSku = OWNERS.filter((owner) => owner.id !== 'own-all')
const empresasSkuCadastro = EMPRESAS_SKU.filter((empresa) => empresa.id !== EMPRESA_TODAS_SKU)

const cubagem = (input: Pick<SkuControleInput, 'comprimentoCm' | 'larguraCm' | 'alturaCm'>) =>
  Number(((input.comprimentoCm * input.larguraCm * input.alturaCm) / 1_000_000).toFixed(6))

const formatCubagem = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} m³`

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

const novoDraft = (perfilOwnerId: string, perfil: string): SkuControleInput => ({
  ownerId: perfil === '3pl' && perfilOwnerId !== 'own-all' ? perfilOwnerId : 'own-nano',
  empresaId: empresaSkuIdPorOwner(
    perfil === '3pl' && perfilOwnerId !== 'own-all' ? perfilOwnerId : 'own-nano',
  ),
  codigo: '',
  descricao: '',
  tipo: 'unidade',
  skuUnidadeConteudo: null,
  unidadesPorCaixa: null,
  comprimentoCm: 0,
  larguraCm: 0,
  alturaCm: 0,
  cubagemM3: 0,
})

const toInput = (sku: SkuControle): SkuControleInput => ({
  ownerId: sku.ownerId,
  empresaId: sku.empresaId,
  codigo: sku.codigo,
  descricao: sku.descricao,
  tipo: sku.tipo,
  skuUnidadeConteudo: sku.skuUnidadeConteudo,
  unidadesPorCaixa: sku.unidadesPorCaixa,
  comprimentoCm: sku.comprimentoCm,
  larguraCm: sku.larguraCm,
  alturaCm: sku.alturaCm,
  cubagemM3: sku.cubagemM3,
})

export default function ControleSKU() {
  const {
    perfil,
    ownerId,
    recebimentos,
    skusControle,
    skuControleHistorico,
    criarSkuControle,
    atualizarSkuControle,
    toast,
  } = useStore()
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoEmbalagemSku | 'todos'>('todos')
  const [empresaFiltro, setEmpresaFiltro] = useState(EMPRESA_TODAS_SKU)
  const [editingId, setEditingId] = useState<string | 'novo' | null>(null)
  const [draft, setDraft] = useState<SkuControleInput | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(skusControle[0]?.id ?? null)

  const pendenciasSku = useMemo(() => {
    const pendencias = skusPendentesRecebimentos(recebimentos, skusControle)
    const q = busca.trim().toLowerCase()
    return pendencias.filter((pendencia) => {
      if (perfil === '3pl' && ownerId !== 'own-all' && pendencia.ownerId !== ownerId) return false
      if (
        empresaFiltro !== EMPRESA_TODAS_SKU &&
        empresaSkuIdPorOwner(pendencia.ownerId) !== empresaFiltro
      ) return false
      if (tipoFiltro === 'caixa-matriz') return false
      if (!q) return true
      const alvo = [
        pendencia.skuCodigo,
        pendencia.descricao,
        pendencia.recebimentoId,
        pendencia.doca,
        pendencia.documento,
        pendencia.fornecedor,
        empresaSkuName(empresaSkuIdPorOwner(pendencia.ownerId)),
        ownerName(pendencia.ownerId),
      ].join(' ').toLowerCase()
      return alvo.includes(q)
    })
  }, [busca, empresaFiltro, ownerId, perfil, recebimentos, skusControle, tipoFiltro])

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return filtrarSkusControlePorEmpresa(skusControle, empresaFiltro).filter((sku) => {
      if (perfil === '3pl' && ownerId !== 'own-all' && sku.ownerId !== ownerId) return false
      if (tipoFiltro !== 'todos' && sku.tipo !== tipoFiltro) return false
      return (
        !q ||
        sku.codigo.toLowerCase().includes(q) ||
        sku.descricao.toLowerCase().includes(q) ||
        (sku.skuUnidadeConteudo ?? '').toLowerCase().includes(q) ||
        empresaSkuName(sku.empresaId).toLowerCase().includes(q) ||
        ownerName(sku.ownerId).toLowerCase().includes(q)
      )
    })
  }, [busca, empresaFiltro, ownerId, perfil, skusControle, tipoFiltro])

  const selectedSku = selectedId ? skusControle.find((sku) => sku.id === selectedId) : null
  const historico = useMemo(() => {
    const base = selectedId
      ? skuControleHistorico.filter((item) => item.skuId === selectedId)
      : skuControleHistorico
    return base.slice(0, 14)
  }, [selectedId, skuControleHistorico])

  const totalUnidades = lista.filter((sku) => sku.tipo === 'unidade').length
  const totalCaixas = lista.filter((sku) => sku.tipo === 'caixa-matriz').length
  const cubagemTotal = lista.reduce((acc, sku) => acc + sku.cubagemM3, 0)

  const unidadesParaDraft = (input: SkuControleInput) =>
    skusControle.filter(
      (sku) =>
        sku.tipo === 'unidade' &&
        sku.empresaId === input.empresaId &&
        sku.empresaId === input.empresaId &&
        sku.codigo !== input.codigo.trim().toUpperCase(),
    )

  const patchDraft = (patch: Partial<SkuControleInput>) =>
    setDraft((atual) => {
      if (!atual) return atual
      const proximo = { ...atual, ...patch }
      return { ...proximo, cubagemM3: cubagem(proximo) }
    })

  const alterarDimensao = (
    campo: 'comprimentoCm' | 'larguraCm' | 'alturaCm',
    valor: number,
  ) => patchDraft({ [campo]: Number.isFinite(valor) ? valor : 0 })

  const alterarTipo = (tipo: TipoEmbalagemSku) =>
    setDraft((atual) => {
      if (!atual) return atual
      if (tipo === 'unidade') {
        return {
          ...atual,
          tipo,
          skuUnidadeConteudo: null,
          unidadesPorCaixa: null,
          cubagemM3: cubagem(atual),
        }
      }
      const unidades = unidadesParaDraft({ ...atual, tipo })
      return {
        ...atual,
        tipo,
        skuUnidadeConteudo: atual.skuUnidadeConteudo ?? unidades[0]?.codigo ?? null,
        unidadesPorCaixa:
          atual.unidadesPorCaixa && atual.unidadesPorCaixa > 1 ? atual.unidadesPorCaixa : 6,
        cubagemM3: cubagem(atual),
      }
    })

  const alterarOwner = (nextOwnerId: string) =>
    setDraft((atual) => {
      if (!atual) return atual
      const proximo = { ...atual, ownerId: nextOwnerId }
      if (
        proximo.tipo === 'caixa-matriz' &&
        !unidadesParaDraft(proximo).some((sku) => sku.codigo === proximo.skuUnidadeConteudo)
      ) {
        proximo.skuUnidadeConteudo = unidadesParaDraft(proximo)[0]?.codigo ?? null
      }
      return { ...proximo, cubagemM3: cubagem(proximo) }
    })

  const alterarEmpresa = (nextEmpresaId: string) =>
    setDraft((atual) => {
      if (!atual) return atual
      const proximo = { ...atual, empresaId: nextEmpresaId }
      if (
        proximo.tipo === 'caixa-matriz' &&
        !unidadesParaDraft(proximo).some((sku) => sku.codigo === proximo.skuUnidadeConteudo)
      ) {
        proximo.skuUnidadeConteudo = unidadesParaDraft(proximo)[0]?.codigo ?? null
      }
      return { ...proximo, cubagemM3: cubagem(proximo) }
    })

  const iniciarNovo = () => {
    setEditingId('novo')
    setSelectedId(null)
    setDraft(novoDraft(ownerId, perfil))
  }

  const iniciarCadastroPendencia = (pendencia: SkuPendenteRecebimento) => {
    setEditingId('novo')
    setSelectedId(null)
    setDraft({
      ...novoDraft(pendencia.ownerId, perfil),
      ownerId: pendencia.ownerId,
      empresaId: empresaSkuIdPorOwner(pendencia.ownerId),
      codigo: pendencia.skuCodigo,
      descricao: pendencia.descricao,
    })
    toast({
      tipo: 'aviso',
      titulo: 'Cadastro P0 aberto',
      texto: `${pendencia.skuCodigo} destrava ${pendencia.recebimentoId} na ${pendencia.doca}.`,
    })
  }

  const iniciarEdicao = (sku: SkuControle) => {
    setEditingId(sku.id)
    setSelectedId(sku.id)
    setDraft(toInput(sku))
  }

  const cancelarEdicao = () => {
    setEditingId(null)
    setDraft(null)
  }

  const normalizarDraft = (input: SkuControleInput): SkuControleInput => ({
    ...input,
    codigo: input.codigo.trim().toUpperCase(),
    descricao: input.descricao.trim(),
    skuUnidadeConteudo: input.tipo === 'caixa-matriz' ? input.skuUnidadeConteudo : null,
    unidadesPorCaixa:
      input.tipo === 'caixa-matriz' ? Math.trunc(input.unidadesPorCaixa ?? 0) : null,
    cubagemM3: cubagem(input),
  })

  const validar = (input: SkuControleInput, idAtual?: string) => {
    if (!input.codigo) return 'Informe o código do SKU.'
    if (!input.descricao) return 'Informe a descrição do SKU.'
    const duplicado = skusControle.some(
      (sku) =>
        sku.id !== idAtual &&
        sku.ownerId === input.ownerId &&
        sku.codigo.toUpperCase() === input.codigo,
    )
    if (duplicado) return 'Ja existe um cadastro com este codigo de SKU para esta empresa.'
    if (input.comprimentoCm <= 0 || input.larguraCm <= 0 || input.alturaCm <= 0) {
      return 'Informe comprimento, largura e altura maiores que zero.'
    }
    if (input.tipo === 'caixa-matriz') {
      if (!input.skuUnidadeConteudo) return 'Selecione qual SKU unidade existe dentro da caixa matriz.'
      const unidade = skusControle.find(
        (sku) =>
          sku.codigo === input.skuUnidadeConteudo &&
          sku.tipo === 'unidade' &&
          sku.empresaId === input.empresaId,
      )
      if (!unidade) return 'A caixa matriz precisa apontar para um SKU unidade cadastrado.'
      if (unidade.ownerId !== input.ownerId) return 'A caixa matriz e o SKU unidade devem ser do mesmo owner.'
      if (unidade.empresaId !== input.empresaId) return 'A caixa matriz e o SKU unidade devem ser da mesma empresa.'
      if ((input.unidadesPorCaixa ?? 0) < 2) return 'Caixa matriz precisa ter pelo menos 2 unidades.'
      if (input.skuUnidadeConteudo === input.codigo) return 'A caixa matriz não pode conter ela mesma.'
    }
    const atual = idAtual ? skusControle.find((sku) => sku.id === idAtual) : null
    const caixasDependentes = atual
      ? skusControle.filter(
          (sku) => sku.tipo === 'caixa-matriz' && sku.skuUnidadeConteudo === atual.codigo,
        )
      : []
    if (atual?.tipo === 'unidade' && atual.codigo !== input.codigo && caixasDependentes.length > 0) {
      return `Este SKU unidade é conteúdo de ${caixasDependentes[0].codigo}; mantenha o código ou ajuste a caixa matriz.`
    }
    return null
  }

  const salvar = () => {
    if (!draft) return
    const idAtual = editingId && editingId !== 'novo' ? editingId : undefined
    const input = normalizarDraft(draft)
    const erro = validar(input, idAtual)
    if (erro) {
      toast({ tipo: 'erro', titulo: 'Cadastro incompleto', texto: erro })
      return
    }

    if (editingId === 'novo') {
      const id = criarSkuControle(input)
      setSelectedId(id)
      toast({ tipo: 'sucesso', titulo: 'SKU cadastrado', texto: `${input.codigo} entrou no controle.` })
    } else if (idAtual) {
      const alterou = atualizarSkuControle(idAtual, input)
      setSelectedId(idAtual)
      toast({
        tipo: alterou ? 'sucesso' : 'info',
        titulo: alterou ? 'SKU atualizado' : 'Sem alterações',
        texto: alterou ? `${input.codigo} teve o histórico atualizado.` : 'Nenhum campo auditado mudou.',
      })
    }

    cancelarEdicao()
  }

  const renderEditableRow = (rowKey: string) => {
    if (!draft) return null
    const unidades = unidadesParaDraft(draft)
    return (
      <tr key={rowKey} className="bg-primary-50/60">
        <td className="td align-top">
          <input
            autoFocus
            value={draft.codigo}
            onChange={(e) => patchDraft({ codigo: e.target.value })}
            placeholder="SKU-00000"
            className="w-32 rounded-lg border border-line bg-white px-2 py-1.5 text-xs mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </td>
        <td className="td align-top">
          <input
            value={draft.descricao}
            onChange={(e) => patchDraft({ descricao: e.target.value })}
            placeholder="Descrição do item"
            className="w-64 rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </td>
        <td className="td align-top">
          <SelectField
            value={draft.tipo}
            onChange={(value) => alterarTipo(value as TipoEmbalagemSku)}
            className="w-36 rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            options={[
              { value: 'unidade', label: 'Unidade' },
              { value: 'caixa-matriz', label: 'Caixa matriz' },
            ]}
          />
        </td>
        <td className="td align-top">
          {draft.tipo === 'caixa-matriz' ? (
            <SelectField
              value={draft.skuUnidadeConteudo ?? ''}
              onChange={(value) => patchDraft({ skuUnidadeConteudo: value || null })}
              className="w-40 rounded-lg border border-line bg-white px-2 py-1.5 text-xs mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              options={[
                { value: '', label: 'Selecione' },
                ...unidades.map((sku) => ({ value: sku.codigo, label: sku.codigo })),
              ]}
            />
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          )}
        </td>
        <td className="td align-top">
          {draft.tipo === 'caixa-matriz' ? (
            <input
              type="number"
              min={2}
              step={1}
              value={draft.unidadesPorCaixa ?? ''}
              onChange={(e) => patchDraft({ unidadesPorCaixa: Number(e.target.value) })}
              className="w-20 rounded-lg border border-line bg-white px-2 py-1.5 text-xs mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          ) : (
            <span className="text-xs text-ink-muted">1</span>
          )}
        </td>
        <td className="td align-top">
          <div className="grid w-40 grid-cols-3 gap-1">
            {(['comprimentoCm', 'larguraCm', 'alturaCm'] as const).map((campo) => (
              <input
                key={campo}
                type="number"
                min={0}
                step="0.1"
                aria-label={campo}
                value={draft[campo] || ''}
                onChange={(e) => alterarDimensao(campo, Number(e.target.value))}
                className="min-w-0 rounded-lg border border-line bg-white px-2 py-1.5 text-xs mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            ))}
          </div>
        </td>
        <td className="td align-top mono text-brand">{formatCubagem(draft.cubagemM3)}</td>
        <td className="td align-top">
          <SelectField
            value={draft.empresaId}
            onChange={alterarEmpresa}
            className="w-44 rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            options={empresasSkuCadastro.map((empresa) => ({ value: empresa.id, label: empresa.nome }))}
          />
        </td>
        {perfil === '3pl' && (
          <td className="td align-top">
            <SelectField
              value={draft.ownerId}
              onChange={alterarOwner}
              className="w-40 rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              options={ownersSku.map((owner) => ({ value: owner.id, label: owner.nome }))}
            />
          </td>
        )}
        <td className="td align-top text-xs text-ink-muted">Editando</td>
        <td className="td align-top">
          <div className="flex items-center justify-end gap-1.5">
            <button onClick={salvar} className="btn-primary p-2" aria-label="Salvar" title="Salvar">
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={cancelarEdicao}
              className="btn-outline p-2"
              aria-label="Cancelar"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const renderPendenciaRow = (pendencia: SkuPendenteRecebimento) => (
    <tr key={pendencia.id} className="bg-bad-50/80 border-l-4 border-bad">
      <td className="td align-top">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="mono font-semibold text-bad">{pendencia.skuCodigo}</span>
            <Badge tone="bad">P0</Badge>
          </div>
          <p className="text-[11px] font-medium text-bad">SKU não cadastrado</p>
        </div>
      </td>
      <td className="td align-top">
        <p className="font-medium text-brand">{pendencia.descricao}</p>
        <p className="mt-1 text-xs text-bad">
          Necessidade de configurar o SKU {pendencia.skuCodigo}
        </p>
      </td>
      <td className="td align-top">
        <Badge tone="bad">Prioridade máxima</Badge>
      </td>
      <td className="td align-top">
        <div className="text-xs">
          <p className="font-semibold text-brand">{pendencia.doca}</p>
          <p className="text-ink-muted">
            {pendencia.recebimentoId} · {pendencia.documento}
          </p>
        </div>
      </td>
      <td className="td align-top text-xs text-ink-muted">—</td>
      <td className="td align-top">
        <div className="text-xs">
          <p className="font-semibold text-brand">{pendencia.fornecedor}</p>
          <p className="text-ink-muted">
            ETA {pendencia.eta}
            {pendencia.janela ? ` · ${pendencia.janela}` : ''}
          </p>
        </div>
      </td>
      <td className="td align-top">
        <Badge tone="bad">Bloqueia recebimento</Badge>
      </td>
      <td className="td align-top">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: empresaSkuColor(empresaSkuIdPorOwner(pendencia.ownerId)) }}
          />
          <span className="text-xs">{empresaSkuName(empresaSkuIdPorOwner(pendencia.ownerId))}</span>
        </span>
      </td>
      {perfil === '3pl' && (
        <td className="td align-top">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: ownerColor(pendencia.ownerId) }} />
            <span className="text-xs">{ownerName(pendencia.ownerId)}</span>
          </span>
        </td>
      )}
      <td className="td align-top">
        <div>
          <p className="text-xs font-semibold text-bad">{pendencia.etapaBloqueio}</p>
          <p className="text-[11px] text-ink-muted mono">
            Parte {pendencia.ordemExecucaoBloqueada}/7
          </p>
        </div>
      </td>
      <td className="td align-top">
        <div className="flex justify-end">
          <button
            onClick={() => iniciarCadastroPendencia(pendencia)}
            className="btn-primary bg-bad hover:bg-red-700 p-2 px-3 text-xs"
            disabled={editingId !== null}
          >
            Configurar
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle SKU"
        subtitle="Cadastro manual de SKUs unidade, caixas matriz, fator de conversão e cubagem"
      >
        <button onClick={iniciarNovo} className="btn-primary" disabled={editingId !== null}>
          <Plus className="h-4 w-4" /> Novo SKU
        </button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-bad/30 bg-bad-50">
          <p className="text-xs text-bad">Pendências P0 de recebimento</p>
          <p className="mt-1 text-2xl font-semibold text-bad mono">{num(pendenciasSku.length)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">SKUs unidade</p>
          <p className="mt-1 text-2xl font-semibold text-brand mono">{num(totalUnidades)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Caixas matriz</p>
          <p className="mt-1 text-2xl font-semibold text-brand mono">{num(totalCaixas)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Cubagem cadastrada</p>
          <p className="mt-1 text-2xl font-semibold text-brand mono">{formatCubagem(cubagemTotal)}</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-4 min-w-0">
          <div className="card p-3 flex flex-col lg:flex-row gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 flex-1">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar SKU, descricao, empresa, owner ou SKU conteudo..."
                className="bg-transparent outline-none flex-1 text-sm"
              />
            </div>
            <SelectField
              value={empresaFiltro}
              onChange={setEmpresaFiltro}
              className="lg:w-52 rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm"
              options={EMPRESAS_SKU.map((empresa) => ({ value: empresa.id, label: empresa.nome }))}
            />
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {filtrosTipo.map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => setTipoFiltro(filtro.id)}
                  className={cn(
                    'chip whitespace-nowrap transition-colors cursor-pointer',
                    tipoFiltro === filtro.id
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
                  )}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px]">
                <thead>
                  <tr>
                    <th className="th">SKU</th>
                    <th className="th">Descrição</th>
                    <th className="th">Tipo</th>
                    <th className="th">Conteúdo da caixa</th>
                    <th className="th">Un/Caixa</th>
                    <th className="th">C x L x A (cm)</th>
                    <th className="th">Cubagem</th>
                    <th className="th">Empresa</th>
                    {perfil === '3pl' && <th className="th">Owner</th>}
                    <th className="th">Última alteração</th>
                    <th className="th text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {editingId === 'novo' && renderEditableRow('novo')}
                  {pendenciasSku.map((pendencia) => renderPendenciaRow(pendencia))}
                  {lista.map((sku) =>
                    editingId === sku.id ? (
                      renderEditableRow(sku.id)
                    ) : (
                      <tr
                        key={sku.id}
                        onClick={() => setSelectedId(sku.id)}
                        className={cn(
                          'row-hover cursor-pointer',
                          selectedId === sku.id && 'bg-primary-50/50',
                        )}
                      >
                        <td className="td mono font-medium text-brand">{sku.codigo}</td>
                        <td className="td text-ink">{sku.descricao}</td>
                        <td className="td">
                          <Badge tone={tipoMeta[sku.tipo].tone}>{tipoMeta[sku.tipo].label}</Badge>
                        </td>
                        <td className="td">
                          {sku.tipo === 'caixa-matriz' ? (
                            <span className="mono text-xs text-brand">{sku.skuUnidadeConteudo}</span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                        <td className="td mono">{sku.unidadesPorCaixa ?? 1}</td>
                        <td className="td mono">
                          {sku.comprimentoCm} x {sku.larguraCm} x {sku.alturaCm}
                        </td>
                        <td className="td mono font-medium text-brand">{formatCubagem(sku.cubagemM3)}</td>
                        <td className="td">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: empresaSkuColor(sku.empresaId) }}
                            />
                            <span className="text-xs">{empresaSkuName(sku.empresaId)}</span>
                          </span>
                        </td>
                        {perfil === '3pl' && (
                          <td className="td">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: ownerColor(sku.ownerId) }}
                              />
                              <span className="text-xs">{ownerName(sku.ownerId)}</span>
                            </span>
                          </td>
                        )}
                        <td className="td">
                          <div>
                            <p className="text-xs text-ink-soft">{sku.atualizadoPor}</p>
                            <p className="text-[11px] text-ink-muted mono">{fmtDateTime(sku.atualizadoEm)}</p>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                iniciarEdicao(sku)
                              }}
                              className="btn-outline p-2"
                              disabled={editingId !== null}
                              aria-label={`Editar ${sku.codigo}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {lista.length === 0 && pendenciasSku.length === 0 && editingId !== 'novo' && (
              <EmptyState
                icon={<Boxes className="h-6 w-6" />}
                title="Nenhum SKU encontrado"
                text="Ajuste a busca ou cadastre um novo SKU."
              />
            )}
          </div>
        </div>

        <aside className="card p-5 h-fit xl:sticky xl:top-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-ink-soft">
                <History className="h-4 w-4" />
                <p className="text-sm font-semibold">Histórico</p>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {selectedSku ? selectedSku.codigo : 'Todos os SKUs'}
              </p>
            </div>
            {selectedSku && (
              <button onClick={() => setSelectedId(null)} className="btn-ghost p-2" title="Ver todos">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {historico.map((item) => (
              <div key={item.id} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-brand">{item.skuCodigo}</p>
                    <p className="text-xs text-ink-muted">{item.usuario} · {fmtDateTime(item.quando)}</p>
                  </div>
                  <Badge tone={item.acao === 'criacao' ? 'ok' : 'primary'}>
                    {item.acao === 'criacao' ? 'Criação' : 'Edição'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-soft">{item.resumo}</p>
                <div className="mt-2 space-y-1.5">
                  {item.alteracoes.slice(0, 4).map((alt) => (
                    <div key={`${item.id}-${alt.campo}`} className="text-[11px] text-ink-muted">
                      <span className="font-medium text-ink-soft">{alt.campo}:</span>{' '}
                      <span className="line-through">{alt.antes}</span>{' '}
                      <span className="text-brand">→ {alt.depois}</span>
                    </div>
                  ))}
                  {item.alteracoes.length > 4 && (
                    <p className="text-[11px] text-ink-muted">
                      +{item.alteracoes.length - 4} campos alterados
                    </p>
                  )}
                </div>
              </div>
            ))}
            {historico.length === 0 && (
              <div className="rounded-xl border border-dashed border-line p-4 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-ink-muted" />
                <p className="mt-2 text-sm font-medium text-ink-soft">Sem histórico para este SKU</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
