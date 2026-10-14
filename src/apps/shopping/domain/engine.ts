import type { BasketLine, BasketValidation, Product, ShoppingQuest } from './types'
import { CATALOG } from '../../../shared/progress/catalog'

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0

export function validateBasket(basket: readonly BasketLine[], products: readonly Product[], expected: readonly BasketLine[]): BasketValidation {
  const errors: string[] = []
  const knownIds = new Set(products.map((product) => product.id))
  const quantities = new Map<string, number>()
  for (const line of basket) {
    if (!knownIds.has(line.productId)) errors.push(`Unknown product: ${line.productId}`)
    if (!isPositiveInteger(line.quantity)) errors.push(`Invalid quantity for ${line.productId}`)
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity)
  }
  if (quantities.size !== basket.length) errors.push('Duplicate product lines must be combined')
  const expectedQuantities = new Map(expected.map((line) => [line.productId, line.quantity]))
  for (const [id, quantity] of quantities) if (expectedQuantities.get(id) !== quantity) errors.push(`Unexpected quantity for ${id}`)
  for (const [id, quantity] of expectedQuantities) if (quantities.get(id) !== quantity) errors.push(`Missing or incorrect quantity for ${id}`)
  return { valid: errors.length === 0, errors }
}

export function countBasket(basket: readonly BasketLine[]): number {
  return basket.reduce((total, line) => total + line.quantity, 0)
}

export function subtotalYen(basket: readonly BasketLine[], products: readonly Product[]): number {
  const prices = new Map(products.map(({ id, priceYen }) => [id, priceYen]))
  return basket.reduce((total, line) => total + (prices.get(line.productId) ?? 0) * line.quantity, 0)
}

export function totalYen(quest: ShoppingQuest, products: readonly Product[]): number {
  return subtotalYen(quest.basket, products)
}

export function changeYen(paidYen: number, total: number): number {
  if (!Number.isSafeInteger(paidYen) || !Number.isSafeInteger(total) || paidYen < total || total < 0) {
    throw new RangeError('Payment and total must be non-negative integer yen, with payment covering the total')
  }
  return paidYen - total
}

export function validateQuest(quest: ShoppingQuest, products: readonly Product[]): string[] {
  const errors: string[] = []
  if (!/^shopping:quest-(0[1-9]|1[0-5])$/.test(quest.id)) errors.push('Invalid catalog stage ID')
  const catalogEntry = CATALOG.find((entry) => entry.appId === 'shopping' && entry.stageId === quest.id)
  if (!catalogEntry || catalogEntry.modeId !== quest.modeId) errors.push('Quest mode or stage does not match the shared catalog')
  if (catalogEntry && catalogEntry.questionCount !== (quest.multiplication ? 3 : 2)) errors.push('Numeric question count does not match the shared catalog')
  if (!Number.isSafeInteger(quest.paidYen) || quest.paidYen < 0 || quest.paidYen > 1000) errors.push('Payment must be integer yen from 0 to 1,000')
  const basket = validateBasket(quest.basket, products, quest.basket)
  errors.push(...basket.errors)
  const total = subtotalYen(quest.basket, products)
  if (total > 1000) errors.push('Total must not exceed 1,000 yen')
  if (quest.paidYen < total) errors.push('Payment must cover the total')
  const shouldMultiply = quest.modeId !== 'standard'
  if (shouldMultiply !== Boolean(quest.multiplication)) errors.push('Multiplication data must match the quest mode')
  if (quest.multiplication) {
    const item = products.find(({ id }) => id === quest.multiplication!.productId)
    if (!item || !Number.isSafeInteger(quest.multiplication.factor) || quest.multiplication.factor < 1 || quest.multiplication.factor > 9) errors.push('Multiplication factors and product must be valid')
    if (quest.modeId === 'multiplication-count' && quest.multiplication.operation !== 'count') errors.push('Count mode must ask for item count')
    if (quest.modeId === 'multiplication-money' && quest.multiplication.operation !== 'money') errors.push('Money mode must ask for yen')
    const line = quest.basket.find(({ productId }) => productId === quest.multiplication!.productId)
    if (!line || line.quantity !== quest.multiplication.factor) errors.push('Multiplication factor must match basket quantity')
  }
  return errors
}

export function validateProducts(products: readonly Product[]): string[] {
  const errors: string[] = []
  if (products.length < 8) errors.push('At least eight products are required')
  const ids = new Set<string>()
  for (const product of products) {
    if (!product.id.trim() || ids.has(product.id)) errors.push(`Missing or duplicate product ID: ${product.id}`)
    ids.add(product.id)
    if (!product.name.trim() || !product.unit.trim()) errors.push(`Product ${product.id} needs a name and unit`)
    if (!Number.isSafeInteger(product.priceYen) || product.priceYen <= 0 || product.priceYen > 1000) errors.push(`Invalid price for ${product.id}`)
    if (product.countPerPack !== undefined && (!Number.isSafeInteger(product.countPerPack) || product.countPerPack <= 0)) errors.push(`Invalid pack count for ${product.id}`)
  }
  return errors
}

export function validateQuestCatalog(quests: readonly ShoppingQuest[], products: readonly Product[]): string[] {
  const errors: string[] = []
  const catalogQuests = CATALOG.filter(({ appId }) => appId === 'shopping')
  if (quests.length !== catalogQuests.length) errors.push('Quest count must match the shared catalog')
  const ids = new Set<string>()
  for (const quest of quests) {
    if (ids.has(quest.id)) errors.push(`Duplicate quest ID: ${quest.id}`)
    ids.add(quest.id)
    errors.push(...validateQuest(quest, products).map((error) => `${quest.id}: ${error}`))
  }
  for (const { stageId } of catalogQuests) if (!ids.has(stageId)) errors.push(`Missing catalog quest ${stageId}`)
  if (!quests.some(({ modeId }) => modeId === 'multiplication-count')) errors.push('At least one count multiplication quest is required')
  if (!quests.some(({ modeId }) => modeId === 'multiplication-money')) errors.push('At least one money multiplication quest is required')
  return errors
}

export function multiplicationAnswer(quest: ShoppingQuest, products: readonly Product[]): number {
  if (!quest.multiplication) throw new TypeError('Quest has no multiplication question')
  if (quest.multiplication.operation === 'count') {
    const product = products.find(({ id }) => id === quest.multiplication!.productId)
    const countPerPack = product?.countPerPack
    if (!Number.isSafeInteger(countPerPack)) throw new TypeError('Count question requires countPerPack on the product')
    return (countPerPack as number) * quest.multiplication.factor
  }
  const product = products.find(({ id }) => id === quest.multiplication!.productId)
  if (!product) throw new TypeError('Unknown multiplication product')
  return product.priceYen * quest.multiplication.factor
}
