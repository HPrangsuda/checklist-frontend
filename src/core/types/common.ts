export interface ResponseDTO<T> {
    success: boolean;
    message: string;
    error: string;
    code: string;
    data: T;
}
export interface PageResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  index: number;
  success: boolean;
  message: string;
  code: string;
}
export interface MemberListDTO {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    avatarKey: string;
}
export interface ListResponse<T> {
    data: T[]
    hasMore: boolean,
    success: boolean;
    message: string;
    code: string;
}
export interface ListItemDTO<T> {
    data: T[]
    hasMore: boolean,
    success: boolean;
    message: string;
    code: string;
}
export interface SessionDTO {
    memberId: number;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    language: string;
    gender: string;
    avatarKey: string | null;
    role: RoleDTO;
    departments: DepartmentDTO[];
    permissions: PermissionDTO[];
    accessToken: string;
    refreshToken: string;
}
export interface LarkResponseDTO {
    success: boolean;
    message: string;
    code: string;
    data: {
        url: string;
        code: string;
    }
}
export interface RoleDTO {
    id: number
    name: string
    roleType: RoleType
    description: boolean
}
export interface PermissionDTO {
    id: number;
    module: string;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSync: boolean;
    canImport: boolean;
    canExport: boolean;
    exclude: String[]
}
export interface DepartmentDTO {
    department: any;
    division: string;
    departmentName: any;
    departmentCode: any;
    id: number;
    name: string;
    budget: string;
    isPrimary: boolean;
    parentDepartmentId: number;
}
export enum RoleType {
    ADMINISTRATOR = "ADMINISTRATOR",
    MANAGEMENT = "MANAGEMENT",
    BUMANAGER = "BUMANAGER",
    MANAGER = "MANAGER",
    OPERATION = "OPERATION",
    SUPERVISOR = "SUPERVISOR",
    MAINTAINER = "MAINTAINER",
    MEMBER = "MEMBER",
}
export interface AuditMemberDTO {
    id: string;
    firstName: string;
    lastName: string;
    avatarKey: string;
}
export enum EventType {
    MEETING = "meeting",
    CALL = "call",
    INTERNAL_MEETING = "internal_meeting",
    SERVICE_USER = "service_user",
    BIRTHDAY = "birthday",
    HOLIDAY = "holiday",
}
export interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    type: EventType
    important?: boolean
}
export interface MachineTypeDTO {
  id?: number
  machineGroupId?: string
  machineGroupName?: string
  machineTypeId?: string
  machineTypeName?: string
  status?: string
}