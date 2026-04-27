import axios from 'axios';

const API_BASE_URL = '/api';

export interface CalibrationDTO {
  years?: string;
  calibrationPlan?: string;
  externalCalibrationDate?: string;
  calibrationDueDate?: string;
  certificateDate?: string;
  results?: string;
  criteria?: string;
  measuringRange?: string;
  accuracy?: string;
  calibrationRange?: string;
  calibrationStatus?: string;
  attachment?: string | null;
}

export interface MaintenanceDTO {
  years?: string;
  round?: number;
  dueDate?: string;
  planDate?: string | null;
  resultDate?: string | null;
  status?: string;
  maintenanceBy?: string | null;
  note?: string | null;
  attachment?: string | null;
}

export interface MachineDTO {
  machineName: string;
  machineCode: string;
  machineModel?: string;
  serialNumber?: string;
  department: string;
  responsiblePersonId: string;
  responsiblePersonName?: string;
  supervisorId?: string;
  supervisorName?: string;
  managerId?: string;
  managerName?: string;
  frequency?: string;
  machineStatus: string;
  groups?: string;
  machineTypeId: string;
  machineTypeName?: string;
  machineGroupId: string;
  maintenanceFrequency?: string;
  resetPeriod: string;
  calibration?: CalibrationDTO;
  maintenanceList?: MaintenanceDTO[];
}

export const machineService = {
  async createMachine(data: MachineDTO) {
    try {
      const response = await axios.post(`${API_BASE_URL}/machine`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
  },

  async createMachineWithFiles(data: MachineDTO, files?: {
    image?: File;
    workInstruction?: File;
    attachments?: File[];
  }) {
    try {
      const formData = new FormData();
      
      formData.append('data', JSON.stringify(data));
      
      if (files?.image) {
        formData.append('image', files.image);
      }
      if (files?.workInstruction) {
        formData.append('workInstruction', files.workInstruction);
      }
      if (files?.attachments) {
        files.attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });
      }

      const response = await axios.post(`${API_BASE_URL}/machines/with-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating machine with files:', error);
      throw error;
    }
  },

  async getAllMachines() {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines`);
      return response.data;
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }
  },
};