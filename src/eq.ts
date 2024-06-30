import { warnHolder, debugHolder } from "./warnHolder";
import { LogicValue, WorldGoal, World, LogicLiteral, LogicLvar, LogicMap, LogicList, LogicPredicate, LogicCons } from "./WorldGoal";


export function eq(
	a: LogicValue | undefined,
	b: LogicValue | undefined
): WorldGoal {
	return new WorldGoal((world) => {
		if (a === undefined || b === undefined) {
			warnHolder(`Undefined values in eq: ${a} ${b}`);
			return [World.fail];
		}
		const aWalked = world.walk(a);
		const bWalked = world.walk(b);
		if (aWalked === undefined || bWalked === undefined) {
			warnHolder(
				`Undefined values in eq walked: ${aWalked} ${bWalked}`
			);
			return [World.fail];
		}
		if (aWalked instanceof LogicLiteral &&
			bWalked instanceof LogicLiteral) {
			if (aWalked.value === bWalked.value) {
				return [world];
			} if (aWalked.toString() ===
				bWalked.toString()) {
				warnHolder(
					`Literal values questionably equal: ${aWalked.value} ${bWalked.value}`
				);
				return [world];
			}
			warnHolder(
				`Literal values not equal: ${aWalked.value} ${bWalked.value}`
			);
			return [World.fail];
		}
		if (aWalked instanceof LogicLvar &&
			bWalked instanceof LogicLiteral) {
			return [world.bind(aWalked.getName(), bWalked)];
		}
		if (aWalked instanceof LogicLiteral &&
			bWalked instanceof LogicLvar) {
			return [world.bind(bWalked.getName(), aWalked)];
		}
		if (aWalked instanceof LogicLvar &&
			bWalked instanceof LogicLvar) {
			return [world.bind(bWalked.getName(), aWalked)];
		}
		if (aWalked instanceof LogicMap &&
			bWalked instanceof LogicMap) {
			debugHolder(`Comparing maps: ${aWalked.toString()} ${bWalked.toString()}
                For: (${a.getNameSafe()} ${b.getNameSafe()})
                sizes: ${aWalked.size} ${bWalked.size}
                sizeVals: ${aWalked.value.size} ${bWalked.value.size}`);
			if (aWalked.size !== null && bWalked.size !== null) {
				if (aWalked.size !== bWalked.size) {
					warnHolder(
						`Map sizes not equal: ${aWalked.size} ${bWalked.size}`
					);
					return [World.fail];
				}
			}
			if (aWalked.type === "finite" &&
				bWalked.type === "infinite" &&
				aWalked.size !== null &&
				bWalked.value.size > aWalked.size) {
				warnHolder(
					`Map sizes not equal: ${aWalked.size} ${bWalked.size}`
				);
				return [World.fail];
			}
			if (aWalked.type === "infinite" &&
				bWalked.type === "finite" &&
				bWalked.size !== null &&
				aWalked.value.size > bWalked.size) {
				warnHolder(
					`Map sizes not equal: ${aWalked.size} ${bWalked.size}`
				);
				return [World.fail];
			}
			if (aWalked.type === "infinite" ||
				bWalked.type === "infinite") {
				// const aMap = aWalked.value as Map<string, LogicValue>;
				// const bMap = bWalked.value as Map<string, LogicValue>;
				const aMap = aWalked;
				const bMap = bWalked;
				// let newWorld = new World(new Map(world.lvars));
				const subGoals = [];
				for (const [key, value] of aMap.entries()) {
					if (!bMap.value.has(key) &&
						bWalked.type === "infinite") {
						// TODO: this is a bit of a hack, we should be able to bind the key as well
						debugHolder("adding keyA", key, value);
						bMap.set(key, value);
						subGoals.push(eq(value, bMap.get(key)));
					} else {
						subGoals.push(eq(value, bMap.get(key)));
					}
				}
				for (const [key, value] of bMap.entries()) {
					if (!aMap.value.has(key) &&
						aWalked.type === "infinite") {
						// TODO: this is a bit of a hack, we should be able to bind the key as well
						debugHolder(
							"adding keyB",
							key,
							value,
							`
                            For: (${a.getNameSafe()} ${b.getNameSafe()})
                            ${aWalked.toString()}

                            ${bWalked.toString()}
                            `
						);
						aMap.set(key, value);
						subGoals.push(eq(value, aMap.get(key)));
					} else {
						subGoals.push(eq(value, aMap.get(key)));
					}
				}
				if (aWalked.type === "finite" &&
					bWalked.type === "infinite") {
					// ensure that size constraints aren't exceeded
					if (aMap.value.size > bMap.value.size) {
						warnHolder(
							`Map sizes not equal: ${aMap.size} ${bMap.size}`
						);
						return [World.fail];
					}
				}
				if (a instanceof LogicLvar &&
					aWalked.type === "infinite") {
					// world.addLvar(a.getName(), new LogicMap(aMap, 'infinite'));
					subGoals.unshift(
						new WorldGoal((world2) => {
							return [
								world2.bindSafe(
									a.getNameSafe(),
									new LogicMap(
										aMap.value,
										"infinite",
										aMap.size
									)
								),
							];
						})
					);
				} else if (b instanceof LogicLvar &&
					bWalked.type === "infinite") {
					subGoals.unshift(
						new WorldGoal((world2) => {
							return [
								world2.bindSafe(
									b.getNameSafe(),
									new LogicMap(
										bMap.value,
										"infinite",
										bMap.size
									)
								),
							];
						})
					);
				}
				return WorldGoal.and(...subGoals).run(world);
			}
			const aMap = aWalked.value as Map<
				string, LogicValue
			>;
			const bMap = bWalked.value as Map<
				string, LogicValue
			>;
			if (aMap.size !== bMap.size) {
				warnHolder(
					`Map sizes not equal: ${aMap.size} ${bMap.size}`
				);
				return [World.fail];
			}
			// let newWorld = new World(new Map(world.lvars));
			const subGoals = [];
			for (const [key, value] of aMap.entries()) {
				if (!bMap.has(key)) {
					warnHolder("Map keys missing");
					return [World.fail];
				}
				subGoals.push(eq(value, bMap.get(key)));
			}
			return WorldGoal.and(...subGoals).run(world);
		}
		if (aWalked instanceof LogicCons &&
			bWalked instanceof LogicCons) {
			return unifyCons(world, a, b, aWalked, bWalked);
		}
		if (aWalked instanceof LogicList &&
			bWalked instanceof LogicCons) {
			return unifyCons(world, a, b, bWalked, aWalked);
		}
		if (aWalked instanceof LogicCons &&
			bWalked instanceof LogicList) {
			return unifyCons(world, a, b, aWalked, bWalked);
		}
		if (aWalked instanceof LogicList &&
			bWalked instanceof LogicList) {
			return unifyLists(world, a, b, aWalked, bWalked);
		}
		if (aWalked instanceof LogicLvar) {
			return [world.bind(aWalked.getName(), bWalked)];
		}
		if (bWalked instanceof LogicLvar) {
			return [world.bind(bWalked.getName(), aWalked)];
		}
		if (aWalked instanceof LogicPredicate && bWalked instanceof LogicPredicate) {
			return [world];
		}
		debugHolder(
			`Values not equal: ${aWalked.toString()} ${bWalked.toString()}`
		);
		return [World.fail];
	});
}

