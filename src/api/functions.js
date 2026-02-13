import { base44 } from './base44Client';


export const updateStoreSettings = base44.functions.updateStoreSettings;

export const updateSubscriberPlan = base44.functions.updateSubscriberPlan;

export const checkSubscriptionStatus = base44.functions.checkSubscriptionStatus;

export const createSubscriber = base44.functions.createSubscriber;

export const updateSubscriber = base44.functions.updateSubscriber;

export const deleteSubscriber = base44.functions.deleteSubscriber;

/** Chama GET /establishments/subscribers e retorna array de assinantes (rota REST confiável) */
export const getSubscribers = async () => {
  const res = await base44.get('/establishments/subscribers');
  return res?.data?.subscribers ?? res?.subscribers ?? [];
};

export const getGoogleMapsRoute = base44.functions.getGoogleMapsRoute;

export const getFullSubscriberProfile = base44.functions.getFullSubscriberProfile;

export const syncUserSubscriberEmail = base44.functions.syncUserSubscriberEmail;

export const diagnoseRLS = base44.functions.diagnoseRLS;

export const fixRLSData = base44.functions.fixRLSData;

export const trackPizzaCombination = base44.functions.trackPizzaCombination;

