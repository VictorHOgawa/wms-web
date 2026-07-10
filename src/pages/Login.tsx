import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Boxes, Factory, Network } from 'lucide-react'
import { Brand } from '../components/Brand'
import { useStore } from '../store/useStore'
import { wmsConnect } from '../lib/wmsApi'
import { cn } from '../lib/utils'
import type { Vertente } from '../lib/types'

const PERFIS: { id: Vertente; nome: string; desc: string; icon: typeof Boxes }[] = [
  { id: 'ecommerce', nome: 'E-commerce', desc: 'Alto giro, cluster/batch picking', icon: Boxes },
  { id: 'industria', nome: 'Indústria', desc: 'FEFO, lote e matéria-prima', icon: Factory },
  { id: '3pl', nome: 'Operador 3PL', desc: 'Multi-owner e faturamento', icon: Network },
]

const METRICS = [
  { v: '99,4%', l: 'Acuracidade de inventário' },
  { v: '142', l: 'Linhas / hora por operador' },
  { v: '2,4h', l: 'Dock-to-stock médio' },
]

export default function Login() {
  const nav = useNavigate()
  const login = useStore((s) => s.login)
  const [perfil, setPerfil] = useState<Vertente>('3pl')
  const [email, setEmail] = useState('alex@integrabrasil.com')
  const [senha, setSenha] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAviso(null)
    // Conexão real (Hub → spoke) é OBRIGATÓRIA (decisão 10/07: sem modo demo
    // silencioso — credencial inválida ou backend fora não entram).
    const res = await wmsConnect(email, senha)
    if (!res.ok) {
      setAviso(res.message ?? 'Não foi possível conectar ao WMS. Verifique credenciais e conexão.')
      setLoading(false)
      return
    }
    login(perfil, email)
    nav('/')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* esquerda — marca */}
      <div className="relative hidden lg:flex flex-col justify-between bg-brand text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative">
          <Brand variant="light" />
        </div>
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              O operador recebe tarefas.
              <br />
              <span className="text-primary-100/80">A inteligência fica no sistema.</span>
            </h1>
            <p className="mt-4 text-slate-400 max-w-md">
              Recebimento, putaway, picking e expedição com scan-to-confirm em cada passo
              crítico. Offline-first, multi-CD e multi-cliente.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {METRICS.map((m) => (
              <div key={m.l}>
                <div className="text-2xl font-semibold text-white mono">{m.v}</div>
                <div className="text-xs text-slate-400 mt-1 leading-snug">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          Rastreabilidade total — quem, quando, de onde, para onde, qual lote.
        </div>
      </div>

      {/* direita — formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Brand />
          </div>
          <h2 className="text-2xl font-semibold text-brand tracking-tight">Acessar plataforma</h2>
          <p className="text-sm text-ink-muted mt-1.5">
            Selecione o perfil da operação e entre.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {PERFIS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPerfil(p.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer',
                  perfil === p.id
                    ? 'border-primary bg-primary-50 ring-1 ring-primary/30'
                    : 'border-line hover:border-slate-300 hover:bg-surface-sub',
                )}
              >
                <p.icon
                  className={cn('h-5 w-5', perfil === p.id ? 'text-primary' : 'text-ink-muted')}
                />
                <span
                  className={cn(
                    'text-xs font-medium',
                    perfil === p.id ? 'text-primary' : 'text-ink-soft',
                  )}
                >
                  {p.nome}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-2 text-center h-4">
            {PERFIS.find((p) => p.id === perfil)?.desc}
          </p>

          <form onSubmit={entrar} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="senha" className="label">
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSenha('demo')}
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <>
                  Entrar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {aviso && (
            <p className="mt-3 text-center text-xs text-warn">{aviso}</p>
          )}

          <p className="mt-6 text-center text-xs text-ink-muted">
            Entre com as credenciais do Hub — a torre trabalha somente com dados reais
          </p>
        </div>
      </div>
    </div>
  )
}
