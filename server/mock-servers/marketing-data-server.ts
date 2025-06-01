import express from 'express';

interface MarketDataRequest {
  businessType: string;
  targetMarket: string;
  budget: number;
  timestamp: string;
}

interface MarketDataResponse {
  marketSize: number;
  competitionLevel: 'low' | 'medium' | 'high';
  averageCPC: number;
  seasonalTrends: {
    peak: string;
    low: string;
    growth: number;
  };
  industryInsights: {
    topKeywords: string[];
    emergingTrends: string[];
    averageConversionRate: number;
  };
  competitorAnalysis: {
    topCompetitors: string[];
    marketShare: Record<string, number>;
    pricingStrategy: string;
  };
  recommendations: {
    optimalChannels: string[];
    budgetAllocation: Record<string, number>;
    targetingTips: string[];
  };
}

const app = express();
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Add authentication middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  next();
});

// Market data analysis endpoint
app.post('/api/market-analysis', (req, res) => {
  const { businessType, targetMarket, budget }: MarketDataRequest = req.body;

  // Simulate processing delay
  setTimeout(() => {
    const response: MarketDataResponse = generateMarketData(businessType, targetMarket, budget);
    res.json(response);
  }, 1000 + Math.random() * 2000); // 1-3 second delay
});

function generateMarketData(businessType: string, targetMarket: string, budget: number): MarketDataResponse {
  const businessTypes = {
    'ecommerce': {
      marketSize: 50000000,
      competition: 'high' as const,
      avgCPC: 2.5,
      keywords: ['online shopping', 'product deals', 'free shipping'],
      channels: ['Google Ads', 'Facebook', 'Instagram'],
      conversionRate: 2.3
    },
    'saas': {
      marketSize: 25000000,
      competition: 'medium' as const,
      avgCPC: 8.5,
      keywords: ['software solutions', 'business tools', 'productivity'],
      channels: ['Google Ads', 'LinkedIn', 'Content Marketing'],
      conversionRate: 3.1
    },
    'consulting': {
      marketSize: 15000000,
      competition: 'low' as const,
      avgCPC: 12.0,
      keywords: ['business consulting', 'expert advice', 'strategy'],
      channels: ['LinkedIn', 'Google Ads', 'Referrals'],
      conversionRate: 4.2
    }
  };

  const typeKey = businessType.toLowerCase();
  const baseData = businessTypes[typeKey as keyof typeof businessTypes] || businessTypes.saas;

  // Add market-specific adjustments
  const marketMultiplier = getMarketMultiplier(targetMarket);
  const budgetInfluence = Math.log10(budget / 1000) / 2;

  return {
    marketSize: Math.floor(baseData.marketSize * marketMultiplier),
    competitionLevel: baseData.competition,
    averageCPC: Math.round((baseData.avgCPC * marketMultiplier + budgetInfluence) * 100) / 100,
    seasonalTrends: {
      peak: getSeasonalPeak(businessType),
      low: getSeasonalLow(businessType),
      growth: Math.floor(Math.random() * 30) + 10
    },
    industryInsights: {
      topKeywords: baseData.keywords,
      emergingTrends: generateEmergingTrends(businessType),
      averageConversionRate: baseData.conversionRate
    },
    competitorAnalysis: {
      topCompetitors: generateCompetitors(businessType),
      marketShare: generateMarketShare(),
      pricingStrategy: getPricingStrategy(baseData.competition)
    },
    recommendations: {
      optimalChannels: baseData.channels,
      budgetAllocation: generateBudgetAllocation(baseData.channels, budget),
      targetingTips: generateTargetingTips(targetMarket, businessType)
    }
  };
}

function getMarketMultiplier(market: string): number {
  const multipliers = {
    'US': 1.2,
    'Europe': 1.0,
    'Asia': 0.8,
    'Global': 1.1
  };
  return multipliers[market as keyof typeof multipliers] || 1.0;
}

function getSeasonalPeak(businessType: string): string {
  const peaks = {
    'ecommerce': 'Q4 (Holiday Season)',
    'saas': 'Q1 (New Year Planning)',
    'consulting': 'Q2 (Mid-Year Strategy)'
  };
  return peaks[businessType.toLowerCase() as keyof typeof peaks] || 'Q4';
}

function getSeasonalLow(businessType: string): string {
  const lows = {
    'ecommerce': 'Q1 (Post-Holiday)',
    'saas': 'Q3 (Summer Slowdown)',
    'consulting': 'Q4 (Budget Constraints)'
  };
  return lows[businessType.toLowerCase() as keyof typeof lows] || 'Q1';
}

function generateEmergingTrends(businessType: string): string[] {
  const trends = {
    'ecommerce': ['social commerce', 'sustainable products', 'AR try-on'],
    'saas': ['AI integration', 'no-code solutions', 'remote collaboration'],
    'consulting': ['digital transformation', 'ESG consulting', 'change management']
  };
  return trends[businessType.toLowerCase() as keyof typeof trends] || ['innovation', 'automation', 'efficiency'];
}

function generateCompetitors(businessType: string): string[] {
  return [
    `${businessType} Leader Corp`,
    `Global ${businessType} Solutions`,
    `${businessType} Innovators Ltd`
  ];
}

function generateMarketShare(): Record<string, number> {
  const shares = [35, 25, 20, 20];
  return {
    'Market Leader': shares[0],
    'Strong Competitor': shares[1],
    'Growing Player': shares[2],
    'Others': shares[3]
  };
}

function getPricingStrategy(competition: string): string {
  const strategies = {
    'low': 'Premium pricing with value differentiation',
    'medium': 'Competitive pricing with feature advantages',
    'high': 'Cost leadership with efficiency focus'
  };
  return strategies[competition];
}

function generateBudgetAllocation(channels: string[], budget: number): Record<string, number> {
  const allocation: Record<string, number> = {};
  const portions = [0.4, 0.3, 0.2, 0.1];
  
  channels.forEach((channel, index) => {
    allocation[channel] = Math.floor(budget * (portions[index] || 0.1));
  });
  
  return allocation;
}

function generateTargetingTips(market: string, businessType: string): string[] {
  return [
    `Focus on ${market} market demographics aged 25-45`,
    `Target decision-makers in ${businessType} industry`,
    'Use lookalike audiences based on existing customers',
    'Implement geographic targeting for optimal reach'
  ];
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.MOCK_SERVER_PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Mock Marketing Data Server running on port ${PORT}`);
  });
}

export { app as mockMarketingServer };