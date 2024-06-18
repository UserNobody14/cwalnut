import { Package, LVar, SLogic } from "./logic";

// const inf = 1 / 0 //we start with a division by zero. this is a good start.
// const minus_inf = (-1) * inf
export const inf = Infinity;
export const minus_inf = -Infinity;
/*
    domains (for clp)
*/

export class Domain {
    min: number;
    max: number;
    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
    }
    public toString = () => {
        const str = '[' + this.min + ', ' + this.max + ']';
        return str;
    };
    is_member(v: number) {
        const d1 = this;
        return v >= d1.min && v <= d1.max;
    }
    add(d2: { min: number; max: number; }) {
        const d1 = this;
        return make_domain(d1.min + d2.min, d1.max + d2.max);
    }
    sub(d2: { max: number; min: number; }) {
        const d1 = this;
        return make_domain(d1.min - d2.max, d1.max - d2.min);
    }
    mul(d2: { min: number; max: number; }) {
        const d1 = this, obj = [d1.min * d2.min, d1.min * d2.max, d1.max * d2.min, d1.max * d2.max], min = Math.min.apply(null, obj), max = Math.max.apply(null, obj);
        return make_domain(min, max);
    }
    div(d2: { min: number; max: number; }) {
        const d1 = this;
        let min, max;
        if (d2.min <= 0 && d2.max >= 0) { //zero is involved.
            if (d2.min === 0 && d2.max === 0) {
                return false;
            }
            else if (d2.min === 0) {
                max = inf;
                return make_domain(Math.min(d1.min / d2.max, d1.max / d2.max), inf);
            }
            else if (d2.max === 0) {
                min = minus_inf;
                return make_domain(minus_inf, Math.max(d1.min / d2.min, d1.max / d2.max));
            }
        }
        if (!(isFinite(d2.min) && isFinite(d2.max))) { //infinity is involved...
            if (d2.min === minus_inf && d2.max === inf) {
                return REAL_DOMAIN;
            }
        }
        const obj = [d1.min / d2.min, d1.min / d2.max, d1.max / d2.min, d1.max / d2.max];
        min = Math.min.apply(null, obj);
        max = Math.max.apply(null, obj);
        //write('obj',obj,d1,d2)
        return make_domain(min, max);
    }

}
export function make_domain(min: number, max: number) {
    return new Domain(min, max);
}
export const REAL_DOMAIN = make_domain(minus_inf, inf);
export function intersection(d1: Domain, d2: Domain) {
    let min, max;
    min = (d1.min < d2.min) ? d2.min : d1.min;
    max = (d1.max > d2.max) ? d2.max : d1.max;
    if (max < min) return false;
    return make_domain(min, max);
}
export function get_domain(pack: Package, x: LVar | number | undefined) {
    if (SLogic.is_lvar(x)) {
        const d = pack.lookup_domain_binding(x);
        if (!d)
            return REAL_DOMAIN;
        return d.val;
    }
    else if (typeof x === 'number') {
        return make_domain(x, x);
    }
    else {
        return REAL_DOMAIN;
    }
}
