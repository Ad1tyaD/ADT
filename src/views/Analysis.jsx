import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Shield,
  Target,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Loader2,
  BarChart3,
  Layers
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'

function Analysis() {
  const navigate = useNavigate()
  const { 
    lastAnalysis, 
    marketData, 
    acceptTrade, 
    isLoading,
    runAnalysis,
    isApiConfigured 
  } = useTrade()
  
  const [isAccepting, setIsAccepting] = useState(false)

  // Get verdict icon and color
  const getVerdictStyle = (verdict) => {
    switch (verdict?.toUpperCase()) {
      case 'BULLISH':
        return {
          icon: TrendingUp,
          bg: 'bg-profit/20',
          border: 'border-profit',
          text: 'text-profit-light',
          gradient: 'from-profit/30 to-profit/5'
        }
      case 'BEARISH':
        return {
          icon: TrendingDown,
          bg: 'bg-loss/20',
          border: 'border-loss',
          text: 'text-loss-light',
          gradient: 'from-loss/30 to-loss/5'
        }
      default:
        return {
          icon: Minus,
          bg: 'bg-neutral/20',
          border: 'border-neutral',
          text: 'text-neutral-light',
          gradient: 'from-neutral/30 to-neutral/5'
        }
    }
  }

  // Handle accepting the trade
  const handleAcceptTrade = async () => {
    setIsAccepting(true)
    
    const trade = acceptTrade(lastAnalysis, {
      date: marketData?.date,
      spotPrice: marketData?.spot?.close
    })

    if (trade) {
      setTimeout(() => {
        navigate('/')
      }, 500)
    }
    
    setIsAccepting(false)
  }

  // Handle re-analysis
  const handleReanalyze = async () => {
    if (marketData) {
      await runAnalysis(marketData)
    }
  }

  // No analysis available
  if (!lastAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-midnight-500/20 flex items-center justify-center mb-6">
          <BarChart3 className="w-10 h-10 text-midnight-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Analysis Available</h2>
        <p className="text-gray-400 mb-6 max-w-md">
          Enter market data to get AI-powered trade recommendations with defined risk strategies.
        </p>
        <button
          onClick={() => navigate('/input')}
          className="btn-primary flex items-center gap-2"
        >
          Enter Market Data
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const verdictStyle = getVerdictStyle(lastAnalysis.verdict)
  const VerdictIcon = verdictStyle.icon

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header with Verdict */}
      <div className={`glass-card p-6 bg-gradient-to-r ${verdictStyle.gradient}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl ${verdictStyle.bg} ${verdictStyle.border} border-2 flex items-center justify-center`}>
              <VerdictIcon className={`w-7 h-7 ${verdictStyle.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-3xl font-bold ${verdictStyle.text}`}>
                  {lastAnalysis.verdict}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${verdictStyle.bg} ${verdictStyle.text}`}>
                  {lastAnalysis.confidence} Confidence
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Market Structure Analysis Complete
              </p>
            </div>
          </div>
          
          <button
            onClick={handleReanalyze}
            disabled={isLoading || !isApiConfigured}
            className="btn-ghost flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Re-analyze
          </button>
        </div>
        
        {/* Summary */}
        <p className="mt-4 text-gray-300 leading-relaxed">
          {lastAnalysis.summary}
        </p>
      </div>

      {/* Analysis Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Market Structure */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-midnight-400" />
            Market Structure
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Trend</label>
              <p className="text-gray-200">{lastAnalysis.analysis?.trend}</p>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Momentum</label>
              <p className="text-gray-200">{lastAnalysis.analysis?.momentum}</p>
            </div>
            
            <div className="flex gap-6">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">PCR</label>
                <p className="text-xl font-mono font-semibold text-white">
                  {lastAnalysis.analysis?.pcr?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-xs text-gray-400">{lastAnalysis.analysis?.pcrInterpretation}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Max Pain</label>
                <p className="text-xl font-mono font-semibold text-white">
                  {lastAnalysis.analysis?.maxPain || 'N/A'}
                </p>
              </div>
            </div>

            {lastAnalysis.analysis?.keyLevels && (
              <div className="flex gap-6 pt-2 border-t border-white/10">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Support</label>
                  <p className="text-lg font-mono text-profit-light">
                    {lastAnalysis.analysis.keyLevels.support}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Resistance</label>
                  <p className="text-lg font-mono text-loss-light">
                    {lastAnalysis.analysis.keyLevels.resistance}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Strategy Recommendation */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Strategy: {lastAnalysis.strategy?.name}
          </h2>
          
          <div className="space-y-4">
            {/* Strategy Type Badge */}
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                lastAnalysis.strategy?.type === 'CREDIT' 
                  ? 'bg-profit/20 text-profit-light' 
                  : 'bg-midnight-500/30 text-midnight-300'
              }`}>
                {lastAnalysis.strategy?.type} SPREAD
              </span>
            </div>

            {/* Legs */}
            {lastAnalysis.strategy?.legs && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Legs</label>
                {lastAnalysis.strategy.legs.map((leg, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      leg.action === 'BUY' ? 'bg-profit/10' : 'bg-loss/10'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      leg.action === 'BUY' ? 'text-profit-light' : 'text-loss-light'
                    }`}>
                      {leg.action} {leg.strike} {leg.type}
                    </span>
                    <span className="text-sm font-mono text-gray-300">
                      ₹{leg.premium}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="text-xs text-gray-500">Max Profit</label>
                <p className="text-lg font-mono text-profit-light">
                  ₹{lastAnalysis.strategy?.maxProfit}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Max Loss</label>
                <p className="text-lg font-mono text-loss-light">
                  ₹{lastAnalysis.strategy?.maxLoss}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Risk:Reward</label>
                <p className="text-lg font-mono text-white">
                  {lastAnalysis.strategy?.riskReward}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Breakeven</label>
                <p className="text-lg font-mono text-white">
                  {Array.isArray(lastAnalysis.strategy?.breakeven) 
                    ? lastAnalysis.strategy.breakeven.join(' / ')
                    : lastAnalysis.strategy?.breakeven}
                </p>
              </div>
            </div>

            {/* Rationale */}
            {lastAnalysis.strategy?.rationale && (
              <div className="pt-2 border-t border-white/10">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Rationale</label>
                <p className="text-sm text-gray-300 mt-1">{lastAnalysis.strategy.rationale}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Levels - Kill Switch */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          Kill Switch Levels
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          {/* Profit Booking - Green */}
          <div className="zone-green p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-profit" />
              <span className="font-semibold text-profit-light">Profit Booking</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white mb-1">
              {lastAnalysis.alerts?.profitBooking?.level}
            </p>
            <p className="text-sm text-gray-400">
              {lastAnalysis.alerts?.profitBooking?.description}
            </p>
          </div>

          {/* Warning - Yellow */}
          <div className="zone-yellow p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="font-semibold text-warning-light">Warning Level</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white mb-1">
              {lastAnalysis.alerts?.warning?.level}
            </p>
            <p className="text-sm text-gray-400">
              {lastAnalysis.alerts?.warning?.description}
            </p>
          </div>

          {/* Abort - Red */}
          <div className="zone-red p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="w-5 h-5 text-loss" />
              <span className="font-semibold text-loss-light">Abort / Stop Loss</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white mb-1">
              {lastAnalysis.alerts?.abort?.level}
            </p>
            <p className="text-sm text-gray-400">
              {lastAnalysis.alerts?.abort?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <button
          onClick={() => navigate('/input')}
          className="btn-ghost"
        >
          Modify Data
        </button>
        <button
          onClick={handleAcceptTrade}
          disabled={isAccepting}
          className="btn-success flex items-center justify-center gap-2"
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Target className="w-4 h-4" />
          )}
          Accept Trade
        </button>
      </div>
    </div>
  )
}

export default Analysis

