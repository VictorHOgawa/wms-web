import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import Shell from './components/Shell'
import { Toaster } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recebimento from './pages/Recebimento'
import ImportarDocumentos from './pages/ImportarDocumentos'
import RecebimentoChecklists from './pages/RecebimentoChecklists'
import Divergencias from './pages/Divergencias'
import InsumosScore from './pages/InsumosScore'
import Generalidades from './pages/Generalidades'
import Etiquetagem from './pages/Etiquetagem'
import Etiquetar from './pages/Etiquetar'
import Staging from './pages/Staging'
import Montagem from './pages/Montagem'
import Pallets from './pages/Pallets'
import Confronto from './pages/Confronto'
import Cubagem from './pages/Cubagem'
import Apontamento from './pages/Apontamento'
import Putaway from './pages/Putaway'
import CrossDocking from './pages/CrossDocking'
import Estoque from './pages/Estoque'
import Movimentos from './pages/Movimentos'
import ControleSKU from './pages/ControleSKU'
import Inventario from './pages/Inventario'
import Reabastecimento from './pages/Reabastecimento'
import Picking from './pages/Picking'
import Expedicao from './pages/Expedicao'
import PerdasPrevencoes from './pages/PerdasPrevencoes'
import Tarefas from './pages/Tarefas'
import Coletor from './pages/Coletor'
import Teste from './pages/Teste'
import Ocorrencias from './pages/Ocorrencias'
import Faturamento from './pages/Faturamento'
import Relatorios from './pages/Relatorios'
import Integracoes from './pages/Integracoes'
import Configuracoes from './pages/Configuracoes'
import TransicaoOperacional from './pages/TransicaoOperacional'

const Mapa3D = lazy(() => import('./pages/Mapa3D'))

export default function App() {
  const autenticado = useStore((s) => s.autenticado)

  return (
    <>
      <Routes>
        <Route path="/login" element={autenticado ? <Navigate to="/" replace /> : <Login />} />
        <Route element={autenticado ? <Shell /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recebimento" element={<Recebimento />} />
          <Route path="/importar-documentos" element={<ImportarDocumentos />} />
          <Route path="/recebimento-checklists" element={<RecebimentoChecklists />} />
          <Route path="/divergencias-recebimento" element={<Divergencias />} />
          <Route path="/insumos-score" element={<InsumosScore />} />
          <Route path="/generalidades" element={<Generalidades />} />
          <Route path="/etiquetagem" element={<Etiquetagem />} />
          <Route path="/etiquetar" element={<Etiquetar />} />
          <Route path="/staging" element={<Staging />} />
          <Route path="/montagem" element={<Montagem />} />
          <Route path="/pallets" element={<Pallets />} />
          <Route path="/confronto" element={<Confronto />} />
          <Route path="/cubagem" element={<Cubagem />} />
          <Route path="/apontamento" element={<Apontamento />} />
          <Route path="/putaway" element={<Putaway />} />
          <Route path="/cross-docking" element={<CrossDocking />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/movimentos" element={<Movimentos />} />
          <Route path="/controle-sku" element={<ControleSKU />} />
          <Route
            path="/mapa-3d"
            element={
              <Suspense
                fallback={
                  <div className="flex h-[60vh] items-center justify-center text-sm text-ink-muted">
                    Carregando planta 3D…
                  </div>
                }
              >
                <Mapa3D />
              </Suspense>
            }
          />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/reabastecimento" element={<Reabastecimento />} />
          <Route path="/picking" element={<Picking />} />
          <Route path="/expedicao" element={<Expedicao />} />
          <Route path="/perdas-prevencoes" element={<Navigate to="/perdas-prevencoes/cockpit" replace />} />
          <Route path="/perdas-prevencoes/cockpit" element={<PerdasPrevencoes abaInicial="cockpit" />} />
          <Route path="/perdas-prevencoes/importacoes" element={<PerdasPrevencoes abaInicial="importacoes" />} />
          <Route path="/perdas-prevencoes/casos" element={<PerdasPrevencoes abaInicial="casos" />} />
          <Route path="/perdas-prevencoes/divergencias" element={<PerdasPrevencoes abaInicial="divergencias" />} />
          <Route path="/perdas-prevencoes/financeiro" element={<PerdasPrevencoes abaInicial="financeiro" />} />
          <Route path="/perdas-prevencoes/aprovacoes" element={<PerdasPrevencoes abaInicial="aprovacoes" />} />
          <Route path="/perdas-prevencoes/relatorios" element={<PerdasPrevencoes abaInicial="relatorios" />} />
          <Route path="/perdas-prevencoes/configuracoes" element={<PerdasPrevencoes abaInicial="configuracoes" />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/coletor" element={<Coletor />} />
          <Route path="/teste" element={<Teste />} />
          <Route path="/ocorrencias" element={<Ocorrencias />} />
          <Route path="/faturamento" element={<Faturamento />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/integracoes" element={<Integracoes />} />
          <Route path="/transicao-operacional" element={<TransicaoOperacional />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
