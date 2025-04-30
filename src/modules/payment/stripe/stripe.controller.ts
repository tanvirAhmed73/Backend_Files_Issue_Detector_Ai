import { Body, Controller, Post, UseGuards, HttpException, HttpStatus, Headers, RawBodyRequest, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateSubscriptionDto } from './dto/subscription.dto';
import Stripe from 'stripe';
import { Request, Response } from 'express';

@Controller('payment/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}
  
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async createSubscriptionCheckout(
    @Body() subscriptionData: CreateSubscriptionDto,
    @Req() req: Request 
  ) {
    try {
      if (!req.user?.userId) {
        throw new HttpException({
          success: false,
          message: 'Authentication failed',
          error: 'User not authenticated'
        }, HttpStatus.UNAUTHORIZED);
      }

      const result = await this.stripeService.createSubscription(
        subscriptionData,
        req.user.userId
      );

      if (!result.success) {
        throw new HttpException({
          success: false,
          message: result.message,
          error: result.error
        }, HttpStatus.BAD_REQUEST);
      }

      const { subscription, stripeSubscription, clientSecret } = result.data;

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          stripeSubscriptionId: stripeSubscription.id,
          clientSecret,
          customerId: stripeSubscription.customer,
          status: stripeSubscription.status,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({
        success: false,
        message: 'Subscription creation failed',
        error: error.message || 'An unexpected error occurred'
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    try {
      const event = await this.stripeService.constructWebhookEvent(req.rawBody, signature);
  
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.stripeService.handlePaymentIntentSucceeded(paymentIntent);
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          // Handle failed payment
          break;

        case 'customer.subscription.created':
          const newSubscription = event.data.object as Stripe.Subscription;
          await this.stripeService.handleNewSubscription(newSubscription);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await this.stripeService.handleSuccessfulPayment(invoice);
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          await this.stripeService.handleSubscriptionUpdate(updatedSubscription);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          await this.stripeService.handleSubscriptionCancellation(deletedSubscription);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // @Post('confirm-payment')
  // @UseGuards(JwtAuthGuard)
  // async confirmPayment(@Body() data: { paymentIntentId: string }) {
  //   try {
  //     const paymentIntent = await this.stripeService.confirmPayment(data.paymentIntentId);
  //     return {
  //       success: true,
  //       data: {
  //         status: paymentIntent.status,
  //         clientSecret: paymentIntent.client_secret
  //       }
  //     };
  //   } catch (error) {
  //     throw new HttpException({
  //       success: false,
  //       message: error.message,
  //       error: 'PAYMENT_CONFIRMATION_ERROR'
  //     }, HttpStatus.BAD_REQUEST);
  //   }
  // }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @Body() data: { subscriptionId: string },
    @Req() req: Request
  ) {
    try {
      if (!req.user?.userId) {
        throw new HttpException({
          success: false,
          message: 'Authentication failed',
          error: 'User not authenticated'
        }, HttpStatus.UNAUTHORIZED);
      }

      if (!data.subscriptionId) {
        throw new HttpException({
          success: false,
          message: 'Missing subscription ID',
          error: 'Subscription ID is required'
        }, HttpStatus.BAD_REQUEST);
      }

      const result = await this.stripeService.cancelSubscription(
        data.subscriptionId, 
        req.user.userId
      );

      if (!result.success) {
        throw new HttpException({
          success: false,
          message: result.message,
          error: result.error
        }, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({
        success: false,
        message: 'Subscription cancellation failed',
        error: error.message || 'An unexpected error occurred'
      }, HttpStatus.BAD_REQUEST);
    }
  }
}
