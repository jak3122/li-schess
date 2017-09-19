// eslint-disable-next-line
import { key2pos } from "cg/src/util";
import { h } from "snabbdom";

const roles = ["queen", "elephant", "hawk", "knight", "rook", "bishop"];

function cancel() {
	console.log("cancel promotion");
}
function finish() {
	console.log("finish promotion");
}
function bind(eventName, f, redraw) {
	return {
		insert(vnode) {
			vnode.elm.addEventListener(eventName, e => {
				const res = f(e);
				if (redraw) redraw();
				return res;
			});
		}
	};
}

export default function renderPromotion(dest, color, orientation) {
	var left = (8 - key2pos(dest)[0]) * 12.5;
	if (orientation === "white") left = 87.5 - left;
	var vertical = color === orientation ? "top" : "bottom";

	return h(
		"div#promotion_choice." + vertical,
		{
			hook: {
				insert: vnode => {
					const el = vnode.elm;
					el.addEventListener("click", () => cancel());
					el.addEventListener("contextmenu", e => {
						e.preventDefault();
						return false;
					});
				}
			}
		},
		roles.map((serverRole, i) => {
			var top = (color === orientation ? i : 7 - i) * 12.5;
			return h(
				"square",
				{
					attrs: { style: "top: " + top + "%;left: " + left + "%" },
					hook: bind("click", e => {
						e.stopPropagation();
						finish(serverRole);
					})
				},
				[h("piece." + serverRole + "." + color)]
			);
		})
	);
}
