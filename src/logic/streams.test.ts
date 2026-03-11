import { describe, test, expect } from "@jest/globals";
import { takeT } from "./streams";
import { emptyState } from "./State";


describe("logic3 Streams", () => {
    test("Stream 1", () => {
        expect(
            takeT(
                [emptyState],
                3
            )
        ).toHaveLength(1);
    });
});