/**
 * @typedef {Object<string, any>} ObjectLiteral
 */

const RegexComponent = class RegexComponent {
	constructor() { }
};

RegexComponent.Constant = class extends RegexComponent {
	static len = 1;
};

RegexComponent.Block = class extends RegexComponent {
	constructor(args = {}) {
		super(args);
		this.len = 0;

		const {
			body = []
		} = args;

		this.body = body;
	}

	get bodyLength() {
		return this.body.reduce((sum, e) => sum + (e instanceof RegexComponent.Block ? e.len + e.bodyLength : (e.length || e.len || Infinity)), 0);
	}

	wrap(string) {
		return this.body.length === 1 && this.bodyLength === 1 ? string : `(?:${string})`;
	}

	toArray() {
		return this.body.map(component => {
			if(typeof component === "string") return escapeRegexString(component);
			if(component instanceof RegExp) return component.toString().replace(/^\/([\s\S]*?)\/[gmixsuXUAJD]*$/m, "$1");
			return component.toString();
		});
	}
};

RegexComponent.Quantifier = class extends RegexComponent.Block {
	constructor(args = {}) {
		super(args);
		this.len = 2;

		const {
			isLazy = false
		} = args;

		this.isLazy = isLazy;
	}
};

/* Constants */
const $whitespace = class extends RegexComponent.Constant {
	static toString() {
		return "\\s";
	}
};

const $digit = class extends RegexComponent.Constant {
	static toString() {
		return "\\d";
	}
};

const $word = class extends RegexComponent.Constant {
	static toString() {
		return "\\w";
	}
};



RegexComponent.Regex = class extends RegexComponent.Block {
	constructor(args = {}) {
		super(args);

		this.flags = [];
	}


	/* Flags */

	//This is custom made, the original does not support the "g" flag
	returnAllMatches() {
		this.flags.push("g");
		return this;
	}

	anchorsMatchLineEndings() {
		this.flags.push("m");
		return this;
	}

	ignoresCase() {
		this.flags.push("i");
		return this;
	}

	dotMatchesNewlines() {
		this.flags.push("s");
		return this;
	}


	toString(includeFlags = false) {
		const body = this.toArray().join("");

		return includeFlags ? `/${body}/${this.flags.join("")}` : body;
	}

	build() {
		return new RegExp(this.toString(), this.flags.join(""));
	}
};

RegexComponent.One = class extends RegexComponent.Block {
	constructor(args = {}) {
		super(args);
	}

	toString() {
		return this.toArray().join("");
	}
};

RegexComponent.Capture = class extends RegexComponent.Block {
	constructor(args = {}) {
		super(args);
		this.len = 1;

		const {
			name
		} = args;

		this.name = name;
	}

	toString() {
		const body = this.toArray().join("");

		return `(${this.name ? `?<${this.name}>` : ""}${body})`;
	}
};

RegexComponent.ChoiceOf = class extends RegexComponent.Block {
	constructor(args = {}) {
		super(args);
	}

	toString() {
		return this.toArray().join("|");
	}
};


RegexComponent.OneOrMore = class extends RegexComponent.Quantifier {
	constructor(args = {}) {
		super(args);
	}

	toString() {
		const body = this.toArray().join("");

		return `${this.wrap(body)}+${this.isLazy ? "?" : ""}`;
	}
};

RegexComponent.ZeroOrMore = class extends RegexComponent.Quantifier {
	constructor(args = {}) {
		super(args);
	}

	toString() {
		const body = this.toArray().join("");

		return `${this.wrap(body)}*${this.isLazy ? "?" : ""}`;
	}
};

RegexComponent.Optionally = class extends RegexComponent.Quantifier {
	constructor(args = {}) {
		super(args);
	}

	toString() {
		const body = this.toArray();

		// if(this.body.length > 1) {
		// 	console.warn("Optionally quantifier should only contain one component");
		// } else if(this.body[0] instanceof RegexComponent.Quantifier) {
		// 	console.warn("Optionally quantifier should not contain a quantifier as first child");
		// } else if(this.body.length == 1 && body[0].length > 1) {
		// 	console.warn("Optionally quantifier should not contain a single component that is longer than one character");
		// }

		return `${this.wrap(body.join(""))}?${this.isLazy ? "?" : ""}`;
	}
};

