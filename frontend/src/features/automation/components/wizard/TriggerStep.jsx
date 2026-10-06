import React from 'react';

const cardClass = (active) =>
  `p-4 rounded-xl border text-left transition-all ${
    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-subtle/50'
  }`;

const WEEKDAYS = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
];

const parseSchedule = (cron) => {
  const parts = String(cron || '').trim().split(/\s+/);
  if (parts[1] === '*') {
    return { hour: 9, frequency: 'hourly', days: [0] };
  }
  const hour = Number(parts[1]);
  const days = parts[4] && parts[4] !== '*'
    ? parts[4].split(',').map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  return {
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9,
    frequency: days.length ? 'weekly' : 'daily',
    days: days.length ? days : [0],
  };
};

const toCron = ({ hour, frequency, days }) => {
  if (frequency === 'hourly') return '0 * * * *';
  return `0 ${hour} * * ${frequency === 'weekly' ? days.join(',') : '*'}`;
};

const formatHour = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
};

export default function TriggerStep({ draft, dispatch }) {
  const pick = (type) => {
    if (type === 'change') {
      dispatch({ type: 'trigger', patch: { type: 'change', params: { event: 'create' } } });
      return;
    }
    if (type === 'time_based') {
      dispatch({
        type: 'trigger',
        patch: {
          type: 'time_based',
          params: { anchor: 'created_at', direction: 'after', offset: { duration: 1, unit: 'days' } },
        },
      });
      return;
    }
    dispatch({
      type: 'trigger',
      patch: {
        type: 'recurring',
        params: { cron: '0 9 * * *', timezone: 'America/Toronto' },
      },
    });
  };

  const type = draft.trigger?.type || 'change';
  const params = draft.trigger?.params || {};
  const schedule = parseSchedule(params.cron || '0 9 * * *');

  const updateSchedule = (patch) => {
    const next = { ...schedule, ...patch };
    const days = next.days.length ? next.days : [0];
    dispatch({ type: 'triggerParams', patch: { cron: toCron({ ...next, days }) } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-heading">When should this automation trigger?</h2>
        <p className="text-sm text-muted">Choose what event will start this automation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button type="button" className={cardClass(type === 'time_based')} onClick={() => pick('time_based')}>
          <div className="font-bold">Time-Based</div>
          <div className="text-xs text-muted mt-1">Trigger after/before a time offset</div>
        </button>
        <button type="button" className={cardClass(type === 'change')} onClick={() => pick('change')}>
          <div className="font-bold">When Something Changes</div>
          <div className="text-xs text-muted mt-1">Trigger on create/update/status change</div>
        </button>
        <button type="button" className={cardClass(type === 'recurring')} onClick={() => pick('recurring')}>
          <div className="font-bold">Recurring Schedule</div>
          <div className="text-xs text-muted mt-1">Trigger on a recurring schedule</div>
        </button>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="text-sm font-bold text-heading">Configure Trigger</div>

        {type === 'change' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Event</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={params.event || 'create'}
                onChange={(e) => dispatch({ type: 'triggerParams', patch: { event: e.target.value } })}
              >
                <option value="create">On Create</option>
                <option value="update">On Update</option>
                <option value="status_change">On Status Change</option>
              </select>
            </div>
          </div>
        )}

        {type === 'time_based' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Anchor</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={params.anchor || 'created_at'}
                onChange={(e) => dispatch({ type: 'triggerParams', patch: { anchor: e.target.value } })}
              >
                <option value="created_at">Created At</option>
                <option value="move_date">Move Date</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Direction</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={params.direction || 'after'}
                onChange={(e) => dispatch({ type: 'triggerParams', patch: { direction: e.target.value } })}
              >
                <option value="after">After</option>
                <option value="before">Before</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Offset</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  className="w-24 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={params.offset?.duration ?? 1}
                  onChange={(e) =>
                    dispatch({
                      type: 'triggerParams',
                      patch: { offset: { ...(params.offset || {}), duration: Number(e.target.value) } },
                    })
                  }
                />
                <select
                  className="flex-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={params.offset?.unit || 'days'}
                  onChange={(e) =>
                    dispatch({
                      type: 'triggerParams',
                      patch: { offset: { ...(params.offset || {}), unit: e.target.value } },
                    })
                  }
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {type === 'recurring' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Repeats</label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={schedule.frequency}
                  onChange={(e) => updateSchedule({ frequency: e.target.value })}
                >
                  <option value="hourly">Every hour</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                </select>
              </div>
              {schedule.frequency !== 'hourly' && <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Run at</label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={schedule.hour}
                  onChange={(e) => updateSchedule({ hour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
                </select>
              </div>}
            </div>

            {schedule.frequency === 'weekly' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted">On these days</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const selected = schedule.days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${selected ? 'border-primary bg-primary text-white' : 'border-border bg-card text-body hover:bg-subtle'}`}
                        onClick={() => {
                          const nextDays = selected
                            ? schedule.days.filter((value) => value !== day.value)
                            : [...schedule.days, day.value].sort((a, b) => a - b);
                          updateSchedule({ days: nextDays.length ? nextDays : [day.value] });
                        }}
                        aria-pressed={selected}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Timezone</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={params.timezone || 'America/Toronto'}
                onChange={(e) => dispatch({ type: 'triggerParams', patch: { timezone: e.target.value } })}
              >
                {['America/Toronto', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'UTC']
                  .filter((timezone, index, values) => timezone === params.timezone || values.indexOf(timezone) === index)
                  .map((timezone) => <option key={timezone} value={timezone}>{timezone.replaceAll('_', ' ')}</option>)}
              </select>
            </div>

            <div className="rounded-lg bg-subtle px-3 py-2 text-xs text-muted">
              This automation will run {schedule.frequency === 'hourly' ? 'at the start of every hour' : schedule.frequency === 'daily' ? `every day at ${formatHour(schedule.hour)}` : `every ${schedule.days.map((day) => WEEKDAYS[day].short).join(', ')} at ${formatHour(schedule.hour)}`} ({params.timezone || 'America/Toronto'}).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
