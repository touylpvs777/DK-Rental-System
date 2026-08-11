// DK Rental — Executive MVP demo types (mock-data driven, standalone from the
// production rental/forklift/maintenance domain models in types/rental.ts etc.)

export type ForkliftAssetStatus = 'Available' | 'Booked' | 'On Rent' | 'In Maintenance' | 'Out of Service'

export type EngineType = 'Diesel' | 'Electric' | 'LPG' | 'Dual Fuel'

export interface ForkliftAsset {
  id: string
  assetCode: string
  brand: string
  model: string
  serialNumber: string
  tonnageCapacityKg: number
  mastHeightMm: number
  engineType: EngineType
  status: ForkliftAssetStatus
  conditionRating: 1 | 2 | 3 | 4 | 5
  currentRunningHours: number
  lastPmHours: number
  pmIntervalHours: number
  location: string
  purchaseDate: string
  dailyRateLak: number
  monthlyRateLak: number
  primaryPhotoUrl?: string
  notes?: string
}

export type CustomerType = 'Corporate' | 'SME' | 'Individual' | 'Government'

export interface Customer {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  email?: string
  address: string
  province: string
  customerType: CustomerType
  creditTermsDays: number
}

export type RentalContractStatus = 'Booked' | 'On Rent' | 'Expiring Soon' | 'Overdue' | 'Returned' | 'Cancelled'

export type BillingCycle = 'Daily' | 'Weekly' | 'Monthly'

export interface RentalContract {
  id: string
  contractNumber: string
  customerId: string
  forkliftAssetId: string
  status: RentalContractStatus
  startDate: string
  endDate: string
  billingCycle: BillingCycle
  monthlyRateLak: number
  depositLak: number
  deliveryAddress: string
  assignedSalesRep: string
  assignedTechnician?: string
  pdiCompleted: boolean
  pdiPhotoUrls?: string[]
  createdAt: string
}

export type MaintenanceJobType = 'PDI' | 'Preventive Maintenance' | 'Return Inspection' | 'Corrective Repair'

export type MaintenanceJobStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue'

export interface MaintenanceChecklistItem {
  item: string
  passed: boolean | null
}

export interface MaintenanceJob {
  id: string
  jobNumber: string
  forkliftAssetId: string
  relatedContractId?: string
  jobType: MaintenanceJobType
  status: MaintenanceJobStatus
  triggerReason: string
  scheduledDate: string
  completedDate?: string
  assignedTechnician: string
  checklist: MaintenanceChecklistItem[]
  damageNotes?: string
  estimatedCostLak?: number
}
