export interface RegisterDTO {
  id?: number;
  registerName: string;
  department: string;
  machineName: string;
  brand: string;
  model: string;
  price: number;
  quantity: number;
  watt: number;
  housePower: number;
  managerId: string;
  note?: string;
  externalCalibrationDate?: string; 
  attachment?: string;
}

export interface AuditMemberDTO {
  id: number;
  name: string;
  email?: string;
}

export interface RegisterResponseDTO {
  id: number;
  registerName: string;
  department: string;
  machineName: string;
  brand: string;
  model: string;
  price: number;
  quantity: number;
  watt: number;
  housePower: number;
  managerId: string;
  note?: string;
  externalCalibrationDate?: string;
  attachment?: string;
  createdBy?: AuditMemberDTO;
  updatedBy?: AuditMemberDTO;
  createdAt?: string;
  updatedAt?: string;
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