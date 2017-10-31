/* eslint-disable react/react-in-jsx-scope */

import { storiesOf } from "@storybook/vue";

import Clock from "../components/Clock.vue";

storiesOf("Clock", module).add("clock", () => ({
	components: { Clock },
	template: "<Clock time=15000 running=false></Clock>"
}));

/* eslint-enable react/react-in-jsx-scope */