function unifyCons(
	world: World,
	a: LogicValue,
	b: LogicValue,
	aWalked: LogicCons,
	bWalked: LogicCons | LogicList
): World[] {
	let bCons = bWalked;
	if (bWalked instanceof LogicList && bWalked.value.length > 0) {
		bCons = bWalked.value.reduceRight((acc, val) => {
			return new LogicCons(val, acc);
		}, new LogicList([])) as LogicCons;
	}
	if (bCons === undefined) {
		warnHolder(`Cons not found: ${bWalked.toString()}`);
		return [World.fail];
	}
	const aCons = aWalked;
	const subGoals = [];
	subGoals.push(eq(aCons.tail, bCons));
	// if (bCons instanceof LogicCons) {
	return WorldGoal.and(...subGoals).run(world.bindSafe(
		a.getNameSafe(),
		new LogicCons(aCons.head, bCons)
	));
}

function unifyLists(
	world: World,
	a: LogicValue,
	b: LogicValue,
	aWalked: LogicList,
	bWalked: LogicList
): World[] {

	const aList = aWalked.value;
	const bList = bWalked.value;
	if (aWalked.size !== null && bWalked.size !== null) {
		if (aList.length !== bList.length) {
			warnHolder(`List sizes not equal: ${aList.length} ${bList.length}
				in ${aWalked.toString()} ${bWalked.toString()}`);
			return [World.fail];
		}
		const subGoals = [];
		for (let i = 0; i < aList.length; i++) {
			subGoals.push(eq(aList[i], bList[i]));
		}
		return WorldGoal.and(...subGoals).run(world);
	} else if (aWalked.size !== null) {
		if (aList.length > aWalked.size || bList.length > aList.length) {
			warnHolder(
				`List size exceeds constraint: ${bList.length} ${aList.length}`
			);
			return [World.fail];
		}
		// make b the same size as a, set all the extra values to the same position vals in alist
		const subGoals = [];
		for (let i = 0; i < aList.length; i++) {
			if (i < bList.length) {
				subGoals.push(eq(aList[i], bList[i]));
			}
		}
		const newBlist = [...bList, ...aList.slice(bList.length)];
		return WorldGoal.and(...subGoals).run(world.bindSafe(
			b.getNameSafe(),
			new LogicList(newBlist, 'finite', aList.length)
		));
	} else if (bWalked.size !== null) {
		if (bList.length > bWalked.size || aList.length > bList.length) {
			warnHolder(
				`List size exceeds constraint: ${aList.length} ${bList.length}`
			);
			return [World.fail];
		}
		// make a the same size as b, set all the extra values to the same position vals in blist
		const subGoals = [];
		for (let i = 0; i < bList.length; i++) {
			if (i < aList.length) {
				subGoals.push(eq(aList[i], bList[i]));
			}
		}
		const newAlist = [...aList, ...bList.slice(aList.length)];
		return WorldGoal.and(...subGoals).run(world.bindSafe(
			a.getNameSafe(),
			new LogicList(newAlist, 'finite', bList.length)
		));
	} else {
		// if both are infinite, just set everything up to the min size to equal
		// and everything up to the max size to be that of the larger list
		// then set both to this new list, w/ the max size + infinite type
		const subGoals = [];
		const minSize = Math.min(aList.length, bList.length);
		for (let i = 0; i < minSize; i++) {
			subGoals.push(eq(aList[i], bList[i]));
		}
		let newAlist;
		if (aList.length < bList.length) {
			newAlist = [...aList, ...bList.slice(aList.length)];
		} else {
			newAlist = [...bList, ...aList.slice(bList.length)];
		}
		// subGoals.push(
		// 	eq(
		// 		a,
		// 		new LogicList(newAlist, 'infinite', null)
		// 	)
		// );
		return WorldGoal.and(...subGoals).run(world.bindSafe(
			b.getNameSafe(),
			new LogicList(newAlist, 'infinite', null)
		));
	}
}