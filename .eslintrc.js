// http://eslint.org/docs/user-guide/configuring

module.exports = {
	root: true,
	parserOptions: {
		parser: "babel-eslint",
		sourceType: "module"
	},
	env: {
		browser: true,
		node: true
	},
	// required to lint *.vue files
	plugins: ["html", "prettier"],
	// check if imports actually resolve
	settings: {
		"import/resolver": {
			webpack: {
				config: "build/webpack.base.conf.js"
			}
		}
	},
	extends: ["vue", "prettier", "eslint:recommended"],
	// add your custom rules here
	rules: {
		semi: 0,
		"no-console": 0,
		// allow debugger during development
		"no-debugger": process.env.NODE_ENV === "production" ? 2 : 0
	}
};
