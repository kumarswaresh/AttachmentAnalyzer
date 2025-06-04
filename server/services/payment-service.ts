import Stripe from 'stripe';
import { storage } from '../storage';

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required for payment processing');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata: any = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Payment setup failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        };
      }

      return {
        success: false,
        status: paymentIntent.status,
        error: 'Payment not completed'
      };
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  async addCreditsToUser(userId: number, credits: number, transactionId?: string, source: 'payment' | 'admin' | 'coupon' = 'payment') {
    try {
      // Get current user credits
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentCredits = user.metadata?.credits || 0;
      const newCredits = currentCredits + credits;

      // Update user credits
      await storage.updateUserMetadata(userId, {
        ...user.metadata,
        credits: newCredits,
        lastCreditUpdate: new Date().toISOString()
      });

      // Log credit transaction
      await this.logCreditTransaction({
        userId,
        amount: credits,
        source,
        transactionId,
        balanceBefore: currentCredits,
        balanceAfter: newCredits,
        timestamp: new Date()
      });

      return {
        success: true,
        creditsAdded: credits,
        newBalance: newCredits,
        previousBalance: currentCredits
      };
    } catch (error: any) {
      console.error('Error adding credits to user:', error);
      throw new Error(`Failed to add credits: ${error.message}`);
    }
  }

  async processPaymentAndAddCredits(userId: number, paymentIntentId: string, creditsToAdd: number) {
    try {
      // Confirm the payment first
      const paymentResult = await this.confirmPayment(paymentIntentId);
      
      if (!paymentResult.success) {
        throw new Error('Payment was not successful');
      }

      // Add credits to user
      const creditResult = await this.addCreditsToUser(
        userId, 
        creditsToAdd, 
        paymentIntentId, 
        'payment'
      );

      return {
        success: true,
        payment: paymentResult,
        credits: creditResult,
        transactionId: paymentIntentId
      };
    } catch (error: any) {
      console.error('Error processing payment and adding credits:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async createCouponCode(code: string, credits: number, expiresAt?: Date, maxUses: number = 1) {
    try {
      const coupon = {
        code: code.toUpperCase(),
        credits,
        expiresAt,
        maxUses,
        currentUses: 0,
        isActive: true,
        createdAt: new Date()
      };

      await storage.createCoupon(coupon);
      return coupon;
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      throw new Error(`Failed to create coupon: ${error.message}`);
    }
  }

  async redeemCoupon(userId: number, couponCode: string) {
    try {
      const coupon = await storage.getCouponByCode(couponCode.toUpperCase());
      
      if (!coupon) {
        throw new Error('Invalid coupon code');
      }

      if (!coupon.isActive) {
        throw new Error('Coupon is no longer active');
      }

      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw new Error('Coupon has expired');
      }

      if (coupon.currentUses >= coupon.maxUses) {
        throw new Error('Coupon has reached maximum uses');
      }

      // Check if user already used this coupon
      const existingUse = await storage.getCouponUsage(userId, coupon.id);
      if (existingUse) {
        throw new Error('Coupon already used by this user');
      }

      // Add credits to user
      const creditResult = await this.addCreditsToUser(
        userId, 
        coupon.credits, 
        `coupon_${coupon.code}`, 
        'coupon'
      );

      // Update coupon usage
      await storage.updateCouponUsage(coupon.id, coupon.currentUses + 1);
      await storage.logCouponUsage(userId, coupon.id, coupon.credits);

      return {
        success: true,
        creditsAdded: coupon.credits,
        couponCode: coupon.code,
        credits: creditResult
      };
    } catch (error: any) {
      console.error('Error redeeming coupon:', error);
      throw new Error(`Coupon redemption failed: ${error.message}`);
    }
  }

  private async logCreditTransaction(transaction: {
    userId: number;
    amount: number;
    source: string;
    transactionId?: string;
    balanceBefore: number;
    balanceAfter: number;
    timestamp: Date;
  }) {
    try {
      await storage.logCreditTransaction(transaction);
    } catch (error) {
      console.error('Error logging credit transaction:', error);
      // Don't throw here as this is just logging
    }
  }

  async getUserCreditHistory(userId: number, limit: number = 50) {
    try {
      return await storage.getUserCreditHistory(userId, limit);
    } catch (error: any) {
      console.error('Error getting user credit history:', error);
      throw new Error(`Failed to get credit history: ${error.message}`);
    }
  }

  async getOrganizationCreditStats(organizationId: number) {
    try {
      const stats = await storage.getOrganizationCreditStats(organizationId);
      return {
        totalCreditsUsed: stats.totalCreditsUsed || 0,
        totalCreditsPurchased: stats.totalCreditsPurchased || 0,
        activeUsers: stats.activeUsers || 0,
        averageCreditsPerUser: stats.averageCreditsPerUser || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error getting organization credit stats:', error);
      throw new Error(`Failed to get credit stats: ${error.message}`);
    }
  }
}