<template>
    <div class="clock" :class="{ running }">
        {{ timeParsed.minutes }}
        <div class="sep" :class="{ low: sepLow }">:</div>
        {{ timeParsed.seconds }}
    </div>
</template>

<script>
import clock from "../chess/clock";

export default {
	name: "Clock",
	props: ["running", "time", "increment"],
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
				console.log("starting clock");
				this.clock.start();
			} else {
				console.log("pausing clock");
				this.clock.pause();
			}
		},
		time: function(newTime) {
			console.log("old time:", this.time, "new time:", newTime);
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
}
.clock.running {
	color: black;
}
.clock .sep {
	display: inline-block;
}
.clock .sep.low {
	opacity: 0.15;
}
</style>