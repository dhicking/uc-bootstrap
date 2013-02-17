/*!
 * Copyright (c) 2011 Simo Kinnunen.
 * Licensed under the MIT license.
 *
 * @version ${Version}
 */

var Cufon = (function() {

	var api = function() {
		return api.replace.apply(null, arguments);
	};

	var DOM = api.DOM = {

		ready: (function() {

			var complete = false, readyStatus = { loaded: 1, complete: 1 };

			var queue = [], perform = function() {
				if (complete) return;
				complete = true;
				for (var fn; fn = queue.shift(); fn());
			};

			// Gecko, Opera, WebKit r26101+

			if (document.addEventListener) {
				document.addEventListener('DOMContentLoaded', perform, false);
				window.addEventListener('pageshow', perform, false); // For cached Gecko pages
			}

			// Old WebKit, Internet Explorer

			if (!window.opera && document.readyState) (function() {
				readyStatus[document.readyState] ? perform() : setTimeout(arguments.callee, 10);
			})();

			// Internet Explorer

			if (document.readyState && document.createStyleSheet) (function() {
				try {
					document.body.doScroll('left');
					perform();
				}
				catch (e) {
					setTimeout(arguments.callee, 1);
				}
			})();

			addEvent(window, 'load', perform); // Fallback

			return function(listener) {
				if (!arguments.length) perform();
				else complete ? listener() : queue.push(listener);
			};

		})(),

		root: function() {
			return document.documentElement || document.body;
		},

		strict: (function() {
			var doctype;
			// no doctype (doesn't always catch it though.. IE I'm looking at you)
			if (document.compatMode == 'BackCompat') return false;
			// WebKit, Gecko, Opera, IE9+
			doctype = document.doctype;
			if (doctype) {
				return !/frameset|transitional/i.test(doctype.publicId);
			}
			// IE<9, firstChild is the doctype even if there's an XML declaration
			doctype = document.firstChild;
			if (doctype.nodeType != 8 || /^DOCTYPE.+(transitional|frameset)/i.test(doctype.data)) {
				return false;
			}
			return true;
		})()

	};

	var CSS = api.CSS = {

		Size: function(value, base) {

			this.value = parseFloat(value);
			this.unit = String(value).match(/[a-z%]*$/)[0] || 'px';

			this.convert = function(value) {
				return value / base * this.value;
			};

			this.convertFrom = function(value) {
				return value / this.value * base;
			};

			this.toString = function() {
				return this.value + this.unit;
			};

		},

		addClass: function(el, className) {
			var current = el.className;
			el.className = current + (current && ' ') + className;
			return el;
		},

		color: cached(function(value) {
			var parsed = {};
			parsed.color = value.replace(/^rgba\((.*?),\s*([\d.]+)\)/, function($0, $1, $2) {
				parsed.opacity = parseFloat($2);
				return 'rgb(' + $1 + ')';
			});
			return parsed;
		}),

		// has no direct CSS equivalent.
		// @see http://msdn.microsoft.com/en-us/library/system.windows.fontstretches.aspx
		fontStretch: cached(function(value) {
			if (typeof value == 'number') return value;
			if (/%$/.test(value)) return parseFloat(value) / 100;
			return {
				'ultra-condensed': 0.5,
				'extra-condensed': 0.625,
				condensed: 0.75,
				'semi-condensed': 0.875,
				'semi-expanded': 1.125,
				expanded: 1.25,
				'extra-expanded': 1.5,
				'ultra-expanded': 2
			}[value] || 1;
		}),

		getStyle: function(el) {
			var view = document.defaultView;
			if (view && view.getComputedStyle) return new Style(view.getComputedStyle(el, null));
			if (el.currentStyle) return new Style(el.currentStyle);
			return new Style(el.style);
		},

		gradient: cached(function(value) {
			var gradient = {
				id: value,
				type: value.match(/^-([a-z]+)-gradient\(/)[1],
				stops: []
			}, colors = value.substr(value.indexOf('(')).match(/([\d.]+=)?(#[a-f0-9]+|[a-z]+\(.*?\)|[a-z]+)/ig);
			for (var i = 0, l = colors.length, stop; i < l; ++i) {
				stop = colors[i].split('=', 2).reverse();
				gradient.stops.push([ stop[1] || i / (l - 1), stop[0] ]);
			}
			return gradient;
		}),

		quotedList: cached(function(value) {
			// doesn't work properly with empty quoted strings (""), but
			// it's not worth the extra code.
			var list = [], re = /\s*((["'])([\s\S]*?[^\\])\2|[^,]+)\s*/g, match;
			while (match = re.exec(value)) list.push(match[3] || match[1]);
			return list;
		}),

		recognizesMedia: cached(function(media) {
			var el = document.createElement('style'), sheet, container, supported;
			el.type = 'text/css';
			el.media = media;
			try { // this is cached anyway
				el.appendChild(document.createTextNode('/**/'));
			} catch (e) {}
			container = elementsByTagName('head')[0];
			container.insertBefore(el, container.firstChild);
			sheet = (el.sheet || el.styleSheet);
			supported = sheet && !sheet.disabled;
			container.removeChild(el);
			return supported;
		}),

		removeClass: function(el, className) {
			var re = RegExp('(?:^|\\s+)' + className +  '(?=\\s|$)', 'g');
			el.className = el.className.replace(re, '');
			return el;
		},

		supports: function(property, value) {
			var checker = document.createElement('span').style;
			if (checker[property] === undefined) return false;
			checker[property] = value;
			return checker[property] === value;
		},

		textAlign: function(word, style, position, wordCount) {
			if (style.get('textAlign') == 'right') {
				if (position > 0) word = ' ' + word;
			}
			else if (position < wordCount - 1) word += ' ';
			return word;
		},

		textShadow: cached(function(value) {
			if (value == 'none') return null;
			var shadows = [], currentShadow = {}, result, offCount = 0;
			var re = /(#[a-f0-9]+|[a-z]+\(.*?\)|[a-z]+)|(-?[\d.]+[a-z%]*)|,/ig;
			while (result = re.exec(value)) {
				if (result[0] == ',') {
					shadows.push(currentShadow);
					currentShadow = {};
					offCount = 0;
				}
				else if (result[1]) {
					currentShadow.color = result[1];
				}
				else {
					currentShadow[[ 'offX', 'offY', 'blur' ][offCount++]] = result[2];
				}
			}
			shadows.push(currentShadow);
			return shadows;
		}),

		textTransform: (function() {
			var map = {
				uppercase: function(s) {
					return s.toUpperCase();
				},
				lowercase: function(s) {
					return s.toLowerCase();
				},
				capitalize: function(s) {
					return s.replace(/(?:^|\s)./g, function($0) {
						return $0.toUpperCase();
					});
				}
			};
			return function(text, style) {
				var transform = map[style.get('textTransform')];
				return transform ? transform(text) : text;
			};
		})(),

		whiteSpace: (function() {
			var ignore = {
				inline: 1,
				'inline-block': 1,
				'run-in': 1
			};
			var wsStart = /^\s+/, wsEnd = /\s+$/;
			return function(text, style, node, previousElement, simple) {
				if (simple) return text.replace(wsStart, '').replace(wsEnd, ''); // @fixme too simple
				if (previousElement) {
					if (previousElement.nodeName.toLowerCase() == 'br') {
						text = text.replace(wsStart, '');
					}
				}
				if (ignore[style.get('display')]) return text;
				if (!node.previousSibling) text = text.replace(wsStart, '');
				if (!node.nextSibling) text = text.replace(wsEnd, '');
				return text;
			};
		})()

	};

	CSS.ready = (function() {

		// don't do anything in Safari 2 (it doesn't recognize any media type)
		var complete = !CSS.recognizesMedia('all'), hasLayout = false;

		var queue = [], perform = function() {
			complete = true;
			for (var fn; fn = queue.shift(); fn());
		};

		var links = elementsByTagName('link'), styles = elementsByTagName('style');

		var checkTypes = {
			'': 1,
			'text/css': 1
		};

		function isContainerReady(el) {
			if (!checkTypes[el.type.toLowerCase()]) return true;
			return el.disabled || isSheetReady(el.sheet, el.media || 'screen');
		}

		function isSheetReady(sheet, media) {
			// in Opera sheet.disabled is true when it's still loading,
			// even though link.disabled is false. they stay in sync if
			// set manually.
			if (!CSS.recognizesMedia(media || 'all')) return true;
			if (!sheet || sheet.disabled) return false;
			try {
				var rules = sheet.cssRules, rule;
				if (rules) {
					// needed for Safari 3 and Chrome 1.0.
					// in standards-conforming browsers cssRules contains @-rules.
					// Chrome 1.0 weirdness: rules[<number larger than .length - 1>]
					// returns the last rule, so a for loop is the only option.
					search: for (var i = 0, l = rules.length; rule = rules[i], i < l; ++i) {
						switch (rule.type) {
							case 2: // @charset
								break;
							case 3: // @import
								if (!isSheetReady(rule.styleSheet, rule.media.mediaText)) return false;
								break;
							default:
								// only @charset can precede @import
								break search;
						}
					}
				}
			}
			catch (e) {} // probably a style sheet from another domain
			return true;
		}

		function allStylesLoaded() {
			// Internet Explorer's style sheet model, there's no need to do anything
			if (document.createStyleSheet) return true;
			// standards-compliant browsers
			var el, i;
			for (i = 0; el = links[i]; ++i) {
				if (el.rel.toLowerCase() == 'stylesheet' && !isContainerReady(el)) return false;
			}
			for (i = 0; el = styles[i]; ++i) {
				if (!isContainerReady(el)) return false;
			}
			return true;
		}

		DOM.ready(function() {
			// getComputedStyle returns null in Gecko if used in an iframe with display: none
			if (!hasLayout) hasLayout = CSS.getStyle(document.body).isUsable();
			if (complete || (hasLayout && allStylesLoaded())) perform();
			else setTimeout(arguments.callee, 10);
		});

		return function(listener) {
			if (complete) listener();
			else queue.push(listener);
		};

	})();

	function Font(data) {

		var face = this.face = data.face, ligatureCache = [], wordSeparators = {
			'\u0020': 1,
			'\u00a0': 1,
			'\u3000': 1
		};

		this.glyphs = (function(glyphs) {
			var key, fallbacks = {
				'\u2011': '\u002d',
				'\u00ad': '\u2011'
			};
			for (key in fallbacks) {
				if (!hasOwnProperty(fallbacks, key)) continue;
				if (!glyphs[key]) glyphs[key] = glyphs[fallbacks[key]];
			}
			return glyphs;
		})(data.glyphs);

		this.w = data.w;
		this.baseSize = parseInt(face['units-per-em'], 10);

		this.family = face['font-family'].toLowerCase();
		this.weight = face['font-weight'];
		this.style = face['font-style'] || 'normal';

		this.viewBox = (function () {
			var parts = face.bbox.split(/\s+/);
			var box = {
				minX: parseInt(parts[0], 10),
				minY: parseInt(parts[1], 10),
				maxX: parseInt(parts[2], 10),
				maxY: parseInt(parts[3], 10)
			};
			box.width = box.maxX - box.minX;
			box.height = box.maxY - box.minY;
			box.toString = function() {
				return [ this.minX, this.minY, this.width, this.height ].join(' ');
			};
			return box;
		})();

		this.ascent = -parseInt(face.ascent, 10);
		this.descent = -parseInt(face.descent, 10);

		this.height = -this.ascent + this.descent;

		this.spacing = function(chars, letterSpacing, wordSpacing) {
			var glyphs = this.glyphs, glyph,
				kerning, k,
				jumps = [],
				width = 0, w,
				i = -1, j = -1, chr;
			while (chr = chars[++i]) {
				glyph = glyphs[chr] || this.missingGlyph;
				if (!glyph) continue;
				if (kerning) {
					width -= k = kerning[chr] || 0;
					jumps[j] -= k;
				}
				w = glyph.w;
				if (isNaN(w)) w = +this.w; // may have been a String in old fonts
				if (w > 0) {
					w += letterSpacing;
					if (wordSeparators[chr]) w += wordSpacing;
				}
				width += jumps[++j] = ~~w; // get rid of decimals
				kerning = glyph.k;
			}
			jumps.total = width;
			return jumps;
		};

		this.applyLigatures = function(text, ligatures) {
			// find cached ligature configuration for this font
			for (var i=0, ligatureConfig; i<ligatureCache.length && !ligatureConfig; i++)
				if (ligatureCache[i].ligatures === ligatures)
					ligatureConfig = ligatureCache[i];

			// if there is none, it needs to be created and cached
			if (!ligatureConfig) {
				// identify letter groups to prepare regular expression that matches these
				var letterGroups = [];
				for (var letterGroup in ligatures) {
					if (this.glyphs[ligatures[letterGroup]]) {
						letterGroups.push(letterGroup);
					}
				}

				// sort by longer groups first, then alphabetically (to aid caching by this key)
				var regexpText = letterGroups.sort(function(a, b) {
					return b.length - a.length || a > b;
				}).join('|');

				ligatureCache.push(ligatureConfig = {
					ligatures: ligatures,
					// create regular expression for matching desired ligatures that are present in the font
					regexp: regexpText.length > 0 
						? regexpCache[regexpText] || (regexpCache[regexpText] = new RegExp(regexpText, 'g'))
						: null
				});
			}

			// return applied ligatures or original text if none exist for given configuration
			return ligatureConfig.regexp
				? text.replace(ligatureConfig.regexp, function(match) {
					return ligatures[match] || match;
				})
				: text;
		};
	}

	function FontFamily() {

		var styles = {}, mapping = {
			oblique: 'italic',
			italic: 'oblique'
		};

		this.add = function(font) {
			(styles[font.style] || (styles[font.style] = {}))[font.weight] = font;
		};

		this.get = function(style, weight) {
			var weights = styles[style] || styles[mapping[style]]
				|| styles.normal || styles.italic || styles.oblique;
			if (!weights) return null;
			// we don't have to worry about "bolder" and "lighter"
			// because IE's currentStyle returns a numeric value for it,
			// and other browsers use the computed value anyway
			weight = {
				normal: 400,
				bold: 700
			}[weight] || parseInt(weight, 10);
			if (weights[weight]) return weights[weight];
			// http://www.w3.org/TR/CSS21/fonts.html#propdef-font-weight
			// Gecko uses x99/x01 for lighter/bolder
			var up = {
				1: 1,
				99: 0
			}[weight % 100], alts = [], min, max;
			if (up === undefined) up = weight > 400;
			if (weight == 500) weight = 400;
			for (var alt in weights) {
				if (!hasOwnProperty(weights, alt)) continue;
				alt = parseInt(alt, 10);
				if (!min || alt < min) min = alt;
				if (!max || alt > max) max = alt;
				alts.push(alt);
			}
			if (weight < min) weight = min;
			if (weight > max) weight = max;
			alts.sort(function(a, b) {
				return (up
					? (a >= weight && b >= weight) ? a < b : a > b
					: (a <= weight && b <= weight) ? a > b : a < b) ? -1 : 1;
			});
			return weights[alts[0]];
		};

	}

	function HoverHandler() {

		function contains(node, anotherNode) {
			try {
				if (node.contains) return node.contains(anotherNode);
				return node.compareDocumentPosition(anotherNode) & 16;
			}
			catch(e) {} // probably a XUL element such as a scrollbar
			return false;
		}

		// mouseover/mouseout (standards) mode
		function onOverOut(e) {
			var related = e.relatedTarget;
			// there might be no relatedTarget if the element is right next
			// to the window frame
			if (related && contains(this, related)) return;
			trigger(this, e.type == 'mouseover');
		}

		// mouseenter/mouseleave (probably ie) mode
		function onEnterLeave(e) {
			if (!e) e = window.event;
			// ie model, we don't have access to "this", but
			// mouseenter/leave doesn't bubble so it's fine.
			trigger(e.target || e.srcElement, e.type == 'mouseenter');
		}

		function trigger(el, hoverState) {
			// A timeout is needed so that the event can actually "happen"
			// before replace is triggered. This ensures that styles are up
			// to date.
			setTimeout(function() {
				var options = sharedStorage.get(el).options;
				if (hoverState) {
					options = merge(options, options.hover);
					options._mediatorMode = 1;
				}
				api.replace(el, options, true);
			}, 10);
		}

		this.attach = function(el) {
			if (el.onmouseenter === undefined) {
				addEvent(el, 'mouseover', onOverOut);
				addEvent(el, 'mouseout', onOverOut);
			}
			else {
				addEvent(el, 'mouseenter', onEnterLeave);
				addEvent(el, 'mouseleave', onEnterLeave);
			}
		};

		this.detach = function(el) {
			if (el.onmouseenter === undefined) {
				removeEvent(el, 'mouseover', onOverOut);
				removeEvent(el, 'mouseout', onOverOut);
			}
			else {
				removeEvent(el, 'mouseenter', onEnterLeave);
				removeEvent(el, 'mouseleave', onEnterLeave);
			}
		};

	}

	function ReplaceHistory() {

		var list = [], map = {};

		function filter(keys) {
			var values = [], key;
			for (var i = 0; key = keys[i]; ++i) values[i] = list[map[key]];
			return values;
		}

		this.add = function(key, args) {
			map[key] = list.push(args) - 1;
		};

		this.repeat = function() {
			var snapshot = arguments.length ? filter(arguments) : list, args;
			for (var i = 0; args = snapshot[i++];) api.replace(args[0], args[1], true);
		};

	}

	function Storage() {

		var map = {}, at = 0;

		function identify(el) {
			return el.cufid || (el.cufid = ++at);
		}

		this.get = function(el) {
			var id = identify(el);
			return map[id] || (map[id] = {});
		};

	}

	function Style(style) {

		var custom = {}, sizes = {};

		this.extend = function(styles) {
			for (var property in styles) {
				if (hasOwnProperty(styles, property)) custom[property] = styles[property];
			}
			return this;
		};

		this.get = function(property) {
			return custom[property] != undefined ? custom[property] : style[property];
		};

		this.getSize = function(property, base) {
			return sizes[property] || (sizes[property] = new CSS.Size(this.get(property), base));
		};

		this.isUsable = function() {
			return !!style;
		};

	}

	function addEvent(el, type, listener) {
		if (el.addEventListener) {
			el.addEventListener(type, listener, false);
		}
		else if (el.attachEvent) {
			// we don't really need "this" right now, saves code
			el.attachEvent('on' + type, listener);
		}
	}

	function attach(el, options) {
		if (options._mediatorMode) return el;
		var storage = sharedStorage.get(el);
		var oldOptions = storage.options;
		if (oldOptions) {
			if (oldOptions === options) return el;
			if (oldOptions.hover) hoverHandler.detach(el);
		}
		if (options.hover && options.hoverables[el.nodeName.toLowerCase()]) {
			hoverHandler.attach(el);
		}
		storage.options = options;
		return el;
	}

	function cached(fun) {
		var cache = {};
		return function(key) {
			if (!hasOwnProperty(cache, key)) cache[key] = fun.apply(null, arguments);
			return cache[key];
		};
	}

	function getFont(el, style) {
		var families = CSS.quotedList(style.get('fontFamily').toLowerCase()), family;
		for (var i = 0; family = families[i]; ++i) {
			if (fonts[family]) return fonts[family].get(style.get('fontStyle'), style.get('fontWeight'));
		}
		return null;
	}

	function elementsByTagName(query) {
		return document.getElementsByTagName(query);
	}

	function hasOwnProperty(obj, property) {
		return obj.hasOwnProperty(property);
	}

	function merge() {
		var merged = {}, arg, key;
		for (var i = 0, l = arguments.length; arg = arguments[i], i < l; ++i) {
			for (key in arg) {
				if (hasOwnProperty(arg, key)) merged[key] = arg[key];
			}
		}
		return merged;
	}

	function process(font, text, style, options, node, el) {
		var fragment = document.createDocumentFragment(), processed;
		if (text === '') return fragment;
		var separate = options.separate;
		var parts = text.split(separators[separate]), needsAligning = (separate == 'words');
		if (needsAligning && HAS_BROKEN_REGEXP) {
			// @todo figure out a better way to do this
			if (/^\s/.test(text)) parts.unshift('');
			if (/\s$/.test(text)) parts.push('');
		}
		for (var i = 0, l = parts.length; i < l; ++i) {
			processed = engines[options.engine](font,
				needsAligning ? CSS.textAlign(parts[i], style, i, l) : parts[i],
				style, options, node, el, i < l - 1);
			if (processed) fragment.appendChild(processed);
		}
		return fragment;
	}

	function removeEvent(el, type, listener) {
		if (el.removeEventListener) {
			el.removeEventListener(type, listener, false);
		}
		else if (el.detachEvent) {
			el.detachEvent('on' + type, listener);
		}
	}

	function replaceElement(el, options) {
		var name = el.nodeName.toLowerCase();
		if (options.ignore[name]) return;
		if (options.ignoreClass && options.ignoreClass.test(el.className)) return;
		if (options.onBeforeReplace) options.onBeforeReplace(el, options);
		var replace = !options.textless[name], simple = (options.trim === 'simple');
		var style = CSS.getStyle(attach(el, options)).extend(options);
		// may cause issues if the element contains other elements
		// with larger fontSize, however such cases are rare and can
		// be fixed by using a more specific selector
		if (parseFloat(style.get('fontSize')) === 0) return;
		var font = getFont(el, style), node, type, next, anchor, text, lastElement;
		var isShy = options.softHyphens, anyShy = false, pos, shy, reShy = /\u00ad/g;
		var modifyText = options.modifyText;
		if (!font) return;
		for (node = el.firstChild; node; node = next) {
			type = node.nodeType;
			next = node.nextSibling;
			if (replace && type == 3) {
				if (isShy && el.nodeName.toLowerCase() != TAG_SHY) {
					pos = node.data.indexOf('\u00ad');
					if (pos >= 0) {
						node.splitText(pos);
						next = node.nextSibling;
						next.deleteData(0, 1);
						shy = document.createElement(TAG_SHY);
						shy.appendChild(document.createTextNode('\u00ad'));
						el.insertBefore(shy, next);
						next = shy;
						anyShy = true;
					}
				}
				// Node.normalize() is broken in IE 6, 7, 8
				if (anchor) {
					anchor.appendData(node.data);
					el.removeChild(node);
				}
				else anchor = node;
				if (next) continue;
			}
			if (anchor) {
				text = anchor.data;
				if (!isShy) text = text.replace(reShy, '');
				text = CSS.whiteSpace(text, style, anchor, lastElement, simple);
				// modify text only on the first replace
				if (modifyText) text = modifyText(text, anchor, el, options);
				el.replaceChild(process(font, text, style, options, node, el), anchor);
				anchor = null;
			}
			if (type == 1) {
				if (node.firstChild) {
					if (node.nodeName.toLowerCase() == 'cufon') {
						engines[options.engine](font, null, style, options, node, el);
					}
					else arguments.callee(node, options);
				}
				lastElement = node;
			}
		}
		if (isShy && anyShy) {
			updateShy(el);
			if (!trackingShy) addEvent(window, 'resize', updateShyOnResize);
			trackingShy = true;
		}
		if (options.onAfterReplace) options.onAfterReplace(el, options);
	}

	function updateShy(context) {
		var shys, shy, parent, glue, newGlue, next, prev, i;
		shys = context.getElementsByTagName(TAG_SHY);
		// unfortunately there doesn't seem to be any easy
		// way to avoid having to loop through the shys twice.
		for (i = 0; shy = shys[i]; ++i) {
			shy.className = C_SHY_DISABLED;
			glue = parent = shy.parentNode;
			if (glue.nodeName.toLowerCase() != TAG_GLUE) {
				newGlue = document.createElement(TAG_GLUE);
				newGlue.appendChild(shy.previousSibling);
				parent.insertBefore(newGlue, shy);
				newGlue.appendChild(shy);
			}
			else {
				// get rid of double glue (edge case fix)
				glue = glue.parentNode;
				if (glue.nodeName.toLowerCase() == TAG_GLUE) {
					parent = glue.parentNode;
					while (glue.firstChild) {
						parent.insertBefore(glue.firstChild, glue);
					}
					parent.removeChild(glue);
				}
			}
		}
		for (i = 0; shy = shys[i]; ++i) {
			shy.className = '';
			glue = shy.parentNode;
			parent = glue.parentNode;
			next = glue.nextSibling || parent.nextSibling;
			// make sure we're comparing same types
			prev = (next.nodeName.toLowerCase() == TAG_GLUE) ? glue : shy.previousSibling;
			if (prev.offsetTop >= next.offsetTop) {
				shy.className = C_SHY_DISABLED;
				if (prev.offsetTop < next.offsetTop) {
					// we have an annoying edge case, double the glue
					newGlue = document.createElement(TAG_GLUE);
					parent.insertBefore(newGlue, glue);
					newGlue.appendChild(glue);
					newGlue.appendChild(next);
				}
			}
		}
	}

	function updateShyOnResize() {
		if (ignoreResize) return; // needed for IE
		CSS.addClass(DOM.root(), C_VIEWPORT_RESIZING);
		clearTimeout(shyTimer);
		shyTimer = setTimeout(function() {
			ignoreResize = true;
			CSS.removeClass(DOM.root(), C_VIEWPORT_RESIZING);
			updateShy(document);
			ignoreResize = false;
		}, 100);
	}

	var HAS_BROKEN_REGEXP = ' '.split(/\s+/).length == 0;
	var TAG_GLUE = 'cufonglue';
	var TAG_SHY = 'cufonshy';
	var C_SHY_DISABLED = 'cufon-shy-disabled';
	var C_VIEWPORT_RESIZING = 'cufon-viewport-resizing';

	var regexpCache = {};
	var sharedStorage = new Storage();
	var hoverHandler = new HoverHandler();
	var replaceHistory = new ReplaceHistory();
	var initialized = false;
	var trackingShy = false;
	var shyTimer;
	var ignoreResize = false;

	var engines = {}, fonts = {}, defaultOptions = {
		autoDetect: false,
		engine: null,
		forceHitArea: false,
		hover: false,
		hoverables: {
			a: true
		},
		ignore: {
			applet: 1,
			canvas: 1,
			col: 1,
			colgroup: 1,
			head: 1,
			iframe: 1,
			map: 1,
			noscript: 1,
			optgroup: 1,
			option: 1,
			script: 1,
			select: 1,
			style: 1,
			textarea: 1,
			title: 1,
			pre: 1
		},
		ignoreClass: null,
		modifyText: null,
		onAfterReplace: null,
		onBeforeReplace: null,
		printable: true,
		selector: (
				window.Sizzle
			||	(window.jQuery && function(query) { return jQuery(query); }) // avoid noConflict issues
			||	(window.dojo && dojo.query)
			||	(window.glow && glow.dom && glow.dom.get)
			||	(window.Ext && Ext.query)
			||	(window.YAHOO && YAHOO.util && YAHOO.util.Selector && YAHOO.util.Selector.query)
			||	(window.$$ && function(query) { return $$(query); })
			||	(window.$ && function(query) { return $(query); })
			||	(document.querySelectorAll && function(query) { return document.querySelectorAll(query); })
			||	elementsByTagName
		),
		separate: 'words', // 'none' and 'characters' are also accepted
		softHyphens: true,
		textless: {
			dl: 1,
			html: 1,
			ol: 1,
			table: 1,
			tbody: 1,
			thead: 1,
			tfoot: 1,
			tr: 1,
			ul: 1
		},
		textShadow: 'none',
		trim: 'advanced',
		ligatures: {
			'ff': '\ufb00',
			'fi': '\ufb01',
			'fl': '\ufb02',
			'ffi': '\ufb03',
			'ffl': '\ufb04',
			'\u017ft': '\ufb05',
			'st': '\ufb06'
		}
	};

	var separators = {
		// The first pattern may cause unicode characters above
		// code point 255 to be removed in Safari 3.0. Luckily enough
		// Safari 3.0 does not include non-breaking spaces in \s, so
		// we can just use a simple alternative pattern.
		words: /\s/.test('\u00a0') ? /[^\S\u00a0]+/ : /\s+/,
		characters: '',
		none: /^/
	};

	api.now = function() {
		DOM.ready();
		return api;
	};

	api.refresh = function() {
		replaceHistory.repeat.apply(replaceHistory, arguments);
		return api;
	};

	api.registerEngine = function(id, engine) {
		if (!engine) return api;
		engines[id] = engine;
		return api.set('engine', id);
	};

	api.registerFont = function(data) {
		if (!data) return api;
		var font = new Font(data), family = font.family;
		if (!fonts[family]) fonts[family] = new FontFamily();
		fonts[family].add(font);
		return api.set('fontFamily', '"' + family + '"');
	};

	api.replace = function(elements, options, ignoreHistory) {
		options = merge(defaultOptions, options);
		if (!options.engine) return api; // there's no browser support so we'll just stop here
		if (!initialized) {
			CSS.addClass(DOM.root(), 'cufon-active cufon-loading');
			CSS.ready(function() {
				// fires before any replace() calls, but it doesn't really matter
				CSS.addClass(CSS.removeClass(DOM.root(), 'cufon-loading'), 'cufon-ready');
			});
			initialized = true;
		}
		if (options.hover) options.forceHitArea = true;
		if (options.autoDetect) delete options.fontFamily;
		if (typeof options.ignoreClass == 'string') {
			options.ignoreClass = new RegExp('(?:^|\\s)(?:' + options.ignoreClass.replace(/\s+/g, '|') + ')(?:\\s|$)');
		}
		if (typeof options.textShadow == 'string') {
			options.textShadow = CSS.textShadow(options.textShadow);
		}
		if (typeof options.color == 'string' && /^-/.test(options.color)) {
			options.textGradient = CSS.gradient(options.color);
		}
		else delete options.textGradient;
		if (typeof elements == 'string') {
			if (!ignoreHistory) replaceHistory.add(elements, arguments);
			elements = [ elements ];
		}
		else if (elements.nodeType) elements = [ elements ];
		CSS.ready(function() {
			for (var i = 0, l = elements.length; i < l; ++i) {
				var el = elements[i];
				if (typeof el == 'string') api.replace(options.selector(el), options, true);
				else replaceElement(el, options);
			}
		});
		return api;
	};

	api.set = function(option, value) {
		defaultOptions[option] = value;
		return api;
	};

	return api;

})();

Cufon.registerEngine('vml', (function() {

	var ns = document.namespaces;
	if (!ns) return;
	ns.add('cvml', 'urn:schemas-microsoft-com:vml');
	ns = null;

	var check = document.createElement('cvml:shape');
	check.style.behavior = 'url(#default#VML)';
	if (!check.coordsize) return; // VML isn't supported
	check = null;

	var HAS_BROKEN_LINEHEIGHT = (document.documentMode || 0) < 8;
	
	var styleSheet = document.createElement('style');
	styleSheet.type = 'text/css';
	styleSheet.styleSheet.cssText = (
		'cufoncanvas{text-indent:0;}' +
		'@media screen{' +
			'cvml\\:shape,cvml\\:rect,cvml\\:fill,cvml\\:shadow{behavior:url(#default#VML);display:block;antialias:true;position:absolute;}' +
			'cufoncanvas{position:absolute;text-align:left;}' +
			'cufon{display:inline-block;position:relative;vertical-align:' +
			(HAS_BROKEN_LINEHEIGHT
				? 'middle'
				: 'text-bottom') +
			';}' +
			'cufon cufontext{position:absolute;left:-10000in;font-size:1px;text-align:left;}' +
			'cufonshy.cufon-shy-disabled,.cufon-viewport-resizing cufonshy{display:none;}' +
			'cufonglue{white-space:nowrap;display:inline-block;}' +
			'.cufon-viewport-resizing cufonglue{white-space:normal;}' +
			'a cufon{cursor:pointer}' + // ignore !important here
		'}' +
		'@media print{' +
			'cufon cufoncanvas{display:none;}' +
		'}'
	).replace(/;/g, '!important;');
	document.getElementsByTagName('head')[0].appendChild(styleSheet);

	function getFontSizeInPixels(el, value) {
		return getSizeInPixels(el, /(?:em|ex|%)$|^[a-z-]+$/i.test(value) ? '1em' : value);
	}

	// Original by Dead Edwards.
	// Combined with getFontSizeInPixels it also works with relative units.
	function getSizeInPixels(el, value) {
		if (!isNaN(value) || /px$/i.test(value)) return parseFloat(value);
		var style = el.style.left, runtimeStyle = el.runtimeStyle.left;
		el.runtimeStyle.left = el.currentStyle.left;
		el.style.left = value.replace('%', 'em');
		var result = el.style.pixelLeft;
		el.style.left = style;
		el.runtimeStyle.left = runtimeStyle;
		return result;
	}

	function getSpacingValue(el, style, size, property) {
		var key = 'computed' + property, value = style[key];
		if (isNaN(value)) {
			value = style.get(property);
			style[key] = value = (value == 'normal') ? 0 : ~~size.convertFrom(getSizeInPixels(el, value));
		}
		return value;
	}

	var fills = {};

	function gradientFill(gradient) {
		var id = gradient.id;
		if (!fills[id]) {
			var stops = gradient.stops, fill = document.createElement('cvml:fill'), colors = [];
			fill.type = 'gradient';
			fill.angle = 180;
			fill.focus = '0';
			fill.method = 'none';
			fill.color = stops[0][1];
			for (var j = 1, k = stops.length - 1; j < k; ++j) {
				colors.push(stops[j][0] * 100 + '% ' + stops[j][1]);
			}
			fill.colors = colors.join(',');
			fill.color2 = stops[k][1];
			fills[id] = fill;
		}
		return fills[id];
	}

	return function(font, text, style, options, node, el, hasNext) {

		var redraw = (text === null);

		if (redraw) text = node.alt;

		var viewBox = font.viewBox;

		var size = style.computedFontSize || (style.computedFontSize = new Cufon.CSS.Size(getFontSizeInPixels(el, style.get('fontSize')) + 'px', font.baseSize));

		var wrapper, canvas;

		if (redraw) {
			wrapper = node;
			canvas = node.firstChild;
		}
		else {
			wrapper = document.createElement('cufon');
			wrapper.className = 'cufon cufon-vml';
			wrapper.alt = text;

			canvas = document.createElement('cufoncanvas');
			wrapper.appendChild(canvas);

			if (options.printable) {
				var print = document.createElement('cufontext');
				print.appendChild(document.createTextNode(text));
				wrapper.appendChild(print);
			}

			// ie6, for some reason, has trouble rendering the last VML element in the document.
			// we can work around this by injecting a dummy element where needed.
			// @todo find a better solution
			if (!hasNext) wrapper.appendChild(document.createElement('cvml:shape'));
		}

		var wStyle = wrapper.style;
		var cStyle = canvas.style;

		var height = size.convert(viewBox.height), roundedHeight = Math.ceil(height);
		var roundingFactor = roundedHeight / height;
		var stretchFactor = roundingFactor * Cufon.CSS.fontStretch(style.get('fontStretch'));
		var minX = viewBox.minX, minY = viewBox.minY;

		cStyle.height = roundedHeight;
		cStyle.top = Math.round(size.convert(minY - font.ascent));
		cStyle.left = Math.round(size.convert(minX));

		wStyle.height = size.convert(font.height) + 'px';

		var color = style.get('color');
		var chars = Cufon.CSS.textTransform(options.ligatures ? font.applyLigatures(text, options.ligatures) : text, style).split('');

		var jumps = font.spacing(chars,
			getSpacingValue(el, style, size, 'letterSpacing'),
			getSpacingValue(el, style, size, 'wordSpacing')
		);

		if (!jumps.length) return null;

		var width = jumps.total;
		var fullWidth = -minX + width + (viewBox.width - jumps[jumps.length - 1]);

		var shapeWidth = size.convert(fullWidth * stretchFactor), roundedShapeWidth = Math.round(shapeWidth);

		var coordSize = fullWidth + ',' + viewBox.height, coordOrigin;
		var stretch = 'r' + coordSize + 'ns';

		var fill = options.textGradient && gradientFill(options.textGradient);

		var glyphs = font.glyphs, offsetX = 0;
		var shadows = options.textShadow;
		var i = -1, j = 0, chr;

		while (chr = chars[++i]) {

			var glyph = glyphs[chars[i]] || font.missingGlyph, shape;
			if (!glyph) continue;

			if (redraw) {
				// some glyphs may be missing so we can't use i
				shape = canvas.childNodes[j];
				while (shape.firstChild) shape.removeChild(shape.firstChild); // shadow, fill
			}
			else {
				shape = document.createElement('cvml:shape');
				canvas.appendChild(shape);
			}

			shape.stroked = 'f';
			shape.coordsize = coordSize;
			shape.coordorigin = coordOrigin = (minX - offsetX) + ',' + minY;
			shape.path = (glyph.d ? 'm' + glyph.d + 'xe' : '') + 'm' + coordOrigin + stretch;
			shape.fillcolor = color;

			if (fill) shape.appendChild(fill.cloneNode(false));

			// it's important to not set top/left or IE8 will grind to a halt
			var sStyle = shape.style;
			sStyle.width = roundedShapeWidth;
			sStyle.height = roundedHeight;

			if (shadows) {
				// due to the limitations of the VML shadow element there
				// can only be two visible shadows. opacity is shared
				// for all shadows.
				var shadow1 = shadows[0], shadow2 = shadows[1];
				var color1 = Cufon.CSS.color(shadow1.color), color2;
				var shadow = document.createElement('cvml:shadow');
				shadow.on = 't';
				shadow.color = color1.color;
				shadow.offset = shadow1.offX + ',' + shadow1.offY;
				if (shadow2) {
					color2 = Cufon.CSS.color(shadow2.color);
					shadow.type = 'double';
					shadow.color2 = color2.color;
					shadow.offset2 = shadow2.offX + ',' + shadow2.offY;
				}
				shadow.opacity = color1.opacity || (color2 && color2.opacity) || 1;
				shape.appendChild(shadow);
			}

			offsetX += jumps[j++];
		}

		// addresses flickering issues on :hover

		var cover = shape.nextSibling, coverFill, vStyle;

		if (options.forceHitArea) {

			if (!cover) {
				cover = document.createElement('cvml:rect');
				cover.stroked = 'f';
				cover.className = 'cufon-vml-cover';
				coverFill = document.createElement('cvml:fill');
				coverFill.opacity = 0;
				cover.appendChild(coverFill);
				canvas.appendChild(cover);
			}

			vStyle = cover.style;

			vStyle.width = roundedShapeWidth;
			vStyle.height = roundedHeight;

		}
		else if (cover) canvas.removeChild(cover);

		wStyle.width = Math.max(Math.ceil(size.convert(width * stretchFactor)), 0);

		if (HAS_BROKEN_LINEHEIGHT) {

			var yAdjust = style.computedYAdjust;

			if (yAdjust === undefined) {
				var lineHeight = style.get('lineHeight');
				if (lineHeight == 'normal') lineHeight = '1em';
				else if (!isNaN(lineHeight)) lineHeight += 'em'; // no unit
				style.computedYAdjust = yAdjust = 0.5 * (getSizeInPixels(el, lineHeight) - parseFloat(wStyle.height));
			}

			if (yAdjust) {
				wStyle.marginTop = Math.ceil(yAdjust) + 'px';
				wStyle.marginBottom = yAdjust + 'px';
			}

		}

		return wrapper;

	};

})());

Cufon.registerEngine('canvas', (function() {

	// Safari 2 doesn't support .apply() on native methods

	var check = document.createElement('canvas');
	if (!check || !check.getContext || !check.getContext.apply) return;
	check = null;

	var HAS_INLINE_BLOCK = Cufon.CSS.supports('display', 'inline-block');

	// Firefox 2 w/ non-strict doctype (almost standards mode)
	var HAS_BROKEN_LINEHEIGHT = !HAS_INLINE_BLOCK && (document.compatMode == 'BackCompat' || /frameset|transitional/i.test(document.doctype.publicId));

	var styleSheet = document.createElement('style');
	styleSheet.type = 'text/css';
	styleSheet.appendChild(document.createTextNode((
		'cufon{text-indent:0;}' +
		'@media screen,projection{' +
			'cufon{display:inline;display:inline-block;position:relative;vertical-align:middle;' +
			(HAS_BROKEN_LINEHEIGHT
				? ''
				: 'font-size:1px;line-height:1px;') +
			'}cufon cufontext{display:-moz-inline-box;display:inline-block;width:0;height:0;text-align:left;text-indent:-10000in;}' +
			(HAS_INLINE_BLOCK
				? 'cufon canvas{position:relative;}'
				: 'cufon canvas{position:absolute;}') +
			'cufonshy.cufon-shy-disabled,.cufon-viewport-resizing cufonshy{display:none;}' +
			'cufonglue{white-space:nowrap;display:inline-block;}' +
			'.cufon-viewport-resizing cufonglue{white-space:normal;}' +
		'}' +
		'@media print{' +
			'cufon{padding:0;}' + // Firefox 2
			'cufon canvas{display:none;}' +
		'}'
	).replace(/;/g, '!important;')));
	document.getElementsByTagName('head')[0].appendChild(styleSheet);

	function generateFromVML(path, context) {
		var atX = 0, atY = 0;
		var code = [], re = /([mrvxe])([^a-z]*)/g, match;
		generate: for (var i = 0; match = re.exec(path); ++i) {
			var c = match[2].split(',');
			switch (match[1]) {
				case 'v':
					code[i] = { m: 'bezierCurveTo', a: [ atX + ~~c[0], atY + ~~c[1], atX + ~~c[2], atY + ~~c[3], atX += ~~c[4], atY += ~~c[5] ] };
					break;
				case 'r':
					code[i] = { m: 'lineTo', a: [ atX += ~~c[0], atY += ~~c[1] ] };
					break;
				case 'm':
					code[i] = { m: 'moveTo', a: [ atX = ~~c[0], atY = ~~c[1] ] };
					break;
				case 'x':
					code[i] = { m: 'closePath' };
					break;
				case 'e':
					break generate;
			}
			context[code[i].m].apply(context, code[i].a);
		}
		return code;
	}

	function interpret(code, context) {
		for (var i = 0, l = code.length; i < l; ++i) {
			var line = code[i];
			context[line.m].apply(context, line.a);
		}
	}

	return function(font, text, style, options, node, el) {

		var redraw = (text === null);

		if (redraw) text = node.getAttribute('alt');

		var viewBox = font.viewBox;

		var size = style.getSize('fontSize', font.baseSize);

		var expandTop = 0, expandRight = 0, expandBottom = 0, expandLeft = 0;
		var shadows = options.textShadow, shadowOffsets = [];
		if (shadows) {
			for (var i = shadows.length; i--;) {
				var shadow = shadows[i];
				var x = size.convertFrom(parseFloat(shadow.offX));
				var y = size.convertFrom(parseFloat(shadow.offY));
				shadowOffsets[i] = [ x, y ];
				if (y < expandTop) expandTop = y;
				if (x > expandRight) expandRight = x;
				if (y > expandBottom) expandBottom = y;
				if (x < expandLeft) expandLeft = x;
			}
		}

		var chars = Cufon.CSS.textTransform(options.ligatures ? font.applyLigatures(text, options.ligatures) : text, style).split('');

		var jumps = font.spacing(chars,
			~~size.convertFrom(parseFloat(style.get('letterSpacing')) || 0),
			~~size.convertFrom(parseFloat(style.get('wordSpacing')) || 0)
		);

		if (!jumps.length) return null; // there's nothing to render

		var width = jumps.total;

		expandRight += viewBox.width - jumps[jumps.length - 1];
		expandLeft += viewBox.minX;

		var wrapper, canvas;

		if (redraw) {
			wrapper = node;
			canvas = node.firstChild;
		}
		else {
			wrapper = document.createElement('cufon');
			wrapper.className = 'cufon cufon-canvas';
			wrapper.setAttribute('alt', text);

			canvas = document.createElement('canvas');
			wrapper.appendChild(canvas);

			if (options.printable) {
				var print = document.createElement('cufontext');
				print.appendChild(document.createTextNode(text));
				wrapper.appendChild(print);
			}
		}

		var wStyle = wrapper.style;
		var cStyle = canvas.style;

		var height = size.convert(viewBox.height);
		var roundedHeight = Math.ceil(height);
		var roundingFactor = roundedHeight / height;
		var stretchFactor = roundingFactor * Cufon.CSS.fontStretch(style.get('fontStretch'));
		var stretchedWidth = width * stretchFactor;

		var canvasWidth = Math.ceil(size.convert(stretchedWidth + expandRight - expandLeft));
		var canvasHeight = Math.ceil(size.convert(viewBox.height - expandTop + expandBottom));

		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		// needed for WebKit and full page zoom
		cStyle.width = canvasWidth + 'px';
		cStyle.height = canvasHeight + 'px';

		// minY has no part in canvas.height
		expandTop += viewBox.minY;

		cStyle.top = Math.round(size.convert(expandTop - font.ascent)) + 'px';
		cStyle.left = Math.round(size.convert(expandLeft)) + 'px';

		var wrapperWidth = Math.max(Math.ceil(size.convert(stretchedWidth)), 0) + 'px';

		if (HAS_INLINE_BLOCK) {
			wStyle.width = wrapperWidth;
			wStyle.height = size.convert(font.height) + 'px';
		}
		else {
			wStyle.paddingLeft = wrapperWidth;
			wStyle.paddingBottom = (size.convert(font.height) - 1) + 'px';
		}

		var g = canvas.getContext('2d'), scale = height / viewBox.height;
		var pixelRatio = window.devicePixelRatio || 1;
		if (pixelRatio != 1) {
			canvas.width = canvasWidth * pixelRatio;
			canvas.height = canvasHeight * pixelRatio;
			g.scale(pixelRatio, pixelRatio);
		}

		// proper horizontal scaling is performed later
		g.scale(scale, scale * roundingFactor);
		g.translate(-expandLeft, -expandTop);
		g.save();

		function renderText() {
			var glyphs = font.glyphs, glyph, i = -1, j = -1, chr;
			g.scale(stretchFactor, 1);
			while (chr = chars[++i]) {
				var glyph = glyphs[chars[i]] || font.missingGlyph;
				if (!glyph) continue;
				if (glyph.d) {
					g.beginPath();
					// the following moveTo is for Opera 9.2. if we don't
					// do this, it won't forget the previous path which
					// results in garbled text.
					g.moveTo(0, 0);
					if (glyph.code) interpret(glyph.code, g);
					else glyph.code = generateFromVML('m' + glyph.d, g);
					g.fill();
				}
				g.translate(jumps[++j], 0);
			}
			g.restore();
		}

		if (shadows) {
			for (var i = shadows.length; i--;) {
				var shadow = shadows[i];
				g.save();
				g.fillStyle = shadow.color;
				g.translate.apply(g, shadowOffsets[i]);
				renderText();
			}
		}

		var gradient = options.textGradient;
		if (gradient) {
			var stops = gradient.stops, fill = g.createLinearGradient(0, viewBox.minY, 0, viewBox.maxY);
			for (var i = 0, l = stops.length; i < l; ++i) {
				fill.addColorStop.apply(fill, stops[i]);
			}
			g.fillStyle = fill;
		}
		else g.fillStyle = style.get('color');

		renderText();

		return wrapper;

	};

})());

/*!
 * The following copyright notice may not be removed under any circumstances.
 * 
 * Copyright:
 * � 1989, 1992, 1994, 1996, 1998, 1999, 2000, 2001 Adobe Systems Incorporated.
 * All rights reserved. Protected by U.S. Patents D318,290.
 * 
 * Trademark:
 * Adobe Garamond is either a registered trademark or a trademark of Adobe Systems
 * Incorporated in the United States and/or other countries.
 * 
 * Full name:
 * AGaramondPro-Regular
 * 
 * Designer:
 * Robert Slimbach
 * 
 * Vendor URL:
 * http://www.adobe.com/type
 * 
 * License information:
 * http://www.adobe.com/type/legal.html
 */
Cufon.registerFont({"w":180,"face":{"font-family":"Adobe Garamond Pro","font-weight":400,"font-stretch":"normal","units-per-em":"360","panose-1":"2 2 5 2 6 5 6 2 4 3","ascent":"261","descent":"-99","x-height":"5","cap-height":"1","bbox":"-14 -270 357.925 97","underline-thickness":"18","underline-position":"-18","stemh":"14","stemv":"27","unicode-range":"U+0020-U+007E"},"glyphs":{" ":{"w":90,"k":{"W":5,"V":5,"T":16,"Y":5}},"!":{"d":"40,5v-10,0,-21,-8,-21,-20v0,-12,9,-21,21,-21v12,0,20,9,20,21v0,12,-8,20,-20,20xm40,-233v26,2,18,12,15,43r-11,116v-2,2,-7,2,-9,0r-13,-148v0,-9,6,-11,18,-11","w":79},"\"":{"d":"44,-252v17,0,16,6,14,23r-10,58v-3,3,-5,3,-8,0r-12,-72v0,-8,6,-9,16,-9xm102,-252v18,0,16,7,13,23r-9,58v-3,3,-6,3,-9,0r-11,-72v0,-8,6,-9,16,-9","w":145},"#":{"d":"120,-145r-42,0r-16,58r43,0xm172,-145r-37,0r-15,58r35,0r-5,18r-36,0r-18,68r-14,0r18,-68r-43,0r-18,68r-14,0r18,-68r-40,0r6,-18r39,0r15,-58r-40,0r6,-18r39,0r16,-62r16,0r-17,62r42,0r16,-62r16,0r-17,62r37,0"},"$":{"d":"90,-138r10,-82v-66,5,-47,66,-10,82xm98,-103r-11,92v24,0,47,-10,47,-39v0,-16,-4,-36,-36,-53xm117,-258r-4,28v11,0,23,2,36,5v3,8,8,28,8,41v-1,3,-6,3,-8,1v-4,-11,-12,-30,-37,-36r-10,87v28,14,58,33,58,70v0,36,-29,62,-75,62r-4,34v-3,2,-9,2,-12,0r5,-35v-50,-4,-51,-11,-54,-58v1,-2,5,-4,8,-1v5,15,17,42,47,48r12,-96v-26,-11,-54,-31,-54,-65v0,-32,25,-56,69,-57v2,-11,-2,-37,15,-28"},"%":{"d":"288,-65v0,28,-16,70,-55,70v-39,0,-56,-42,-56,-70v0,-29,17,-70,56,-70v39,0,55,41,55,70xm262,-65v0,-19,-3,-60,-29,-60v-26,0,-30,41,-30,60v0,19,4,60,30,60v26,0,29,-41,29,-60xm126,-161v0,28,-16,70,-55,70v-39,0,-55,-42,-55,-70v0,-29,16,-69,55,-69v39,0,55,40,55,69xm100,-161v0,-19,-2,-59,-28,-59v-26,0,-30,40,-30,59v0,19,4,60,30,60v26,0,28,-41,28,-60xm229,-229r-147,243v-6,0,-10,-3,-10,-8r145,-241v4,0,9,2,12,6","w":303},"&":{"d":"183,-74v10,-14,38,-59,45,-83v1,-9,-33,0,-21,-15r80,-2v8,11,-8,10,-15,12v-20,3,-30,21,-41,39v-12,19,-27,39,-42,60v22,39,59,70,96,37v3,0,5,4,4,7v-14,18,-35,24,-57,24v-38,0,-47,-22,-60,-44v-21,23,-47,44,-79,44v-51,0,-70,-37,-70,-65v0,-37,26,-59,58,-78v-13,-9,-28,-23,-28,-44v0,-57,98,-65,97,-6v0,24,-18,34,-36,44v20,12,45,35,69,70xm90,-131v-18,9,-40,31,-40,60v-1,66,87,68,115,22v-17,-30,-46,-63,-75,-82xm102,-220v-38,7,-31,56,4,69v24,-11,32,-66,-4,-69","w":294},"(":{"d":"108,-248v-73,65,-73,236,0,301v0,4,-1,6,-5,6v-96,-54,-97,-258,0,-312v4,0,5,1,5,5","w":115,"k":{"W":-4,"V":-4,"J":-12,"T":-4,"Y":-4}},")":{"d":"7,53v74,-65,74,-236,0,-301v0,-4,1,-5,5,-5v96,54,97,258,0,312v-4,0,-5,-2,-5,-6","w":115},"*":{"d":"76,-243r3,46r45,-22v3,0,6,4,5,7r-42,29r41,29v1,3,0,7,-4,7r-45,-23r-3,47v-2,2,-7,2,-9,0r-4,-47r-45,23v-3,0,-5,-4,-4,-7r41,-29r-41,-29v-1,-3,1,-7,4,-7r45,22r4,-46v2,-2,6,-2,9,0","w":141},"+":{"d":"101,0r-21,0r0,-65r-59,0r0,-18r59,0r0,-59r21,0r0,59r58,0r0,18r-58,0r0,65"},",":{"d":"50,4v-3,-23,-27,-15,-27,-32v0,-8,6,-16,18,-16v49,11,24,84,-19,88v-10,-17,32,-14,28,-40","w":90},"-":{"d":"14,-81r84,-8v7,4,8,15,3,21r-84,8v-6,-5,-7,-15,-3,-21","w":115,"k":{"W":25}},".":{"d":"45,5v-10,0,-20,-8,-20,-20v0,-12,8,-21,20,-21v12,0,20,9,20,21v0,12,-8,20,-20,20","w":90},"\/":{"d":"107,-247r-75,253r-21,0r75,-253r21,0","w":117},"0":{"d":"90,-230v102,0,101,235,0,235v-53,0,-75,-61,-75,-118v0,-54,22,-117,75,-117xm90,-220v-40,0,-42,73,-42,107v0,34,2,107,42,107v40,0,42,-73,42,-107v0,-34,-2,-107,-42,-107"},"1":{"d":"79,-44r0,-122v3,-34,-9,-34,-34,-36v-3,-1,-4,-7,-1,-8v33,-4,50,-18,63,-19r-1,185v-2,37,5,35,30,36v2,2,3,8,0,9v-30,-2,-56,-1,-86,0v-3,-1,-3,-7,-1,-9v24,-1,30,1,30,-36"},"2":{"d":"9,-4v34,-29,111,-88,111,-154v0,-33,-16,-53,-45,-53v-22,0,-37,15,-47,36v-3,2,-9,0,-9,-5v17,-64,133,-70,132,8v11,37,-83,126,-93,146v24,9,98,9,101,-19v3,-1,7,0,8,2v-5,18,-12,37,-17,44r-138,0v-1,0,-3,-2,-3,-5"},"3":{"d":"161,-82v0,52,-70,102,-111,102v-16,0,-35,-5,-35,-22v0,-7,5,-14,14,-14v18,1,16,24,36,24v23,0,65,-31,65,-71v0,-32,-16,-59,-47,-59v-18,0,-31,9,-39,18v-6,-1,-10,-6,-8,-13v26,-14,77,-23,77,-66v0,-48,-65,-30,-78,1v-4,1,-8,-1,-8,-5v13,-48,113,-64,116,-2v0,15,-6,29,-39,46v-2,4,0,5,4,5v27,2,53,22,53,56"},"4":{"d":"109,-159v0,-10,13,-12,21,-13v5,0,5,4,5,11r0,70v-3,20,43,-6,31,23v-11,2,-32,-6,-31,8v1,29,-5,58,25,52v2,2,2,8,-1,9v-30,-2,-51,-1,-82,0v-3,-1,-3,-7,-1,-9v32,4,35,-11,33,-51v0,-9,-2,-9,-11,-9r-86,0v-9,-3,-5,-12,2,-20r115,-161v3,-6,17,-8,20,-2r-116,162v-4,6,1,6,10,6r56,0v9,0,10,-2,10,-10r0,-66"},"5":{"d":"28,-149r19,-64v2,-6,4,-9,10,-10r86,-12v10,5,-6,20,-9,25r-68,10v-16,0,-14,19,-19,31v-3,7,5,7,12,7v45,0,96,24,96,79v0,62,-72,105,-129,107v-4,-1,-4,-8,-1,-11v56,-3,103,-37,103,-86v0,-51,-55,-64,-97,-65v-5,0,-6,-3,-3,-11"},"6":{"d":"14,-85v0,-31,11,-76,49,-113v37,-37,81,-48,103,-51v3,1,3,6,1,8v-23,8,-54,18,-80,46v-31,32,-41,72,-41,109v0,42,14,80,50,80v27,0,41,-24,41,-55v0,-37,-22,-70,-61,-57v-3,-13,22,-17,35,-17v35,0,57,28,57,65v0,42,-31,75,-76,75v-53,0,-78,-41,-78,-90"},"7":{"d":"129,-203v-42,0,-94,-14,-111,18v-3,1,-7,0,-8,-3v4,-10,10,-24,13,-38v33,2,114,2,147,0v1,0,2,2,2,3v-42,72,-85,168,-125,246v-6,1,-11,-2,-12,-7r101,-206v5,-11,5,-13,-7,-13"},"8":{"d":"95,-230v32,0,59,17,59,52v0,30,-24,43,-42,55v25,14,47,33,47,67v0,38,-30,61,-72,61v-32,0,-66,-16,-66,-60v0,-27,24,-46,48,-61v-21,-12,-41,-28,-41,-56v0,-37,30,-58,67,-58xm91,-6v26,0,42,-17,42,-43v0,-28,-27,-48,-53,-60v-24,16,-33,36,-33,51v0,30,17,52,44,52xm92,-220v-25,0,-38,19,-38,40v0,25,25,40,48,51v37,-18,39,-91,-10,-91"},"9":{"d":"86,-220v-23,0,-40,18,-40,50v0,34,20,71,57,59v2,10,-17,14,-31,15v-29,0,-55,-24,-55,-61v0,-43,33,-73,74,-73v45,0,71,38,71,91v0,39,-16,86,-53,119v-27,24,-61,38,-85,42v-3,-1,-4,-7,-2,-9v70,-23,105,-57,108,-154v0,-33,-9,-79,-44,-79"},":":{"d":"45,-101v-10,0,-20,-8,-20,-20v0,-12,8,-21,20,-21v12,0,20,9,20,21v0,12,-8,20,-20,20xm45,5v-10,0,-20,-8,-20,-20v0,-12,8,-21,20,-21v12,0,20,9,20,21v0,12,-8,20,-20,20","w":90},";":{"d":"50,4v-3,-23,-27,-15,-27,-32v0,-8,6,-16,18,-16v49,11,24,84,-19,88v-10,-17,32,-14,28,-40xm45,-101v-10,0,-20,-8,-20,-20v0,-12,8,-21,20,-21v12,0,20,9,20,21v0,12,-8,20,-20,20","w":90},"<":{"d":"20,-82r140,-67r0,21r-114,54r114,54r0,20r-140,-66r0,-16"},"=":{"d":"159,-110r0,18r-138,0r0,-18r138,0xm159,-56r0,18r-138,0r0,-18r138,0"},">":{"d":"20,-149r140,67r0,16r-140,66r0,-20r114,-55r-114,-53r0,-21"},"?":{"d":"65,-144v41,-21,13,-67,-30,-60v-3,0,-12,-6,-12,-15v0,-7,5,-14,14,-14v40,0,83,75,49,106v-20,11,-52,18,-38,52v-1,3,-5,4,-7,2v-13,-18,-21,-55,6,-62xm45,5v-10,0,-20,-8,-20,-20v0,-12,8,-21,20,-21v12,0,21,9,21,21v0,12,-9,20,-21,20","w":115},"@":{"d":"163,-117v-33,3,-60,58,-61,83v7,12,12,2,33,-14v19,-14,39,-48,43,-59v-2,-5,-7,-10,-15,-10xm74,-29v2,-27,54,-106,99,-101v5,0,11,3,13,8r9,-18v6,-2,15,0,18,4v-5,11,-36,85,-42,100v-3,8,-1,12,8,12v38,-1,70,-29,70,-74v0,-51,-41,-83,-94,-83v-71,0,-114,60,-114,126v0,42,25,99,107,99v26,0,44,-8,56,-13v3,1,4,4,3,7v-81,44,-191,9,-191,-93v0,-85,68,-138,142,-138v134,0,143,179,13,180v-50,1,-16,-20,-14,-42v-22,22,-53,42,-68,42v-10,0,-15,-8,-15,-16","w":275},"A":{"d":"167,-15v-4,-21,-13,-49,-20,-69v-6,-19,-48,-5,-70,-9v-22,2,-16,33,-26,47v-5,16,-8,26,-8,30v-4,11,35,3,22,17v-16,-2,-53,-1,-72,0v-7,-18,31,-3,33,-28r68,-177v5,-13,7,-20,6,-26v12,-1,16,-18,24,-10r65,193v13,36,15,37,41,39v3,2,2,8,0,9v-25,-2,-63,-1,-85,0v-3,-1,-4,-7,-1,-9v8,-1,24,-1,23,-7xm107,-199v-10,21,-23,58,-32,83v-3,8,-2,9,8,9r44,0v10,0,11,-1,8,-11","w":224,"k":{"c":4,"C":4,"d":4,"e":2,"G":4,"o":2,"O":4,"t":2,"T":25,"u":6,"U":7,"Y":22,"z":-2,"Q":4,"V":29,"W":36,"b":4,"p":4,"q":2,"v":15,"w":15}},"B":{"d":"17,-236v58,-3,168,-19,166,52v0,26,-15,40,-37,50v0,4,3,4,7,5v19,4,48,21,48,60v0,56,-63,69,-139,69v-16,0,-28,1,-41,1v-4,-3,-2,-12,5,-10v19,-3,20,-7,20,-45r0,-137v1,-34,-6,-35,-29,-36v-3,-2,-3,-8,0,-9xm76,-113v1,47,-12,103,36,103v32,0,56,-14,56,-50v0,-28,-15,-62,-72,-62v-19,0,-20,2,-20,9xm97,-228v-13,0,-20,0,-21,12r0,73v0,10,0,11,18,10v37,-1,57,-12,57,-46v0,-35,-27,-49,-54,-49","w":217,"k":{"h":4,"b":2,"W":12,"V":7,"e":2,"T":4,"u":4,"U":4,"r":4,"y":6,"a":4,"i":4,"k":4,"l":4}},"C":{"d":"226,-6v-92,32,-210,-5,-210,-111v0,-105,113,-148,216,-116v0,8,2,31,5,53v-2,3,-6,2,-9,0v-5,-24,-22,-52,-74,-52v-55,0,-102,34,-102,109v0,76,48,118,107,118v46,0,67,-31,75,-52v3,-2,8,-1,9,2v-3,19,-12,42,-17,49","w":250,"k":{"u":6,"z":6,"r":2,"y":9}},"D":{"d":"264,-122v0,72,-61,129,-143,125v-44,-1,-64,-5,-104,-2v-5,-4,0,-12,7,-10v21,-3,22,-7,22,-45r0,-137v1,-30,-4,-35,-25,-36v-3,-2,-3,-9,1,-9v31,-3,59,-3,90,-3v88,0,152,43,152,117xm115,-228v-38,0,-40,-5,-39,33r0,133v-1,42,10,54,51,54v70,0,101,-46,101,-113v0,-40,-19,-107,-113,-107","w":280,"k":{"e":2,"o":4,"u":4,"Y":4,"V":7,"W":7,"r":4,"a":2,"i":4,"h":6}},"E":{"d":"76,-57v3,44,-5,46,50,46v57,0,48,-4,72,-40v3,-2,8,-1,9,2v-3,13,-12,40,-17,50r-177,0v-7,-8,3,-10,11,-10v21,-2,22,-7,22,-45r0,-130v1,-41,-3,-43,-28,-46v-2,-1,-1,-8,1,-9r159,0v2,6,5,32,6,48v-1,2,-7,3,-9,1v-3,-38,-42,-38,-89,-36v-11,0,-10,0,-10,14r0,72v-4,18,20,7,32,10v33,0,39,1,42,-29v2,-2,9,-3,10,0v-2,17,-2,54,0,71v-17,8,-7,-28,-24,-28r-49,-1v-11,0,-11,0,-11,9r0,51","w":210,"k":{"c":2,"d":2,"e":2,"o":2,"t":6,"u":6,"Y":4,"z":2,"V":4,"W":4,"b":4,"p":6,"q":2,"v":11,"w":11,"r":2,"y":15,"i":2,"h":4,"g":2,"k":4,"l":4,"n":2,"f":4,"j":4,"m":2,"x":2}},"F":{"d":"76,-212r0,76v-3,18,23,7,36,10v33,0,39,0,43,-30v2,-2,8,-2,9,0v-1,18,-1,54,0,72v-16,6,-8,-25,-24,-28v-9,-2,-38,-2,-53,-2v-11,0,-11,1,-11,10v3,33,-12,102,22,95v8,-1,18,2,11,10r-93,0v-5,-5,0,-12,8,-10v21,-3,22,-7,22,-45r0,-130v1,-42,-3,-42,-27,-46v-2,-1,-2,-8,0,-9r157,0v0,17,0,34,1,48v-1,2,-6,3,-9,1v0,-36,-38,-38,-82,-36v-11,0,-10,0,-10,14","w":193,"k":{".":50,",":50,"e":13,"o":13,"u":9,"r":13,"y":6,"a":17,"i":12,"l":6,"A":13}},"G":{"d":"161,-5v40,0,43,-7,43,-46v0,-38,-13,-32,-39,-37v-3,-1,-3,-8,0,-9v19,1,65,2,89,0v6,3,2,11,-5,10v-28,1,-16,66,-7,80v-24,3,-58,13,-83,13v-74,0,-144,-47,-142,-122v2,-77,56,-128,146,-127v35,0,46,7,68,8v0,12,3,30,6,52v-1,3,-8,4,-10,2v-10,-39,-37,-52,-74,-52v-70,0,-100,50,-100,104v0,69,36,124,108,124","w":268,"k":{"e":2,"o":2,"u":4,"r":9,"y":4,"a":2,"i":4,"h":4,"l":2,"n":6}},"H":{"d":"197,-116r-103,0v-36,-4,-11,40,-18,62v-1,44,5,44,32,46v2,1,1,8,-1,9v-34,-2,-56,-1,-87,0v-4,-3,-2,-12,5,-10v20,-4,21,-7,21,-45r0,-130v1,-45,-4,-44,-31,-46v-2,-1,-1,-8,1,-9r87,0v4,5,1,12,-6,10v-32,-7,-21,56,-21,87v0,11,1,11,18,11r103,0v34,5,12,-32,18,-53v1,-43,-3,-43,-29,-46v-2,-1,-2,-8,0,-9r87,0v4,5,-1,12,-7,10v-21,2,-22,7,-22,45r0,130v-1,43,3,43,30,46v2,1,2,8,0,9r-88,0v-4,-4,1,-11,7,-10v36,5,22,-62,22,-96v0,-11,-1,-11,-18,-11","w":290,"k":{"e":6,"o":6,"u":11,"y":9,"a":2,"i":6}},"I":{"d":"46,-55r0,-128v1,-44,-4,-45,-31,-47v-2,-1,-1,-8,1,-9r90,0v5,6,0,12,-8,10v-21,2,-22,8,-22,46r0,128v-1,43,4,44,31,47v2,1,1,8,-1,9r-90,0v-5,-5,0,-12,8,-10v21,-3,22,-8,22,-46","w":121,"k":{"c":6,"d":6,"e":6,"o":6,"t":9,"u":12,"z":2,"b":2,"p":12,"v":9,"w":9,"r":6,"y":4,"a":6,"i":4,"h":2,"g":2,"k":2,"l":2,"n":4,"f":2,"j":6,"m":4,"s":6}},"J":{"d":"28,53v31,-3,23,-75,23,-100r0,-136v1,-46,-5,-44,-33,-47v-2,-1,-2,-8,0,-9r90,0v4,4,1,11,-5,10v-21,3,-22,8,-22,46r0,134v4,71,-22,118,-79,121v-4,0,-16,0,-16,-7v0,-21,25,-16,42,-12","w":124,"k":{"e":11,"o":11,"u":13,"y":4,"a":11,"i":9}},"K":{"d":"46,-54r0,-130v1,-44,-4,-43,-31,-46v-2,-1,-1,-8,1,-9r87,0v4,5,1,12,-6,10v-32,-7,-18,56,-21,87v-2,14,6,15,14,10r58,-56v9,-9,27,-25,30,-36v-1,-5,-27,-5,-15,-15v24,1,52,2,75,0v3,2,3,7,1,9v-49,5,-80,52,-116,83v-11,9,-13,11,-2,22r90,101v11,12,21,15,39,16v3,2,2,8,-1,9v-22,-2,-58,-1,-84,0v-3,-1,-4,-7,-2,-9v12,0,24,-4,12,-13r-58,-66v-21,-23,-26,-31,-35,-31v-12,6,-5,46,-6,64v-2,44,3,44,30,46v2,1,1,8,-1,9r-85,0v-4,-3,-1,-12,6,-10v19,-3,20,-7,20,-45","w":243,"k":{"C":13,"e":2,"G":13,"o":6,"O":13,"u":9,"Q":13,"v":11,"w":17,"y":9}},"L":{"d":"76,-58v4,45,-4,47,46,47v60,0,46,-4,68,-40v2,-2,9,-1,9,2v0,4,-10,40,-15,50r-170,0v-2,-1,-2,-7,0,-9v28,-2,32,-2,32,-46r0,-130v2,-44,-4,-43,-32,-46v-2,-1,-2,-8,0,-9r91,0v5,5,0,11,-7,10v-21,2,-22,7,-22,45r0,126","w":199,"k":{"C":4,"G":4,"O":4,"T":36,"u":2,"U":6,"Y":25,"Q":4,"V":32,"W":40,"w":13,"y":17,"j":4,"A":-4}},"M":{"d":"65,-191v-5,47,-4,100,-7,149v-2,35,7,32,30,34v3,2,2,8,-1,9v-24,-1,-52,-2,-76,0v-5,-5,0,-11,7,-10v15,-2,20,-5,22,-30r10,-159v3,-26,-6,-29,-29,-32v-2,-2,-2,-8,1,-9v23,2,34,1,58,0v12,65,58,137,86,192v25,-57,74,-135,89,-192v25,2,35,1,59,0v5,6,-2,12,-8,10v-23,2,-25,9,-25,34v1,38,4,105,4,157v0,24,7,30,29,30v2,2,3,8,0,9r-86,0v-3,-2,-3,-7,-1,-9v22,-1,28,-4,28,-32r-2,-150r-94,192v-2,2,-5,3,-7,0","w":328,"k":{"j":6,"c":9,"d":9,"e":9,"o":9,"u":13,"y":11,"a":4,"i":4,"n":2}},"N":{"d":"245,-221v-11,64,-3,148,-4,223v-1,2,-3,4,-7,4r-172,-198v-3,51,-7,129,5,176v2,6,19,7,29,8v2,3,2,7,-1,9v-29,-1,-53,-2,-79,0v-3,-2,-3,-7,-1,-9v43,8,27,-52,30,-82v-4,-44,10,-99,-8,-130v-6,-6,-17,-9,-28,-10v-2,-2,-2,-8,1,-9v25,1,39,2,57,0v40,63,110,135,157,184v1,-51,6,-122,-6,-167v2,-6,-40,-3,-28,-17r80,0v4,4,1,11,-5,10v-12,2,-19,5,-20,8","w":281,"k":{"e":11,"o":11,"u":11,"y":11,"a":11,"i":9}},"O":{"d":"145,6v-80,0,-128,-57,-128,-122v0,-72,54,-127,128,-127v83,0,125,60,125,123v0,73,-56,126,-125,126xm149,-5v43,0,85,-33,85,-104v0,-59,-26,-123,-95,-123v-37,0,-86,25,-86,104v0,53,25,123,96,123","w":286,"k":{"c":2,"d":2,"e":2,"o":2,"t":2,"T":11,"u":2,"Y":11,"z":2,"V":9,"W":19,"b":2,"p":2,"q":2,"r":2,"a":2,"i":2,"h":4,"g":2,"k":4,"l":4,"n":2,"f":2,"j":4,"m":2,"s":2,"A":11,"X":11}},"P":{"d":"17,-236v69,-7,173,-10,169,66v-3,53,-43,65,-86,68v-3,-1,-2,-6,0,-7v76,-7,68,-122,-5,-119v-19,0,-19,1,-19,13r0,161v-2,44,4,43,33,46v2,2,1,8,-1,9r-90,0v-4,-4,-1,-12,6,-10v21,-3,22,-7,22,-45r0,-133v2,-40,-6,-36,-30,-40v-3,-2,-2,-8,1,-9","w":197,"k":{"h":2,"H":4,".":65,",":65,"e":19,"o":19,"t":6,"u":11,"r":11,"y":2,"a":15,"i":4,"l":2,"n":13,"s":13,"A":14,"E":4,"I":4}},"Q":{"d":"145,-243v156,0,159,214,38,243v22,32,76,76,133,64v2,0,3,3,2,5v-60,34,-142,-24,-165,-51v-19,-20,-32,-11,-59,-22v-47,-19,-77,-61,-77,-112v0,-72,54,-127,128,-127xm149,-5v43,0,85,-33,85,-104v0,-59,-26,-123,-95,-123v-37,0,-86,25,-86,104v0,53,25,123,96,123","w":286,"k":{"X":4,"W":11,"V":6,"T":9,"u":2,"U":4,"Y":4,"a":2,"A":9}},"R":{"d":"19,-236v62,-4,170,-17,170,59v0,34,-27,53,-45,60v-2,2,0,5,2,8v29,46,49,75,73,96v4,8,26,6,25,15v-64,18,-97,-53,-126,-98v0,-12,-43,-18,-42,-3v4,36,-15,100,29,91v2,2,1,8,-1,9r-88,0v-2,-1,-3,-6,-1,-9v27,-3,31,-3,31,-46r0,-129v1,-42,-3,-40,-27,-44v-3,-2,-3,-8,0,-9xm102,-118v34,2,55,-14,55,-54v0,-28,-18,-56,-58,-56v-22,0,-23,2,-23,12r0,84v0,20,-1,13,26,14","w":232,"k":{"C":13,"e":4,"G":13,"o":4,"O":13,"T":16,"u":4,"U":9,"Y":16,"Q":13,"V":25,"W":27,"y":11}},"S":{"d":"28,-181v-4,-51,67,-74,119,-56v3,9,7,29,7,44v-1,2,-7,3,-9,1v-5,-17,-14,-40,-49,-40v-65,0,-45,70,-12,84v31,21,72,38,73,87v0,40,-29,67,-76,67v-30,0,-50,-10,-57,-14v-4,-8,-8,-33,-9,-50v2,-3,7,-3,8,-1v5,18,20,54,62,54v55,0,61,-61,16,-92v-30,-21,-69,-36,-73,-84","w":176,"k":{"e":4,"o":4,"t":9,"u":9,"p":9,"q":4,"v":11,"w":11,"r":4,"y":4,"a":4,"i":4,"h":4,"k":4,"l":4,"n":9,"j":6,"m":9}},"T":{"d":"132,-214r0,160v-1,45,5,44,34,46v2,1,1,8,-1,9r-97,0v-7,-10,6,-9,13,-10v21,-2,22,-7,22,-45r0,-161v4,-19,-18,-9,-31,-11v-30,-4,-55,11,-60,33v-3,2,-8,1,-9,-2v6,-16,10,-40,13,-54v1,-1,6,-1,7,0v2,12,14,11,31,11r145,0v24,3,23,-10,35,-9v-4,15,-6,44,-5,55v-1,3,-8,3,-10,1v1,-38,-36,-35,-76,-35v-11,0,-11,0,-11,12","w":237,"k":{"C":9,"e":43,"G":9,"o":43,"O":12,"T":-4,"u":47,"Y":-4,"z":25,"Q":12,"W":-2,"w":47,"r":47,"y":40,"a":40,"i":14,"m":47,"s":36,"A":23,".":43,"X":-6,",":43,":":29,";":29,"S":4,"}":-4,"]":-4,"-":36,")":-4}},"U":{"d":"139,6v-62,-2,-96,-31,-96,-105r0,-85v1,-43,-3,-44,-30,-46v-2,-1,-2,-8,0,-9r89,0v5,6,0,10,-8,10v-39,-2,-21,85,-21,123v0,58,18,96,73,96v91,0,77,-135,65,-212v-3,-6,-17,-7,-27,-8v-2,-3,-1,-8,1,-9v26,1,54,2,79,0v10,14,-23,7,-26,18v-6,26,-5,79,-5,114v0,60,-31,115,-94,113","w":268,"k":{"c":9,"d":11,"t":11,"z":6,"b":2,"p":11,"v":4,"r":13,"y":4,"a":4,"i":6,"g":6,"k":2,"l":2,"n":13,"f":4,"m":13,"x":4,"s":11,"A":4}},"V":{"d":"116,5v-23,-70,-54,-136,-80,-204v-9,-23,-15,-29,-36,-31v-3,-2,-2,-7,1,-9v22,2,57,1,81,0v6,3,2,11,-5,10v-14,2,-17,4,-17,7v14,45,50,126,70,174r68,-160v9,-19,1,-19,-20,-22v-3,-2,-2,-8,1,-9v20,1,50,2,72,0v3,1,3,7,1,9v-15,1,-24,3,-30,14v-28,48,-76,165,-97,221v-3,2,-6,1,-9,0","w":243,"k":{"}":-4,"]":-9,"Q":9,";":16,":":6,".":43,"-":22,",":43,")":-4,"C":9,"e":36,"G":9,"o":36,"O":9,"u":32,"r":28,"y":25,"a":32,"i":4,"A":27}},"W":{"d":"140,-41r33,-73v-12,-33,-28,-64,-42,-96v-6,-14,-15,-20,-32,-20v-3,-3,-2,-8,1,-9v19,2,63,1,78,0v3,1,3,6,1,9v-15,2,-28,-2,-17,20v9,17,17,41,27,63v7,-14,14,-28,22,-47v16,-39,9,-34,-12,-36v-3,-4,-2,-8,1,-9v19,2,51,1,69,0v3,1,2,6,0,9v-24,-1,-31,14,-40,33v-9,20,-37,52,-28,74r36,82v20,-41,45,-108,61,-147v5,-13,11,-29,11,-33v3,-12,-32,-3,-22,-18v24,1,48,2,68,0v7,5,0,10,-6,10v-25,-5,-54,91,-69,123v-18,36,-30,72,-45,111v-2,2,-7,1,-9,0v-12,-32,-33,-78,-44,-103v-13,26,-35,73,-45,103v-2,2,-7,1,-10,0v-6,-15,-19,-48,-24,-58r-69,-150v-8,-19,-14,-27,-35,-27v-2,-2,-2,-8,1,-9v25,2,51,1,78,0v7,5,0,11,-7,10v-28,6,-6,20,6,54v16,46,42,90,63,134","w":345,"k":{"}":-4,"m":34,"]":-9,"Q":6,";":22,":":22,".":43,"-":14,",":43,")":-4,"C":6,"d":28,"e":28,"G":6,"o":28,"O":6,"t":27,"T":-4,"u":30,"r":30,"y":25,"a":32,"i":4,"A":27}},"X":{"d":"120,-139r54,-85v0,-6,-33,-3,-21,-15v23,1,51,2,73,0v5,5,-1,11,-8,10v-35,13,-65,64,-89,101v18,33,43,64,65,95v16,22,22,24,46,25v3,2,2,7,-1,9r-91,0v-2,-2,-3,-7,-1,-9v20,-2,31,-1,15,-22v-16,-21,-36,-51,-52,-72v-11,15,-45,58,-55,88v-2,7,30,2,20,15v-26,-1,-50,-2,-76,0v-3,-1,-5,-7,-2,-9v26,0,39,-16,52,-33v3,-6,36,-45,53,-73v-17,-30,-40,-57,-59,-86v-15,-22,-21,-26,-43,-30v-2,-2,-1,-8,1,-9v30,2,57,1,83,0v3,1,2,6,0,9v-24,1,-25,7,-10,26v13,16,33,49,46,65","w":231,"k":{"Q":9,"C":9,"e":2,"G":9,"O":9,"u":9,"y":4}},"Y":{"d":"113,-115r57,-108v0,-2,-6,-5,-15,-6v-6,1,-12,-7,-6,-10v25,1,44,2,68,0v8,6,-2,11,-9,11v-27,0,-51,68,-70,96v-21,30,-17,39,-17,77v-1,47,6,45,35,47v2,2,2,8,0,9r-97,0v-5,-7,4,-12,11,-10v26,5,21,-31,21,-64v0,-52,-36,-88,-54,-128v-13,-30,-17,-24,-38,-29v-2,-3,-2,-8,1,-9v19,1,62,2,80,0v5,3,2,11,-4,10v-32,1,-5,22,-4,34v13,27,27,55,41,80","w":206,"k":{"C":6,"d":32,"e":32,"G":6,"o":34,"O":6,"t":19,"T":-4,"u":27,"Y":-4,"Q":6,"V":-4,"W":-4,"q":32,"v":18,"a":24,"l":-2,".":29,"X":-4,",":29,":":22,";":13,"}":-4,"]":-9,"-":27,")":-4}},"Z":{"d":"62,-17v18,12,101,8,130,-2v10,-6,19,-20,25,-34v3,-1,8,0,9,3v-3,17,-10,42,-16,51r-198,0v-1,-1,-2,-2,-2,-4v50,-62,116,-152,156,-221v-29,-3,-102,-6,-120,9v-11,9,-11,33,-25,22v4,-13,11,-34,15,-54v1,-1,4,-1,6,0v1,9,6,9,35,9r137,-1v1,0,2,3,2,4v-46,54,-112,150,-154,218","w":230,"k":{"C":11,"e":2,"G":11,"o":4,"O":11,"u":2,"Q":11,"w":13,"y":13,"a":2,"i":4,"A":-4}},"[":{"d":"61,-18v3,34,-6,57,14,59r32,4v2,3,3,7,0,8r-65,1r0,-301r65,1v3,1,2,5,0,8r-32,4v-21,1,-14,25,-14,59r0,157","w":115,"k":{"W":-9,"V":-4,"J":-12,"T":-4,"Y":-4}},"\\":{"d":"32,-247r68,253r-20,0r-69,-253r21,0","w":111},"]":{"d":"54,-175v-3,-34,6,-57,-14,-59r-32,-4v-2,-3,-2,-7,1,-8r64,-1r0,301r-64,-1v-3,-1,-3,-5,-1,-8r32,-4v21,-1,14,-25,14,-59r0,-157","w":115},"^":{"d":"162,-88r-22,0r-50,-112r-50,112r-22,0r63,-137r18,0"},"_":{"d":"180,27r0,18r-180,0r0,-18r180,0"},"a":{"d":"49,5v-40,0,-54,-54,-7,-64r43,-16v12,-13,14,-57,-19,-58v-10,0,-23,5,-24,16v5,17,-23,25,-29,14v0,-19,41,-44,67,-44v51,0,39,61,36,105v-2,25,13,38,30,27v1,0,2,1,2,4v0,2,-12,16,-30,16v-13,0,-21,-10,-29,-16v-9,2,-26,16,-40,16xm87,-63v-17,4,-51,13,-47,30v0,6,5,22,23,22v24,0,34,-28,24,-52","w":145},"b":{"d":"167,-76v0,67,-71,97,-128,72v-5,-1,-8,9,-13,3r1,-202v1,-24,-2,-26,-15,-32v-3,-16,25,-11,39,-22v1,0,3,1,4,2v2,39,-5,86,2,120v43,-29,110,0,110,59xm82,-131v-43,0,-26,45,-28,82v-2,25,12,43,36,43v34,0,47,-29,47,-60v0,-37,-19,-65,-55,-65","k":{"w":2,"v":2,".":6,",":6,"y":2}},"c":{"d":"143,-32v-31,65,-130,39,-130,-35v0,-39,27,-80,87,-80v13,1,42,2,38,21v-6,32,-27,-16,-49,-9v-25,0,-50,20,-50,58v0,28,19,62,58,62v21,0,32,-10,40,-22v3,-1,6,2,6,5","w":144},"d":{"d":"154,-255r-1,202v0,39,1,48,26,39v3,1,2,9,-1,11v-17,0,-41,15,-51,9v-1,-6,1,-14,-2,-18v-44,38,-112,6,-112,-52v0,-58,53,-94,111,-80v1,-24,13,-84,-13,-91v-3,-16,27,-11,39,-22v1,0,3,1,4,2xm96,-12v15,0,32,-4,30,-24v-2,-43,13,-100,-34,-100v-33,0,-50,29,-50,60v0,33,19,64,54,64","w":183},"e":{"d":"136,-104v0,16,-1,12,-23,12r-66,0v-9,0,-10,1,-10,10v-5,50,58,93,93,49v4,-1,6,2,6,5v-33,62,-123,29,-123,-38v0,-44,29,-81,72,-81v31,0,51,21,51,43xm41,-105v21,4,74,6,68,-8v0,-10,-7,-23,-28,-23v-21,0,-40,19,-40,31","w":142,"k":{"z":-1,"w":-2}},"f":{"d":"94,-243v-33,2,-33,57,-33,91v-1,23,32,4,47,10v4,4,1,14,-3,15v-15,4,-44,-11,-44,11r0,76v-1,34,5,30,26,32v3,2,3,8,0,9v-27,-1,-49,-2,-74,0v-3,-1,-4,-7,-1,-9v19,-2,22,0,22,-32r0,-76v6,-22,-22,-1,-21,-18v7,-5,21,-4,21,-14v2,-55,16,-105,76,-109v28,-2,49,26,22,34v-14,-3,-21,-22,-38,-20","w":104,"k":{"'":-28,"}":-40,"]":-42,".":6,",":6,")":-40,"\"":-28}},"g":{"d":"75,-147v34,0,48,18,86,13v4,2,2,14,-3,15r-26,0v8,45,-16,80,-75,74v-16,6,-27,35,9,35v41,0,93,-14,93,39v0,39,-42,68,-89,68v-50,0,-68,-28,-56,-55v8,-11,28,-19,27,-33v-14,-4,-26,-15,-26,-28v5,-11,25,-15,28,-30v-12,-6,-27,-21,-27,-44v0,-31,27,-54,59,-54xm98,12v-36,0,-61,2,-61,34v0,19,15,35,48,35v60,0,77,-69,13,-69xm45,-96v0,52,65,56,63,5v0,-24,-10,-45,-32,-45v-17,0,-31,16,-31,40","w":160,"k":{"f":-2}},"h":{"d":"94,-130v-21,1,-38,5,-36,29v3,31,-16,97,22,93v3,1,2,8,-1,9v-21,-2,-47,-1,-69,0v-3,-1,-4,-7,-1,-9v19,-2,23,0,23,-32r0,-163v1,-24,-2,-26,-15,-32v-3,-16,27,-11,39,-22v9,26,-4,91,4,129v28,-31,95,-22,95,28r0,60v-1,33,3,30,23,32v3,2,2,8,-1,9v-22,-1,-48,-2,-69,0v-7,-19,30,0,20,-41v-1,-40,9,-93,-34,-90","w":185},"i":{"d":"14,-8v39,3,16,-64,21,-95v3,-16,-2,-20,-13,-25v0,-13,30,-15,38,-24v7,24,2,73,2,112v0,31,3,29,21,32v3,2,2,8,-1,9v-20,-2,-48,-1,-67,0v-3,-1,-4,-7,-1,-9xm47,-225v11,0,18,9,18,19v0,13,-9,19,-19,19v-11,0,-18,-8,-18,-18v0,-12,8,-20,19,-20","w":92},"j":{"d":"-5,89v55,-19,35,-117,41,-192v2,-20,-13,-18,-13,-31v10,-1,31,-20,41,-16v-3,60,7,143,-9,188v-9,27,-30,44,-55,59v-4,-1,-6,-4,-5,-8xm48,-225v11,0,18,9,18,19v0,13,-9,19,-19,19v-11,0,-19,-9,-19,-19v0,-12,9,-19,20,-19","w":91},"k":{"d":"32,-40r0,-163v1,-24,-2,-26,-15,-32v-3,-16,27,-11,39,-22v7,39,-1,115,2,170v0,5,1,5,7,5v17,1,45,-37,52,-46v1,-6,-28,-2,-17,-14v21,0,42,-1,66,-3v3,1,2,7,0,9v-28,0,-54,35,-67,45v-8,17,11,19,22,38v24,23,27,40,58,45v3,2,2,8,-1,9v-21,-2,-53,-1,-72,0v-6,-4,-1,-11,6,-10v12,-2,11,-5,3,-14r-39,-44v-6,-6,-19,-11,-18,7v2,26,-6,59,23,52v3,2,2,8,-1,9v-22,-2,-49,-1,-70,0v-5,-19,32,1,22,-41","w":173},"l":{"d":"59,-255r-1,215v-1,32,4,30,23,32v3,2,2,8,-1,9v-22,-2,-49,-1,-70,0v-5,-19,32,1,22,-41r0,-163v1,-24,-2,-26,-15,-32v-3,-16,27,-11,39,-22v1,0,2,1,3,2","w":88},"m":{"d":"98,-130v-47,0,-35,47,-36,90v-1,30,3,29,20,32v3,2,2,8,-1,9v-19,-2,-47,-1,-67,0v-3,-1,-4,-7,-1,-9v38,7,17,-62,22,-95v2,-16,-2,-20,-13,-25v-1,-13,31,-15,37,-24v9,2,-4,23,7,23v25,-19,68,-29,86,3v18,-5,37,-21,58,-21v53,0,43,57,43,107v0,32,3,30,22,32v3,2,2,8,-1,9v-21,-1,-47,-2,-67,0v-7,-18,29,-1,19,-41v-1,-39,10,-90,-33,-90v-45,0,-35,48,-36,90v-1,31,3,30,22,32v3,2,2,8,-1,9v-20,-1,-48,-1,-67,0v-6,-18,29,-1,20,-41v-1,-39,9,-90,-33,-90","w":283},"n":{"d":"98,-130v-46,0,-35,47,-36,90v-1,30,3,29,20,32v3,2,2,8,-1,9v-18,-2,-48,-1,-66,0v-7,-19,29,1,20,-41v-6,-30,13,-78,-13,-88v-1,-13,31,-15,37,-24v9,2,-4,23,7,23v30,-27,97,-24,92,27v5,31,-16,98,22,94v3,2,2,8,-1,9v-20,-1,-48,-1,-67,0v-7,-19,30,0,20,-41v-2,-40,11,-90,-34,-90","w":189},"o":{"d":"89,-147v40,0,73,31,73,75v0,45,-31,77,-76,77v-41,0,-73,-29,-73,-74v0,-45,34,-78,76,-78xm90,-6v62,0,53,-128,-5,-130v-24,0,-41,22,-41,62v0,33,14,68,46,68","w":174,"k":{"v":6,"w":4,"y":4,"x":2,".":6}},"p":{"d":"31,51r0,-154v5,-20,-13,-18,-13,-31v9,-4,27,-13,36,-20v9,1,-3,21,6,24v5,-2,27,-17,50,-17v36,0,60,30,60,66v-1,56,-45,94,-108,85v-10,5,-4,33,-5,47v-3,35,7,29,28,33v3,2,2,8,-1,9v-28,-1,-50,-2,-74,0v-7,-5,0,-11,7,-10v13,-2,14,-6,14,-32xm92,-130v-51,0,-32,52,-35,94v-2,21,20,29,37,29v30,0,47,-28,47,-65v0,-29,-17,-58,-49,-58","w":182,"k":{"w":2,".":6,",":6}},"q":{"d":"13,-66v-1,-68,67,-93,128,-75v4,2,10,-11,14,-3v-7,52,-1,135,-3,195v-1,33,5,29,24,33v3,2,3,8,0,9v-26,-2,-48,-1,-74,0v-3,-1,-4,-7,-1,-9v37,9,22,-47,25,-79v0,-7,-1,-9,-4,-9v-9,5,-22,9,-36,9v-54,0,-73,-43,-73,-71xm100,-9v44,0,23,-40,26,-74v4,-39,-6,-53,-36,-53v-27,0,-47,25,-47,59v0,40,23,68,57,68","w":178},"r":{"d":"103,-116v-22,-12,-46,-9,-41,27v4,30,-17,91,27,81v3,2,3,8,0,9v-27,-1,-51,-2,-74,0v-5,-19,28,0,20,-41v-6,-30,13,-78,-13,-88v0,-13,28,-15,37,-24v8,3,0,19,4,27v13,-10,27,-22,40,-22v9,0,16,6,16,15v0,12,-10,16,-16,16","w":119,"k":{"c":2,"d":5,"e":4,"o":2,"t":-3,"u":-3,"z":-2,"q":2,"v":-6,"w":-6,"y":-6,"k":2,"f":-3,"x":-2,".":22,",":22}},"s":{"d":"81,-28v-2,-37,-67,-41,-63,-78v-5,-38,55,-49,81,-34v3,8,5,19,5,29v-1,3,-6,3,-8,1v-5,-29,-53,-37,-55,-4v7,35,64,32,64,78v0,42,-63,51,-90,30v-3,-7,-5,-24,-4,-36v2,-2,6,-2,8,0v6,20,17,37,38,37v13,0,24,-8,24,-23","w":116},"t":{"d":"58,-51v-7,31,24,50,45,33v3,0,5,4,4,6v-6,8,-20,17,-38,17v-61,0,-29,-72,-37,-121v5,-21,-21,-2,-19,-18v22,-7,29,-15,38,-33v16,-6,0,25,14,25r40,0v4,3,3,13,0,15r-40,0v-6,0,-7,1,-7,9r0,67","w":110},"u":{"d":"91,-12v17,-1,39,-7,36,-31v-4,-30,13,-88,-18,-89v-3,-1,-3,-7,0,-8v16,2,39,-10,46,-4v-2,25,-1,63,-1,91v0,37,1,44,25,38v2,2,3,9,0,10v-14,3,-36,7,-48,14v-9,-1,1,-20,-7,-23v-23,23,-102,31,-93,-26v-5,-30,14,-89,-16,-92v-2,-2,-2,-7,1,-8v19,2,34,-10,42,-4v4,41,-23,134,33,132","w":184},"v":{"d":"86,-39v11,-19,28,-68,34,-88v1,-8,-24,-5,-15,-16v22,1,33,1,53,0v4,3,1,11,-5,10v-36,19,-49,97,-71,137v-17,5,-13,-25,-22,-37r-30,-73v-6,-16,-11,-28,-29,-28v-2,-3,-2,-8,1,-9v19,1,42,2,63,0v11,13,-25,6,-12,24v10,29,21,58,33,80","w":155,"k":{"q":2,".":27,",":27,"c":2,"d":2,"e":2,"o":2,"a":2}},"w":{"d":"171,-39v9,-19,29,-61,33,-89v1,-7,-25,-4,-15,-15v19,1,34,2,52,0v5,16,-21,6,-25,33v-16,34,-34,81,-46,114v-17,6,-13,-24,-24,-39r-25,-60r-41,99v-15,7,-13,-22,-20,-30r-33,-81v-10,-23,-12,-24,-27,-27v-2,-2,-2,-8,1,-9v21,1,43,1,63,0v7,5,0,11,-7,10v-14,4,-9,8,-3,24r29,70v7,-23,57,-88,7,-95v-3,-2,-2,-8,1,-9v21,2,42,1,64,0v12,15,-31,5,-16,27","w":237,"k":{".":27,",":27,"c":2,"d":2,"e":2}},"x":{"d":"64,-72v-20,-20,-27,-55,-60,-62v-2,-2,-2,-8,1,-9v27,2,35,1,62,0v11,12,-22,4,-9,23r22,31v1,-1,12,-20,21,-31v14,-16,-16,-9,-6,-23v16,1,37,1,53,0v5,3,1,12,-5,10v-31,5,-28,19,-52,47v-5,5,-4,8,1,14v20,20,27,63,63,64v2,2,2,8,-1,9v-26,-1,-46,-2,-70,0v-3,-1,-4,-7,-1,-9v9,0,25,0,17,-12r-27,-37r-22,32v-10,16,-3,16,8,17v2,2,2,8,-1,9v-18,-1,-35,-1,-53,0v-9,-16,19,-6,26,-21v7,-13,34,-35,33,-52","w":155,"k":{"v":2,"q":2,"c":4,"d":4,"e":4,"o":2}},"y":{"d":"48,73v-9,22,-37,23,-39,1v-2,-21,27,-8,33,-21v16,-31,32,-42,18,-80r-28,-77v-6,-21,-11,-27,-30,-30v-2,-2,-2,-8,1,-9v23,1,41,2,65,0v12,12,-15,8,-16,16v10,30,20,66,33,92v8,-13,35,-76,38,-91v1,-9,-31,-4,-19,-17v23,1,37,2,59,0v6,4,0,11,-6,10v-21,2,-38,58,-50,80v-13,24,-42,87,-59,126","w":157,"k":{"c":4,"d":2,"e":2,"o":2,"q":2,".":31,",":31}},"z":{"d":"122,1r-111,0v-3,-14,21,-35,33,-56r38,-65v6,-10,2,-11,-4,-11v-31,-2,-57,0,-62,26v-2,2,-7,2,-8,-1v3,-9,3,-42,16,-42v11,13,72,4,98,5v2,14,-13,27,-24,45r-44,73v-8,13,-7,14,7,14v31,2,59,-1,66,-31v3,-1,7,-1,8,2v-3,18,-8,34,-13,41","w":135,"k":{"c":2,"d":2,"e":2,"o":2}},"{":{"d":"101,-243v-75,13,20,120,-50,147v68,15,-25,129,50,146v2,1,2,5,0,7v-18,0,-54,-3,-51,-45r5,-75v0,-12,-1,-28,-31,-30v-2,-2,-2,-5,0,-7v30,-2,31,-18,31,-30r-5,-74v0,-42,33,-46,51,-46v2,2,2,5,0,7","w":115,"k":{"W":-4,"V":-4,"J":-12,"T":-4,"Y":-4}},"|":{"d":"54,-270r0,360r-22,0r0,-360r22,0","w":86},"}":{"d":"14,50v75,-13,-19,-121,50,-147v-68,-15,25,-128,-50,-146v-2,-2,-2,-5,0,-7v18,0,54,4,51,46r-5,74v0,12,1,28,31,30v2,2,2,5,0,7v-30,2,-31,18,-31,30r5,75v0,42,-33,45,-51,45v-2,-2,-2,-6,0,-7","w":115},"~":{"d":"153,-101v-4,10,-16,39,-37,36v-36,2,-69,-9,-77,24v-5,2,-11,0,-12,-5v4,-10,17,-40,37,-37v35,-2,68,10,77,-23v5,-2,11,0,12,5"},"'":{"d":"42,-252v18,0,17,6,14,23r-9,58v-3,3,-6,3,-9,0r-11,-72v0,-8,5,-9,15,-9","w":84},"`":{"d":"29,-214v-15,-12,3,-23,13,-25v4,0,6,4,8,9r28,58v0,3,-5,4,-7,4","w":129},"\u00a0":{"w":90,"k":{"W":5,"V":5,"T":16,"Y":5}}}});




/* Header & SEARCH BOX 
 -------------------------------------------------------------------- */ 
/* hides several elements, and inserts default text for textbox */

var doCufon = (function($) { return function () {
	var elm,
		keyword = $('#uc-search-keyword'),
		legend = $('#uc-search-legend'),
		navigation = $('ul.sf-menu'),
		search = $('.searchBox'),
		clearValue = function (e) {
			elm = $(e);
			if (elm.val() === elm.attr('title')) {
				elm.attr('value', '');
			}
		},
		setValue = function (e) {
			elm = $(e);
			if (elm.val() === '') {
				elm.attr('value', elm.attr('title'));
			}
		};
	keyword.css('display', 'none');
	legend.css('display', 'none');
	search.each(function (i, e) {
		setValue(e);
		$(e).focus(function () {
			clearValue(e);
		}).blur(function () {
			setValue(e);
		});
	});
	if (typeof Cufon !== 'undefined') {
		Cufon.replace('#uc-website-title');
		$("#uc-head-wrap").addClass("cufon");
	}
}})(jQuery);



$(function() {
	var title = $('#uc-website-title').html();
	
	window.onresize = window.onload = function () {
		console.log(title);
		
		if(window.innerWidth < 979){
			$('#uc-website-title').html(title);
			$('.nav-collapse').addClass('collapse');
			
		}else{
			doCufon();
			
			$('.nav-collapse').removeClass('collapse');
		}
	}
	
	var search = $('.searchBox'),
		clearValue = function (e) {
			elm = $(e);
			if (elm.val() === elm.attr('title')) {
				elm.attr('value', '');
			}
		},
		setValue = function (e) {
			elm = $(e);
			if (elm.val() === '') {
				elm.attr('value', elm.attr('title'));
			}
		};
	search.each(function (i, e) {
		setValue(e);
		$(e).focus(function () {
			clearValue(e);
		}).blur(function () {
			setValue(e);
		});
	});
});





