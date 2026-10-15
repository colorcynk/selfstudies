import type { CountQuestion, CountSegment, Point } from '../domain/types'

const p = (x: number, y: number): Point => ({ x, y })
function polygon(id: string, vertices: Point[]): CountSegment[] {
  return vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length]
    return { id: `${id}:e${index}`, start: { id: `${id}:p${index}`, point }, end: { id: `${id}:p${(index + 1) % vertices.length}`, point: next } }
  })
}
const line = (id: string, a: Point, b: Point): CountSegment[] => [{ id, start: { id: `${id}:a`, point: a }, end: { id: `${id}:b`, point: b } }]
const square = (id: string, x: number, y: number, size = 2) => polygon(id, [p(x, y), p(x + size, y), p(x + size, y + size), p(x, y + size)])
const rectangle = (id: string, x: number, y: number, w = 3, h = 2) => polygon(id, [p(x, y), p(x + w, y), p(x + w, y + h), p(x, y + h)])
const equilateral = (id: string, x: number, y: number, side = 2) => polygon(id, [p(x, y), p(x + side, y), p(x + side / 2, y + side * Math.sqrt(3) / 2)])
const isosceles = (id: string, x: number, y: number) => polygon(id, [p(x, y), p(x + 2, y), p(x + 1, y + 1.5)])
const rightIsosceles = (id: string, x: number, y: number) => polygon(id, [p(x, y), p(x + 2, y), p(x, y + 2)])
const sol = (vertices: Point[]) => ({ kind: 'polygon' as const, vertices })

function question(id: string, stageId: string, targetKind: CountQuestion['targetKind'], segments: CountSegment[], solutions: CountQuestion['solutions'], breakdown: CountQuestion['breakdown'], hint: string, explanation: string, circles?: CountQuestion['diagram']['circles']): CountQuestion {
  return { id, stageId, mode: 'count', targetKind, diagram: { segments, ...(circles ? { circles } : {}) }, solutions, breakdown, hint, explanation }
}

const intro = 'geometry:count-intro'
const composite = 'geometry:count-composite'
const mixed = 'geometry:count-mixed'

