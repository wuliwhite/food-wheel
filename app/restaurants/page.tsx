"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Restaurant } from "@/types";
import { MapPin, Clock, Star, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function RestaurantDirectory() {
  const { deviceId, userProfile, isGuest } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [guestPrompt, setGuestPrompt] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "restaurants"), (snap) => {
      const list: Restaurant[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Restaurant);
      });
      setRestaurants(list);
    });
    return () => unsub();
  }, []);

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        name: "Australia Dairy Company",
        category: "Cha Chaan Teng",
        district: "Tsim Sha Tsui",
        address: "47 Parkes Street",
        priceRange: "$",
        openingHours: "07:30 - 22:00",
      },
      {
        name: "Yat Lok Roast Goose",
        category: "Siu Mei",
        district: "Central",
        address: "34-38 Stanley Street",
        priceRange: "$$",
        openingHours: "10:00 - 20:30",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Restaurants");
    XLSX.writeFile(workbook, "restaurants_template.xlsx");
  };

  const handleRate = async (restaurantId: string, ratingValue: number) => {
    if (isGuest) {
      setGuestPrompt("Guest mode is read-only. Switch off Guest Mode in the navbar to vote.");
      setTimeout(() => setGuestPrompt(null), 4000);
      return;
    }

    if (!deviceId) return;
    setSubmittingId(restaurantId);

    const prevRating = userProfile?.ratedRestaurants?.[restaurantId] || null;

    try {
      await runTransaction(db, async (transaction) => {
        const restRef = doc(db, "restaurants", restaurantId);
        const userRef = doc(db, "users", deviceId);

        const restSnap = await transaction.get(restRef);
        if (!restSnap.exists()) {
          throw new Error("Restaurant does not exist!");
        }

        const data = restSnap.data();
        let currentSum = Number(data.ratingSum || 0);
        let currentCount = Number(data.ratingCount || 0);

        if (prevRating !== null) {
          currentSum = currentSum - prevRating + ratingValue;
        } else {
          currentSum = currentSum + ratingValue;
          currentCount = currentCount + 1;
        }

        const newAvg = currentCount > 0 ? currentSum / currentCount : 0;

        transaction.update(restRef, {
          ratingSum: currentSum,
          ratingCount: currentCount,
          averageRating: newAvg,
        });

        transaction.set(
          userRef,
          {
            ratedRestaurants: {
              [restaurantId]: ratingValue,
            },
          },
          { merge: true }
        );
      });
    } catch (err) {
      console.error("Transaction failed: ", err);
      alert("Vote failed to record. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#bd0f72]">Curated Restaurant Directory</h1>
          <p className="text-sm text-slate-500">
            Rate restaurants from 1 to 5 Yummies. Your vote updates the cumulative community average.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleExcel}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4 text-[#bd0f72]" />
          <span>Download Excel Template</span>
        </button>
      </div>

      {guestPrompt && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{guestPrompt}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((rest) => {
          const userVote = userProfile?.ratedRestaurants?.[rest.id] || null;
          const isBusy = submittingId === rest.id;

          return (
            <div
              key={rest.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-[#bd0f72]/50 transition-colors shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-1 bg-[#bd0f72]/10 text-[#bd0f72] border border-[#bd0f72]/20 text-xs font-semibold rounded-md">
                    {rest.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500 tracking-wider">
                    {rest.priceRange}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{rest.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rest.district} {rest.address ? `• ${rest.address}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rest.openingHours}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{rest.ratingCount > 0 ? rest.averageRating.toFixed(1) : "Unrated"}</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({rest.ratingCount} {rest.ratingCount === 1 ? "vote" : "votes"})
                    </span>
                  </div>
                  {userVote && (
                    <span className="text-[11px] text-emerald-500 font-medium">
                      Your vote: {userVote}★
                    </span>
                  )}
                </div>

                {/* Rating Button Row */}
                <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      disabled={isBusy}
                      onClick={() => handleRate(rest.id, star)}
                      className={`flex-1 py-1 text-sm rounded-lg font-medium transition-all ${
                        userVote === star
                          ? "bg-amber-400 text-slate-900 font-bold"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                      }`}
                      title={`Rate ${star} Yummy`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}