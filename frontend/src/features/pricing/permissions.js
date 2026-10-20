// Backend permission keys for pricing, estimates and change orders, exactly
// as the RBAC engine names them. No role names: what a user may do is the
// session's permission list. The backend checks every action again.
export const PRICING = Object.freeze({
  VIEW: 'pricing.view',
  CREATE: 'pricing.create',
  UPDATE_DRAFT: 'pricing.update_draft',
  VALIDATE: 'pricing.validate',
  SUBMIT: 'pricing.submit_for_approval',
  APPROVE: 'pricing.approve',
  PUBLISH: 'pricing.publish',
  RETIRE: 'pricing.retire',
  ROLLBACK: 'pricing.rollback',
  SIMULATE: 'pricing.simulate',
  BACKTEST: 'pricing.backtest',
  VIEW_COST: 'pricing.view_cost',
  APPLY_DISCOUNT: 'pricing.apply_discount',
  OVERRIDE_RATE: 'pricing.override_rate',
  OVERRIDE_MINIMUM: 'pricing.override_minimum',
  OVERRIDE_NTE: 'pricing.override_nte',
  APPROVE_ADJUSTMENT: 'pricing.approve_adjustment',
});

export const ESTIMATES = Object.freeze({
  VIEW: 'estimates.view',
  CREATE: 'estimates.create',
  UPDATE_DRAFT: 'estimates.update_draft',
  SEND: 'estimates.send',
  RECORD_ACCEPTANCE: 'estimates.record_acceptance',
  SUPERSEDE: 'estimates.supersede',
  MANAGE_OPTIONS: 'estimates.manage_options',
});

export const CHANGE_ORDERS = Object.freeze({
  VIEW: 'change_orders.view',
  CREATE: 'change_orders.create',
  UPDATE_DRAFT: 'change_orders.update_draft',
  SEND: 'change_orders.send',
  RECORD_ACCEPTANCE: 'change_orders.record_acceptance',
});

export const OPPORTUNITY = Object.freeze({
  UPDATE: 'opportunities.update',
  BOOK: 'opportunities.book',
  BOOK_WITHOUT_DEPOSIT: 'opportunities.book_without_deposit',
  BOOK_WITHOUT_SIGNATURE: 'opportunities.book_without_signature',
  BOOK_WITHOUT_ACCEPTANCE: 'opportunities.book_without_acceptance',
  SEND_EMAIL: 'communications.conversations.send',
});

// Which permission a hand-set commercial constraint needs (mirrors the backend).
export const CONSTRAINT_PERMISSION = Object.freeze({
  not_to_exceed: PRICING.OVERRIDE_NTE,
  minimum: PRICING.OVERRIDE_MINIMUM,
  fixed_price: PRICING.OVERRIDE_RATE,
  range: PRICING.OVERRIDE_RATE,
});

// Settings tabs: "any" of these opens the tab.
export const PRICING_SETTINGS_ACCESS = [PRICING.VIEW];
