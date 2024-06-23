// // Define basic types
// type Type = TVar | TFunc | TInt | TBool;

// class TVar {
//     constructor(public name: string) { }
// }

// class TFunc {
//     constructor(public from: Type, public to: Type) { }
// }

// class TInt {
// }

// class TBool {
// }

// // Unification function
// function unify(t1?: Type, t2?: Type, subst: Map<string, Type> = new Map()): Map<string, Type> {
//     if (!t1) throw new Error("t1 is undefined");
//     if (!t2) throw new Error("t2 is undefined");
//     if (t1 instanceof TVar) {
//         return unifyVar(t1, t2, subst);
//     }if (t2 instanceof TVar) {
//         return unifyVar(t2, t1, subst);
//     }if (t1 instanceof TFunc && t2 instanceof TFunc) {
//         const subst1 = unify(t1.from, t2.from, subst);
//         return unify(t1.to, t2.to, subst1);
//     }if (t1 instanceof TInt && t2 instanceof TInt) {
//         return subst;
//     }if (t1 instanceof TBool && t2 instanceof TBool) {
//         return subst;
//     }
//         throw new Error(`Cannot unify types ${t1} and ${t2}`);
// }

// function unifyVar(v: TVar, t: Type, subst: Map<string, Type>): Map<string, Type> {
//     if (subst.has(v.name)) {
//         return unify(subst.get(v.name), t, subst);
//     }if (t instanceof TVar && subst.has(t.name)) {
//         return unify(v, subst.get(t.name), subst);
//     }if (occursCheck(v, t, subst)) {
//         throw new Error(`Occurs check failed: ${v} in ${t}`);
//     }
//         subst.set(v.name, t);
//         return subst;
// }

// function occursCheck(v: TVar, t: Type, subst: Map<string, Type>): boolean {
//     if (t instanceof TVar) {
//         return v.name === t.name || (subst.has(t.name) && occursCheck(v, subst.get(t.name) as Type, subst));
//     }if (t instanceof TFunc) {
//         return occursCheck(v, t.from, subst) || occursCheck(v, t.to, subst);
//     }
//         return false;
// }

// // Example usage
// const t1 = new TVar("a");
// const t2 = new TFunc(new TInt(), t1);

// try {
//     const subst = unify(t1, t2);
//     console.log("Unification succeeded with substitution:", subst);
// } catch (e) {
//     console.error(e.message);
// }
