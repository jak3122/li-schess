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
	extends: ["prettier", "eslint:recommended", "plugin:vue/recommended"],
	// add your custom rules here
	rules: {
		semi: 1,
		// don't require .vue extension when importing
		"import/extensions": [
			"error",
			"always",
			{
				js: "never",
				vue: "never"
			}
		],
		// allow optionalDependencies
		"import/no-extraneous-dependencies": [
			"error",
			{
				optionalDependencies: ["test/unit/index.js"]
			}
		],
		// allow debugger during development
		"no-debugger": process.env.NODE_ENV === "production" ? 2 : 0
	}
};
