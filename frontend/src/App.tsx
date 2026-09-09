import { useEffect, useState } from 'react'
import { ArrowDownUp, ArrowRight, Heart, Plane, Plus, Sparkles, Trash2 } from 'lucide-react'
import { addFavorite, convert, deleteFavorite, getFavorites, getTravelBudget, type ConversionResult, type Favorite, type TravelResult } from './api'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getFavorites().then(({ favorites: saved }) => setFavorites(saved)).catch(() => undefined)
  }, [])

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
        setResult(await convert(baseCurrency, targetCurrency, numericAmount))
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
      <section className="lower-grid"><div className="section-heading"><div><p className="eyebrow">YOUR SHORTLIST</p><h2>Favorite pairs</h2></div><Plus size={18} /></div><div className="favorites-list">{favorites.length === 0 ? <p className="empty">Save a pair after your first conversion.</p> : favorites.map((favorite) => <div className="favorite-row" key={favorite.id}><button onClick={() => { setBaseCurrency(favorite.source_currency); setTargetCurrency(favorite.target_currency); setMode('convert') }}><span>{favorite.source_currency}</span><ArrowRight size={15} /><span>{favorite.target_currency}</span></button><button className="delete-button" title="Remove favorite" onClick={async () => { await deleteFavorite(favorite.id); setFavorites(favorites.filter((item) => item.id !== favorite.id)) }}><Trash2 size={15} /></button></div>)}</div></section>
      <footer><span>Rateform / phase one</span><span>Built for decisions, not distractions.</span></footer>
    </main>
  )
}

export default App

