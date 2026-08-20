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
  createdAt?: any;
}

export type AidCardStatus = "active" | "frozen" | "depleted" | "expired" | "pending_activation";

export interface AidCardModel {
  cardId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  nationalId: string;
  familyCount: number;
  residence?: string;
  totalBalance: number;
  foodBasketsQuota: number;
  totalBasketsDelivered?: number;
  status: AidCardStatus;
  socialStatus?: string;
  nationality?: string;
  fieldResearchStatus?: string;
  issuedByVolunteerId?: string;
  activatedAt?: string;
  expiresAt: string;
  securityHash: string;
  lastCashRedemptionDate?: any;
  lastBasketDistributionDate?: any;
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
  amountDeducted: number;
  foodBasketsDeducted?: number;
  city?: string;
  timestamp: any;
  createdAt?: string;
  notes?: string;
}

export interface BasketDistribution {
  distributionId: string;
  cardId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  familyCount?: number;
  residence?: string;
  basketsCount: number;
  remainingBasketsAfter: number;
  distributedBy: {
    adminId: string;
    adminName: string;
  };
  distributionCenter: string;
  timestamp: any;
  createdAt?: string;
  notes?: string;
}

export interface GlobalStats {
  totalFundsDisbursed: number;
  totalBeneficiariesCount: number;
  activeMerchantsCount: number;
  totalRedemptionsCount: number;
  totalBasketsDelivered?: number;
}
