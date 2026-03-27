import '@testing-library/jest-dom'

const _store = new Map<string, string>()
const localStoragePoly: Storage = {
  getItem(key: string): string | null { return _store.get(key) ?? null },
  setItem(key: string, value: string) { _store.set(key, String(value)) },
  removeItem(key: string) { _store.delete(key) },
  clear() { _store.clear() },
  get length() { return _store.size },
  key(index: number): string | null { return [..._store.keys()][index] ?? null },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStoragePoly,
  writable: true,
  configurable: true,
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStoragePoly,
    writable: true,
    configurable: true,
  })
}

HTMLCanvasElement.prototype.getContext = (() => {
  return {
    fillStyle: '',
    fillRect() {},
    beginPath() {},
    fill() {},
    roundRect() {},
    arc() {},
    closePath() {},
    stroke() {},
    clearRect() {},
    measureText: () => ({ width: 0 }),
    canvas: { toDataURL: () => 'data:image/png;base64,mock' },
  }
}) as any
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mock'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
