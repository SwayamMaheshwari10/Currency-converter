import { useEffect, useState } from 'react'
import { ArrowDownUp, ArrowRight, Heart, Plane, Plus, Sparkles, Trash2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addFavorite, convert, deleteFavorite, getFavorites, getHistory, getTravelBudget, getTrend, type ConversionHistory, type ConversionResult, type Favorite, type TrendPoint, type TravelResult } from './api'
import './App.css'

function App() {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD']
  const [mode, setMode] = useState<'convert' | 'travel'>('convert')
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [targetCurrency, setTargetCurrency] = useState('EUR')
  const [amount, setAmount] = useState('100')
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [travelResults, setTravelResults] = useState<TravelResult[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [history, setHistory] = useState<ConversionHistory[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getFavorites().then(({ favorites: saved }) => setFavorites(saved)).catch(() => undefined)
    getHistory().then(({ history: recent }) => setHistory(recent)).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (mode !== 'convert') return
    setTrendLoading(true)
    getTrend(baseCurrency, targetCurrency).then(({ rates }) => setTrend(rates)).catch(() => setTrend([])).finally(() => setTrendLoading(false))
  }, [baseCurrency, targetCurrency, mode])

  const runConversion = async () => {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount < 0) return setError('Enter an amount greater than zero.')
    setLoading(true)
    setError('')
    try {
      if (mode === 'travel') {
        const data = await getTravelBudget(baseCurrency, numericAmount)
        setTravelResults(data.results)
      } else {
        const conversion = await convert(baseCurrency, targetCurrency, numericAmount)
        setResult(conversion)
        const { history: recent } = await getHistory()
        setHistory(recent)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const swapCurrencies = () => {
    setBaseCurrency(targetCurrency)
    setTargetCurrency(baseCurrency)
  }

  const saveFavorite = async () => {
    await addFavorite(baseCurrency, targetCurrency)
    const { favorites: saved } = await getFavorites()
    setFavorites(saved)
  }

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark">FX</div><div><strong>Rateform</strong><span>currency intelligence</span></div><div className="status"><i /> live rates</div></header>
      <section className="intro"><p className="eyebrow"><Sparkles size={15} /> SIMPLE, CLEAR, CURRENT</p><h1>Make every<br /><em>exchange</em> count.</h1><p className="lede">A calm place to convert money, compare your travel budget, and keep the pairs you use most close at hand.</p></section>
      <section className="workspace">
        <div className="mode-tabs"><button className={mode === 'convert' ? 'active' : ''} onClick={() => setMode('convert')}>Quick convert</button><button className={mode === 'travel' ? 'active' : ''} onClick={() => setMode('travel')}><Plane size={16} /> Travel budget</button></div>
        <div className="form-heading"><div><p className="eyebrow">{mode === 'travel' ? 'TRAVEL BUDGET' : 'CONVERSION DESK'}</p><h2>{mode === 'travel' ? 'See your money in five places.' : 'What are you moving today?'}</h2></div><span className="updated">Rates cached for speed</span></div>
        <div className="converter-row">
          <label>Amount<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>From<select value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
          {mode === 'convert' && <><button className="icon-button" title="Swap currencies" onClick={swapCurrencies}><ArrowDownUp size={18} /></button><label>To<select value={targetCurrency} onChange={(event) => setTargetCurrency(event.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label></>}
          <button className="primary-button" onClick={runConversion} disabled={loading}>{loading ? 'Working...' : 'Convert'} <ArrowRight size={18} /></button>
        </div>
        {error && <p className="error">{error}</p>}
        {result && mode === 'convert' && <div className="result-panel"><div><span className="result-label">YOU GET</span><strong>{result.converted_amount.toLocaleString()} <small>{result.target_currency}</small></strong><p>1 {result.base_currency} = {result.rate.toFixed(4)} {result.target_currency}</p></div><button className="secondary-button" onClick={saveFavorite}><Heart size={17} /> Save pair</button></div>}
        {mode === 'travel' && travelResults.length > 0 && <div className="travel-grid">{travelResults.map((item) => <div className="travel-item" key={item.currency}><span>{item.currency}</span><strong>{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>rate {item.rate.toFixed(4)}</small></div>)}</div>}
      </section>
      {mode === 'convert' && <section className="insights-grid"><div className="chart-panel"><div className="section-heading"><div><p className="eyebrow">MARKET PULSE</p><h2>{baseCurrency} to {targetCurrency}</h2></div><span className="updated">30 days</span></div>{trendLoading ? <p className="empty">Loading rate history...</p> : <ResponsiveContainer width="100%" height={230}><LineChart data={trend} margin={{ top: 18, right: 10, left: -22, bottom: 0 }}><CartesianGrid stroke="#dbe3dc" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: '#728079', fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} /><YAxis domain={['auto', 'auto']} tick={{ fill: '#728079', fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} width={52} /><Tooltip contentStyle={{ border: '1px solid #dbe3dc', borderRadius: 0, fontFamily: 'DM Mono', fontSize: 11 }} formatter={(value) => [Number(value ?? 0).toFixed(4), 'rate']} /><Line type="monotone" dataKey="rate" stroke="#2d6a4f" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#d9ef9b', stroke: '#2d6a4f' }} /></LineChart></ResponsiveContainer>}</div><div className="history-panel"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Conversions</h2></div></div>{history.length === 0 ? <p className="empty">Your recent conversions will appear here.</p> : <div className="history-list">{history.map((item) => <div className="history-row" key={item.id}><span>{item.source_currency} <ArrowRight size={13} /> {item.target_currency}</span><strong>{item.converted_amount.toLocaleString()} {item.target_currency}</strong><small>{item.amount.toLocaleString()} {item.source_currency}</small></div>)}</div>}</div></section>}
      <section className="lower-grid"><div className="section-heading"><div><p className="eyebrow">YOUR SHORTLIST</p><h2>Favorite pairs</h2></div><Plus size={18} /></div><div className="favorites-list">{favorites.length === 0 ? <p className="empty">Save a pair after your first conversion.</p> : favorites.map((favorite) => <div className="favorite-row" key={favorite.id}><button onClick={() => { setBaseCurrency(favorite.source_currency); setTargetCurrency(favorite.target_currency); setMode('convert') }}><span>{favorite.source_currency}</span><ArrowRight size={15} /><span>{favorite.target_currency}</span></button><button className="delete-button" title="Remove favorite" onClick={async () => { await deleteFavorite(favorite.id); setFavorites(favorites.filter((item) => item.id !== favorite.id)) }}><Trash2 size={15} /></button></div>)}</div></section>
      <footer><span>Rateform / phase one</span><span>Built for decisions, not distractions.</span></footer>
    </main>
  )
}

export default App

