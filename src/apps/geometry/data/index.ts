import type { CountQuestion, MatchQuestion } from '../domain/types'
import { COUNT_QUESTIONS } from './count'
import { MATCH_QUESTIONS } from './match'

interface StageBase {
  id: string
  title: string
  description: string
  cardDescription: string
}
export interface MatchStage extends StageBase { mode: 'match'; questions: readonly MatchQuestion[] }
export interface CountStage extends StageBase { mode: 'count'; questions: readonly CountQuestion[] }
export type GeometryStage = MatchStage | CountStage

const stageInfo = [
  ['geometry:match-circle', '円を見つけよう', '円は、まん中からふちまでの長さがどこでも同じです。', 'まんまるの形を見分けよう。'],
  ['geometry:match-square', '正方形を見つけよう', '正方形は、4つの辺の長さが同じで、4つの角が直角です。', '向きが変わった正方形を見つけよう。'],
  ['geometry:match-rectangle', '長方形を見つけよう', '長方形は、向かい合う辺の長さがそれぞれ同じで、4つの角が直角です。', 'たてと横の長さにも注目しよう。'],
  ['geometry:match-equilateral', '正三角形を見つけよう', '正三角形は、3つの辺の長さがすべて同じです。', '回しても辺の長さは変わらないよ。'],
  ['geometry:match-isosceles', '二等辺三角形を見つけよう', '二等辺三角形は、少なくとも2つの辺の長さが同じ三角形です。', '同じ長さの辺が2つある三角形を探そう。'],
  ['geometry:match-right-triangle', '直角三角形を見つけよう', '直角三角形には、直角が1つあります。', '角の向きが違っても直角を見つけよう。'],
] as const

const matchStages: MatchStage[] = stageInfo.map(([id, title, description, cardDescription]) => ({
  id,
  mode: 'match',
  title,
  description,
  cardDescription,
  questions: MATCH_QUESTIONS.filter((question) => question.stageId === id),
}))

const countInfo = [
  ['geometry:count-intro', 'はじめのかぞえかた', '図の線で閉じた形を見つけ、指定された種類を数えます。正方形は長方形にも、正三角形は二等辺三角形にも当てはまります。直角二等辺三角形は直角三角形でもあります。', '形の条件を一つずつ確かめよう。'],
  ['geometry:count-composite', 'くみあわせ', '小さな形だけでなく、線を組み合わせてできる大きな形も数えます。正方形は長方形にも、正三角形は二等辺三角形にも当てはまり、直角二等辺三角形は直角三角形でもあります。', '共有する辺と大きな輪郭を見つけよう。'],
  ['geometry:count-mixed', 'まざったずけい', '三角形と四角形がつながった図から、指定された条件に合う輪郭を数えます。正方形は長方形にも、正三角形は二等辺三角形にも当てはまり、直角二等辺三角形は直角三角形でもあります。', '中の線と外側の輪郭を両方見よう。'],
] as const

const countStages: CountStage[] = countInfo.map(([id, title, description, cardDescription]) => ({
  id, mode: 'count', title, description, cardDescription,
  questions: COUNT_QUESTIONS.filter((question) => question.stageId === id),
}))

export const GEOMETRY_STAGES: GeometryStage[] = [...matchStages, ...countStages]

export function getGeometryStage(stageId: string): GeometryStage | undefined {
  return GEOMETRY_STAGES.find((stage) => stage.id === stageId)
}
