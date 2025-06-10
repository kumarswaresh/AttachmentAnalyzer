import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Users, Activity, TrendingUp, Calendar } from "lucide-react";

export default function BillingManagement() {
  const { toast } = useToast();

  const { data: billingData, isLoading } = useQuery({
    queryKey: ["/api/admin/billing"],
    retry: false,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/admin/organizations"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const mockBillingData = {
    totalRevenue: 45890,
    monthlyRecurring: 12450,
    activeSubscriptions: 156,
    churnRate: 2.3,
    recentTransactions: [
      { id: 1, organization: "TechCorp", amount: 299, status: "paid", date: "2024-01-15" },
      { id: 2, organization: "StartupInc", amount: 99, status: "pending", date: "2024-01-14" },
      { id: 3, organization: "Enterprise Ltd", amount: 999, status: "paid", date: "2024-01-13" },
    ]
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Revenue Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor revenue, subscriptions, and billing across all organizations
        </p>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockBillingData.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockBillingData.monthlyRecurring.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">MRR growth +8.2%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockBillingData.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">+23 new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockBillingData.churnRate}%</div>
            <p className="text-xs text-muted-foreground">-0.5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest billing activity across all organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockBillingData.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{transaction.organization}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${transaction.amount}</span>
                  <Badge variant={transaction.status === "paid" ? "default" : "secondary"}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organization Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Billing Status</CardTitle>
          <CardDescription>Billing status for each organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations.slice(0, 5).map((org: any) => (
              <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default">Active</Badge>
                  <span className="font-medium">$299/mo</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}