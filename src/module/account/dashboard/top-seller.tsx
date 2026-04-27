import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Award } from "lucide-react"
import { useState } from "react"

interface TopSeller {
  id: number
  name: string
  avatar: string
  revenue: number
  rank: number
  department: string
}

const topSellers: TopSeller[] = [
  { id: 1, name: "Sarah Johnson", avatar: "/placeholder.svg?height=40&width=40", revenue: 156780, rank: 1, department: "Electronics" },
  { id: 2, name: "Michael Chen", avatar: "/placeholder.svg?height=40&width=40", revenue: 142350, rank: 2, department: "Fashion" },
  { id: 3, name: "Emily Rodriguez", avatar: "/placeholder.svg?height=40&width=40", revenue: 138920, rank: 3, department: "Home & Garden" },
  { id: 4, name: "David Kim", avatar: "/placeholder.svg?height=40&width=40", revenue: 125640, rank: 4, department: "Sports" },
  { id: 5, name: "Lisa Thompson", avatar: "/placeholder.svg?height=40&width=40", revenue: 118750, rank: 5, department: "Electronics" },
]

function getRankingBorder(rank: number) {
  if (rank === 1) return "ring-3 ring-yellow-400"
  if (rank === 2) return "ring-3 ring-gray-300"
  if (rank === 3) return "ring-3 ring-amber-600"
  return "ring-2 ring-slate-200"
}

function getRankingIcon(rank: number) {
  if (rank === 1) return "bg-yellow-400 text-black"
  if (rank === 2) return "bg-gray-300 text-black"
  if (rank === 3) return "bg-amber-600 text-white"
  return "bg-slate-200 text-slate-700"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
}

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`
}

export function TopSeller() {
  const [selectedMonth, setSelectedMonth] = useState("December")
  return (
    <Card className="w-full shadow-none">
      <CardHeader className="pb-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-md">Top Seller This Month</CardTitle>
            </div>
            <CardDescription>Leading sales representatives driving growth</CardDescription>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32 border-slate-300 bg-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="December">December</SelectItem>
              <SelectItem value="November">November</SelectItem>
              <SelectItem value="October">October</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topSellers.slice(0, 5).map((seller) => (
            <div
              key={seller.id}
              className="flex items-center justify-between p-4 hover:bg-slate-50/50 rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className={`w-12 h-12 ${getRankingBorder(seller.rank)}`}>
                    <AvatarImage src={seller.avatar} alt={seller.name} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-400 text-white font-medium">
                      {getInitials(seller.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankingIcon(seller.rank)}`}>
                    {seller.rank}
                  </div>
                </div>
                <div>
                  <p className="font-normal text-slate-900 text-md">{seller.name}</p>
                  <p className="text-sm text-slate-500">{seller.department} Division</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-normal text-md text-slate-900">{formatCurrency(seller.revenue)}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">TOTAL REVENUE</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}