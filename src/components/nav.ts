import {
  LayoutDashboard,
  Truck,
  Tags,
  Layers,
  MapPin,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  FileUp,
  GitCompareArrows,
  Scale,
  ScanLine,
  ArrowUpDown,
  PackageCheck,
  PackageX,
  QrCode,
  Shuffle,
  ListTodo,
  Receipt,
  Landmark,
  Plug,
  BarChart3,
  Settings,
  Box,
  History,
  Shield,
  ShieldCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  group: string
  only3pl?: boolean
  badge?: string
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Visão geral' },

  { to: '/recebimento', label: 'Recebimento', icon: Truck, group: 'Inbound' },
  { to: '/importar-documentos', label: 'Importar Documentos', icon: FileUp, group: 'Inbound', badge: 'novo' },
  { to: '/staging', label: 'Entrada & Staging', icon: Boxes, group: 'Inbound', badge: 'novo' },
  { to: '/recebimento-checklists', label: 'Checklists Receb.', icon: ClipboardCheck, group: 'Inbound', badge: 'novo' },
  { to: '/divergencias-recebimento', label: 'Divergências Receb.', icon: PackageX, group: 'Inbound', badge: 'novo' },
  { to: '/etiquetagem', label: 'Etiquetagem', icon: Tags, group: 'Inbound' },
  { to: '/etiquetar', label: 'Etiquetar (caixa-mestre)', icon: Tags, group: 'Inbound', badge: 'novo' },
  { to: '/montagem', label: 'Montagem', icon: Layers, group: 'Inbound' },
  { to: '/pallets', label: 'Montagem de Pallets', icon: Layers, group: 'Inbound', badge: 'novo' },
  { to: '/putaway', label: 'Endereçamento', icon: MapPin, group: 'Inbound' },
  { to: '/cross-docking', label: 'Cross-docking', icon: Shuffle, group: 'Inbound' },

  { to: '/estoque', label: 'Estoque', icon: Boxes, group: 'Estoque' },
  { to: '/movimentos', label: 'Movimentos', icon: History, group: 'Estoque', badge: 'novo' },
  { to: '/controle-sku', label: 'Controle SKU', icon: Boxes, group: 'Estoque' },
  { to: '/mapa-3d', label: 'Planta 3D', icon: Box, group: 'Estoque', badge: 'novo' },
  { to: '/inventario', label: 'Inventário rotativo', icon: ClipboardCheck, group: 'Estoque' },
  { to: '/reabastecimento', label: 'Reabastecimento', icon: ArrowUpDown, group: 'Estoque' },

  { to: '/picking', label: 'Picking', icon: ScanLine, group: 'Outbound' },
  { to: '/separacao', label: 'Separação (despacho)', icon: ScanLine, group: 'Outbound', badge: 'novo' },
  { to: '/expedicao', label: 'Packing & Expedição', icon: PackageCheck, group: 'Outbound' },
  { to: '/confronto', label: 'Confronto carga × descarga', icon: GitCompareArrows, group: 'Outbound', badge: 'novo' },
  { to: '/cubagem', label: 'Cubagem & custo extra', icon: Scale, group: 'Outbound', badge: 'novo' },

  { to: '/perdas-prevencoes/cockpit', label: 'Cockpit', icon: ShieldCheck, group: 'P&P', badge: 'novo' },
  { to: '/perdas-prevencoes/importacoes', label: 'Cobrancas / Importacoes', icon: FileSpreadsheet, group: 'P&P' },
  { to: '/perdas-prevencoes/casos', label: 'Casos de Indenizacao', icon: ShieldAlert, group: 'P&P' },
  { to: '/perdas-prevencoes/divergencias', label: 'Divergencias Operacionais', icon: PackageX, group: 'P&P' },
  { to: '/perdas-prevencoes/financeiro', label: 'Financeiro / Debitos', icon: Landmark, group: 'P&P' },
  { to: '/perdas-prevencoes/aprovacoes', label: 'Aprovacoes', icon: ClipboardCheck, group: 'P&P' },
  { to: '/perdas-prevencoes/relatorios', label: 'Relatorios P&P', icon: BarChart3, group: 'P&P' },
  { to: '/perdas-prevencoes/configuracoes', label: 'Configuracoes P&P', icon: Settings, group: 'P&P' },

  { to: '/tarefas', label: 'Fila de tarefas', icon: ListTodo, group: 'Operação' },
  { to: '/teste', label: 'TESTE', icon: QrCode, group: 'Operação', badge: 'mobile' },
  { to: '/ocorrencias', label: 'Ocorrências', icon: ShieldAlert, group: 'Operação', badge: 'P0' },
  // Coletor RF fica fora da sidebar: acesso operacional/mobile, não navegação desktop.

  { to: '/faturamento', label: 'Faturamento 3PL', icon: Receipt, group: 'Gestão', only3pl: true },
  { to: '/insumos-score', label: 'Insumos & Score', icon: Boxes, group: 'Gestão', badge: 'novo' },
  { to: '/apontamento', label: 'Apontamento (insumos/mão de obra)', icon: ClipboardList, group: 'Gestão', badge: 'novo' },
  { to: '/generalidades', label: 'Generalidades', icon: ClipboardCheck, group: 'Gestão', badge: 'novo' },
  { to: '/relatorios', label: 'Relatórios & KPIs', icon: BarChart3, group: 'Gestão' },
  { to: '/integracoes', label: 'Integrações', icon: Plug, group: 'Gestão' },
  { to: '/transicao-operacional', label: 'Transição Operacional', icon: Shield, group: 'Gestão', badge: 'demo' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, group: 'Gestão' },
]
