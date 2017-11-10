<template>
    <div class="clock" :class="[{ running }, position]">
        {{ timeParsed.minutes }}
        <div class="sep" :class="{ low: sepLow }">:</div>
        {{ timeParsed.seconds }}
    </div>
</template>

<script>
import clock from "../chess/clock";

export default {
	name: "Clock",
	props: ["position", "running", "time", "increment"],
	data() {
		return {
			clock: new clock(this.time),
			currentTime: this.time
		};
	},
	mounted() {
		this.clock.onTick(newTime => {
			this.currentTime = newTime;
		});
		if (this.running) this.clock.start(this.currentTime);
	},
	computed: {
		timeParsed: function() {
			return this.clock.parse(this.currentTime);
		},
		sepLow: function() {
			const date = new Date(this.currentTime);
			const millis = date.getUTCMilliseconds();
			return this.running && millis < 500;
		}
	},
	watch: {
		running: function(newRunning) {
			if (newRunning === true) {
				this.clock.start();
			} else {
				this.clock.pause();
			}
		},
		time: function(newTime) {
			try {
				const oldParsed = this.clock.parse(this.time);
				const newParsed = this.clock.parse(newTime);
				console.warn(
					"old time:",
					this.time,
					`(${oldParsed.minutes}:${oldParsed.seconds})`,
					" | ",
					"new time:",
					newTime,
					`(${newParsed.minutes}:${newParsed.seconds})`,
					" | ",
					`${(this.time - newTime) / 1000}s difference`
				);
			} catch (err) {
				console.error(err);
			}
			this.currentTime = newTime;
			if (this.running) {
				this.clock.pause();
				this.clock.start(this.currentTime);
			} else {
				this.clock.setDuration(newTime);
			}
		},
		increment: function(newIncrement) {
			this.clock.setIncrement(newIncrement);
		}
	}
};
</script>

<style scoped>
.clock {
	font-family: "Roboto Mono", "Roboto";
	font-size: 38px;
	color: rgba(0, 0, 0, 0.3);
	align-self: left;
	border: 1px solid #ccc;
	padding: 0 8px;
	line-height: 44px;
	white-space: nowrap;
	will-change: transform;
	font-family: "Roboto Mono", "Roboto";
	height: 44px;
}
.clock.running {
	color: black;
	background: #fff077;
}
.clock .sep {
	display: inline-block;
}
.clock .sep.low {
	opacity: 0.15;
}
.clock.top {
	border-bottom: 0;
}
.clock.bottom {
	border-top: 0;
}
</style>