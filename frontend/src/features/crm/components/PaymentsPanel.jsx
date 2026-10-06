import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { PrimaryBtn, GhostBtn } from '../../../shared/ui/RedesignAtoms';
import { PaymentsTab } from './RedesignEstimateComponents';
import {
    getPayments,
    getPaymentRequests,
    getRefunds,
    getOpportunity,
    getPaymentGateways,
    createEstimateManualPayment,
    createRefund,
    createPaymentRequestAndSend,
    sendEstimateManualPaymentReceipt,
    sendManualJobPaymentReceipt,
} from '../../../services/api';

const PROVIDER_LABELS = {
    authorize_net: 'Authorize.net',
    square: 'Square',
    stripe: 'Stripe',
};

const FormInput = ({ label, icon: IconComp, as = 'input', children, ...props }) => {
    const Comp = as;
    return (
        <div className="space-y-1.5 text-left">
            {label ? <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label> : null}
            <div className="relative">
                {IconComp ? <IconComp size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /> : null}
                <Comp
                    className={`w-full ${IconComp ? 'pl-10' : 'px-4'} py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-slate-400 ${as === 'textarea' ? 'min-h-[120px] resize-none' : ''} ${props.type === 'number' ? 'no-spinner' : ''} ${props.className || ''}`}
                    {...props}
                >
                    {children}
                </Comp>
            </div>
        </div>
    );
};

const money = (value) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount)
        ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$0.00';
};

const titleCase = (value) => String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const gatewayDisplayName = (gateway) => {
    if (!gateway) return 'Payment Gateway';
    const displayName = String(gateway.display_name || gateway.name || '').trim();
    const provider = String(gateway.provider || '').trim().toLowerCase();
    return displayName || PROVIDER_LABELS[provider] || titleCase(provider) || 'Payment Gateway';
};

const gatewayProviderLabel = (gateway) => {
    const provider = String(gateway?.provider || gateway?.provider_name || '').trim().toLowerCase();
    return PROVIDER_LABELS[provider] || titleCase(provider) || 'Gateway';
};

const resolveOpportunityBranchId = (opportunity) =>
    opportunity?.branch?.id ||
    opportunity?.branch_id ||
    opportunity?.branch_details?.id ||
    '';

const requestMethodSummary = (paymentRequest, gateway) => {
    const gatewayName = gatewayDisplayName(gateway);
    const providerLabel = gatewayProviderLabel(gateway);
    const checkoutMode = String(paymentRequest?.provider_checkout_mode || '').trim();
    const modeLabel = checkoutMode ? titleCase(checkoutMode) : 'Hosted Checkout';
    return `${gatewayName} · ${providerLabel} · ${modeLabel}`;
};

const ModalPortal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
};

