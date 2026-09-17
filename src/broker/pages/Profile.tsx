import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { User, Shield, Phone, Mail, Award, CheckCircle, Building2, MapPin, Hash, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { getBrokerProfile, updateBrokerProfile } from '../services/profile.service';
import type { BrokerProfile } from '../services/profile.service';
import { getStates, getCities, type State } from '../../pages/api/masters';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useBrokerConnect } from '../../context/BrokerConnectContext';

export const ProfilePage: React.FC = () => {
  const { currentRole } = useBrokerConnect();
  const [profile, setProfile] = useState<BrokerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // State / City API
  const [statesList, setStatesList] = useState<State[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Editable field states (pre-filled from API)
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [reraNum, setReraNum] = useState('');
  const [panNum, setPanNum] = useState('');
  const [gstNum, setGstNum] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gender, setGender] = useState('');

  // Fetch all states on mount
  useEffect(() => {
    const loadStates = async () => {
      setStatesLoading(true);
      try {
        const res = await getStates();
        if (res.success) {
          setStatesList(res.data);
          setStateOptions(res.data.map(s => s.state_name));
        }
      } catch { /* silent */ } finally {
        setStatesLoading(false);
      }
    };
    loadStates();
  }, []);

  // Fetch cities whenever state changes
  useEffect(() => {
    if (!state) { setCityOptions([]); return; }
    const selectedStateObj = statesList.find(s => s.state_name === state);
    const stateId = selectedStateObj ? selectedStateObj.id : undefined;
    if (!stateId) return;
    const loadCities = async () => {
      setCitiesLoading(true);
      try {
        const res = await getCities(stateId);
        if (res.success) setCityOptions(res.data.map(c => c.city_name));
      } catch { /* silent */ } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
  }, [state, statesList]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getBrokerProfile();
      if (res.success && res.data) {
        const d = res.data;
        setProfile(d);
        setName(d.full_name || d.broker_name || '');
        setCompanyName(d.company_name || '');
        setMobile(d.contact_number || d.mobile_number || '');
        setEmail(d.email || '');
        setReraNum(d.rera_registration_number || '');
        setPanNum(d.pan_number || '');
        setGstNum(d.gst_number || '');

        const details = d.basic_details;
        setAlternateMobile(details?.alternate_number || d.alternate_mobile || '');
        setAddressLine1(details?.address_line_1 || d.address_line_1 || '');
        setAddressLine2(details?.address_line_2 || d.address_line_2 || '');
        setState(details?.state || d.state || '');
        setCity(details?.city || d.city || '');
        setPincode(details?.pincode || d.pincode || '');
        setGender(details?.gender || d.gender || '');

        Cookies.set('full_name', d.full_name || d.broker_name || '', { expires: 1 });
      } else {
        toast.error('Failed to load profile data.');
      }
    } catch (err) {
      toast.error('Could not reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Alternate mobile validation: must be exactly 10 digits if provided
    if (alternateMobile && alternateMobile.trim()) {
      const cleanedAlt = alternateMobile.replace(/\D/g, '');
      if (cleanedAlt.length !== 10) {
        toast.error('Alternate mobile number must be exactly 10 digits.');
        return;
      }
    }

    // Pincode validation: must be exactly 6 digits if provided
    if (pincode && pincode.trim()) {
      const cleanedPin = pincode.replace(/\D/g, '');
      if (cleanedPin.length !== 6) {
        toast.error('Pincode must be exactly 6 digits.');
        return;
      }
    }

    // Gender validation: must not be empty/placeholder
    if (!gender || gender === 'Select gender') {
      toast.error('Please select a valid gender.');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      const res = await updateBrokerProfile({
        email: email || undefined,
        gst_number: gstNum || undefined,
        rera_registration_number: reraNum || undefined,
        address_line_1: addressLine1 || undefined,
        address_line_2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        alternate_number: alternateMobile || undefined,
        gender: gender || undefined,
      });
      if (res.success) {
        setShowConfirmModal(false);
        Swal.fire({
          title: 'Profile Updated!',
          text: 'Your profile changes have been successfully saved and synchronized.',
          icon: 'success',
          timer: 2200,
          showConfirmButton: false,
          timerProgressBar: true,
          iconColor: '#10B981',
          customClass: {
            popup: 'rounded-2xl border border-slate-100 shadow-2xl p-6 font-sans',
            title: 'text-lg font-extrabold text-slate-800',
            htmlContainer: 'text-xs text-slate-500 font-semibold mt-2'
          }
        });
        // Re-fetch latest profile from server to keep UI in sync
        await fetchProfile();
      } else {
        toast.error(res.message || 'Update failed. Please try again.');
      }
    } catch {
      toast.error('Could not reach server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isVerified = profile ? (profile.email_verified === 1 && profile.mobile_verified === 1) : false;

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-bold text-[#0F172A]">My Profile</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {currentRole === 'broker'
              ? 'Manage your channel partner business profile & credentials'
              : currentRole === 'sales'
              ? 'Manage your sales account profile details'
              : currentRole === 'receptionist'
              ? 'Manage your receptionist account profile details'
              : currentRole === 'calling'
              ? 'Manage your calling agent account profile details'
              : currentRole === 'channel_partner'
              ? 'Manage your channel partner portal profile details'
              : 'Manage your profile details'}
          </p>
        </div>
        <div className="bg-white p-12 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">My Profile</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {currentRole === 'broker'
                ? 'Manage your channel partner business profile & credentials'
                : currentRole === 'sales'
                ? 'Manage your sales account profile details'
                : currentRole === 'receptionist'
                ? 'Manage your receptionist account profile details'
                : currentRole === 'calling'
                ? 'Manage your calling agent account profile details'
                : currentRole === 'channel_partner'
                ? 'Manage your channel partner portal profile details'
                : 'Manage your profile details'}
            </p>
          </div>
          {profile && currentRole === 'broker' && isVerified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6">
        {/* Personal Info Section */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  disabled
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company / Agency Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={companyName}
                  disabled
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none placeholder-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contact Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={mobile}
                  disabled
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alternate Mobile</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold cursor-pointer"
              >
                <option value="" disabled hidden>Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {currentRole === 'broker' && (
          <>
            <div className="border-t border-slate-100" />

            {/* Credentials Section */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Credentials &amp; Compliance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RERA Registration</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Award className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={reraNum}
                      onChange={(e) => setReraNum(e.target.value)}
                      placeholder="—"
                      className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PAN Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-300">
                      <Shield className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={panNum}
                      disabled
                      placeholder="—"
                      className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 font-semibold cursor-not-allowed select-none placeholder-slate-300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 lg:col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GST Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={gstNum}
                      onChange={(e) => setGstNum(e.target.value)}
                      placeholder="—"
                      className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-slate-100" />

        {/* Address Section */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 1</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address Line 2</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">State</label>
              <SearchableSelect
                value={state}
                onChange={(val) => { setState(val); setCity(''); }}
                options={stateOptions}
                placeholder="Select state"
                loading={statesLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">City</label>
              <SearchableSelect
                value={city}
                onChange={setCity}
                options={cityOptions}
                placeholder={state ? 'Select city' : 'Select state first'}
                loading={citiesLoading}
                disabled={!state || citiesLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pincode</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="—"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold placeholder-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        {profile && currentRole === 'broker' && isVerified && (
          <div className="p-4 bg-emerald-50 border-emerald-100 border rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <span className="text-xs font-bold block text-emerald-800">
                Verified Channel Partner Status
              </span>
              <span className="text-[10px] font-medium block mt-0.5 text-emerald-700">
                Your email and mobile are verified. You are authorized to lock leads.
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-[#1A56DB] hover:bg-[#1648C0] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
        >
          Save Profile
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setShowConfirmModal(false)}
          />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>

            {/* Text */}
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Save Changes?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to update your profile? This will save all the changes you've made.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full mt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#1A56DB] hover:bg-[#1648C0] text-xs font-bold text-white transition disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : (
                  'Yes, Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
