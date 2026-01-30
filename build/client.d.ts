import { JianDaoYunConfig, FormField, FormData, SubmitDataOptions, QueryDataOptions } from './types.js';
export declare class JianDaoYunClient {
    private config;
    private axios;
    constructor(config: JianDaoYunConfig);
    getFormFields(formId: string): Promise<FormField[]>;
    private transformFields;
    private mapFieldType;
    submitData(options: SubmitDataOptions): Promise<any>;
    private formatDataForSubmission;
    private formatValue;
    getFormData(formId: string, dataId: string): Promise<any>;
    queryFormData(options: QueryDataOptions): Promise<any>;
    updateFormData(formId: string, dataId: string, data: FormData, options?: {
        transactionId?: string;
        isStartTrigger?: boolean;
    }): Promise<any>;
    deleteFormData(formId: string, dataId: string | string[], options?: {
        isStartTrigger?: boolean;
    }): Promise<any>;
    getUploadToken(formId: string, transactionId: string, fieldId?: string): Promise<any>;
}
//# sourceMappingURL=client.d.ts.map