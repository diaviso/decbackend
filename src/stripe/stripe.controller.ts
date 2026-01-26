import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body('priceId') priceId: string,
  ) {
    return this.stripeService.createCheckoutSession(userId, priceId);
  }

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  async createSubscription(
    @CurrentUser('id') userId: string,
    @Body('autoRenew') autoRenew: boolean = true,
  ) {
    return this.stripeService.createSubscription(userId, autoRenew);
  }

  @Post('toggle-auto-renew')
  @UseGuards(JwtAuthGuard)
  async toggleAutoRenew(
    @CurrentUser('id') userId: string,
    @Body('autoRenew') autoRenew: boolean,
  ) {
    return this.stripeService.toggleAutoRenew(userId, autoRenew);
  }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.stripeService.cancelSubscription(userId);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      throw new Error('No raw body found');
    }
    return this.stripeService.handleWebhook(signature, payload);
  }

  @Get('payment-history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@CurrentUser('id') userId: string) {
    return this.stripeService.getPaymentHistory(userId);
  }

  @Get('premium-status')
  @UseGuards(JwtAuthGuard)
  async getPremiumStatus(@CurrentUser('id') userId: string) {
    return this.stripeService.getPremiumStatus(userId);
  }

  @Get('admin/subscriptions')
  @UseGuards(JwtAuthGuard)
  async getAdminSubscriptions(@CurrentUser('role') role: string) {
    if (role !== 'ADMIN') {
      throw new Error('Accès non autorisé');
    }
    return this.stripeService.getAdminSubscriptionsAnalytics();
  }
}
