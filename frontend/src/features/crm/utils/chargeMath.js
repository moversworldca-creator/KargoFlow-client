export const normalizeNumber = (value, fallback = 0) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replaceAll(',', ''));
  return Number.isFinite(n) ? n : fallback;
};

export const parseDurationToHours = (value, fallback = 0) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;

  // Try matching Xh Ym or Xh or Ym
  const hourMinRegex = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?$/;
  const match = raw.match(hourMinRegex);
  if (match) {
    const hVal = match[1] ? Number(match[1]) : 0;
    const mVal = match[2] ? Number(match[2]) : 0;
    const total = hVal + (mVal / 60);
    return Number.isFinite(total) ? total : fallback;
  }

  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};

export const formatHoursAsCompactDuration = (hours) => {
  const h = Number(hours || 0);
  if (!Number.isFinite(h) || h <= 0) return '0h';
  const totalMins = Math.round(h * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
};

export const computeChargeTotal = (form, context = {}, options = {}) => {
  const category = String(form?.category || 'other');
  const presetMode = String(options?.presetMode || form?.mode || '').trim();

  if (category === 'moving_labor') {
    if (form?.is_subtotal_overridden && form?.subtotal_override) {
      return normalizeNumber(form.subtotal_override, 0);
    }

    const laborMode = String(form?.moving_labor_mode || 'hourly');
    
    // Parse new detailed time fields
    const laborHours = parseDurationToHours(form?.labor_time_display, 0);
    const driveHours = parseDurationToHours(form?.origin_to_destination_display, 0);
    const travelHours = parseDurationToHours(form?.travel_time_display, 0);
    const handicapOrigin = parseDurationToHours(form?.handicap_origin_display, 0);
    const handicapStops = parseDurationToHours(form?.handicap_stops_display, 0);
    const handicapDest = parseDurationToHours(form?.handicap_destination_display, 0);

    // Sum estimated and handicap times
    const estimatedHours = laborHours + driveHours + travelHours;
    const handicapHours = handicapOrigin + handicapStops + handicapDest;
    
    // Fallback to old field values if new fields are all zero
    let totalHours = estimatedHours + handicapHours;
    if (totalHours === 0) {
      totalHours = parseDurationToHours(form?.labor_time_display || form?.labor_hours, context?.estimatedHours || 0);
    }

    if (laborMode === 'flat_plus_hourly') {
      const flatRate = normalizeNumber(form?.flat_rate, 0);
      const includedHours = parseDurationToHours(
        form?.included_hours || form?.flat_rate_includes_display,
        0
      );
      
      const billableHours = Math.ceil(totalHours);
      const extraHours = Math.max(0, billableHours - includedHours);
      const addlRate = normalizeNumber(form?.additional_hourly_rate, context?.hourlyRate || 0);
      return flatRate + (extraHours * addlRate);
    }

    // Hourly mode
    const minHours = parseDurationToHours(form?.minimum_time_display, 0);
    const billableHours = Math.ceil(Math.max(totalHours, minHours));
    const hourlyRate = normalizeNumber(form?.hourly_rate_override, context?.hourlyRate || 0);
    return billableHours * hourlyRate;
  }

  if (category === 'packing' && presetMode) {
    if (presetMode === 'hourly_labor') {
      const packers = normalizeNumber(form?.crew, 1);
      const hours = form?.labor_time_display
        ? parseDurationToHours(form.labor_time_display, 0)
        : normalizeNumber(form?.quantity || form?.labor_hours, 0);
      const hourlyRate = normalizeNumber(form?.unit_price || form?.hourly_rate_override, 0);
      return hours * packers * hourlyRate;
    }
    if (presetMode === 'flat_plus_hourly') {
      const flatRate = normalizeNumber(form?.flat_rate, 0);
      const includedHours = parseDurationToHours(
        form?.included_hours || form?.flat_rate_includes_display,
        0
      );
      const hours = form?.labor_time_display
        ? parseDurationToHours(form.labor_time_display, 0)
        : normalizeNumber(form?.labor_hours, 0);
      const extraHours = Math.max(0, Math.ceil(hours) - includedHours);
      const addlRate = normalizeNumber(form?.additional_hourly_rate, 0);
      const packers = normalizeNumber(form?.crew, 1);
      return flatRate + (extraHours * packers * addlRate);
    }
    if (presetMode === 'unit') {
      const qty = normalizeNumber(form?.quantity, 0);
      const unit = normalizeNumber(form?.unit_price, 0);
      return qty * unit;
    }
    if (presetMode === 'weight') {
      const weight = normalizeNumber(form?.weight, 0);
      const rate = normalizeNumber(form?.unit_price, 0);
      return (weight / 100) * rate;
    }
  }

  if (category === 'discount') {
    const amount = normalizeNumber(form?.unit_price, 0);
    return -Math.abs(amount);
  }

  if (category === 'fuel_surcharge') {
    if (presetMode) {
      if (presetMode === 'mileage') {
        const miles = normalizeNumber(form?.mileage, context?.distanceMiles || 0);
        const rate = normalizeNumber(form?.cost_per_mile, 0);
        const included = normalizeNumber(form?.included_miles, 0);
        const minCost = normalizeNumber(form?.min_cost, 0);
        const trucks = normalizeNumber(form?.trucks, 1);
        const billableMiles = Math.max(0, miles - included);
        return trucks * Math.max(minCost, billableMiles * rate);
      }
      if (presetMode === 'flat') {
        return normalizeNumber(form?.unit_price, 0);
      }
      if (presetMode === 'percentage') {
        const percent = normalizeNumber(form?.percentage_rate || form?.unit_price, 0);
        const base = normalizeNumber(form?.quantity, context.estimateTotal || context.transportationBase || 0);
        return (base * percent) / 100;
      }
      if (presetMode === 'unit') {
        const qty = normalizeNumber(form?.quantity, 0);
        const unit = normalizeNumber(form?.unit_price, 0);
        return qty * unit;
      }
    }
    const percent = normalizeNumber(form?.unit_price, 0);
    const base = normalizeNumber(form?.quantity, context.estimateTotal || context.transportationBase || 0);
    return (base * percent) / 100;
  }

  if (category === 'valuation' && presetMode === 'unit') {
    const qty = normalizeNumber(form?.quantity, 0);
    const unit = normalizeNumber(form?.unit_price, 0);
    return qty * unit;
  }

  if (category === 'valuation') {
    const percent = normalizeNumber(form?.unit_price, 0);
    const base = normalizeNumber(form?.quantity, context.laborBase || 0);
    return (base * percent) / 100;
  }

  if ((category === 'trip_and_travel' || category === 'additional_services') && presetMode) {
    if (presetMode === 'mileage') {
      const miles = normalizeNumber(form?.mileage, context?.distanceMiles || 0);
      const rate = normalizeNumber(form?.cost_per_mile, 0);
      const included = normalizeNumber(form?.included_miles, 0);
      const minCost = normalizeNumber(form?.min_cost, 0);
      const billableMiles = Math.max(0, miles - included);
      return Math.max(minCost, billableMiles * rate);
    }
    if (presetMode === 'flat') {
      return normalizeNumber(form?.unit_price, 0);
    }
    if (presetMode === 'percentage') {
      const percent = normalizeNumber(form?.percentage_rate, 0);
      const base = normalizeNumber(form?.quantity, context.transportationBase || context.laborBase || 0);
      return (base * percent) / 100;
    }
    if (presetMode === 'unit') {
      const qty = normalizeNumber(form?.quantity, 0);
      const unit = normalizeNumber(form?.unit_price, 0);
      return qty * unit;
    }
  }

  if (category === 'transportation' && presetMode) {
    if (presetMode === 'mileage') {
      const miles = normalizeNumber(form?.mileage, context?.distanceMiles || 0);
      const rate = normalizeNumber(form?.cost_per_mile, 0);
      const included = normalizeNumber(form?.included_miles, 0);
      const minCost = normalizeNumber(form?.min_cost, 0);
      const billableMiles = Math.max(0, miles - included);
      return Math.max(minCost, billableMiles * rate);
    }
    if (presetMode === 'flat_truck') {
      const trucks = normalizeNumber(form?.quantity, 0);
      const rate = normalizeNumber(form?.unit_price, 0);
      return trucks * rate;
    }
  }

  const qty = normalizeNumber(form?.quantity, 0) || 0;
  const unit = normalizeNumber(form?.unit_price, 0) || 0;
  return qty * unit;
};
