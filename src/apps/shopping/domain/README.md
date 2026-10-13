# Shopping domain API

This folder contains the typed data contract and pure arithmetic/validation helpers for the shopping game. User-facing content and product fixtures live in `../data/`.

## Data contract

- `Product`: stable `id`, child-friendly `name`, integer `priceYen`, explicit `unit`, and optional `countPerPack` for count multiplication.
- `BasketLine`: `productId` and positive integer `quantity`.
- `ShoppingQuest`: catalog `id`, catalog `modeId`, Japanese story and basket prompt, expected editable basket, integer `paidYen`, stage hints, and optional multiplication question. Standard quests have a basket step plus total and change numeric questions (2 catalog questions). Multiplication quests add a multiplication numeric question (3 catalog questions).
- `multiplication.operation` distinguishes `count` (answer unit is item count) from `money` (answer unit is yen). Its factor must match the expected basket quantity.

Fixtures are exported as `PRODUCTS` and `SHOPPING_QUESTS` from `src/apps/shopping/data/products.ts` and `src/apps/shopping/data/quests.ts`.

## Functions

Import from `./engine`:

- `validateBasket(basket, products, expected)` checks known product IDs, positive integer quantities, duplicates, and exact required basket contents. Use it to gate progress from the editable basket step.
- `countBasket(basket)` returns the sum of product quantities.
- `subtotalYen(basket, products)` calculates basket price in yen.
- `totalYen(quest, products)` calculates the expected quest total. Keep this expected value out of the UI until the child submits an answer.
- `changeYen(paidYen, total)` returns change and throws `RangeError` for non-integers, negative values, or insufficient payment.
- `multiplicationAnswer(quest, products)` returns count for count mode or yen for money mode.
- `validateProducts`, `validateQuest`, and `validateQuestCatalog` return an array of human-readable validation errors; an empty array means valid. Catalog validation uses the shared progress catalog.

Do not derive completion rewards here. T5 should use the shared progress API with the quest's exact `modeId` and `id`.
