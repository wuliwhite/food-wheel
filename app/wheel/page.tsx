"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Restaurant } from "@/types";
import confetti from "canvas-confetti";
import { Filter, Sparkles, RefreshCw, Trophy, Utensils, X } from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

// Monochromatic array centered around #bd0f72
const WHEEL_COLORS = [
  "#bd0f72", "#e83a9c", "#9c0a5d", "#ff6eb4", 
  "#7a0547", "#d61a85", "#540230", "#eb5eb0"
];

export default function WheelPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  
  const [isWeighted, setIsWeighted] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "restaurants"), (snap) => {
      const list: Restaurant[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Restaurant);
      });
      setRestaurants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const allCategories = useMemo(() => Array.from(new Set(restaurants.map((r) => r.category))), [restaurants]);
  const allPrices = ["$", "$$", "$$$"];

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const togglePrice = (price: string) => {
    setSelectedPrices(prev => prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]);
  };

  const addExclusion = (id: string) => {
    if (id && !excludedIds.includes(id)) {
      setExcludedIds(prev => [...prev, id]);
    }
  };

  const removeExclusion = (id: string) => {
    setExcludedIds(prev => prev.filter(e => e !== id));
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesCat = selectedCategories.length === 0 || selectedCategories.includes(r.category);
      const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(r.priceRange);
      const notExcluded = !excludedIds.includes(r.id);
      return matchesCat && matchesPrice && notExcluded;
    });
  }, [restaurants, selectedCategories, selectedPrices, excludedIds]);

  const wheelDataWeights = useMemo(() => {
    if (filteredRestaurants.length === 0) return [1];
    return filteredRestaurants.map(r => {
      if (!isWeighted) return 1;
      return Math.max(1, Math.round(r.averageRating || 1));
    });
  }, [filteredRestaurants, isWeighted]);

  const wheelLabels = useMemo(() => {
    if (filteredRestaurants.length === 0) return ["No Spots Match"];
    return filteredRestaurants.map(r => r.name.length > 15 ? r.name.substring(0, 13) + "..." : r.name);
  }, [filteredRestaurants]);

  const chartData = {
    labels: wheelLabels,
    datasets: [
      {
        data: wheelDataWeights,
        backgroundColor: filteredRestaurants.length === 0 ? ["#cbd5e1"] : wheelLabels.map((_, idx) => WHEEL_COLORS[idx % WHEEL_COLORS.length]),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 0 }, 
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
      datalabels: {
        color: '#ffffff',
        formatter: (value: any, context: any) => context.chart.data.labels[context.dataIndex],
        font: { weight: 'bold' as const, size: 12 },
        rotation: (context: any) => {
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            const arc = meta.data[context.dataIndex];
            const angle = (arc.startAngle + arc.endAngle) / 2;
            return (angle * 180) / Math.PI;
        },
        align: 'center' as const,
        anchor: 'center' as const,
      }
    }
  };

  const handleSpinClick = () => {
    if (isSpinning || filteredRestaurants.length === 0) return;
    setWinner(null);
    setIsSpinning(true);

    const spinSpins = 5; 
    const randomExtraDegrees = Math.floor(Math.random() * 360);
    const totalNewRotation = rotationDeg + (spinSpins * 360) + randomExtraDegrees;
    
    setRotationDeg(totalNewRotation);

    setTimeout(() => {
      setIsSpinning(false);
      calculateWinner(totalNewRotation);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#bd0f72', '#ff6eb4', '#9c0a5d'] });
    }, 4000); 
  };

  const calculateWinner = (finalRotation: number) => {
    const normalizedRotation = finalRotation % 360;
    const pointerAngle = (360 - normalizedRotation) % 360;
    
    const totalWeight = wheelDataWeights.reduce((a, b) => a + b, 0);
    let cumulativeWeight = 0;
    
    for (let i = 0; i < filteredRestaurants.length; i++) {
      const sliceAngle = (wheelDataWeights[i] / totalWeight) * 360;
      cumulativeWeight += sliceAngle;
      if (pointerAngle <= cumulativeWeight) {
        setWinner(filteredRestaurants[i]);
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#bd0f72] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
      {/* Filters Column */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-[#bd0f72]" />
            <h2 className="text-xl font-bold text-slate-900">Filter Options</h2>
          </div>

          <div className="space-y-6">
            {/* Multi-select Categories */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Categories (Select Multiple)
              </label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      selectedCategories.includes(cat)
                        ? "bg-[#bd0f72] text-white border-[#bd0f72]"
                        : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-select Price */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Price Range (Select Multiple)
              </label>
              <div className="flex flex-wrap gap-2">
                {allPrices.map((price) => (
                  <button
                    key={price}
                    onClick={() => togglePrice(price)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      selectedPrices.includes(price)
                        ? "bg-[#bd0f72] text-white border-[#bd0f72]"
                        : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isWeighted}
                  onChange={(e) => setIsWeighted(e.target.checked)}
                  className="w-4 h-4 rounded text-[#bd0f72] focus:ring-[#bd0f72] bg-white border-slate-300"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5 text-slate-700">
                    <Sparkles className="w-4 h-4 text-[#bd0f72]" />
                    Weighted by Yummy Rating
                  </div>
                  <p className="text-xs text-slate-500">
                    One proportional slice per restaurant based on rating.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Temporary Exclusion Panel with Scrollable List Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
           <div>
             <h3 className="text-sm font-bold text-slate-900 mb-1">Remove Specific Options</h3>
             <p className="text-xs text-slate-500">Click a restaurant to hide it from this spin.</p>
           </div>
           
           {/* Scrollable list box keeping bounds intact */}
           <div className="max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1">
             {restaurants.filter(r => !excludedIds.includes(r.id)).length === 0 ? (
               <p className="text-xs text-slate-400 text-center py-3">All spots are currently hidden</p>
             ) : (
               restaurants
                 .filter(r => !excludedIds.includes(r.id))
                 .map(r => (
                   <button
                     key={r.id}
                     onClick={() => addExclusion(r.id)}
                     className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#bd0f72]/10 hover:text-[#bd0f72] transition-colors flex items-center justify-between group"
                   >
                     <span className="truncate">{r.name}</span>
                     <span className="text-[10px] text-slate-400 group-hover:text-[#bd0f72] font-semibold shrink-0 ml-2">Hide +</span>
                   </button>
                 ))
             )}
           </div>

           {/* Hidden Spots Pills */}
           {excludedIds.length > 0 && (
             <div className="pt-2 border-t border-slate-200">
               <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Hidden Spots:</p>
               <div className="flex flex-wrap gap-1.5">
                 {excludedIds.map(id => {
                   const r = restaurants.find(res => res.id === id);
                   if (!r) return null;
                   return (
                     <span key={id} className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-md text-xs font-medium">
                       {r.name}
                       <button onClick={() => removeExclusion(id)} className="hover:text-rose-900"><X className="w-3.5 h-3.5"/></button>
                     </span>
                   );
                 })}
               </div>
             </div>
           )}
        </div>

        {/* Results Banner */}
        {winner && (
          <div className="bg-[#bd0f72]/10 border border-[#bd0f72]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#bd0f72] font-bold mb-1">
              <Trophy className="w-5 h-5" />
              <span>Result Picked!</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">{winner.name}</h3>
            <p className="text-xs text-slate-600 mt-1">
              {winner.category} • {winner.district} ({winner.priceRange})
            </p>
            <div className="mt-2 text-xs text-amber-500 font-bold">
              ★ {winner.ratingCount > 0 ? winner.averageRating.toFixed(1) : "Unrated"} ({winner.ratingCount} reviews)
            </div>
          </div>
        )}
      </div>

      {/* Wheel Visual Column */}
      <div className="w-full lg:w-2/3 flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="text-sm font-bold text-slate-500 mb-4">
          Candidates on wheel: <span className="text-[#bd0f72]">{filteredRestaurants.length}</span>
        </div>
        
        <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center p-2">
          {/* Wheel Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-slate-900 drop-shadow-md"></div>
          
          <div 
            ref={wheelRef}
            className="w-full h-full rounded-full border-[8px] border-slate-100 shadow-inner"
            style={{ 
              transform: `rotate(${rotationDeg}deg)`, 
              transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' 
            }}
          >
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>

        <button
          onClick={handleSpinClick}
          disabled={isSpinning || filteredRestaurants.length === 0}
          className="mt-8 px-10 py-4 bg-gradient-to-r from-[#bd0f72] to-[#9c0a5d] hover:from-[#9c0a5d] hover:to-[#7a0547] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-lg rounded-full shadow-md transition-all flex items-center gap-2"
        >
          <Utensils className="w-5 h-5" />
          {isSpinning ? "Spinning..." : "SPIN THE WHEEL"}
        </button>
      </div>
    </div>
  );
}