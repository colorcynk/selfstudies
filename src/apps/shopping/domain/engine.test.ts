import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '../data/products'
import { SHOPPING_QUESTS } from '../data/quests'
import { changeYen, countBasket, multiplicationAnswer, subtotalYen, totalYen, validateBasket, validateProducts, validateQuestCatalog } from './engine'

describe('shopping domain fixtures and arithmetic', () => {
  it('validates all catalog fixtures, products and quest stages', () => {
    expect(validateProducts(PRODUCTS)).toEqual([])
    expect(validateQuestCatalog(SHOPPING_QUESTS, PRODUCTS)).toEqual([])
    expect(SHOPPING_QUESTS.map(({ id }) => id)).toEqual(Array.from({ length: 6 }, (_, i) => `shopping:quest-0${i + 1}`))
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
})
