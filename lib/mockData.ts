export type ChangeType = 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED'

export interface Investor {
  id: string
  nameCn: string
  nameEn: string
  institution: string
  cik: string
  color: string
  updated: boolean
  lastQuarter: string
  totalValue: number
  holdingsCount: number
}

export const INVESTOR_COLORS: Record<string, { bg: string; text: string; light: string; border: string }> = {
  buffett: { bg: '#3b82f6', text: '#1d4ed8', light: '#eff6ff', border: '#93c5fd' },
  duan:    { bg: '#22c55e', text: '#15803d', light: '#f0fdf4', border: '#86efac' },
  lilu:    { bg: '#a855f7', text: '#7e22ce', light: '#faf5ff', border: '#d8b4fe' },
  ark:     { bg: '#f97316', text: '#c2410c', light: '#fff7ed', border: '#fdba74' },
  norbert: { bg: '#ef4444', text: '#b91c1c', light: '#fef2f2', border: '#fca5a5' },
}

export const CHANGE_META: Record<ChangeType, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  NEW:       { bg: '#ecfdf5', text: '#065f46', border: '#10b981', label: '新建仓', emoji: '✨' },
  INCREASED: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6', label: '加仓',   emoji: '↑' },
  DECREASED: { bg: '#fffbeb', text: '#92400e', border: '#f59e0b', label: '减仓',   emoji: '↓' },
  EXITED:    { bg: '#fef2f2', text: '#991b1b', border: '#ef4444', label: '清仓',   emoji: '✕' },
}

export const investors: Investor[] = [
  { id: 'buffett', nameCn: '巴菲特',      nameEn: 'Warren Buffett', institution: 'Berkshire Hathaway',     cik: '0001067983', color: '#3b82f6', updated: true,  lastQuarter: '2024 Q4', totalValue: 299100000000, holdingsCount: 45 },
  { id: 'duan',    nameCn: '段永平',      nameEn: 'Duan Yongpin',   institution: 'H&H International',      cik: 'TBD',        color: '#22c55e', updated: true,  lastQuarter: '2024 Q4', totalValue:   1800000000, holdingsCount: 4  },
  { id: 'lilu',    nameCn: '李录',        nameEn: 'Li Lu',          institution: 'Himalaya Capital',        cik: 'TBD',        color: '#a855f7', updated: false, lastQuarter: '2024 Q3', totalValue:   3500000000, holdingsCount: 8  },
  { id: 'ark',     nameCn: 'Cathie Wood', nameEn: 'Cathie Wood',    institution: 'ARK Investment',          cik: '0001697748', color: '#f97316', updated: true,  lastQuarter: '2024 Q4', totalValue:  11200000000, holdingsCount: 32 },
  { id: 'norbert', nameCn: 'Norbert Lou', nameEn: 'Norbert Lou',    institution: 'Punch Card Capital',      cik: 'TBD',        color: '#ef4444', updated: true,  lastQuarter: '2024 Q4', totalValue:    580000000, holdingsCount: 3  },
]

export interface PositionChange {
  id: string
  investorId: string
  ticker: string
  companyName: string
  changeType: ChangeType
  pctChange?: number
  valueUsd: number
  shares: number
  sector: string
}

