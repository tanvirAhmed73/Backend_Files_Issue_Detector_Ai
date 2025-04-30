import { Injectable } from '@nestjs/common';
import { UserNotificationService } from '../../user-notification/user-notification.service';
import Stripe from 'stripe';
import { CreateSubscriptionDto, SubscriptionPlanType, BillingCycle } from './dto/subscription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { getTokenLimit } from 'src/config/token-limits.config';
import { TokenLimit } from '@prisma/client';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly PRICE_IDS = {
    [SubscriptionPlanType.PAY_AS_YOU_GO]: {
      [BillingCycle.MONTHLY]: process.env.STRIPE_PAY_AS_YOU_GO_MONTHLY_PRICE_ID,
      [BillingCycle.YEARLY]: process.env.STRIPE_PAY_AS_YOU_GO_YEARLY_PRICE_ID,
    },
    [SubscriptionPlanType.BASIC]: {
      [BillingCycle.MONTHLY]: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
      [BillingCycle.YEARLY]: process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
    },
    [SubscriptionPlanType.PRO]: {
      [BillingCycle.MONTHLY]: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      [BillingCycle.YEARLY]: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    [SubscriptionPlanType.ENTERPRISE]: {
      [BillingCycle.MONTHLY]: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      [BillingCycle.YEARLY]: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    },
  };
  
  constructor(private prisma: PrismaService, private userNotificationService: UserNotificationService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  async createSubscription(data: CreateSubscriptionDto, userId: string) {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await this.prisma.subscription.findFirst({
        where: {
          user_id: userId,
          is_active: true
        }
      });

      if (existingSubscription) {
        return {
          success: false,
          message: 'You already have an active subscription',
          error: 'Please cancel your current subscription before purchasing a new one.'
        };
      }

      if (!data.billingOption || !data.paymentMethodId) {
        return {
          success: false,
          message: 'Missing required fields',
          error: 'Billing option and payment method are required.'
        };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'The requested user does not exist.'
        };
      }

      // Map billing option to BillingCycle
      const billingCycle = data.billingOption === BillingCycle.MONTHLY 
        ? BillingCycle.MONTHLY 
        : BillingCycle.YEARLY;

      // Ensure planType is valid
      if (!Object.values(SubscriptionPlanType).includes(data.planType as SubscriptionPlanType)) {
        throw new Error('Invalid plan type');
      }

      const planType = data.planType as SubscriptionPlanType;
      const priceId = this.PRICE_IDS[planType][billingCycle];

      if (!priceId) {
        throw new Error(`Price ID not found for plan ${planType} and billing cycle ${billingCycle}`);
      }

      // Create a customer
      const customer = await this.stripe.customers.create({
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        payment_method: data.paymentMethodId,
        invoice_settings: {
          default_payment_method: data.paymentMethodId,
        },
      });

      // Create the subscription in Stripe
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          planType,
          billingCycle
        }
      }) as Stripe.Subscription & { latest_invoice: Stripe.Invoice & { payment_intent: Stripe.PaymentIntent } };

      // Save subscription to database
      const subscription = await this.prisma.subscription.create({
        data: {
          user_id: userId,
          type: planType,
          price: stripeSubscription.items.data[0].price.unit_amount / 100,
          currency: stripeSubscription.currency,
          start_date: new Date(stripeSubscription.current_period_start * 1000),
          end_date: new Date(stripeSubscription.current_period_end * 1000),
          billing_cycle: billingCycle,
          is_active: false, // Will be updated to true after successful payment
        }
      });

      // Get token limit from config
      const totalTokens = getTokenLimit(planType as TokenLimit);

      // Create token usage record
      await this.prisma.tokenUsage.create({
        data: {
          user_id: userId,
          subscription_id: subscription.id,
          total_tokens: totalTokens,
          tokens_used: 0,
          reset_date: new Date(stripeSubscription.current_period_end * 1000) // Reset at the end of billing cycle
        }
      });

      // Create payment transaction record
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: userId,
          type: 'subscription',
          provider: 'stripe',
          reference_number: stripeSubscription.id,
          status: 'incomplete',
          amount: stripeSubscription.items.data[0].price.unit_amount / 100,
          currency: stripeSubscription.currency,
          package_type: planType,
          subscription_id: subscription.id
        }
      });

      // After successful subscription creation
      // Create notification for user
      await this.prisma.userNotification.create({
        data: {
          user_id: userId,
          type: 'SUBSCRIPTION_PURCHASED',
          message: 'Your subscription has been successfully purchased',
          is_admin: false,
          data: {
            subscriptionId: subscription.id,
            planType: planType,
            billingCycle: billingCycle
          }
        }
      });

      // Create notification for admin
      await this.prisma.userNotification.create({
        data: {
          user_id: userId,
          type: 'SUBSCRIPTION_PURCHASED',
          message: `New subscription purchased - Plan: ${planType}, Billing: ${billingCycle}`,
          is_admin: true,
          data: {
            subscriptionId: subscription.id,
            planType: planType,
            billingCycle: billingCycle,
            userEmail: user.email
          }
        }
      });
      return {
        success: true,
        message: 'Subscription created successfully',
        data: {
          subscription,
          stripeSubscription,
          clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret,
          subscriptionId: stripeSubscription.id
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Subscription creation failed',
        error: error.message
      };
    }
  }

  async constructWebhookEvent(rawBody: any, signature: string) {
      try {
        const event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        return event;
      } catch (error) {
        throw new Error(`Webhook Error: ${error.message}`);
      }
    }

    async handleNewSubscription(subscription: Stripe.Subscription) {
      try {
        // Handle new subscription creation
        // You might want to store subscription details in your database
        const customer = await this.stripe.customers.retrieve(subscription.customer as string);
        return {
          subscription,
          customer
        };
      } catch (error) {
        throw new Error(`New subscription handling error: ${error.message}`);
      }
    }

    async handleSuccessfulPayment(invoice: Stripe.Invoice) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
        const customer = await this.stripe.customers.retrieve(invoice.customer as string);
        
        // Update subscription status in database
        await this.prisma.subscription.updateMany({
          where: {
            id: subscription.id, // Activate only the current subscription
          },
          data: {
            is_active: true,
            status: 1,
          },
        });
        
        // Update payment transaction status to completed
        await this.prisma.paymentTransaction.updateMany({
          where: {
            reference_number: subscription.id,
            status: 'pending'
          },
          data: {
            status: 'completed'
          }
        });
        
        // After successful payment
        // await this.userNotificationService.create(
        //   subscription.metadata.userId,
        //   'SUBSCRIPTION_PURCHASED',
        //   'Your subscription payment was successful',
        //   { subscriptionId: subscription.id }
        // );

        return {
          subscription,
          customer,
          invoice
        };
      } catch (error) {
        throw new Error(`Payment handling error: ${error.message}`);
      }
    }

    async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
      try {
        // Handle subscription updates (plan changes, etc.)
        const customer = await this.stripe.customers.retrieve(subscription.customer as string);
        
        // Update subscription details in your database
        
        return {
          subscription,
          customer
        };
      } catch (error) {
        throw new Error(`Subscription update error: ${error.message}`);
      }
    }

    async cancelSubscription(subscriptionId: string, userId: string) {
      try {
        // Get the subscription and its payment transaction
        const dbSubscription = await this.prisma.subscription.findFirst({
          where: {
            id: subscriptionId,
            user_id: userId,
            is_active: true
          },
          include: {
            payment_transactions: {
              where: {
                type: 'subscription'
              },
              orderBy: {
                created_at: 'desc'
              },
              take: 1
            }
          }
        });
        if (!dbSubscription) {
          return {
            success: false,
            message: 'No active subscription found',
            error: 'The subscription does not exist or is already cancelled'
          };
        }
    
        // Get the Stripe subscription ID from payment transaction
        const stripeSubscriptionId = dbSubscription.payment_transactions[0]?.reference_number;
        
        if (!stripeSubscriptionId) {
          return {
            success: false,
            message: 'Invalid subscription',
            error: 'Could not find Stripe subscription reference'
          };
        }

        // Cancel the subscription in Stripe
        const canceledSubscription = await this.stripe.subscriptions.cancel(stripeSubscriptionId);

        // Update the subscription in database
        await this.prisma.subscription.update({
          where: {
            id: dbSubscription.id
          },
          data: {
            is_active: false,
            end_date: new Date(canceledSubscription.canceled_at * 1000),
            status: 0,
            canceled_at: new Date()
          }
        });

        // Get current token usage and update it
        const tokenUsage = await this.prisma.tokenUsage.findFirst({
          where: {
            subscription_id: dbSubscription.id,
            deleted_at: null
          }
        });

        if (tokenUsage) {
          await this.prisma.tokenUsage.update({
            where: {
              id: tokenUsage.id
            },
            data: {
              deleted_at: new Date(),
              tokens_used: tokenUsage.total_tokens
            }
          });
        }

        return {
          success: true,
          message: 'Subscription cancelled successfully',
          data: {
            subscriptionId: dbSubscription.id,
            canceledAt: new Date(canceledSubscription.canceled_at * 1000)
          }
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to cancel subscription',
          error: error.message
        };
      }
    }

    async handleSubscriptionCancellation(subscription: Stripe.Subscription) {
      try {
        // Find the subscription using the Stripe subscription ID from payment_transactions
        const dbSubscription = await this.prisma.subscription.findFirst({
          where: {
            payment_transactions: {
              some: {
                reference_number: subscription.id,
                type: 'subscription'
              }
            },
            is_active: true
          }
        });

        if (!dbSubscription) {
          return {
            success: false,
            message: 'Subscription not found',
            error: 'No active subscription found for the given ID'
          };
        }

        // Update subscription status in database
        await this.prisma.subscription.update({
          where: {
            id: dbSubscription.id
          },
          data: {
            is_active: false,
            end_date: new Date(subscription.canceled_at * 1000),
            status: 0,
            canceled_at: new Date()
          }
        });

        // Get and update token usage
        const tokenUsage = await this.prisma.tokenUsage.findFirst({
          where: {
            subscription_id: dbSubscription.id,
            deleted_at: null
          }
        });

        if (tokenUsage) {
          await this.prisma.tokenUsage.update({
            where: {
              id: tokenUsage.id
            },
            data: {
              deleted_at: new Date(),
              tokens_used: tokenUsage.total_tokens
            }
          });
        }

        return {
          success: true,
          message: 'Subscription cancelled successfully',
          data: subscription
        };
      } catch (error) {
        return {
          success: false,
          message: 'Subscription cancellation failed',
          error: error.message
        };
      }
    }

   

    async confirmPayment(paymentIntentId: string) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
        return paymentIntent;
      } catch (error) {
        throw new Error(`Payment confirmation error: ${error.message}`);
      }
    }

    // Add new method to check token usage
    async checkTokenUsage(userId: string, requiredTokens: number): Promise<boolean> {
      const tokenUsage = await this.prisma.tokenUsage.findFirst({
        where: {
          user_id: userId,
          subscription: {
            is_active: true
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    
      if (!tokenUsage) {
        return false;
      }
    
      // For unlimited plan (ENTERPRISE)
      if (tokenUsage.total_tokens === -1) {
        return true;
      }
    
      return (tokenUsage.total_tokens - tokenUsage.tokens_used) >= requiredTokens;
    }

    // Add method to update token usage
    async updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
      await this.prisma.tokenUsage.updateMany({
        where: {
          user_id: userId,
          subscription: {
            is_active: true
          }
        },
        data: {
          tokens_used: {
            increment: tokensUsed
          }
        }
      });
    }
    
    async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
      try {
        console.log("incomplete to complete")
        // Find the subscription and payment transaction
        const paymentTransaction = await this.prisma.paymentTransaction.findFirst({
          where: {
            reference_number: paymentIntent.metadata?.subscription_id,
            status: 'incomplete'
          }
        });
    
        if (paymentTransaction) {
          // Update payment transaction status
          await this.prisma.paymentTransaction.update({
            where: { id: paymentTransaction.id },
            data: { 
              status: 'completed',
              paid_amount: paymentIntent.amount / 100,
              paid_currency: paymentIntent.currency
            }
          });
          console.log(" complete")
          // Update subscription status
          if (paymentTransaction.subscription_id) {
            await this.prisma.subscription.update({
              where: { id: paymentTransaction.subscription_id },
              data: { 
                is_active: true,
                status: 1
              }
            });
          }
        }
    
        return paymentIntent;
      } catch (error) {
        throw new Error(`Payment intent handling error: ${error.message}`);
      }
    }
}


