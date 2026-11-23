export type Role = 'wfc_admin' | 'fundraising_consultant' | 'org_admin' | 'org_staff';

export interface Principal {
  userId: string;
  role: Role;
  organizationId: string | null;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  address: string;
  admin: string;
  createdBy: string;
}

export interface ConsultantContact {
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface OrganizationDetail extends OrganizationListItem {
  consultant: ConsultantContact | null;
}
