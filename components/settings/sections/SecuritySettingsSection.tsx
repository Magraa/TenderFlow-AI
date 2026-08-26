'use client';

import { useState } from 'react';
import { Settings } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, KeyRound, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { hasSitePassword } from '@/services/passwordAuthService';

interface SecuritySettingsSectionProps {
  settings: Settings;
  passwordForm: {
    oldPassword: '';
    newPassword: '';
    confirmPassword: '';
  };
  passwordSaving: boolean;
  passwordError: string;
  onPasswordFormChange: (form: any) => void;
  onPasswordSubmit: () => void;
}

export function SecuritySettingsSection({
  settings,
  passwordForm,
  passwordSaving,
  passwordError,
  onPasswordFormChange,
  onPasswordSubmit,
}: SecuritySettingsSectionProps) {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isProtected = hasSitePassword(settings);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Security & Access Protection
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage the master password protecting private procurement documents, financial bills, and firm profiles.
          </p>
        </div>
      </div>

      {/* Security Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
        isProtected 
          ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
          : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
      }`}>
        <div className={`p-2 rounded-xl shrink-0 ${isProtected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {isProtected ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider">
            {isProtected ? 'Private Access Password Active' : 'No Access Password Configured'}
          </h4>
          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
            {isProtected
              ? 'This system is secured with master password authentication. Changing the password will require all active browser sessions to re-authenticate.'
              : 'Anyone with URL access can view and generate documents. We strongly recommend configuring a secure password.'}
          </p>
        </div>
      </div>

      <Card className="border border-slate-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600" />
            {isProtected ? 'Update Website Password' : 'Set New Website Password'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Use at least 6 characters. A mix of letters, numbers, and symbols is recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {isProtected && (
            <div className="space-y-1.5 max-w-md">
              <Label htmlFor="oldPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Current Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOld ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => onPasswordFormChange({ ...passwordForm, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="h-10 text-xs pr-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => onPasswordFormChange({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="h-10 text-xs pr-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => onPasswordFormChange({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="h-10 text-xs pr-10 border-slate-200 rounded-xl focus-visible:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {passwordError}
            </div>
          )}

          <div className="pt-2 flex justify-start">
            <Button
              type="button"
              onClick={onPasswordSubmit}
              loading={passwordSaving}
              disabled={passwordSaving || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
            >
              {isProtected ? 'Update Password' : 'Save Access Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
