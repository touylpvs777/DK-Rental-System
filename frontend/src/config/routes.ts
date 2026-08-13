export interface RouteConfig {
  path: string
  labelKey: string
  parent?: string
}

export const ROUTE_CONFIG: RouteConfig[] = [
  { path: '/dashboard',             labelKey: 'routes.dashboard' },
  { path: '/customers',             labelKey: 'routes.customers' },
  { path: '/customers/:id',         labelKey: 'routes.customerDetail', parent: '/customers' },
  { path: '/activity',              labelKey: 'routes.activity' },
  { path: '/reports',               labelKey: 'routes.reports' },
  { path: '/settings',              labelKey: 'routes.settings' },
  { path: '/brands',                labelKey: 'routes.brands' },
  { path: '/equipment',             labelKey: 'routes.equipmentRegistry' },
  { path: '/equipment/:id',         labelKey: 'routes.equipmentDetail',  parent: '/equipment' },
  { path: '/quotations',            labelKey: 'routes.quotations' },
  { path: '/quotations/new',        labelKey: 'routes.newQuotation',     parent: '/quotations' },
  { path: '/quotations/:id/edit',   labelKey: 'routes.editQuotation',    parent: '/quotations' },
  { path: '/quotations/:id',        labelKey: 'routes.quotationDetail',  parent: '/quotations' },
  { path: '/rental-contracts',      labelKey: 'routes.rentalContracts' },
  { path: '/rental-contracts/new',  labelKey: 'routes.newContract',      parent: '/rental-contracts' },
  { path: '/rental-contracts/:id',  labelKey: 'routes.contractDetail',   parent: '/rental-contracts' },
  { path: '/delivery-orders',       labelKey: 'routes.deliveryOrders' },
  { path: '/delivery-orders/new',   labelKey: 'routes.newDeliveryOrder', parent: '/delivery-orders' },
  { path: '/delivery-orders/:id/edit', labelKey: 'routes.editDeliveryOrder', parent: '/delivery-orders' },
  { path: '/delivery-orders/:id',   labelKey: 'routes.deliveryOrderDetail', parent: '/delivery-orders' },
  { path: '/movements',             labelKey: 'routes.movementControl' },
  { path: '/movements/new',         labelKey: 'routes.newMovement',      parent: '/movements' },
  { path: '/movements/:id',         labelKey: 'routes.movementDetail',   parent: '/movements' },
  { path: '/billing',                          labelKey: 'routes.billing' },
  { path: '/billing/invoices',                 labelKey: 'routes.invoices',             parent: '/billing' },
  { path: '/billing/invoices/:id',             labelKey: 'routes.invoiceDetail',        parent: '/billing/invoices' },
  { path: '/billing/payments',                 labelKey: 'routes.payments',             parent: '/billing' },
  { path: '/billing/payments/:id',             labelKey: 'routes.paymentDetail',        parent: '/billing/payments' },
  { path: '/billing/receipts',                 labelKey: 'routes.receipts',             parent: '/billing' },
  { path: '/billing/deposits',                 labelKey: 'routes.deposits',             parent: '/billing' },
  { path: '/billing/deposits/:id',             labelKey: 'routes.depositDetail',        parent: '/billing/deposits' },
  { path: '/billing/revenue-recognitions',     labelKey: 'routes.revenueRecognition',   parent: '/billing' },
  { path: '/maintenance',                   labelKey: 'routes.maintenancePm' },
  { path: '/maintenance/work-orders',       labelKey: 'routes.workOrders',        parent: '/maintenance' },
  { path: '/maintenance/work-orders/new',   labelKey: 'routes.newWorkOrder',      parent: '/maintenance/work-orders' },
  { path: '/maintenance/work-orders/:id',   labelKey: 'routes.workOrderDetail',   parent: '/maintenance/work-orders' },
  { path: '/maintenance/schedules',         labelKey: 'routes.pmSchedules',       parent: '/maintenance' },
  { path: '/shift-handovers',               labelKey: 'routes.shiftHandovers' },
  { path: '/shift-handovers/new',           labelKey: 'routes.newShiftHandover',  parent: '/shift-handovers' },
  { path: '/shift-handovers/:id',           labelKey: 'routes.shiftHandoverDetail', parent: '/shift-handovers' },
  { path: '/iot-management',               labelKey: 'routes.iotManagement' },
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
