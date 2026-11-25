/** English text. Every key must exist in `si.ts` too (src/i18n/i18n.test.ts checks it). */
export const en = {
  // shell
  'nav.suppliers': 'Suppliers',
  'nav.matching': 'Matching',
  'nav.orders': 'Orders',
  'nav.basePrices': 'Base prices',
  'nav.held': 'Held prices',
  'nav.branches': 'Branches',
  'nav.users': 'Users',
  'nav.group.buy': 'Buy',
  'nav.group.prices': 'Prices',
  'nav.group.setup': 'Setup',
  'nav.more': 'More',
  // top bar
  'top.search': 'Search suppliers and orders',
  'top.searchHint': 'Press / to search',
  'top.noResults': 'Nothing found',
  'top.suppliers': 'Suppliers',
  'top.orders': 'Orders',
  'top.signOut': 'Sign out',
  'top.language': 'Language',
  'top.theme.system': 'Theme: follows your device',
  'top.theme.light': 'Theme: light',
  'top.theme.dark': 'Theme: dark',
  // roles
  'role.owner': 'Owner',
  'role.purchasing': 'Purchasing',
  'role.branch_manager': 'Branch manager',
  'role.accountant': 'Accountant',
  // common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.retry': 'Try again',
  'common.back': 'Back',
  'common.loading': 'Loading',
  'common.empty': 'Nothing here yet',
  'common.error': 'Something went wrong',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.skipToContent': 'Skip to the page content',
  'common.cash': 'Cash',
  'common.increase': 'Up',
  'common.decrease': 'Down',
  'common.unchanged': 'No change',
} as const

export type TextKey = keyof typeof en
