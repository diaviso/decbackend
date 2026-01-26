import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  async createCheckoutSession(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/premium/cancel`,
      metadata: {
        userId: user.id,
      },
    });

    // Create payment record
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: 0, // Will be updated by webhook
        stripeSessionId: session.id,
        description: 'Abonnement Premium DEC Learning',
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async createSubscription(userId: string, autoRenew: boolean = true) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Amount: 1 euro = 100 cents
    const amount = 100;

    // Create checkout session for payment
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Abonnement Premium DEC Learning',
              description: 'Accès illimité à tous les quiz premium pendant 1 mois',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/premium/cancel`,
      metadata: {
        userId: user.id,
        type: 'premium_monthly',
        autoRenew: autoRenew ? 'true' : 'false',
      },
    });

    // Update user autoRenew preference
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoRenew } as any,
    });

    // Create payment record
    await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: amount,
        stripeSessionId: session.id,
        description: 'Abonnement Premium DEC Learning - 1 mois (1€)',
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async toggleAutoRenew(userId: string, autoRenew: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { autoRenew } as any,
    });

    return { 
      message: autoRenew 
        ? 'Renouvellement automatique activé' 
        : 'Renouvellement automatique désactivé',
      autoRenew 
    };
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Cancel Stripe subscription if exists
    const userAny = user as any;
    if (userAny.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(userAny.stripeSubscriptionId);
      } catch (err) {
        console.log('No active Stripe subscription to cancel');
      }
    }

    // Update user - disable auto-renew but keep premium until expiration
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        autoRenew: false,
        stripeSubscriptionId: null,
      } as any,
    });

    return { 
      message: 'Abonnement annulé. Vous conservez l\'accès premium jusqu\'à la fin de la période en cours.',
      premiumExpiresAt: user.premiumExpiresAt,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    console.log('Received Stripe event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentFailed(paymentIntent);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionChange(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoiceFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    
    // Find payment by stripePaymentId or through session
    const payment = await this.prisma.payment.findFirst({
      where: { 
        OR: [
          { stripePaymentId: paymentIntent.id },
          { stripeSessionId: { not: null } }
        ],
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!payment) {
      // Try to find user by customer ID
      const customerId = paymentIntent.customer as string;
      if (customerId) {
        const user = await this.prisma.user.findFirst({
          where: { stripeCustomerId: customerId }
        });
        
        if (user) {
          // Calculate premium expiration (1 month from now)
          const premiumExpiresAt = new Date();
          premiumExpiresAt.setMonth(premiumExpiresAt.getMonth() + 1);

          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              isPremium: true,
              premiumExpiresAt,
            },
          });
          console.log(`User ${user.id} upgraded to premium via payment_intent`);
        }
      }
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        stripePaymentId: paymentIntent.id,
        amount: paymentIntent.amount,
      },
    });

    // Calculate premium expiration (1 month from now)
    const premiumExpiresAt = new Date();
    premiumExpiresAt.setMonth(premiumExpiresAt.getMonth() + 1);

    // Update user premium status
    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        isPremium: true,
        premiumExpiresAt,
      },
    });

    console.log(`User ${payment.userId} upgraded to premium`);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    
    // Find and update the payment record
    const payment = await this.prisma.payment.findFirst({
      where: { 
        stripePaymentId: paymentIntent.id,
        status: 'PENDING'
      }
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    // Update payment status
    await this.prisma.payment.updateMany({
      where: { stripeSessionId: session.id },
      data: {
        status: 'COMPLETED',
        stripePaymentId: session.payment_intent as string,
        amount: session.amount_total || 0,
      },
    });

    // Calculate premium expiration (1 month from now)
    const premiumExpiresAt = new Date();
    premiumExpiresAt.setMonth(premiumExpiresAt.getMonth() + 1);

    // Update user premium status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumExpiresAt,
      },
    });
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const subAny = subscription as any;
    const premiumExpiresAt = isActive && subAny.current_period_end
      ? new Date(subAny.current_period_end * 1000)
      : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: isActive,
        premiumExpiresAt,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Extend premium by 1 month
    const currentExpiry = user.premiumExpiresAt || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: true,
        premiumExpiresAt: newExpiry,
      },
    });
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Don't immediately revoke premium, just log the failure
    console.log(`Payment failed for user ${user.id}`);
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPremiumStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPremium: true,
        premiumExpiresAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Check if premium has expired
    if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt < new Date()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isPremium: false },
      });
      return { isPremium: false, premiumExpiresAt: null };
    }

    return user;
  }

  async getAdminSubscriptionsAnalytics() {
    // Get all users with premium-related data
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPremium: true,
        premiumExpiresAt: true,
        stripeCustomerId: true,
        createdAt: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            status: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    // Get all payments for analytics
    const allPayments = await this.prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Calculate statistics
    const premiumUsers = allUsers.filter(u => u.isPremium);
    const expiredUsers = allUsers.filter(u => 
      !u.isPremium && u.payments.some(p => p.status === 'COMPLETED')
    );
    const expiringUsers = premiumUsers.filter(u => 
      u.premiumExpiresAt && new Date(u.premiumExpiresAt) <= sevenDaysFromNow
    );

    const completedPayments = allPayments.filter(p => p.status === 'COMPLETED');
    const failedPayments = allPayments.filter(p => p.status === 'FAILED');
    const pendingPayments = allPayments.filter(p => p.status === 'PENDING');

    const recentPayments = completedPayments.filter(p => 
      new Date(p.createdAt) >= thirtyDaysAgo
    );
    const weeklyPayments = completedPayments.filter(p => 
      new Date(p.createdAt) >= sevenDaysAgo
    );

    // Revenue calculations (amount is in cents)
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0) / 100;
    const monthlyRevenue = recentPayments.reduce((sum, p) => sum + p.amount, 0) / 100;
    const weeklyRevenue = weeklyPayments.reduce((sum, p) => sum + p.amount, 0) / 100;

    // Monthly revenue trend (last 6 months)
    const monthlyTrend: { month: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthPayments = completedPayments.filter(p => {
        const date = new Date(p.createdAt);
        return date >= monthStart && date <= monthEnd;
      });
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0) / 100,
        count: monthPayments.length,
      });
    }

    // Subscribers list with details
    const subscribers = premiumUsers.map(user => {
      const userPayments = user.payments.filter(p => p.status === 'COMPLETED');
      const totalSpent = userPayments.reduce((sum, p) => sum + p.amount, 0) / 100;
      const firstPayment = userPayments.length > 0 
        ? userPayments[userPayments.length - 1].createdAt 
        : null;
      const lastPayment = userPayments.length > 0 
        ? userPayments[0].createdAt 
        : null;
      
      const daysUntilExpiry = user.premiumExpiresAt 
        ? Math.ceil((new Date(user.premiumExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        daysUntilExpiry,
        totalPayments: userPayments.length,
        totalSpent,
        firstPaymentDate: firstPayment,
        lastPaymentDate: lastPayment,
        memberSince: user.createdAt,
        status: daysUntilExpiry && daysUntilExpiry <= 7 ? 'expiring_soon' : 'active',
      };
    });

    // Recent transactions
    const recentTransactions = allPayments.slice(0, 20).map(p => ({
      id: p.id,
      userId: p.user.id,
      userEmail: p.user.email,
      userName: `${p.user.firstName} ${p.user.lastName}`,
      amount: p.amount / 100,
      status: p.status,
      description: p.description,
      createdAt: p.createdAt,
    }));

    // Churn analysis
    const churnedUsers = expiredUsers.length;
    const churnRate = premiumUsers.length + churnedUsers > 0
      ? (churnedUsers / (premiumUsers.length + churnedUsers)) * 100
      : 0;

    // Average revenue per user
    const arpu = premiumUsers.length > 0 
      ? totalRevenue / premiumUsers.length 
      : 0;

    return {
      summary: {
        totalSubscribers: premiumUsers.length,
        activeSubscribers: premiumUsers.length,
        expiredSubscribers: expiredUsers.length,
        expiringThisWeek: expiringUsers.length,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        averageRevenuePerUser: Math.round(arpu * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        conversionRate: allUsers.length > 0 
          ? Math.round((premiumUsers.length / allUsers.length) * 10000) / 100 
          : 0,
      },
      payments: {
        total: allPayments.length,
        completed: completedPayments.length,
        failed: failedPayments.length,
        pending: pendingPayments.length,
        successRate: allPayments.length > 0 
          ? Math.round((completedPayments.length / allPayments.length) * 10000) / 100 
          : 0,
      },
      monthlyTrend,
      subscribers: subscribers.sort((a, b) => 
        new Date(b.lastPaymentDate || 0).getTime() - new Date(a.lastPaymentDate || 0).getTime()
      ),
      recentTransactions,
      expiringSubscribers: subscribers
        .filter(s => s.status === 'expiring_soon')
        .sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0)),
    };
  }
}
