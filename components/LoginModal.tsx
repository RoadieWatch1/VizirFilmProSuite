// components/LoginModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

export default function LoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async () => {
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#021e1f] text-white border border-[#FF6A00]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-white">
            {isLogin ? "Log In to Vizir Film Pro" : "Create an Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            type="email"
            placeholder="Email"
            className="bg-[#032f30] text-white border-[#FF6A00]/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            className="bg-[#032f30] text-white border-[#FF6A00]/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            onClick={handleAuth}
            className="w-full bg-[#FF6A00] hover:bg-[#E55A00] text-white"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </Button>

          <p className="text-sm text-center text-[#B2C8C9]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#FF6A00] hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
