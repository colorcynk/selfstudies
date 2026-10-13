export interface DisplaySegment { text: string; targetId?: string }
export interface ReadingTarget {
  id: string
  kanji: string
  choices: readonly string[]
  answer: string
  hint: string
}
export interface ReadingDifferenceSentence {
  id: string
  grade: 2 | 3
  segments: readonly DisplaySegment[]
  targets: readonly [ReadingTarget, ReadingTarget]
}

export const READING_DIFFERENCE_STAGE_ID = 'kanji:reading-difference-01' as const

const choices = (answer: string, distractors: [string, string, string]) => [answer, ...distractors]
export const READING_DIFFERENCE_SENTENCES: readonly ReadingDifferenceSentence[] = [
  {
    id: 'kanji-reading-difference-s01', grade: 2,
    segments: [{ text: '来' }, { text: '月', targetId: 's01-t1' }, { text: 'は、' }, { text: '月', targetId: 's01-t2' }, { text: 'の絵をかきます。' }],
    targets: [
      { id: 's01-t1', kanji: '月', choices: choices('げつ',['つき','がつ','ひ']), answer: 'げつ', hint: '「来月」は、今の月のあとに来る月です。' },
      { id: 's01-t2', kanji: '月', choices: choices('つき',['げつ','にち','ひ']), answer: 'つき', hint: '夜空に見えるものの名前です。' },
    ],
  },
  {
    id: 'kanji-reading-difference-s02', grade: 2,
    segments: [{ text: '一年' }, { text: '生', targetId: 's02-t1' }, { text: 'が、' }, { text: '生', targetId: 's02-t2' }, { text: 'きものの本を読みました。' }],
    targets: [
      { id: 's02-t1', kanji: '生', choices: choices('せい',['しょう','なま','いき']), answer: 'せい', hint: '「一年生」という学年のことばです。' },
      { id: 's02-t2', kanji: '生', choices: choices('い',['せい','しょう','なま']), answer: 'い', hint: '「生きもの」は、いのちのあるものです。' },
    ],
  },
  {
    id: 'kanji-reading-difference-s03', grade: 2,
    segments: [{ text: '上', targetId: 's03-t1' }, { text: 'にある本を、' }, { text: '上', targetId: 's03-t2' }, { text: '手に読みました。'}],
    targets: [
      { id: 's03-t1', kanji: '上', choices: choices('うえ',['じょう','かみ','あげ']), answer: 'うえ', hint: 'ものの上にあるところです。' },
      { id: 's03-t2', kanji: '上', choices: choices('じょう',['うえ','かみ','あげ']), answer: 'じょう', hint: '「上手」は、ものごとをうまくできることです。' },
    ],
  },
  {
    id: 'kanji-reading-difference-s04', grade: 2,
    segments: [{ text: '地' }, { text: '下', targetId: 's04-t1' }, { text: 'の店を出て、木の' }, { text: '下', targetId: 's04-t2' }, { text: 'で休みました。' }],
    targets: [
      { id: 's04-t1', kanji: '下', choices: choices('か',['した','もと','しも']), answer: 'か', hint: '「地下」は、地の下にあるところです。' },
      { id: 's04-t2', kanji: '下', choices: choices('した',['か','もと','しも']), answer: 'した', hint: '木の近くで、下にあるところです。' },
    ],
  },
  {
    id: 'kanji-reading-difference-s05', grade: 3,
    segments: [{ text: '学校の' }, { text: '行', targetId: 's05-t1' }, { text: '事のあと、銀' }, { text: '行', targetId: 's05-t2' }, { text: 'に入りました。' }],
    targets: [
      { id: 's05-t1', kanji: '行', choices: choices('ぎょう',['こう','い','おこなう']), answer: 'ぎょう', hint: '「行事」のはじめの字の読みです。' },
      { id: 's05-t2', kanji: '行', choices: choices('こう',['い','ぎょう','おこなう']), answer: 'こう', hint: '「銀行」の中では、この字を音で読みます。' },
    ],
  },
]