export const recentChanges: PositionChange[] = [
  // 新建仓
  { id: '1',  investorId: 'buffett', ticker: 'SFM',   companyName: 'Sprouts Farmers Market', changeType: 'NEW',       valueUsd: 1800000000,  shares: 23400000,  sector: '消费' },
  { id: '2',  investorId: 'ark',     ticker: 'RBLX',  companyName: 'Roblox Corp',            changeType: 'NEW',       valueUsd:  320000000,  shares:  8900000,  sector: '科技' },
  { id: '3',  investorId: 'duan',    ticker: 'GOOG',  companyName: 'Alphabet Inc',           changeType: 'NEW',       valueUsd:  450000000,  shares:  3200000,  sector: '科技' },
  { id: '4',  investorId: 'norbert', ticker: 'META',  companyName: 'Meta Platforms',         changeType: 'NEW',       valueUsd:  180000000,  shares:   310000,  sector: '科技' },
  // 加仓
  { id: '5',  investorId: 'buffett', ticker: 'OXY',   companyName: 'Occidental Petroleum',  changeType: 'INCREASED', pctChange:  8.4, valueUsd: 13800000000, shares: 255000000, sector: '能源' },
  { id: '6',  investorId: 'ark',     ticker: 'TSLA',  companyName: 'Tesla Inc',              changeType: 'INCREASED', pctChange: 15.2, valueUsd:  2800000000, shares:  17000000, sector: '汽车' },
  { id: '7',  investorId: 'duan',    ticker: 'AAPL',  companyName: 'Apple Inc',              changeType: 'INCREASED', pctChange:  5.3, valueUsd:   980000000, shares:   5200000, sector: '科技' },
  { id: '8',  investorId: 'lilu',    ticker: 'BYD',   companyName: 'BYD Company',            changeType: 'INCREASED', pctChange: 12.1, valueUsd:  1600000000, shares: 225000000, sector: '新能源' },
  // 减仓
  { id: '9',  investorId: 'buffett', ticker: 'AAPL',  companyName: 'Apple Inc',              changeType: 'DECREASED', pctChange: -13.0, valueUsd: 74000000000, shares: 300000000, sector: '科技' },
  { id: '10', investorId: 'ark',     ticker: 'COIN',  companyName: 'Coinbase Global',        changeType: 'DECREASED', pctChange: -22.0, valueUsd:   450000000, shares:   2100000, sector: '加密' },
  { id: '11', investorId: 'norbert', ticker: 'GOOG',  companyName: 'Alphabet Inc',           changeType: 'DECREASED', pctChange:  -8.0, valueUsd:   240000000, shares:   1700000, sector: '科技' },
  // 清仓
  { id: '12', investorId: 'buffett', ticker: 'PARA',  companyName: 'Paramount Global',       changeType: 'EXITED',    valueUsd: 0, shares: 0, sector: '传媒' },
  { id: '13', investorId: 'ark',     ticker: 'TDOC',  companyName: 'Teladoc Health',         changeType: 'EXITED',    valueUsd: 0, shares: 0, sector: '医疗' },
]

export interface Position {
  ticker: string
  companyName: string
  shares: number
  valueUsd: number
  pctOfPortfolio: number
  changeType?: ChangeType
  pctChange?: number
  sector: string
}

