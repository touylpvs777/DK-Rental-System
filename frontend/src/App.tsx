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
const ActivityPage = lazy(() => import('@/pages/Activity/ActivityPage'))
const ReportsPage = lazy(() => import('@/pages/Reports/ReportsPage'))
const BrandsPage = lazy(() => import('@/pages/Catalog/BrandsPage'))
const EquipmentRegistryPage = lazy(() => import('@/pages/Equipment/EquipmentRegistryPage'))
const ForkliftDetailPage = lazy(() => import('@/pages/Equipment/ForkliftDetailPage'))
const RentalContractListPage = lazy(() => import('@/pages/Rental/RentalContractListPage'))
const RentalContractEditorPage = lazy(() => import('@/pages/Rental/RentalContractEditorPage'))
const MovementListPage = lazy(() => import('@/pages/Movement/MovementListPage'))
const MovementDetailPage = lazy(() => import('@/pages/Movement/MovementDetailPage'))
const MovementForm = lazy(() => import('@/pages/Movement/MovementForm'))
const MaintenanceDashboardPage = lazy(() => import('@/pages/Maintenance/MaintenanceDashboardPage'))
const WorkOrderListPage = lazy(() => import('@/pages/Maintenance/WorkOrderListPage'))
const WorkOrderEditorPage = lazy(() => import('@/pages/Maintenance/WorkOrderEditorPage'))
const MaintenanceSchedulePage = lazy(() => import('@/pages/Maintenance/MaintenanceSchedulePage'))
const ShiftHandoverPage = lazy(() => import('@/pages/ShiftHandover/ShiftHandoverPage'))
const ShiftHandoverForm = lazy(() => import('@/pages/ShiftHandover/ShiftHandoverForm'))
const BillingDashboardPage = lazy(() => import('@/pages/Billing/BillingDashboardPage'))
const InvoiceListPage = lazy(() => import('@/pages/Billing/InvoiceListPage'))
const InvoiceEditorPage = lazy(() => import('@/pages/Billing/InvoiceEditorPage'))
const PaymentListPage = lazy(() => import('@/pages/Billing/PaymentListPage'))
const PaymentDetailPage = lazy(() => import('@/pages/Billing/PaymentDetailPage'))
const ReceiptListPage = lazy(() => import('@/pages/Billing/ReceiptListPage'))
const ReceiptEditorPage = lazy(() => import('@/pages/Billing/ReceiptEditorPage'))
const DepositListPage = lazy(() => import('@/pages/Billing/DepositListPage'))
const DepositDetailPage = lazy(() => import('@/pages/Billing/DepositDetailPage'))
const RevenueRecognitionPage = lazy(() => import('@/pages/Billing/RevenueRecognitionPage'))
const IoTManagementPage = lazy(() => import('@/pages/IoT/IoTManagementPage'))
const SettingsPage = lazy(() => import('@/pages/Settings/Settings'))
const ChangePasswordPage = lazy(() => import('@/pages/Settings/ChangePasswordPage'))
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <Loader2 size={24} className="spin" style={{ color: 'var(--color-text-muted)' }} />
    </div>
  )
}

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
            <Route path="/activity" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="/activities" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="/reports"  element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
            <Route path="/change-password" element={<Suspense fallback={<PageLoader />}><ChangePasswordPage /></Suspense>} />

            <Route path="/brands" element={<Suspense fallback={<PageLoader />}><BrandsPage /></Suspense>} />

            <Route path="/equipment"              element={<Suspense fallback={<PageLoader />}><EquipmentRegistryPage /></Suspense>} />
            <Route path="/equipment/:id"          element={<Suspense fallback={<PageLoader />}><ForkliftDetailPage /></Suspense>} />

            <Route path="/rental-contracts"       element={<Suspense fallback={<PageLoader />}><RentalContractListPage /></Suspense>} />
            <Route path="/rental-contracts/new"   element={<Suspense fallback={<PageLoader />}><RentalContractEditorPage /></Suspense>} />
            <Route path="/rental-contracts/:id"   element={<Suspense fallback={<PageLoader />}><RentalContractEditorPage /></Suspense>} />

            <Route path="/movements"              element={<Suspense fallback={<PageLoader />}><MovementListPage /></Suspense>} />
            <Route path="/movements/new"          element={<Suspense fallback={<PageLoader />}><MovementForm /></Suspense>} />
            <Route path="/movements/:id"          element={<Suspense fallback={<PageLoader />}><MovementDetailPage /></Suspense>} />

            <Route path="/billing"                         element={<Suspense fallback={<PageLoader />}><BillingDashboardPage /></Suspense>} />
            <Route path="/billing/invoices"                element={<Suspense fallback={<PageLoader />}><InvoiceListPage /></Suspense>} />
            <Route path="/billing/invoices/new"            element={<Suspense fallback={<PageLoader />}><InvoiceEditorPage /></Suspense>} />
            <Route path="/billing/invoices/:id"            element={<Suspense fallback={<PageLoader />}><InvoiceEditorPage /></Suspense>} />
            <Route path="/billing/payments"                element={<Suspense fallback={<PageLoader />}><PaymentListPage /></Suspense>} />
            <Route path="/billing/payments/:id"            element={<Suspense fallback={<PageLoader />}><PaymentDetailPage /></Suspense>} />
            <Route path="/billing/receipts"                element={<Suspense fallback={<PageLoader />}><ReceiptListPage /></Suspense>} />
            <Route path="/billing/receipts/new"            element={<Suspense fallback={<PageLoader />}><ReceiptEditorPage /></Suspense>} />
            <Route path="/billing/receipts/:id"            element={<Suspense fallback={<PageLoader />}><ReceiptEditorPage /></Suspense>} />
            <Route path="/billing/deposits"                element={<Suspense fallback={<PageLoader />}><DepositListPage /></Suspense>} />
            <Route path="/billing/deposits/:id"            element={<Suspense fallback={<PageLoader />}><DepositDetailPage /></Suspense>} />
            <Route path="/billing/revenue-recognitions"    element={<Suspense fallback={<PageLoader />}><RevenueRecognitionPage /></Suspense>} />

            <Route path="/maintenance"                    element={<Suspense fallback={<PageLoader />}><MaintenanceDashboardPage /></Suspense>} />
            <Route path="/maintenance/work-orders"        element={<Suspense fallback={<PageLoader />}><WorkOrderListPage /></Suspense>} />
            <Route path="/maintenance/work-orders/new"    element={<Suspense fallback={<PageLoader />}><WorkOrderEditorPage /></Suspense>} />
            <Route path="/maintenance/work-orders/:id"    element={<Suspense fallback={<PageLoader />}><WorkOrderEditorPage /></Suspense>} />
            <Route path="/maintenance/schedules"          element={<Suspense fallback={<PageLoader />}><MaintenanceSchedulePage /></Suspense>} />

            <Route path="/shift-handovers"                element={<Suspense fallback={<PageLoader />}><ShiftHandoverPage /></Suspense>} />
            <Route path="/shift-handovers/new"            element={<Suspense fallback={<PageLoader />}><ShiftHandoverForm /></Suspense>} />
            <Route path="/shift-handovers/:id"            element={<Suspense fallback={<PageLoader />}><ShiftHandoverForm /></Suspense>} />

            <Route path="/iot-management"                element={<Suspense fallback={<PageLoader />}><IoTManagementPage /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  )
}
