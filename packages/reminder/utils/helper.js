const dayjs = require('dayjs');
require('dayjs/plugin/utc');  // Import UTC plugin
dayjs.extend(require('dayjs/plugin/utc'));  // Use UTC plugin

/**
 * Convert duration string like '5min', '2h', '3days', '1month' to ISO time in UTC
 */
function getReminderTime(durationStr) {
  const regex = /^(\d+)(min|h|hour|d|day|w|week|m|month|y|year)s?$/i;
  const match = durationStr.match(regex);

  if (!match) throw new Error('Invalid duration format');

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  let dayjsUnit;
  switch (unit) {
    case 'min': dayjsUnit = 'minute'; break;
    case 'h':
    case 'hour': dayjsUnit = 'hour'; break;
    case 'd':
    case 'day': dayjsUnit = 'day'; break;
    case 'w':
    case 'week': dayjsUnit = 'week'; break;
    case 'm':
    case 'month': dayjsUnit = 'month'; break;
    case 'y':
    case 'year': dayjsUnit = 'year'; break;
    default: throw new Error('Unsupported time unit');
  }

  return dayjs.utc().add(value, dayjsUnit).toISOString();  // Ensure UTC time
}

module.exports = { getReminderTime };
