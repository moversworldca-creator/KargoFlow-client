import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Camera, Check, Shield, Lock, 
  Eye, EyeOff, User, Mail, Phone, MapPin, 
  ShieldCheck, AlertCircle, Sparkles, Loader2, KeyRound
} from 'lucide-react';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import { PLATFORM_ROLES } from '../rbac/platformRbac';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { platformUser, refreshUser } = usePlatformAuth();
  const { showToast } = useToast();

  const roleConfig = PLATFORM_ROLES[platformUser?.role] || {};

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 (555) 349-8812');
  const [region, setRegion] = useState('us-east-1 (N. Virginia)');
  const [avatarImage, setAvatarImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('secretDummyPassword123');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sync initial user data
  useEffect(() => {
    if (platformUser) {
      if (platformUser.first_name || platformUser.last_name) {
        setFirstName(platformUser.first_name || '');
        setLastName(platformUser.last_name || '');
      } else if (platformUser.name) {
        const parts = platformUser.name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      setPhone(platformUser.phone || '+1 (555) 349-8812');
      if (platformUser.emergency_phone) setEmergencyPhone(platformUser.emergency_phone);
      if (platformUser.region) setRegion(platformUser.region);
      if (platformUser.avatar) setAvatarImage(platformUser.avatar);
    }
  }, [platformUser]);

  // Password entropy/strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'NOT STARTED', percent: 0, color: 'bg-slate-300 dark:bg-slate-700', textClass: 'text-slate-400' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) {
      return { score: 1, label: 'WEAK', percent: 25, color: 'bg-rose-500', textClass: 'text-rose-500 font-bold' };
    } else if (score === 2 || score === 3) {
      return { score: 2, label: 'MODERATE', percent: 65, color: 'bg-amber-500', textClass: 'text-amber-500 font-bold' };
    } else {
      return { score: 4, label: 'STRONG / SOC-2 READY', percent: 100, color: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400 font-bold' };
    }
  };

  const strength = getPasswordStrength(newPassword);

  // Handle avatar upload preview
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size should be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAvatarImage(evt.target.result);
        showToast('Avatar preview updated. Click "Save Changes" to persist.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile information
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim() || platformUser?.name,
        phone: phone.trim(),
        emergency_phone: emergencyPhone.trim(),
        region: region.trim(),
        avatar: avatarImage,
      };

      await platformApi.updateProfile(payload);
      await refreshUser();
      showToast('Profile configuration saved successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword) {
      showToast('Please type a new password.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await platformApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('Operator password updated and validated.', 'success');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const displayName = `${firstName} ${lastName}`.trim() || platformUser?.name || 'Platform Operator';
  const displayInitials = (firstName ? firstName[0] : (platformUser?.name || platformUser?.email || 'P')[0]).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Breadcrumb & Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Operations Dashboard</span>
        </button>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <span>Settings</span>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Profile Management</span>
        </div>
      </div>

      {/* BEGIN: MyProfileHeaderBanner */}
      <div className="w-full bg-[#20548b] dark:bg-[#20548b] text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            {/* Personal Account Badge */}
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-blue-400/60 bg-blue-700/60 text-[10px] font-semibold tracking-wider uppercase text-blue-100 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse" />
              <span>Personal Account &bull; Managed Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Profile
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Keep your contact details current, configure mTLS credentials, and manage login security from one place.
            </p>
          </div>

          {/* Save Changes Button (Header) */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="inline-flex items-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 border border-slate-700 cursor-pointer disabled:opacity-70"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* END: MyProfileHeaderBanner */}

      {/* BEGIN: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Identity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            {/* Avatar Preview & Upload */}
            <div className="relative group cursor-pointer mb-3">
              <div className="w-28 h-28 rounded-2xl bg-[#20548b] text-white text-4xl font-extrabold flex items-center justify-center shadow-md ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span>{displayInitials}</span>
                )}
              </div>
              <label
                htmlFor="avatarUploadInput"
                className="absolute bottom-1 right-1 w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Upload new photo"
              >
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <input
                  id="avatarUploadInput"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-[11px] text-slate-400">Click icon to change picture</span>

            {/* Identity Info */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {displayName}
            </h2>
            <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-900/60 mt-1">
              {roleConfig.name || platformUser?.role || 'Platform Staff'}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1.5 font-mono">
              {platformUser?.email || 'admin@kargoflow.net'}
            </p>

            {/* Status Pill */}
            <div className="mt-4 flex items-center space-x-1.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Active Presence
              </span>
            </div>

            {/* Quick ID Box */}
            <div className="w-full mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Operator ID</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {platformUser?.id || 'USR-94021'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Primary Region</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {region}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Details Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Direct Contact
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-semibold">
                Verified
              </span>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-slate-500">Emergency Phone</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{emergencyPhone}</p>
            </div>
            <div className="text-xs space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-slate-500">Security Clearance</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {platformUser?.company_scope_type === 'all' ? 'Global Scope — All Infrastructure' : 'Tier 2 — Assigned Companies'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Forms (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Personal Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Profile Details
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Personal Information
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">All fields encrypted</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update your operational details. Primary email is federated through SSO and remains locked.
            </p>

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="firstName">
                    First Name
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                {/* Last Name Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="lastName">
                    Last Name
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>

                {/* Email Address Field (Locked) */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="emailAddress">
                    Email Address (SSO Tied)
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      id="emailAddress"
                      type="email"
                      value={platformUser?.email || 'admin@kargoflow.net'}
                      readOnly
                      disabled
                      className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-mono rounded-xl cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone Number Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="phoneNumber">
                    Direct Mobile / SMS
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone size={16} />
                    </div>
                    <input
                      id="phoneNumber"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Section 2: Password and PIN Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Security Credentials
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Password &amp; Control PIN
                </h3>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                Hardware 2FA Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure your master operator credentials. Changes require verification against your current password.
            </p>

            <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current Password */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full pl-9 pr-9 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="block w-full pl-9 pr-9 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  <span>Entropy &amp; Complexity Check</span>
                  <span className={strength.textClass}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>

              {/* Footer with Change Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Must include 8+ chars, capital letters, and special symbols.
                </p>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 border border-slate-700 cursor-pointer disabled:opacity-70"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* END: Two Column Layout */}
    </div>
  );
}
