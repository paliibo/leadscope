import { afterEach } from 'vitest'

/**
 * Component suites run in jsdom; pure-logic suites opt into the node
 * environment with a `@vitest-environment node` docblock. Guard the DOM-only
 * setup so those files neither pay for it nor break on a document that is not
 * there.
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')
  afterEach(() => {
    cleanup()
  })
}
