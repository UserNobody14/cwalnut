// import { mapVarsToState } from "src/lens/into-vars";
// import { Map as ImmMap } from "immutable";
// import { Goal, VarLogic, conj, disj, fresh } from "src/interpret/logic";
// import type { TermT } from "src/types/DsAstTyped";
// import { Type } from "src/types/EzType";
// import { make } from "src/utils/make_better_typed";

// function typeFacts(tt: TermT[]): TermT[] {
//     const lvarMap = mapVarsToState(tt,
//         (v, s) => {
//             return s.set(v.value, VarLogic.create(v.value))
//         },
//         ImmMap(),
//     );
//     return tt.map(t => {
//         switch (t.type) {
//             case "predicate_call":
//                 return {
//                     type: "predicate_call",
//                     source: t.source,
//                     args: t.args,
//                     logic: lvarMap.get(t.source.value)
//                 };
//             case "predicate_definition":
//                 return {
//                     type: "predicate_definition",
//                     name: t.name,
//                     args: t.args,
//                     body: typeFacts(t.body),
//                 };
//             case "fresh":
//                 return {
//                     type: "fresh",
//                     newVars: t.newVars,
//                     body: typeFacts(t.body),
//                 };
//             case "with":
//                 return {
//                     type: "with",
//                     name: t.name,
//                     body: typeFacts(t.body),
//                 };
//             default:
//                 return t;
//         }
//     });
// }

// function typePredDefinition(
//     t: TermT,
//     args: string[],
//     builtins: ImmMap<string, VarLogic>,
// ) {
//     const lvarMap = mapVarsToState([t],
//         (v, s) => {
//             return s.set(v.value, VarLogic.create(v.value))
//         },
//         builtins,
//     );
//     return {
//         type: "predicate_definition",
//         name: t.name,
//         args: args.map(a => ({ type: "identifier", value: a })),
//         body: typeFacts([t]),
//         logic: lvarMap.get(t.name.value),
//     };
// }

// function subT(
//     t: TermT[],
//     builtins: ImmMap<string, VarLogic>,
// ): Goal {
//     const vz = builtins;
//     let goal: Goal;
//     for (const tt of t) {
//         switch (tt.type) {
//             case "conjunction":
//                 goal = conj(...tt.terms.map(
//                     zz => subT([zz], vz)
//                 ));
//                 break;
//             case "disjunction":
//                 goal = disj(...tt.terms.map(
//                     zz => subT([zz], vz)
//                 ));
//                 break;
//             case "fresh":
//                 goal = fresh(
//                     tt.newVars.map(v => v.value),
//                     subT(tt.body.terms, vz)
//                 );
//                 break;
//             case "predicate_definition":
//                 // vz = vz.set(tt.name.value, VarLogic.create(tt.name.value));
//                 // goal = typePredDefinition(tt, tt.args.map(a => a.value), vz);
//                 break;
//             case "predicate_call":
//                 // goal = {
//                 //     type: "predicate_call",
//                 //     source: tt.source,
//                 //     args: tt.args,
//                 //     logic: vz.get(tt.source.value),
//                 // };
//                 goal = predCallTypes(
//                     tt.source.value, 
//                     tt.args.map(a => a.value),
//                     tt.source.info,
//                     tt.args.map(a => a.type === 'identifier' ? a.info : make.simple_type(a.kind)),
//                 );
//                 break;
//         }
//     }
//     return goal;
// }

// function predCallTypes(
//     name: string,
//     args: string[],
//     sourceInfo: Type,
//     argsInfo: Type[],
// ): Goal {
//     return ;
// }