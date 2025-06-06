export const VISTORIA_VALUES = {
  CARRO: 120,
  MOTO: 100,
  CAMINHAO: 180,
  CAMINHONETE: 140,
  CAUTELAR: 220,
  REVISTORIA: 200,
  REVISTORIA_DETRAN: 120,
  PESQUISA: 60,
} as const;

export type VistoriaType = keyof typeof VISTORIA_VALUES;

export const VISTORIA_LABELS: Record<VistoriaType, string> = {
  CARRO: 'Carro',
  MOTO: 'Moto',
  CAMINHAO: 'Caminhão',
  CAMINHONETE: 'Caminhonete',
  CAUTELAR: 'Cautelar',
  REVISTORIA: 'Revistoria',
  REVISTORIA_DETRAN: 'Revistoria Detran',
  PESQUISA: 'Pesquisa',
} as const;

export const VISTORIA_ICONS: Record<VistoriaType, string> = {
  CARRO: 'Car',
  MOTO: 'Bike',
  CAMINHAO: 'Truck',
  CAMINHONETE: 'Truck',
  CAUTELAR: 'FileCheck',
  REVISTORIA: 'ClipboardCheck',
  REVISTORIA_DETRAN: 'ClipboardList',
  PESQUISA: 'Search',
} as const; 