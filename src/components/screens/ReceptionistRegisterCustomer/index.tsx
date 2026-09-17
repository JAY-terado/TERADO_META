import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../../CustomSelect';
import { SearchableSelect } from '../../ui/SearchableSelect';

import { useNavigate, useLocation } from 'react-router-dom';
import { useBrokerConnect } from '../../../context/BrokerConnectContext';
import { ArrowLeft, User, Phone, Mail, Building, Clock, MapPin, Loader2, ClipboardList, UserCheck, HelpCircle, AlertCircle, Check, ShieldCheck, Home, CreditCard, RefreshCw } from 'lucide-react';
import { getReceptionistProjects, requestCustomerMobileOtp, verifyCustomerMobileOtp, createReceptionistCustomer, reassignVisitor, getReceptionistBrokers, type CreateReceptionistCustomerPayload } from '../../../pages/api/registercustomer';
import { registerBroker, type RegisterBrokerPayload } from '../../../pages/api/register';
import { getStates, getCities, type State, type City } from '../../../pages/api/masters';
import Swal from 'sweetalert2';

export const ReceptionistRegisterCustomer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('Site Visit');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New optional details states
  const [residentialAddress, setResidentialAddress] = useState('');
  const [currentResidence, setCurrentResidence] = useState('');
  const [customCurrentResidence, setCustomCurrentResidence] = useState('');
  const [bookingPreferences, setBookingPreferences] = useState('');
  const [budget, setBudget] = useState('');
  const [possessionExpectation, setPossessionExpectation] = useState('');
  const [purposeOfBuying, setPurposeOfBuying] = useState('');
  const [sourceOfProjectInfo, setSourceOfProjectInfo] = useState('');

  // Referral states
  const [isReferred, setIsReferred] = useState(false);
  const [referredName, setReferredName] = useState('');
  const [referredMobile, setReferredMobile] = useState('');
  const [referredEmail, setReferredEmail] = useState('');

  // Channel Partner states
  const [selectedChannelPartner, setSelectedChannelPartner] = useState('');
  const [brokersList, setBrokersList] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  // Register CP Modal states
  const [showRegisterCpModal, setShowRegisterCpModal] = useState(false);
  const [cpBrokerName, setCpBrokerName] = useState('');
  const [cpCompanyName, setCpCompanyName] = useState('');
  const [cpMobileNumber, setCpMobileNumber] = useState('');
  const [cpAddressLine1, setCpAddressLine1] = useState('');
  const [cpState, setCpState] = useState('');
  const [cpCity, setCpCity] = useState('');
  const [cpPincode, setCpPincode] = useState('');

  const [cpStatesList, setCpStatesList] = useState<State[]>([]);
  const [cpCitiesList, setCpCitiesList] = useState<City[]>([]);
  const [loadingCpStates, setLoadingCpStates] = useState(false);
  const [loadingCpCities, setLoadingCpCities] = useState(false);
  const [isRegisteringCp, setIsRegisteringCp] = useState(false);
  const [cpErrors, setCpErrors] = useState<Record<string, string>>({});
  const [cpTouched, setCpTouched] = useState<Record<string, boolean>>({});
  const [cpGeneralError, setCpGeneralError] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFetchBrokers = async (search = '', force = false) => {
    if (!force && search === '' && (brokersList.length > 0 || loadingBrokers)) return;
    setLoadingBrokers(true);
    try {
      const res = await getReceptionistBrokers(search);
      if (res && res.success && Array.isArray(res.data)) {
        setBrokersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch receptionist brokers:', err);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleSearchChange = (q: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleFetchBrokers(q, true);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch states when opening CP modal
  useEffect(() => {
    if (showRegisterCpModal) {
      const fetchStates = async () => {
        setLoadingCpStates(true);
        try {
          const res = await getStates();
          if (res && res.success) {
            setCpStatesList(res.data);
          }
        } catch (err) {
          console.error('Error fetching states for CP:', err);
        } finally {
          setLoadingCpStates(false);
        }
      };
      fetchStates();
    }
  }, [showRegisterCpModal]);

  const handleCpStateChange = async (selectedStateName: string) => {
    setCpState(selectedStateName);
    setCpCity('');
    setCpCitiesList([]);
    setCpErrors(prev => ({ ...prev, state: selectedStateName ? '' : 'State is required' }));

    if (!selectedStateName) return;

    const selectedStateObj = cpStatesList.find(s => s.state_name === selectedStateName);
    if (selectedStateObj) {
      setLoadingCpCities(true);
      try {
        const res = await getCities(selectedStateObj.id);
        if (res && res.success) {
          setCpCitiesList(res.data);
        }
      } catch (err) {
        console.error('Error fetching cities for CP:', err);
      } finally {
        setLoadingCpCities(false);
      }
    }
  };

  const validateCpField = (field: string, value: string) => {
    let err = '';
    const val = value.trim();
    if (field === 'brokerName') {
      if (!val) err = 'Broker Name is required';
      else if (val.length < 3) err = 'Name must be at least 3 characters';
      else if (!/^[a-zA-Z\s]+$/.test(val)) err = 'Name must contain only letters';
    } else if (field === 'mobileNumber') {
      if (!val) err = 'Mobile number is required';
      else if (val.length !== 10 || isNaN(Number(val))) err = 'Mobile number must be 10 digits';
    } else if (field === 'addressLine1') {
      if (!val) err = 'Address is required';
    } else if (field === 'state') {
      if (!val) err = 'State is required';
    } else if (field === 'city') {
      if (!val) err = 'City is required';
    } else if (field === 'pincode') {
      if (!val) err = 'Pincode is required';
      else if (val.length !== 6 || isNaN(Number(val))) err = 'Pincode must be 6 digits';
    }
    return err;
  };

  const handleCpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpGeneralError('');

    const fields = ['brokerName', 'mobileNumber', 'addressLine1', 'state', 'city', 'pincode'];
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(f => {
      newTouched[f] = true;
      let val = '';
      if (f === 'brokerName') val = cpBrokerName;
      else if (f === 'mobileNumber') val = cpMobileNumber;
      else if (f === 'addressLine1') val = cpAddressLine1;
      else if (f === 'state') val = cpState;
      else if (f === 'city') val = cpCity;
      else if (f === 'pincode') val = cpPincode;

      const err = validateCpField(f, val);
      if (err) newErrors[f] = err;
    });

    setCpTouched(newTouched);
    setCpErrors(newErrors);

    if (Object.values(newErrors).some(v => !!v)) {
      setCpGeneralError('Please fill in all mandatory fields correctly.');
      return;
    }

    setIsRegisteringCp(true);

    try {
      const payload: RegisterBrokerPayload = {
        broker_name: cpBrokerName.trim(),
        company_name: cpCompanyName.trim() || undefined,
        mobile_number: cpMobileNumber.trim(),
        address_line_1: cpAddressLine1.trim(),
        city: cpCity.trim(),
        state: cpState.trim(),
        pincode: cpPincode.trim(),
        status: 1
      };

      const res = await registerBroker(payload);
      if (res && res.success) {
        await Swal.fire({
          title: 'CP Registered Successfully!',
          text: `Channel Partner ${cpBrokerName} has been registered.`,
          icon: 'success',
          confirmButtonColor: '#10B981',
        });

        setLoadingBrokers(true);
        try {
          const freshRes = await getReceptionistBrokers();
          if (freshRes && freshRes.success && Array.isArray(freshRes.data)) {
            setBrokersList(freshRes.data);
            const newlyCreated = freshRes.data.find(b => b.mobile_number === cpMobileNumber.trim());
            if (newlyCreated) {
              setSelectedChannelPartner(String(newlyCreated.id));
            }
          }
        } catch (err) {
          console.error('Failed to refetch brokers:', err);
        } finally {
          setLoadingBrokers(false);
        }

        setCpBrokerName('');
        setCpCompanyName('');
        setCpMobileNumber('');
        setCpAddressLine1('');
        setCpState('');
        setCpCity('');
        setCpPincode('');
        setCpErrors({});
        setCpTouched({});
        setShowRegisterCpModal(false);
      } else {
        setCpGeneralError(res.message || 'Failed to register Channel Partner.');
      }
    } catch (err: any) {
      setCpGeneralError(err.response?.data?.message || err.message || 'An error occurred.');
    } finally {
      setIsRegisteringCp(false);
    }
  };

  const brokerSelectOptions = loadingBrokers
    ? [{ value: '', label: 'Loading partners...' }]
    : brokersList.length === 0
      ? [{ value: '', label: 'No partners found. Click to reload.' }]
      : brokersList.map((broker) => ({
        value: String(broker.id),
        label: `${broker.name} (${broker.mobile_number})${broker.company_name ? ` - ${broker.company_name}` : ''}`
      }));

  // Selected Project state
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // OTP states
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [otpPin, setOtpPin] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);
  const [isOtpVerifiedAnim, setIsOtpVerifiedAnim] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Modal states
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [autoAllottedPerson, setAutoAllottedPerson] = useState<any>(null);
  const [changeAllotment, setChangeAllotment] = useState(false);
  const [chosenSalesPersonId, setChosenSalesPersonId] = useState('');
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [createdVisitId, setCreatedVisitId] = useState<string | number>('');

  // API Data
  const [receptionProjects, setReceptionProjects] = useState<any[]>([]);
  const [allSalesPersons, setAllSalesPersons] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const projectOptions = receptionProjects.map((proj: any) => ({
    value: String(proj.project_id || proj.id),
    label: proj.project_name || proj.name
  }));

  useEffect(() => {
    if (location.state && location.state.revisitCustomer) {
      const { name, mobile, email, residential_address, current_residence, budget, purpose_of_buying } = location.state.revisitCustomer;
      if (name) setName(name);
      if (mobile) {
        setMobile(mobile);
        setIsMobileVerified(true);
      }
      if (email) setEmail(email);
      if (residential_address) setResidentialAddress(residential_address);
      if (current_residence) {
        if (['1 BHK', '2 BHK', '3 BHK'].includes(current_residence)) {
          setCurrentResidence(current_residence);
        } else if (current_residence) {
          setCurrentResidence('Other');
          setCustomCurrentResidence(current_residence);
        }
      }
      if (budget) setBudget(budget);
      if (purpose_of_buying) setPurposeOfBuying(purpose_of_buying);
    }
  }, [location.state]);

  useEffect(() => {
    if (mobileOtpSent && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [mobileOtpSent]);

  // Close modals on Esc key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileOtpSent) {
          setMobileOtpSent(false);
          setOtpPin('');
          setOtpError('');
        }
        if (showAllotModal) {
          setShowAllotModal(false);
        }
        if (showRegisterCpModal) {
          setShowRegisterCpModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOtpSent, showAllotModal, showRegisterCpModal]);

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mobileOtpSent && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mobileOtpSent, resendCooldown]);

  useEffect(() => {
    const fetchProjectsAndSales = async () => {
      setLoadingSales(true);
      try {
        const res = await getReceptionistProjects();
        if (res && res.success && Array.isArray(res.data)) {
          setReceptionProjects(res.data);

          // Flat list of unique sales executives across all projects
          const flatList: any[] = [];
          const seenIds = new Set<number>();
          res.data.forEach((proj: any) => {
            if (Array.isArray(proj.sales_executives)) {
              proj.sales_executives.forEach((exec: any) => {
                if (exec && exec.id && !seenIds.has(exec.id)) {
                  seenIds.add(exec.id);
                  flatList.push(exec);
                }
              });
            }
          });
          setAllSalesPersons(flatList);
        } else {
          useMockData();
        }
      } catch (err) {
        console.error('Failed to load receptionist projects/sales executives:', err);
        useMockData();
      } finally {
        setLoadingSales(false);
      }
    };

    const useMockData = () => {
      const mockProjects = [
        {
          project_id: 22,
          project_name: "Evara",
          sales_executives: [
            { id: 12, full_name: "Rahul Sharma", contact_number: "9876543210", email: "rahul@example.com" },
            { id: 13, full_name: "Priya Patel", contact_number: "9876543211", email: "priya@example.com" }
          ]
        },
        {
          project_id: 23,
          project_name: "Aura",
          sales_executives: [
            { id: 14, full_name: "Vikram Singh", contact_number: "9876543212", email: "vikram@example.com" },
            { id: 15, full_name: "Neha Gupta", contact_number: "9876543213", email: "neha@example.com" }
          ]
        }
      ];
      setReceptionProjects(mockProjects);

      const flatList: any[] = [];
      const seenIds = new Set<number>();
      mockProjects.forEach((proj: any) => {
        proj.sales_executives.forEach((exec: any) => {
          if (!seenIds.has(exec.id)) {
            seenIds.add(exec.id);
            flatList.push(exec);
          }
        });
      });
      setAllSalesPersons(flatList);
    };

    fetchProjectsAndSales();
  }, []);

  // Auto-select project when there is only one project
  useEffect(() => {
    if (receptionProjects.length === 1) {
      setSelectedProjectId(String(receptionProjects[0].project_id || receptionProjects[0].id));
    }
  }, [receptionProjects]);

  const purposeOptions = [
    'Site Visit',
    'Meeting with Sales Team',
    'Consultation / Inquiry',
    'Document Submission',
    'Other Walk-in'
  ];

  // Send OTP
  const handleSendMobileOtp = async () => {
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setVerifyingMobileOtp(true);
    setOtpError('');
    try {
      const res = await requestCustomerMobileOtp(mobile);
      if (res && res.success) {
        setOtpPin('');
        setMobileOtpSent(true);
        setResendCooldown(30);
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred while sending OTP.';
      setError(errMsg);
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyMobileOtp = async (codeOverride?: string) => {
    const code = codeOverride || otpPin;
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    setVerifyingMobileOtp(true);
    setOtpError('');
    try {
      const res = await verifyCustomerMobileOtp(mobile, code);
      if (res && res.success) {
        setIsOtpVerifiedAnim(true);
        setOtpError('');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsMobileVerified(true);
        setMobileOtpSent(false);
        setIsOtpVerifiedAnim(false);
        setError('');
      } else {
        setOtpError(res.message || 'Invalid OTP code. Please try again.');
        setOtpPin('');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred during verification.';
      setOtpError(errMsg);
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  const handleOtpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 6) {
      setOtpPin(val);
      if (val.length === 6) {
        handleVerifyMobileOtp(val);
      } else {
        setOtpError('');
      }
    }
  };

  // Open allotment modal after validating basic customer details and creating the customer
  const handleOpenAllotModal = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!name.trim() || !mobile.trim()) {
      setError('Please fill in all required fields (Name and Mobile Number).');
      return;
    }

    if (!isMobileVerified) {
      setError('Please verify the mobile number before allotting a sales person.');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      setError('Customer name must only contain letters and spaces.');
      return;
    }

    if (name.trim().length < 3) {
      setError('Customer name must be at least 3 characters.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isReferred) {
      if (!referredName.trim() || !referredMobile.trim()) {
        setError('Please fill in all referrer fields (Name and Mobile Number).');
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(referredName.trim())) {
        setError('Referrer name must only contain letters and spaces.');
        return;
      }
      if (referredName.trim().length < 3) {
        setError('Referrer name must be at least 3 characters.');
        return;
      }
      if (referredMobile.length !== 10) {
        setError('Referrer mobile number must be exactly 10 digits.');
        return;
      }
      if (referredEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referredEmail)) {
        setError('Please enter a valid referrer email address.');
        return;
      }
    }

    if (!selectedProjectId) {
      setError('Please select a project.');
      return;
    }

    if (!residentialAddress.trim()) {
      setError('Please enter the residential address.');
      return;
    }

    if (!bookingPreferences) {
      setError('Please select a booking preference.');
      return;
    }

    if (!sourceOfProjectInfo) {
      setError('Please select the source of project information.');
      return;
    }

    if (sourceOfProjectInfo === 'Channel partner' && !selectedChannelPartner) {
      setError('Please select a channel partner.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      let finalNote = notes;
      if (isReferred) {
        const referralDetails = `[Referred By] Name: ${referredName.trim()}, Mobile: ${referredMobile.trim()}${referredEmail.trim() ? `, Email: ${referredEmail.trim()}` : ''}`;
        finalNote = notes ? `${notes}\n\n${referralDetails}` : referralDetails;
      } else if (selectedChannelPartner) {
        const cpName = brokersList.find(b => String(b.id) === selectedChannelPartner)?.name || selectedChannelPartner;
        const cpDetails = `[Channel Partner Association] Partner: ${cpName}`;
        finalNote = notes ? `${notes}\n\n${cpDetails}` : cpDetails;
      }

      const payload: CreateReceptionistCustomerPayload = {
        customer_name: name,
        mobile_number: mobile,
        email: email || undefined,
        project_id: Number(selectedProjectId),
        budget: budget || undefined,
        unit_type: bookingPreferences || undefined,
        expected_booking_duration: possessionExpectation || undefined,
        current_residence: currentResidence === 'Other' ? (customCurrentResidence || 'Other') : (currentResidence || undefined),
        purpose_of_buying: purposeOfBuying || undefined,
        broker_id: selectedChannelPartner ? Number(selectedChannelPartner) : undefined,
        referredByName: isReferred ? referredName.trim() : undefined,
        referredByMobileNumber: isReferred ? referredMobile.trim() : undefined,
        referredByEmail: (isReferred && referredEmail.trim()) ? referredEmail.trim() : undefined,
        source: 'Walk-In',
        note: finalNote,
        purpose: purpose,
        residential_address: residentialAddress || undefined,
        source_of_project_information: sourceOfProjectInfo || undefined,
      };

      const res = await createReceptionistCustomer(payload);
      console.log('Create customer response:', res);
      if (res && res.success) {
        // Safe check for visit ID inside nested visit object, falling back to other possible locations
        const rAny = res as any;
        const visitIdVal =
          rAny.data?.visit?.id ||
          rAny.data?.visit_id ||
          rAny.visit?.id ||
          rAny.visit_id ||
          rAny.data?.id ||
          rAny.id ||
          '';
        setCreatedVisitId(visitIdVal);

        const serverExec = 
          rAny.data?.assigned_executive ||
          rAny.assigned_executive ||
          rAny.data?.assignedExecutive ||
          rAny.assignedExecutive ||
          null;

        if (serverExec) {
          const allottedExec = {
            id: serverExec.id,
            full_name: serverExec.name || serverExec.full_name || 'Not Allotted',
            contact_number: serverExec.contact || serverExec.contact_number || 'N/A',
            email: serverExec.email || 'No email'
          };
          setAutoAllottedPerson(allottedExec);
          setChosenSalesPersonId(String(serverExec.id));
        } else {
          setAutoAllottedPerson(null);
          setChosenSalesPersonId('');
        }

        setChangeAllotment(false);
        setReason('');
        setModalError('');
        setShowAllotModal(true);
      } else {
        setError(res.message || 'Failed to create customer record.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred while creating the customer record.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit allocation and create customer
  const handleAssignSalesPerson = async () => {
    // Reason is mandatory ONLY if changeAllotment checkbox is checked!
    if (changeAllotment && !reason.trim()) {
      setModalError('Reason for allotment is required.');
      return;
    }
    setModalError('');
    setSubmitting(true);

    const finalExecId = changeAllotment ? chosenSalesPersonId : String(autoAllottedPerson?.id);
    const finalExec = allSalesPersons.find(p => String(p.id) === finalExecId) || autoAllottedPerson;

    try {
      if (changeAllotment) {
        if (!createdVisitId) {
          setModalError('Cannot reassign: Visit ID was not returned by the server. Please reload and try again.');
          setSubmitting(false);
          return;
        }
        const res = await reassignVisitor(createdVisitId, {
          sales_executive_id: Number(finalExecId),
          note: reason
        });
        if (res && !res.success) {
          setModalError(res.message || 'Failed to reassign the sales executive.');
          setSubmitting(false);
          return;
        }
      }

      setSubmitting(false);
      setShowAllotModal(false);

      const cpName = selectedChannelPartner
        ? (brokersList.find(b => String(b.id) === selectedChannelPartner)?.name || selectedChannelPartner)
        : '';

      await Swal.fire({
        title: changeAllotment ? 'Walk-In Reassigned & Allocated!' : 'Walk-In Registered & Allocated!',
        html: `
          <div class="text-left space-y-2 mt-2 text-slate-600 text-sm">
            <p><strong>Customer:</strong> ${name}</p>
            <p><strong>Mobile:</strong> ${mobile}</p>
            <p><strong>Purpose of Visit:</strong> ${purpose}</p>
            ${isReferred ? `<p><strong>Referred By:</strong> ${referredName} (${referredMobile})</p>` : ''}
            ${selectedChannelPartner ? `<p><strong>Channel Partner:</strong> ${cpName}</p>` : ''}
            ${changeAllotment ? `<p><strong>Reason for Allotment:</strong> ${reason}</p>` : ''}
            <p class="text-emerald-600 font-bold"><strong>Allocated Executive:</strong> ${finalExec?.full_name || 'N/A'} (Checked-In)</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Go to Dashboard'
      });

      navigate('/receptionist/dashboard');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'An error occurred during sales person assignment.';
      setModalError(errMsg);
      setSubmitting(false);
    }
  };

  const filteredSalesPersons = selectedProjectId
    ? (receptionProjects.find((p: any) => String(p.project_id || p.id) === selectedProjectId)?.sales_executives || allSalesPersons)
    : allSalesPersons;

  const salesOptions = filteredSalesPersons.map((p: any) => ({
    value: String(p.id),
    label: `${p.full_name} (${p.contact_number})`
  }));

  return (
    <div className="space-y-6 text-left animate-fade-up">
      {/* Header Panel */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)]">
        <button
          onClick={() => navigate('/receptionist/dashboard')}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Create Walk-in Customer</h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
            Reception Desk &gt; Register New Walk-in / Visitor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form panel */}
        <form
          onSubmit={handleOpenAllotModal}
          className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/80 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] space-y-6"
        >
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="animate-pulse">{error}</span>
              {(error.toLowerCase().includes('already') ||
                error.toLowerCase().includes('exists') ||
                error.toLowerCase().includes('registered') ||
                error.toLowerCase().includes('ownership') ||
                error.toLowerCase().includes('revisit') ||
                error.toLowerCase().includes('active') ||
                error.toLowerCase().includes('duplicate') ||
                error.toLowerCase().includes('protection')) && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('revisit_searchTerm', mobile || name || '');
                    navigate('/receptionist/customer-revisit');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 press shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Perform Revisit</span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                Visitor Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Project Selection Dropdown */}
              <div className="space-y-2 md:col-span-2 text-left">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Project <span className="text-red-500 ml-0.5">*</span></label>
                <CustomSelect
                  value={selectedProjectId}
                  onChange={(val) => {
                    setSelectedProjectId(val);
                    setChosenSalesPersonId('');
                    setAutoAllottedPerson(null);
                  }}
                  options={projectOptions}
                  placeholder="Select Project visiting for"
                  icon={Building}
                  className="w-full"
                  disabled={receptionProjects.length === 1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Customer Name <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter customer full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Mobile Number <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      disabled={isMobileVerified}
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10));
                        setIsMobileVerified(false);
                      }}
                      className={`block w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 font-semibold ${isMobileVerified ? 'border-emerald-250 bg-emerald-50/10 text-emerald-700' : 'border-slate-200 text-slate-800'
                        }`}
                    />
                  </div>
                  {mobile.length === 10 && !isMobileVerified && (
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0 flex items-center justify-center press"
                    >
                      Send OTP
                    </button>
                  )}
                  {isMobileVerified && (
                    <span className="flex items-center gap-1.5 px-3 bg-emerald-50 border border-emerald-100 text-emerald-650 font-extrabold text-xs uppercase tracking-wider rounded-xl shrink-0 select-none">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email Address (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Additional Details (Optional) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Additional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Residential Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Residential Address <span className="text-red-500 ml-0.5">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter residential address"
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Current Residence */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Current Residence</label>
                <CustomSelect
                  value={currentResidence}
                  onChange={(val) => {
                    setCurrentResidence(val);
                    if (val !== 'Other') {
                      setCustomCurrentResidence('');
                    }
                  }}
                  options={['1 BHK', '2 BHK', '3 BHK', 'Other']}
                  placeholder="Select Current Residence"
                  icon={Home}
                  className="w-full"
                />
              </div>

              {/* Booking Preferences */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Booking Preferences <span className="text-red-500 ml-0.5">*</span></label>
                <CustomSelect
                  value={bookingPreferences}
                  onChange={(val) => setBookingPreferences(val)}
                  options={['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Jodi Flat']}
                  placeholder="Select Preference"
                  icon={Home}
                  className="w-full"
                />
              </div>

              {/* Custom Current Residence (shown only if 'Other' is selected) */}
              {currentResidence === 'Other' && (
                <div className="space-y-2 md:col-span-2 animate-in slide-in-from-top-1.5 duration-200">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Specify Current Residence</label>
                  <input
                    type="text"
                    placeholder="Enter current residence details (e.g. Penthouse, 4BHK, Villa)"
                    value={customCurrentResidence}
                    onChange={(e) => setCustomCurrentResidence(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                </div>
              )}

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Budget</label>
                <CustomSelect
                  value={budget}
                  onChange={(val) => setBudget(val)}
                  options={['41-50L', '51-60L', '61-70L', '71-80L', '81-90L', '90L-1CR', '1CR & above']}
                  placeholder="Select Budget"
                  icon={CreditCard}
                  className="w-full"
                />
              </div>

              {/* Possession Expectation */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Possession Expectation</label>
                <CustomSelect
                  value={possessionExpectation}
                  onChange={(val) => setPossessionExpectation(val)}
                  options={['Ready', '6 Months', '1 Year', '2 Year & Above']}
                  placeholder="Select Possession Expectation"
                  icon={Clock}
                  className="w-full"
                />
              </div>

              {/* Purpose of Buying */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Purpose of Buying</label>
                <CustomSelect
                  value={purposeOfBuying}
                  onChange={(val) => setPurposeOfBuying(val)}
                  options={['Investment', 'End Use']}
                  placeholder="Select Purpose of Buying"
                  icon={HelpCircle}
                  className="w-full"
                />
              </div>

              {/* Source of Project Information */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Source of Project Information <span className="text-red-500 ml-0.5">*</span></label>
                <CustomSelect
                  value={sourceOfProjectInfo}
                  onChange={(val) => {
                    setSourceOfProjectInfo(val);
                    if (val === 'Referral') {
                      setIsReferred(true);
                      setSelectedChannelPartner(''); // Clear Channel Partner
                    } else if (val === 'Channel partner') {
                      setIsReferred(false);
                      setReferredName('');
                      setReferredMobile('');
                      setReferredEmail('');
                      handleFetchBrokers();
                    } else {
                      setIsReferred(false);
                      setReferredName('');
                      setReferredMobile('');
                      setReferredEmail('');
                      setSelectedChannelPartner('');
                    }
                  }}
                  options={['Direct', 'Channel partner', 'Referral', 'Employee', 'Print Ad', 'Hoarding', 'SMS', 'Digital (Website/Email/Social Media)']}
                  placeholder="Select Source"
                  icon={HelpCircle}
                  className="w-full"
                />
              </div>

              {/* Searchable Channel Partner Dropdown (shown when Channel partner is selected) */}
              {sourceOfProjectInfo === 'Channel partner' && (
                <div className="space-y-2 md:col-span-2 animate-in slide-in-from-top-1.5 duration-200">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Select Channel Partner <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <SearchableSelect
                    value={
                      (() => {
                        const found = brokersList.find((b) => String(b.id) === selectedChannelPartner);
                        if (!found) return '';
                        return found.company_name
                          ? `${found.company_name} - ${found.name} (${found.mobile_number})`
                          : `${found.name} (${found.mobile_number})`;
                      })()
                    }
                    onChange={(val) => {
                      const found = brokersList.find(
                        (b) => {
                          const optionText = b.company_name
                            ? `${b.company_name} - ${b.name} (${b.mobile_number})`
                            : `${b.name} (${b.mobile_number})`;
                          return optionText === val || b.name === val;
                        }
                      );
                      setSelectedChannelPartner(found ? String(found.id) : '');
                    }}
                    onSearchChange={handleSearchChange}
                    options={brokersList.map((b) =>
                      b.company_name
                        ? `${b.company_name} - ${b.name} (${b.mobile_number})`
                        : `${b.name} (${b.mobile_number})`
                    )}
                    placeholder={loadingBrokers ? 'Loading partners...' : 'Search & Select Channel Partner'}
                    loading={loadingBrokers}
                    icon={Building}
                  />
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Registering CP directly by <button type="button" onClick={() => setShowRegisterCpModal(true)} className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer">clicking here</button>
                  </div>
                </div>
              )}

              {/* Referral Input Fields (shown when Referral is selected) */}
              {sourceOfProjectInfo === 'Referral' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 p-4.5 bg-slate-50/50 border border-slate-200/50 rounded-2xl animate-in slide-in-from-top-2 duration-200 md:col-span-2 text-left">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Referred Name <span className="text-red-500 ml-0.5">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Enter referrer name"
                        value={referredName}
                        onChange={(e) => setReferredName(e.target.value)}
                        className="block w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                        required={isReferred}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Referred Mobile <span className="text-red-500 ml-0.5">*</span></label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="Enter 10-digit mobile"
                        value={referredMobile}
                        onChange={(e) => setReferredMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        className="block w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                        required={isReferred}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Referred Email (Optional)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="email"
                        placeholder="Enter referrer email"
                        value={referredEmail}
                        onChange={(e) => setReferredEmail(e.target.value)}
                        className="block w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Visit Allocation Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Visit Allocation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Purpose of Visit</label>
                <CustomSelect
                  value={purpose}
                  onChange={(val) => setPurpose(val)}
                  options={purposeOptions}
                  placeholder="Select Purpose"
                  icon={HelpCircle}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Comments / Visit Details</label>
                <textarea
                  rows={3}
                  placeholder="Enter any additional requirements, configurations, or visit notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/receptionist/dashboard')}
              className="flex-1 py-2.5 border border-slate-250 text-slate-600 hover:bg-slate-50 hover:border-slate-350 rounded-xl font-medium text-sm transition-all text-center press cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] cursor-pointer text-center flex items-center justify-center gap-2 press"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Allot Sales Person</span>
              )}
            </button>
          </div>
        </form>

        {/* Sidebar Help Card */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h4 className="text-sm font-bold tracking-wider uppercase text-emerald-400">Reception Guide</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Use this screen when a walk-in visitor arrives at the reception desk without an active broker booking pass:
            </p>
            <ul className="text-xs text-slate-400 space-y-2.5 list-disc list-inside">
              <li>Enter customer contact details.</li>
              <li>Verify the mobile number using the OTP code sent directly.</li>
              <li>Specify purpose of visit and details.</li>
              <li>Click **Allot Sales Person** to review and customize the assigned sales executive before finalizing.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {mobileOtpSent && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0A1628] via-[#10B981] to-[#059669] px-6 py-6 relative overflow-hidden text-center text-white">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  <Phone className="w-6 h-6 text-white animate-bounce" />
                </div>
                <h3 className="text-lg font-bold">Verify Mobile Number</h3>
                <p className="text-[11px] text-emerald-100/80 font-medium mt-1">
                  We've sent a 6-digit OTP code to <strong className="text-white">{mobile}</strong>
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-6 text-center">
              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold">
                  {otpError}
                </div>
              )}

              {/* Custom Smooth OTP input */}
              <div className="relative py-4 flex justify-center overflow-hidden min-h-[80px] w-full">
                <style>{`
                  @keyframes spin-dot {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>

                {/* Hidden input to capture keyboard events */}
                <input
                  ref={otpInputRef}
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpPin}
                  onChange={handleOtpInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ zIndex: 10 }}
                />

                {/* Verified Badge Container */}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-550 ease-out ${isOtpVerifiedAnim ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-6'
                    }`}
                  style={{ zIndex: 5 }}
                >
                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5.5 py-3 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.35)] border border-emerald-400/30">
                    <div className="w-6.5 h-6.5 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                      <ShieldCheck className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest block leading-none pr-1">Verified</span>
                  </div>
                </div>

                {/* OTP Circles Container */}
                <div
                  className="flex gap-2.5 justify-center relative select-none w-full animate-in fade-in"
                  onClick={() => otpInputRef.current?.focus()}
                  style={{ zIndex: 1 }}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = otpPin[index] || '';
                    const isFocused = otpPin.length === index;
                    const isComplete = otpPin.length === 6;

                    return (
                      <div
                        key={index}
                        className={`w-11 h-11 rounded-full border-2 bg-white flex items-center justify-center text-base font-black relative transition-all duration-300 ${isComplete
                          ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                          : isFocused
                            ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] scale-105'
                            : 'border-slate-200 text-slate-800'
                          }`}
                        style={
                          isOtpVerifiedAnim
                            ? {
                              transform: `translateX(${(2.5 - index) * 50}px) scale(0.1)`,
                              opacity: 0,
                              transition: 'all 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                            }
                            : {
                              transition: 'all 0.3s ease',
                            }
                        }
                      >
                        {char ? (
                          <span className="animate-in zoom-in duration-150">{char}</span>
                        ) : (
                          <span className="text-slate-300 font-normal text-xs">•</span>
                        )}

                        {/* Revolving Dot for complete state */}
                        {isComplete && !isOtpVerifiedAnim && (
                          <div
                            className="absolute inset-0 rounded-full animate-spin"
                            style={{
                              animationDuration: '1.2s',
                            }}
                          >
                            <div
                              className="absolute top-0 left-1/2 w-[7px] h-[7px] bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]"
                              style={{
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Use code received via SMS
              </span>

              {/* Resend OTP Section */}
              <div className="text-xs font-semibold text-slate-500 py-1">
                {resendCooldown > 0 ? (
                  <span>Resend OTP in <strong className="text-slate-700">{resendCooldown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={verifyingMobileOtp}
                    className="text-emerald-600 hover:text-emerald-700 font-extrabold transition hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto active:scale-95"
                  >
                    {verifyingMobileOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Resend OTP</span>
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 w-full">
                <button
                  type="button"
                  disabled={verifyingMobileOtp || isOtpVerifiedAnim}
                  onClick={() => handleVerifyMobileOtp()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] cursor-pointer press disabled:bg-emerald-400"
                >
                  Verify Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOtpSent(false);
                    setOtpPin('');
                    setOtpError('');
                  }}
                  className="w-full py-2.5 border border-slate-250 text-slate-500 font-semibold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer press"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Allotment Modal */}
      {showAllotModal && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#10B981] to-[#059669] px-6 py-6 text-center text-white relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mb-3">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold">Sales Person Allotment</h3>
                <p className="text-[11px] text-emerald-100/80 font-medium mt-1">
                  Allocate visitor to a Sales Executive
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-left">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Automatic Allocation Card */}
              <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    System Allotted {createdVisitId && `(Visit #${createdVisitId})`}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Auto-Allotted
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0F172A]">{autoAllottedPerson?.full_name || 'Not Allotted'}</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {autoAllottedPerson?.contact_number || 'N/A'} • {autoAllottedPerson?.email || 'No email'}
                  </p>
                </div>
              </div>

              {/* Change Assignment Toggle & Dropdown */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={changeAllotment}
                    onChange={(e) => setChangeAllotment(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500/20 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                    I want to change the Sales Person
                  </span>
                </label>

                {changeAllotment && (
                  <>
                    <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Select Sales Executive</label>
                      {salesOptions.length > 0 ? (
                        <CustomSelect
                          value={chosenSalesPersonId}
                          onChange={(val) => setChosenSalesPersonId(val)}
                          options={salesOptions}
                          placeholder="Choose Sales Executive"
                          icon={User}
                          className="w-full"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">
                          Loading available executives...
                        </div>
                      )}
                    </div>

                    {/* Reason for Allotment (Mandatory) */}
                    <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Reason for Allotment <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <textarea
                        rows={2.5}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason (e.g. Language compatibility, specific project query, VIP walk-in)"
                        className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800 font-semibold resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllotModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition press cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAssignSalesPerson}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition shadow-[0_4px_12px_rgba(16,185,129,0.2)] text-center flex items-center justify-center gap-1.5 press cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Allocating...</span>
                    </>
                  ) : (
                    <span>Assign Sales Person</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Register CP Modal */}
      {showRegisterCpModal && createPortal(
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0A1628]/75 backdrop-blur-md p-4 animate-fade-in">
          <form onSubmit={handleCpSubmit} className="bg-white rounded-3xl w-full max-w-lg flex flex-col shadow-[0_32px_80px_rgba(10,22,40,0.35)] overflow-hidden text-left animate-scale-in" style={{ maxHeight: 'min(90vh, 750px)' }}>
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#10B981] to-[#059669] px-6 py-5 relative overflow-hidden shrink-0 text-white">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Register Channel Partner</h3>
                    <p className="text-[11px] text-emerald-100/80 font-medium mt-0.5">Quick registration of a new CP</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterCpModal(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cpGeneralError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-655 rounded-xl text-xs font-semibold">
                  {cpGeneralError}
                </div>
              )}

              {/* CP Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Broker/CP Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={cpBrokerName}
                  onChange={(e) => {
                    setCpBrokerName(e.target.value);
                    setCpErrors(prev => ({ ...prev, brokerName: validateCpField('brokerName', e.target.value) }));
                  }}
                  className={`block w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition text-slate-800 font-semibold ${
                    cpTouched.brokerName && cpErrors.brokerName ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                  }`}
                  required
                />
                {cpTouched.brokerName && cpErrors.brokerName && (
                  <p className="text-red-500 text-[10px] font-semibold">{cpErrors.brokerName}</p>
                )}
              </div>

              {/* Company/Firm Name (Optional but helpful) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company/Firm Name</label>
                <input
                  type="text"
                  placeholder="Enter firm name (Optional)"
                  value={cpCompanyName}
                  onChange={(e) => setCpCompanyName(e.target.value)}
                  className="block w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition text-slate-800 font-semibold"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={cpMobileNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    setCpMobileNumber(val);
                    setCpErrors(prev => ({ ...prev, mobileNumber: validateCpField('mobileNumber', val) }));
                  }}
                  className={`block w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition text-slate-800 font-semibold ${
                    cpTouched.mobileNumber && cpErrors.mobileNumber ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                  }`}
                  required
                />
                {cpTouched.mobileNumber && cpErrors.mobileNumber && (
                  <p className="text-red-500 text-[10px] font-semibold">{cpErrors.mobileNumber}</p>
                )}
              </div>

              {/* Address Line 1 */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="House/Office No., Street, Locality"
                  value={cpAddressLine1}
                  onChange={(e) => {
                    setCpAddressLine1(e.target.value);
                    setCpErrors(prev => ({ ...prev, addressLine1: validateCpField('addressLine1', e.target.value) }));
                  }}
                  className={`block w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition text-slate-800 font-semibold ${
                    cpTouched.addressLine1 && cpErrors.addressLine1 ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                  }`}
                  required
                />
                {cpTouched.addressLine1 && cpErrors.addressLine1 && (
                  <p className="text-red-500 text-[10px] font-semibold">{cpErrors.addressLine1}</p>
                )}
              </div>

              {/* State, City, Pincode row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* State */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">State <span className="text-red-500">*</span></label>
                  {loadingCpStates ? (
                    <div className="flex items-center gap-1.5 h-8.5 px-3 border border-slate-250 rounded-xl bg-slate-50">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      <span className="text-[10px] text-slate-400 font-medium">Loading...</span>
                    </div>
                  ) : (
                    <SearchableSelect
                      options={cpStatesList.map(s => s.state_name)}
                      value={cpState}
                      onChange={handleCpStateChange}
                      placeholder="Select State"
                      className={cpTouched.state && cpErrors.state ? 'border-red-500 bg-red-50/10' : ''}
                    />
                  )}
                  {cpTouched.state && cpErrors.state && (
                    <p className="text-red-500 text-[9px] font-semibold">{cpErrors.state}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">City <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={cpCitiesList.map(c => c.city_name)}
                    value={cpCity}
                    onChange={(val) => {
                      setCpCity(val);
                      setCpErrors(prev => ({ ...prev, city: val ? '' : 'City is required' }));
                    }}
                    placeholder={!cpState ? "State first" : loadingCpCities ? "Loading..." : "Select City"}
                    disabled={loadingCpCities || !cpState}
                    className={cpTouched.city && cpErrors.city ? 'border-red-500 bg-red-50/10' : ''}
                  />
                  {cpTouched.city && cpErrors.city && (
                    <p className="text-red-500 text-[9px] font-semibold">{cpErrors.city}</p>
                  )}
                </div>

                {/* Pincode */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pincode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Pincode"
                    value={cpPincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setCpPincode(val);
                      setCpErrors(prev => ({ ...prev, pincode: validateCpField('pincode', val) }));
                    }}
                    className={`block w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500 transition text-slate-800 font-semibold ${
                      cpTouched.pincode && cpErrors.pincode ? 'border-red-500 bg-red-50/10' : 'border-slate-200'
                    }`}
                    required
                  />
                  {cpTouched.pincode && cpErrors.pincode && (
                    <p className="text-red-500 text-[9px] font-semibold">{cpErrors.pincode}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pt-3 pb-5 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowRegisterCpModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRegisteringCp}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 text-white rounded-xl font-bold text-xs transition shadow-[0_4px_14px_rgba(16,185,129,0.25)] cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                {isRegisteringCp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register CP</span>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
