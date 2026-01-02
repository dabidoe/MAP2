/**
 * Campaign Clock
 * Tracks game time and triggers time-based events
 *
 * @typedef {Object} TimeState
 * @property {string} date - Current campaign date (e.g., "1776-12-23")
 * @property {string} time - Current time (HH:mm format)
 * @property {number} totalMinutes - Total minutes elapsed since campaign start
 */

export class CampaignClock {
  /**
   * @param {string} startDate - Starting date (YYYY-MM-DD)
   * @param {string} startTime - Starting time (HH:mm)
   * @param {number} minutesPerMovementUnit - How many real minutes = 1 movement unit
   */
  constructor(startDate = '1776-12-23', startTime = '23:45', minutesPerMovementUnit = 5) {
    this.startDate = new Date(startDate + 'T' + startTime + ':00');
    this.currentTime = new Date(this.startDate);
    this.minutesPerMovementUnit = minutesPerMovementUnit;
    this.totalMinutesElapsed = 0;
    this.paused = false;
    this.listeners = [];
  }

  /**
   * Advance time by movement units
   * @param {number} units - Number of movement units
   * @returns {TimeState}
   */
  advance(units = 1) {
    if (this.paused) return this.getState();

    const minutesToAdd = units * this.minutesPerMovementUnit;
    this.currentTime.setMinutes(this.currentTime.getMinutes() + minutesToAdd);
    this.totalMinutesElapsed += minutesToAdd;

    // Trigger time-based events
    this._triggerEvents();

    return this.getState();
  }

  /**
   * Advance time by specific minutes
   * @param {number} minutes - Minutes to advance
   * @returns {TimeState}
   */
  advanceByMinutes(minutes) {
    if (this.paused) return this.getState();

    this.currentTime.setMinutes(this.currentTime.getMinutes() + minutes);
    this.totalMinutesElapsed += minutes;

    this._triggerEvents();

    return this.getState();
  }

  /**
   * Get current time state
   * @returns {TimeState}
   */
  getState() {
    return {
      date: this.currentTime.toISOString().split('T')[0],
      time: this.currentTime.toTimeString().substring(0, 5),
      totalMinutes: this.totalMinutesElapsed,
      hour: this.currentTime.getHours(),
      isPaused: this.paused
    };
  }

  /**
   * Set time to specific value
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string} time - Time (HH:mm)
   */
  setTime(date, time) {
    this.currentTime = new Date(date + 'T' + time + ':00');
    const diff = this.currentTime - this.startDate;
    this.totalMinutesElapsed = Math.floor(diff / 60000);
  }

  /**
   * Pause/unpause time
   */
  pause() {
    this.paused = true;
  }

  unpause() {
    this.paused = false;
  }

  /**
   * Register event listener for time milestones
   * @param {number} minuteThreshold - Trigger when this many minutes have elapsed
   * @param {Function} callback - Function to call
   */
  onTimeThreshold(minuteThreshold, callback) {
    this.listeners.push({ threshold: minuteThreshold, callback, triggered: false });
  }

  /**
   * Register event listener for specific hour
   * @param {number} hour - Hour (0-23)
   * @param {Function} callback
   */
  onHour(hour, callback) {
    this.listeners.push({ type: 'hour', hour, callback });
  }

  /**
   * Internal: Trigger registered events
   * @private
   */
  _triggerEvents() {
    const currentHour = this.currentTime.getHours();

    this.listeners.forEach(listener => {
      if (listener.type === 'hour' && currentHour === listener.hour && !listener.triggered) {
        listener.callback(this.getState());
        listener.triggered = true;
      } else if (listener.threshold && this.totalMinutesElapsed >= listener.threshold && !listener.triggered) {
        listener.callback(this.getState());
        listener.triggered = true;
      }
    });
  }

  /**
   * Calculate time difference between two positions (for travel)
   * @param {Object} from - {lat, lng}
   * @param {Object} to - {lat, lng}
   * @returns {number} Minutes of travel time
   */
  calculateTravelTime(from, to) {
    // Haversine distance
    const R = 6371e3; // Earth radius in meters
    const φ1 = from.lat * Math.PI / 180;
    const φ2 = to.lat * Math.PI / 180;
    const Δφ = (to.lat - from.lat) * Math.PI / 180;
    const Δλ = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // meters

    // Assume marching speed: 4 km/h in good conditions
    // Winter conditions: reduce to 2.5 km/h
    const marchingSpeedKmH = 2.5;
    const distanceKm = distance / 1000;
    const hours = distanceKm / marchingSpeedKmH;
    const minutes = Math.ceil(hours * 60);

    return minutes;
  }

  /**
   * Format time for display
   * @returns {string}
   */
  format() {
    const state = this.getState();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, month, day] = state.date.split('-');
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year} at ${state.time}`;
  }
}

// Export singleton instance for shared use
export const campaignClock = new CampaignClock();
