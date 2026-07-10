import {
  LayoutDashboard,
  Truck,
  Tags,
  Layers,
  MapPin,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileUp,
  GitCompareArrows,
  Scale,
  ScanLine,
  ArrowUpDown,
  PackageCheck,
  PackageX,
  Shuffle,
  Timer,
  Receipt,
  Plug,
  BarChart3,
  Settings,
  Box,
  History,
  Shield,
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

/**
 * MENU REORGANIZADO (09/07, pedido do Victor): por PROCESSO, com o que é REAL
 * primeiro e tudo que é 100% mock isolado no grupo "Demonstração" (badge demo).
 *
 * Fora do menu (rotas seguem vivas por URL):
 * - /os-viagem   — tela temporária de validação; as telas de processo a substituíram.
 * - /tarefas     — a fila do operador é o coletor (decisão de 06/07).
 * - /etiquetagem — duplicada (a real é /etiquetar).
 * - /picking     — duplicada (a real é /separacao).
 * - /coletor     — acesso operacional/mobile, não navegação desktop.
 * - /teste       — utilitário de QR p/ celular (dev).
 */
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Visão geral' },

  // O coração: as telas de processo do fluxo da viagem (tudo REAL).
  { to: '/recebimento', label: 'Recebimento', icon: Truck, group: 'Fluxo da viagem' },
  { to: '/separacao', label: 'Separação & Romaneio', icon: ScanLine, group: 'Fluxo da viagem' },
  { to: '/expedicao', label: 'Expedição', icon: PackageCheck, group: 'Fluxo da viagem' },
  { to: '/cross-docking', label: 'Triagem por destino', icon: Shuffle, group: 'Fluxo da viagem' },
  { to: '/free-time', label: 'Free time (piso)', icon: Timer, group: 'Fluxo da viagem' },
  { to: '/confronto', label: 'Confronto carga × descarga', icon: GitCompareArrows, group: 'Fluxo da viagem' },

  // Piso e estoque endereçado (tudo REAL).
  { to: '/estoque', label: 'Estoque', icon: Boxes, group: 'Piso & Estoque' },
  { to: '/planta-3d', label: 'Planta 3D', icon: Box, group: 'Piso & Estoque' },
  { to: '/movimentos', label: 'Movimentos', icon: History, group: 'Piso & Estoque' },
  { to: '/staging', label: 'Entrada & Staging', icon: Boxes, group: 'Piso & Estoque' },
  { to: '/pallets', label: 'Pallets', icon: Layers, group: 'Piso & Estoque' },
  { to: '/reabastecimento', label: 'Reabastecimento', icon: ArrowUpDown, group: 'Piso & Estoque' },
  { to: '/inventario', label: 'Inventário (contagens)', icon: ClipboardCheck, group: 'Piso & Estoque' },

  // Etiquetas e documentos (tudo REAL).
  { to: '/etiquetar', label: 'Etiquetas', icon: Tags, group: 'Etiquetas & Docs' },
  { to: '/cubagem', label: 'Cubagem & custo extra', icon: Scale, group: 'Etiquetas & Docs' },
  { to: '/importar-documentos', label: 'Importar Documentos', icon: FileUp, group: 'Etiquetas & Docs' },

  // Qualidade, exceções e gestão (tudo REAL).
  { to: '/divergencias-recebimento', label: 'Divergências', icon: PackageX, group: 'Qualidade & Gestão' },
  { to: '/recebimento-checklists', label: 'Checklists de Recebimento', icon: ClipboardCheck, group: 'Qualidade & Gestão' },
  { to: '/insumos-score', label: 'Insumos & Score', icon: Boxes, group: 'Qualidade & Gestão' },
  { to: '/apontamento', label: 'Apontamento', icon: ClipboardList, group: 'Qualidade & Gestão' },
  { to: '/generalidades', label: 'Generalidades', icon: ClipboardCheck, group: 'Qualidade & Gestão' },

  // 100% mock — vitrines do que vem na fase de ARMAZENAGEM plena (e módulos
  // ainda não iniciados). Nada aqui grava dado real.
  { to: '/putaway', label: 'Endereçamento (putaway)', icon: MapPin, group: 'Demonstração', badge: 'demo' },
  { to: '/mapa-3d', label: 'Putaway 3D (conceito)', icon: Box, group: 'Demonstração', badge: 'demo' },
  { to: '/montagem', label: 'Montagem 3D', icon: Layers, group: 'Demonstração', badge: 'demo' },
  { to: '/controle-sku', label: 'Controle SKU', icon: Boxes, group: 'Demonstração', badge: 'demo' },
  { to: '/ocorrencias', label: 'Ocorrências', icon: ShieldAlert, group: 'Demonstração', badge: 'demo' },
  { to: '/relatorios', label: 'Relatórios & KPIs', icon: BarChart3, group: 'Demonstração', badge: 'demo' },
  { to: '/faturamento', label: 'Faturamento 3PL', icon: Receipt, group: 'Demonstração', only3pl: true, badge: 'demo' },
  { to: '/perdas-prevencoes/cockpit', label: 'Perdas & Prevenções', icon: Shield, group: 'Demonstração', badge: 'demo' },
  { to: '/transicao-operacional', label: 'Transição Operacional', icon: Shield, group: 'Demonstração', badge: 'demo' },
  { to: '/integracoes', label: 'Integrações', icon: Plug, group: 'Demonstração', badge: 'demo' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, group: 'Demonstração', badge: 'demo' },
]
