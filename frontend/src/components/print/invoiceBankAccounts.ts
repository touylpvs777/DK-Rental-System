import type { InvoicePrintBankAccount } from './InvoicePrintTemplate'

/** DK Lao Trading's standard settlement accounts — placeholders pending the real
 *  account numbers from the reference invoice; swap in the real digits here. */
export const DEFAULT_BANK_ACCOUNTS: InvoicePrintBankAccount[] = [
  { bank: 'LDB (Lao Development Bank)', currency: 'LAK', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '000-1-00-0000000-0' },
  { bank: 'LDB (Lao Development Bank)', currency: 'THB', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '000-2-00-0000000-0' },
  { bank: 'LDB (Lao Development Bank)', currency: 'USD', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '000-3-00-0000000-0' },
  { bank: 'BCEL (Banque Pour Le Commerce Exterieur Lao)', currency: 'LAK', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '111-1-00-0000000-0' },
  { bank: 'BCEL (Banque Pour Le Commerce Exterieur Lao)', currency: 'THB', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '111-2-00-0000000-0' },
  { bank: 'BCEL (Banque Pour Le Commerce Exterieur Lao)', currency: 'USD', accountName: 'DK Lao Trading Sole Co., Ltd', accountNumber: '111-3-00-0000000-0' },
]
