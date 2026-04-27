import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const mockData = {
  topProducts: [
    { id: 1, name: "iPhone 15 Pro", sales: 1247, revenue: 1247000, rank: 1, category: "Electronics" },
    { id: 2, name: "Nike Air Max", sales: 892, revenue: 134000, rank: 2, category: "Sports" },
    { id: 3, name: "Samsung 4K TV", sales: 567, revenue: 567000, rank: 3, category: "Electronics" },
    { id: 4, name: "Levi's Jeans", sales: 445, revenue: 44500, rank: 4, category: "Fashion" },
    { id: 5, name: "Coffee Maker", sales: 334, revenue: 33400, rank: 5, category: "Home & Garden" },
  ]
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function TopProduct() {
  return (
    <Card className="shadow-none w-full">
      <CardHeader className="pb-6">
        <div className="space-y-2">
          <CardTitle className="text-md">Most Selling Products</CardTitle>
          <CardDescription>Top 10 products driving revenue growth</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockData.topProducts.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-white rounded-xl border border-slate-200/60 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    index < 3
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {product.rank}
                </div>
                <div>
                  <p className="font-normal text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-600">{product.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-normal text-md text-slate-900">{formatCurrency(product.revenue)}</p>
                <p className="text-sm text-slate-500">{product.sales} sales</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
