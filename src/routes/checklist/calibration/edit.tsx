import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Save, X, PencilRuler, FileText, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/checklist/calibration/edit')({
  component: CalibrationEdit,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: Number(search.id) || 0
    }
  }
})

interface CalibrationFormData {
  id: number;
  machineCode: string;
  machineName?: string;
  years: number;
  dueDate?: string;
  startDate?: string;
  certificateDate?: string;
  results?: string;
  criteria?: string;
  measuringRange?: string;
  accuracy?: string;
  calibrationRange?: string;
  calibrationStatus?: string;
  attachment?: File[];
  note?: string;
  permissibleCapacity?: string;
  comment?: string;
  resolution?: string;
  maxUncertainty?: string;
  mpe?: string;
  checkMpe?: string;
  checkResolution?: string;
  checkResult?: string;
  reasonNotPass?: string;
}

function CalibrationEdit() {
  const { id } = useSearch({ from: '/checklist/calibration/edit' });
  const [formData, setFormData] = useState<CalibrationFormData>({
    id: 0,
    machineCode: '',
    years: new Date().getFullYear(),
    calibrationStatus: 'PENDING'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchCalibrationDetail();
    }
  }, [id]);

  const fetchCalibrationDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/api/calibration/${id}`);
      
      if (response) {
        setFormData(response.data || response);
      } else {
        toast.error(t("Failed to load calibration details"));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t("Failed to load calibration details"));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = (file: any) => {
    console.log('Download file:', file)
  };

  const handleDeleteUploadedFile = async (fileId: any) => {
    console.log('Delete file:', fileId)
  };

  const handleInputChange = (field: keyof CalibrationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await api.put(`/api/calibration/update`, formData);
      
      if (response) {
        toast.success(t("Calibration updated successfully"));
        router.navigate({ to: '/checklist/calibration/view', search: { id } });
      } else {
        toast.error(t("Failed to update calibration"));
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t("Failed to update calibration"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.navigate({ to: '/checklist/calibration/view', search: { id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <PencilRuler className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{formData.machineName}</h1>
                <p className="text-sm text-muted-foreground">{formData.machineCode}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Calibration Details */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <PencilRuler className="h-5 w-5 text-primary" />
              Calibration Details {formData.years && `- ${formData.years}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <DatePickerField
                  id="dueDate"
                  label="Due Date"
                  value={formData.dueDate ? new Date(formData.dueDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : '';
                    handleInputChange('dueDate', isoDate);

                    if (formData.certificateDate && isoDate) {
                      const dueDate = new Date(isoDate);
                      const certDate = new Date(formData.certificateDate);

                      if (certDate > dueDate) {
                        handleInputChange('calibrationStatus', 'Overdue');
                        toast.warning('Certificate date exceeds new due date. Status updated to Overdue.');
                      } else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time');
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <DatePickerField 
                  id="certificateDate"
                  label="Certificate Date"
                  value={formData.certificateDate ? new Date(formData.certificateDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : '';
                    
                    handleInputChange('certificateDate', isoDate);

                    if (formData.calibrationDueDate && isoDate) {
                      const dueDate = new Date(formData.calibrationDueDate);
                      const certDate = new Date(isoDate);

                      if (certDate > dueDate) {
                        handleInputChange('calibrationStatus', 'Overdue');
                        toast.warning('Certificate date exceeds due date. Status changed to Overdue.', {
                          duration: 4000,
                        });
                      }
                      else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time');
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="results">Results</Label>
                <Select
                  value={formData.results}
                  onValueChange={(value) => handleInputChange('results', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Not Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calibrationStatus">Status</Label>
                <Select
                  value={formData.calibrationStatus}
                  onValueChange={(value) => handleInputChange('calibrationStatus', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Time">On Time</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criteria">Criteria</Label>
                <Input
                  id="criteria"
                  value={formData.criteria || ''}
                  onChange={(e) => handleInputChange('criteria', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accuracy">Accuracy</Label>
                <Input
                  id="accuracy"
                  value={formData.accuracy || ''}
                  onChange={(e) => handleInputChange('accuracy', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measuringRange">Measuring Range</Label>
                <Input
                  id="measuringRange"
                  value={formData.measuringRange || ''}
                  onChange={(e) => handleInputChange('measuringRange', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calibrationRange">Calibration Range</Label>
                <Input
                  id="calibrationRange"
                  value={formData.calibrationRange || ''}
                  onChange={(e) => handleInputChange('calibrationRange', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Input
                  id="resolution"
                  value={formData.resolution || ''}
                  onChange={(e) => handleInputChange('resolution', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpe">MPE</Label>
                <Input
                  id="mpe"
                  value={formData.mpe || ''}
                  onChange={(e) => handleInputChange('mpe', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUncertainty">Max Uncertainty</Label>
                <Input
                  id="maxUncertainty"
                  value={formData.maxUncertainty || ''}
                  onChange={(e) => handleInputChange('maxUncertainty', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="permissibleCapacity">Permissible Capacity</Label>
                <Input
                  id="permissibleCapacity"
                  value={formData.permissibleCapacity || ''}
                  onChange={(e) => handleInputChange('permissibleCapacity', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  rows={4}
                  value={formData.note || ''}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                  placeholder="Enter additional notes..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  rows={4}
                  value={formData.comment || ''}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  placeholder="Enter comments..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reasonNotPass">Reason Not Pass</Label>
                <Textarea
                  id="reasonNotPass"
                  rows={4}
                  value={formData.reasonNotPass || ''}
                  onChange={(e) => handleInputChange('reasonNotPass', e.target.value)}
                  placeholder="Enter reason for not passing..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Results */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Check Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="checkMpe">Check MPE</Label>
                <Select
                  value={formData.checkMpe}
                  onValueChange={(value) => handleInputChange('checkMpe', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkResolution">Check Resolution</Label>
                <Select
                  value={formData.checkResolution}
                  onValueChange={(value) => handleInputChange('checkResolution', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Failed</SelectItem>
                    <SelectItem value="Pass Only 3">Pass Only 3</SelectItem>
                    <SelectItem value="Pass Only 5">Pass Only 5</SelectItem>
                  </SelectContent>
                </Select> 
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkResult">Check Result</Label>
                <Select
                  value={formData.checkResult}
                  onValueChange={(value) => handleInputChange('checkResult', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                    <SelectItem value="Limited Use">Limited Use</SelectItem>
                    <SelectItem value="Certificate Mismatch">Certificate Mismatch</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="In Repair">In Repair</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment</Label>
                <FileUploadField
                  id="attachments"
                  maxFiles={10}
                  value={formData.attachment || []}
                  onChange={(files) => handleInputChange("attachment", files)}
                  onDownloadFile={handleDownloadFile}
                  onDeleteUploadedFile={handleDeleteUploadedFile}
                  onFileReject={(file, message) => toast.error(message, { description: `"${file.name}" could not be uploaded` })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - Mobile */}
        <div className="md:hidden flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}