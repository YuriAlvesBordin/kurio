/**
 * Minimal replacement for the cookie jar that MSW loads from tough-cookie.
 * The application authenticates with the Authorization header and no handler sets cookies, so the full jar and its
 * public suffix list (about 150 kB of JavaScript) only add parse cost to the critical path. Cookies are not supported
 * by the mock layer as a consequence.
 */
export class Cookie {
  static fromJSON(): null {
    return null
  }
}

export class MemoryCookieStore {
  idx: Record<string, never> = {}
}

export class CookieJar {
  constructor(readonly store: MemoryCookieStore) {}

  getCookiesSync(): [] {
    return []
  }

  async setCookie(): Promise<void> {}
}
