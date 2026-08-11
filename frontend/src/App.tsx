import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '@/components/layout/PrivateRoute'
import AppLayout from '@/components/layout/AppLayout'
import ToastContainer from '@/components/ui/Toast'
import { Loader2 } from 'lucide-react'

const LoginPage = lazy(() => import('@/pages/Login/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const CustomersPage = lazy(() => import('@/pages/Customers/CustomersPage'))
const Customer360Page = lazy(() => import('@/pages/Customers/Customer360Page'))
const LeadsPage = lazy(() => import('@/pages/Leads/LeadsPage'))
const ActivityPage = lazy(() => import('@/pages/Activity/ActivityPage'))
const ReportsPage = lazy(() => import('@/pages/Reports/ReportsPage'))
const CatalogPage = lazy(() => import('@/pages/Catalog/CatalogPage'))
const ProductDetailPage = lazy(() => import('@/pages/Catalog/ProductDetailPage'))
const BrandsPage = lazy(() => import('@/pages/Catalog/BrandsPage'))
const CategoriesPage = lazy(() => import('@/pages/Catalog/CategoriesPage'))
const ImportPage = lazy(() => import('@/pages/Catalog/ImportPage'))
const EquipmentRegistryPage = lazy(() => import('@/pages/Equipment/EquipmentRegistryPage'))
const ForkliftDetailPage = lazy(() => import('@/pages/Equipment/ForkliftDetailPage'))
const QuotationListPage = lazy(() => import('@/pages/Quotations/QuotationListPage'))
const QuotationEditorPage = lazy(() => import('@/pages/Quotations/QuotationEditorPage'))
const SalesOrderListPage = lazy(() => import('@/pages/Sales/SalesOrderListPage'))
const SalesOrderEditorPage = lazy(() => import('@/pages/Sales/SalesOrderEditorPage'))
const RentalContractListPage = lazy(() => import('@/pages/Rental/RentalContractListPage'))
const RentalContractEditorPage = lazy(() => import('@/pages/Rental/RentalContractEditorPage'))
const MovementListPage = lazy(() => import('@/pages/Movement/MovementListPage'))
const MovementDetailPage = lazy(() => import('@/pages/Movement/MovementDetailPage'))
const MovementForm = lazy(() => import('@/pages/Movement/MovementForm'))
const MaintenanceDashboardPage = lazy(() => import('@/pages/Maintenance/MaintenanceDashboardPage'))
const WorkOrderListPage = lazy(() => import('@/pages/Maintenance/WorkOrderListPage'))
const WorkOrderEditorPage = lazy(() => import('@/pages/Maintenance/WorkOrderEditorPage'))
const MaintenanceSchedulePage = lazy(() => import('@/pages/Maintenance/MaintenanceSchedulePage'))
const BillingDashboardPage = lazy(() => import('@/pages/Billing/BillingDashboardPage'))
const InvoiceListPage = lazy(() => import('@/pages/Billing/InvoiceListPage'))
const InvoiceEditorPage = lazy(() => import('@/pages/Billing/InvoiceEditorPage'))
const PaymentListPage = lazy(() => import('@/pages/Billing/PaymentListPage'))
const PaymentDetailPage = lazy(() => import('@/pages/Billing/PaymentDetailPage'))
const ReceiptListPage = lazy(() => import('@/pages/Billing/ReceiptListPage'))
const ReceiptEditorPage = lazy(() => import('@/pages/Billing/ReceiptEditorPage'))
const TaxInvoiceListPage = lazy(() => import('@/pages/Billing/TaxInvoiceListPage'))
const CreditNoteListPage = lazy(() => import('@/pages/Billing/CreditNoteListPage'))
const PaymentVoucherListPage = lazy(() => import('@/pages/Billing/PaymentVoucherListPage'))
const DepositListPage = lazy(() => import('@/pages/Billing/DepositListPage'))
const DepositDetailPage = lazy(() => import('@/pages/Billing/DepositDetailPage'))
const RevenueRecognitionPage = lazy(() => import('@/pages/Billing/RevenueRecognitionPage'))
const FinanceDashboardPage = lazy(() => import('@/pages/Billing/FinanceDashboardPage'))
const PaymentPage = lazy(() => import('@/pages/Billing/PaymentPage'))
const DepositPage = lazy(() => import('@/pages/Billing/DepositPage'))
const StatementPage = lazy(() => import('@/pages/Billing/StatementPage'))
const InventoryDashboardPage = lazy(() => import('@/pages/Inventory/InventoryDashboardPage'))
const SparePartListPage = lazy(() => import('@/pages/Inventory/SparePartListPage'))
const SparePartDetailPage = lazy(() => import('@/pages/Inventory/SparePartDetailPage'))
const PartsPOSPage = lazy(() => import('@/pages/Inventory/PartsPOSPage'))
const WarehousePage = lazy(() => import('@/pages/Inventory/WarehousePage'))
const WarehouseDetailPage = lazy(() => import('@/pages/Inventory/WarehouseDetailPage'))
const PurchaseOrderPage = lazy(() => import('@/pages/Inventory/PurchaseOrderPage'))
const PurchaseOrderEditorPage = lazy(() => import('@/pages/Inventory/PurchaseOrderEditorPage'))
const DeliveryNoteListPage = lazy(() => import('@/pages/Inventory/DeliveryNoteListPage'))
const DeliveryNoteEditorPage = lazy(() => import('@/pages/Inventory/DeliveryNoteEditorPage'))
const GoodsReceiveListPage = lazy(() => import('@/pages/Inventory/GoodsReceiveListPage'))
const GoodsIssueListPage = lazy(() => import('@/pages/Inventory/GoodsIssueListPage'))
const ExecutiveDashboardPage = lazy(() => import('@/pages/Executive/ExecutiveDashboardPage'))
const IoTManagementPage = lazy(() => import('@/pages/IoT/IoTManagementPage'))
const ProjectListPage = lazy(() => import('@/pages/Projects/ProjectListPage'))
const ProjectDetailPage = lazy(() => import('@/pages/Projects/ProjectDetailPage'))
const SettingsPage = lazy(() => import('@/pages/Settings/Settings'))
const ChangePasswordPage = lazy(() => import('@/pages/Settings/ChangePasswordPage'))
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'))
const RentalMvpDashboard = lazy(() => import('@/pages/RentalMvp/RentalDashboard'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <Loader2 size={24} className="spin" style={{ color: 'var(--color-text-muted)' }} />
    </div>
  )
}

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 32, color: 'var(--color-text-muted)', fontSize: 15 }}>
    <strong>{name}</strong> — coming soon.
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="/customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
            <Route path="/customers/:id" element={<Suspense fallback={<PageLoader />}><Customer360Page /></Suspense>} />
            <Route path="/leads"    element={<Suspense fallback={<PageLoader />}><LeadsPage /></Suspense>} />
            <Route path="/activity" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="/activities" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="/reports"  element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
            <Route path="/change-password" element={<Suspense fallback={<PageLoader />}><ChangePasswordPage /></Suspense>} />

            <Route path="/catalog"                element={<Suspense fallback={<PageLoader />}><CatalogPage /></Suspense>} />
            <Route path="/catalog/products/:id"   element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
            <Route path="/catalog/brands"          element={<Suspense fallback={<PageLoader />}><BrandsPage /></Suspense>} />
            <Route path="/catalog/categories"      element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
            <Route path="/catalog/import"          element={<Suspense fallback={<PageLoader />}><ImportPage /></Suspense>} />

            <Route path="/equipment"              element={<Suspense fallback={<PageLoader />}><EquipmentRegistryPage /></Suspense>} />
            <Route path="/equipment/:id"          element={<Suspense fallback={<PageLoader />}><ForkliftDetailPage /></Suspense>} />

            <Route path="/quotations"             element={<Suspense fallback={<PageLoader />}><QuotationListPage /></Suspense>} />
            <Route path="/quotations/new"         element={<Suspense fallback={<PageLoader />}><QuotationEditorPage /></Suspense>} />
            <Route path="/quotations/:id"         element={<Suspense fallback={<PageLoader />}><QuotationEditorPage /></Suspense>} />

            <Route path="/sales-orders"           element={<Suspense fallback={<PageLoader />}><SalesOrderListPage /></Suspense>} />
            <Route path="/sales-orders/new"       element={<Suspense fallback={<PageLoader />}><SalesOrderEditorPage /></Suspense>} />
            <Route path="/sales-orders/:id"       element={<Suspense fallback={<PageLoader />}><SalesOrderEditorPage /></Suspense>} />

            <Route path="/rental-contracts"       element={<Suspense fallback={<PageLoader />}><RentalContractListPage /></Suspense>} />
            <Route path="/rental-contracts/new"   element={<Suspense fallback={<PageLoader />}><RentalContractEditorPage /></Suspense>} />
            <Route path="/rental-contracts/:id"   element={<Suspense fallback={<PageLoader />}><RentalContractEditorPage /></Suspense>} />
            <Route path="/rental-mvp"             element={<Suspense fallback={<PageLoader />}><RentalMvpDashboard /></Suspense>} />

            <Route path="/movements"              element={<Suspense fallback={<PageLoader />}><MovementListPage /></Suspense>} />
            <Route path="/movements/new"          element={<Suspense fallback={<PageLoader />}><MovementForm /></Suspense>} />
            <Route path="/movements/:id"          element={<Suspense fallback={<PageLoader />}><MovementDetailPage /></Suspense>} />

            <Route path="/billing"                         element={<Suspense fallback={<PageLoader />}><BillingDashboardPage /></Suspense>} />
            <Route path="/billing/invoices"                element={<Suspense fallback={<PageLoader />}><InvoiceListPage /></Suspense>} />
            <Route path="/billing/invoices/new"            element={<Suspense fallback={<PageLoader />}><InvoiceEditorPage /></Suspense>} />
            <Route path="/billing/invoices/:id"            element={<Suspense fallback={<PageLoader />}><InvoiceEditorPage /></Suspense>} />
            <Route path="/billing/tax-invoices"            element={<Suspense fallback={<PageLoader />}><TaxInvoiceListPage /></Suspense>} />
            <Route path="/billing/credit-notes"            element={<Suspense fallback={<PageLoader />}><CreditNoteListPage /></Suspense>} />
            <Route path="/billing/payments"                element={<Suspense fallback={<PageLoader />}><PaymentListPage /></Suspense>} />
            <Route path="/billing/payments/:id"            element={<Suspense fallback={<PageLoader />}><PaymentDetailPage /></Suspense>} />
            <Route path="/billing/payment-vouchers"        element={<Suspense fallback={<PageLoader />}><PaymentVoucherListPage /></Suspense>} />
            <Route path="/billing/receipts"                element={<Suspense fallback={<PageLoader />}><ReceiptListPage /></Suspense>} />
            <Route path="/billing/receipts/new"            element={<Suspense fallback={<PageLoader />}><ReceiptEditorPage /></Suspense>} />
            <Route path="/billing/receipts/:id"            element={<Suspense fallback={<PageLoader />}><ReceiptEditorPage /></Suspense>} />
            <Route path="/billing/deposits"                element={<Suspense fallback={<PageLoader />}><DepositListPage /></Suspense>} />
            <Route path="/billing/deposits/:id"            element={<Suspense fallback={<PageLoader />}><DepositDetailPage /></Suspense>} />
            <Route path="/billing/revenue-recognitions"    element={<Suspense fallback={<PageLoader />}><RevenueRecognitionPage /></Suspense>} />
            <Route path="/billing/finance"                 element={<Suspense fallback={<PageLoader />}><FinanceDashboardPage /></Suspense>} />
            <Route path="/billing/payments-unified"        element={<Suspense fallback={<PageLoader />}><PaymentPage /></Suspense>} />
            <Route path="/billing/deposits-unified"        element={<Suspense fallback={<PageLoader />}><DepositPage /></Suspense>} />
            <Route path="/billing/statements"              element={<Suspense fallback={<PageLoader />}><StatementPage /></Suspense>} />

            <Route path="/maintenance"                    element={<Suspense fallback={<PageLoader />}><MaintenanceDashboardPage /></Suspense>} />
            <Route path="/maintenance/work-orders"        element={<Suspense fallback={<PageLoader />}><WorkOrderListPage /></Suspense>} />
            <Route path="/maintenance/work-orders/new"    element={<Suspense fallback={<PageLoader />}><WorkOrderEditorPage /></Suspense>} />
            <Route path="/maintenance/work-orders/:id"    element={<Suspense fallback={<PageLoader />}><WorkOrderEditorPage /></Suspense>} />
            <Route path="/maintenance/schedules"          element={<Suspense fallback={<PageLoader />}><MaintenanceSchedulePage /></Suspense>} />

            <Route path="/inventory"                      element={<Suspense fallback={<PageLoader />}><InventoryDashboardPage /></Suspense>} />
            <Route path="/inventory/parts"                element={<Suspense fallback={<PageLoader />}><SparePartListPage /></Suspense>} />
            <Route path="/inventory/pos"                  element={<Suspense fallback={<PageLoader />}><PartsPOSPage /></Suspense>} />
            <Route path="/inventory/parts/new"            element={<Placeholder name="New Spare Part" />} />
            <Route path="/inventory/parts/:id"            element={<Suspense fallback={<PageLoader />}><SparePartDetailPage /></Suspense>} />
            <Route path="/inventory/warehouses"           element={<Suspense fallback={<PageLoader />}><WarehousePage /></Suspense>} />
            <Route path="/inventory/warehouses/:id"        element={<Suspense fallback={<PageLoader />}><WarehouseDetailPage /></Suspense>} />
            <Route path="/inventory/purchase-orders"      element={<Suspense fallback={<PageLoader />}><PurchaseOrderPage /></Suspense>} />
            <Route path="/inventory/purchase-orders/new"  element={<Suspense fallback={<PageLoader />}><PurchaseOrderEditorPage /></Suspense>} />
            <Route path="/inventory/purchase-orders/:id"  element={<Suspense fallback={<PageLoader />}><PurchaseOrderEditorPage /></Suspense>} />
            <Route path="/inventory/goods-receive"        element={<Suspense fallback={<PageLoader />}><GoodsReceiveListPage /></Suspense>} />
            <Route path="/inventory/goods-issue"          element={<Suspense fallback={<PageLoader />}><GoodsIssueListPage /></Suspense>} />
            <Route path="/inventory/delivery-notes"       element={<Suspense fallback={<PageLoader />}><DeliveryNoteListPage /></Suspense>} />
            <Route path="/inventory/delivery-notes/new"   element={<Suspense fallback={<PageLoader />}><DeliveryNoteEditorPage /></Suspense>} />
            <Route path="/inventory/delivery-notes/:id"   element={<Suspense fallback={<PageLoader />}><DeliveryNoteEditorPage /></Suspense>} />

            <Route path="/executive"                     element={<Suspense fallback={<PageLoader />}><ExecutiveDashboardPage /></Suspense>} />
            <Route path="/iot-management"                element={<Suspense fallback={<PageLoader />}><IoTManagementPage /></Suspense>} />

            <Route path="/projects"               element={<Suspense fallback={<PageLoader />}><ProjectListPage /></Suspense>} />
            <Route path="/projects/:id"           element={<Suspense fallback={<PageLoader />}><ProjectDetailPage /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  )
}
