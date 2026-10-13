import type { Product } from '../domain/types'

export const PRODUCTS: readonly Product[] = [
  { id: 'apple', name: 'りんご', priceYen: 30, unit: 'こ' },
  { id: 'bread', name: 'ロールパン', priceYen: 150, unit: 'ふくろ' },
  { id: 'milk', name: '牛乳', priceYen: 180, unit: '本' },
  { id: 'candy', name: 'あめ', priceYen: 80, unit: 'ふくろ', countPerPack: 5 },
  { id: 'notebook', name: 'ノート', priceYen: 90, unit: 'さつ' },
  { id: 'pencil', name: 'えんぴつ', priceYen: 60, unit: '本' },
  { id: 'juice', name: 'りんごジュース', priceYen: 110, unit: '本' },
  { id: 'carrot', name: 'にんじん', priceYen: 70, unit: '本' },
  { id: 'cookie', name: 'クッキー', priceYen: 40, unit: 'まい' },
]