export const investorPositions: Record<string, Record<string, Position[]>> = {
  buffett: {
    '2024Q4': [
      { ticker: 'AAPL',  companyName: 'Apple Inc',            shares: 300000000, valueUsd: 74000000000, pctOfPortfolio: 24.7, changeType: 'DECREASED', pctChange: -13.0, sector: '科技' },
      { ticker: 'AXP',   companyName: 'American Express',     shares: 151610700, valueUsd: 41100000000, pctOfPortfolio: 13.7, sector: '金融' },
      { ticker: 'BAC',   companyName: 'Bank of America',      shares: 803693384, valueUsd: 34200000000, pctOfPortfolio: 11.4, sector: '金融' },
      { ticker: 'KO',    companyName: 'Coca-Cola',            shares: 400000000, valueUsd: 23500000000, pctOfPortfolio: 7.8,  sector: '消费' },
      { ticker: 'CVX',   companyName: 'Chevron',              shares: 118610534, valueUsd: 18700000000, pctOfPortfolio: 6.2,  sector: '能源' },
      { ticker: 'OXY',   companyName: 'Occidental Petroleum', shares: 255000000, valueUsd: 13800000000, pctOfPortfolio: 4.6,  changeType: 'INCREASED', pctChange: 8.4, sector: '能源' },
      { ticker: 'MCO',   companyName: "Moody's Corp",         shares:  23600000, valueUsd:  9600000000, pctOfPortfolio: 3.2,  sector: '金融' },
      { ticker: 'VZ',    companyName: 'Verizon Comm.',        shares: 158824959, valueUsd:  7600000000, pctOfPortfolio: 2.5,  sector: '电信' },
      { ticker: 'KHC',   companyName: 'Kraft Heinz',          shares: 325634818, valueUsd:  9300000000, pctOfPortfolio: 3.1,  sector: '消费' },
      { ticker: 'SFM',   companyName: 'Sprouts Farmers Mkt',  shares:  23400000, valueUsd:  1800000000, pctOfPortfolio: 0.6,  changeType: 'NEW', sector: '消费' },
    ],
    '2024Q3': [
      { ticker: 'AAPL',  companyName: 'Apple Inc',            shares: 400000000, valueUsd: 85000000000, pctOfPortfolio: 27.3, sector: '科技' },
      { ticker: 'AXP',   companyName: 'American Express',     shares: 151610700, valueUsd: 38000000000, pctOfPortfolio: 12.2, sector: '金融' },
      { ticker: 'BAC',   companyName: 'Bank of America',      shares: 900000000, valueUsd: 37000000000, pctOfPortfolio: 11.9, sector: '金融' },
      { ticker: 'KO',    companyName: 'Coca-Cola',            shares: 400000000, valueUsd: 22000000000, pctOfPortfolio: 7.1,  sector: '消费' },
      { ticker: 'CVX',   companyName: 'Chevron',              shares: 118610534, valueUsd: 17500000000, pctOfPortfolio: 5.6,  sector: '能源' },
      { ticker: 'OXY',   companyName: 'Occidental Petroleum', shares: 235000000, valueUsd: 12700000000, pctOfPortfolio: 4.1,  sector: '能源' },
      { ticker: 'MCO',   companyName: "Moody's Corp",         shares:  23600000, valueUsd:  8900000000, pctOfPortfolio: 2.9,  sector: '金融' },
      { ticker: 'PARA',  companyName: 'Paramount Global',     shares:  63300000, valueUsd:   890000000, pctOfPortfolio: 0.3,  sector: '传媒' },
    ],
    '2024Q2': [
      { ticker: 'AAPL',  companyName: 'Apple Inc',            shares: 789369450, valueUsd: 134000000000, pctOfPortfolio: 40.1, sector: '科技' },
      { ticker: 'AXP',   companyName: 'American Express',     shares: 151610700, valueUsd:  36000000000, pctOfPortfolio: 10.8, sector: '金融' },
      { ticker: 'BAC',   companyName: 'Bank of America',      shares: 942000000, valueUsd:  38000000000, pctOfPortfolio: 11.4, sector: '金融' },
    ],
  },
  duan: {
    '2024Q4': [
      { ticker: 'AAPL',  companyName: 'Apple Inc',      shares: 5200000, valueUsd: 980000000, pctOfPortfolio: 54.4, changeType: 'INCREASED', pctChange: 5.3, sector: '科技' },
      { ticker: 'GOOG',  companyName: 'Alphabet Inc',   shares: 3200000, valueUsd: 450000000, pctOfPortfolio: 25.0, changeType: 'NEW', sector: '科技' },
      { ticker: 'MSFT',  companyName: 'Microsoft Corp', shares: 1800000, valueUsd: 320000000, pctOfPortfolio: 17.8, sector: '科技' },
      { ticker: 'BRK.B', companyName: 'Berkshire Hath.',shares:  950000, valueUsd:  50000000, pctOfPortfolio: 2.8,  sector: '金融' },
    ],
    '2024Q3': [
      { ticker: 'AAPL',  companyName: 'Apple Inc',      shares: 4940000, valueUsd: 880000000, pctOfPortfolio: 60.1, sector: '科技' },
      { ticker: 'MSFT',  companyName: 'Microsoft Corp', shares: 1800000, valueUsd: 310000000, pctOfPortfolio: 21.2, sector: '科技' },
      { ticker: 'BRK.B', companyName: 'Berkshire Hath.',shares:  950000, valueUsd:  48000000, pctOfPortfolio: 3.3,  sector: '金融' },
    ],
  },
  lilu: {
    '2024Q4': [
      { ticker: 'BYD',   companyName: 'BYD Company',    shares: 225000000, valueUsd: 1600000000, pctOfPortfolio: 45.7, changeType: 'INCREASED', pctChange: 12.1, sector: '新能源' },
      { ticker: 'BABA',  companyName: 'Alibaba Group',  shares:  12000000, valueUsd:  960000000, pctOfPortfolio: 27.4, sector: '科技' },
      { ticker: 'GOOGL', companyName: 'Alphabet Inc',   shares:   5000000, valueUsd:  720000000, pctOfPortfolio: 20.6, sector: '科技' },
      { ticker: 'BAC',   companyName: 'Bank of America',shares:  15000000, valueUsd:  220000000, pctOfPortfolio: 6.3,  sector: '金融' },
    ],
  },
  ark: {
    '2024Q4': [
      { ticker: 'TSLA',  companyName: 'Tesla Inc',        shares: 17000000, valueUsd: 2800000000, pctOfPortfolio: 25.0, changeType: 'INCREASED', pctChange: 15.2, sector: '汽车' },
      { ticker: 'COIN',  companyName: 'Coinbase Global',  shares:  2100000, valueUsd:  450000000, pctOfPortfolio: 4.0,  changeType: 'DECREASED', pctChange: -22.0, sector: '加密' },
      { ticker: 'RBLX',  companyName: 'Roblox Corp',      shares:  8900000, valueUsd:  320000000, pctOfPortfolio: 2.9,  changeType: 'NEW', sector: '科技' },
      { ticker: 'ROKU',  companyName: 'Roku Inc',         shares:  4200000, valueUsd:  290000000, pctOfPortfolio: 2.6,  sector: '媒体' },
      { ticker: 'EXAS',  companyName: 'Exact Sciences',   shares:  6800000, valueUsd:  280000000, pctOfPortfolio: 2.5,  sector: '医疗' },
      { ticker: 'CRSP',  companyName: 'CRISPR Therap.',   shares:  3900000, valueUsd:  220000000, pctOfPortfolio: 2.0,  sector: '医疗' },
    ],
  },
  norbert: {
    '2024Q4': [
      { ticker: 'BRK.B', companyName: 'Berkshire Hath.',  shares: 1200000, valueUsd: 320000000, pctOfPortfolio: 55.2, sector: '金融' },
      { ticker: 'GOOG',  companyName: 'Alphabet Inc',     shares: 1700000, valueUsd: 240000000, pctOfPortfolio: 41.4, changeType: 'DECREASED', pctChange: -8.0, sector: '科技' },
      { ticker: 'META',  companyName: 'Meta Platforms',   shares:  310000, valueUsd: 180000000, pctOfPortfolio: 31.0, changeType: 'NEW', sector: '科技' },
    ],
  },
}

