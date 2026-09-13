import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

function App() {
  const [bahanPakan, setBahanPakan] = useState([]);
  const [faseAyam, setFaseAyam] = useState([]);
  
  const [selectedFaseId, setSelectedFaseId] = useState(null);
  
  // Recipe state for manual composition: array of { bahan_id, bobot_kg }
  const [recipe, setRecipe] = useState([]);
  
  // Input state
  const [inputBahanId, setInputBahanId] = useState('');
  const [inputBobot, setInputBobot] = useState('');

  // Optimization state
  const [populasi, setPopulasi] = useState(1000);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // WebSocket state
  const [stockUpdates, setStockUpdates] = useState([]);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const WS_URL = API_URL.replace('http', 'ws') + '/ws/stock-updates';

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stock_update') {
        // Blink indicator
        setStockUpdates(prev => [...prev, data]);
        // Update live inventory
        setBahanPakan(prev => prev.map(b => {
          const updated = data.updates.find(u => u.bahan_id === b.id);
          return updated ? { ...b, stok_kg: updated.new_stok_kg } : b;
        }));
      }
    };
    return () => ws.close();
  }, [WS_URL]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bahanRes, faseRes] = await Promise.all([
          axios.get(`${API_URL}/api/bahan-pakan/`),
          axios.get(`${API_URL}/api/fase-ayam/`)
        ]);
        setBahanPakan(bahanRes.data);
        setFaseAyam(faseRes.data);
        if (faseRes.data.length > 0) setSelectedFaseId(faseRes.data[0].id);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const selectedFase = faseAyam.find(f => f.id === selectedFaseId);

  // Computations
  const totalBobot = recipe.reduce((sum, item) => sum + item.bobot_kg, 0);
  const totalBahan = recipe.length;

  const komposisi = useMemo(() => {
    return recipe.map(item => {
      const bahan = bahanPakan.find(b => b.id === item.bahan_id);
      if (!bahan) return null;
      const proporsi = totalBobot > 0 ? (item.bobot_kg / totalBobot) * 100 : 0;
      return {
        ...item,
        bahan,
        proporsi,
        pk: (bahan.protein_persen * item.bobot_kg) / totalBobot || 0,
        em: (bahan.energi_kcal * item.bobot_kg) / totalBobot || 0,
        ca: (bahan.kalsium_persen * item.bobot_kg) / totalBobot || 0,
        p: (bahan.fosfor_persen * item.bobot_kg) / totalBobot || 0,
      };
    }).filter(Boolean);
  }, [recipe, bahanPakan, totalBobot]);

  const totals = useMemo(() => {
    if (totalBobot === 0) return { pk: 0, em: 0, ca: 0, p: 0, sk: 0 };
    return komposisi.reduce((acc, curr) => ({
      pk: acc.pk + curr.pk,
      em: acc.em + curr.em,
      ca: acc.ca + curr.ca,
      p: acc.p + curr.p,
      sk: 0 // We didn't have serat kasar in backend, let's mock it or ignore it for now.
    }), { pk: 0, em: 0, ca: 0, p: 0, sk: 0 });
  }, [komposisi, totalBobot]);

  const handleAddBahan = () => {
    if (!inputBahanId || !inputBobot || parseFloat(inputBobot) <= 0) return;
    
    const id = parseInt(inputBahanId);
    const bobot = parseFloat(inputBobot);

    setRecipe(prev => {
      const existing = prev.find(item => item.bahan_id === id);
      if (existing) {
        return prev.map(item => item.bahan_id === id ? { ...item, bobot_kg: item.bobot_kg + bobot } : item);
      }
      return [...prev, { bahan_id: id, bobot_kg: bobot }];
    });
    
    setInputBahanId('');
    setInputBobot('');
  };

  const handleRemoveBahan = (id) => {
    setRecipe(prev => prev.filter(item => item.bahan_id !== id));
  };

  const handleClearTable = () => {
    setRecipe([]);
  };

  const handleOptimize = async () => {
    if (!selectedFaseId) return;
    setIsOptimizing(true);
    try {
      const res = await axios.post(`${API_URL}/api/kalkulasi/`, {
        fase_id: selectedFaseId,
        populasi_ekor: populasi
      });
      // The backend returns details with `bahan_id` and `jumlah_pakai_kg`
      const newRecipe = res.data.details.map(d => ({
        bahan_id: d.bahan_id,
        bobot_kg: d.jumlah_pakai_kg
      }));
      setRecipe(newRecipe);
    } catch (err) {
      alert("Gagal melakukan optimasi (Least Cost). Mungkin stok tidak cukup.");
      console.error(err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const renderBadge = (value, min, max) => {
    const roundedValue = Number(value.toFixed(2));
    if (roundedValue < min) return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">KURANG</span>;
    if (roundedValue > max) return <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">BERLEBIH</span>;
    return <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">SESUAI</span>;
  };

  const renderProgressBar = (value, min, max, unit) => {
    const roundedValue = Number(value.toFixed(2));
    // Determine color
    let colorClass = "bg-green-500";
    if (roundedValue < min) colorClass = "bg-red-500";
    if (roundedValue > max) colorClass = "bg-orange-500";

    // Calculate percentage for progress bar (cap at 100%)
    let pct = 0;
    if (max > 0) {
       pct = (value / max) * 100;
       if (pct > 100) pct = 100;
    }

    return (
      <div className="mt-3">
        <div className="flex justify-between items-end mb-1">
          <span className="text-2xl font-bold text-slate-800">{value > 0 ? value.toFixed(2) : '0'} <span className="text-sm font-normal text-slate-500">{unit}</span></span>
          <span className="text-xs text-slate-500">Standar: {min} - {max} {unit}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-800">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
             {/* Chicken Icon */}
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Kalkulator Pakan <span className="text-emerald-700">Ayam KUB</span></h1>
            <p className="text-xs text-slate-500">Kampung Unggul Balitbangtan • Ransum Presisi</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Standar Balitbangtan / BRIN
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-3xl p-8 lg:p-10 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">Nutrisi Unggas Presisi</span>
            <h2 className="text-3xl font-extrabold mb-4">Kalkulator Formulasi Ransum Mandiri Ayam KUB</h2>
            <p className="text-emerald-50 text-lg leading-relaxed">
              Rancang racikan pakan ayam kampung unggul dengan bahan pakan lokal. Pantau keseimbangan 
              <span className="font-bold"> Protein Kasar (PK), Energi Metabolisme (EM), Kalsium (Ca)</span>, dan <span className="font-bold">Fosfor (P)</span> secara real-time untuk performa pertumbuhan dan produksi telur optimal.
            </p>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full border-[30px] border-emerald-600/30 opacity-50"></div>
          <div className="absolute right-20 -top-10 w-32 h-32 rounded-full bg-emerald-600/40 opacity-50 blur-2xl"></div>
        </div>

        {/* Section 1: Phase Selection */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">1. Pilih Fase Pemeliharaan Ayam KUB</h3>
            <div className="flex gap-2">
               <button className="text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition">Database Bahan Baku</button>
               <button className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition">Cetak / PDF Resep</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {faseAyam.map(fase => (
              <div 
                key={fase.id}
                onClick={() => setSelectedFaseId(fase.id)}
                className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${selectedFaseId === fase.id ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' : 'border-slate-100 hover:border-emerald-200 bg-white'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold ${selectedFaseId === fase.id ? 'text-emerald-700' : 'text-slate-700'}`}>{fase.nama_fase.split('(')[0].trim()}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedFaseId === fase.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                     {fase.nama_fase.match(/\((.*?)\)/)?.[1] || ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Masa pemeliharaan sesuai standar operasional.</p>
              </div>
            ))}
          </div>

          {selectedFase && (
            <div className="bg-slate-50 rounded-xl p-4 flex flex-wrap gap-x-8 gap-y-3 items-center text-sm border border-slate-100">
               <div className="flex items-center gap-2"><span className="text-slate-500">Target PK:</span> <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{selectedFase.min_protein_persen} - {selectedFase.max_protein_persen}%</span></div>
               <div className="flex items-center gap-2"><span className="text-slate-500">Target EM:</span> <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{selectedFase.min_energi_kcal} - {selectedFase.max_energi_kcal} kkal/kg</span></div>
               <div className="flex items-center gap-2"><span className="text-slate-500">Target Kalsium (Ca):</span> <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{selectedFase.min_kalsium_persen} - {selectedFase.max_kalsium_persen}%</span></div>
               <div className="flex items-center gap-2"><span className="text-slate-500">Target Fosfor (P):</span> <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">0.45 - 0.6%</span></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Input & Tabel) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section 2: Input */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1">2. Input Bahan Baku Pakan</h3>
              <p className="text-sm text-slate-500 mb-5">Pilih bahan pakan dan tentukan takaran bobot dalam kilogram (Kg).</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-6">
                <div className="sm:col-span-6">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-600">Pilih Bahan Pakan</label>
                    <span className="text-[10px] text-emerald-600 font-medium">Tersedia {bahanPakan.length} bahan lokal</span>
                  </div>
                  <select 
                    value={inputBahanId}
                    onChange={e => setInputBahanId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Pilih Bahan Baku Pakan --</option>
                    {bahanPakan.map(b => (
                      <option key={b.id} value={b.id}>{b.nama_bahan} (Stok: {b.stok_kg}kg)</option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Berat Bahan (Kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={inputBobot}
                      onChange={e => setInputBobot(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Kg</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[5, 10, 25, 50].map(val => (
                      <button key={val} onClick={() => setInputBobot(val)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold py-1 rounded transition">+{val} Kg</button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button onClick={handleAddBahan} className="w-full h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                    + Tambah
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                      <span>💡</span> Optimasi Formulasi (Least Cost)
                    </h4>
                    <p className="text-xs text-amber-700">Otomatis mencari kombinasi bahan pakan termurah sesuai target nutrisi.</p>
                  </div>
                  <div className="flex gap-2 items-center w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-amber-200 shadow-sm w-full sm:w-auto">
                       <label className="text-xs font-semibold text-amber-800">Populasi:</label>
                       <input type="number" value={populasi} onChange={(e) => setPopulasi(e.target.value)} className="w-16 outline-none text-xs text-center font-bold text-amber-900" />
                    </div>
                    <button 
                      onClick={handleOptimize} 
                      disabled={isOptimizing}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition whitespace-nowrap"
                    >
                      {isOptimizing ? "Menghitung..." : "Hitung Otomatis"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Tabel Komposisi */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">3. Tabel Komposisi Ransum</h3>
                  <p className="text-sm text-slate-500">Daftar bahan yang diracik beserta kontribusi nutrisinya per campuran.</p>
                </div>
                <button onClick={handleClearTable} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition">
                   Kosongkan Tabel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm mt-4">
                  <thead className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-1/3">Bahan Baku</th>
                      <th className="py-3 px-2 font-semibold">Bobot</th>
                      <th className="py-3 px-2 font-semibold">Proporsi</th>
                      <th className="py-3 px-2 font-semibold text-right">PK</th>
                      <th className="py-3 px-2 font-semibold text-right">EM</th>
                      <th className="py-3 px-2 font-semibold text-right">Ca</th>
                      <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {komposisi.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-slate-400">Belum ada bahan pakan yang ditambahkan.</td>
                      </tr>
                    ) : (
                      komposisi.map((k, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                             <div className="font-bold text-slate-700">{k.bahan.nama_bahan}</div>
                             <div className="text-[10px] text-slate-400">Rp {k.bahan.harga_per_kg.toLocaleString('id-ID')} / kg</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1">
                               <span className="font-bold border border-slate-200 px-2 py-1 rounded bg-white w-16 text-center">{k.bobot_kg.toFixed(1)}</span>
                               <span className="text-xs text-slate-400">Kg</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-600">{k.proporsi.toFixed(1)}%</td>
                          <td className="py-3 px-2 text-right text-slate-500">{k.pk.toFixed(2)}%</td>
                          <td className="py-3 px-2 text-right text-slate-500">{k.em.toFixed(0)} <span className="text-[10px]">kkal</span></td>
                          <td className="py-3 px-2 text-right text-slate-500">{k.ca.toFixed(2)}%</td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => handleRemoveBahan(k.bahan_id)} className="text-slate-300 hover:text-red-500 transition">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column (Evaluation) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Total Summary Card */}
            <div className="bg-[#1e293b] rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
               <div className="flex justify-between items-center relative z-10">
                 <div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Berat Pakan</p>
                   <div className="text-3xl font-extrabold">{totalBobot.toFixed(1)} <span className="text-lg font-normal text-slate-400">Kg</span></div>
                 </div>
                 <div className="text-right border-l border-slate-700 pl-6">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Jumlah Bahan</p>
                   <div className="text-xl font-bold">{totalBahan} <span className="text-sm font-normal text-slate-400">Bahan</span></div>
                 </div>
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center relative z-10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Estimasi Harga (Total)</p>
                  <div className="text-lg font-bold text-emerald-400">
                    Rp {komposisi.reduce((sum, item) => sum + (item.bobot_kg * item.bahan.harga_per_kg), 0).toLocaleString('id-ID')}
                  </div>
               </div>
            </div>

            {/* Section 4: Evaluasi */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1">4. Evaluasi Kecukupan Nutrisi</h3>
              <p className="text-sm text-slate-500 mb-6">Hasil analisis kadar nutrisi racikan dibandingkan standar Ayam KUB.</p>
              
              {selectedFase ? (
                <div className="space-y-6">
                  {/* Protein Kasar */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Protein Kasar (PK)</span>
                      {renderBadge(totals.pk, selectedFase.min_protein_persen, selectedFase.max_protein_persen)}
                    </div>
                    {renderProgressBar(totals.pk, selectedFase.min_protein_persen, selectedFase.max_protein_persen, "%")}
                  </div>

                  {/* Energi Metabolisme */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Energi Metabolisme (EM)</span>
                      {renderBadge(totals.em, selectedFase.min_energi_kcal, selectedFase.max_energi_kcal)}
                    </div>
                    {renderProgressBar(totals.em, selectedFase.min_energi_kcal, selectedFase.max_energi_kcal, "kkal/kg")}
                  </div>

                  {/* Kalsium */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Kalsium (Ca)</span>
                      {renderBadge(totals.ca, selectedFase.min_kalsium_persen, selectedFase.max_kalsium_persen)}
                    </div>
                    {renderProgressBar(totals.ca, selectedFase.min_kalsium_persen, selectedFase.max_kalsium_persen, "%")}
                  </div>

                  {/* Fosfor (Mock targets since backend doesn't have min/max for it) */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Fosfor Tersedia (P)</span>
                      {renderBadge(totals.p, 0.45, 0.6)}
                    </div>
                    {renderProgressBar(totals.p, 0.45, 0.6, "%")}
                  </div>

                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">Silakan pilih Fase Pemeliharaan terlebih dahulu.</div>
              )}
            </div>

          </div>
        </div>
        {/* Data Tables */}
        <div className="mt-12" id="inventory">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">Ingredients Inventory (Live)</h3>
              {stockUpdates.length > 0 && (
                 <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
                   Live Connected
                 </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6 font-semibold tracking-wider">ID</th>
                    <th className="py-4 px-6 font-semibold tracking-wider">NAMA BAHAN</th>
                    <th className="py-4 px-6 font-semibold tracking-wider text-right">STOK (KG)</th>
                    <th className="py-4 px-6 font-semibold tracking-wider text-right">HARGA / KG</th>
                    <th className="py-4 px-6 font-semibold tracking-wider text-right">PROTEIN %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bahanPakan.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 text-slate-400">#{b.id}</td>
                      <td className="py-4 px-6 font-bold text-slate-700">{b.nama_bahan}</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${b.stok_kg > 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {b.stok_kg.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-right font-medium">Rp {b.harga_per_kg.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-6 text-slate-500 text-right">{b.protein_persen}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
