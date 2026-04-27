export interface MachineDTO {
  id?: number;
  calibration: boolean;
  checkStatus: string;
  dateCancel?: string; 
  department: string;
  machineGroupId: string;
  image?: string;
  machineCode: string;
  machineModel: string;
  machineName: string;
  machineNumber: string;
  machineStatus: string;
  machineTypeId: string;
  maintenanceFrequency: string;
  managerId: string;
  qrCode?: string;
  resetPeriod: string;
  responsiblePersonId: string;
  serialNumber: string;
  supervisorId: string;
  workInstruction?: string;
}

export interface MachineResponseDTO extends MachineDTO {
  createdBy?: AuditMemberDTO;
  updatedBy?: AuditMemberDTO;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditMemberDTO {
  id: number;
  name: string;
  email?: string;
  departmentId?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export enum MachineStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum CheckStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenanceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum ResetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}