export const topBuys = [
  { ticker: 'OXY',   companyName: 'Occidental Petroleum',  totalValueAdded: 1100000000, investors: ['巴菲特'] },
  { ticker: 'TSLA',  companyName: 'Tesla Inc',              totalValueAdded:  850000000, investors: ['Cathie Wood'] },
  { ticker: 'BYD',   companyName: 'BYD Company',            totalValueAdded:  740000000, investors: ['李录'] },
  { ticker: 'AAPL',  companyName: 'Apple Inc',              totalValueAdded:  690000000, investors: ['段永平'] },
  { ticker: 'GOOG',  companyName: 'Alphabet Inc',           totalValueAdded:  450000000, investors: ['段永平', 'Norbert Lou'] },
]

export const topSells = [
  { ticker: 'AAPL',  companyName: 'Apple Inc',              totalValueRemoved: 11000000000, investors: ['巴菲特'] },
  { ticker: 'BAC',   companyName: 'Bank of America',        totalValueRemoved:  4800000000, investors: ['巴菲特'] },
  { ticker: 'COIN',  companyName: 'Coinbase Global',        totalValueRemoved:   128000000, investors: ['Cathie Wood'] },
  { ticker: 'PARA',  companyName: 'Paramount Global',       totalValueRemoved:   200000000, investors: ['巴菲特'] },
  { ticker: 'TDOC',  companyName: 'Teladoc Health',         totalValueRemoved:    45000000, investors: ['Cathie Wood'] },
]

export const consensusHoldings = [
  { ticker: 'AAPL',  companyName: 'Apple Inc',       investorCount: 3, investors: ['巴菲特', '段永平', 'Norbert Lou'] },
  { ticker: 'GOOG',  companyName: 'Alphabet Inc',    investorCount: 3, investors: ['段永平', '李录', 'Norbert Lou'] },
  { ticker: 'BAC',   companyName: 'Bank of America', investorCount: 2, investors: ['巴菲特', '李录'] },
  { ticker: 'BRK.B', companyName: 'Berkshire Hath.', investorCount: 2, investors: ['段永平', 'Norbert Lou'] },
]

