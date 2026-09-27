"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerUser } from "../actions";
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterUserPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.message || "Success!");
      (e.target as HTMLFormElement).reset();
    }
    
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6287a2] flex items-center gap-2">
            <UserPlus className="text-[#5ec0ca] w-6 h-6" />
            Register User
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and configure new user accounts for system access.
          </p>
        </div>
      </div>

      <Card className="border-dev-slate/10 shadow-lg shadow-zinc-100/50">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-6">
          <CardTitle className="text-lg">Account Information</CardTitle>
          <CardDescription>Enter the login details for the new user.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="namaUser" className="text-xs uppercase font-bold tracking-wider text-zinc-500">Username</Label>
                <Input 
                  id="namaUser" 
                  name="namaUser"
                  required 
                  className="h-11 focus-visible:ring-dev-cyan"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sandiUser" className="text-xs uppercase font-bold tracking-wider text-zinc-500">Password</Label>
                <PasswordInput 
                  id="sandiUser" 
                  name="sandiUser"
                  required 
                  className="h-11 focus-visible:ring-dev-cyan"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-dev-mint/10 text-emerald-600 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-dev-cyan hover:bg-dev-slate transition-colors text-white font-medium text-sm"
            >
              {loading ? "Saving..." : "Register User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