export default function PaymentsPanel({
    opportunityId,
    opportunityStatus,
    estimateId,
    jobId,
    canAddManualPayment = true,
    estimateTotal,
    depositValue = 0,
    onPaymentChange,
    onToast,
    hideSummary = false,
    autoLoad = true,
    opportunity,
    branchId: branchIdProp = '',
}) {
    const [payments, setPayments] = useState([]);
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [paymentGateways, setPaymentGateways] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsError, setPaymentsError] = useState('');

    const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
    const [createPaymentOption, setCreatePaymentOption] = useState('deposit');
    const [createPaymentGatewayId, setCreatePaymentGatewayId] = useState('');
    const [createPaymentAmount, setCreatePaymentAmount] = useState('');
    const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
    const [manualPaymentDraft, setManualPaymentDraft] = useState({
        method: 'e_transfer',
        amount: '',
        reference: '',
        note: '',
    });
    const [manualPaymentEditingId, setManualPaymentEditingId] = useState(null);

    const [receiptPayment, setReceiptPayment] = useState(null);
    const [receiptSendEmail, setReceiptSendEmail] = useState(false);
    const [receiptSendSms, setReceiptSendSms] = useState(false);
    const [receiptSelectedEmails, setReceiptSelectedEmails] = useState([]);
    const [receiptSelectedPhones, setReceiptSelectedPhones] = useState([]);
    const [receiptCustomEmail, setReceiptCustomEmail] = useState('');
    const [receiptCustomPhone, setReceiptCustomPhone] = useState('');
    const [isSendingReceipt, setIsSendingReceipt] = useState(false);
    const [resolvedBranchId, setResolvedBranchId] = useState(branchIdProp || '');

    const availableEmails = useMemo(() => {
        const list = [];
        const seen = new Set();
        const addEmail = (email, label) => {
            if (!email) return;
            const cleaned = email.trim();
            if (!cleaned || seen.has(cleaned.toLowerCase())) return;
            seen.add(cleaned.toLowerCase());
            list.push({ label, value: cleaned });
        };
        if (opportunity?.customer_details?.email) {
            addEmail(opportunity.customer_details.email, `Customer Primary: ${opportunity.customer_details.email}`);
        }
        if (opportunity?.email) {
            addEmail(opportunity.email, `Opportunity Email: ${opportunity.email}`);
        }
        if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
            opportunity.customer_details.contacts.forEach((contact) => {
                if (contact.email) {
                    addEmail(contact.email, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.email}` : `${contact.name}: ${contact.email}`);
                }
            });
        }
        if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
            opportunity.additional_contacts.forEach((contact) => {
                if (contact.email) {
                    addEmail(contact.email, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.email}` : `${contact.name}: ${contact.email}`);
                }
            });
        }
        return list;
    }, [opportunity]);

    const availablePhones = useMemo(() => {
        const list = [];
        const seen = new Set();
        const addPhone = (phone, label) => {
            if (!phone) return;
            const cleaned = phone.trim();
            if (!cleaned || seen.has(cleaned)) return;
            seen.add(cleaned);
            list.push({ label, value: cleaned });
        };
        if (opportunity?.customer_details?.phone) {
            addPhone(opportunity.customer_details.phone, `Customer Primary: ${opportunity.customer_details.phone}`);
        }
        if (opportunity?.phone) {
            addPhone(opportunity.phone, `Opportunity Phone: ${opportunity.phone}`);
        }
        if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
            opportunity.customer_details.contacts.forEach((contact) => {
                if (contact.phone) {
                    addPhone(contact.phone, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.phone}` : `${contact.name}: ${contact.phone}`);
                }
            });
        }
        if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
            opportunity.additional_contacts.forEach((contact) => {
                if (contact.phone) {
                    addPhone(contact.phone, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.phone}` : `${contact.name}: ${contact.phone}`);
                }
            });
        }
        return list;
    }, [opportunity]);

    const [refundPaymentId, setRefundPaymentId] = useState('');
    const [refundAmount, setRefundAmount] = useState('');

    const showToast = (type, text) => {
        if (onToast) {
            onToast({ type, text });
        } else {
            console.log(`[Toast ${type}]: ${text}`);
        }
    };

    const loadPaymentsData = async (silent = false) => {
        if (!estimateId && !opportunityId) return;
        if (!silent) setPaymentsLoading(true);
        if (!silent) setPaymentsError('');
        try {
            const [requestsRes, paymentsRes, refundsRes] = await Promise.all([
                getPaymentRequests(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId }),
                getPayments(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId }),
                getRefunds(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId }),
            ]);
            const asList = (res) => Array.isArray(res?.results) ? res.results : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setPaymentRequests(asList(requestsRes));
            setPayments(asList(paymentsRes));
            setRefunds(asList(refundsRes));
        } catch (err) {
            if (!silent) setPaymentsError(err.response?.data?.detail || 'Unable to load payments.');
        } finally {
            if (!silent) setPaymentsLoading(false);
        }
    };

    const loadPaymentGateways = async () => {
        const branchId = resolvedBranchId || branchIdProp || resolveOpportunityBranchId(opportunity);
        try {
            const res = await getPaymentGateways(branchId ? { branch: branchId } : undefined);
            const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            const scoped = rows.filter((row) => {
                const rowBranchId = row?.branch_id ?? row?.branch?.id ?? row?.branch ?? null;
                const matchesBranch = branchId ? String(rowBranchId) === String(branchId) : !rowBranchId;
                return matchesBranch;
            });
            const active = scoped;
            console.debug('[payments-panel] payment gateways loaded', {
                opportunityId: opportunityId || null,
                branchId: branchId || null,
                total: rows.length,
                active: active.length,
                rowBranchIds: rows.map((row) => row?.branch_id ?? row?.branch?.id ?? row?.branch ?? null),
            });
            setPaymentGateways(active);
            if (active.length === 1) {
                setCreatePaymentGatewayId(String(active[0].id));
            } else if (createPaymentGatewayId && !active.some((row) => String(row.id) === String(createPaymentGatewayId))) {
                setCreatePaymentGatewayId('');
            }
        } catch {
            setPaymentGateways([]);
        }
    };

    useEffect(() => {
        if (branchIdProp) {
            setResolvedBranchId(branchIdProp);
            return;
        }
        const branchFromOpportunity =
            resolveOpportunityBranchId(opportunity) ||
            opportunity?.branch_details?.id ||
            '';
        if (branchFromOpportunity) {
            setResolvedBranchId(String(branchFromOpportunity));
            return;
        }
        let active = true;
        const resolveBranchFromOpportunity = async () => {
            if (!opportunityId) return;
            try {
                const response = await getOpportunity(opportunityId);
                const record = response?.data || response || null;
                const nextBranchId =
                    record?.branch_details?.id ||
                    record?.branch_id ||
                    record?.branch?.id ||
                    '';
                if (active && nextBranchId) {
                    setResolvedBranchId(String(nextBranchId));
                }
            } catch {
                if (active) {
                    setResolvedBranchId('');
                }
            }
        };
        resolveBranchFromOpportunity();
        return () => {
            active = false;
        };
    }, [branchIdProp, opportunityId, opportunity?.branch?.id, opportunity?.branch_id, opportunity?.branch_details?.id]);

    const refreshAll = async (silent = false) => {
        await Promise.allSettled([loadPaymentsData(silent)]);
        if (onPaymentChange && !silent) {
            onPaymentChange();
        }
    };

    useEffect(() => {
        loadPaymentGateways();
    }, [resolvedBranchId, branchIdProp, opportunity?.branch?.id, opportunity?.branch_id, opportunity?.branch_details?.id]);

    useEffect(() => {
        if (autoLoad) {
            refreshAll();
        }
    }, [opportunityId, estimateId, autoLoad, opportunityStatus]);

    const paymentOverview = useMemo(() => {
        const backendTotalPaid = Number(payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0));
        const backendBalanceDue = Math.max(0, Number(estimateTotal || 0) - backendTotalPaid);
        const latest = (payments || [])[0] || null;
        const currency = latest?.currency || 'USD';
        
        return {
            currency,
            totalPaid: backendTotalPaid,
            balanceDue: backendBalanceDue,
            isPaid: backendTotalPaid > 0,
        };
    }, [estimateTotal, payments]);

    const paymentGatewayMap = useMemo(
        () => Object.fromEntries((paymentGateways || []).map((gateway) => [String(gateway.id), gateway])),
        [paymentGateways]
    );

    const paymentRows = useMemo(() => {
        const manualRows = (payments || [])
            .filter((payment) => String(payment?.source_type || '').toLowerCase() === 'manual')
            .map((payment) => ({
                ...payment,
                kind: 'manual',
                payment_method_display:
                    payment?.payment_method_display ||
                    String(payment?.method || 'manual').replaceAll('_', ' '),
                created_at: payment?.paid_at || payment?.created_at,
            }));
        const gatewayRows = (payments || [])
            .filter((payment) => String(payment?.source_type || '').toLowerCase() !== 'manual')
            .map((payment) => ({
                ...payment,
                kind: 'gateway',
                payment_method_display:
                    payment?.payment_method_display ||
                    payment?.method_summary ||
                    (payment?.payment_gateway_id ? gatewayDisplayName(paymentGatewayMap[String(payment.payment_gateway_id)]) : 'Gateway Payment'),
            }));
        const finalizedRequestStatuses = new Set(['paid', 'refunded', 'cancelled', 'canceled']);
        const requestRows = (paymentRequests || []).map((request) => {
            const requestStatus = String(request?.status || '').trim().toLowerCase();
            if (finalizedRequestStatuses.has(requestStatus)) {
                return null;
            }
            const gateway = paymentGatewayMap[String(request?.payment_gateway_id)];
            return {
                ...request,
                kind: 'request',
                payment_method_display: requestMethodSummary(request, gateway),
                note: request?.checkout_url || '',
            };
        }).filter(Boolean);
        return [...manualRows, ...gatewayRows, ...requestRows].sort((a, b) => {
            const aTime = new Date(a?.paid_at || a?.captured_at || a?.created_at || 0).getTime();
            const bTime = new Date(b?.paid_at || b?.captured_at || b?.created_at || 0).getTime();
            return bTime - aTime;
        });
    }, [paymentGatewayMap, paymentRequests, payments]);

    const submitAuthorizeNetCheckout = (paymentRequest) => {
        const action = String(paymentRequest?.checkout_url || '').split('?')[0].trim();
        const token = String(
            paymentRequest?.provider_checkout_reference ||
            paymentRequest?.provider_reference ||
            ''
        ).trim();
        if (!action || !token) {
            showToast('error', 'Authorize.net checkout token is missing.');
            return;
        }

        if (action.includes('/api/payments/public/payment-requests/launch/')) {
            window.open(String(paymentRequest?.checkout_url || '').trim(), '_blank', 'noopener,noreferrer');
            return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action;
        form.target = '_blank';
        form.style.display = 'none';

        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token';
        tokenInput.value = token;
        form.appendChild(tokenInput);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };

    const copyCheckoutUrl = async (paymentRequest) => {
        const provider = String(paymentRequest?.provider || '').trim().toLowerCase();
        if (provider === 'authorize_net') {
            showToast('error', 'Authorize.net hosted checkout must be opened from the CRM. Copying the raw token URL is not supported.');
            return;
        }

        const url = String(paymentRequest?.checkout_url || '').trim();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            showToast('success', 'Payment link copied.');
        } catch {
            showToast('error', 'Unable to copy payment link.');
        }
    };

    const openCheckoutUrl = (paymentRequest) => {
        const provider = String(paymentRequest?.provider || '').trim().toLowerCase();
        if (provider === 'authorize_net') {
            submitAuthorizeNetCheckout(paymentRequest);
            return;
        }

        const url = String(paymentRequest?.checkout_url || '').trim();
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const hasLoadedPayments = payments.length > 0 || paymentRequests.length > 0 || refunds.length > 0 || Boolean(paymentsError);
    const canUseManualLedger = Boolean(estimateId) && canAddManualPayment;
    const manualActionLabel = canUseManualLedger ? 'Add manual' : 'Create payment request';
    const handleLedgerPrimaryAction = () => {
        if (canUseManualLedger) {
            setManualPaymentDraft({ amount: '', method: 'e_transfer', reference: '', note: '' });
            setIsManualPaymentModalOpen(true);
            return;
        }
        setIsPaymentRequestModalOpen(true);
    };

    const closeManualPaymentModal = () => {
        setIsManualPaymentModalOpen(false);
        setManualPaymentDraft({ amount: '', method: 'e_transfer', reference: '', note: '' });
    };

    const saveManualPayment = async () => {
        if (!estimateId) return;
        const amount = String(manualPaymentDraft.amount || '').trim();
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            showToast('error', 'Enter a valid payment amount.');
            return;
        }
        const balanceDue = Math.max(0, Number(estimateTotal || 0) - Number(payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0)));
        if (Number.isFinite(balanceDue) && balanceDue > 0 && numericAmount > balanceDue) {
            showToast('error', 'Amount cannot be greater than balance due.');
            return;
        }
        setPaymentsLoading(true);
        try {
            await createEstimateManualPayment({
                estimate_id: Number(estimateId),
                amount,
                method: manualPaymentDraft.method,
                reference: manualPaymentDraft.reference || '',
                note: manualPaymentDraft.note || '',
            });
            closeManualPaymentModal();
            await refreshAll();
            showToast('success', 'Manual payment recorded.');
        } catch (err) {
            showToast(
                'error',
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(' ') ||
                'Unable to record manual payment.'
            );
        } finally {
            setPaymentsLoading(false);
        }
    };

    const openRefundPaymentModal = (payment) => {
        if (!payment?.id) return;
        const remaining = Math.max(0, Number(payment?.amount || 0) - Number(payment?.refunded_amount || 0));
        setRefundPaymentId(String(payment.id));
        setRefundAmount(remaining > 0 ? String(remaining.toFixed(2)) : '');
    };

    const closeRefundPaymentModal = () => {
        setRefundPaymentId('');
        setRefundAmount('');
    };

    const handleCreateRefund = async () => {
        if (!refundPaymentId) {
            showToast('error', 'No payment selected for refund.');
            return;
        }
        setPaymentsLoading(true);
        try {
            const payload = { payment_id: Number(refundPaymentId) };
            if (refundAmount !== '') {
                payload.amount = refundAmount;
            }
            await createRefund(payload);
            closeRefundPaymentModal();
            await refreshAll();
            showToast('success', 'Refund initiated successfully.');
        } catch (err) {
            showToast('error', err.response?.data?.detail || 'Unable to create refund.');
        } finally {
            setPaymentsLoading(false);
        }
    };

    const handleCreatePaymentRequest = async () => {
        if (!estimateId) {
            showToast('error', 'Cannot create payment link without an active estimate.');
            return;
        }
        if (!createPaymentGatewayId) {
            showToast('error', 'Select a payment gateway first.');
            return;
        }
        
        const resolvedPaymentOption = createPaymentOption;

        let amount = undefined;
        if (resolvedPaymentOption === 'custom') {
            amount = createPaymentAmount;
        }

        if (resolvedPaymentOption === 'custom') {
            const amt = Number(amount);
            if (!Number.isFinite(amt) || amt <= 0) {
                showToast('error', 'Enter a valid amount.');
                return;
            }
            const balanceDue = Number(paymentOverview.balanceDue ?? 0);
            if (Number.isFinite(balanceDue) && balanceDue > 0 && amt > balanceDue) {
                showToast('error', 'Amount cannot be greater than balance due.');
                return;
            }
        }

        setPaymentsLoading(true);
        const payload = {
            estimate_id: estimateId,
            payment_option: resolvedPaymentOption,
            payment_gateway_id: Number(createPaymentGatewayId),
        };
        if (amount !== '') {
            payload.amount = amount;
        }
        setIsPaymentRequestModalOpen(false);
        setPaymentsLoading(false);
        (async () => {
            try {
                const res = await createPaymentRequestAndSend(payload);
                await refreshAll();
                showToast('success', res?.data?.detail || 'Payment request created successfully.');
            } catch (err) {
                const nextError =
                    err.response?.data?.detail ||
                    Object.values(err.response?.data || {}).flat().join(' ') ||
                    'Unable to create payment request.';
                showToast('error', nextError);
            }
        })();
    };

    const openReceiptModal = (payment) => {
        setReceiptPayment(payment);
        setReceiptSendEmail(true);
        setReceiptSendSms(false);
        setReceiptSelectedEmails(availableEmails.length > 0 ? [availableEmails[0].value] : []);
        setReceiptSelectedPhones(availablePhones.length > 0 ? [availablePhones[0].value] : []);
        setReceiptCustomEmail('');
        setReceiptCustomPhone('');
    };

    const closeReceiptModal = () => {
        setReceiptPayment(null);
        setReceiptSelectedEmails([]);
        setReceiptSelectedPhones([]);
        setReceiptCustomEmail('');
        setReceiptCustomPhone('');
    };

    const handleSendReceipt = async (overrideSendEmail = null, overrideSendSms = null) => {
        if (!receiptPayment) return;
        setIsSendingReceipt(true);
        try {
            const sendEmail = overrideSendEmail !== null ? overrideSendEmail : receiptSendEmail;
            const sendSms = overrideSendSms !== null ? overrideSendSms : receiptSendSms;
            const emailRecipients = [
                ...receiptSelectedEmails,
                ...(String(receiptCustomEmail || '').trim() ? [String(receiptCustomEmail).trim()] : []),
            ];
            const phoneRecipients = [
                ...receiptSelectedPhones,
                ...(String(receiptCustomPhone || '').trim() ? [String(receiptCustomPhone).trim()] : []),
            ];

            if (!sendEmail && !sendSms) {
                closeReceiptModal();
                setIsSendingReceipt(false);
                return;
            }
            if (sendEmail && emailRecipients.length === 0) {
                throw new Error('Select at least one recipient email.');
            }
            if (sendSms && phoneRecipients.length === 0) {
                throw new Error('Select at least one recipient phone.');
            }

            const payload = {
                send_email: sendEmail,
                send_sms: sendSms,
                to_email: sendEmail ? emailRecipients.join(', ') : '',
                to_phone: sendSms ? phoneRecipients.join(', ') : '',
            };
            if (receiptPayment.kind === 'manual') {
                if (estimateId) {
                    await sendEstimateManualPaymentReceipt(receiptPayment.id, payload);
                    showToast('success', 'Receipt sent successfully.');
                    closeReceiptModal();
                } else if (jobId || opportunity?.job_id) {
                    const resolvedJobId = jobId || opportunity?.job_id;
                    await sendManualJobPaymentReceipt(resolvedJobId, receiptPayment.id, payload);
                    showToast('success', 'Receipt sent successfully.');
                    closeReceiptModal();
                } else {
                    showToast('error', 'Unable to send receipt for this payment.');
                }
            } else {
                showToast('error', 'Receipt sending is only supported for manual job payments currently.');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(' ') || 'Failed to send receipt.';
            showToast('error', msg);
        } finally {
            setIsSendingReceipt(false);
        }
    };

    return (
        <div className="space-y-4">
            <PaymentsTab
                capturedTotal={paymentOverview.totalPaid}
                pendingTotal={0}
                balanceDue={paymentOverview.balanceDue}
                payments={paymentRows}
                onAddManual={handleLedgerPrimaryAction}
                onCreateLink={() => setIsPaymentRequestModalOpen(true)}
                onRefundPayment={openRefundPaymentModal}
                onCopyPaymentRequestLink={copyCheckoutUrl}
                onOpenPaymentRequestLink={openCheckoutUrl}
                onSendReceipt={openReceiptModal}
                canAddManualPayment={canUseManualLedger}
                manualActionLabel={manualActionLabel}
                hideSummary={hideSummary}
            />

            {!autoLoad && !hasLoadedPayments ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900">Payments not loaded</h4>
                    <p className="mt-1 text-xs text-slate-500">
                        Load payment requests, payments, and refunds only when you need them.
                    </p>
                    <PrimaryBtn className="mt-4" onClick={refreshAll}>
                        Load Payments
                    </PrimaryBtn>
                </div>
            ) : null}

            {/* Refund Payment Modal */}
            {refundPaymentId ? (
                <ModalPortal>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-black tracking-tight">Refund Payment</h3>
                                <p className="text-sm font-semibold text-slate-500">Create a refund for the selected gateway payment.</p>
                            </div>
                            <button onClick={closeRefundPaymentModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput
                                label="Refund Amount"
                                type="number"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                            <p className="text-xs text-slate-500">Leave blank to refund the full remaining amount.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={closeRefundPaymentModal}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={handleCreateRefund} disabled={paymentsLoading}>Create Refund</PrimaryBtn>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            ) : null}

            {/* Create Payment Link Modal */}
            {isPaymentRequestModalOpen && (
                <ModalPortal>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-black tracking-tight">Create Payment Link</h3>
                                <p className="text-sm font-semibold text-slate-500">Select payment details to generate link.</p>
                            </div>
                            <button onClick={() => setIsPaymentRequestModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput label="Payment Option" as="select" value={createPaymentOption} onChange={(e) => setCreatePaymentOption(e.target.value)}>
                                <option value="deposit">Deposit Amount ({money(depositValue || 0)})</option>
                                <option value="full">Full Balance ({money(paymentOverview.balanceDue ?? 0)})</option>
                                <option value="custom">Custom Amount</option>
                            </FormInput>

                            {createPaymentOption === 'custom' && (
                                <FormInput
                                    label="Custom Amount"
                                    type="number"
                                    value={createPaymentAmount}
                                    onChange={(e) => setCreatePaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            )}

                            {paymentGateways.length > 0 ? (
                                <FormInput label="Select Payment Gateway" as="select" value={createPaymentGatewayId} onChange={(e) => setCreatePaymentGatewayId(e.target.value)}>
                                    <option value="">Choose a gateway...</option>
                                    {paymentGateways.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {gatewayDisplayName(g)}
                                        </option>
                                    ))}
                                </FormInput>
                            ) : (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                    No active verified payment gateways configured. Please configure integrations in settings.
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={() => setIsPaymentRequestModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn
                                onClick={handleCreatePaymentRequest}
                                disabled={paymentsLoading || !createPaymentGatewayId}
                                loading={paymentsLoading}
                            >
                                Generate & Send Link
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* Manual Payment Modal */}
            {isManualPaymentModalOpen && canUseManualLedger && (
                <ModalPortal>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-black tracking-tight">Add Manual Payment</h3>
                                <p className="text-sm font-semibold text-slate-500">Record a payment directly against the signed estimate.</p>
                            </div>
                            <button onClick={closeManualPaymentModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Method" as="select" value={manualPaymentDraft.method} onChange={(e) => setManualPaymentDraft((p) => ({ ...p, method: e.target.value }))}>
                                    <option value="e_transfer">E-Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="card">Card</option>
                                    <option value="other">Other</option>
                                </FormInput>
                                <FormInput label="Amount" type="number" value={manualPaymentDraft.amount} onChange={(e) => setManualPaymentDraft((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                            </div>
                            <FormInput label="Reference" value={manualPaymentDraft.reference} onChange={(e) => setManualPaymentDraft((p) => ({ ...p, reference: e.target.value }))} placeholder="Transaction ref" />
                            <FormInput label="Note" value={manualPaymentDraft.note} onChange={(e) => setManualPaymentDraft((p) => ({ ...p, note: e.target.value }))} placeholder="Notes" />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={closeManualPaymentModal}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={saveManualPayment} disabled={paymentsLoading} loading={paymentsLoading}>
                                Save Payment
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {/* Receipt Modal */}
            {receiptPayment && (
                <ModalPortal>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-black tracking-tight">Send Receipt</h3>
                                <p className="text-sm font-semibold text-slate-500">
                                    Send payment receipt to {opportunity?.customer?.first_name || 'Customer'}
                                </p>
                            </div>
                            <button onClick={closeReceiptModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Email Section */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-md border ${receiptSendEmail ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'} transition-colors`}>
                                        {receiptSendEmail && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" className="sr-only" checked={receiptSendEmail} onChange={(e) => setReceiptSendEmail(e.target.checked)} />
                                    <span className="text-sm font-bold text-slate-900 select-none">Send via Email</span>
                                </label>
                                {receiptSendEmail && (
                                    <div className="pl-8 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            {availableEmails.length > 0 ? (
                                                availableEmails.map((item) => (
                                                    <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-sm border border-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={receiptSelectedEmails.includes(item.value)}
                                                            onChange={() => {
                                                                setReceiptSelectedEmails((prev) =>
                                                                    prev.includes(item.value)
                                                                        ? prev.filter((value) => value !== item.value)
                                                                        : [...prev, item.value]
                                                                );
                                                            }}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="leading-5">{item.label}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-black/60">
                                                    No email recipients found.
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="email"
                                            value={receiptCustomEmail}
                                            onChange={(e) => setReceiptCustomEmail(e.target.value)}
                                            placeholder="Enter recipient email"
                                            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* SMS Section */}
                            <div className="space-y-3 pt-3 border-t border-slate-100">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`flex items-center justify-center w-5 h-5 rounded-md border ${receiptSendSms ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'} transition-colors`}>
                                        {receiptSendSms && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" className="sr-only" checked={receiptSendSms} onChange={(e) => setReceiptSendSms(e.target.checked)} />
                                    <span className="text-sm font-bold text-slate-900 select-none">Send via SMS</span>
                                </label>
                                {receiptSendSms && (
                                    <div className="pl-8 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            {availablePhones.length > 0 ? (
                                                availablePhones.map((item) => (
                                                    <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-sm border border-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={receiptSelectedPhones.includes(item.value)}
                                                            onChange={() => {
                                                                setReceiptSelectedPhones((prev) =>
                                                                    prev.includes(item.value)
                                                                        ? prev.filter((value) => value !== item.value)
                                                                        : [...prev, item.value]
                                                                );
                                                            }}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="leading-5">{item.label}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-black/60">
                                                    No phone recipients found.
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="tel"
                                            value={receiptCustomPhone}
                                            onChange={(e) => setReceiptCustomPhone(e.target.value)}
                                            placeholder="Enter recipient phone"
                                            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            {(receiptSendEmail || receiptSendSms) && (
                                <p className="text-xs text-slate-500 font-semibold mt-1 px-1">
                                    The payment receipt template will be used.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={closeReceiptModal}>Cancel</GhostBtn>
                            <GhostBtn 
                                onClick={() => handleSendReceipt(false, false)}
                                disabled={isSendingReceipt}
                            >
                                Skip
                            </GhostBtn>
                            <PrimaryBtn
                                onClick={() => handleSendReceipt()}
                                disabled={isSendingReceipt || (!receiptSendEmail && !receiptSendSms)}
                                loading={isSendingReceipt}
                            >
                                Send Receipt
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

        </div>
    );
}