export const overallAISummary = '本季度大机构整体偏防御，巴菲特大幅减持苹果锁定利润并大量囤积现金；ARK逆势加仓特斯拉押注FSD商业化；段永平首次建仓谷歌值得关注，彰显对AI赛道的认可。李录坚守BYD，对中国新能源长期转型信念不变。'

export const investorAISummaries: Record<string, {
  summaryOneLine: string
  bullPoints: string[]
  bearPoints: string[]
  recommendation: string
  keyMoves: { ticker: string; action: string; reasoning: string }[]
}> = {
  buffett: {
    summaryOneLine: '本季度大幅减持苹果、新建Sprouts Farmers Market仓位，显示对估值敏感性的一贯判断。现金储备再创新高，等待更优买入机会。',
    bullPoints: [
      'OXY持续加仓，看好能源行业长期价值和股东回报能力',
      'SFM新建仓显示对低估值消费类股票的兴趣',
      '保险浮存金驱动的复利机器依然高效运转，自由现金流强劲',
    ],
    bearPoints: [
      'AAPL减持13%，暗示对科技股当前估值偏高的担忧',
      '现金储备再创历史新高超2000亿，市场中缺乏足够便宜的机会',
      'BAC持续减持可能反映对银行业利差压缩和信贷周期的担忧',
    ],
    recommendation: '继续重仓价值股，OXY和AXP是核心仓位。AAPL虽减持但仍是第一大持仓。建议跟随其配置能源+消费品防御板块，现金等待更好买入机会。',
    keyMoves: [
      { ticker: 'AAPL',  action: '减仓 13%', reasoning: '估值偏高，锁定利润，但仍维持核心仓位' },
      { ticker: 'OXY',   action: '加仓 8.4%', reasoning: '能源行业估值洼地，自由现金流强，股东回报优秀' },
      { ticker: 'SFM',   action: '新建仓', reasoning: '低估值消费品，抗通胀属性强' },
      { ticker: 'PARA',  action: '清仓', reasoning: '流媒体竞争持续恶化，承认投资失误' },
    ],
  },
  duan: {
    summaryOneLine: '首次建仓谷歌，并继续增持苹果，显示其对优质科技公司护城河的长期信念。持仓高度集中于"最好的公司"。',
    bullPoints: [
      '首次买入GOOG，看好其搜索垄断地位和在AI时代的长期竞争优势',
      'AAPL持续增持，对苹果生态系统粘性和服务收入持续增长保持高度信心',
      '集中持仓少数优质公司，与"押注最好的公司"投资理念高度一致',
    ],
    bearPoints: [
      '科技股集中度过高（>97%仓位），缺乏行业分散，波动风险大',
      'GOOG面临来自Perplexity/ChatGPT的AI搜索竞争威胁',
      '持仓公司均为美国科技巨头，地缘政治风险集中',
    ],
    recommendation: '持仓风格高度集中，是典型的集中投资哲学。AAPL+GOOG构成核心，适合长持、不做短线操作。建议参考其仓位方向但分散风险。',
    keyMoves: [
      { ticker: 'GOOG', action: '新建仓', reasoning: '估值合理，AI能力强，搜索护城河深厚' },
      { ticker: 'AAPL', action: '加仓 5.3%', reasoning: '服务收入持续增长，生态系统粘性极强' },
    ],
  },
  lilu: {
    summaryOneLine: '继续加仓BYD，坚守对中国新能源转型的长期判断。持仓稳定，低换手，是典型的长期价值投资者。',
    bullPoints: [
      'BYD加仓12%，持续看好中国电动车全球化扩张和技术领先优势',
      'BABA持仓稳定，看好中国消费互联网在AI时代的复苏潜力',
      'GOOGL持有，用美国科技龙头分散中国资产的地缘政治风险',
    ],
    bearPoints: [
      '中国资产政治风险持续存在，监管不确定性高',
      'BYD国内市场价格战激烈，利润率承压',
      '持仓高度集中在中国相关资产，美元走强时面临汇率损失',
    ],
    recommendation: '李录对中国优质企业的长期信念坚定，其对BYD的持续加仓具有参考价值。但需对中国监管风险保持警惕，BYD的全球化进展是最关键的观察指标。',
    keyMoves: [
      { ticker: 'BYD', action: '加仓 12.1%', reasoning: '全球电动车市场份额持续扩大，出海战略加速' },
    ],
  },
  ark: {
    summaryOneLine: '大幅加仓特斯拉押注FSD和Robotaxi商业化，新建Roblox仓位看好AI内容平台，同时减持Coinbase锁定部分加密利润。',
    bullPoints: [
      'TSLA加仓15%，押注FSD技术突破和Robotaxi大规模商业化带来的指数级收入增长',
      'RBLX新建仓，AI生成内容将重塑游戏平台，用户创作生态价值持续放大',
      '组合紧跟颠覆性创新主题，长期押注方向清晰且一致',
    ],
    bearPoints: [
      'COIN减仓22%，对加密货币监管不确定性有所顾虑',
      '组合波动率极高，不适合风险承受能力低的投资者',
      '过去3年跑输大盘，颠覆性主题的实现时间窗口难以精准把握',
    ],
    recommendation: 'ARK的投资是纯粹的技术颠覆主题押注，TSLA是绝对核心仓位。适合认同颠覆性创新逻辑且能承受高波动的投资者，建议小仓位参考，不宜重仓跟随。',
    keyMoves: [
      { ticker: 'TSLA', action: '加仓 15.2%', reasoning: 'FSD商业化突破在即，Robotaxi将开创全新收入来源' },
      { ticker: 'RBLX', action: '新建仓',     reasoning: 'AI时代内容创作平台，用户黏性高，创作者经济潜力大' },
      { ticker: 'COIN', action: '减仓 22%',   reasoning: '监管不确定性上升，在高位锁定部分加密利润' },
      { ticker: 'TDOC', action: '清仓',        reasoning: '远程医疗竞争加剧，商业模式验证不及预期' },
    ],
  },
  norbert: {
    summaryOneLine: '新建Meta仓位，持仓极度集中于3只股票，风格与巴菲特相似，是典型的集中重仓长期投资者。',
    bullPoints: [
      'META新建仓，看好其AI广告变现能力和Reels的持续渗透',
      'BRK.B持有，间接获得巴菲特组合的多样化和稳定性',
      '集中持仓有限几只，充分研究后重注，避免过度分散',
    ],
    bearPoints: [
      '持仓数量极少（仅3只），单只股票风险极高',
      'META估值偏高，Metaverse相关投入短期回报仍不明确',
      '仓位总计超过100%，可能涉及杠杆，风险放大',
    ],
    recommendation: '典型集中投资风格，每只持仓都是深度研究后的重注。适合了解其风格后作为选股参考。META的加入显示其对AI赋能广告业务的认可。',
    keyMoves: [
      { ticker: 'META', action: '新建仓',    reasoning: 'AI驱动广告效率大幅提升，Reels变现加速，估值合理' },
      { ticker: 'GOOG', action: '减仓 8%',   reasoning: '为META仓位腾挪资金，获利了结' },
    ],
  },
}