export const COUNT_QUESTIONS: CountQuestion[] = [
  question(`${intro}:q01`, intro, 'square', [...square('a', 0, 0), ...rectangle('b', 5, 0)], [sol([p(0, 0), p(2, 0), p(2, 2), p(0, 2)])], [{ id: 'squares', label: '正方形', count: 1 }], '四つの辺が同じ長さの四角形を探そう。', '左の図は正方形です。正方形は四つの角が直角なので、長方形の条件にも当てはまります。', [{ id: 'circle-distractor', center: p(10, 1), radius: 1 }]),
  question(`${intro}:q02`, intro, 'circle', [...square('a', 0, 0), ...rectangle('b', 5, 0)], [], [{ id: 'circles', label: '円', count: 0 }], '図にまんまるの輪郭があるか探そう。', '正方形と長方形はありますが、円の輪郭はありません。答えは0個です。'),
  question(`${intro}:q03`, intro, 'equilateral', [...equilateral('a', 0, 0), ...isosceles('b', 5, 0)], [sol([p(0, 0), p(2, 0), p(1, Math.sqrt(3))])], [{ id: 'equilateral', label: '正三角形', count: 1 }], '三つの辺の長さを見比べよう。', '正三角形は三辺が同じ長さです。左だけが正三角形です。'),
  question(`${intro}:q04`, intro, 'isosceles', [...equilateral('a', 0, 0), ...rightIsosceles('b', 5, 0)], [sol([p(0, 0), p(2, 0), p(1, Math.sqrt(3))]), sol([p(5, 0), p(7, 0), p(5, 2)])], [{ id: 'equilateral', label: '正三角形', count: 1 }, { id: 'right-isosceles', label: '直角二等辺三角形', count: 1 }], '正三角形も二等辺、直角二等辺は直角と二等辺の両方だよ。', '正三角形は二辺も同じなので二等辺三角形です。右の直角二等辺三角形も二等辺三角形です。'),
  question(`${intro}:q05`, intro, 'circle', [...square('a', 0, 0)], [{ kind: 'circle', circleId: 'c1' }], [{ id: 'circles', label: '円', count: 1 }], 'まんまるの輪郭を探そう。', '四角形の線とは離れた円が一つあります。円だけを数えます。', [{ id: 'c1', center: p(6, 1), radius: 1 }]),

  question(`${composite}:q01`, composite, 'square', [
    ...line('g-bottom', p(0, 0), p(4, 0)), ...line('g-top', p(0, 4), p(4, 4)),
    ...line('g-left', p(0, 0), p(0, 4)), ...line('g-right', p(4, 0), p(4, 4)),
    ...line('g-mid-v', p(2, 0), p(2, 4)), ...line('g-mid-h', p(0, 2), p(4, 2)),
  ], [sol([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]), sol([p(2, 0), p(4, 0), p(4, 2), p(2, 2)]), sol([p(0, 2), p(2, 2), p(2, 4), p(0, 4)]), sol([p(2, 2), p(4, 2), p(4, 4), p(2, 4)]), sol([p(0, 0), p(4, 0), p(4, 4), p(0, 4)])], [{ id: 'small', label: '小さい正方形', count: 4 }, { id: 'large', label: '大きい正方形', count: 1 }], '小さい正方形を数えたあと、外側を囲む大きな輪郭も探そう。', '小さい正方形が四つ、外側を囲む大きな正方形が一つで、合わせて五つです。'),
  question(`${composite}:q02`, composite, 'rectangle', [...line('g2-bottom', p(0, 0), p(4, 0)), ...line('g2-top', p(0, 2), p(4, 2)), ...line('g2-left', p(0, 0), p(0, 2)), ...line('g2-right', p(4, 0), p(4, 2)), ...line('g2-mid', p(2, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]), sol([p(2, 0), p(4, 0), p(4, 2), p(2, 2)]), sol([p(0, 0), p(4, 0), p(4, 2), p(0, 2)])], [{ id: 'small-squares', label: '小さい正方形', count: 2 }, { id: 'large-rectangle', label: '組み合わせた長方形', count: 1 }], '正方形も長方形に当てはまるよ。共有する線の向こうまで外周をたどろう。', '二つの小さな正方形に加えて、二つを囲む大きな長方形もあります。正方形は長方形にも当てはまります。'),
  question(`${composite}:q03`, composite, 'right-triangle', [...square('a', 0, 0), ...line('a-diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2)]), sol([p(0, 0), p(2, 2), p(0, 2)])], [{ id: 'right-isosceles', label: '直角二等辺三角形', count: 2 }], '直角二等辺三角形も直角三角形として数えるよ。', '対角線でできた二つの三角形はどちらも直角二等辺三角形なので、直角三角形として数えます。'),
  question(`${composite}:q04`, composite, 'equilateral', [...equilateral('up', 0, 0), ...polygon('down', [p(0, 0), p(2, 0), p(1, -Math.sqrt(3))])], [sol([p(0, 0), p(2, 0), p(1, Math.sqrt(3))]), sol([p(0, 0), p(2, 0), p(1, -Math.sqrt(3))])], [{ id: 'equilateral-pair', label: '共有する辺の正三角形', count: 2 }], '同じ辺を共有する三角形の輪郭をたどろう。', '上下の三角形はどちらも三辺が同じ正三角形です。共有する辺は両方の輪郭に使えます。'),
  question(`${composite}:q05`, composite, 'isosceles', [...square('b', 0, 0), ...line('b-diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2)]), sol([p(0, 0), p(2, 2), p(0, 2)])], [{ id: 'right-isosceles', label: '直角二等辺三角形', count: 2 }], '直角二等辺三角形も二等辺三角形として数えるよ。', '二つとも直角二等辺三角形なので、二等辺三角形として数えます。'),

  question(`${mixed}:q01`, mixed, 'square', [...square('m', 0, 0), ...line('diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2), p(0, 2)])], [{ id: 'outer', label: '外側の正方形', count: 1 }], '中の線があっても、外側の輪郭が閉じているか見よう。', '対角線で内側が分かれていても、外側の正方形は一つです。'),
  question(`${mixed}:q02`, mixed, 'right-triangle', [...square('m', 0, 0), ...line('diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2)]), sol([p(0, 0), p(2, 2), p(0, 2)])], [{ id: 'triangles', label: '直角二等辺三角形', count: 2 }], '直角二等辺三角形も直角三角形として数えるよ。', 'どちらの三角形も直角があり、二辺が同じです。直角三角形と二等辺三角形の両方に当てはまります。'),
  question(`${mixed}:q03`, mixed, 'rectangle', [...square('m', 0, 0), ...line('diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2), p(0, 2)])], [{ id: 'square', label: '正方形も長方形', count: 1 }], '正方形も長方形に当てはまるよ。中の線があっても外周を見よう。', '正方形は四つの角が直角なので長方形にも当てはまります。対角線があっても外周は一つです。'),
  question(`${mixed}:q04`, mixed, 'isosceles', [...square('m', 0, 0), ...line('diagonal', p(0, 0), p(2, 2))], [sol([p(0, 0), p(2, 0), p(2, 2)]), sol([p(0, 0), p(2, 2), p(0, 2)])], [{ id: 'right-isosceles', label: '直角二等辺三角形', count: 2 }], '直角二等辺三角形も二等辺三角形として数えるよ。', '二つとも直角二等辺三角形です。正三角形でなくても、二辺が等しければ二等辺です。'),
  question(`${mixed}:q05`, mixed, 'square', [
    ...polygon('rotated-square', [p(1, 0), p(2, 1), p(1, 2), p(0, 1)]),
    ...line('rotated-diagonal', p(0, 1), p(2, 1)),
  ], [sol([p(1, 0), p(2, 1), p(1, 2), p(0, 1)])], [{ id: 'rotated-outer', label: '回転した外側の正方形', count: 1 }], '向きが変わっていても、四つの辺と角を確かめよう。', 'ひし形のように見えますが、四辺が同じ長さで四つの角が直角なので正方形です。内側の線があっても外周を数えます。'),
]