RegexComponent.Repeat = class extends RegexComponent.Quantifier {
	constructor(args = {}) {
		super(args);

		const {
			from = 0,
			to,
			count
		} = args;

		this.from = from;
		this.to = to;
		this.count = count;
	}

	toString() {
		const body = this.toArray().join("");

		return `${this.wrap(body)}{${this.count || `${this.from},${this.to || ""}`}}${this.isLazy ? "?" : ""}`;
	}
};





/* Builder functions */

function Regex() {
	const {tree} = parseArgs(arguments);

	return new RegexComponent.Regex({body: tree});
}

function Capture() {
	const {tree, options} = parseArgs(arguments);

	return new RegexComponent.Capture({body: tree, name: options.as});
}

function ChoiceOf() {
	const {tree} = parseArgs(arguments);

	return new RegexComponent.ChoiceOf({body: tree});
}

function OneOrMore() {
	const {tree} = parseArgs(arguments);

	return new RegexComponent.OneOrMore({body: tree});
}

function Repeat() {
	const {tree, options} = parseArgs(arguments);

	if(options.count && (options.from || options.to)) throw new Error("Repeat cannot have both count and from/to");
	if(options.count < 0 || options.from < 0 || options.to < 0) throw new Error("Repeat count/from/to cannot be negative");
	if(options.from && options.to && options.from > options.to) throw new Error("Repeat from cannot be greater than to");
	if(options.count && options.count % 1 !== 0 || options.from && options.from % 1 !== 0 || options.to && options.to % 1 !== 0) throw new Error("Repeat count/from/to must be an integer");

	if(!options.from && options.to) options.from = 0;

	return new RegexComponent.Repeat({body: tree, isLazy: options.$reluctant, from: options.from, to: options.to, count: options.count});
}

function One() {
	const {tree} = parseArgs(arguments);

	return new RegexComponent.One({body: tree});
}

function Optionally() {
	const {tree, options} = parseArgs(arguments);

	return new RegexComponent.Optionally({body: tree, isLazy: options.$reluctant});
}

function ZeroOrMore() {
	const {tree, options} = parseArgs(arguments);

	return new RegexComponent.ZeroOrMore({body: tree, isLazy: options.$reluctant});
}





/* Helper functions */

/**
 * Parses the function arguments
 * @param {(ObjectLiteral | RegexComponent | string)[]} args
 * @return {{options: ObjectLiteral, tree: RegexComponent[]}}}} 
 */
function parseArgs(args) {
	const parsed = {
		options: {},
		tree: null
	};

	// (options{})
	if(Object.isObject(args[0])) parsed.options = args[0];

	// (tree[])
	if(Array.isArray(args[0])) parsed.tree = args[0];

	// (options{}, tree[])
	if(Array.isArray(args[1])) parsed.tree = args[1];

	// (...tree)
	if(!Object.isObject(args[0]) && !Array.isArray(args[0])) parsed.tree = [...args];

	// (options{}, ...tree)
	if(!parsed.tree && args[1] && !Object.isObject(args[1]) && !Array.isArray(args[1])) parsed.tree = [...args].slice(1);


	return parsed;
}

/**
 * Escapes a string for use in a regular expression
 * @param {string} string input string
 * @return {string} escaped string
 */
function escapeRegexString(string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

Object.defineProperty(Object, "isObject", {
	value: function(obj) {
		return obj && Object.getPrototypeOf(obj) === Object.prototype;
	}
});

Object.defineProperty(Object, "subclassOf", {
	value: function(obj, con) {
		return obj && (obj.prototype instanceof con || obj === con);
	}
});

module.exports = {
	Regex,
	Capture,
	ChoiceOf,
	OneOrMore,
	Repeat,
	One,
	Optionally,
	ZeroOrMore,
	$whitespace,
	$digit,
	$word,
	RegexComponent
};