export const positionHistory: Record<string, { quarter: string; valueUsd: number; shares: number }[]> = {
  'buffett-AAPL': [
    { quarter: '23Q1', valueUsd: 151000000000, shares: 916000000 },
    { quarter: '23Q2', valueUsd: 177000000000, shares: 916000000 },
    { quarter: '23Q3', valueUsd: 155000000000, shares: 916000000 },
    { quarter: '23Q4', valueUsd: 174000000000, shares: 906000000 },
    { quarter: '24Q1', valueUsd: 135000000000, shares: 789000000 },
    { quarter: '24Q2', valueUsd:  84000000000, shares: 400000000 },
    { quarter: '24Q3', valueUsd:  85000000000, shares: 400000000 },
    { quarter: '24Q4', valueUsd:  74000000000, shares: 300000000 },
  ],
}

export const availableQuarters: Record<string, string[]> = {
  buffett: ['2024Q4', '2024Q3', '2024Q2'],
  duan:    ['2024Q4', '2024Q3'],
  lilu:    ['2024Q4'],
  ark:     ['2024Q4'],
  norbert: ['2024Q4'],
}

export function formatValue(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(0)}M`
  return `$${value.toLocaleString()}`
}

export function formatShares(shares: number): string {
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(2)}B`
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(1)}M`
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`
  return shares.toString()
}

export function quarterLabel(q: string): string {
  return q.replace('Q', ' Q')
}
