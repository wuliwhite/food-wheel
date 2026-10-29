"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";

interface AuthContextType {
  deviceId: string;
  userProfile: UserProfile | null;
  isGuest: boolean;
  loading: boolean;
  toggleGuestMode: (guest: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  deviceId: "",
  userProfile: null,
  isGuest: false,
  loading: true,
  toggleGuestMode: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [deviceId, setDeviceId] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let localDeviceId = localStorage.getItem("food_wheel_device_id");
    const localGuestMode = localStorage.getItem("food_wheel_guest_mode") === "true";

    if (!localDeviceId) {
      localDeviceId = uuidv4();
      localStorage.setItem("food_wheel_device_id", localDeviceId);
    }

    setDeviceId(localDeviceId);
    setIsGuest(localGuestMode);

    const userRef = doc(db, "users", localDeviceId);

    const initializeUser = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialProfile: UserProfile = {
            deviceId: localDeviceId,
            createdAt: new Date().toISOString(),
            isGuest: localGuestMode,
            ratedRestaurants: {},
          };
          await setDoc(userRef, initialProfile);
          setUserProfile(initialProfile);
        } else {
          setUserProfile(snap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Failed to sync user document:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleGuestMode = async (guest: boolean) => {
    setIsGuest(guest);
    localStorage.setItem("food_wheel_guest_mode", guest ? "true" : "false");
    if (deviceId && !guest) {
      try {
        const userRef = doc(db, "users", deviceId);
        await setDoc(userRef, { isGuest: false }, { merge: true });
      } catch (e) {
        console.error("Could not update guest status in database", e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        deviceId,
        userProfile,
        isGuest,
        loading,
        toggleGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);