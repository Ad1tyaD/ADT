import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Plus,
  History,
  Loader2,
  BarChart3,
  Wallet,
  Trophy,
  Skull,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTrade } from '../context/TradeContext'

// Routine Check Modal
function RoutineModal({ trade, onClose, onSubmit, isLoading }) {
  const [currentSpot, setCurrentSpot] = useState('')
  const [currentPremium, setCurrentPremium] = useState('')
  const [daysToExpiry, setDaysToExpiry] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      currentSpot: parseFloat(currentSpot),
      currentDate: new Date().toISOString().split('T')[0],
      currentPremium: currentPremium ? parseFloat(currentPremium) : null,
      daysToExpiry: daysToExpiry ? parseInt(daysToExpiry) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-midnight-500 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">3:15 PM Routine</h2>
            <p className="text-sm text-gray-400">End-of-day position review</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Spot Price *</label>
            <input
              type="number"
              step="0.01"
              value={currentSpot}
              onChange={(e) => setCurrentSpot(e.target.value)}
              placeholder="21650.00"
              required
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Current Position Premium</label>
            <input
              type="number"
              step="0.01"
              value={currentPremium}
              onChange={(e) => setCurrentPremium(e.target.value)}
              placeholder="Optional"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Days to Expiry</label>
            <input
              type="number"
              value={daysToExpiry}
              onChange={(e) => setDaysToExpiry(e.target.value)}
              placeholder="Optional"
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !currentSpot}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Run Check
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Close Trade Modal
function CloseTradeModal({ trade, onClose, onSubmit }) {
  const [exitSpot, setExitSpot] = useState('')
  const [exitPremium, setExitPremium] = useState('')
  const [reason, setReason] = useState('target')

  const calculatePnL = () => {
    if (!exitPremium) return 0
    const entryPremium = trade.strategy?.netPremium || 0
    // For credit spreads, profit when exit premium < entry premium
    // For debit spreads, profit when exit premium > entry premium
    const isCredit = trade.strategy?.type === 'CREDIT'
    return isCredit 
      ? entryPremium - parseFloat(exitPremium)
      : parseFloat(exitPremium) - entryPremium
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      exitSpot: parseFloat(exitSpot),
      exitPremium: parseFloat(exitPremium),
      reason,
      realizedPnL: calculatePnL()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-loss to-loss-dark flex items-center justify-center">
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Close Trade</h2>
            <p className="text-sm text-gray-400">Record exit details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Exit Spot Price *</label>
            <input
              type="number"
              step="0.01"
              value={exitSpot}
              onChange={(e) => setExitSpot(e.target.value)}
              required
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Exit Premium *</label>
            <input
              type="number"
              step="0.01"
              value={exitPremium}
              onChange={(e) => setExitPremium(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Close Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full"
            >
              <option value="target">Target Hit</option>
              <option value="stop_loss">Stop Loss</option>
              <option value="time_decay">Time Decay</option>
              <option value="thesis_invalid">Thesis Invalid</option>
              <option value="manual">Manual Exit</option>
            </select>
          </div>

          {exitPremium && (
            <div className={`p-3 rounded-lg ${calculatePnL() >= 0 ? 'bg-profit/20' : 'bg-loss/20'}`}>
              <label className="text-xs text-gray-400">Calculated P&L</label>
              <p className={`text-2xl font-mono font-bold ${calculatePnL() >= 0 ? 'text-profit-light' : 'text-loss-light'}`}>
                {calculatePnL() >= 0 ? '+' : ''}₹{calculatePnL().toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger flex-1"
            >
              Close Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Routine Result Display
function RoutineResult({ result, onDismiss }) {
  const getRecommendationStyle = (rec) => {
    switch (rec) {
      case 'HOLD':
        return { bg: 'bg-profit/20', text: 'text-profit-light', icon: CheckCircle2 }
      case 'EXIT':
        return { bg: 'bg-loss/20', text: 'text-loss-light', icon: XCircle }
      case 'ADJUST':
        return { bg: 'bg-warning/20', text: 'text-warning-light', icon: AlertTriangle }
      default:
        return { bg: 'bg-neutral/20', text: 'text-neutral-light', icon: Clock }
    }
  }

  const style = getRecommendationStyle(result.recommendation)
  const Icon = style.icon

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-14 h-14 rounded-xl ${style.bg} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${style.text}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${style.text}`}>{result.recommendation}</h2>
            <p className="text-sm text-gray-400">{result.confidence} Confidence</p>
          </div>
        </div>

        <p className="text-gray-300 mb-6">{result.summary}</p>

        <div className="space-y-4 mb-6">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Action</h3>
            <p className="text-white">{result.action?.instruction}</p>
            <p className="text-sm text-gray-400 mt-1">{result.action?.rationale}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-3">
              <label className="text-xs text-gray-500">Thesis Status</label>
              <p className={`font-semibold ${
                result.currentStatus?.thesisStatus === 'INTACT' ? 'text-profit-light' :
                result.currentStatus?.thesisStatus === 'WEAKENING' ? 'text-warning-light' :
                'text-loss-light'
              }`}>
                {result.currentStatus?.thesisStatus}
              </p>
            </div>
            <div className="glass-card p-3">
              <label className="text-xs text-gray-500">Overnight Risk</label>
              <p className={`font-semibold ${
                result.overnightRisk === 'LOW' ? 'text-profit-light' :
                result.overnightRisk === 'MEDIUM' ? 'text-warning-light' :
                'text-loss-light'
              }`}>
                {result.overnightRisk}
              </p>
            </div>
          </div>
        </div>

        <button onClick={onDismiss} className="btn-primary w-full">
          Got It
        </button>
      </div>
    </div>
  )
}

// Active Trade Card
function TradeCard({ trade, onRoutine, onClose, onToggle, isExpanded }) {
  const getZoneStatus = (currentSpot) => {
    if (!currentSpot || !trade.alerts) return null
    
    const spot = parseFloat(currentSpot)
    const abort = trade.alerts.abort?.level
    const warning = trade.alerts.warning?.level
    const profit = trade.alerts.profitBooking?.level
    
    if (abort && spot <= abort) return 'abort'
    if (warning && spot <= warning) return 'warning'
    if (profit && spot >= profit) return 'profit'
    return 'neutral'
  }

  const zone = getZoneStatus(trade.currentSpot)

  return (
    <div className={`glass-card overflow-hidden transition-all duration-300 ${
      zone === 'abort' ? 'border-loss pulse-alert' :
      zone === 'warning' ? 'border-warning' :
      zone === 'profit' ? 'border-profit' : ''
    }`}>
      {/* Header */}
      <div 
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              trade.verdict === 'BULLISH' ? 'bg-profit/20' :
              trade.verdict === 'BEARISH' ? 'bg-loss/20' : 'bg-neutral/20'
            }`}>
              {trade.verdict === 'BULLISH' ? (
                <TrendingUp className="w-5 h-5 text-profit-light" />
              ) : trade.verdict === 'BEARISH' ? (
                <TrendingDown className="w-5 h-5 text-loss-light" />
              ) : (
                <BarChart3 className="w-5 h-5 text-neutral-light" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">{trade.strategy?.name}</h3>
              <p className="text-xs text-gray-400">
                Entry: ₹{trade.entrySpot} • {trade.entryDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {zone && zone !== 'neutral' && (
              <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                zone === 'abort' ? 'bg-loss/30 text-loss-light' :
                zone === 'warning' ? 'bg-warning/30 text-warning-light' :
                'bg-profit/30 text-profit-light'
              }`}>
                {zone === 'abort' ? 'EXIT NOW' : zone === 'warning' ? 'MONITOR' : 'TAKE PROFIT'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4 animate-fade-in">
          {/* Strategy Legs */}
          <div className="space-y-2">
            {trade.strategy?.legs?.map((leg, idx) => (
              <div 
                key={idx}
                className={`flex justify-between p-2 rounded ${
                  leg.action === 'BUY' ? 'bg-profit/10' : 'bg-loss/10'
                }`}
              >
                <span className="text-sm">
                  {leg.action} {leg.strike} {leg.type}
                </span>
                <span className="text-sm font-mono">₹{leg.premium}</span>
              </div>
            ))}
          </div>

          {/* Alert Levels */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="zone-green p-2 rounded">
              <p className="text-xs text-gray-400">Target</p>
              <p className="font-mono font-semibold text-profit-light">
                {trade.alerts?.profitBooking?.level}
              </p>
            </div>
            <div className="zone-yellow p-2 rounded">
              <p className="text-xs text-gray-400">Warning</p>
              <p className="font-mono font-semibold text-warning-light">
                {trade.alerts?.warning?.level}
              </p>
            </div>
            <div className="zone-red p-2 rounded">
              <p className="text-xs text-gray-400">Stop Loss</p>
              <p className="font-mono font-semibold text-loss-light">
                {trade.alerts?.abort?.level}
              </p>
            </div>
          </div>

          {/* Last Routine Check */}
          {trade.lastRoutineResult && (
            <div className="bg-white/5 p-3 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">
                Last Check: {new Date(trade.lastRoutineCheck).toLocaleString()}
              </p>
              <p className="text-sm text-gray-300">{trade.lastRoutineResult.summary}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onRoutine}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              3:15 PM Routine
            </button>
            <button
              onClick={onClose}
              className="btn-danger flex items-center justify-center gap-2 px-4"
            >
              <XCircle className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Dashboard Component
function Dashboard() {
  const navigate = useNavigate()
  const { 
    activeTrades, 
    tradeHistory, 
    runRoutine, 
    closeTrade,
    isLoading,
    getPortfolioStats 
  } = useTrade()
  
  const [expandedTrade, setExpandedTrade] = useState(null)
  const [routineModal, setRoutineModal] = useState(null)
  const [closeModal, setCloseModal] = useState(null)
  const [routineResult, setRoutineResult] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const stats = getPortfolioStats()

  const handleRunRoutine = async (currentData) => {
    const result = await runRoutine(routineModal, currentData)
    if (result) {
      setRoutineResult(result)
    }
    setRoutineModal(null)
  }

  const handleCloseTrade = (closeData) => {
    closeTrade(closeModal.id, closeData)
    setCloseModal(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Active</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeTrades}</p>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Trophy className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.winRate}%</p>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-profit-light' : 'text-loss-light'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toFixed(0)}
          </p>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <History className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">Total Trades</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
        </div>
      </div>

      {/* Active Trades Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-midnight-400" />
            Active Trades
          </h2>
          <button
            onClick={() => navigate('/input')}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Trade
          </button>
        </div>

        {activeTrades.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-midnight-500/20 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-midnight-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Active Trades</h3>
            <p className="text-gray-400 mb-6">
              Run a market analysis and accept a trade to get started.
            </p>
            <button
              onClick={() => navigate('/input')}
              className="btn-primary"
            >
              Enter Market Data
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTrades.map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                isExpanded={expandedTrade === trade.id}
                onToggle={() => setExpandedTrade(
                  expandedTrade === trade.id ? null : trade.id
                )}
                onRoutine={() => setRoutineModal(trade)}
                onClose={() => setCloseModal(trade)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trade History */}
      {tradeHistory.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <History className="w-5 h-5" />
            <span className="font-semibold">Trade History ({tradeHistory.length})</span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-2 animate-fade-in">
              {tradeHistory.slice(0, 10).map(trade => (
                <div
                  key={trade.id}
                  className="glass-card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {trade.result === 'PROFIT' ? (
                      <Trophy className="w-5 h-5 text-profit" />
                    ) : (
                      <Skull className="w-5 h-5 text-loss" />
                    )}
                    <div>
                      <p className="font-medium text-white">{trade.strategy?.name}</p>
                      <p className="text-xs text-gray-400">
                        {trade.entryDate} → {new Date(trade.closedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-semibold ${
                      trade.result === 'PROFIT' ? 'text-profit-light' : 'text-loss-light'
                    }`}>
                      {trade.realizedPnL >= 0 ? '+' : ''}₹{trade.realizedPnL?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">{trade.closeReason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {routineModal && (
        <RoutineModal
          trade={routineModal}
          onClose={() => setRoutineModal(null)}
          onSubmit={handleRunRoutine}
          isLoading={isLoading}
        />
      )}

      {closeModal && (
        <CloseTradeModal
          trade={closeModal}
          onClose={() => setCloseModal(null)}
          onSubmit={handleCloseTrade}
        />
      )}

      {routineResult && (
        <RoutineResult
          result={routineResult}
          onDismiss={() => setRoutineResult(null)}
        />
      )}
    </div>
  )
}

export default Dashboard

