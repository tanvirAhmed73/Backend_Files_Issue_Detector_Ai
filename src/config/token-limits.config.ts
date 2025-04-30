import { TokenLimit } from '@prisma/client';

export interface TokenLimitConfig {
  tokens: number;
  description: string;
  pricePerToken?: number;  // Price per 1K tokens
}

export const TOKEN_LIMITS: Record<TokenLimit, TokenLimitConfig> = {
  [TokenLimit.PAY_AS_YOU_GO]: {
    tokens: 15000,
    description: 'Pay as you go - 15K tokens',
    pricePerToken: 0.002  // $2 per 1K tokens
  },
  [TokenLimit.BASIC]: {
    tokens: 250000,
    description: 'Basic plan - 250K tokens',
    pricePerToken: 0.0015  // $1.50 per 1K tokens
  },
  [TokenLimit.PRO]: {
    tokens: 1000000,
    description: 'Pro plan - 1M tokens',
    pricePerToken: 0.001  // $1 per 1K tokens
  },
  [TokenLimit.ENTERPRISE]: {
    tokens: -1,
    description: 'Enterprise plan - Unlimited tokens',
    pricePerToken: 0.0008  // $0.80 per 1K tokens
  }
};

export const getTokenLimit = (plan: TokenLimit): number => {
  return TOKEN_LIMITS[plan].tokens;
};

export const getTokenPrice = (plan: TokenLimit): number => {
  return TOKEN_LIMITS[plan].pricePerToken || 0;
};

export const calculateTokenCost = (plan: TokenLimit, tokenCount: number): number => {
  const pricePerToken = getTokenPrice(plan);
  return (tokenCount / 1000) * pricePerToken;
};

export const formatTokenAmount = (tokens: number): string => {
  if (tokens === -1) return 'Unlimited';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}; 