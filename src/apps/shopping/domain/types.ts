export type ShoppingMode = 'standard' | 'multiplication-count' | 'multiplication-money'

export interface Product {
  id: string
  name: string
  priceYen: number
  unit: string
  countPerPack?: number
}

export interface BasketLine {
  productId: string
  quantity: number
}

export interface ShoppingQuest {
  id: `shopping:quest-${`0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `1${0 | 1 | 2 | 3 | 4 | 5}`}`
  modeId: ShoppingMode
  title: string
  story: string
  basketPrompt: string
  basket: BasketLine[]
  paidYen: number
  multiplication?: {
    productId: string
    factor: number
    operation: 'count' | 'money'
    question: string
    hint: string
  }
  hints: { total: string; change: string }
}

export interface BasketValidation {
  valid: boolean
  errors: string[]
}
