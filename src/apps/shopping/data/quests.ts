import type { ShoppingQuest } from '../domain/types'

export const SHOPPING_QUESTS: readonly ShoppingQuest[] = [
  {
    id: 'shopping:quest-01', modeId: 'standard', title: 'おひるのくだもの',
    story: 'りすさんが、おひるに食べるりんごを買いにきたよ。', basketPrompt: 'りんごを2こ、かごに入れよう。',
    basket: [{ productId: 'apple', quantity: 2 }], paidYen: 90,
    hints: { total: 'りんご30円を2こ。30＋30で考えよう。', change: '90円から、りんごの合計をひこう。' },
  },
  {
    id: 'shopping:quest-02', modeId: 'standard', title: 'おやつをえらぼう',
    story: 'うさぎさんは、友だちと食べるおやつを買いにきたよ。', basketPrompt: 'りんごを1こと、クッキーを1まいえらぼう。',
    basket: [{ productId: 'apple', quantity: 1 }, { productId: 'cookie', quantity: 1 }], paidYen: 90,
    hints: { total: 'りんご30円とクッキー40円をたそう。', change: '90円から、買った分をひこう。' },
  },
  {
    id: 'shopping:quest-03', modeId: 'standard', title: 'ノートのおつかい',
    story: 'ふくろう先生から、学しゅうノートのおつかいをたのまれたよ。', basketPrompt: 'ノートを3さつ、えんぴつを2本かごに入れよう。',
    basket: [{ productId: 'notebook', quantity: 3 }, { productId: 'pencil', quantity: 2 }], paidYen: 500,
    hints: { total: '90円を3回、60円を2回たしてみよう。', change: '500円からノートとえんぴつの合計をひこう。' },
  },
  {
    id: 'shopping:quest-04', modeId: 'standard', title: 'やさいスープ',
    story: 'くまさんと、スープのざいりょうをそろえることになったよ。', basketPrompt: 'にんじんを4本と牛乳を1本えらぼう。',
    basket: [{ productId: 'carrot', quantity: 4 }, { productId: 'milk', quantity: 1 }], paidYen: 500,
    hints: { total: '70円を4回たしてから、牛乳180円をたそう。', change: '500円から合計をひこう。' },
  },
  {
    id: 'shopping:quest-05', modeId: 'multiplication-count', title: 'あめをみんなに',
    story: 'ことりさんは、なかよしの友だちにあめをくばるよ。', basketPrompt: 'あめを3ふくろ、かごに入れよう。',
    basket: [{ productId: 'candy', quantity: 3 }], paidYen: 300,
    multiplication: { productId: 'candy', factor: 3, operation: 'count', question: '1ふくろに5こ入ったあめを3ふくろ。あめはぜんぶで何こかな？', hint: '「1ふくろに5こ」がいくつ分あるか考えよう。5×3だよ。' },
    hints: { total: 'あめのふくろ1つは80円。80円を3回たそう。', change: '300円から、あめの代金をひこう。' },
  },
  {
    id: 'shopping:quest-06', modeId: 'multiplication-money', title: 'えんぴつをそろえよう',
    story: 'たぬきさんは、工作クラブのなかまと使うえんぴつを買うよ。', basketPrompt: 'えんぴつを6本、かごに入れよう。',
    basket: [{ productId: 'pencil', quantity: 6 }], paidYen: 500,
    multiplication: { productId: 'pencil', factor: 6, operation: 'money', question: 'えんぴつ1本は60円。6本では何円かな？', hint: '1本分の60円が6つ分。60×6で考えよう。' },
    hints: { total: 'えんぴつは1本60円。60円を6回たしてみよう。', change: '500円から、えんぴつの合計をひこう。' },
  },
]
