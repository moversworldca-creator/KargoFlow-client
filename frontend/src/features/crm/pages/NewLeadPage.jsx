import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewLeadForm from '../components/NewLeadForm';
import { useToast } from '../../../shared/context/ToastContext';
import { useCan } from '../../../shared/auth/useCan';
import {
  useBranchesLookup,
  useUsersLookup,
  useReferralSourcesLookup,
  useMoverSizesLookup,
  useStatusLookups,
} from '../../../shared/queries/sharedQueries';
import { getRecordDetailPath } from '../utils/recordRoutes';

const NewLeadPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canAll } = useCan();
  const { data: branches = [] } = useBranchesLookup();
  const { data: users = [] } = useUsersLookup();
  const { data: referralSources = [] } = useReferralSourcesLookup();
  const { data: moverSizes = [] } = useMoverSizesLookup();
  const { data: statusCodes = [] } = useStatusLookups();
  const metadata = {
    branches,
    users,
    moverSizes,
    referralSources,
    statusCodes,
  };

  return (
    <NewLeadForm
      isOpen
      metadata={metadata}
      canCreateLead={canAll(['crm.leads.create'])}
      onClose={() => navigate('/leads')}
      onSuccess={(res) => {
        showToast('Lead created successfully!', 'success');
        const leadRecord = res?.data || res;
        const leadId = leadRecord?.id;
        if (leadId) {
          navigate(getRecordDetailPath('lead', leadRecord));
        } else {
          navigate('/leads');
        }
      }}
    />
  );
};

export default NewLeadPage;
