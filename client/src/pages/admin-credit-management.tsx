import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Gift, User, Calendar, Search } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AdminCreditManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState("");
  const [creditAmount, setCreditAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [couponData, setCouponData] = useState({
    code: "",
    credits: 0,
    maxUses: 1,
    expiresAt: ""
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (data: { userId: string; credits: number; reason: string }) => {
      return apiRequest("POST", "/api/admin/credits/add", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Credits Added Successfully",
        description: `Added ${data.creditsAdded} credits to ${data.user.username}`,
      });
      setCreditAmount(0);
      setReason("");
      setSelectedUser("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Credits",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/coupons/create", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Coupon Created Successfully",
        description: `Coupon ${data.coupon.code} created with ${data.coupon.credits} credits`,
      });
      setCouponData({
        code: "",
        credits: 0,
        maxUses: 1,
        expiresAt: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Coupon",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleAddCredits = () => {
    if (!selectedUser || creditAmount <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a user and enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }

    addCreditsMutation.mutate({
      userId: selectedUser,
      credits: creditAmount,
      reason: reason || "Manual credit addition by admin"
    });
  };

  const handleCreateCoupon = () => {
    if (!couponData.code || couponData.credits <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a coupon code and valid credit amount",
        variant: "destructive",
      });
      return;
    }

    createCouponMutation.mutate({
      ...couponData,
      expiresAt: couponData.expiresAt || null
    });
  };

  const generateCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setCouponData(prev => ({ ...prev, code }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credit Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage user credits and create promotional coupons
        </p>
      </div>

      <Tabs defaultValue="add-credits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add-credits">Add Credits</TabsTrigger>
          <TabsTrigger value="create-coupons">Create Coupons</TabsTrigger>
          <TabsTrigger value="credit-history">Credit History</TabsTrigger>
        </TabsList>

        <TabsContent value="add-credits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  Add Credits to User
                </CardTitle>
                <CardDescription>
                  Manually add credits to a user's account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-select">Select User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {user.username} ({user.email})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-amount">Credit Amount</Label>
                  <Input
                    id="credit-amount"
                    type="number"
                    min="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    placeholder="Enter credit amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for credit addition"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAddCredits}
                  disabled={addCreditsMutation.isPending || !selectedUser || creditAmount <= 0}
                  className="w-full"
                >
                  {addCreditsMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Adding Credits...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add {creditAmount} Credits
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Credit Transactions</CardTitle>
                <CardDescription>Latest admin credit additions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      user: "john_doe",
                      credits: 500,
                      reason: "Compensation for service downtime",
                      date: "2 hours ago",
                      admin: "admin"
                    },
                    {
                      user: "jane_smith",
                      credits: 1000,
                      reason: "Beta testing bonus",
                      date: "1 day ago",
                      admin: "admin"
                    },
                    {
                      user: "mike_wilson",
                      credits: 250,
                      reason: "Support ticket resolution",
                      date: "2 days ago",
                      admin: "admin"
                    }
                  ].map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{transaction.user}</div>
                        <div className="text-sm text-gray-500">{transaction.reason}</div>
                        <div className="text-xs text-gray-400">
                          By {transaction.admin} • {transaction.date}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-green-600">
                        +{transaction.credits}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create-coupons" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  Create Promotional Coupon
                </CardTitle>
                <CardDescription>
                  Generate coupon codes for promotional campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      value={couponData.code}
                      onChange={(e) => setCouponData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="Enter coupon code"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCouponCode}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupon-credits">Credit Value</Label>
                  <Input
                    id="coupon-credits"
                    type="number"
                    min="1"
                    value={couponData.credits}
                    onChange={(e) => setCouponData(prev => ({ ...prev, credits: Number(e.target.value) }))}
                    placeholder="Enter credit value"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-uses">Maximum Uses</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    min="1"
                    value={couponData.maxUses}
                    onChange={(e) => setCouponData(prev => ({ ...prev, maxUses: Number(e.target.value) }))}
                    placeholder="Enter maximum uses"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                  <Input
                    id="expires-at"
                    type="datetime-local"
                    value={couponData.expiresAt}
                    onChange={(e) => setCouponData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>

                <Button
                  onClick={handleCreateCoupon}
                  disabled={createCouponMutation.isPending || !couponData.code || couponData.credits <= 0}
                  className="w-full"
                >
                  {createCouponMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Creating Coupon...
                    </div>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Create Coupon
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Coupons</CardTitle>
                <CardDescription>Currently available promotional coupons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      code: "WELCOME2025",
                      credits: 1000,
                      maxUses: 100,
                      currentUses: 23,
                      expiresAt: "2025-02-01",
                      status: "active"
                    },
                    {
                      code: "BETA500",
                      credits: 500,
                      maxUses: 50,
                      currentUses: 47,
                      expiresAt: "2025-01-15",
                      status: "active"
                    },
                    {
                      code: "XMAS2024",
                      credits: 250,
                      maxUses: 200,
                      currentUses: 200,
                      expiresAt: "2024-12-31",
                      status: "expired"
                    }
                  ].map((coupon, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono font-semibold">{coupon.code}</div>
                        <Badge
                          variant={coupon.status === "active" ? "default" : "secondary"}
                          className={coupon.status === "active" ? "text-green-600" : "text-gray-500"}
                        >
                          {coupon.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Credits: {coupon.credits}</div>
                        <div>Uses: {coupon.currentUses}/{coupon.maxUses}</div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {coupon.expiresAt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credit-history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Credit Transaction History</CardTitle>
                  <CardDescription>All credit-related transactions in the system</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search transactions..."
                    className="w-64"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: "txn_001",
                    user: "john_doe",
                    type: "admin_add",
                    amount: 500,
                    reason: "Compensation for service downtime",
                    admin: "admin",
                    date: "2025-01-04 14:30:00"
                  },
                  {
                    id: "coupon_welcome",
                    user: "jane_smith",
                    type: "coupon_redeem",
                    amount: 1000,
                    reason: "WELCOME2025 coupon redemption",
                    admin: null,
                    date: "2025-01-04 10:15:00"
                  },
                  {
                    id: "payment_001",
                    user: "mike_wilson",
                    type: "purchase",
                    amount: 2500,
                    reason: "Credit purchase ($250.00)",
                    admin: null,
                    date: "2025-01-03 16:45:00"
                  }
                ].map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "admin_add" 
                          ? "bg-blue-100 text-blue-600" 
                          : transaction.type === "coupon_redeem"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-green-100 text-green-600"
                      }`}>
                        {transaction.type === "admin_add" ? (
                          <Plus className="h-4 w-4" />
                        ) : transaction.type === "coupon_redeem" ? (
                          <Gift className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.user}</div>
                        <div className="text-sm text-gray-500">{transaction.reason}</div>
                        <div className="text-xs text-gray-400">
                          {transaction.date} • ID: {transaction.id}
                          {transaction.admin && ` • By: ${transaction.admin}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-green-600">
                      +{transaction.amount}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}