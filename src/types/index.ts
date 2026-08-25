export type UserRole = "admin" | "merchant" | "beneficiary" | "volunteer" | "donor";

export interface UserModel {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  isApproved: boolean;
  isActive: boolean;
  city?: string;
  residence?: string;
  familyCount?: number;
  activeCardId?: string;
  nationalId?: string;
  nationality?: string;
  socialStatus?: string;
  fieldResearchStatus?: string;
  storeName?: string;
  commercialReg?: string;
  totalDisbursed?: number;
  totalTransactions?: number;
  allocatedBudget?: number;
  currentRemainingBudget?: number;
  lastAllocationDate?: any;
  instapayAddress?: string;
  vodafoneCashNumber?: string;
  liquidityAlertLevel?: "normal" | "warning" | "critical";
  inKindNeeds?: string;
  medicalNotes?: string;
  createdAt?: any;
}

export type AidCardStatus = "active" | "frozen" | "depleted" | "expired" | "pending_activation";

export interface AidCardModel {
  cardId: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  nationalId?: string;
  phone?: string;
  balance?: number;
  familyCount?: number;
  residence?: string;
  totalBalance?: number;
  foodBasketsQuota?: number;
  totalBasketsDelivered?: number;
  status?: AidCardStatus;
  socialStatus?: string;
  nationality?: string;
  fieldResearchStatus?: string;
  issuedByVolunteerId?: string;
  activatedAt?: string;
  expiresAt?: string;
  securityHash?: string;
  lastCashRedemptionDate?: any;
  lastBasketDistributionDate?: any;
  isActive?: boolean;
}

export interface RedemptionTransaction {
  id: string;
  transactionId?: string;
  cardId: string;
  beneficiaryName: string;
  beneficiaryId?: string;
  beneficiaryNationalId?: string;
  merchantId: string;
  merchantStoreName: string;
  merchantName?: string;
  amountDeducted?: number;
  amount?: number;
  foodBasketsDeducted?: number;
  remainingBalance?: number;
  remainingBaskets?: number;
  city?: string;
  timestamp: any;
  createdAt?: string;
  notes?: string;
}

export interface BasketDistribution {
  distributionId: string;
  cardId: string;
  beneficiaryId?: string;
  beneficiaryName?: string;
  familyCount?: number;
  residence?: string;
  basketsCount?: number;
  remainingBasketsAfter?: number;
  distributedBy?: {
    adminId: string;
    adminName: string;
  };
  distributionCenter?: string;
  timestamp?: any;
  createdAt?: string;
  notes?: string;
}

export interface BudgetAllocation {
  id?: string;
  allocationId?: string;
  merchantId?: string;
  merchantName?: string;
  merchantStoreName?: string;
  amount?: number;
  type?: "initial" | "recharge" | "adjustment";
  allocatedBy?: {
    adminId: string;
    adminName: string;
  };
  allocatedByAdminId?: string;
  allocatedByAdminEmail?: string;
  notes?: string | null;
  timestamp?: any;
}

export interface PaymentReceipt {
  id?: string;
  receiptId?: string;
  merchantId?: string;
  merchantName?: string;
  merchantStoreName?: string;
  amount?: number;
  paymentMethod?: "instapay" | "vodafone_cash" | "bank_transfer" | "cash";
  referenceNumber?: string;
  senderAccount?: string | null;
  receiverAccount?: string | null;
  senderAccountOrPhone?: string | null;
  receiverAccountOrPhone?: string | null;
  receiptImageUrl?: string | null;
  status?: "sent" | "confirmed_by_merchant" | "confirmed" | "disputed" | "pending_merchant_confirmation" | string;
  isConfirmed?: boolean;
  confirmedAt?: any;
  sentBy?: {
    adminId: string;
    adminName: string;
  };
  sentByAdminId?: string;
  sentByAdminEmail?: string;
  notes?: string | null;
  timestamp?: any;
  createdAt?: string;
}

export interface ExtraDisbursementRequest {
  id: string;
  requestId?: string;
  merchantId: string;
  merchantName?: string;
  merchantStoreName: string;
  cardId: string;
  beneficiaryId?: string;
  beneficiaryName: string;
  beneficiaryNationalId?: string;
  requestedAmount: number;
  requestedBaskets?: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: {
    adminId: string;
    adminName: string;
  };
  reviewedAt?: any;
  rejectionReason?: string;
  resultingTransactionId?: string;
  timestamp: any;
  createdAt?: string;
}

export interface MonthlyAuditReport {
  id: string;
  reportId: string;
  month: number;
  year: number;
  monthNameAr: string;
  monthNameEn: string;
  totalFundsAllocated: number;
  totalFundsDisbursed: number;
  totalRemainingLiquidity: number;
  totalBasketsDistributed: number;
  totalBeneficiariesServed: number;
  totalBeneficiariesCount: number;
  beneficiaryCoverageRate: number;
  merchantsSummary: Array<{
    merchantId: string;
    merchantStoreName: string;
    allocated: number;
    disbursed: number;
    remaining: number;
    transactionsCount: number;
  }>;
  generatedBy: {
    adminId: string;
    adminName: string;
  };
  timestamp: any;
  createdAt?: string;
}

export interface GlobalStats {
  totalFundsDisbursed: number;
  totalBeneficiariesCount: number;
  activeMerchantsCount: number;
  totalRedemptionsCount: number;
  totalBasketsDelivered?: number;
  totalAllocatedBudget?: number;
}
