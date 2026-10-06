import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Camera,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { updateMe, changePassword } from '../../../services/api';
import { useAuth } from '../context/AuthContext';

const Field = ({ label, icon: Icon, type = 'text', value, onChange, placeholder, disabled = false, autoComplete, rightElement }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-body/80 ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled group-focus-within:text-primary transition-colors" size={18} />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full bg-white/90 ring-1 ring-disabled/25 focus:ring-2 focus:ring-primary/20 border-b-2 border-transparent focus:border-primary ${Icon ? 'pl-11' : 'px-4'} ${rightElement ? 'pr-14' : 'pr-4'} py-3 rounded-xl outline-none text-sm font-medium transition-all shadow-sm disabled:bg-page disabled:text-disabled`}
      />
      {rightElement}
    </div>
  </div>
);

const StatusPill = ({ tone = 'success', children }) => {
  const toneClasses =
    tone === 'success'
      ? 'bg-primary-tint/20 text-primary border-primary/10'
      : 'bg-[#FDE8E8]/60 text-[#791F1F] border-[#F4B8B8]/50';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[0.6875rem] font-bold uppercase tracking-[0.18em] ${toneClasses}`}>
      {tone === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {children}
    </div>
  );
};

const SectionHeader = ({ eyebrow, title, description }) => (
  <div className="space-y-2">
    <p className="text-[0.625rem] font-bold uppercase tracking-[0.24em] text-body/70">{eyebrow}</p>
    <h2 className="text-xl font-heading font-bold text-heading">{title}</h2>
    <p className="text-sm leading-6 text-body max-w-2xl">{description}</p>
  </div>
);

const PasswordHint = ({ children }) => (
  <div className="flex items-start gap-2 rounded-xl border border-dashed border-primary/15 bg-primary-tint/10 px-4 py-3 text-sm text-body">
    <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
    <span>{children}</span>
  </div>
);

const getPasswordStrength = (password) => {
  const value = String(password || '');
  if (!value) return { label: 'Not started', tone: 'neutral', width: '0%' };

  const checks = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];

  const score = checks.filter(Boolean).length;

  if (score <= 2) return { label: 'Weak', tone: 'error', width: '33%' };
  if (score === 3 || score === 4) return { label: 'Good', tone: 'warning', width: '66%' };
  return { label: 'Strong', tone: 'success', width: '100%' };
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [formData, setFormData] = useState(user || {});
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) setFormData(user);
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const response = await updateMe({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      setFormData(response);
      setUser(response);
      localStorage.setItem('user', JSON.stringify(response));
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    setPasswordMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation must match.' });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await changePassword(passwordData);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordMessage({ type: 'success', text: response?.detail || 'Password changed successfully.' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      const errorData = err.response?.data || {};
      const errorMessage =
        errorData.current_password?.[0] ||
        errorData.new_password?.[0] ||
        errorData.confirm_password?.[0] ||
        errorData.detail ||
        'Failed to change password.';
      setPasswordMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || '';
    const last = formData.last_name?.[0] || '';
    return (first + last).toUpperCase() || formData.email?.[0].toUpperCase() || '?';
  };

  const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'Your Profile';
  const email = formData.email || 'No email available';
  const roleLabel = formData.employee_type || 'Team Member';
  const passwordStrength = getPasswordStrength(passwordData.new_password);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#0E2A47] via-[#12385E] to-[#1F4F80] text-white shadow-[0_30px_80px_rgba(9,28,48,0.22)]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-[#8BC4FF]/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#F7C46C]/20 blur-3xl" />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/85">
                <Shield size={12} />
                Personal Account
              </div>
              <div className="space-y-3">
                <h1 className="font-heading text-4xl md:text-5xl leading-tight">My Profile</h1>
                <p className="text-sm md:text-base leading-7 text-white/80">
                  Keep your contact details current and manage your login credentials from one place.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {profileMessage.text && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${profileMessage.type === 'success' ? 'border-emerald-200/30 bg-emerald-500/15 text-emerald-50' : 'border-rose-200/25 bg-rose-500/15 text-rose-50'}`}>
                  <div className="flex items-center gap-2">
                    {profileMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{profileMessage.text}</span>
                  </div>
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0E2A47] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#F7FAFD] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={18} />
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <Card className="xl:col-span-4 p-0 overflow-hidden border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="relative bg-gradient-to-br from-[#F8FBFF] to-[#EEF5FD] px-8 pt-10 pb-8">
            <div className="absolute inset-0 opacity-70">
              <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-[#F3C969]/20 blur-2xl" />
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative group">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-[6px] border-white bg-gradient-to-br from-primary via-[#1F5F99] to-[#0E2A47] text-5xl font-heading font-bold text-white shadow-[0_18px_45px_rgba(14,42,71,0.25)] transition-transform duration-300 group-hover:scale-[1.03]">
                  {getInitials()}
                </div>
                <button
                  type="button"
                  className="absolute bottom-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-body shadow-lg transition-transform hover:scale-110 hover:text-primary"
                  aria-label="Change profile photo"
                >
                  <Camera size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <h2 className="font-heading text-2xl font-bold text-heading">{fullName}</h2>
                <p className="text-sm font-medium text-body">{roleLabel}</p>
                <p className="text-sm text-body/80">{email}</p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <StatusPill tone="success">Active</StatusPill>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-body">
                  <ArrowRight size={12} className="text-primary" />
                  Personal account
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-8 py-6">
            <div className="rounded-2xl bg-page/70 px-4 py-3">
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.22em] text-body/70">Mobile</p>
              <p className="mt-1 text-sm font-medium text-heading">{formData.phone || 'Add a phone number'}</p>
            </div>
          </div>
        </Card>

        <div className="xl:col-span-8 space-y-8">
          <Card className="p-6 md:p-8 border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-8">
              <SectionHeader
                eyebrow="Profile Details"
                title="Personal Information"
                description="Update the details your team uses to reach you. Email stays locked because it is tied to your account."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  label="First Name"
                  icon={User}
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  autoComplete="given-name"
                />
                <Field
                  label="Last Name"
                  icon={User}
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  autoComplete="family-name"
                />
                <Field
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  disabled
                />
                <Field
                  label="Phone Number"
                  icon={Phone}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8 border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-8">
              <SectionHeader
                eyebrow="Security"
                title="Password and PIN"
                description="Change your login password here. For a smoother day-to-day workflow, keep your PIN easy to type but hard to guess."
              />

              {passwordMessage.text && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${passwordMessage.type === 'success' ? 'border-emerald-200/60 bg-emerald-50 text-emerald-800' : 'border-rose-200/60 bg-rose-50 text-rose-800'}`}>
                  <div className="flex items-center gap-2">
                    {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{passwordMessage.text}</span>
                  </div>
                </div>
              )}

              <PasswordHint>
                Use at least 8 characters and avoid reusing the same password. The current password is required to confirm ownership.
              </PasswordHint>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  label="Current Password"
                  icon={Lock}
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  rightElement={(
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold text-body/70 transition-colors hover:bg-page hover:text-primary"
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                />
                <Field
                  label="New Password"
                  icon={Lock}
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <Field
                  label="Confirm New Password"
                  icon={Lock}
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-body/70">
                  <span>Password strength</span>
                  <span className={passwordStrength.tone === 'success' ? 'text-emerald-700' : passwordStrength.tone === 'warning' ? 'text-amber-700' : passwordStrength.tone === 'error' ? 'text-rose-700' : 'text-body/70'}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-page overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength.tone === 'success'
                        ? 'bg-emerald-500'
                        : passwordStrength.tone === 'warning'
                          ? 'bg-amber-500'
                          : passwordStrength.tone === 'error'
                            ? 'bg-rose-500'
                            : 'bg-primary'
                    }`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <p className="text-sm text-body">Password changes take effect immediately after saving.</p>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Lock size={16} />
                  {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;