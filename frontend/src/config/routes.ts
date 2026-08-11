export interface RouteConfig {
  path: string
  labelKey: string
  parent?: string
}

export const ROUTE_CONFIG: RouteConfig[] = [
  { path: '/dashboard',             labelKey: 'routes.dashboard' },
  { path: '/customers',             labelKey: 'routes.customers' },
  { path: '/customers/:id',         labelKey: 'routes.customerDetail', parent: '/customers' },
  { path: '/leads',                 labelKey: 'routes.leads' },
  { path: '/activity',              labelKey: 'routes.activity' },
  { path: '/reports',               labelKey: 'routes.reports' },
  { path: '/settings',              labelKey: 'routes.settings' },
  { path: '/catalog',               labelKey: 'routes.products' },
  { path: '/catalog/products/:id',  labelKey: 'routes.productDetail',    parent: '/catalog' },
  { path: '/catalog/brands',        labelKey: 'routes.brands',           parent: '/catalog' },
  { path: '/catalog/categories',    labelKey: 'routes.categories',       parent: '/catalog' },
  { path: '/catalog/import',        labelKey: 'routes.import',           parent: '/catalog' },
  { path: '/equipment',             labelKey: 'routes.equipmentRegistry' },
  { path: '/equipment/:id',         labelKey: 'routes.equipmentDetail',  parent: '/equipment' },
  { path: '/quotations',            labelKey: 'routes.quotations' },
  { path: '/quotations/new',        labelKey: 'routes.newQuotation',     parent: '/quotations' },
  { path: '/quotations/:id',        labelKey: 'routes.quotationDetail',  parent: '/quotations' },
  { path: '/sales-orders',          labelKey: 'routes.salesOrders' },
  { path: '/rental-contracts',      labelKey: 'routes.rentalContracts' },
  { path: '/rental-contracts/new',  labelKey: 'routes.newContract',      parent: '/rental-contracts' },
  { path: '/rental-contracts/:id',  labelKey: 'routes.contractDetail',   parent: '/rental-contracts' },
  { path: '/movements',             labelKey: 'routes.movementControl' },
  { path: '/movements/new',         labelKey: 'routes.newMovement',      parent: '/movements' },
  { path: '/movements/:id',         labelKey: 'routes.movementDetail',   parent: '/movements' },
  { path: '/billing',                          labelKey: 'routes.billing' },
  { path: '/billing/invoices',                 labelKey: 'routes.invoices',             parent: '/billing' },
  { path: '/billing/invoices/:id',             labelKey: 'routes.invoiceDetail',        parent: '/billing/invoices' },
  { path: '/billing/tax-invoices',             labelKey: 'routes.taxInvoices',          parent: '/billing' },
  { path: '/billing/credit-notes',             labelKey: 'routes.creditNotes',          parent: '/billing' },
  { path: '/billing/payments',                 labelKey: 'routes.payments',             parent: '/billing' },
  { path: '/billing/payments/:id',             labelKey: 'routes.paymentDetail',        parent: '/billing/payments' },
  { path: '/billing/payment-vouchers',         labelKey: 'routes.paymentVouchers',      parent: '/billing' },
  { path: '/billing/deposits',                 labelKey: 'routes.deposits',             parent: '/billing' },
  { path: '/billing/deposits/:id',             labelKey: 'routes.depositDetail',        parent: '/billing/deposits' },
  { path: '/billing/revenue-recognitions',     labelKey: 'routes.revenueRecognition',   parent: '/billing' },
  { path: '/billing/finance',                labelKey: 'routes.financeDashboard',      parent: '/billing' },
  { path: '/billing/statements',             labelKey: 'routes.statements',            parent: '/billing' },
  { path: '/billing/payments-unified',       labelKey: 'routes.paymentManager',        parent: '/billing' },
  { path: '/billing/deposits-unified',       labelKey: 'routes.depositManager',        parent: '/billing' },
  { path: '/maintenance',                   labelKey: 'routes.maintenancePm' },
  { path: '/maintenance/work-orders',       labelKey: 'routes.workOrders',        parent: '/maintenance' },
  { path: '/maintenance/work-orders/new',   labelKey: 'routes.newWorkOrder',      parent: '/maintenance/work-orders' },
  { path: '/maintenance/work-orders/:id',   labelKey: 'routes.workOrderDetail',   parent: '/maintenance/work-orders' },
  { path: '/maintenance/schedules',         labelKey: 'routes.pmSchedules',       parent: '/maintenance' },
  { path: '/inventory',                     labelKey: 'routes.inventory' },
  { path: '/inventory/parts',               labelKey: 'routes.spareParts',        parent: '/inventory' },
  { path: '/inventory/pos',                 labelKey: 'routes.partsPOS',           parent: '/inventory' },
  { path: '/inventory/parts/new',           labelKey: 'routes.newPart',           parent: '/inventory/parts' },
  { path: '/inventory/parts/:id',           labelKey: 'routes.partDetail',        parent: '/inventory/parts' },
  { path: '/inventory/warehouses',          labelKey: 'routes.warehouses',        parent: '/inventory' },
  { path: '/inventory/purchase-orders',     labelKey: 'routes.purchaseOrders',    parent: '/inventory' },
  { path: '/inventory/goods-receive',       labelKey: 'routes.goodsReceive',      parent: '/inventory' },
  { path: '/inventory/goods-issue',         labelKey: 'routes.goodsIssue',        parent: '/inventory' },
  { path: '/inventory/delivery-notes',      labelKey: 'routes.deliveryNotes',     parent: '/inventory' },
  { path: '/executive',                    labelKey: 'routes.executiveDashboard' },
  { path: '/iot-management',               labelKey: 'routes.iotManagement' },
  { path: '/projects',                     labelKey: 'routes.projects' },
  { path: '/projects/:id',                 labelKey: 'routes.projectDetail', parent: '/projects' },
]

export function matchRoute(pathname: string): RouteConfig | undefined {
  return ROUTE_CONFIG.find((r) => {
    const pattern = r.path.replace(/:[\w]+/g, '[^/]+')
    return new RegExp(`^${pattern}$`).test(pathname)
  })
}

export function buildBreadcrumbs(pathname: string): { labelKey: string; path: string }[] {
  const current = matchRoute(pathname)
  if (!current) return [{ labelKey: 'common.brandName', path: '/' }]

  const crumbs: { labelKey: string; path: string }[] = []

  let cfg: RouteConfig | undefined = current
  while (cfg) {
    crumbs.unshift({ labelKey: cfg.labelKey, path: cfg.parent ? pathname : pathname })
    if (cfg.parent) {
      cfg = ROUTE_CONFIG.find((r) => r.path === cfg!.parent)
      if (cfg) crumbs[0].path = pathname
      crumbs.unshift({ labelKey: cfg?.labelKey ?? '', path: cfg?.path ?? '' })
      break
    } else {
      break
    }
  }

  return crumbs
}

export function getPageTitleKey(pathname: string): string {
  return matchRoute(pathname)?.labelKey ?? 'common.brandName'
}
