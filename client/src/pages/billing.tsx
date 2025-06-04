import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Gift, Plus, History, Zap } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Billing() {
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState(10);
  const [couponCode, setCouponCode] = useState("");

  // Mock user credits - replace with actual API call
  const { data: userCredits = 2500, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/user/credits"],
    retry: false,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("POST", "/api/billing/create-payment-intent", { 
        amount,
        credits: amount * 10 
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Intent Created",
        description: `Ready to purchase ${data.credits} credits for $${data.amount}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  const redeemCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/billing/redeem-coupon", { couponCode: code });
    },
    onSuccess: (data) => {
      toast({
        title: "Coupon Redeemed Successfully",
        description: `Added ${data.creditsAdded} credits to your account`,
      });
      setCouponCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Coupon Redemption Failed",
        description: error.message || "Invalid or expired coupon",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    createPaymentMutation.mutate(paymentAmount);
  };

  const handleCouponRedeem = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Enter Coupon Code",
        description: "Please enter a valid coupon code",
        variant: "destructive",
      });
      return;
    }
    redeemCouponMutation.mutate(couponCode);
  };

  const creditPackages = [
    { credits: 100, price: 10, popular: false },
    { credits: 500, price: 45, popular: true },
    { credits: 1000, price: 80, popular: false },
    { credits: 2500, price: 180, popular: false },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Credits</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your credits and billing information
        </p>
      </div>

      {/* Current Credits */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Current Balance
              </CardTitle>
              <CardDescription>Available credits for AI operations</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {creditsLoading ? "..." : userCredits.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Credits</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="purchase" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
          <TabsTrigger value="coupons">Redeem Coupon</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credit Packages */}
            <Card>
              <CardHeader>
                <CardTitle>Choose a Package</CardTitle>
                <CardDescription>Select a credit package that suits your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {creditPackages.map((pkg) => (
                  <div
                    key={pkg.credits}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      paymentAmount === pkg.price
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setPaymentAmount(pkg.price)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {pkg.credits.toLocaleString()} Credits
                          {pkg.popular && (
                            <Badge variant="secondary" className="text-xs">
                              Most Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${(pkg.price / pkg.credits * 100).toFixed(1)} per 100 credits
                        </div>
                      </div>
                      <div className="text-lg font-bold">${pkg.price}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Custom Amount */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Amount</CardTitle>
                <CardDescription>Enter a custom amount to purchase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="5"
                    max="1000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                  />
                  <div className="text-sm text-gray-500">
                    You'll receive {(paymentAmount * 10).toLocaleString()} credits
                  </div>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={createPaymentMutation.isPending || paymentAmount < 5}
                  className="w-full"
                >
                  {createPaymentMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </div>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase ${paymentAmount} in Credits
                    </>
                  )}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  Secure payment powered by Stripe. Your card will be charged immediately.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-500" />
                Redeem Coupon
              </CardTitle>
              <CardDescription>
                Enter your coupon code to receive free credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coupon">Coupon Code</Label>
                <Input
                  id="coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="font-mono"
                />
              </div>

              <Button
                onClick={handleCouponRedeem}
                disabled={redeemCouponMutation.isPending || !couponCode.trim()}
                className="w-full"
              >
                {redeemCouponMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Redeeming...
                  </div>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Redeem Coupon
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                Coupon codes are case-insensitive and can only be used once per account.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>View your recent credit transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock transaction history */}
                {[
                  {
                    id: "txn_001",
                    type: "purchase",
                    amount: 500,
                    cost: "$50.00",
                    date: "2025-01-04",
                    status: "completed"
                  },
                  {
                    id: "coupon_welcome",
                    type: "coupon",
                    amount: 100,
                    cost: "Free",
                    date: "2025-01-01",
                    status: "completed"
                  }
                ].map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "purchase" 
                          ? "bg-blue-100 text-blue-600" 
                          : "bg-green-100 text-green-600"
                      }`}>
                        {transaction.type === "purchase" ? (
                          <CreditCard className="h-4 w-4" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {transaction.type === "purchase" ? "Credit Purchase" : "Coupon Redemption"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.date} • {transaction.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        +{transaction.amount} credits
                      </div>
                      <div className="text-sm text-gray-500">{transaction.cost}</div>
                    </div>
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