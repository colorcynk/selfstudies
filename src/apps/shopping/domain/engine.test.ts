import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '../data/products'
import { SHOPPING_QUESTS } from '../data/quests'
import { changeYen, countBasket, multiplicationAnswer, subtotalYen, totalYen, validateBasket, validateProducts, validateQuestCatalog } from './engine'

describe('shopping domain fixtures and arithmetic', () => {
  it('validates all catalog fixtures, products and quest stages', () => {
    expect(validateProducts(PRODUCTS)).toEqual([])
    expect(validateQuestCatalog(SHOPPING_QUESTS, PRODUCTS)).toEqual([])
    expect(SHOPPING_QUESTS.map(({ id }) => id)).toEqual(Array.from({ length: 15 }, (_, i) => `shopping:quest-${String(i + 1).padStart(2, '0')}`))
    expect(SHOPPING_QUESTS.slice(0, 4).every(({ modeId }) => modeId === 'standard')).toBe(true)
    expect(SHOPPING_QUESTS[4]?.modeId).toBe('multiplication-count')
    expect(SHOPPING_QUESTS[5]?.modeId).toBe('multiplication-money')
  })

  it('moves from two-digit addition and subtraction to later three-digit arithmetic', () => {
    const early = SHOPPING_QUESTS.slice(0, 2)
    for (const quest of early) {
      const terms = quest.basket.map((line) => PRODUCTS.find(({ id }) => id === line.productId)!.priceYen * line.quantity)
      const total = totalYen(quest, PRODUCTS)
      const change = changeYen(quest.paidYen, total)
      expect(terms.every((term) => term >= 10 && term <= 99)).toBe(true)
      expect(total).toBeGreaterThanOrEqual(10)
      expect(total).toBeLessThanOrEqual(99)
      expect(quest.paidYen).toBeGreaterThanOrEqual(10)
      expect(quest.paidYen).toBeLessThanOrEqual(99)
      expect(change).toBeGreaterThanOrEqual(10)
      expect(change).toBeLessThanOrEqual(99)
    }
    expect(SHOPPING_QUESTS.slice(2, 4).some((quest) => totalYen(quest, PRODUCTS) >= 100)).toBe(true)
  })

  it('requires exact known products and positive integer quantities', () => {
    const expected = [{ productId: 'apple', quantity: 2 }]
    expect(validateBasket(expected, PRODUCTS, expected).valid).toBe(true)
    expect(validateBasket([{ productId: 'unknown', quantity: 2 }], PRODUCTS, expected).valid).toBe(false)
    expect(validateBasket([{ productId: 'apple', quantity: 0 }], PRODUCTS, expected).valid).toBe(false)
    expect(validateBasket([{ productId: 'apple', quantity: 1 }], PRODUCTS, expected).valid).toBe(false)
  })

  it('calculates basket count, totals, multiplication answers and change', () => {
    expect(countBasket([{ productId: 'apple', quantity: 2 }, { productId: 'bread', quantity: 1 }])).toBe(3)
    expect(subtotalYen([{ productId: 'apple', quantity: 2 }], PRODUCTS)).toBe(60)
    expect(totalYen(SHOPPING_QUESTS[0]!, PRODUCTS)).toBe(60)
    expect(multiplicationAnswer(SHOPPING_QUESTS[4]!, PRODUCTS)).toBe(15)
    expect(multiplicationAnswer(SHOPPING_QUESTS[5]!, PRODUCTS)).toBe(360)
    expect(changeYen(300, 240)).toBe(60)
    expect(() => changeYen(200, 240)).toThrow(RangeError)
    expect(() => changeYen(300.5, 240)).toThrow(RangeError)
  })

  it('calculates every quest with yen and item counts kept separate', () => {
    // Independently checked answers in quest order, including the unchanged first six.
    const totals = [60, 70, 390, 460, 240, 360, 460, 620, 410, 630, 860, 900, 840, 810, 940]
    const changes = [30, 20, 110, 40, 60, 140, 40, 380, 90, 370, 140, 100, 160, 190, 60]
    const multiplications = new Map([[5, 15], [6, 360], [9, 20], [10, 330], [12, 35], [13, 540], [14, 360], [15, 40]])
    SHOPPING_QUESTS.forEach((quest, index) => {
      expect(totalYen(quest, PRODUCTS), quest.id).toBe(totals[index])
      expect(changeYen(quest.paidYen, totals[index]!), quest.id).toBe(changes[index])
      if (quest.multiplication) expect(multiplicationAnswer(quest, PRODUCTS), quest.id).toBe(multiplications.get(index + 1))
    })
  })

  it('rejects missing, duplicate or unregistered catalog quests', () => {
    expect(validateQuestCatalog(SHOPPING_QUESTS.slice(0, 6), PRODUCTS).some(error => error.includes('Missing catalog quest shopping:quest-15'))).toBe(true)
    const duplicate = [...SHOPPING_QUESTS.slice(0, -1), SHOPPING_QUESTS[0]!]
    expect(validateQuestCatalog(duplicate, PRODUCTS).some(error => error.includes('Duplicate quest ID'))).toBe(true)
    const unknown = { ...SHOPPING_QUESTS[14]!, id: 'shopping:quest-16' } as unknown as typeof SHOPPING_QUESTS[number]
    expect(validateQuestCatalog([...SHOPPING_QUESTS.slice(0, -1), unknown], PRODUCTS).some(error => error.includes('Invalid catalog stage ID'))).toBe(true)
  })
})
