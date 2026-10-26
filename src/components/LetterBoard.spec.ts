import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LetterBoard from './LetterBoard.vue'

const tiles = ['c', 'a', 's', 'a', 'x', 'y', 'z', 'w', 'q', 'r', 't', 'u', 'i', 'o', 'p', 'l']
// 400px board → 100px cells; centre of cell i is (col*100+50, row*100+50)
const at = (i: number) => ({
  clientX: (i % 4) * 100 + 50,
  clientY: Math.floor(i / 4) * 100 + 50,
  pointerId: 1,
})

function mountBoard() {
  const wrapper = mount(LetterBoard, { props: { tiles, rolling: false } })
  const board = wrapper.get('[data-test="board"]').element as HTMLElement
  board.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 400,
    right: 400,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  board.setPointerCapture = () => {}
  return { wrapper, board }
}

const fire = (
  el: HTMLElement,
  type: string,
  init: { clientX: number; clientY: number; pointerId: number },
) => el.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), init))

describe('LetterBoard', () => {
  it('emits the traced word on release', () => {
    const { wrapper, board } = mountBoard()
    fire(board, 'pointerdown', at(0))
    fire(board, 'pointermove', at(1))
    fire(board, 'pointermove', at(2))
    fire(board, 'pointerup', at(2))
    expect(wrapper.emitted('submit')?.[0]).toEqual(['cas', [0, 1, 2]])
  })
  it('ignores non adjacent tiles and undoes by moving back', () => {
    const { wrapper, board } = mountBoard()
    fire(board, 'pointerdown', at(0))
    fire(board, 'pointermove', at(2)) // not adjacent to 0
    fire(board, 'pointermove', at(1))
    fire(board, 'pointermove', at(5))
    fire(board, 'pointermove', at(1)) // back onto previous tile → undo 5
    fire(board, 'pointerup', at(1))
    expect(wrapper.emitted('submit')?.[0]).toEqual(['ca', [0, 1]])
  })
  it('does not submit a single tile', () => {
    const { wrapper, board } = mountBoard()
    fire(board, 'pointerdown', at(0))
    fire(board, 'pointerup', at(0))
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
