const clock = function(baseTime, increment) {
	if (typeof baseTime !== "undefined") this.baseTime = baseTime;
	this.duration = baseTime;
	this.increment = increment;
	this.granularity = 10;
	this.running = false;
	this.timer = null;
	this.startTime = null;
	this.tickCallbacks = [];
	this.timeUpCallbacks = [];

	this.start = duration => {
		if (this.running) {
			return;
		}
		if (typeof duration !== "undefined") {
			this.duration = duration;
		}
		this.running = true;
		this.startTime = Date.now();
		let diff;
		let that = this;
		(function timer() {
			diff = that.duration - (Date.now() - that.startTime);
			if (diff <= 0) {
				that.timeUpCallbacks.forEach(function(callback) {
					callback.call(this, diff);
				}, that);
				that.pause();
				return;
			}
			that.timer = setTimeout(timer, that.granularity);
			that.tickCallbacks.forEach(function(callback) {
				callback.call(this, diff);
			}, that);
		})();
	};

	this.timeLeft = () => {
		return this.duration;
	};

	this.setDuration = duration => {
		this.duration = duration;
	};

	this.setIncrement = increment => {
		this.increment = increment;
	};

	this.onTick = callback => {
		if (typeof callback === "function") {
			this.tickCallbacks.push(callback);
		}
		return this;
	};

	this.onTimeUp = callback => {
		if (typeof callback === "function") {
			this.timeUpCallbacks.push(callback);
		}
		return this;
	};

	this.pause = () => {
		if (!this.running) {
			return;
		}
		this.running = false;
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.timer = null;
		this.duration -= Date.now() - this.startTime;
		if (this.increment) this.duration += this.increment * 1000;
	};

	this.parse = millis => {
		let minutes = Math.floor(millis / 60000);
		let seconds = (millis % 60000) / 1000;
		if (Math.floor(seconds) == 60) {
			minutes++;
			seconds = 0;
		}
		minutes = Math.max(0, minutes);
		seconds = Math.max(0, seconds);
		if (millis < 10000) {
			seconds = seconds.toFixed(1);
		} else {
			seconds = Math.floor(seconds);
		}
		minutes = (minutes < 10 ? "0" : "") + minutes;
		seconds = (seconds < 10 ? "0" : "") + seconds;
		return {
			minutes,
			seconds
		};
	};
};

if (typeof exports !== "undefined") exports.clock = clock;
if (typeof define !== "undefined")
	define(function() {
		return clock;
	});
