import { FormField, FormData } from './types.js';
export declare class FieldMatcher {
    private fields;
    private fieldsByName;
    constructor(fields: FormField[]);
    private buildFieldMaps;
    matchAndConvert(data: FormData): FormData;
    private findField;
    private convertValue;
    private normalizeFileValue;
}
//# sourceMappingURL=field-matcher.d.ts.map