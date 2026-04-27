import { CrmViewHeader } from '@/components/layout/crm-view-header'
import { OpportunitySummary } from '@/components/layout/opportunity-summary'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createFileRoute } from '@tanstack/react-router'
import { Clock, Edit3, FileText, Info, Tag, Users } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/crm/opportunities/view')({
  component: RouteComponent,
})

function RouteComponent() {
  const [activeTab, setActiveTab] = useState("description")
  const handleConvert = () => {
    console.log("Convert clicked!")
    // Your convert logic here
  }

  const handleEdit = () => {
    console.log("Edit clicked!")
    // Navigate to edit page or open modal
  }

  const handleDelete = () => {
    console.log("Delete clicked!")
    // Show confirmation modal before deleting
  }

  const opportunity = {
    currency: "USD",
    amount: 15000,
    qutotationNo: "QT-2025-09",
    conditionTerm: "Net 30",
    priority: "High",
    department: "Sales",
    closeAt: new Date(2025, 2, 15),   // March 15, 2025
    followAt: new Date(2025, 2, 10),  // March 10, 2025
    probability: 75,
    stage: "Evaluation Testing",
    description: ""
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* View Layout Header */}
      <CrmViewHeader
        backLink="/customers"          // Back button navigation
        title="Customer Details"       // Page title
        createdOn="3/1/2025"          // Created date
        createdBy="Alex Wong"         // Created by
        isConvert={true}              // Show convert button
        isEdit={true}                 // Show edit button
        isDelete={true}               // Show delete button
        onConvert={handleConvert}     // Convert button handler
        onEdit={handleEdit}           // Edit button handler
        onDelete={handleDelete}       // Delete button handler
      />

      {/* Page Content */}
      <div className="p-4">
        <OpportunitySummary opportunity={opportunity} />
      </div>
      <div className='px-4'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8 border rounded-md bg-white">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="description" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Description</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Activities</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Files</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            {opportunity.description ? (
              <div className="bg-muted/10 rounded-lg p-6">
                <h4 className="text-base font-medium mb-3">Description</h4>
                <div
                  className="prose prose-sm max-w-none prose-headings:text-primary prose-headings:font-semibold prose-p:text-foreground/90 prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2"
                  dangerouslySetInnerHTML={{ __html: opportunity.description || "No description available." }}
                />
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/10 rounded-lg">
                <Info className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-base font-medium text-muted-foreground mb-2">No Description Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Add a detailed description of this opportunity to help your team understand its scope and
                  requirements.
                </p>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit3 className="h-3 w-3" />
                  Add Description
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
