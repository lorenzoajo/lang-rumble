import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

describe('App', () => {
  it('mounts with a router view stub', () => {
    const wrapper = mount(App, { global: { stubs: { RouterView: true } } })
    expect(wrapper.exists()).toBe(true)
  })
})
